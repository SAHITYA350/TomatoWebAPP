import { getToken } from "../utils/authStorage";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from 'boneyard-js/react';
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService, realtimeService, restaurantService } from "../config";
import { toast } from "react-hot-toast";
import { BiUpload, BiCheckShield } from "react-icons/bi";
import { FiTrendingUp, FiStar, FiAward, FiMessageSquare, FiEdit, FiUser } from "react-icons/fi";
import type { IOrder } from "../types";
import audio from '../assets/notify1.mp3';
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";
import FoodSwitch from "../components/FoodSwitch";
import EditRiderProfileModal from "../components/EditRiderProfileModal";
import RiderAIAssistantModal from "../components/RiderAIAssistantModal";
import Footer from "../components/Footer";

interface IRider {
    _id: string;
    phoneNumber: string;
    addharNumber: string;
    drivingLicenseNumber: string;
    picture: string;
    isVerified: boolean;
    isAvailable: boolean;
}

const RiderDashboard = () => {
   const { user, location, logout } = useAppData();
   const {socket} = useSocket();
   const [profile, setProfile] = useState<IRider | null>(null);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [isSopModalOpen, setIsSopModalOpen] = useState(false);
   const [loading, setLoading] = useState(true);
   const [toggling, setToggling] = useState(false);
   const [incomingOrders, setIncomingOrders] = useState<Record<string, number>>({});
   const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);
   const [audioUnlocked, setAudioUnlocked] = useState(false);
   const audioRef = useRef<HTMLAudioElement | null>(null);

   useEffect(() => {
        try {
          audioRef.current = new Audio(audio);
          audioRef.current.preload = "auto";
        } catch (e) {}
   }, []);

   // Play notify1.mp3 notification sound only
   const playOrderNotificationSound = () => {
       try {
           setAudioUnlocked(true);
           if (audioRef.current) {
               audioRef.current.currentTime = 0;
               audioRef.current.volume = 1.0;
               audioRef.current.play().catch((err) => console.log("MP3 autoplay blocked:", err));
           }
       } catch (error) {
           console.error("Failed to play notification sound:", error);
       }
   };

   const unlockAudio = async () => {
        playOrderNotificationSound();
        toast.success("🔊 Notification Sound Enabled");
   };
    
   useEffect(() => {
       if (!socket) return;
       const onOrderingAvailable = ({ orderId }: { orderId: string }) => {
             setIncomingOrders((prev) => ({
                 ...prev,
                 [orderId]: Date.now()
             }));

             // Play loud notification chime
             playOrderNotificationSound();
       };

       socket.on("order:available", onOrderingAvailable);

       return () => {
        socket.off("order:available", onOrderingAvailable);
       }
   }, [socket]);

   const fecthProfile = async () => {
     try {
        const {data} = await axios.get(`${riderService}/api/rider/myprofile`, {
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        });
        setProfile(data || null);
     } catch (error) {
      setProfile(null)
     } finally {
      setLoading(false);
     }
   };

   useEffect(() => {
    if(user?.role === "rider") {
        fecthProfile();
    } else {
        setLoading(false);  
      }
    }, [user]);

   const fetchCurrentOrder = async () => {
     try {
        const { data } = await axios.get(`${riderService}/api/rider/order/current`, {
         headers: {
           Authorization: `Bearer ${getToken()}`,
         }
        });
       setCurrentOrder(data.order);
     } catch (error: any) {
       if (error?.response?.status !== 404) {
         console.log(error);
       }
       setCurrentOrder(null);
     }
   };

   useEffect(() => {
     if(!profile) return;
     fetchCurrentOrder();
   }, [profile]);

   useEffect(() => {
     if (!profile || !profile.isAvailable) return;

     const updateOnlineLocation = () => {
         if (!location?.latitude && !navigator.geolocation) return;

         const proceedWithUpdate = async (lat: number, lng: number) => {
             try {
                 await axios.patch(`${riderService}/api/rider/toggle`, {
                     isAvailable: true,
                     latitude: lat,
                     longitude: lng
                 }, {
                     headers: {
                         Authorization: `Bearer ${getToken()}`
                     }
                 });

                 await axios.post(`${realtimeService}/api/v1/internal/emit`, {
                     event: "rider:location:update",
                     room: "global",
                     payload: {
                         riderId: profile._id,
                         userId: user?._id,
                         latitude: lat,
                         longitude: lng
                     }
                 }, {
                     headers: {
                         "x-internal-key": import.meta.env.VITE_INTERNAL_SERVICE_KEY
                     }
                 });
             } catch (err) {
                 console.error("Failed to report rider location:", err);
             }
         };

         if (location?.latitude && location?.longitude) {
             proceedWithUpdate(location.latitude, location.longitude);
         } else {
             navigator.geolocation.getCurrentPosition(
                 (pos) => proceedWithUpdate(pos.coords.latitude, pos.coords.longitude),
                 (err) => console.warn("Location error:", err),
                 { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
             );
         }
     };

     updateOnlineLocation();
     const interval = setInterval(updateOnlineLocation, 10000);

     return () => clearInterval(interval);
   }, [profile?.isAvailable, profile?._id, user?._id, location]);

   const toggleAvailability = async () => {
     if (!location?.latitude && !navigator.geolocation) {
       toast.error("Location access is required");
       return;
     }

     if (!profile) return;

     // Optimistic UI update for instant smooth animation
     const targetState = !profile.isAvailable;
     setProfile(prev => prev ? { ...prev, isAvailable: targetState } : null);
     setToggling(true);

     // Unlock audio and play activation sound on click
     if (targetState) {
         playOrderNotificationSound();
     }

     const proceedWithToggle = async (lat: number, lng: number) => {
         try {
           await axios.patch(`${riderService}/api/rider/toggle`, {
             isAvailable: targetState,
             latitude: lat,
             longitude: lng
           },{
             headers: {
                 Authorization: `Bearer ${getToken()}`
             }
           });
           toast.success(targetState ? " You are online now" : "You are offline now");
           fecthProfile();
         } catch (error: any) {
           // Revert on failure
           setProfile(prev => prev ? { ...prev, isAvailable: !targetState } : null);
           toast.error(error?.response?.data?.message || "Something went wrong");
         } finally {
           setToggling(false);
         }
     };

     if (location?.latitude && location?.longitude) {
         proceedWithToggle(location.latitude, location.longitude);
     } else {
         navigator.geolocation.getCurrentPosition(
             (pos) => proceedWithToggle(pos.coords.latitude, pos.coords.longitude),
             (error) => {
                 setProfile(prev => prev ? { ...prev, isAvailable: !targetState } : null);
                 toast.error(error.message || "Failed to get location");
                 setToggling(false);
             }
         );
     }
   }; 

   const [phoneNumber, setPhoneNumber] = useState("");
   const [addharNumber, setAddharNumber] = useState("");
   const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
   const [image, setImage] = useState<File | null>(null);
   const [submitting, setSubmitting] = useState(false);

   const handleSubmit = async () => {
     if (!location?.latitude && !navigator.geolocation) {
       toast.error("Location access is required");
       return;
     }

     setSubmitting(true);

     const proceedWithRegistration = async (lat: number, lng: number) => {
         const formData = new FormData();
         formData.append("phoneNumber", phoneNumber);
         formData.append("addharNumber", addharNumber);
         formData.append("drivingLicenseNumber", drivingLicenseNumber);
         formData.append("latitude", lat.toString());
         formData.append("longitude", lng.toString());
          if(image) { 
            formData.append("file", image);
          }
         try {
           const {data} = await axios.post(`${riderService}/api/rider/new`, 
           formData,
           {
             headers: {
                 Authorization: `Bearer ${getToken()}`
             }
           }
         );
           toast.success(data.message || "Profile created successfully");
           fecthProfile();
         } catch (error: any) {
           toast.error(error?.response?.data?.message || "Failed to create profile");
         } finally {
           setSubmitting(false);
         }
     };

     if (location?.latitude && location?.longitude) {
         proceedWithRegistration(location.latitude, location.longitude);
     } else {
         navigator.geolocation.getCurrentPosition(
             (pos) => proceedWithRegistration(pos.coords.latitude, pos.coords.longitude),
             (error) => {
                 toast.error(error.message || "Failed to get location");
                 setSubmitting(false);
             }
         );
     }
   }

   // Handler to prevent negative numbers and non-digits
   const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
       const val = e.target.value.replace(/[^0-9]/g, '');
       setter(val);
   };

   if(user?.role !== "rider") {
     return ( 
       <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
         You are not registered as a rider. Please contact support to become a rider.
       </div> 
     );
   }

   if(!loading && !profile) {
     return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4 py-12 flex flex-col items-center justify-center relative">
            {/* Top Bar for Setup Screen */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-gray-900 border-b border-gray-800 z-50">
               <div className="flex items-center gap-3">
                   <img src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name || "User"}`} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-gray-700" />
                   <div>
                       <p className="text-white font-bold text-sm leading-tight">{user?.name}</p>
                       <p className="text-gray-400 text-xs">Completing Registration</p>
                   </div>
               </div>
               <button onClick={() => logout && logout()} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-red-500/10 text-gray-300 hover:text-red-400 border border-gray-700 hover:border-red-500/50 rounded-xl transition-all text-sm font-semibold">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                   Sign Out
               </button>
            </div>

            <div className="w-full max-w-lg rounded-3xl bg-gray-900 border border-gray-800 p-8 shadow-2xl relative overflow-hidden mt-16">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#e23744] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

                <h1 className="text-3xl font-bold text-white mb-2">Join the Fleet</h1>
                <p className="text-gray-400 text-sm mb-8">Set up your rider profile and start earning today.</p>

                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Aadhar Number</label>
                    <input type="text"
                     placeholder="Enter 12 digit Aadhar" 
                     value={addharNumber}
                     onChange={e=> handleNumberChange(e, setAddharNumber)}
                     maxLength={12}
                     className="w-full rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-white outline-none focus:border-[#e23744] focus:ring-1 focus:ring-[#e23744] transition-all" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Contact Number</label>
                    <input 
                    type="text"
                     placeholder="Mobile Number"
                      value={phoneNumber}
                       onChange={e=> handleNumberChange(e, setPhoneNumber)}
                       maxLength={10}
                       className="w-full rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-white outline-none focus:border-[#e23744] focus:ring-1 focus:ring-[#e23744] transition-all" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Driving License</label>
                    <input 
                    type="text"
                     placeholder="License Number"
                      value={drivingLicenseNumber}
                       onChange={e=> setDrivingLicenseNumber(e.target.value)}
                       className="w-full rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-white outline-none focus:border-[#e23744] focus:ring-1 focus:ring-[#e23744] transition-all" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Profile Picture</label>
                    <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-gray-600 bg-gray-800/30 p-6 text-sm text-gray-400 hover:border-gray-400 hover:text-white transition-all">
                      <BiUpload className="h-6 w-6 text-[#e23744]" />
                      {image ? image.name : "Tap to upload your photo"}
                      <input type="file" accept="image/*" hidden onChange={e => setImage(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  
                  {/* Location Info Display */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-sm flex items-start gap-3 mt-2">
                    <div className="mt-0.5 text-[#e23744]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-medium mb-1">Base Location</p>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            {location?.latitude 
                                ? "Your registration location is synced with your selected Map Location (visible in the top Navbar). Make sure it matches the restaurant's city for testing!" 
                                : "We will use your device GPS location to register your operating zone."}
                        </p>
                    </div>
                  </div>

                  <button onClick={handleSubmit} disabled={submitting} className="w-full cursor-pointer rounded-xl mt-6 py-4 text-sm font-bold text-white bg-gradient-to-r from-[#e23744] to-red-600 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all active:scale-[0.98]">
                    {submitting ? "Creating Profile..." : "Complete Setup"}
                  </button>
                </div>
            </div>     
        </div>
     );
   }

 return (
    <Skeleton name="rider-dashboard" loading={loading}>
      {profile && (
        <div className="min-h-screen bg-gray-50/50">
           {/* Header */}
           <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
              <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                      <img src={profile.picture} alt="" className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0"/>
                      <div className="min-w-0">
                          <div className="flex items-center gap-2">
                              <h2 className="font-bold text-gray-900 truncate">{user?.name}</h2>
                              <button onClick={() => setIsEditModalOpen(true)} className="p-1 text-gray-400 hover:text-gray-700 bg-gray-50 rounded-full hover:bg-gray-200 transition-colors">
                                  <FiEdit className="w-3.5 h-3.5" />
                              </button>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                              <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${profile.isVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} truncate`}>
                                  {profile.isVerified ? <BiCheckShield className="shrink-0"/> : null}
                                  <span className="truncate">{profile.isVerified ? "Verified Partner" : "Pending Verification"}</span>
                              </span>
                          </div>
                      </div>
                  </div>
                  {/* Status Toggle & AI SOP Button */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-center justify-center w-full sm:w-auto mt-4 sm:mt-0 gap-3">
                       {profile.isVerified && !currentOrder && (
                          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 w-full sm:w-auto justify-between sm:justify-start">
                              <div className="flex flex-col items-start">
                                <span className={`text-xs font-bold uppercase tracking-wider ${profile.isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                                    {toggling ? "Updating..." : profile.isAvailable ? "Online" : "Offline"}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {profile.isAvailable ? "Receiving orders" : "Tap to start"}
                                </span>
                              </div>
                              <FoodSwitch 
                                checked={profile.isAvailable} 
                                onChange={toggleAvailability} 
                                disabled={toggling}
                              />
                          </div>
                      )}
                      
                      {/* AI RAG SOP Assistant Trigger */}
                      <button
                         onClick={() => setIsSopModalOpen(true)}
                         className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-extrabold rounded-2xl hover:bg-red-100 transition-colors w-full sm:w-auto justify-center cursor-pointer shadow-sm"
                      >
                         <span>🤖</span> Rider AI SOP Assistant
                      </button>

                      {/* Logout Button */}
                      <button 
                         onClick={() => {
                             logout();
                             window.location.href = '/login';
                         }}
                         className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-2xl hover:bg-gray-800 transition-colors w-full sm:w-auto justify-center"
                      >
                         <FiUser /> Logout
                      </button>
                  </div>
              </div>
           </div>

           <div className="mx-auto max-w-7xl px-6 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                 
                 {/* Left Column */}
                 <div className="lg:col-span-4 space-y-6">
                      
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                          {profile?._id && <RiderAnalyticsDisplay riderId={profile._id} />}
                      </div>

                      {!audioUnlocked && (
                          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                  <FiMessageSquare size={100}/>
                              </div>
                              <h3 className="font-bold text-lg mb-1 relative z-10">Enable Alerts</h3>
                              <p className="text-blue-100 text-sm mb-6 relative z-10">Never miss an order ping. Enable sound notifications to hear alerts.</p>
                              <button onClick={unlockAudio} className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors cursor-pointer relative z-10">
                                  Turn On Sound
                              </button>
                          </div>
                      )}
                 </div>

                 {/* Right Column */}
                 <div className="lg:col-span-8 space-y-6">
                     
                     {profile.isAvailable && Object.keys(incomingOrders).length > 0 && (
                      <div>
                          <div className="flex items-center gap-2 mb-4">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e23744] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#e23744]"></span>
                              </span>
                              <h3 className="font-bold text-gray-900 text-lg">Incoming Requests</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(incomingOrders).map(([id, pingTs]) => (
                              <RiderOrderRequest
                                key={id}
                                orderId={id}
                                pingTimestamp={pingTs}
                                onAccepted={() => {
                                  setIncomingOrders((prev) => {
                                    const next = { ...prev };
                                    delete next[id];
                                    return next;
                                  });
                                  fecthProfile();
                                  fetchCurrentOrder();
                                }}
                                onTimeout={() => {
                                  setIncomingOrders((prev) => {
                                    const next = { ...prev };
                                    delete next[id];
                                    return next;
                                  });
                                }}
                              />
                            ))}
                          </div>
                      </div>
                     )}

                     {currentOrder ? (
                         <div className="space-y-6">
                             <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                 <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                 Active Delivery
                             </h3>
                             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                 <div className="p-1">
                                    <RiderCurrentOrder order={currentOrder} onStatusUpdate={fetchCurrentOrder} />
                                 </div>
                             </div>
                             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[400px]">
                                 <RiderOrderMap order={currentOrder} />
                             </div>
                         </div>
                     ) : (
                         profile.isAvailable && Object.keys(incomingOrders).length === 0 ? (
                             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                                 <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                     <div className="h-10 w-10 bg-green-500 rounded-full animate-ping opacity-20 absolute"></div>
                                     <FiTrendingUp className="text-green-500 h-8 w-8" />
                                 </div>
                                 <h3 className="text-xl font-bold text-gray-900 mb-2">Looking for orders</h3>
                                 <p className="text-gray-500">Stay in hotspot zones to get trips faster.</p>
                             </div>
                         ) : !profile.isAvailable && !currentOrder ? (
                             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                                 <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                     <FiAward className="text-gray-400 h-8 w-8" />
                                 </div>
                                 <h3 className="text-xl font-bold text-gray-900 mb-2">You're Offline</h3>
                                 <p className="text-gray-500 max-w-sm mx-auto">Go online to start receiving delivery requests from restaurants nearby.</p>
                             </div>
                         ) : null
                     )}
                 </div>
              </div>
           </div>

            {profile && (
                <>
                    <EditRiderProfileModal 
                        isOpen={isEditModalOpen} 
                        onClose={() => setIsEditModalOpen(false)} 
                        currentProfile={profile} 
                        onProfileUpdated={fecthProfile} 
                    />
                    <RiderAIAssistantModal
                        isOpen={isSopModalOpen}
                        onClose={() => setIsSopModalOpen(false)}
                    />
                </>
            )}

            <Footer />
        </div>
      )}
     </Skeleton>
  );
};

const RiderAnalyticsDisplay = ({ riderId }: { riderId: string }) => {
    const [analytics, setAnalytics] = useState<any>(null);
    const { socket } = useSocket();

    const fetchAnalytics = async () => {
        try {
            const { data } = await axios.get(`${restaurantService}/api/order/rider/${riderId}/analytics`);
            setAnalytics(data);
        } catch (err) {
            console.error("Failed to load rider analytics", err);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [riderId]);

    useEffect(() => {
        if (!socket) return;

        socket.emit("join", `rider:${riderId}`);

        const onRated = () => {
            fetchAnalytics();
            toast.success("New Customer Rating Received! ⭐", { icon: "🎉" });
        };

        socket.on("order:rated:rider", onRated);

        return () => {
            socket.off("order:rated:rider", onRated);
        };
    }, [socket, riderId]);

    if (!analytics) return (
        <div className="animate-pulse space-y-4">
            <div className="h-12 w-32 bg-gray-200 rounded-lg"></div>
            <div className="h-40 w-full bg-gray-100 rounded-xl"></div>
        </div>
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Lifetime Rating</h3>
                    <div className="flex items-end gap-1">
                        <span className="text-4xl font-black text-gray-900 leading-none">{analytics.averageRating}</span>
                        <span className="text-2xl text-yellow-400 mb-0.5">★</span>
                    </div>
                </div>
                <div className="text-right">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Total Trips</h3>
                    <span className="text-2xl font-bold text-gray-700 leading-none">{analytics.totalRatings}</span>
                </div>
            </div>
            
            <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Recent Feedback</h3>
                {analytics.recentFeedback?.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {analytics.recentFeedback.map((fb: any, i: number) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-0.5 mb-1.5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className={`text-base ${star <= fb.rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-700 italic font-medium leading-relaxed">"{fb.feedback || "Good service!"}"</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
                        <FiStar className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No ratings yet.</p>
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
            `}} />
        </div>
    );
};

export default RiderDashboard;
