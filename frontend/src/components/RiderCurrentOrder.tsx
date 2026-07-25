import { getToken } from "../utils/authStorage";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import type { IOrder } from "../types";
import { riderService } from "../config";
import { FiAlertTriangle, FiShield, FiHelpCircle, FiCheckCircle, FiPhone } from "react-icons/fi";
import RiderAIAssistantModal from "./RiderAIAssistantModal";

interface Props {
  order: IOrder;
  onStatusUpdate: () => void;
}

const RiderCurrentOrder = ({ order, onStatusUpdate }: Props) => {
  const [loading, setLoading] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("Bike Puncture");
  const [transferring, setTransferring] = useState(false);

  const [riskData, setRiskData] = useState<any>(null);
  const [parkingData, setParkingData] = useState<any>(null);
  const [showSopModal, setShowSopModal] = useState(false);

  useEffect(() => {
    fetchDeliveryRisk();
    fetchParkingSlot();
  }, [order._id]);

  const fetchDeliveryRisk = async () => {
    try {
      const token = getToken("rider") || getToken();
      const { data } = await axios.post(
        `${riderService}/api/rider/ai/predict-failure`,
        {
          restaurantName: order.restaurantName,
          address: order.deliveryAddress?.formattedAddress || "",
          timeOfDay: new Date().toLocaleTimeString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRiskData(data);
    } catch (e) {}
  };

  const fetchParkingSlot = async () => {
    try {
      const token = getToken("rider") || getToken();
      const { data } = await axios.post(
        `${riderService}/api/rider/ai/reserve-parking`,
        {
          restaurantId: order.restaurantId,
          restaurantName: order.restaurantName
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setParkingData(data);
    } catch (e) {}
  };

  const handleEmergencyTransfer = async () => {
    try {
      setTransferring(true);
      const token = getToken("rider") || getToken();
      const { data } = await axios.post(
        `${riderService}/api/rider/ai/emergency-transfer`,
        {
          orderId: order._id,
          reason: emergencyReason
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(data.message || "Order emergency transferred!", { duration: 4000 });
      setShowEmergencyModal(false);
      onStatusUpdate();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to transfer order.");
    } finally {
      setTransferring(false);
    }
  };



  const updateStatus = async () => {
    try {
      setLoading(true);

      await axios.put(
        `${riderService}/api/rider/order/update/${order._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      toast.success("Order status updated");
      onStatusUpdate();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update order status"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[#0f1117] border border-white/[0.06] p-3.5 sm:p-5 shadow-2xl space-y-3.5 sm:space-y-4 text-white">
      <div className="flex flex-wrap items-start justify-between border-b border-white/[0.06] pb-3 gap-2">
        <div className="min-w-0">
          <h1 className="font-black text-xs sm:text-base text-white flex flex-wrap items-center gap-1.5 leading-snug">
            <span>Current Active Order</span>
            <span className="text-[9px] sm:text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase font-bold tracking-wide">
              In Progress
            </span>
          </h1>
          <p className="text-[10px] sm:text-xs text-white/40 font-mono mt-0.5">ID: #{order._id.slice(-6)}</p>
        </div>

        <button
          onClick={() => setShowSopModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[11px] sm:text-xs font-bold text-white/70 border border-white/[0.08] transition cursor-pointer shrink-0"
        >
          <FiHelpCircle className="text-[#e23744]" />
          <span>Rider SOP AI</span>
        </button>
      </div>

      {/* Order Main Info */}
      <div className="space-y-2.5 text-xs text-white/70 bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06]">
        <p className="flex items-center justify-between gap-2">
          <span className="text-white/40 font-medium shrink-0">Pickup Restaurant:</span>
          <span className="font-bold text-white truncate max-w-[55%] text-right">{order.restaurantName}</span>
        </p>

        <p className="flex items-center justify-between gap-2">
          <span className="text-white/40 font-medium shrink-0">Drop Address:</span>
          <span className="font-bold text-white/80 truncate max-w-[55%] text-right">{order.deliveryAddress?.formattedAddress}</span>
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-white/[0.06] font-mono text-[11px]">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="text-[9px] text-white/35 uppercase tracking-wider">Order Value</div>
            <div className="text-sm font-black text-white mt-0.5">₹{order.totalAmount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <div className="text-[9px] text-emerald-400/60 uppercase tracking-wider">Your Payout</div>
            <div className="text-sm font-black text-emerald-400 mt-0.5">₹{order.riderAmount}</div>
          </div>
        </div>
      </div>

      {/* 🅿️ AI Feature 10: Smart Parking Assistant Reservation Badge */}
      {parkingData?.allocatedSlot && (
        <div className="p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/15 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🅿️</span>
            <div className="min-w-0">
              <div className="font-black text-blue-300 text-[11px] sm:text-xs">Smart Parking Allocated</div>
              <div className="text-[10px] sm:text-[11px] text-blue-200/70 font-semibold truncate">{parkingData.allocatedSlot.name}</div>
            </div>
          </div>
          <span className="text-[9px] sm:text-[10px] bg-blue-500/15 text-blue-300 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-bold border border-blue-400/20 shrink-0">
            15m Reserved
          </span>
        </div>
      )}

      {/* 📊 AI Feature 8: Delivery Risk & Delay Predictor */}
      {riskData && (
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-white/70 flex items-center gap-1.5 text-[11px] sm:text-xs">
              <FiShield className={riskData.riskLevel === "HIGH" ? "text-red-400" : "text-amber-400"} size={14} />
              Delivery Risk Assessment
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border shrink-0 ${
                riskData.riskLevel === "HIGH"
                  ? "bg-red-500/15 text-red-400 border-red-500/20"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
              }`}
            >
              {riskData.riskScore}% {riskData.riskLevel}
            </span>
          </div>

          <div className="space-y-1 text-[10px] sm:text-[11px] text-white/50">
            {riskData.recommendedActions?.map((act: string, i: number) => (
              <p key={i} className="flex items-start gap-1.5 text-white/60">
                <FiCheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={11} />
                <span>{act}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Phone Call Section */}
      {order.deliveryAddress?.mobile && (
        <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 gap-2">
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] text-white/35 uppercase font-bold tracking-wider">Customer Phone</p>
            <p className="text-xs font-black text-white font-mono">{order.deliveryAddress.mobile}</p>
          </div>
          <a
            href={`tel:${order.deliveryAddress.mobile}`}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[11px] sm:text-xs font-extrabold text-white transition shadow-md shrink-0"
          >
            <FiPhone size={12} />
            Call Customer
          </a>
        </div>
      )}

      {/* Status Actions & Emergency Transfer */}
      <div className="space-y-2.5 pt-1">
        {order.status === "rider_assigned" && (
          <button
            onClick={updateStatus}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-xs sm:text-sm text-white shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Updating..." : "Reached Restaurant"}
          </button>
        )}

        {order.status === "picked_up" && (
          <button
            onClick={updateStatus}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-xs sm:text-sm text-white shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Updating..." : "Mark as Delivered"}
          </button>
        )}

        {/* Emergency Transfer — only for real emergencies */}
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/[0.08] hover:bg-red-500/15 border border-red-500/20 text-red-400 font-extrabold text-[11px] sm:text-xs transition cursor-pointer"
        >
          <FiAlertTriangle size={14} />
          <span>Emergency Transfer</span>
        </button>
      </div>

      {/* Emergency Transfer Dialog Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm bg-[#0f1117] border border-red-500/20 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-black text-sm sm:text-base border-b border-white/[0.06] pb-3">
              <FiAlertTriangle size={20} />
              <h3>Emergency Order Transfer</h3>
            </div>

            <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">
              The system will instantly locate the nearest active rider to take over this delivery.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold text-white/40 uppercase tracking-wider">Emergency Reason:</label>
              <select
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500/40 transition"
              >
                <option value="Bike Puncture">Bike Puncture</option>
                <option value="Vehicle Breakdown">Vehicle Breakdown</option>
                <option value="Battery Dead">EV Battery Dead</option>
                <option value="Road Accident">Road Accident</option>
                <option value="Heavy Traffic Jam">Severe Traffic Jam</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] font-extrabold text-xs text-white/60 border border-white/[0.06] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEmergencyTransfer}
                disabled={transferring}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-extrabold text-xs text-white shadow-lg disabled:opacity-50 transition cursor-pointer"
              >
                {transferring ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rider RAG SOP Assistant Modal */}
      <RiderAIAssistantModal
        isOpen={showSopModal}
        onClose={() => setShowSopModal(false)}
      />
    </div>
  );
};

export default RiderCurrentOrder;