import { useState } from "react";
import type { IOrder } from "../types";
import OrderCard from "./OrderCard";

interface RestaurantOrdersProps {
  orders: IOrder[];
  loading: boolean;
  type: "active" | "completed";
  onStatusUpdate: () => void;
  compact?: boolean;
  restaurantLocation?: { lat: number; lng: number };
}

const RestaurantOrders = ({ orders, loading, type, onStatusUpdate, compact = false, restaurantLocation }: RestaurantOrdersProps) => {
    const [expandedView, setExpandedView] = useState(false);

    const isActive = type === "active";
    const accent = isActive ? "#059669" : "#e11d48";
    const accentLight = isActive ? "#ecfdf5" : "#fff1f2";
    const accentBorder = isActive ? "#a7f3d0" : "#fecdd3";
    const accentText = isActive ? "#065f46" : "#9f1239";

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-4 border-gray-100"></div>
            <div className="absolute top-0 left-0 h-10 w-10 rounded-full border-4 border-transparent animate-spin"
                 style={{ borderTopColor: accent }}></div>
          </div>
          <p className="text-xs text-gray-400 mt-3 font-medium">Loading orders...</p>
        </div>
      );
    }

    const maxDisplay = compact ? 3 : 6;
    const displayOrders = expandedView ? orders : orders.slice(0, maxDisplay);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="relative flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ background: accent }}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-lg animate-ping opacity-20" style={{ background: accent }}></span>
              )}
              {isActive ? (
                <svg className="w-4 h-4 text-white relative z-10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                {isActive ? "Active Orders" : "Completed Orders"}
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {isActive ? "Currently being processed" : "Delivered & past orders"}
              </p>
            </div>
          </div>

          {/* Count */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: accentLight, color: accentText, border: `1px solid ${accentBorder}` }}
          >
            <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ background: accent }}></span>
            {orders.length}
          </div>
        </div>

        {/* Empty state */}
        {orders.length === 0 ? (
          <div
            className="rounded-xl border-2 border-dashed p-8 text-center"
            style={{ borderColor: accentBorder, background: accentLight }}
          >
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
              style={{ background: accentBorder }}
            >
              {isActive ? (
                <svg className="w-6 h-6" style={{ color: accentText }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" style={{ color: accentText }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
              )}
            </div>
            <h4 className="text-sm font-bold text-gray-700 mb-1">
              {isActive ? "No Active Orders" : "No Completed Orders"}
            </h4>
            <p className="text-xs text-gray-400 max-w-[200px] mx-auto">
              {isActive
                ? "Orders will appear here in real-time."
                : "Past orders will show here."}
            </p>
          </div>
        ) : (
          <>
            {/* Orders list */}
            <div className="space-y-3">
              {displayOrders.map((order, index) => (
                <div
                  key={order._id}
                  className="order-slide-in"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div
                    className="relative overflow-hidden rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    style={{ border: `1px solid ${isActive ? '#d1fae5' : '#f3f4f6'}` }}
                  >
                    {/* Solid accent top bar */}
                    <div className="h-[3px] w-full" style={{ background: accent }}></div>
                    <OrderCard
                      order={order}
                      onStatusUpdate={onStatusUpdate}
                      restaurantLocation={restaurantLocation}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Show more */}
            {orders.length > maxDisplay && (
              <button
                onClick={() => setExpandedView(!expandedView)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200"
                style={{
                  background: accentLight,
                  color: accentText,
                  border: `1px solid ${accentBorder}`,
                }}
              >
                {expandedView ? "Show Less" : `View All ${orders.length} Orders`}
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {expandedView
                    ? <polyline points="18 15 12 9 6 15"/>
                    : <polyline points="6 9 12 15 18 9"/>
                  }
                </svg>
              </button>
            )}
          </>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes orderSlideIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .order-slide-in {
            opacity: 0;
            animation: orderSlideIn 0.4s ease-out forwards;
          }
        `}} />
      </div>
    );
};

export default RestaurantOrders;
