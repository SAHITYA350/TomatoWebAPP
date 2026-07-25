import React, { useState, useEffect, useMemo } from "react";
import { useSocket } from "../context/SocketContext";
import { getToken } from "../utils/authStorage";
import axios from "axios";
import { restaurantService } from "../config";
import {
    FiMapPin, FiUsers, FiNavigation, FiTruck, FiUser,
    FiActivity, FiZap, FiRefreshCw, FiMap
} from "react-icons/fi";
import toast from "react-hot-toast";

interface ActiveUser {
    id: string;
    type: "rider" | "seller" | "customer";
    name: string;
    lat: number;
    lng: number;
    distance: number;
    status: string;
    timestamp: number;
}

interface DashboardMetrics {
    totalRidersOnline: number;
    totalCustomersOnline: number;
    totalSellersOnline: number;
    nearbyRiders: number;
    nearbyCustomers: number;
    nearestRiderDistance: number;
}

interface RealTimeOperationsDashboardProps {
    restaurantId: string;
    restaurantLat: number;
    restaurantLng: number;
}

const RealTimeOperationsDashboard: React.FC<RealTimeOperationsDashboardProps> = ({
    restaurantId,
    restaurantLat,
    restaurantLng
}) => {
    const { socket } = useSocket();
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        totalRidersOnline: 0,
        totalCustomersOnline: 0,
        totalSellersOnline: 0,
        nearbyRiders: 0,
        nearbyCustomers: 0,
        nearestRiderDistance: 0
    });
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState<"map" | "list">("map");

    // Calculate distance between two coordinates (km)
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return +(R * c).toFixed(2);
    };

    // Fetch real-time user data
    const fetchActiveUsers = async () => {
        try {
            setRefreshing(true);
            const { data } = await axios.get(
                `${restaurantService}/api/realtime/active-users`,
                {
                    headers: { Authorization: `Bearer ${getToken()}` },
                    params: {
                        restaurantLat,
                        restaurantLng,
                        radius: 15 // 15km radius
                    }
                }
            );

            const users: ActiveUser[] = data.activeUsers || [];
            setActiveUsers(users);

            // Calculate metrics
            const riders = users.filter(u => u.type === "rider");
            const customers = users.filter(u => u.type === "customer");
            const sellers = users.filter(u => u.type === "seller");

            const nearbyRiders = riders.filter(u => u.distance <= 5).length;
            const nearbyCustomers = customers.filter(u => u.distance <= 10).length;
            const nearestRider = riders.length > 0 
                ? Math.min(...riders.map(r => r.distance))
                : 0;

            setMetrics({
                totalRidersOnline: riders.length,
                totalCustomersOnline: customers.length,
                totalSellersOnline: sellers.length,
                nearbyRiders,
                nearbyCustomers,
                nearestRiderDistance: nearestRider
            });
        } catch (error: any) {
            console.error("Failed to fetch active users:", error);
            toast.error("Failed to load real-time data");
        } finally {
            setRefreshing(false);
        }
    };

    // Recalculate metrics whenever activeUsers changes via socket
    useEffect(() => {
        const riders = activeUsers.filter(u => u.type === "rider");
        const customers = activeUsers.filter(u => u.type === "customer");
        const sellers = activeUsers.filter(u => u.type === "seller");

        const nearbyRiders = riders.filter(u => u.distance <= 5).length;
        const nearbyCustomers = customers.filter(u => u.distance <= 10).length;
        const nearestRider = riders.length > 0 
            ? Math.min(...riders.map(r => r.distance))
            : 0;

        setMetrics({
            totalRidersOnline: riders.length,
            totalCustomersOnline: customers.length,
            totalSellersOnline: sellers.length,
            nearbyRiders,
            nearbyCustomers,
            nearestRiderDistance: nearestRider
        });
    }, [activeUsers]);

    useEffect(() => {
        fetchActiveUsers();
        const interval = setInterval(fetchActiveUsers, 5000); // Refresh every 5s

        // Socket.io listeners
        if (socket) {
            socket.on("user:online", (user: ActiveUser) => {
                setActiveUsers(prev => {
                    const exists = prev.find(u => u.id === user.id);
                    if (exists) {
                        return prev.map(u => u.id === user.id ? user : u);
                    }
                    return [...prev, user];
                });
            });

            socket.on("user:offline", (userId: string) => {
                setActiveUsers(prev => prev.filter(u => u.id !== userId));
            });

            socket.on("user:location-update", (user: ActiveUser) => {
                setActiveUsers(prev =>
                    prev.map(u => u.id === user.id ? user : u)
                );
            });
        }

        return () => {
            clearInterval(interval);
            if (socket) {
                socket.off("user:online");
                socket.off("user:offline");
                socket.off("user:location-update");
            }
        };
    }, [socket, restaurantLat, restaurantLng]);

    // Sorted users by distance
    const sortedUsers = useMemo(() => {
        return [...activeUsers].sort((a, b) => a.distance - b.distance);
    }, [activeUsers]);

    // Map view visualization
    const MapView = () => {
        const maxDistance = 15;
        const mapSize = 400;
        const centerX = mapSize / 2;
        const centerY = mapSize / 2;
        const scale = mapSize / (maxDistance * 2);

        return (
            <div className="relative w-full h-96 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-blue-200 overflow-hidden">
                {/* Grid */}
                <svg className="absolute inset-0 w-full h-full opacity-10">
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="blue" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Restaurant Center */}
                <div
                    className="absolute flex items-center justify-center"
                    style={{
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "40px",
                        height: "40px"
                    }}
                >
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        🍽️
                    </div>
                </div>

                {/* Distance Rings */}
                {[5, 10, 15].map((dist) => (
                    <div
                        key={dist}
                        className="absolute border border-blue-200 rounded-full"
                        style={{
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            width: `${(dist / maxDistance) * 100}%`,
                            height: `${(dist / maxDistance) * 100}%`
                        }}
                    >
                        <span className="absolute text-xs text-blue-400 font-semibold -top-4 -right-6">
                            {dist}km
                        </span>
                    </div>
                ))}

                {/* Users on Map */}
                {sortedUsers.slice(0, 20).map((user) => {
                    const dist = user.distance ?? 0;
                    const angle = Math.random() * Math.PI * 2;
                    const x = centerX + dist * scale * Math.cos(angle);
                    const y = centerY + dist * scale * Math.sin(angle);

                    return (
                        <div
                            key={user.id}
                            className="absolute flex items-center justify-center transition-all hover:scale-125"
                            style={{
                                left: `${(x / mapSize) * 100}%`,
                                top: `${(y / mapSize) * 100}%`,
                                transform: "translate(-50%, -50%)"
                            }}
                            title={`${user.name} (${dist.toFixed(1)}km)`}
                        >
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer ${
                                    user.type === "rider"
                                        ? "bg-yellow-500"
                                        : user.type === "customer"
                                        ? "bg-blue-500"
                                        : "bg-green-500"
                                }`}
                            >
                                {user.type === "rider" ? "R" : user.type === "customer" ? "C" : "S"}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // List view
    const ListView = () => (
        <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedUsers.slice(0, 50).map((user) => (
                <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition"
                >
                    <div className="flex items-center gap-3 flex-1">
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                user.type === "rider"
                                    ? "bg-yellow-500"
                                    : user.type === "customer"
                                    ? "bg-blue-500"
                                    : "bg-green-500"
                            }`}
                        >
                            {user.type === "rider" ? "R" : user.type === "customer" ? "C" : "S"}
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-500">
                                {user.type.charAt(0).toUpperCase() + user.type.slice(1)} • {user.status}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <FiMapPin className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-bold text-gray-700">{(user.distance ?? 0).toFixed(1)}km</span>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FiActivity className="h-6 w-6 text-blue-600" />
                        Real-Time Operations
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Live location tracking • Active {activeUsers.length} users</p>
                </div>
                <button
                    onClick={() => fetchActiveUsers()}
                    disabled={refreshing}
                    className="p-3 bg-white rounded-lg border hover:border-blue-300 transition disabled:opacity-50"
                >
                    <FiRefreshCw className={`h-5 w-5 text-blue-600 ${refreshing ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                {/* Total Riders */}
                <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Riders</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalRidersOnline}</p>
                        </div>
                        <FiNavigation className="h-6 w-6 text-yellow-500 opacity-50" />
                    </div>
                </div>

                {/* Nearby Riders */}
                <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-600">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Nearby (5km)</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.nearbyRiders}</p>
                    </div>
                </div>

                {/* Total Customers */}
                <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Customers</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalCustomersOnline}</p>
                        </div>
                        <FiUser className="h-6 w-6 text-blue-500 opacity-50" />
                    </div>
                </div>

                {/* Nearby Customers */}
                <div className="bg-white rounded-lg p-4 border-l-4 border-blue-600">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Nearby (10km)</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.nearbyCustomers}</p>
                    </div>
                </div>

                {/* Other Sellers */}
                <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Sellers</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalSellersOnline}</p>
                        </div>
                        <FiTruck className="h-6 w-6 text-green-500 opacity-50" />
                    </div>
                </div>

                {/* Nearest Rider */}
                <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Nearest</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            {metrics.nearestRiderDistance > 0 ? `${metrics.nearestRiderDistance}km` : "—"}
                        </p>
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 justify-center">
                <button
                    onClick={() => setViewMode("map")}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                        viewMode === "map"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 border hover:border-blue-300"
                    }`}
                >
                    <FiMap className="h-4 w-4 inline mr-2" />
                    Map View
                </button>
                <button
                    onClick={() => setViewMode("list")}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                        viewMode === "list"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 border hover:border-blue-300"
                    }`}
                >
                    <FiUsers className="h-4 w-4 inline mr-2" />
                    List View
                </button>
            </div>

            {/* Map/List Display */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
                {viewMode === "map" ? <MapView /> : <ListView />}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-sm text-gray-700">Riders</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-700">Customers</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-700">Sellers</span>
                </div>
            </div>

            {/* Status */}
            <div className="text-xs text-center text-gray-500">
                {socket ? "🟢 Connected" : "🔴 Disconnected"} • Last updated: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

export default RealTimeOperationsDashboard;
