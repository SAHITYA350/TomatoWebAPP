import type { IOrder } from "../types";
import { useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import axios from "axios";
import { realtimeService, restaurantService } from "../config";
import { getToken } from "../utils/authStorage";

declare module "leaflet" {
    namespace Routing {
        function control(option: any): any;
        function osrmv1(option?: any): any;
    }   
}

const getManeuverIcon = (text: string) => {
    const lower = text ? text.toLowerCase() : "";
    if (lower.includes("turn left") || lower.includes("left")) return "⬅️";
    if (lower.includes("turn right") || lower.includes("right")) return "➡️";
    if (lower.includes("head") || lower.includes("continue") || lower.includes("straight")) return "⬆️";
    if (lower.includes("destination") || lower.includes("arrive")) return "🏁";
    if (lower.includes("roundabout")) return "🔄";
    if (lower.includes("u-turn") || lower.includes("uturn")) return "↩️";
    return "📍";
};

const riderIcon = new L.DivIcon({
    html: `
      <div class="custom-marker-container">
        <div class="marker-pulse-glow rider-pulse"></div>
        <div class="marker-card rider-card">
          <div class="marker-blinker rider-blinker"></div>
          <span class="marker-emoji">🛵</span>
        </div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
    className: "leaflet-custom-marker",
});

const restaurantIcon = new L.DivIcon({
    html: `
      <div class="custom-marker-container">
        <div class="marker-pulse-glow restaurant-pulse"></div>
        <div class="marker-card restaurant-card">
          <div class="marker-blinker restaurant-blinker"></div>
          <span class="marker-emoji">🍳</span>
        </div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
    className: "leaflet-custom-marker",
});

const deliveryIcon = new L.DivIcon({
    html: `
      <div class="custom-marker-container">
        <div class="marker-pulse-glow delivery-pulse"></div>
        <div class="marker-card delivery-card">
          <div class="marker-blinker delivery-blinker"></div>
          <span class="marker-emoji">📦</span>
        </div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
    className: "leaflet-custom-marker",
});

interface Props {
    order: IOrder;
}

const Routing = ({ 
    waypoints,
    onRouteCalculated
}:{
    waypoints: Array<[number, number]>,
    onRouteCalculated: (summary: { totalDistance: number, totalTime: number }, steps: any[]) => void
}) => {
    const map = useMap();

    useEffect(() => {
        if (!waypoints || waypoints.length < 2) return;

        const leafletWaypoints = waypoints.map(wp => L.latLng(wp[0], wp[1]));

        const control = L.Routing.control({
            waypoints: leafletWaypoints,
            lineOptions: {
                styles: [
                    { color: "#ffffff", weight: 7, opacity: 0.9 }, // white border outline
                    { color: "#E23744", weight: 3.5, opacity: 0.95 }  // solid red route line
                ],
            },
            addWaypoints: false,
            draggableWaypoints: false,
            show: false,
            createMarker: () => null, // Suppress default Leaflet Routing Machine markers
            router: L.Routing.osrmv1({
                serviceUrl: "https://router.project-osrm.org/route/v1",
                profile: "driving"
            })
        }).addTo(map);

        control.on("routesfound", (e: any) => {
            const routes = e.routes;
            if (routes && routes.length > 0) {
                const summary = routes[0].summary;
                const instructions = routes[0].instructions || [];
                onRouteCalculated(summary, instructions);
            }
        });

        return () => {
            try {
                if (control) {
                    const plan = (control as any).getPlan?.();
                    if (plan) {
                        plan.setWaypoints([]);
                    }
                    if ((control as any)._line && map) {
                        try { map.removeLayer((control as any)._line); } catch (e) {}
                    }
                    map.removeControl(control);
                }
            } catch (e) {
                // Ignore Leaflet internal cleanup race condition
            }
        };
    }, [waypoints, map, onRouteCalculated]);

    return null;
};

const RiderOrderMap = ({ order }: Props) => {
    const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);
    const [restaurantLocation, setRestaurantLocation] = useState<[number, number] | null>(null);
    const [routeSummary, setRouteSummary] = useState<{ totalDistance: number, totalTime: number } | null>(null);
    const [routeSteps, setRouteSteps] = useState<any[]>([]);

    const handleRouteCalculated = useCallback((summary: { totalDistance: number, totalTime: number }, steps: any[]) => {
        setRouteSummary(summary);
        setRouteSteps(steps);
    }, []);

    // Fetch Restaurant Location coordinates for Pickup Routing
    useEffect(() => {
        if (!order?.restaurantId) return;
        const token = getToken("rider") || getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        axios.get(`${restaurantService}/api/restaurant/${order.restaurantId}`, { headers })
            .then(res => {
                const coords = res.data?.autoLocation?.coordinates;
                if (coords && coords.length === 2) {
                    setRestaurantLocation([coords[1], coords[0]]); // [latitude, longitude]
                }
            })
            .catch(err => console.log("Failed to fetch restaurant coords:", err));
    }, [order?.restaurantId]);

    const deliveryLocation = useMemo<[number, number]>(() => {
        if (order?.deliveryAddress?.latitude != null && order?.deliveryAddress?.longitude != null) {
            return [order.deliveryAddress.latitude, order.deliveryAddress.longitude];
        }
        // Fallback offset if address coords are not set
        if (restaurantLocation) {
            return [restaurantLocation[0] + 0.015, restaurantLocation[1] + 0.015];
        }
        return [20.3011, 85.8315];
    }, [order?.deliveryAddress?.latitude, order?.deliveryAddress?.longitude, restaurantLocation]);

    const isPickupPhase = order.status === "rider_assigned" || order.status === "ready_for_rider";

    // Dynamic Phase-Based Routing:
    // Phase 1 (rider_assigned): Route from Rider -> Restaurant Pickup
    // Phase 2 (picked_up): Route from Rider -> Customer Delivery Address
    const routeWaypoints = useMemo<Array<[number, number]>>(() => {
        const points: Array<[number, number]> = [];
        if (!riderLocation) return points;

        points.push(riderLocation);

        if (isPickupPhase) {
            if (restaurantLocation) points.push(restaurantLocation);
        } else {
            if (deliveryLocation) points.push(deliveryLocation);
        }

        return points;
    }, [riderLocation, restaurantLocation, deliveryLocation, isPickupPhase]);

    useEffect(() => {
        const fetchLocation = () => {
            navigator.geolocation.getCurrentPosition((pos) => {
                const latitude = pos.coords.latitude;
                const longitude = pos.coords.longitude;

                setRiderLocation([latitude, longitude]);

                // 1. Emit to Customer Room
                axios.post(`${realtimeService}/api/v1/internal/emit`, {
                    event: "rider:location",
                    room: `user:${order.userId}`,
                    payload: { latitude, longitude },
                }, {
                    headers: { "x-internal-key": import.meta.env.VITE_INTERNAL_SERVICE_KEY },
                }).catch(err => console.log(err));

                // 2. Broadcast to Order Room (for Seller Dashboard live tracking)
                axios.post(`${realtimeService}/api/v1/internal/emit`, {
                    event: "rider:location",
                    room: `order:${order._id}`,
                    payload: { orderId: order._id, lat: latitude, lng: longitude, latitude, longitude },
                }, {
                    headers: { "x-internal-key": import.meta.env.VITE_INTERNAL_SERVICE_KEY },
                }).catch(err => console.log(err));

                // 3. Broadcast to Global Room (for Admin tracking)
                axios.post(`${realtimeService}/api/v1/internal/emit`, {
                    event: "rider:location:update",
                    room: "global",
                    payload: { 
                        riderId: order.riderId, 
                        userId: order.userId, 
                        latitude, 
                        longitude 
                    },
                }, {
                    headers: { "x-internal-key": import.meta.env.VITE_INTERNAL_SERVICE_KEY },
                }).catch(err => console.log(err));
            },
            (err) => console.log("Location Error:", err),
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000,
            });
        };

        fetchLocation();
        const interval = setInterval(fetchLocation, 4000);
        return () => clearInterval(interval);
    }, [order._id, order.userId, order.riderId]);

    if (!riderLocation) {
        return (
            <div className="flex h-48 items-center justify-center rounded-lg bg-gray-50 text-gray-500 border border-gray-100">
                Getting location access and loading map...
            </div>
        );
    }

  return (
    <div className="rounded-xl bg-white shadow-md p-4 border border-gray-100 space-y-4">
      <style>{`
        .leaflet-routing-container {
          display: none !important;
        }
        
        /* Smooth transition for markers moving in real-time */
        .leaflet-custom-marker {
          transition: transform 1s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* Custom marker styling */
        .custom-marker-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          position: relative;
        }

        /* Pulsing Glow Ring */
        .marker-pulse-glow {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          pointer-events: none;
        }

        .rider-pulse {
          background: rgba(226, 55, 68, 0.2);
          box-shadow: 0 0 0 2px rgba(226, 55, 68, 0.4);
          animation: marker-pulse-anim 2s infinite cubic-bezier(0.16, 1, 0.3, 1);
        }

        .delivery-pulse {
          background: rgba(16, 185, 129, 0.2);
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.4);
          animation: marker-pulse-anim 2s infinite cubic-bezier(0.16, 1, 0.3, 1);
          animation-delay: 1s;
        }

        @keyframes marker-pulse-anim {
          0% {
            transform: scale(0.6);
            opacity: 1;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }

        /* Inner Circular Card */
        .marker-card {
          position: relative;
          z-index: 2;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
          border: 2px solid;
          transform: scale(1);
          transition: transform 0.2s ease;
        }

        .marker-card:hover {
          transform: scale(1.1);
        }

        .rider-card {
          border-color: #e23744;
        }

        .delivery-card {
          border-color: #10b981;
        }

        /* Emoji Icon inside */
        .marker-emoji {
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Blinking Light Status Dot */
        .marker-blinker {
          position: absolute;
          top: -1px;
          right: -1px;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          border: 1.5px solid white;
          z-index: 3;
        }

        .rider-blinker {
          background-color: #ef4444;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.8);
          animation: blinker-anim 0.8s infinite alternate ease-in-out;
        }

        .delivery-blinker {
          background-color: #10b981;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
          animation: blinker-anim 0.8s infinite alternate ease-in-out;
        }

        @keyframes blinker-anim {
          0% {
            transform: scale(0.85);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.25);
            opacity: 1;
            box-shadow: 0 0 8px 3px currentColor;
          }
        }

        /* Directions Panel Styling */
        .directions-panel {
          border-top: 1px solid #f3f4f6;
          padding-top: 16px;
        }
        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          transition: background-color 0.2s ease;
        }
        .step-item:hover {
          background-color: #f9fafb;
        }
        .step-icon-container {
          background-color: #f3f4f6;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 14px;
        }
      `}</style>

      <div className="relative">
        <MapContainer
         center={riderLocation}
         zoom={14}
         dragging={true}
         touchZoom={true}
         scrollWheelZoom={true}
         doubleClickZoom={true}
         className="h-[420px] w-full rounded-xl shadow-inner border border-gray-200 cursor-grab active:cursor-grabbing"
        >
          <TileLayer
           url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
           subdomains="abcd"
           maxZoom={20}
           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />

            {/* Rider Location Marker */}
            <Marker position={riderLocation} icon={riderIcon}>
              <Popup>
                <div className="font-semibold text-gray-800">You (Rider)</div>
                <div className="text-xs text-gray-500">Real-time Location Tracking</div>
              </Popup>
            </Marker>

            {/* Restaurant Pickup Marker */}
            {restaurantLocation && (
              <Marker position={restaurantLocation} icon={restaurantIcon}>
                <Popup>
                  <div className="font-semibold text-amber-800">🍳 Pickup Restaurant</div>
                  <div className="text-xs text-gray-600">{order.restaurantName}</div>
                </Popup>
              </Marker>
            )}

            {/* Delivery Destination Marker */}
            {deliveryLocation && (
              <Marker position={deliveryLocation} icon={deliveryIcon}>
                <Popup>
                  <div className="font-semibold text-emerald-800">📦 Customer Destination</div>
                  <div className="text-xs text-gray-500">{order.deliveryAddress.formattedAddress}</div>
                </Popup>
              </Marker>
            )}

            {/* Dynamic 3-Point Route (Rider -> Restaurant -> Customer Delivery Address) */}
            <Routing waypoints={routeWaypoints} onRouteCalculated={handleRouteCalculated} />
          </MapContainer>

        {/* Route Summary Floating Badge */}
        {routeSummary && (
          <div className="absolute top-4 right-4 z-[999] bg-gray-950/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-xl border border-gray-800 flex items-center gap-2.5 text-xs font-semibold text-white">
            <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-full border border-red-500/30 uppercase">
              {isPickupPhase ? "🍳 Pickup Route" : "📦 Dropoff Route"}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[#e23744]">📍</span>
              <span className="font-mono font-bold">{(routeSummary.totalDistance / 1000).toFixed(1)} km</span>
            </div>
            <div className="w-px h-3 bg-gray-700" />
            <div className="flex items-center gap-1">
              <span className="text-amber-400">⏱️</span>
              <span className="font-mono font-bold">{Math.round(routeSummary.totalTime / 60)} mins</span>
            </div>
          </div>
        )}
      </div>

      {/* Turn-by-Turn Directions Panel */}
      {routeSteps.length > 0 && (
        <div className="directions-panel space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
              <span>🧭</span> Turn-by-Turn Navigation
            </h4>
            <span className="text-xs text-gray-500">{routeSteps.length} steps</span>
          </div>

          <div className="max-h-[220px] overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg p-1 bg-gray-50/50">
            {routeSteps.map((step, idx) => {
              const distanceText = step.distance > 1000 
                ? `${(step.distance / 1000).toFixed(1)} km` 
                : `${Math.round(step.distance)} m`;
              
              return (
                <div key={idx} className="step-item text-xs text-gray-700">
                  <div className="step-icon-container">
                    {getManeuverIcon(step.text)}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="font-medium text-gray-800 leading-normal">{step.text}</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{distanceText}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderOrderMap;

