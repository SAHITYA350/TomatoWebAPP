import type { IRestaurant } from "../types";
import { clearAuth } from "../utils/authStorage";
import { useState, useRef, useEffect } from "react";
import { FiLogOut, FiMapPin, FiPhone, FiChevronDown, FiMail } from "react-icons/fi";
import { useAppData } from "../context/AppContext";

interface Props {
  restaurant: IRestaurant;
}

const RestaurantNavbar = ({ restaurant }: Props) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAppData();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth("seller");
    window.location.href = "/login";
  };

  return (
    <nav className="bg-white shadow-sm rounded-2xl p-4 flex items-center justify-between mb-6 relative">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-[#E23744] tracking-tighter italic">Tomato</span>
        <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-md uppercase tracking-widest ml-1 hidden sm:inline-block">Partner</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Account Menu */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl transition border border-gray-100"
          >
            <div className="h-8 w-8 rounded-full bg-[#E23744] flex items-center justify-center text-white font-bold text-sm shadow-inner">
              {restaurant.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 line-clamp-1 max-w-[120px]">{restaurant.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Account</p>
            </div>
            <FiChevronDown className={`text-gray-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">{restaurant.name}</h3>
                <p className="text-xs text-gray-500 mt-1">Partner Dashboard</p>
              </div>
              
              <div className="p-2 space-y-1">
                {user?.email && (
                  <div className="flex items-center gap-3 p-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                    <FiMail className="text-[#E23744] shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  <FiPhone className="text-[#E23744] shrink-0" />
                  <span>+91 {restaurant.phone}</span>
                </div>

                <div className="flex items-start gap-3 p-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  <FiMapPin className="text-[#E23744] mt-0.5 shrink-0" />
                  <span className="leading-tight">{restaurant.autoLocation?.formattedAddress || "No address provided"}</span>
                </div>
              </div>

              <div className="p-2 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  <FiLogOut />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default RestaurantNavbar;
