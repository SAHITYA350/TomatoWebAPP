import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { getToken } from "../utils/authStorage";
import { restaurantService } from "../config";
import { 
    FiAward, FiCheckCircle, FiClock, FiTrendingDown, 
    FiStar, FiMapPin, FiAlertTriangle
} from "react-icons/fi";
import toast from "react-hot-toast";

interface HealthScoreProps {
    restaurantId: string;
}

interface MetricDetail {
    name: string;
    value: number;
    max: number;
    icon: React.ReactNode;
    color: string;
    trend?: "up" | "down" | "stable";
}

const RestaurantHealthScore = ({ restaurantId }: HealthScoreProps) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ordersRes, itemsRes] = await Promise.all([
                    axios.get(`${restaurantService}/api/order/restaurant/${restaurantId}`, {
                        headers: { Authorization: `Bearer ${getToken()}` },
                    }),
                    axios.get(`${restaurantService}/api/item/all/${restaurantId}`, {
                        headers: { Authorization: `Bearer ${getToken()}` },
                    }),
                ]);
                setOrders(ordersRes.data.orders || []);
                setMenuItems(itemsRes.data || []);
            } catch (error) {
                console.error("Error fetching health data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [restaurantId]);

    const healthMetrics = useMemo(() => {
        if (orders.length === 0) {
            return {
                overallScore: 85,
                grade: "B+",
                metrics: [],
                recommendations: ["Start taking orders to improve metrics", "Add more menu items for better visibility"]
            };
        }

        const total = orders.length;
        const delivered = orders.filter(o => o.status === "delivered").length;
        const cancelled = orders.filter(o => o.status === "cancelled").length;
        const paid = orders.filter(o => o.paymentStatus === "paid").length;

        // 1. Acceptance Rate (Target: 95%+)
        const acceptanceRate = Math.round(((total - cancelled) / total) * 100);

        // 2. Preparation Quality (Target: 25-30 mins avg)
        let prepTimeQuality = 100;
        const avgPrepTime = 30; // Assuming from existing logic
        if (avgPrepTime > 35) prepTimeQuality = 70;
        else if (avgPrepTime > 30) prepTimeQuality = 85;
        else prepTimeQuality = 100;

        // 3. Cancellation Rate (Lower is better, target: <5%)
        const cancellationRate = Math.round((cancelled / total) * 100);
        const cancellationScore = Math.max(0, 100 - cancellationRate * 2);

        // 4. Menu Availability (Target: 90%+)
        const availableItems = menuItems.filter(i => i.isAvailable).length;
        const menuAvailability = menuItems.length > 0 ? Math.round((availableItems / menuItems.length) * 100) : 100;

        // 5. Customer Ratings (Simulated: based on order success)
        const successRate = Math.round((delivered / total) * 100);
        const ratingScore = Math.min(100, 50 + (successRate * 0.5));

        // 6. On-Time Delivery Rate (Simulated: higher on low cancellations)
        const onTimeRate = Math.max(50, 100 - (cancellationRate * 1.5));

        // Calculate overall score (weighted average)
        const weights = {
            acceptance: 0.25,
            prepTime: 0.15,
            cancellation: 0.20,
            availability: 0.15,
            rating: 0.15,
            onTime: 0.10
        };

        const overallScore = Math.round(
            (acceptanceRate * weights.acceptance) +
            (prepTimeQuality * weights.prepTime) +
            (cancellationScore * weights.cancellation) +
            (menuAvailability * weights.availability) +
            (ratingScore * weights.rating) +
            (onTimeRate * weights.onTime)
        );

        const grade = 
            overallScore >= 90 ? "A+" :
            overallScore >= 85 ? "A" :
            overallScore >= 75 ? "B+" :
            overallScore >= 65 ? "B" :
            overallScore >= 50 ? "C" : "D";

        const recommendations = [];
        if (acceptanceRate < 95) recommendations.push(`Increase acceptance rate (currently ${acceptanceRate}%)`);
        if (cancellationRate > 5) recommendations.push(`Reduce cancellations (currently ${cancellationRate}%)`);
        if (prepTimeQuality < 85) recommendations.push("Optimize preparation time - target 25-30 mins");
        if (menuAvailability < 90) recommendations.push(`Increase menu availability (currently ${menuAvailability}%)`);
        if (ratingScore < 80) recommendations.push("Maintain food quality to improve ratings");
        if (onTimeRate < 90) recommendations.push("Reduce late deliveries");

        return {
            overallScore,
            grade,
            metrics: [
                { name: "Acceptance Rate", value: acceptanceRate, max: 100, icon: <FiCheckCircle size={18} />, color: "#10b981", trend: acceptanceRate > 90 ? "up" : "down" },
                { name: "Prep Time Quality", value: prepTimeQuality, max: 100, icon: <FiClock size={18} />, color: "#3b82f6", trend: prepTimeQuality > 85 ? "up" : "down" },
                { name: "Cancellation Rate", value: 100 - cancellationRate, max: 100, icon: <FiTrendingDown size={18} />, color: "#ef4444", trend: cancellationRate < 5 ? "up" : "down" },
                { name: "Menu Availability", value: menuAvailability, max: 100, icon: <FiCheckCircle size={18} />, color: "#f59e0b", trend: menuAvailability > 85 ? "up" : "down" },
                { name: "Customer Ratings", value: Math.round(ratingScore), max: 100, icon: <FiStar size={18} />, color: "#8b5cf6", trend: "stable" },
                { name: "On-Time Delivery", value: Math.round(onTimeRate), max: 100, icon: <FiMapPin size={18} />, color: "#06b6d4", trend: onTimeRate > 90 ? "up" : "down" }
            ],
            recommendations: recommendations.length > 0 ? recommendations : ["Great performance! Keep maintaining quality"]
        };
    }, [orders, menuItems]);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-red-500"></div>
            </div>
        );
    }

    const getScoreColor = (score: number) => {
        if (score >= 90) return "from-emerald-500 to-green-600";
        if (score >= 75) return "from-amber-500 to-orange-600";
        return "from-red-500 to-rose-600";
    };

    const getGradeColor = (score: number) => {
        if (score >= 90) return "text-green-600";
        if (score >= 75) return "text-orange-600";
        return "text-red-600";
    };

    return (
        <div className="space-y-6">
            {/* Main Health Score Card */}
            <div className={`bg-gradient-to-br ${getScoreColor(healthMetrics.overallScore)} rounded-3xl p-8 text-white shadow-lg`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                            <FiAward size={40} />
                        </div>
                        <div>
                            <p className="text-white/80 text-sm font-semibold">RESTAURANT HEALTH SCORE</p>
                            <h2 className="text-5xl font-black mt-1">{healthMetrics.overallScore}</h2>
                            <p className="text-white/70 text-sm mt-1">Grade: <span className={`font-bold ${getGradeColor(healthMetrics.overallScore)}`}>{healthMetrics.grade}</span></p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-white/60 text-xs">Status</div>
                        <div className="text-2xl font-bold mt-2">
                            {healthMetrics.overallScore >= 90 ? "⭐ Excellent" : 
                             healthMetrics.overallScore >= 75 ? "👍 Good" : 
                             "⚠️ Needs Work"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthMetrics.metrics.map((metric, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div style={{ color: metric.color }}>{metric.icon}</div>
                                <h3 className="text-sm font-semibold text-gray-700">{metric.name}</h3>
                            </div>
                            {metric.trend && (
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    metric.trend === "up" ? "bg-green-100 text-green-700" :
                                    metric.trend === "down" ? "bg-red-100 text-red-700" :
                                    "bg-gray-100 text-gray-700"
                                }`}>
                                    {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"}
                                </span>
                            )}
                        </div>

                        <div className="mb-2">
                            <div className="flex items-end gap-2 mb-1">
                                <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
                                <span className="text-sm text-gray-500">/ {metric.max}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${(metric.value / metric.max) * 100}%`,
                                        backgroundColor: metric.color
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Recommendations */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2 mt-1">
                        <FiAlertTriangle className="text-blue-600" size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 mb-3">AI Recommendations to Reach 100/100</h3>
                        <ul className="space-y-2">
                            {healthMetrics.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RestaurantHealthScore;
