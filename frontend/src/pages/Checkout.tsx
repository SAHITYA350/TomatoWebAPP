import { getToken } from "../utils/authStorage";
import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import { restaurantService, utilsService } from "../config";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import type { IMenuItem, IRestaurant, ICart } from "../types";
import { toast } from "react-hot-toast";
import { BiCreditCard, BiLoader } from "react-icons/bi";
import { loadStripe } from "@stripe/stripe-js";

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: string;
}

const loadRazorpayScript = () => {
  return new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder").catch((err) => {
  console.warn("Stripe.js script load bypassed or offline:", err);
  return null;
});

const Checkout = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const { cart, subTotal, quantity } = useAppData();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
   null
  );

  const [loadingAddress, setLoadingAddress] = useState(true);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Retrieve state from Cart navigation
  const passedCouponCode = location.state?.appliedCouponCode || "";
  const passedDiscountAmount = location.state?.discountAmount || 0;

  const [couponInput, setCouponInput] = useState(passedCouponCode);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(passedCouponCode ? { code: passedCouponCode } : null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(passedDiscountAmount);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!cart || cart.length === 0) {
        setLoadingAddress(false);
        return;
      }

      try {
        const {data} = await axios.get(`${restaurantService}/api/address/all`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      setAddresses(data || []);
      } catch (error) {
       console.error("Error fetching addresses:", error);
      } finally {
        setLoadingAddress(false);
      }
    };
    fetchAddresses();
  }, [cart]);

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-gray-500 text-lg">Your cart is empty.</p>
    </div>
    );
  }

  
  const restaurant = cart[0].restaurantId as IRestaurant;

  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platformFee = 7; 

  // Removed broken useEffect calculating discountAmount to fix Hook rules

  const grandTotal = subTotal + deliveryFee + platformFee - discountAmount;

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setCouponLoading(true);
    try {
      const { data } = await axios.post(`${restaurantService}/api/campaign/validate-coupon`, {
        code: couponInput,
        orderValue: subTotal
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      if (data.success && !data.message?.includes("false")) {
        const { type, value, maxDiscount } = data.coupon || data;
        let discount = 0;
        
        if (type === "PERCENT") {
          discount = (subTotal * value) / 100;
          if (maxDiscount && discount > maxDiscount) discount = maxDiscount;
        } else if (type === "FIXED") {
          discount = value;
        } else if (type === "FREE_DELIVERY") {
          discount = subTotal < 250 ? 49 : 0; 
        }
        
        discount = Math.round(discount * 100) / 100;

        setAppliedCoupon(data.coupon);
        setDiscountAmount(discount);
        toast.success(data.message || "Coupon applied!");
      } else {
        toast.error(data.message || "Invalid coupon code");
        setAppliedCoupon(null);
        setDiscountAmount(0);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Invalid coupon code";
      toast.error(message);
      setAppliedCoupon(null);
      setDiscountAmount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const createOrder = async (paymentMethod: "razorpay" | "stripe") => {
    if(!selectedAddressId) return null;

    setCreatingOrder(true); 
    try{
      const { data } = await axios.post(`${restaurantService}/api/order/new`, {
        paymentMethod,
        addressId: selectedAddressId,
        couponCode: appliedCoupon?.code || undefined,
      },
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        }
      }
    );

    return data;
    } catch (error: any) {
       toast.error(error.response?.data?.message || "Failed to create order");
    } finally {
      setCreatingOrder(false);
    }
  };

  const payWithRazorpay = async () => {
    try {
      setLoadingRazorpay(true);
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Are you offline?");
        return;
      }

      const order = await createOrder("razorpay");
      if(!order) return;

      const {orderId, amount} = order;
      
      const {data} = await axios.post(`${utilsService}/api/payment/create`, {
        orderId,
      });

      const { razorpayOrderId, key } = data;

      const options = {
          key,
          amount: amount * 100,
          currency: "INR",
          name: "Tomato", //your business name
          description: "Food Order Payment",
          order_id: razorpayOrderId,

          handler: async (response: any) => {
            try {
              await axios.post(`${utilsService}/api/payment/verify`, {
                  razorpay_order_id: response.razorpay_order_id, 
                  razorpay_payment_id: response.razorpay_payment_id, 
                  razorpay_signature: response.razorpay_signature, 
                  orderId
              });

              toast.success("Payment successful 🎉");
              navigate('/paymentsuccess/' + response.razorpay_payment_id);
            } catch (error: any) {
               console.error("Razorpay verification error:", error);
               const message = error.response?.data?.message || error.message || "Payment verification failed";
               toast.error(`Payment verification failed: ${message}`);
            }
          },
          theme: {
              "color": "#E23744"
          }
      }; 

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
         console.error("Razorpay initiation error:", error);
         const message = error.response?.data?.message || error.message || "Payment initiation failed";
         toast.error(`Payment failed: ${message}`);
    } finally {
      setLoadingRazorpay(false);
    }
  };

  const paywithStripe = async() => {
    try {
      setLoadingStripe(true);
      const order = await createOrder('stripe');
      if(!order) return;

      const { orderId } = order;

      try {
        const stripe = await stripePromise;
        
        const {data} = await axios.post(`${utilsService}/api/payment/stripe/create`, {
          orderId,
        })

        if(data.url) {
          window.location.href = data.url;
        } else {
          toast.error("Failed to create stripe payment session");
        }

      } catch (error: any) {
        console.error("Stripe session creation error:", error);
        const message = error.response?.data?.message || error.message || "Failed to initiate Stripe payment";
        toast.error(`Payment failed: ${message}`);
      }
    } catch (error: any) {
      console.error("Stripe payment error:", error);
      const message = error.response?.data?.message || error.message || "Payment failed";
      toast.error(`Payment failed: ${message}`);
    } finally {
      setLoadingStripe(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{restaurant.name}</h2>
        <p className="text-sm text-gray-500">
          { restaurant.autoLocation.formattedAddress }
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Delivary Address</h3>
        {
          loadingAddress ? <p className="text-sm test-gray-500">Loading address...</p> : addresses.length === 0 ? <p className="text-sm text-gray-500">
           No address found please add one.
          </p> : addresses.map((add) => (

            <label
              key={add._id}
              className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition ${
                selectedAddressId === add._id
                  ? "border-[#e23744] bg-red-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                className="accent-[#e23744]"
                checked={selectedAddressId === add._id}
                onChange={() => setSelectedAddressId(add._id)}
              />

              <div>
                <p className="text-sm font-medium">{add.formattedAddress}</p>
                <p className="text-xs text-gray-500">{add.mobile}</p>
              </div>
            </label>
          ))
        }
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-4">
         <h3 className="font-semibold">
           Order Summary
         </h3>

         {
          cart.map((cartItem: ICart) => {
            const item = cartItem.itemId as IMenuItem;

            return (
              <div className="flex justify-between text-sm" key={cartItem._id}>
              <span>
                {item.name} x {cartItem.quantity}
              </span>
              <span>
                ₹{item.price * cartItem.quantity}
              </span>
            </div>
            );
          })}

          <hr />

          <div className="flex justify-between text-sm">
            <span>Items ({quantity})</span>
            <span>₹{subTotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Delivery Fee</span>
            <span>₹{deliveryFee === 0 ? "Free" : `${deliveryFee}`}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Platform Fee</span>
            <span>₹{platformFee}</span>
          </div>

          {appliedCoupon && discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Discount ({appliedCoupon.code})</span>
              <span>-₹{discountAmount}</span>
            </div>
          )}

          {
              subTotal < 250 && (
                <p className="text-xs text-gray-500">
                    Add Item worth ₹{250 - subTotal} more to get Free delivery.
                </p>
              )}

            <div className="flex justify-between text-base font-semibold border-t pt-2">
              <span>Grand Total</span>
               <span>₹{grandTotal}</span>
             </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Apply Coupon</h3>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="e.g. WELCOME50" 
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm uppercase outline-none focus:border-[#e23744]"
          />
          <button 
            disabled={couponLoading || !couponInput}
            onClick={handleApplyCoupon}
            className="bg-[#e23744] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50 cursor-pointer"
          >
            {couponLoading ? "Applying..." : "Apply"}
          </button>
        </div>
        {appliedCoupon && (
          <p className="text-xs text-green-600 font-medium">
            ✅ '{appliedCoupon.code}' applied successfully.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Payment Method</h3>

        <button disabled={!selectedAddressId || loadingRazorpay || creatingOrder}
        onClick={payWithRazorpay}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2D7FF9] py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50 cursor-pointer"
        >
          {loadingRazorpay ? (
            <BiLoader size={18} className="animate-spin" />
          ) : (
            <BiCreditCard size={18} />
          )}

        Pay with Razorpay
        </button>

        <button disabled={!selectedAddressId || loadingStripe || creatingOrder}
        onClick={paywithStripe}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
        >
          {
            loadingStripe ? (
            <BiLoader size={18} className="animate-spin" />
          ) : (
            <BiCreditCard size={18} />
              )
          }
          
        Pay with Stripe
        </button>
      </div>
      </div>
    </div>
  );
};

export default Checkout;
