import { useState, useEffect } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import { toast } from "react-hot-toast";
import { BiEdit, BiMapPin, BiSave } from "react-icons/bi";
import { useAppData } from "../context/AppContext";
import { getToken } from "../utils/authStorage";
import CircularGallery from "./CircularGallery";
import { getPremiumGalleryItems } from "../utils/galleryTextures";


interface props {
    restaurant: IRestaurant;
    isSeller: boolean;
    onUpdate: (restaurant: IRestaurant) => void;
}

const RestaurantProfile = ({restaurant, isSeller, onUpdate }: props) => {

    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(restaurant.name);
    const [description, setDescription] = useState(restaurant.description);
    const [isOpen, setIsOpen] = useState(restaurant.isOpen);
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    };

    useEffect(() => {
      setIsOpen(restaurant.isOpen);
    }, [restaurant.isOpen]);

    useEffect(() => {
      setName(restaurant.name);
      setDescription(restaurant.description || "");
    }, [restaurant.name, restaurant.description]);

    useEffect(() => {
      const handleToggleRequest = (e: Event) => {
        const customEvent = e as CustomEvent;
        const targetStatus = customEvent.detail;
        if (targetStatus !== isOpen) {
          toggleOpenStatus();
        }
      };
      window.addEventListener("seller-toggle-restaurant", handleToggleRequest);
      return () => window.removeEventListener("seller-toggle-restaurant", handleToggleRequest);
    }, [isOpen]);
  
    const toggleOpenStatus = async () => {
      try {
          const { data } = await axios.put(
          `${restaurantService}/api/restaurant/status`,
           { status: !isOpen },
           {
            headers: {
               Authorization: `Bearer ${getToken()}`,
             },
           }
         );

         toast.success(data.message);
         setIsOpen(data.restaurant.isOpen);
         onUpdate(data.restaurant);
      } catch (error) {
        console.log(error);
        if (axios.isAxiosError(error)) {
          toast.error(error.response?.data?.message || "An error occurred");
        } else {
          toast.error("An unexpected error occurred");
        }
      }
    };


    const saveChanges = async () => {

      try{ 
        setLoading(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description || "");
        if (imageFile) {
          formData.append("file", imageFile);
        }

        const { data } = await axios.put(`${restaurantService}/api/restaurant/edit`,
          formData,
           {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            }
           }
        );
        toast.success(data.message);
        onUpdate(data.restaurant);
        setEditMode(false);
        setImageFile(null);
        setImagePreview(null);
      }catch(error) {
       console.log(error);
       toast.error("Failed to update restaurant.");
      } finally {
        setLoading(false);
      }
    }


    const { logout } = useAppData();

    const logoutHandler = async () => {
      try {
        await axios.put(
            `${restaurantService}/api/restaurant/status`,
             { status: false },
             {
              headers: {
                 Authorization: `Bearer ${getToken()}`,
               },
             }
           );
      } catch (error) {
        console.warn("Failed to set restaurant status to closed during logout:", error);
      }
      logout("seller");
      toast.success("Logged out successfully");
    }
    
  return (
    <div className="w-full rounded-2xl bg-white shadow-sm overflow-hidden border border-gray-150 hover:shadow-md transition duration-300">
       <style>{`
         @keyframes float-slow {
           0% { transform: translate(0px, 0px) scale(1); }
           50% { transform: translate(25px, -15px) scale(1.12); }
           100% { transform: translate(0px, 0px) scale(1); }
         }
         @keyframes float-reverse {
           0% { transform: translate(0px, 0px) scale(1.12); }
           50% { transform: translate(-25px, 15px) scale(0.92); }
           100% { transform: translate(0px, 0px) scale(1.12); }
         }
         .animate-float-slow {
           animation: float-slow 12s infinite ease-in-out;
         }
         .animate-float-reverse {
           animation: float-reverse 15s infinite ease-in-out;
         }
       `}</style>

        <div className="relative w-full bg-linear-to-br from-[#070304] via-[#160608] to-[#070304] overflow-hidden flex flex-col md:flex-row items-stretch border-b border-gray-950 min-h-[360px] md:h-[400px] lg:h-[460px] select-none shadow-inner">
          {/* Ambient Zomato Red / Dark Glowing Orbs */}
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-[#E23744]/12 rounded-full filter blur-[65px] animate-float-slow pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 w-72 h-72 bg-[#ff4d5a]/08 rounded-full filter blur-[75px] animate-float-reverse pointer-events-none" />
          <div className="absolute left-1/2 top-1/4 w-56 h-56 bg-[#8c0e1a]/12 rounded-full filter blur-[60px] animate-pulse pointer-events-none" style={{ animationDuration: '6s' }} />

          {/* Left Side: Original Restaurant Poster */}
          {restaurant.image || imagePreview ? (
            <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-950/40 relative z-10 bg-black/20 group">
              <img 
                src={imagePreview || restaurant.image} 
                alt={restaurant.name}
                className="max-w-full max-h-[160px] sm:max-h-[220px] md:max-h-[340px] lg:max-h-[380px] object-contain rounded-xl shadow-lg transition-transform duration-700 hover:scale-[1.02]"
              />
              {editMode && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition">
                    Change Poster
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-gray-950/40 relative z-10 bg-black/20 text-center group">
              <span className="text-4xl mb-2">🍽️</span>
              <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase">Premium Restaurant Partner</p>
              {editMode && (
                <div className="mt-4">
                  <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition">
                    Upload Poster
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Right Side: Interactive 3D WebGL Circular Gallery */}
          <div className="w-full md:w-1/2 h-[300px] sm:h-[350px] md:h-full relative z-10 overflow-hidden">
            <div className="absolute inset-0">
              <CircularGallery 
                bend={1}
                textColor="#ffffff"
                borderRadius={0.05}
                scrollSpeed={2}
                scrollEase={0.05}
                font="bold 30px Orbitron"
                fontUrl="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap"
              />
            </div>
          </div>

          {/* Subtle top/bottom shadow gradients for premium depth */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-linear-to-b from-black/60 to-transparent pointer-events-none z-20" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-black/80 to-transparent pointer-events-none z-20" />
          
        </div>

      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            {editMode ? (
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-base sm:text-xl font-bold focus:border-[#E23744] focus:ring-1 focus:ring-[#E23744] outline-none shadow-sm"
              />
            ) : (
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                {restaurant.name}
              </h2>
            )}

            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 font-semibold leading-relaxed">
              <BiMapPin className="h-4.5 w-4.5 text-[#E23744] shrink-0" />
              <span>{restaurant.autoLocation?.formattedAddress || "Location unavailable"}</span>
            </div>
          </div>

          {isSeller && (
            <button
              onClick={() => setEditMode(!editMode)}
              className="inline-flex items-center justify-center p-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-150 hover:text-gray-900 transition cursor-pointer self-start sm:self-auto"
              title={editMode ? "Cancel Editing" : "Edit Details"}
            >
              <BiEdit size={20} />
            </button>
          )}
        </div>

        {editMode ? (
          <textarea
            value={description} 
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs sm:text-sm focus:border-[#E23744] focus:ring-1 focus:ring-[#E23744] outline-none min-h-[90px] shadow-sm"
            placeholder="Write an appetizing description for your restaurant..."
          />
        ) : (
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-3xl">
            {restaurant.description || "No description provided."}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase border shadow-sm ${
              isOpen 
                ? "bg-green-50 text-green-700 border-green-200" 
                : "bg-red-50 text-red-700 border-red-200"
            }`}>
              <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              STATUS: {isOpen ? "OPEN" : "CLOSED"}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {editMode && (
              <button
                onClick={saveChanges}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <BiSave size={18} />
                Save Changes
              </button>
            )}

            {isSeller && (
              <button 
                onClick={toggleOpenStatus} 
                className={`flex-1 sm:flex-none inline-flex justify-center items-center rounded-xl px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:shadow transition-all cursor-pointer ${
                  isOpen ? "bg-[#E23744] hover:bg-[#c82f3a]" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isOpen ? "Close Restaurant" : "Open Restaurant"}
              </button>
            )}

            {isSeller && (
              <button 
                onClick={logoutHandler} 
                className="flex-1 sm:flex-none inline-flex justify-center items-center rounded-xl px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:shadow transition-all bg-gray-800 hover:bg-gray-900 cursor-pointer"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400 font-medium pt-1">
          <span>Created on {new Date(restaurant.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfile;
