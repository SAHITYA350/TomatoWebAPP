import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { getToken } from "../utils/authStorage";
import { restaurantService } from "../config";
import { FiTrendingUp, FiShoppingBag, FiPercent, FiClock, FiActivity, FiAward, FiAlertCircle } from "react-icons/fi";

interface StatsProps {
    restaurantId: string;
}

import { useSocket } from "../context/SocketContext";

const SellerDashboardStats = ({ restaurantId }: StatsProps) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    const fetchOrders = async () => {
        try {
            const { data } = await axios.get(
                `${restaurantService}/api/order/restaurant/${restaurantId}`,
                {
                    headers: { Authorization: `Bearer ${getToken()}` },
                }
            );
            setOrders(data.orders || []);
        } catch (error) {
            console.error("Error loading stats orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [restaurantId]);

    useEffect(() => {
        if (!socket || !restaurantId) return;

        const handleNewReview = () => {
            fetchOrders();
        };

        const handleOrderUpdate = () => {
            fetchOrders();
        }

        socket.on("order:rated:restaurant", handleNewReview);
        socket.on("order:update", handleOrderUpdate);

        return () => {
            socket.off("order:rated:restaurant", handleNewReview);
            socket.off("order:update", handleOrderUpdate);
        };
    }, [socket, restaurantId]);

    // Compute metrics
    const metrics = useMemo(() => {
        const totalOrders = orders.length;
        const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
        const deliveredOrders = orders.filter((o) => o.status === "delivered");
        const cancelledOrders = orders.filter((o) => o.status === "cancelled");

        // Total sales
        const totalSales = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        // Today's sales
        const today = new Date().toDateString();
        const todayOrders = paidOrders.filter((o) => new Date(o.createdAt).toDateString() === today);
        const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        // AOV
        const averageOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

        // Acceptance Rate (non-cancelled / total)
        const acceptanceRate = totalOrders > 0 ? Math.round(((totalOrders - cancelledOrders.length) / totalOrders) * 100) : 100;

        // Cancellation Rate
        const cancellationRate = totalOrders > 0 ? Math.round((cancelledOrders.length / totalOrders) * 100) : 0;

        // Kitchen Load & Est Prep Time
        const activeOrdersCount = orders.filter(
            (o) => !["delivered", "cancelled"].includes(o.status)
        ).length;

        let estimatedPrepTime = 25; // default 25 mins
        let kitchenLoad = "Light";
        if (activeOrdersCount > 5) {
            estimatedPrepTime = 45;
            kitchenLoad = "Overloaded ⚠️";
        } else if (activeOrdersCount > 2) {
            estimatedPrepTime = 35;
            kitchenLoad = "Moderate";
        }

        // Calculate 7-Day sales breakdown for chart
        const dailySales: Record<string, number> = {};
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        
        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toDateString();
            const dayName = days[d.getDay()];
            dailySales[dateStr] = 0;
        }

        // Aggregate sales
        paidOrders.forEach((o) => {
            const dateStr = new Date(o.createdAt).toDateString();
            if (dailySales[dateStr] !== undefined) {
                dailySales[dateStr] += o.totalAmount;
            }
        });

        const chartData = Object.entries(dailySales).map(([dateStr, amount]) => {
            const d = new Date(dateStr);
            return {
                day: days[d.getDay()],
                amount,
                date: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
            };
        });

        // Health Score (AOV, Acceptance, Cancellation, Rating fallback)
        // Max score = 100.
        // Base score starts from acceptance rate, subtracts cancellation rate.
        let healthScore = Math.max(50, Math.min(100, 100 - cancellationRate));
        if (totalOrders === 0) healthScore = 100; // Perfect health on start

        return {
            totalOrders,
            totalSales,
            todayRevenue,
            todayOrdersCount: todayOrders.length,
            averageOrderValue,
            acceptanceRate,
            cancellationRate,
            activeOrdersCount,
            estimatedPrepTime,
            kitchenLoad,
            chartData,
            healthScore,
        };
    }, [orders]);

    if (loading) {
        return (
            <div className="flex h-40 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-red-500"></div>
            </div>
        );
    }

    // Determine max amount in chart to scale the bars
    const maxChartAmount = Math.max(...metrics.chartData.map((d) => d.amount), 100);

    return (
        <div className="space-y-6">
            {/* Top Row: Health Score & Actionable Tips */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Health Card */}
                <div className="flex flex-col items-center justify-center rounded-2xl border bg-white p-6 shadow-sm text-center lg:col-span-1">
                    <FiAward className="h-10 w-10 text-red-500 mb-2" />
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Restaurant Health Score</h3>
                    
                    <div className="relative my-4 flex items-center justify-center">
                        {/* Circular ring simulator */}
                        <div className="h-28 w-28 rounded-full border-8 border-gray-100 flex items-center justify-center">
                            <span className="text-3xl font-extrabold text-gray-800">{metrics.healthScore}</span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                        Based on Acceptance rate ({metrics.acceptanceRate}%), Cancellation rate ({metrics.cancellationRate}%), and active kitchen workload.
                    </p>
                </div>

                {/* Operations & AI Advisor */}
                <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                        AI Operations Advisor
                    </h3>
                    
                    <div className="space-y-3">
                        <div className="flex gap-3 items-start bg-red-50/50 p-3.5 rounded-xl border border-red-100 text-xs">
                            <FiAlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-red-950 mb-0.5">Estimated Preparation Time Advice</h4>
                                <p className="text-red-900 leading-normal">
                                    Your kitchen load is currently **{metrics.kitchenLoad}** with {metrics.activeOrdersCount} pending orders. The AI recommends keeping estimated prep time at **{metrics.estimatedPrepTime} minutes** to set accurate expectations for riders and customers.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 items-start bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-xs">
                            <FiActivity className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-blue-950 mb-0.5">Menu Health & Archive Suggestions</h4>
                                <p className="text-blue-900 leading-normal">
                                    {metrics.totalOrders > 0 
                                        ? "Your top-performing combo is suggested to be linked as a discount pack. Check 'AI Assistant' in the right corner for customized combo suggestors!"
                                        : "You have no orders yet. Go online and set your operational status to 'Open' to begin receiving orders. Keep your menu concise for faster prep times."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start text-gray-400">
                        <span className="text-xs font-bold uppercase tracking-wider">Today's Revenue</span>
                        <FiTrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mt-2">₹{metrics.todayRevenue.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-400 mt-1">{metrics.todayOrdersCount} orders today</p>
                </div>

                <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start text-gray-400">
                        <span className="text-xs font-bold uppercase tracking-wider">AOV (Avg Order)</span>
                        <FiShoppingBag className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mt-2">₹{metrics.averageOrderValue.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-400 mt-1">Average ticket price</p>
                </div>

                <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start text-gray-400">
                        <span className="text-xs font-bold uppercase tracking-wider">Acceptance Rate</span>
                        <FiPercent className="h-5 w-5 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mt-2">{metrics.acceptanceRate}%</p>
                    <p className="text-xs text-gray-400 mt-1">Acceptance benchmark</p>
                </div>

                <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start text-gray-400">
                        <span className="text-xs font-bold uppercase tracking-wider">Kitchen Load</span>
                        <FiClock className="h-5 w-5 text-orange-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mt-2">{metrics.kitchenLoad}</p>
                    <p className="text-xs text-gray-400 mt-1">Est. Prep: {metrics.estimatedPrepTime}m</p>
                </div>
            </div>

            {/* Sales Chart (Drawn with responsive CSS bars) */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Sales Revenue (Last 7 Days)</h3>
                
                <div className="flex h-64 items-end gap-1.5 sm:gap-3 pt-6 border-b border-gray-100">
                    {metrics.chartData.map((d) => {
                        const heightPercent = Math.max(5, Math.round((d.amount / maxChartAmount) * 100));
                        return (
                            <div key={d.day} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                {/* Hover Tooltip */}
                                <div className="absolute bottom-full mb-2 bg-[#1a1a2e] text-white text-[10px] font-bold px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none z-10">
                                    ₹{d.amount.toLocaleString("en-IN")} ({d.date})
                                </div>
                                {/* Bar */}
                                <div
                                    style={{ height: `${heightPercent}%` }}
                                    className="w-full max-w-[28px] sm:max-w-[40px] rounded-t-lg bg-[#E23744] hover:bg-[#c62828] transition duration-300 shadow-sm"
                                ></div>
                                {/* Day Label */}
                                <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold mt-2 font-sans select-none">{d.day}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SellerDashboardStats;
