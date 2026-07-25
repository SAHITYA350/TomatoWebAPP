import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import "leaflet-routing-machine";
import { useSocket } from "../context/SocketContext";

declare module "leaflet" {
    namespace Routing {
        function control(option: any): any;
        function osrmv1(option?: any): any;
    }   
}

// Custom markers using DivIcon for beautiful, dynamic visual effects
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

interface RiderLocationMapProps {
  orderId: string;
  restaurantLocation?: { lat: number; lng: number };
  deliveryLocation?: [number, number];
  deliveryAddress?: string;
  orderStatus?: string;
}

// Component to handle Leaflet Routing Machine path rendering dynamically
const Routing = ({ 
    from,
    to,
    onRouteCalculated
}:{
    from: [number, number],
    to: [number, number],
    onRouteCalculated: (summary: { totalDistance: number, totalTime: number }) => void
}) => {
    const map = useMap();

    const fromLat = from[0];
    const fromLng = from[1];
    const toLat = to[0];
    const toLng = to[1];

    useEffect(() => {
        const control = L.Routing.control({
            waypoints: [L.latLng(fromLat, fromLng), L.latLng(toLat, toLng)],
            lineOptions: {
                styles: [
                    { color: "#ffffff", weight: 7, opacity: 0.9 }, // white border outline
                    { color: "#E23744", weight: 3.5, opacity: 0.95 }  // solid red route line
                ],
            },
            addWaypoints: false,
            draggableWaypoints: false,
            show: false,
            createMarker: () => null,
            router: L.Routing.osrmv1({
                serviceUrl: "https://router.project-osrm.org/route/v1"
            })
        }).addTo(map);

        control.on("routesfound", (e: any) => {
            const routes = e.routes;
            if (routes && routes.length > 0) {
                const summary = routes[0].summary;
                onRouteCalculated(summary);
            }
        });
        
        return () => {
            try {
                if (map && control) {
                    control.setWaypoints([]);
                    map.removeControl(control);
                }
            } catch (err) {
                // Ignore leaflet clean up issues
            }
        };   
    }, [fromLat, fromLng, toLat, toLng, map, onRouteCalculated]);

    return null;
};

// Component to center map smoothly without locking user manual drag/pan
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  const [userPanned, setUserPanned] = useState(false);

  useEffect(() => {
    const onDrag = () => setUserPanned(true);
    map.on("dragstart", onDrag);
    return () => {
      map.off("dragstart", onDrag);
    };
  }, [map]);

  useEffect(() => {
    if (!userPanned) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map, userPanned]);
  return null;
};

const RiderLocationMap = ({ 
  orderId, 
  restaurantLocation, 
  deliveryLocation, 
  deliveryAddress,
  orderStatus 
}: RiderLocationMapProps) => {
  const { socket } = useSocket();
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeSummary, setRouteSummary] = useState<{ totalDistance: number, totalTime: number } | null>(null);

  const handleRouteCalculated = useCallback((summary: { totalDistance: number, totalTime: number }) => {
      setRouteSummary(summary);
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    // Join the order room to listen to rider updates
    socket.emit("join:order", orderId);

    const handleLocationUpdate = (data: { orderId: string; lat: number; lng: number }) => {
      if (data.orderId === orderId) {
        setRiderLocation({ lat: data.lat, lng: data.lng });
      }
    };

    socket.on("rider:location", handleLocationUpdate);

    return () => {
      socket.off("rider:location", handleLocationUpdate);
    };
  }, [socket, orderId]);

  // If we don't have rider location, show a loading placeholder
  if (!riderLocation) {
    return (
      <div className="h-40 sm:h-48 w-full bg-gray-50 border border-gray-100 rounded-xl flex flex-col items-center justify-center text-xs text-gray-500 gap-2 p-4 mt-3">
        <div className="relative">
          <div className="h-6 w-6 rounded-full border-2 border-gray-100"></div>
          <div className="absolute top-0 left-0 h-6 w-6 rounded-full border-2 border-transparent border-t-[#E23744] animate-spin"></div>
        </div>
        <p className="font-medium">Waiting for rider live location...</p>
      </div>
    );
  }

  // Determine starting and ending locations for routing depending on order status
  // Status: rider_assigned -> Rider is heading to Restaurant
  // Status: picked_up -> Rider is heading to Delivery Address
  const isHeadingToRestaurant = orderStatus === "rider_assigned";
  const startLoc: [number, number] = [riderLocation.lat, riderLocation.lng];
  
  let endLoc: [number, number] | null = null;
  if (isHeadingToRestaurant && restaurantLocation) {
    endLoc = [restaurantLocation.lat, restaurantLocation.lng];
  } else if (!isHeadingToRestaurant && deliveryLocation && deliveryLocation[0] != null) {
    endLoc = [deliveryLocation[0], deliveryLocation[1]];
  }

  // Fallback center if endLoc is not available
  const mapCenter: [number, number] = [riderLocation.lat, riderLocation.lng];

  return (
    <div className="h-44 sm:h-52 md:h-60 w-full rounded-xl overflow-hidden border border-gray-200 mt-3 relative z-0 shadow-inner">
      <style>{`
        .leaflet-routing-container {
          display: none !important;
        }
        
        .leaflet-custom-marker {
          transition: transform 1s cubic-bezier(0.25, 1, 0.5, 1);
        }

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

        .rider-pulse {
          background: rgba(226, 55, 68, 0.2);
          box-shadow: 0 0 0 2px rgba(226, 55, 68, 0.4);
          animation: marker-pulse-anim 2s infinite cubic-bezier(0.16, 1, 0.3, 1);
        }

        .restaurant-pulse {
          background: rgba(217, 119, 6, 0.2);
          box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.4);
          animation: marker-pulse-anim 2s infinite cubic-bezier(0.16, 1, 0.3, 1);
          animation-delay: 0.5s;
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
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
          border: 2px solid;
        }

        .rider-card { border-color: #e23744; }
        .restaurant-card { border-color: #d97706; }
        .delivery-card { border-color: #10b981; }

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
          border: 1px solid white;
          z-index: 3;
        }

        .rider-blinker {
          background-color: #ef4444;
          animation: blinker-anim 0.8s infinite alternate ease-in-out;
        }

        .restaurant-blinker {
          background-color: #d97706;
          animation: blinker-anim 0.8s infinite alternate ease-in-out;
        }

        .delivery-blinker {
          background-color: #10b981;
          animation: blinker-anim 0.8s infinite alternate ease-in-out;
        }

        @keyframes blinker-anim {
          0% { transform: scale(0.85); opacity: 0.6; }
          100% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>

      <MapContainer 
        center={mapCenter} 
        zoom={15} 
        dragging={true}
        touchZoom={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        className="h-full w-full relative z-0 cursor-grab active:cursor-grabbing"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapUpdater center={mapCenter} />
        
        {/* Rider Live Location Marker */}
        <Marker position={startLoc} icon={riderIcon}>
          <Popup>
            <div className="text-xs font-bold text-gray-800">Rider (Live)</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Moving to target location</div>
          </Popup>
        </Marker>

        {/* Restaurant Marker */}
        {restaurantLocation && (
          <Marker position={[restaurantLocation.lat, restaurantLocation.lng]} icon={restaurantIcon}>
            <Popup>
              <div className="text-xs font-bold text-gray-800">Your Restaurant</div>
            </Popup>
          </Marker>
        )}

        {/* Customer Destination Marker */}
        {deliveryLocation && deliveryLocation[0] != null && (
          <Marker position={[deliveryLocation[0], deliveryLocation[1]]} icon={deliveryIcon}>
            <Popup>
              <div className="text-xs font-bold text-gray-800">Delivery Destination</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{deliveryAddress || "Customer Address"}</div>
            </Popup>
          </Marker>
        )}

        {/* Draw live route line */}
        {endLoc && (
          <Routing from={startLoc} to={endLoc} onRouteCalculated={handleRouteCalculated} />
        )}
      </MapContainer>

      {/* Live tracking overlay label */}
      <div className="absolute top-2.5 left-2.5 z-[1000] bg-red-600 px-2 py-1 rounded-lg shadow text-[9px] font-bold text-white tracking-wide uppercase animate-pulse flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
        Live Tracking
      </div>

      {/* Floating Route Summary Overlay Card */}
      {routeSummary && (
        <div className="absolute top-2.5 right-2.5 z-[1000] bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow border border-gray-100 flex items-center gap-2 text-[10px] font-bold text-gray-850">
          <div className="flex items-center gap-1">
            <span className="text-[#e23744]">🛵</span>
            <span>{(routeSummary.totalDistance / 1000).toFixed(1)} km</span>
          </div>
          <div className="w-px h-3 bg-gray-300"></div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">⏱️</span>
            <span>{Math.round(routeSummary.totalTime / 60)} mins</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderLocationMap;
