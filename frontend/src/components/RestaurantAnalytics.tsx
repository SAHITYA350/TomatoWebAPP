import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { getToken } from "../utils/authStorage";
import { restaurantService } from "../config";
import { useSocket } from "../context/SocketContext";
import {
    FiTrendingUp, FiMapPin, FiActivity, FiAward, FiClock, FiPercent,
    FiAlertCircle, FiRefreshCw, FiBarChart2, FiZap
} from "react-icons/fi";
import toast from "react-hot-toast";

interface AnalyticsProps {
    restaurantId: string;
    location?: { lat: number; lng: number };
}

interface OrderAnalytics {
    totalOrders: number;
    todayRevenue: number;
    todayOrders: number;
    averageOrderValue: number;
    acceptanceRate: number;
    healthScore: number;
    kitchenLoad: string;
    estimatedPrepTime: number;
    activeOrders: number;
    chartData: Array<{ day: string; date: string; amount: number }>;
    trendingItems: Array<{ name: string; sales: number; revenue: number }>;
}

interface Recommendation {
    id: string;
    type: "opportunity" | "alert" | "insight";
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    action?: () => void;
}

const RestaurantAnalytics: React.FC<AnalyticsProps> = ({ restaurantId, location }) => {
    const { socket } = useSocket();
    const [analytics, setAnalytics] = useState<OrderAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

    // Fetch analytics data
    const fetchAnalytics = useCallback(async () => {
        try {
            setRefreshing(true);
            const { data } = await axios.get(
                `${restaurantService}/api/order/restaurant/${restaurantId}/analytics`,
                {
                    headers: { Authorization: `Bearer ${getToken()}` },
                    params: location ? { lat: location.lat, lng: location.lng } : {},
                }
            );
            
            setAnalytics(data.analytics);
            setRecommendations(data.recommendations || []);
        } catch (error: any) {
            console.error("Analytics fetch error:", error);
            toast.error("Failed to load analytics");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [restaurantId, location]);

    useEffect(() => {
        fetchAnalytics();

        // Subscribe to real-time updates via socket
        if (socket) {
            const handleOrderUpdate = () => {
                fetchAnalytics();
            };

            socket.on(`restaurant:${restaurantId}:order-update`, handleOrderUpdate);
            socket.on(`restaurant:${restaurantId}:analytics-update`, handleOrderUpdate);

            return () => {
                socket.off(`restaurant:${restaurantId}:order-update`, handleOrderUpdate);
                socket.off(`restaurant:${restaurantId}:analytics-update`, handleOrderUpdate);
            };
        }
    }, [restaurantId, socket, fetchAnalytics]);

    if (loading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-500"></div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-red-700">No analytics data available</p>
            </div>
        );
    }

    const maxChartAmount = Math.max(...analytics.chartData.map((d) => d.amount), 100);

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Restaurant Analytics</h1>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                        {location && (
                            <>
                                <FiMapPin className="h-4 w-4" />
                                <span>Location-based insights enabled</span>
                            </>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => fetchAnalytics()}
                    disabled={refreshing}
                    className="rounded-lg bg-white p-3 hover:bg-gray-50 disabled:opacity-50 transition"
                    title="Refresh analytics"
                >
                    <FiRefreshCw className={`h-5 w-5 text-red-500 ${refreshing ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Health Score & Key Metrics */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Health Score */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Health Score</span>
                        <FiAward className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="text-4xl font-bold text-gray-900">{analytics.healthScore}</div>
                    <p className="text-xs text-gray-500 mt-2">Based on acceptance & operations</p>
                </div>

                {/* Today's Revenue */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Revenue</span>
                        <FiTrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-4xl font-bold text-gray-900">₹{analytics.todayRevenue.toLocaleString("en-IN")}</div>
                    <p className="text-xs text-gray-500 mt-2">{analytics.todayOrders} orders</p>
                </div>

                {/* Acceptance Rate */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Acceptance</span>
                        <FiPercent className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-4xl font-bold text-gray-900">{analytics.acceptanceRate}%</div>
                    <p className="text-xs text-gray-500 mt-2">Order acceptance rate</p>
                </div>

                {/* Kitchen Load */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kitchen Load</span>
                        <FiActivity className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{analytics.kitchenLoad}</div>
                    <p className="text-xs text-gray-500 mt-2">Prep: {analytics.estimatedPrepTime}m • {analytics.activeOrders} active</p>
                </div>
            </div>

            {/* 7-Day Revenue Chart */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiBarChart2 className="h-5 w-5 text-red-500" />
                    7-Day Revenue Trend
                </h3>
                <div className="flex h-48 items-end gap-2 pt-4">
                    {analytics.chartData.map((d) => {
                        const heightPercent = Math.max(5, (d.amount / maxChartAmount) * 100);
                        return (
                            <div key={d.day} className="flex-1 flex flex-col items-center group">
                                <div className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                                    ₹{d.amount.toLocaleString("en-IN")}
                                </div>
                                <div
                                    style={{ height: `${heightPercent}%` }}
                                    className="w-full max-w-[24px] rounded-t-lg bg-gradient-to-t from-red-500 to-red-400 hover:from-red-600 hover:to-red-500 transition shadow-sm"
                                ></div>
                                <span className="text-xs text-gray-500 font-medium mt-2">{d.day}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Trending Items (Item Craze) */}
            {analytics.trendingItems && analytics.trendingItems.length > 0 && (
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="text-xl">🔥</span>
                        Item Craze (Top Trending)
                    </h3>
                    <div className="space-y-4">
                        {analytics.trendingItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-xs">
                                        #{index + 1}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                                        <p className="text-xs text-gray-500">{item.sales} units sold</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900 text-sm">₹{item.revenue.toLocaleString("en-IN")}</p>
                                    <p className="text-[10px] text-green-600 font-semibold uppercase">Trending</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI-Powered Recommendations */}
            {recommendations.length > 0 && (
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FiZap className="h-5 w-5 text-yellow-500" />
                        AI Recommendations
                    </h3>
                    <div className="space-y-3">
                        {recommendations.slice(0, 3).map((rec) => (
                            <div
                                key={rec.id}
                                className={`flex gap-3 items-start p-3 rounded-lg border transition ${
                                    rec.type === "alert"
                                        ? "bg-red-50 border-red-200"
                                        : rec.type === "opportunity"
                                        ? "bg-green-50 border-green-200"
                                        : "bg-blue-50 border-blue-200"
                                }`}
                            >
                                <div className={`h-5 w-5 shrink-0 mt-0.5 ${
                                    rec.type === "alert" ? "text-red-500" : rec.type === "opportunity" ? "text-green-500" : "text-blue-500"
                                }`}>
                                    {rec.type === "alert" && <FiAlertCircle className="h-5 w-5" />}
                                    {rec.type === "opportunity" && <FiTrendingUp className="h-5 w-5" />}
                                    {rec.type === "insight" && <FiZap className="h-5 w-5" />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-sm text-gray-900">{rec.title}</h4>
                                    <p className="text-xs text-gray-600 mt-0.5">{rec.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-white p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalOrders}</p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Average Order Value</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">₹{analytics.averageOrderValue.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Active Orders</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.activeOrders}</p>
                </div>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-gray-500 text-center">
                Real-time updates enabled • Last refreshed: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

export default RestaurantAnalytics;
