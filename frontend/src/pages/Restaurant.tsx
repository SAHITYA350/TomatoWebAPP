import { getToken, setToken } from "../utils/authStorage";
import { useEffect, useState, useRef } from "react";
import { Skeleton } from 'boneyard-js/react';
import type { IMenuItem, IRestaurant, IOrder } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import RestaurantOrders from "../components/RestaurantOrders";
import SellerGenAIPanel from "../components/SellerGenAIPanel";
import SellerDashboardLayout from "../components/SellerDashboardLayout";
import SellerPillNav from "../components/SellerPillNav";
import RestaurantNavbar from "../components/RestaurantNavbar";
import type { PillTabItem } from "../components/SellerPillNav";
import { useSocket } from "../context/SocketContext";
import { toast } from "react-hot-toast";
import audio from '../assets/notify2.mp3';
import { FiVideo } from "react-icons/fi";
import CreateReelModal from "../components/reels/CreateReelModal";
import Footer from "../components/Footer";

type SellerTab = "menu" | "add-item" | "sales" | "realtime" | "genai"; 

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up"
];

const Restaurant = () => {
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SellerTab>("menu");
  const [time, setTime] = useState(new Date());
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevActiveCountRef = useRef<number>(0);
  const { socket } = useSocket();

  const [customSoundUrl, setCustomSoundUrl] = useState<string | null>(null);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);

  useEffect(() => {
    const savedSound = localStorage.getItem('customNotificationSound');
    if (savedSound) {
      setCustomSoundUrl(savedSound);
    }
  }, []);

  useEffect(() => {
    audioRef.current = new Audio(customSoundUrl || audio);
    audioRef.current.load();
  }, [customSoundUrl]);

  const handleCustomSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
         toast.error("Audio file too large. Please use a file under 2MB.");
         return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        localStorage.setItem('customNotificationSound', base64);
        setCustomSoundUrl(base64);
        toast.success("Custom notification sound set successfully!");
        
        // Play preview immediately
        if (audioUnlocked) {
          const previewAudio = new Audio(base64);
          previewAudio.play().catch(console.error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetSound = () => {
    localStorage.removeItem('customNotificationSound');
    setCustomSoundUrl(null);
    toast.success("Notification sound reset to default.");
  };

  const unlockAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current!.pause();
        audioRef.current!.currentTime = 0;
        setAudioUnlocked(true);
      }).catch((error) => {
        console.error("Audio unlock failed:", error);
      });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (["menu", "add-item", "sales", "realtime", "genai"].includes(customEvent.detail)) {
        setTab(customEvent.detail as SellerTab);
      }
    };
    window.addEventListener("seller-change-tab", handleTabChange);
    return () => window.removeEventListener("seller-change-tab", handleTabChange);
  }, []);

  const fetchMyRestaurant = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/restaurant/my`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      setRestaurant(data.restaurant || null);

      if (data.token) {
        setToken(data.token, "seller");
        window.location.reload();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status !== 400) {
          console.error("Error fetching restaurant:", error);
        }
      } else {
        console.error("Error fetching restaurant:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchMyRestaurant();
    })();
  }, []);

  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);

  const fetchMenuItems = async (restaurantId: string) => {
     try{
        const { data } = await axios.get(`${restaurantService}/api/item/all/${restaurantId}`, 
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

  const fetchOrders = async (restaurantId: string) => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/restaurant/${restaurantId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        }
      });
      setOrders(data.orders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      if(restaurant?._id){
        await fetchMenuItems(restaurant._id);
        await fetchOrders(restaurant._id);
      }
    };
    fetch();
  }, [restaurant]);

  // Detect new active orders and trigger notifications
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  useEffect(() => {
    const currentActiveCount = activeOrders.length;
    const prevCount = prevActiveCountRef.current;

    // Detect new order (count increased)
    if (currentActiveCount > prevCount && prevCount !== 0) {
      const newCount = currentActiveCount - prevCount;
      toast.success(`🔔 ${newCount} new order${newCount > 1 ? 's' : ''} received!`, {
        duration: 5000,
        style: { background: '#059669', color: '#fff', fontWeight: 600 },
      });

      // Try to send email notification via backend
      if (restaurant?._id) {
        axios.post(
          `${restaurantService}/api/order/restaurant/${restaurant._id}/notify`,
          { type: 'new_order', count: newCount },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        ).catch(() => {
          // Notification endpoint may not exist yet — silent fail
        });
      }
    }

    prevActiveCountRef.current = currentActiveCount;
  }, [activeOrders.length]);

  // Socket listeners for real-time order updates
  useEffect(() => {
    if (!socket || !restaurant?._id) return;

    const onNewOrder = () => {
      if (audioUnlocked && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => {
          console.error("Audio play failed:", err);
        });
      }
      fetchOrders(restaurant._id);
    };

    const onUpdateOrder = () => {
      fetchOrders(restaurant._id);
    };

    socket.on("order:new", onNewOrder);
    socket.on("order:rider_assigned", onUpdateOrder);
    socket.on("order:update", onUpdateOrder);
    socket.on("order:rated:restaurant", onUpdateOrder);

    return () => {
      socket.off("order:new", onNewOrder);
      socket.off("order:rider_assigned", onUpdateOrder);
      socket.off("order:update", onUpdateOrder);
      socket.off("order:rated:restaurant", onUpdateOrder);
    };
  }, [socket, audioUnlocked, restaurant]);

  // if(loading)
  //  return (
  //  <div className="flex min-h-screen items-center justify-center">
  //    <p className="text-gray-500">Loading your restaurant...</p>
  //    </div>
  //  );

  if(!loading && !restaurant) {
    return <AddRestaurant fetchMyRestaurant={fetchMyRestaurant} />
  }

  const toLayoutTab = (tab: SellerTab): "sales" | "items" | "realtime" => {
    if (tab === "sales" || tab === "menu" || tab === "add-item") return "sales";
    if (tab === "realtime") return "realtime";
    return "sales";
  };

  const toSalesSubTab = (tab: SellerTab): "overview" | "menu" | "add-item" => {
    if (tab === "menu") return "menu";
    if (tab === "add-item") return "add-item";
    return "overview";
  };

  const handleLayoutTabChange = (next: "sales" | "items" | "realtime") => {
    if (next === "sales") setTab("sales");
    else if (next === "realtime") setTab("realtime");
  };

  const handleLayoutSalesSubChange = (next: "overview" | "menu" | "add-item") => {
    if (next === "menu") setTab("menu");
    else if (next === "add-item") setTab("add-item");
    else setTab("sales");
  };

  // --- Pill tab items (no active/completed — those are always visible) ---
  const pillItems: PillTabItem[] = [
    {
      key: "menu",
      label: "Menu Items",
      icon: (
        <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      ),
      accentColor: "#E23744",
      hoverCircleColor: "#E23744",
    },
    {
      key: "add-item",
      label: "Add Item",
      icon: (
        <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
        </svg>
      ),
      accentColor: "#7c3aed",
      hoverCircleColor: "#7c3aed",
    },
    {
      key: "sales",
      label: "Sales Overview",
      icon: (
        <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
      ),
      accentColor: "#2563eb",
      hoverCircleColor: "#2563eb",
    },
    {
      key: "realtime",
      label: "Real-Time",
      icon: (
        <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
      accentColor: "#d97706",
      hoverCircleColor: "#d97706",
    },
  ];

  return (
    <Skeleton name="seller-dashboard" loading={loading}>
      {restaurant && (
        <div className="min-h-screen bg-gray-50 px-2 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
           <RestaurantNavbar restaurant={restaurant} />
           
           {/* Responsive Live Operations Header with Clock */}
           <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3.5 sm:p-5 rounded-2xl text-white shadow-md"
                style={{ background: '#E23744' }}>
               <div className="text-center sm:text-left">
                   <h1 className="text-base sm:text-xl font-bold tracking-tight">Restaurant Partner Control Center</h1>
                   <p className="text-[10px] sm:text-xs mt-0.5 font-medium font-sans" style={{ color: 'rgba(255,255,255,0.7)' }}>Manage profile, menu inventory, orders, and sales stats.</p>
               </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 self-center sm:self-auto shrink-0">
                    <button
                        onClick={() => setIsCreateReelOpen(true)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-extrabold text-[11px] sm:text-xs bg-white text-[#E23744] shadow-md hover:bg-gray-100 transition cursor-pointer flex items-center gap-1.5"
                    >
                        <FiVideo className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#E23744]" />
                        <span>Upload Food Reel</span>
                    </button>
                    <div className="flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl"
                         style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold font-mono tracking-wider select-none">
                            LIVE CLOCK: {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Create Reel Modal */}
            <CreateReelModal
                isOpen={isCreateReelOpen}
                onClose={() => setIsCreateReelOpen(false)}
                restaurantId={restaurant._id}
                restaurantName={restaurant.name}
            />

           {/* Audio Notification Settings Banner */}
           {!audioUnlocked ? (
             <div className="rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
               <div className="flex items-center gap-3">
                 <span className="text-xl sm:text-2xl">🔔</span>
                 <div>
                   <p className="font-medium text-xs sm:text-base" style={{ color: '#1e3a5f' }}>Enable Sound Notification</p>
                   <p className="text-[10px] sm:text-sm" style={{ color: '#1d4ed8' }}>Get notified when new orders arrive</p>
                 </div>
               </div>
               <button onClick={unlockAudio} className="text-white px-3 sm:px-4 py-1.5 sm:py-2 cursor-pointer rounded-lg font-medium transition w-full sm:w-auto text-center text-xs sm:text-sm"
                       style={{ background: '#2563eb' }}>
                 Enable sound
               </button>
             </div>
           ) : (
             <div className="rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
               <div className="flex items-center gap-3">
                 <span className="text-xl sm:text-2xl">🔊</span>
                 <div>
                   <p className="font-medium text-xs sm:text-base" style={{ color: '#166534' }}>Sound Notifications Active</p>
                   <p className="text-[10px] sm:text-sm" style={{ color: '#15803d' }}>
                     {customSoundUrl ? "Using custom uploaded sound" : "Using default sound"}
                   </p>
                 </div>
               </div>
               <div className="flex flex-row gap-2 w-full sm:w-auto items-center">
                 {customSoundUrl && (
                   <button onClick={handleResetSound} className="text-red-600 bg-red-50 hover:bg-red-100 px-2.5 sm:px-3 py-1.5 sm:py-2 cursor-pointer rounded-lg font-semibold transition text-[11px] sm:text-sm flex-1 sm:flex-none text-center">
                     Reset Default
                   </button>
                 )}
                 <label className="text-white px-3 sm:px-4 py-1.5 sm:py-2 cursor-pointer rounded-lg font-medium transition text-center text-[11px] sm:text-sm flex-1 sm:flex-none shadow-sm hover:shadow-md"
                        style={{ background: '#16a34a' }}>
                   Change Sound
                   <input type="file" accept="audio/mp3,audio/wav,audio/ogg" hidden onChange={handleCustomSoundUpload} />
                 </label>
               </div>
             </div>
           )}

           <RestaurantProfile restaurant={restaurant} onUpdate={setRestaurant} isSeller={true} />

           {/* ===== ORDERS: Active (left) + Completed (right) — always visible ===== */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
             <div className="rounded-xl bg-white shadow-sm p-3 sm:p-5" style={{ border: '1px solid #e5e7eb' }}>
               <RestaurantOrders
                 orders={activeOrders}
                 loading={ordersLoading}
                 type="active"
                 onStatusUpdate={() => fetchOrders(restaurant._id)}
                 compact={true}
                 restaurantLocation={{ lat: restaurant.autoLocation.coordinates[1], lng: restaurant.autoLocation.coordinates[0] }}
               />
             </div>
             <div className="rounded-xl bg-white shadow-sm p-3 sm:p-5" style={{ border: '1px solid #e5e7eb' }}>
               <RestaurantOrders
                 orders={completedOrders}
                 loading={ordersLoading}
                 type="completed"
                 onStatusUpdate={() => fetchOrders(restaurant._id)}
                 compact={true}
                 restaurantLocation={{ lat: restaurant.autoLocation.coordinates[1], lng: restaurant.autoLocation.coordinates[0] }}
               />
             </div>
           </div>

           {/* ===== Main Tab Panel ===== */}
           <div className="rounded-xl bg-white shadow-sm overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
              {/* Top-level tabs: Sales & Operations | Tomato AI */}
              <div className="flex p-1.5 sm:p-2 gap-1.5 sm:gap-2" style={{ borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
                  {[
                   {key: "sales-ops", label: "Sales & Operations", isActive: tab !== "genai"},
                   {key: "genai", label: "Tomato AI", isActive: tab === "genai"},
                  ].map((t) => (
                   <button key={t.key} onClick={ () => setTab(t.key === "genai" ? "genai" : "menu")}
                     className={`flex-1 rounded-lg px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold tracking-wide transition-all truncate sm:whitespace-nowrap cursor-pointer shadow-sm ${t.isActive ? 'bg-[#E23744] text-white hover:bg-[#c82f3a]' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                     style={{
                       transform: t.isActive ? 'scale(1.01)' : 'scale(1)'
                     }}>
                     {t.label}
                   </button>
                  ))}
              </div>

              {/* GSAP Pill Sub-Navigation */}
              {tab !== "genai" && (
                <SellerPillNav
                  items={pillItems}
                  activeKey={tab}
                  onSelect={(key) => setTab(key as SellerTab)}
                />
              )}

             <div className="p-2 sm:p-5">
               {tab === "genai" ? (
                 <SellerGenAIPanel />
               ) : (
                 <SellerDashboardLayout
                   restaurantId={restaurant._id}
                   restaurantLat={restaurant.autoLocation.coordinates[1]}
                   restaurantLng={restaurant.autoLocation.coordinates[0]}
                   menuItems={menuItems}
                   onMenuItemsChanged={() => fetchMenuItems(restaurant._id)}
                   showHeader={false}
                   activeTab={toLayoutTab(tab)}
                   salesSubTab={toSalesSubTab(tab)}
                   onTabChange={handleLayoutTabChange}
                   onSalesSubTabChange={handleLayoutSalesSubChange}
                 />
               )}
              </div>
           </div>

           <Footer />
         </div>
       )}
    </Skeleton>
  )
}

export default Restaurant;
