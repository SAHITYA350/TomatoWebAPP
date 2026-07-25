import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { adminService } from "../../config";
import { getToken } from "../../utils/authStorage";
import { useSocket } from "../../context/SocketContext";
import { FiMapPin, FiRefreshCw, FiTruck, FiShoppingBag, FiInfo } from "react-icons/fi";

// Custom icons configuration
const restaurantIcon = new L.DivIcon({
    html: `
      <div class="custom-marker-container">
        <div class="marker-pulse-glow restaurant-pulse"></div>
        <div class="marker-card restaurant-card">
          <span class="marker-emoji">🍔</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: "leaflet-custom-marker",
});

const riderOnlineIcon = new L.DivIcon({
    html: `
      <div class="custom-marker-container">
        <div class="marker-pulse-glow rider-online-pulse"></div>
        <div class="marker-card rider-online-card">
          <div class="marker-blinker rider-online-blinker"></div>
          <span class="marker-emoji">🛵</span>
        </div>
      </div>
    `,
    iconSize: [45, 45],
    iconAnchor: [22.5, 22.5],
    popupAnchor: [0, -22.5],
    className: "leaflet-custom-marker",
});

const riderOfflineIcon = new L.DivIcon({
    html: `
      <div class="custom-marker-container">
        <div class="marker-card rider-offline-card">
          <span class="marker-emoji">🛵</span>
        </div>
      </div>
    `,
    iconSize: [45, 45],
    iconAnchor: [22.5, 22.5],
    popupAnchor: [0, -22.5],
    className: "leaflet-custom-marker",
});

const destinationIcon = new L.DivIcon({
    html: `
      <div class="custom-marker-container">
        <div class="marker-pulse-glow destination-pulse"></div>
        <div class="marker-card destination-card">
          <span class="marker-emoji">📦</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: "leaflet-custom-marker",
});

// Component to dynamically fit bounds when data loads
const MapBoundsAdjuster = ({ coordinates }: { coordinates: [number, number][] }) => {
    const map = useMap();
    useEffect(() => {
        if (coordinates.length > 0) {
            const bounds = L.latLngBounds(coordinates);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [coordinates, map]);
    return null;
};

const AdminLiveMap = () => {
    const { socket } = useSocket();
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [riders, setRiders] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const token = getToken();
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Restaurants, Riders, and Orders
            const [resRestaurants, resRiders, resOrders] = await Promise.all([
                axios.get(`${adminService}/api/v1/admin/restaurants?limit=100`, { headers }),
                axios.get(`${adminService}/api/v1/admin/riders?limit=100`, { headers }),
                axios.get(`${adminService}/api/v1/admin/orders?limit=100`, { headers }),
            ]);

            setRestaurants(resRestaurants.data.restaurants || []);
            setRiders(resRiders.data.riders || []);
            setOrders(resOrders.data.orders || []);
        } catch (error) {
            console.error("Failed to load map data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Listen to real-time location and order updates from the Socket
    useEffect(() => {
        if (!socket) return;

        // Join global room to receive real-time updates across the platform
        socket.emit("join", "global");

        const handleRiderLocationUpdate = (payload: any) => {
            const { riderId, latitude, longitude } = payload;
            console.log(`📡 Live socket location received for rider ${riderId}:`, latitude, longitude);
            
            // Update coordinates in the local riders state dynamically
            setRiders((prevRiders) =>
                prevRiders.map((r) => {
                    if (r._id === riderId) {
                        return {
                            ...r,
                            location: {
                                ...r.location,
                                coordinates: [longitude, latitude], // [lng, lat]
                            },
                            lastActiveAt: new Date().toISOString(),
                        };
                    }
                    return r;
                })
            );
        };

        const handleOrderUpdate = () => {
            fetchData();
        };

        socket.on("rider:location:update", handleRiderLocationUpdate);
        socket.on("order:new", handleOrderUpdate);
        socket.on("order:update", handleOrderUpdate);

        return () => {
            socket.off("rider:location:update", handleRiderLocationUpdate);
            socket.off("order:new", handleOrderUpdate);
            socket.off("order:update", handleOrderUpdate);
        };
    }, [socket]);

    // Active orders (placed, accepted, preparing, ready_for_rider, rider_assigned, picked_up)
    const activeOrders = useMemo(() => {
        return orders.filter(
            (o) => o.status !== "delivered" && o.status !== "cancelled"
        );
    }, [orders]);

    // Compute coordinates of active elements to fit the map bounds
    const mapBoundsCoordinates = useMemo(() => {
        const coords: [number, number][] = [];
        
        restaurants.forEach((r) => {
            if (r.autoLocation?.coordinates) {
                coords.push([r.autoLocation.coordinates[1], r.autoLocation.coordinates[0]]);
            }
        });

        riders.forEach((ri) => {
            if (ri.isAvailable && ri.location?.coordinates) {
                coords.push([ri.location.coordinates[1], ri.location.coordinates[0]]);
            }
        });

        activeOrders.forEach((o) => {
            if (o.deliveryAddress?.latitude && o.deliveryAddress?.longitude) {
                coords.push([o.deliveryAddress.latitude, o.deliveryAddress.longitude]);
            }
        });

        return coords;
    }, [restaurants, riders, activeOrders]);

    // Build restaurant index for fast lookup
    const restaurantsById = useMemo(() => {
        return new Map(restaurants.map((r) => [r._id, r]));
    }, [restaurants]);

    // Default center in case bounds are empty (Kolkata/India coordinates as standard fallback)
    const defaultCenter: [number, number] = [22.5726, 88.3639];

    if (loading) {
        return (
            <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#e23744]"></div>
                <p className="text-sm text-gray-500 font-medium animate-pulse">Loading live tracking map...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <style>{`
                /* Custom marker styling */
                .custom-marker-container {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 50px;
                  height: 50px;
                  position: relative;
                }

                .marker-pulse-glow {
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  border-radius: 50%;
                  pointer-events: none;
                }

                .restaurant-pulse {
                  background: rgba(239, 68, 68, 0.15);
                  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
                }

                .rider-online-pulse {
                  background: rgba(59, 130, 246, 0.2);
                  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
                  animation: marker-pulse-anim 2s infinite cubic-bezier(0.16, 1, 0.3, 1);
                }

                .destination-pulse {
                  background: rgba(16, 185, 129, 0.2);
                  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.4);
                  animation: marker-pulse-anim 2s infinite cubic-bezier(0.16, 1, 0.3, 1);
                  animation-delay: 0.7s;
                }

                @keyframes marker-pulse-anim {
                  0% {
                    transform: scale(0.6);
                    opacity: 1;
                  }
                  100% {
                    transform: scale(2.0);
                    opacity: 0;
                  }
                }

                .marker-card {
                  position: relative;
                  z-index: 2;
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  background: white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
                  border: 2px solid;
                  transition: transform 0.2s ease;
                }

                .marker-card:hover {
                  transform: scale(1.15);
                  z-index: 50;
                }

                .restaurant-card {
                  border-color: #ef4444;
                }

                .rider-online-card {
                  border-color: #3b82f6;
                }

                .rider-offline-card {
                  border-color: #9ca3af;
                  opacity: 0.7;
                }

                .destination-card {
                  border-color: #10b981;
                }

                .marker-emoji {
                  font-size: 16px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }

                .marker-blinker {
                  position: absolute;
                  top: -1px;
                  right: -1px;
                  width: 9px;
                  height: 9px;
                  border-radius: 50%;
                  border: 1.5px solid white;
                  z-index: 3;
                }

                .rider-online-blinker {
                  background-color: #3b82f6;
                  box-shadow: 0 0 5px rgba(59, 130, 246, 0.8);
                  animation: blinker-anim 0.8s infinite alternate ease-in-out;
                }

                @keyframes blinker-anim {
                  0% {
                    transform: scale(0.8);
                    opacity: 0.6;
                  }
                  100% {
                    transform: scale(1.2);
                    opacity: 1;
                  }
                }

                /* Smooth marker movement transitions */
                .leaflet-custom-marker {
                  transition: transform 1.2s cubic-bezier(0.25, 1, 0.5, 1);
                }
            `}</style>

            {/* Header bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200/80">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                        Real-time Live Operation Room
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Monitoring {restaurants.length} Restaurants, {riders.filter(r => r.isAvailable).length} Online Riders, and {activeOrders.length} Active Orders.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={refreshing}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
                >
                    <FiRefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh Data
                </button>
            </div>

            {/* Live Stats Badges */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm flex items-center gap-3.5">
                    <div className="rounded-lg bg-red-50 p-2.5 text-red-600"><FiShoppingBag className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Restaurants</p>
                        <p className="text-lg font-bold text-gray-800">{restaurants.filter(r => r.isVerified).length} Verified</p>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm flex items-center gap-3.5">
                    <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600"><FiTruck className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Riders Online</p>
                        <p className="text-lg font-bold text-gray-800">{riders.filter(r => r.isAvailable).length} Live</p>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm flex items-center gap-3.5">
                    <div className="rounded-lg bg-green-50 p-2.5 text-green-600"><FiMapPin className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Deliveries</p>
                        <p className="text-lg font-bold text-gray-800">{activeOrders.length} Orders</p>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm flex items-center gap-3.5">
                    <div className="rounded-lg bg-yellow-50 p-2.5 text-yellow-600"><FiInfo className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Riders</p>
                        <p className="text-lg font-bold text-gray-800">{riders.length} Registered</p>
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                <MapContainer
                    center={defaultCenter}
                    zoom={12}
                    className="h-[60vh] w-full"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Adjust Map Bounds to fit elements */}
                    <MapBoundsAdjuster coordinates={mapBoundsCoordinates} />

                    {/* Restaurants Markers */}
                    {restaurants.map((res) => {
                        if (!res.autoLocation?.coordinates) return null;
                        const position: [number, number] = [
                            res.autoLocation.coordinates[1], // latitude
                            res.autoLocation.coordinates[0], // longitude
                        ];
                        return (
                            <Marker key={res._id} position={position} icon={restaurantIcon}>
                                <Popup>
                                    <div className="space-y-1 p-0.5">
                                        <h4 className="font-bold text-gray-800 text-sm">{res.name}</h4>
                                        {res.description && <p className="text-xs text-gray-500">{res.description}</p>}
                                        <p className="text-[10px] text-gray-400 font-medium">📞 Phone: {res.phone}</p>
                                        <div className="flex gap-1.5 mt-1 pt-1 border-t">
                                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${res.isOpen ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-500 border"}`}>
                                                {res.isOpen ? "Open" : "Closed"}
                                            </span>
                                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-50 text-red-600 border border-red-200">Restaurant</span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Riders Markers */}
                    {riders.map((ri) => {
                        if (!ri.location?.coordinates) return null;
                        const position: [number, number] = [
                            ri.location.coordinates[1], // latitude
                            ri.location.coordinates[0], // longitude
                        ];

                        const isRiderOnline = ri.isAvailable;
                        const icon = isRiderOnline ? riderOnlineIcon : riderOfflineIcon;

                        // Find if this rider has an active order
                        const activeOrder = activeOrders.find(o => o.riderId === ri._id);

                        return (
                            <Marker key={ri._id} position={position} icon={icon}>
                                <Popup>
                                    <div className="space-y-1 p-0.5">
                                        <h4 className="font-bold text-gray-800 text-sm">🛵 Rider Profile</h4>
                                        <p className="text-xs text-gray-600 font-medium">📱 Phone: {ri.phoneNumber}</p>
                                        <p className="text-[10px] text-gray-400">Aadhaar: {ri.addharNumber}</p>
                                        <div className="flex flex-col gap-1.5 mt-1.5 pt-1.5 border-t">
                                            <div className="flex gap-1.5">
                                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${isRiderOnline ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-gray-50 text-gray-500 border"}`}>
                                                    {isRiderOnline ? "Online" : "Offline"}
                                                </span>
                                                {activeOrder && (
                                                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200 animate-pulse">
                                                        Busy (Delivering)
                                                    </span>
                                                )}
                                            </div>
                                            {activeOrder && (
                                                <div className="text-[10px] text-gray-500 font-medium bg-gray-50 p-1.5 rounded border">
                                                    <p>Order ID: #{String(activeOrder._id).slice(-8)}</p>
                                                    <p>Destination: {activeOrder.deliveryAddress.formattedAddress}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Active Deliveries Destinations & Routes */}
                    {activeOrders.map((order) => {
                        if (!order.deliveryAddress?.latitude || !order.deliveryAddress?.longitude) return null;
                        
                        const destPosition: [number, number] = [
                            order.deliveryAddress.latitude,
                            order.deliveryAddress.longitude,
                        ];

                        // Lookup restaurant coordinates
                        const restaurant = restaurantsById.get(order.restaurantId);
                        const restPosition: [number, number] | null = restaurant?.autoLocation?.coordinates
                            ? [restaurant.autoLocation.coordinates[1], restaurant.autoLocation.coordinates[0]]
                            : null;

                        return (
                            <div key={order._id}>
                                {/* Customer Delivery Pin */}
                                <Marker position={destPosition} icon={destinationIcon}>
                                    <Popup>
                                        <div className="space-y-1 p-0.5">
                                            <h4 className="font-bold text-gray-800 text-sm">📦 Delivery Destination</h4>
                                            <p className="text-xs text-gray-600">{order.deliveryAddress.formattedAddress}</p>
                                            <p className="text-[10px] text-gray-400">Order ID: #{String(order._id).slice(-8)}</p>
                                            <p className="text-[10px] font-semibold text-gray-800">Status: <span className="capitalize text-red-500">{order.status.replace(/_/g, " ")}</span></p>
                                        </div>
                                    </Popup>
                                </Marker>

                                {/* Route Polyline connecting Restaurant and Customer */}
                                {restPosition && (
                                    <Polyline
                                        positions={[restPosition, destPosition]}
                                        pathOptions={{
                                            color: "#e23744",
                                            weight: 2.5,
                                            dashArray: "5, 10",
                                            opacity: 0.75,
                                        }}
                                    >
                                        <Popup>
                                            <div className="text-xs font-semibold p-1">
                                                <p>Delivery Route: {order.restaurantName} ➔ Customer</p>
                                                <p className="text-[10px] text-gray-500 font-medium">Distance: {order.distance} km</p>
                                            </div>
                                        </Popup>
                                    </Polyline>
                                )}
                            </div>
                        );
                    })}
                </MapContainer>

                {/* Map Legend */}
                <div className="absolute bottom-4 left-4 z-[999] bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg shadow-md border border-gray-200/80 text-xs font-semibold text-gray-700 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🍔</span>
                        <span>Restaurants</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-base">🛵</span>
                        <span>Riders (Blue: Online, Gray: Offline)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-base">📦</span>
                        <span>Customer Destinations</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-0.5 border-t-2 border-dashed border-[#e23744] inline-block"></span>
                        <span>Active Delivery Routes</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLiveMap;
