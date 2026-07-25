import { getToken } from "../utils/authStorage";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { IMenuItem, IRestaurant } from "../types";
import { restaurantService } from "../config";
import axios from "axios";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import { useSocket } from "../context/SocketContext";
import { FiFilm, FiPlayCircle } from "react-icons/fi";
import { BiRestaurant } from "react-icons/bi";

const RestaurantPage = () => {

   const {id} = useParams();
   const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
   const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<"menu" | "reels">("menu");

   const fetchRestaurant = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/restaurant/${id}`, 
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      setRestaurant(data || null);
    } catch(error) {
        console.log(error);
    } finally {
        setLoading(false);
    }
   };

     const fetchMenuItems = async () => {
      try{
         const { data } = await axios.get(`${restaurantService}/api/item/all/${id}`, 
           {
               headers: {
                 Authorization: `Bearer ${getToken()}`,
               },
           });

           setMenuItems(data);
      } catch (error) {
       console.log(error);
      }
  };

  useEffect(() => {
    if(id) {
        fetchRestaurant();
        fetchMenuItems();
    }
  }, [id]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !restaurant) return;
    
    const handleStatusUpdate = (data: { restaurantId: string; isOpen: boolean }) => {
      if (data.restaurantId === restaurant._id) {
        setRestaurant((prev) => prev ? { ...prev, isOpen: data.isOpen } : null);
      }
    };

    socket.on("restaurant:status", handleStatusUpdate);
    return () => {
      socket.off("restaurant:status", handleStatusUpdate);
    };
  }, [socket, restaurant]);

  useEffect(() => {
    if (!socket) return;

    const handleItemStatusUpdate = (data: { itemId: string; restaurantId: string; isAvailable: boolean }) => {
      setMenuItems((prev) =>
        prev.map((item) =>
          item._id === data.itemId ? { ...item, isAvailable: data.isAvailable } : item
        )
      );
    };

    socket.on("item:status", handleItemStatusUpdate);
    return () => {
      socket.off("item:status", handleItemStatusUpdate);
    };
  }, [socket]);

  if(loading) {
    return (
        <div className="flex h-[60vh] items-center justify-center">
      <p className="text-gray-500">Loading restaurants...</p>
    </div>
    )
  }

  if(!restaurant) {
    return (
        <div className="flex h-[60vh] items-center justify-center">
      <p className="text-gray-500">No restaurant found with this id.</p>
    </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 space-y-6 max-w-7xl mx-auto">
      <RestaurantProfile restaurant={restaurant} onUpdate={setRestaurant} isSeller={false} />

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("menu")}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === "menu"
              ? "border-[#E23744] text-[#E23744]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <BiRestaurant className="h-4 w-4" />
          <span>Full Menu ({menuItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("reels")}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === "reels"
              ? "border-[#E23744] text-[#E23744]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <FiFilm className="h-4 w-4" />
          <span>Food Reels</span>
        </button>
      </div>

      {activeTab === "menu" ? (
        <div className="rounded-xl bg-white shadow-sm p-4">
          <MenuItems isSeller={false} items={menuItems} onItemDeleted={() => {}} />
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm p-8 text-center space-y-4">
          <div className="flex justify-center">
            <FiFilm className="h-12 w-12 text-[#E23744]" />
          </div>
          <h3 className="text-lg font-black text-gray-900">Watch {restaurant.name} Sizzling Reels</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Preview authentic behind-the-scenes cooking videos of featured dishes prepared by {restaurant.name}!
          </p>
          <a
            href={`/reels?restaurantId=${restaurant._id}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E23744] text-white font-extrabold text-xs shadow-lg hover:bg-red-600 transition"
          >
            <FiPlayCircle className="h-4 w-4" />
            <span>Launch {restaurant.name} Reel Player</span>
          </a>
        </div>
      )}
    </div>
  );
}

export default RestaurantPage;
