import { getToken } from "../utils/authStorage";
import { Skeleton } from 'boneyard-js/react';
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState, useCallback } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import RestaurantCard from "../components/RestaurantCard";
import { useSocket } from "../context/SocketContext";

import LiveReviewFeed from "../components/LiveReviewFeed";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CustomerAdsCarousel from "../components/CustomerAdsCarousel";
import RecommendedItems from "../components/RecommendedItems";
import toast from "react-hot-toast";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ManualLocationPicker = ({ onPick }: { onPick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const Home = () => {
  const { location, city, setVisibleRestaurants, loadingLocation, locationError, setLocationManual, resolveLocation } = useAppData();
  const [ searchParams ] = useSearchParams();

  const search = searchParams.get("search") || "";
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1)*Math.PI/180);
    const dLon = ((lon2 - lon1)*Math.PI/180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos((lat1*Math.PI/180)) * Math.cos((lat2*Math.PI/180)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return +(R * c).toFixed(2);
  }

  const fetchRestaurants = useCallback(async () => {
    if(!location?.latitude || !location?.longitude) {
      return;
    }

     try {
      setLoading(true);
      const { data } = await axios.get(`${restaurantService}/api/restaurant/all`, 
        {
         params: {
           latitude: location.latitude,
           longitude: location.longitude,
           search,
          },
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      setRestaurants(data.restaurants ?? []);
      setVisibleRestaurants(data.restaurants ?? []);
     } catch (error) {
       console.log(error);
     } finally {
      setLoading(false);
     }
  }, [location, search]);

  useEffect(() => {
   fetchRestaurants(); 
  }, [fetchRestaurants]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    
    socket.emit("join", "global");

    const handleStatusUpdate = (data: { restaurantId: string; isOpen: boolean }) => {
      setRestaurants((prev) =>
        prev.map((res) =>
          res._id === data.restaurantId ? { ...res, isOpen: data.isOpen } : res
        )
      );
    };

    socket.on("restaurant:status", handleStatusUpdate);
    return () => {
      socket.off("restaurant:status", handleStatusUpdate);
    };
  }, [socket]);

  const handleRetryLocation = async () => {
    setShowManualPicker(false);
    await resolveLocation();
  };

  const handleMapPick = async (lat: number, lng: number) => {
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    await setLocationManual(lat, lng);
    setShowManualPicker(false);
    toast.success("Location updated!");
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Please enter valid coordinates");
      return;
    }
    await setLocationManual(lat, lng);
    setShowManualPicker(false);
    toast.success("Location updated!");
  };

  const showLocationFallback = !loadingLocation && !location && locationError;

  return (
    <Skeleton name="customer-home" loading={loading || loadingLocation}>
      {!(loading || loadingLocation) && (
        <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-col lg:flex-row gap-6">
                
                {showLocationFallback ? (
                  <div className="flex-1 w-full">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-4">
                      <div className="text-4xl">📍</div>
                      <h2 className="text-xl font-bold text-gray-800">Location Access Required</h2>
                      <p className="text-sm text-gray-600 max-w-md mx-auto">
                        {locationError}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={handleRetryLocation}
                          className="rounded-lg bg-[#E23744] px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 cursor-pointer"
                        >
                          Try Again (Allow Location)
                        </button>
                        <button
                          onClick={() => setShowManualPicker(!showManualPicker)}
                          className="rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 cursor-pointer"
                        >
                          Pick on Map
                        </button>
                      </div>

                      {showManualPicker && (
                        <form onSubmit={handleManualSubmit} className="mt-4 space-y-3">
                          <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200">
                            <MapContainer
                              center={[manualLat ? parseFloat(manualLat) : 20.2961, manualLng ? parseFloat(manualLng) : 85.8245]}
                              zoom={13}
                              scrollWheelZoom={false}
                              style={{ height: "100%", width: "100%" }}
                            >
                              <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                subdomains="abcd"
                                maxZoom={20}
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                              />
                              <ManualLocationPicker onPick={handleMapPick} />
                              {manualLat && manualLng && (
                                <Marker position={[parseFloat(manualLat), parseFloat(manualLng)]}>
                                  <Popup>Selected location</Popup>
                                </Marker>
                              )}
                            </MapContainer>
                          </div>
                          <p className="text-xs text-gray-500">Click anywhere on the map to select your location.</p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <input
                              type="number"
                              step="any"
                              placeholder="Latitude"
                              value={manualLat}
                              onChange={(e) => setManualLat(e.target.value)}
                              className="w-32 rounded-lg border px-3 py-2 text-sm"
                            />
                            <input
                              type="number"
                              step="any"
                              placeholder="Longitude"
                              value={manualLng}
                              onChange={(e) => setManualLng(e.target.value)}
                              className="w-32 rounded-lg border px-3 py-2 text-sm"
                            />
                            <button
                              type="submit"
                              className="rounded-lg bg-[#E23744] px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 cursor-pointer"
                            >
                              Use This Location
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Main Content: Restaurants List */}
                    <div className="flex-1 w-full lg:w-[calc(100%-380px)] xl:w-[calc(100%-420px)] mt-4">
                        <CustomerAdsCarousel />
                        
                        <RecommendedItems />
                        
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Restaurants near you</h2>
                        {restaurants.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4">
                            {
                                restaurants.map((res) => {
                                const [resLng, resLat] = res.autoLocation.coordinates;

                                const distance = getDistanceKm(
                                    location!.latitude,
                                    location!.longitude,
                                    resLat,
                                    resLng
                                );
                                
                                return  <RestaurantCard key={res._id} 
                                id={res._id} name={res.name} image={res.image ?? ""} distance={`${distance}`} isOpen={res.isOpen} description={res.description}/>
                                })
                            }
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-10 bg-gray-50 rounded-xl">
                                No restaurants found near you.
                            </p>
                        )}
                    </div>

                    {/* Sidebar: Location Map & Social Media Feed */}
                    <div className="w-full lg:w-80 xl:w-96 shrink-0 mt-8 lg:mt-0 flex flex-col gap-6">
                        {/* Live Location Map */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-gray-800">Your Search Location</h3>
                                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span> Live
                                </span>
                            </div>
                            <div className="h-48 w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
                                {location?.latitude && location?.longitude ? (
                                    <MapContainer 
                                        key={`${location.latitude}-${location.longitude}`}
                                        center={[location.latitude, location.longitude]} 
                                        zoom={13} 
                                        scrollWheelZoom={false}
                                        style={{ height: "100%", width: "100%" }}
                                    >
                                        <TileLayer
                                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                            subdomains="abcd"
                                            maxZoom={20}
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                                        />
                                        <Marker position={[location.latitude, location.longitude]}>
                                            <Popup>
                                                <div className="text-center font-semibold text-gray-800">
                                                    {location.formattedAddress}
                                                </div>
                                            </Popup>
                                            <Tooltip permanent direction="top" offset={[0, -20]} className="font-bold whitespace-nowrap bg-white/90 px-2 py-1 rounded shadow-sm text-[#E23744] border-none text-xs">
                                                📍 {city}
                                            </Tooltip>
                                        </Marker>
                                    </MapContainer>
                                ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                                        Location not set
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-3 text-center">
                                Restaurant distances are calculated from this pin.
                            </p>
                        </div>

                        {/* Live Reviews */}
                        <LiveReviewFeed />
                    </div>
                  </>
                )}
            </div>
        </div>
      )}
    </Skeleton>
  )
}

export default Home;
