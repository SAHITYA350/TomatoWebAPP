import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { getToken } from "../utils/authStorage";
import { restaurantService } from "../config";
import {
    FiPackage, FiEye, FiEyeOff, FiTrendingUp, FiTrendingDown,
    FiClock, FiAlertTriangle, FiCheckCircle, FiXCircle
} from "react-icons/fi";
import toast from "react-hot-toast";

interface ItemAvailabilityProps {
    restaurantId: string;
}

interface ItemHealth {
    _id: string;
    name: string;
    price: number;
    isAvailable: boolean;
    lastSoldTime?: Date;
    totalSales: number;
    avgOrdersPerDay: number;
    conversionRate: number;
    suggestion: "promote" | "reduce-price" | "archive" | "increase-stock" | "monitor";
    suggestionsText: string;
}

const ItemAvailabilityManager = ({ restaurantId }: ItemAvailabilityProps) => {
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [itemsRes, ordersRes] = await Promise.all([
                    axios.get(`${restaurantService}/api/item/all/${restaurantId}`, {
                        headers: { Authorization: `Bearer ${getToken()}` },
                    }),
                    axios.get(`${restaurantService}/api/order/restaurant/${restaurantId}`, {
                        headers: { Authorization: `Bearer ${getToken()}` },
                    }),
                ]);
                setMenuItems(itemsRes.data || []);
                setOrders(ordersRes.data.orders || []);
            } catch (error) {
                console.error("Error fetching items:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [restaurantId]);

    const itemsHealth = useMemo(() => {
        return menuItems.map(item => {
            let totalSales = 0;
            const ordersWithItem = orders.filter(order => {
                const hasItem = order.items?.some((i: any) => i._id === item._id);
                if (hasItem) totalSales += order.items?.find((i: any) => i._id === item._id)?.qty || 1;
                return hasItem;
            });

            const daysActive = Math.max(1, 30); // Assume 30 days
            const avgOrdersPerDay = Math.round((totalSales / daysActive) * 10) / 10;
            const conversionRate = orders.length > 0 ? Math.round((ordersWithItem.length / orders.length) * 100) : 0;

            let suggestion: "promote" | "reduce-price" | "archive" | "increase-stock" | "monitor" = "monitor";
            let suggestionsText = "Keep monitoring this item";

            if (totalSales === 0) {
                suggestion = "archive";
                suggestionsText = "No sales in 30 days - Consider archiving or relisting";
            } else if (avgOrdersPerDay > 2) {
                suggestion = "increase-stock";
                suggestionsText = "High demand - Increase stock to avoid shortages";
            } else if (conversionRate < 5) {
                suggestion = "reduce-price";
                suggestionsText = "Low conversion - Try reducing price by 10-15%";
            } else if (conversionRate > 15 && totalSales < 3) {
                suggestion = "promote";
                suggestionsText = "Good potential - Run a promotional offer";
            }

            return {
                _id: item._id,
                name: item.name,
                price: item.price,
                isAvailable: item.isAvailable,
                totalSales,
                avgOrdersPerDay,
                conversionRate,
                suggestion,
                suggestionsText
            } as ItemHealth;
        }).sort((a, b) => b.totalSales - a.totalSales);
    }, [menuItems, orders]);

    const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
        setToggling(itemId);
        try {
            await axios.put(
                `${restaurantService}/api/item/status/${itemId}`,
                { isAvailable: !currentStatus },
                {
                    headers: { Authorization: `Bearer ${getToken()}` },
                }
            );
            setMenuItems(prev => prev.map(item =>
                item._id === itemId ? { ...item, isAvailable: !currentStatus } : item
            ));
            toast.success(`Item ${!currentStatus ? "marked available" : "marked unavailable"}`);
        } catch (error) {
            console.error("Error toggling availability:", error);
            toast.error("Failed to update availability");
        } finally {
            setToggling(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-red-500"></div>
            </div>
        );
    }

    const getSuggestionColor = (suggestion: string) => {
        switch (suggestion) {
            case "archive": return "bg-red-100 text-red-700 border-red-200";
            case "reduce-price": return "bg-orange-100 text-orange-700 border-orange-200";
            case "promote": return "bg-purple-100 text-purple-700 border-purple-200";
            case "increase-stock": return "bg-green-100 text-green-700 border-green-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const getSuggestionIcon = (suggestion: string) => {
        switch (suggestion) {
            case "archive": return <FiXCircle size={16} />;
            case "reduce-price": return <FiTrendingDown size={16} />;
            case "promote": return <FiTrendingUp size={16} />;
            case "increase-stock": return <FiPackage size={16} />;
            default: return <FiCheckCircle size={16} />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FiPackage className="text-red-500" size={24} />
                        AI Menu Health Manager
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Smart availability & pricing recommendations</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{menuItems.length}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Available</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{menuItems.filter(i => i.isAvailable).length}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Total Sales (30d)</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{itemsHealth.reduce((s, i) => s + i.totalSales, 0)}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Avg Per Day</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                        {(itemsHealth.reduce((s, i) => s + i.avgOrdersPerDay, 0) / Math.max(menuItems.length, 1)).toFixed(1)}
                    </p>
                </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
                {itemsHealth.map((item) => (
                    <div key={item._id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition">
                        <div className="flex items-start justify-between gap-4">
                            {/* Left: Item Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                    <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded">₹{item.price}</span>
                                    {item.isAvailable ? (
                                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                                            <FiCheckCircle size={12} /> Available
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1">
                                            <FiXCircle size={12} /> Unavailable
                                        </span>
                                    )}
                                </div>

                                {/* Stats Row */}
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-gray-900">{item.totalSales}</span>
                                        <span>sales (30d)</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-gray-900">{item.avgOrdersPerDay}</span>
                                        <span>per day avg</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-gray-900">{item.conversionRate}%</span>
                                        <span>conversion</span>
                                    </div>
                                </div>

                                {/* Suggestion */}
                                <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border ${getSuggestionColor(item.suggestion)}`}>
                                    {getSuggestionIcon(item.suggestion)}
                                    {item.suggestionsText}
                                </div>
                            </div>

                            {/* Right: Toggle Button */}
                            <div>
                                <button
                                    onClick={() => handleToggleAvailability(item._id, item.isAvailable)}
                                    disabled={toggling === item._id}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition ${
                                        item.isAvailable
                                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    } ${toggling === item._id ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    {toggling === item._id ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            {item.isAvailable ? (
                                                <>
                                                    <FiEye size={16} />
                                                    Show
                                                </>
                                            ) : (
                                                <>
                                                    <FiEyeOff size={16} />
                                                    Hide
                                                </>
                                            )}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {itemsHealth.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <FiPackage size={40} className="mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 font-semibold">No menu items yet</p>
                        <p className="text-sm text-gray-500">Add items to see health analytics</p>
                    </div>
                )}
            </div>

            {/* Auto-Action Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex gap-3">
                    <FiAlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
                    <div className="text-sm text-gray-700">
                        <p className="font-semibold text-gray-900 mb-1">Auto-Actions</p>
                        <ul className="space-y-1 text-xs">
                            <li>• <strong>Inventory = 0:</strong> Auto-marked unavailable</li>
                            <li>• <strong>No sales 14 days:</strong> Suggest archive</li>
                            <li>• <strong>High demand:</strong> Increase stock alert</li>
                            <li>• <strong>Low conversion:</strong> Price reduction recommended</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemAvailabilityManager;
