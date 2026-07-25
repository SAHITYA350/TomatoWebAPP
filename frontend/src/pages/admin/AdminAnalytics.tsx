import { useState, useEffect } from "react";
import axios from "axios";
import { adminService } from "../../config";
import { getToken } from "../../utils/authStorage";
import { Skeleton } from "boneyard-js/react";
import { FiTrendingUp, FiServer, FiFilm, FiActivity, FiDollarSign, FiShoppingBag, FiCheckCircle } from "react-icons/fi";

interface AnalyticsData {
    dailyTrends: Array<{ _id: string; revenue: number; ordersCount: number }>;
    topRestaurants: Array<{ _id: string; restaurantName: string; totalRevenue: number; totalOrders: number }>;
    reelsAnalytics: { totalReels: number; totalLikes: number; totalComments: number };
    fleetMetrics: { onlineRiders: number; verifiedRestaurants: number; openRestaurants: number };
    microservicesHealth: Record<string, string>;
}

const AdminAnalytics = () => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        try {
            const token = getToken();
            const { data } = await axios.get(`${adminService}/api/v1/admin/analytics`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAnalytics(data);
        } catch (err) {
            console.error("Failed to fetch analytics:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const maxRevenue = analytics?.dailyTrends?.length 
        ? Math.max(...analytics.dailyTrends.map(d => d.revenue), 100) 
        : 100;

    return (
        <Skeleton name="admin-analytics" loading={loading}>
            {analytics && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FiActivity className="text-[#E23744]" /> Real-time System Analytics
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Platform sales velocity, microservice health monitors, and top operational metrics.
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-200 self-start sm:self-auto">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Microservices Live
                        </span>
                    </div>

                    {/* Microservices Cluster Health Grid */}
                    <div className="bg-gray-950 text-white rounded-2xl p-6 border border-gray-800 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                                <FiServer className="text-red-400" />
                                Microservices Health & Status Matrix
                            </h3>
                            <span className="text-[10px] font-mono text-gray-400">REST + WebSocket Architecture</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {Object.entries(analytics.microservicesHealth).map(([service, status]) => (
                                <div key={service} className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold uppercase text-gray-300">{service}</span>
                                        <FiCheckCircle className="text-emerald-400 text-xs" />
                                    </div>
                                    <p className="text-[10px] font-mono text-emerald-400 font-semibold">{status}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 7-Day Revenue Trend Chart Visual */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <FiTrendingUp className="text-[#E23744]" /> Revenue & Sales Velocity (Last 7 Days)
                                </h3>
                                <p className="text-xs text-gray-500">Daily gross turnover from paid customer orders</p>
                            </div>
                        </div>

                        {analytics.dailyTrends.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-6 text-center">No sales data recorded in the last 7 days.</p>
                        ) : (
                            <div className="space-y-3 pt-2">
                                {analytics.dailyTrends.map((trend) => {
                                    const pct = Math.min(100, Math.round((trend.revenue / maxRevenue) * 100));
                                    return (
                                        <div key={trend._id} className="space-y-1">
                                            <div className="flex justify-between text-xs font-semibold text-gray-700">
                                                <span>{trend._id}</span>
                                                <span className="font-mono text-gray-900">₹{trend.revenue.toLocaleString("en-IN")} ({trend.ordersCount} orders)</span>
                                            </div>
                                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-red-500 to-[#E23744] rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.max(5, pct)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Bottom Split: Top Restaurants & Food Reels Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Top Performing Restaurants */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <FiShoppingBag className="text-amber-500" /> Top Performing Restaurants
                            </h3>

                            <div className="divide-y divide-gray-100">
                                {analytics.topRestaurants.map((res, idx) => (
                                    <div key={res._id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-black text-gray-700">
                                                #{idx + 1}
                                            </span>
                                            <div>
                                                <h4 className="font-bold text-xs text-gray-800">{res.restaurantName}</h4>
                                                <p className="text-[10px] text-gray-400">{res.totalOrders} total completed orders</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-xs font-mono text-emerald-600">₹{res.totalRevenue.toLocaleString("en-IN")}</span>
                                    </div>
                                ))}
                                {analytics.topRestaurants.length === 0 && (
                                    <p className="text-xs text-gray-400 py-4 text-center">No restaurant sales recorded yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Food Reels Performance */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <FiFilm className="text-pink-500" /> Food Reels Content Performance
                            </h3>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-4 rounded-xl bg-pink-50/50 border border-pink-100 text-center space-y-1">
                                    <p className="text-[10px] font-bold text-pink-600 uppercase">Total Reels</p>
                                    <p className="text-xl font-black text-pink-900">{analytics.reelsAnalytics.totalReels}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-center space-y-1">
                                    <p className="text-[10px] font-bold text-purple-600 uppercase">Total Likes</p>
                                    <p className="text-xl font-black text-purple-900">{analytics.reelsAnalytics.totalLikes}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-center space-y-1">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase">Comments</p>
                                    <p className="text-xl font-black text-blue-900">{analytics.reelsAnalytics.totalComments}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </Skeleton>
    );
};

export default AdminAnalytics;
