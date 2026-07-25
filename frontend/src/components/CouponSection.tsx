import { useState } from "react";
import axios from "axios";
import { restaurantService } from "../config";
import { getToken } from "../utils/authStorage";
import { BiTag, BiX } from "react-icons/bi";
import toast from "react-hot-toast";

interface CouponSectionProps {
  orderValue: number;
  onApplyDiscount: (discount: number, code: string) => void;
}

const CouponSection = ({ orderValue, onApplyDiscount }: CouponSectionProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discountAmount: number} | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/campaign/validate-coupon`,
        { code, orderValue },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      
      if (data.success && !data.message?.includes("false")) {
        // Calculate discount based on new schema
        const { type, value, maxDiscount } = data.coupon || data;
        let discountAmount = 0;
        
        if (type === "PERCENT") {
          discountAmount = (orderValue * value) / 100;
          if (maxDiscount && discountAmount > maxDiscount) {
            discountAmount = maxDiscount;
          }
        } else if (type === "FIXED") {
          discountAmount = value;
        } else if (type === "FREE_DELIVERY") {
          discountAmount = orderValue < 250 ? 49 : 0; // standard delivery fee
        }
        
        // Round to 2 decimals
        discountAmount = Math.round(discountAmount * 100) / 100;

        setAppliedCoupon({ code: data.coupon?.code || code, discountAmount });
        onApplyDiscount(discountAmount, data.coupon?.code || code);
        toast.success(data.message || "Coupon applied successfully");
      } else {
        toast.error(data.message || "Invalid coupon");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid coupon code");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setCode("");
    onApplyDiscount(0, "");
    toast.success("Coupon removed");
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <BiTag className="text-[#E23744]" size={20} />
        <h3 className="font-semibold text-gray-800">Offers & Benefits</h3>
      </div>
      
      {appliedCoupon ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-green-700">{appliedCoupon.code}</span>
              <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">APPLIED</span>
            </div>
            <p className="text-xs text-green-600 mt-1">You saved ₹{appliedCoupon.discountAmount}</p>
          </div>
          <button 
            onClick={handleRemove}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
          >
            <BiX size={24} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input 
            type="text" 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter coupon code"
            className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-[#E23744] uppercase"
          />
          <button 
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : "APPLY"}
          </button>
        </div>
      )}
      
      {!appliedCoupon && (
        <div className="mt-3 text-xs text-gray-500">
          Try <span className="font-bold text-gray-700 border border-gray-300 rounded px-1 cursor-pointer" onClick={() => setCode("WELCOME50")}>WELCOME50</span> or <span className="font-bold text-gray-700 border border-gray-300 rounded px-1 cursor-pointer" onClick={() => setCode("FLAT20")}>FLAT20</span>
        </div>
      )}
    </div>
  );
};

export default CouponSection;
