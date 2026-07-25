import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import axios from "axios";
import toast from "react-hot-toast";
import type { AppContextType, LocationData, User, ICart, IRestaurant } from "../types";
import { authService, restaurantService } from "../config";
import { discoverSession, clearAuth, getToken, setToken } from "../utils/authStorage";
import { getLiveLocation, reverseGeocode } from "../utils/location";

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppData = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [city, setCity] = useState<string>("Unknown Location");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [cart, setCart] = useState<ICart[] | null>(null);
  const [subTotal, setSubTotal] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [showPreloader, setShowPreloader] = useState<boolean>(false);
  const [visibleRestaurants, setVisibleRestaurants] = useState<IRestaurant[]>([]);

  const logout = useCallback((role?: string | null) => {
    clearAuth(role);
    setIsAuth(false);
    setUser(null);
    setCart([]);
    setSubTotal(0);
    setQuantity(0);
  }, []);

  const fetchCart = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setCart([]);
      setSubTotal(0);
      setQuantity(0);
      return;
    }
    try {
      const { data } = await axios.get(`${restaurantService}/api/cart/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        setCart(data.cart || []);
        setSubTotal(data.subTotal || 0);
        setQuantity(data.cartLength || 0);
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
    }
  }, []);

  const resolveLocation = useCallback(async () => {
    setLoadingLocation(true);
    setLocationError(null);
    try {
      const res = await getLiveLocation();
      if (res.success && res.data) {
        setLocation(res.data);
        const geocode = await reverseGeocode(res.data.latitude, res.data.longitude);
        setCity(geocode.city || "Your Location");
        localStorage.setItem("user_location", JSON.stringify(res.data));
        localStorage.setItem("user_city", geocode.city || "Your Location");
        localStorage.setItem("user_location_saved_at", Date.now().toString());
      } else {
        setLocationError(res.error?.message || "Failed to get location");
      }
    } catch (err: any) {
      setLocationError(err.message || "Failed to get location");
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  const setLocationManual = useCallback(async (lat: number, lon: number, customAddress?: string) => {
    setLoadingLocation(true);
    setLocationError(null);
    try {
      const geocode = await reverseGeocode(lat, lon);
      const locData: LocationData = {
        latitude: lat,
        longitude: lon,
        formattedAddress: customAddress || geocode.formattedAddress,
      };
      setLocation(locData);
      setCity(geocode.city || "Your Location");
      localStorage.setItem("user_location", JSON.stringify(locData));
      localStorage.setItem("user_city", geocode.city || "Your Location");
      localStorage.setItem("user_location_saved_at", Date.now().toString());
    } catch (err: any) {
      setLocationError(err.message || "Failed to geocode manual location");
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  // Load saved location on mount — "stale-while-revalidate" pattern:
  // 1. Show cached location IMMEDIATELY so the page renders fast
  // 2. ALWAYS silently refresh GPS in background to keep coords fresh
  // 3. If cache is older than 24h, force a fresh GPS request instead
  useEffect(() => {
    const LOCATION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

    const savedLoc = localStorage.getItem("user_location");
    const savedCity = localStorage.getItem("user_city");
    const savedAt = parseInt(localStorage.getItem("user_location_saved_at") || "0", 10);
    const cacheAge = Date.now() - savedAt;
    const isCacheStale = !savedAt || cacheAge > LOCATION_MAX_AGE_MS;

    if (savedLoc && !isCacheStale) {
      // Cache is fresh (< 24h) — use it immediately for instant render
      try {
        setLocation(JSON.parse(savedLoc));
        if (savedCity) setCity(savedCity);
        // Still refresh GPS silently in background so coords stay current
        resolveLocation();
      } catch {
        localStorage.removeItem("user_location");
        localStorage.removeItem("user_city");
        localStorage.removeItem("user_location_saved_at");
        resolveLocation();
      }
    } else {
      // No cache OR cache is stale (>24h) — must get fresh GPS
      // Clear stale data first so user gets accurate restaurants
      if (isCacheStale && savedLoc) {
        localStorage.removeItem("user_location");
        localStorage.removeItem("user_city");
        localStorage.removeItem("user_location_saved_at");
      }
      resolveLocation();
    }
  }, [resolveLocation]);

  // Fetch user profile on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const session = discoverSession();
      if (session && session.token) {
        try {
          const { data } = await axios.get(`${authService}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
          });
          if (data.user) {
            setUser(data.user);
            setIsAuth(true);
            // Silent token auto-renew: backend returns a fresh 15d token on every /me call.
            // Save it so the user never sees "session expired" as long as they
            // open the app at least once every 15 days.
            if (data.token && session.role) {
              setToken(data.token, session.role);
            }
          } else {
            logout();
          }
        } catch (err: any) {
          console.error("Auth initialization failed:", err);
          // Check if it's a 401 (expired/invalid token) vs a network error
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            toast.error("Session expired. Please log in again.", { duration: 5000 });
          } else if (!status) {
            // Network error — don't logout, just warn
            console.warn("Network error during auth check — keeping session.");
            // Try to restore user from the token payload directly
            try {
              const payload = JSON.parse(atob(session.token.split('.')[1]!));
              if (payload?.user && payload.exp * 1000 > Date.now()) {
                setUser(payload.user);
                setIsAuth(true);
                setLoading(false);
                return;
              }
            } catch { /* ignore parse errors */ }
          }
          logout();
        }
      } else {
        setIsAuth(false);
        setUser(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, [logout]);

  // Reactively fetch cart when authenticated
  useEffect(() => {
    if (isAuth) {
      fetchCart();
    }
  }, [isAuth, fetchCart]);

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        isAuth,
        setUser,
        setIsAuth,
        setLoading,
        location,
        setLocationManual,
        loadingLocation,
        city,
        locationError,
        setLocationError,
        cart,
        fetchCart,
        subTotal,
        quantity,
        logout,
        showPreloader,
        setShowPreloader,
        visibleRestaurants,
        setVisibleRestaurants,
        resolveLocation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};