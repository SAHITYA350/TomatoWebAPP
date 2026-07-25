import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch, BiUser, BiHome } from "react-icons/bi";
import { FiFilm, FiShoppingBag } from "react-icons/fi";
import { FaLocationCrosshairs } from "react-icons/fa6";
import axios from "axios";
import { restaurantService } from "../config";
import { getToken } from "../utils/authStorage";

const Navbar = () => {

    const { isAuth, city, quantity, setLocationManual, loadingLocation } = useAppData();
    const currtLocation = useLocation();
    const isHomePage = currtLocation.pathname === "/";
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [locationInput, setLocationInput] = useState("");
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if(search) {
                setSearchParams({search});
                try {
                    const { data } = await axios.get(`${restaurantService}/api/restaurant/autocomplete?q=${search}`, {
                        headers: {
                            Authorization: `Bearer ${getToken()}`
                        }
                    });
                    setSuggestions(data);
                    setShowSuggestions(true);
                } catch(e) {}
            } else {
                setSearchParams({});
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 400);
        
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if(locationInput && isLocationModalOpen) {
                try {
                    const { data } = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}`);
                    setLocationSuggestions(data.slice(0, 5));
                } catch(e) {}
            } else {
                setLocationSuggestions([]);
            }
        }, 400);
        
        return () => clearTimeout(timer);
    }, [locationInput, isLocationModalOpen]);

    const handleLocationSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!locationInput.trim()) return;
      
      setIsSearchingLocation(true);
      try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}`);
        if (res.data && res.data.length > 0) {
          const { lat, lon, display_name } = res.data[0];
          await setLocationManual(Number(lat), Number(lon), display_name);
          setIsLocationModalOpen(false);
        } else {
          alert("Location not found. Please try a different query.");
        }
      } catch (err) {
        console.error("Geocoding failed", err);
        alert("Failed to find location. Please try again.");
      } finally {
        setIsSearchingLocation(false);
      }
    };

    const handleUseCurrentLocation = () => {
      setIsLocationModalOpen(false);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocationManual(position.coords.latitude, position.coords.longitude);
          },
          () => {
            alert("Could not get your current location.");
          }
        );
      }
    };

  if (currtLocation.pathname === "/login" || currtLocation.pathname === "/reels") {
    return null;
  }

  return (
    <>
    <div className="w-full bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to={'/'} className="flex items-center gap-1 text-2xl font-black tracking-tighter text-[#E23744] cursor-pointer">
         <span className="text-3xl leading-none">🍅</span>
         <span className="italic">Tomato</span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
            <Link to={'/cart'} className="relative">
             <CgShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 text-[#E23744]" />
             <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#E23744] text-[10px] sm:text-xs font-semibold text-white">
               {quantity}
             </span>
            </Link>
            <Link to={'/'} className="font-medium text-[#E23744] flex items-center gap-1">
              <BiHome className="h-6 w-6 sm:hidden" />
              <span className="hidden sm:block">Home</span>
            </Link>
            <Link to={'/orders'} className="font-medium text-[#E23744] flex items-center gap-1.5 hover:opacity-80 transition">
              <FiShoppingBag className="h-5 w-5" />
              <span className="hidden sm:block font-medium">Orders</span>
            </Link>
            <Link to={'/reels'} className="font-medium text-[#E23744] flex items-center gap-1.5 hover:opacity-80 transition">
              <FiFilm className="h-5 w-5" />
              <span className="hidden sm:block font-bold">Reels</span>
            </Link>
            {
              isAuth ? <Link to={"/account"} className="font-medium text-[#E23744] flex items-center gap-1">
                <BiUser className="h-6 w-6 sm:hidden" />
                <span className="hidden sm:block">Account</span>
              </Link> : <Link to={"/login"} className="font-medium text-[#E23744] flex items-center gap-1">
                <BiUser className="h-6 w-6 sm:hidden" />
                <span className="hidden sm:block">Login</span>
              </Link> 
            }
        </div>
      </div>

      {/* search bar */}
      {
        isHomePage && <div className="border-t px-4 py-3">
          <div className="mx-auto flex flex-col sm:flex-row max-w-7xl items-center rounded-lg border shadow-sm divide-y sm:divide-y-0 sm:divide-x">
            <div 
              className="flex w-full sm:w-auto items-center gap-2 px-3 text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors py-2 sm:rounded-l-lg"
              onClick={() => setIsLocationModalOpen(true)}
            >
              <BiMapPin className="h-4 w-4 text-[#E23744] shrink-0" />
              <span className="text-sm truncate w-full sm:max-w-[180px]">
                {loadingLocation ? "Locating..." : city}
              </span>
            </div>
            <div className="flex w-full sm:flex-1 items-center gap-2 px-3 relative py-1 sm:py-0">
              <BiSearch className="h-4 w-4 text-gray-400 shrink-0"/>
               <input 
                 type="text" 
                 placeholder="Search for restaurant or food.." 
                 value={search} 
                 onChange={e=>setSearch(e.target.value)} 
                 onFocus={() => { if(search) setShowSuggestions(true); }}
                 onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                 className="w-full py-2 text-sm outline-none" 
               />
               
               {showSuggestions && suggestions.length > 0 && (
                   <div className="absolute top-full left-0 right-0 bg-white border border-t-0 shadow-lg rounded-b-lg z-50 overflow-hidden">
                       {suggestions.map((s, idx) => (
                           <div 
                             key={idx} 
                             onClick={() => { 
                                 setSearch(s); 
                                 setShowSuggestions(false); 
                             }} 
                             className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-b-0 flex items-center gap-3 text-gray-700"
                           >
                               <BiSearch className="text-gray-400" /> {s}
                           </div>
                       ))}
                   </div>
               )}
            </div>
          </div>
        </div>
      }

    </div>

    {isLocationModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">Select Location</h3>
            <button onClick={() => setIsLocationModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
          </div>
          <div className="p-4">
            <button 
              onClick={handleUseCurrentLocation}
              className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100 font-medium mb-4"
            >
              <FaLocationCrosshairs className="text-lg" /> Detect Current Location
            </button>
            <div className="relative flex items-center mb-4">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            <form onSubmit={handleLocationSearch}>
              <div className="relative flex items-center border rounded-lg overflow-hidden focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-400 transition-all">
                <div className="pl-3 text-gray-400"><BiSearch className="h-5 w-5" /></div>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search for a city, area or street..." 
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full p-3 outline-none text-sm text-gray-700"
                />
              </div>
              {locationSuggestions.length > 0 && (
                <div className="mt-2 border rounded-lg overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                    {locationSuggestions.map((s, idx) => (
                        <div 
                            key={idx}
                            onClick={async () => {
                                setIsSearchingLocation(true);
                                await setLocationManual(Number(s.lat), Number(s.lon), s.display_name);
                                setIsLocationModalOpen(false);
                                setIsSearchingLocation(false);
                                setLocationInput("");
                                setLocationSuggestions([]);
                            }}
                            className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer text-sm flex gap-2 items-start"
                        >
                            <BiMapPin className="text-red-500 mt-0.5 shrink-0" />
                            <span className="text-gray-700">{s.display_name}</span>
                        </div>
                    ))}
                </div>
              )}
              <button 
                type="submit" 
                disabled={!locationInput.trim() || isSearchingLocation}
                className="w-full mt-4 bg-[#E23744] hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSearchingLocation ? "Searching..." : "Set Location"}
              </button>
            </form>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default Navbar
