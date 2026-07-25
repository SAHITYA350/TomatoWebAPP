import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../config";
import { useSocket } from "../context/SocketContext";
import { FaStar } from "react-icons/fa";
import { MdRestaurant, MdDeliveryDining } from "react-icons/md";

interface FeedItem {
    _id: string;
    customerName: string;
    customerImage: string;
    location: string;
    restaurantName?: string;
    restaurantRating?: number;
    restaurantFeedback?: string;
    riderName?: string;
    riderImage?: string;
    riderRating?: number;
    riderFeedback?: string;
    items?: {
        name: string;
        image?: string;
    }[];
    createdAt: string;
}

const LiveReviewFeed = () => {
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const { socket } = useSocket();

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const { data } = await axios.get(`${restaurantService}/api/order/feed`);
                if (data.success) {
                    setFeed(data.feed);
                }
            } catch (err) {
                console.error("Failed to fetch live feed", err);
            }
        };
        fetchFeed();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const onNewReview = (item: FeedItem) => {
            setFeed(prev => {
                const exists = prev.find(p => p._id === item._id);
                if (exists) {
                    return prev.map(p => p._id === item._id ? item : p);
                }
                return [item, ...prev].slice(0, 50);
            });
        };

        socket.on("feed:new_review", onNewReview);
        return () => {
            socket.off("feed:new_review", onNewReview);
        };
    }, [socket]);

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <FaStar key={star} className={`text-[10px] sm:text-xs ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`} />
                ))}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 h-full lg:sticky lg:top-4 w-full">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">Live Reviews</h3>
            </div>
            <div className="space-y-4 max-h-[400px] md:max-h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar">
                {feed.length > 0 ? (
                    feed.map((item) => (
                        <div key={item._id} className="animate-fade-in-up bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100 shadow-sm transition-all hover:shadow-md">
                            {/* Customer Info Header */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 overflow-hidden shadow-inner">
                                    <img 
                                        src={item.customerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.customerName)}&background=random`} 
                                        alt="" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.customerName)}&background=random`;
                                        }}
                                    />
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">{item.customerName}</p>
                                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">{item.location}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium">
                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                {/* Food Rating Section */}
                                {item.restaurantRating && (
                                    <div className="bg-white p-2.5 sm:p-3 rounded-md border border-gray-100 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-1.5 text-gray-700">
                                                <MdRestaurant className="text-orange-500" />
                                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide truncate max-w-[140px]">{item.restaurantName}</span>
                                            </div>
                                            {renderStars(item.restaurantRating)}
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-600 italic mt-1.5 leading-snug">"{item.restaurantFeedback || "Great food!"}"</p>
                                        
                                        {/* Display Food Items */}
                                        {item.items && item.items.length > 0 && (
                                            <div className="mt-2 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                                                {item.items.map((food, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2 py-1 shrink-0">
                                                        <div className="h-4 w-4 rounded-full overflow-hidden shrink-0 bg-gray-200">
                                                            <img 
                                                                src={food.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(food.name)}&background=random`} 
                                                                alt={food.name} 
                                                                className="h-full w-full object-cover" 
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(food.name)}&background=random`;
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-gray-600 truncate max-w-[80px]">{food.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Rider Rating Section */}
                                {item.riderRating && (
                                    <div className="bg-white p-2.5 sm:p-3 rounded-md border border-gray-100 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-200 bg-blue-50 flex justify-center items-center">
                                                    <img 
                                                        src={item.riderImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.riderName || 'Rider')}&background=random`} 
                                                        alt="rider" 
                                                        className="h-full w-full object-cover" 
                                                        onError={(e) => {
                                                            e.currentTarget.onerror = null;
                                                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.riderName || 'Rider')}&background=random`;
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide truncate max-w-[140px]">{item.riderName}</span>
                                                    <span className="text-[9px] text-gray-500">Delivery Partner</span>
                                                </div>
                                            </div>
                                            {renderStars(item.riderRating)}
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-600 italic mt-1.5 leading-snug">"{item.riderFeedback || "Fast delivery!"}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-400 py-10 flex flex-col items-center justify-center">
                        <MdRestaurant className="text-3xl text-gray-300 mb-2" />
                        <p className="text-sm font-medium">Waiting for live reviews...</p>
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.4s ease-out forwards;
                }
            `}} />
        </div>
    );
};

export default LiveReviewFeed;
