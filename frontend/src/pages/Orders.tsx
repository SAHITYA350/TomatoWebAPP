import { getToken } from "../utils/authStorage";
import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { restaurantService } from "../config";
import { FiClock, FiCheckCircle, FiPackage, FiChevronRight } from "react-icons/fi";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

type TabFilter = "all" | "active" | "completed";

const Orders = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const navigate = useNavigate();
  const { socket } = useSocket();

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/myorder`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      setOrders(data.orders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = () => {
      fetchOrders();
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500 font-medium">Loading your orders...</p>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  const filteredOrders = activeTab === "active" 
    ? activeOrders 
    : activeTab === "completed" 
    ? completedOrders 
    : orders;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">My Orders</h1>
          <p className="text-xs text-gray-500 mt-1">Track your live deliveries & order history</p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "all" ? "bg-white text-[#E23744] shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeTab === "active" ? "bg-[#E23744] text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            <FiClock /> Active ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeTab === "completed" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            <FiCheckCircle /> Completed ({completedOrders.length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="text-4xl">🛍️</div>
          <h3 className="text-lg font-bold text-gray-800">No {activeTab} orders found</h3>
          <p className="text-xs text-gray-500 max-w-sm">When you place orders, they will appear here live with tracking.</p>
          <button onClick={() => navigate("/")} className="px-5 py-2.5 rounded-xl bg-[#E23744] text-white font-bold text-xs shadow-md hover:bg-red-600 transition">
            Explore Restaurants
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              isActive={ACTIVE_STATUSES.includes(order.status)}
              onClick={() => navigate(`/order/${order._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;

// Order Card Component
const OrderCard = ({
  order,
  isActive,
  onClick,
}: {
  order: IOrder;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-2xl bg-white p-5 border transition-all shadow-sm hover:shadow-md ${isActive ? 'border-red-200 bg-red-50/20' : 'border-gray-100 hover:border-gray-200'}`}
    >
      <div className="flex items-center justify-between border-b pb-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl text-lg ${isActive ? 'bg-red-500/10 text-[#E23744]' : 'bg-gray-100 text-gray-600'}`}>
            <FiPackage />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#E23744] transition">
              Order #{order._id.slice(-6)}
            </h3>
            <p className="text-xs text-gray-500 truncate max-w-[240px] sm:max-w-xs">{order.restaurantName || "Restaurant"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
              isActive
                ? "bg-red-500/10 text-[#E23744] border-red-500/20 animate-pulse"
                : order.status === "delivered"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            {order.status.replace(/_/g, " ")}
          </span>
          <FiChevronRight className="text-gray-400 group-hover:translate-x-0.5 transition" />
        </div>
      </div>

      {/* Items Preview */}
      <div className="text-xs text-gray-600 space-y-1 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className="font-medium text-gray-800">{item.name} <span className="text-gray-400">x {item.quantity}</span></span>
            <span className="font-mono text-gray-600">₹{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t text-xs font-bold text-gray-900">
        <span className="text-gray-500 font-normal">Total Paid</span>
        <span className="text-sm font-black text-[#E23744]">₹{order.totalAmount}</span>
      </div>
    </div>
  );
};