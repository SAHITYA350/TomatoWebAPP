import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import { useEffect, useState, useCallback, useMemo } from "react";

declare module "leaflet" {
    namespace Routing {
        function control(option: any): any;
        function osrmv1(option?: any): any;
    }   
}


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


const Routing = ({ 
    from,
    to,
    onRouteCalculated
}:{
    from: [number, number],
    to: [number, number],
    onRouteCalculated: (summary: { totalDistance: number, totalTime: number }, steps: any[]) => void
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
                    { color: "#ffffff", weight: 8, opacity: 0.9 }, // white border outline
                    { color: "#E23744", weight: 4, opacity: 0.95 }  // solid red route line
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
                const steps = routes[0].instructions || [];
                onRouteCalculated(summary, steps);
            }
        });
        
        return () => {
            try {
                if (map && control) {
                    control.setWaypoints([]);
                    map.removeControl(control);
                }
            } catch (err) {
                // Ignore errors on unmount when leaflet is already cleaned up
            }
        };   
    }, [fromLat, fromLng, toLat, toLng, map, onRouteCalculated]);

    return null;
};

const getManeuverIcon = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("turn left") || lower.includes("left")) return "⬅️";
    if (lower.includes("turn right") || lower.includes("right")) return "➡️";
    if (lower.includes("head") || lower.includes("continue") || lower.includes("straight")) return "⬆️";
    if (lower.includes("destination") || lower.includes("arrive")) return "🏁";
    if (lower.includes("roundabout")) return "🔄";
    if (lower.includes("u-turn") || lower.includes("uturn")) return "↩️";
    return "📍";
};

interface props {
    riderLocation: [number, number];
    deliveryLocation: [number, number];
    deliveryAddress?: string;
}

const UserOrderMap = ({ riderLocation, deliveryLocation, deliveryAddress }: props) => {
    const [routeSummary, setRouteSummary] = useState<{ totalDistance: number, totalTime: number } | null>(null);
    const [routeSteps, setRouteSteps] = useState<any[]>([]);

    const handleRouteCalculated = useCallback((summary: { totalDistance: number, totalTime: number }, steps: any[]) => {
        setRouteSummary(summary);
        setRouteSteps(steps);
    }, []);

    const stableRiderLocation = useMemo<[number, number]>(() => [
        riderLocation[0],
        riderLocation[1]
    ], [riderLocation[0], riderLocation[1]]);

    const stableDeliveryLocation = useMemo<[number, number]>(() => [
        deliveryLocation[0],
        deliveryLocation[1]
    ], [deliveryLocation[0], deliveryLocation[1]]);

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
         center={stableRiderLocation}
         zoom={14}
         dragging={true}
         touchZoom={true}
         scrollWheelZoom={true}
         doubleClickZoom={true}
         className="h-[380px] w-full rounded-xl shadow-inner border border-gray-200 cursor-grab active:cursor-grabbing"
        >
          <TileLayer
           url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
           subdomains="abcd"
           maxZoom={20}
           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />

          <Marker
           position={stableRiderLocation}
           icon={riderIcon}
          >
            <Popup>
              <div className="font-semibold text-gray-800">Delivery Partner</div>
              <div className="text-xs text-gray-500">On the way to your address</div>
            </Popup>
          </Marker>
          <Marker
           position={stableDeliveryLocation}
           icon={deliveryIcon}
          >
            <Popup>
              <div className="font-semibold text-gray-800">Your Address</div>
              <div className="text-xs text-gray-500">{deliveryAddress || "Delivery Location"}</div>
            </Popup>
          </Marker>
          <Routing from={stableRiderLocation} to={stableDeliveryLocation} onRouteCalculated={handleRouteCalculated} />
        </MapContainer>

        {/* Route Summary Floating Badge */}
        {routeSummary && (
          <div className="absolute top-4 right-4 z-[999] bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg shadow-md border border-gray-100 flex items-center gap-3 text-xs font-semibold text-gray-800">
            <div className="flex items-center gap-1.5">
              <span className="text-[#e23744]">📍</span>
              <span>{(routeSummary.totalDistance / 1000).toFixed(1)} km</span>
            </div>
            <div className="w-px h-3 bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">⏱️</span>
              <span>{Math.round(routeSummary.totalTime / 60)} mins away</span>
            </div>
          </div>
        )}
      </div>

      {/* Turn-by-Turn Directions Panel */}
      {routeSteps.length > 0 && (
        <div className="directions-panel space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
              <span>🧭</span> Rider Directions
            </h4>
            <span className="text-xs text-gray-500">{routeSteps.length} steps left</span>
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

export default UserOrderMap;
