import { getToken } from "../utils/authStorage";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useState } from "react";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import { toast } from "react-hot-toast";
import { VscLoading } from "react-icons/vsc";
import { BiMinus, BiPlus } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";
import CouponSection from "../components/CouponSection";

const Cart = () => {

  const { cart, subTotal, quantity, fetchCart } = useAppData();
  const navigate = useNavigate();

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCouponCode, setAppliedCouponCode] = useState("");

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-lg">Your cart is empty</p>
        <button
          className="rounded-lg bg-[#E23744] px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-800 transition-colors cursor-pointer"
          onClick={() => navigate("/")}
        >
          Explore Restaurants
        </button>
      </div>
    );
  }

  const restaurant = (cart[0]?.restaurantId as IRestaurant) || null;

  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platformFee = 7;
  const grandTotal = Math.max(0, subTotal + deliveryFee + platformFee - discountAmount);

  const increaseQty = async (itemId: string) => {
    try {
       setLoadingItemId(itemId);
       await axios.put(`${restaurantService}/api/cart/inc`,
         {itemId},
         {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          }
         }
        );

        await fetchCart();
    } catch (error) {
      toast.error("Failed to increase quantity");
      console.log(error);
    }finally{
      setLoadingItemId(null);
    }
  };


    const decreaseQty = async (itemId: string) => {
    try {
       setLoadingItemId(itemId);
       await axios.put(`${restaurantService}/api/cart/dec`,
         {itemId},
         {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          }
         }
        );

        await fetchCart();
    } catch (error) {
      toast.error("Failed to decrease quantity");
      console.log(error);
    }finally{
      setLoadingItemId(null);
    }
  };


    const clearCart = async () => {
      const confirm = window.confirm("Are you sure you want to clear your cart?");
      if(!confirm) return;
    try {
      setClearingCart(true);
       await axios.delete(`${restaurantService}/api/cart/clear`,
         {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          }
         }
        );

        await fetchCart();
    } catch (error) {
      toast.error("Failed to clear.");
      console.log(error);
    }finally{
      setClearingCart(false);
    }
  };

  const checkout = () => {
    navigate("/checkout", { state: { appliedCouponCode, discountAmount } });
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col lg:flex-row gap-6">
      
        {/* Left Side: Items */}
        <div className="flex-1 space-y-6">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="text-xl font-semibold">
               {restaurant?.name || "Unknown Restaurant"}
            </h2>
            <p className="text-sm text-gray-500">
             {restaurant?.autoLocation?.formattedAddress || "Address Unavailable"}
            </p>
          </div>

          <div className="space-y-4">
              {cart.map((cartItem: ICart) => {
                const item = cartItem.itemId as IMenuItem;
                if (!item) return null; // Defensive check for deleted items
                const isLoading = loadingItemId === item._id;

                return <div key={item._id} className="flex items-center gap-2 sm:gap-4 rounded-xl bg-white p-3 sm:p-4 shadow-sm" >
                  <img src={item.image} alt={item.name} className="h-16 w-16 sm:h-20 sm:w-20 rounded object-cover" />

                   <div className="flex-1">
                     <h3 className="text-base sm:text-lg font-medium line-clamp-1">{item.name}</h3>
                     <p className="text-sm text-gray-500">₹{item.price}</p>
                   </div>
 
                   <div className="flex items-center gap-3">
                          <button className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50 cursor-pointer" disabled={isLoading} onClick={() => decreaseQty(item._id)}>
                           {isLoading ? (
                           <VscLoading size={16} className="animate-spin" />
                          ) : (
                           <BiMinus size={16} />
                          )}
                          </button>
                          
                           <span className="font-medium">{cartItem.quantity}
                           </span>

                          <button className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50 cursor-pointer" disabled={isLoading} onClick={() => increaseQty(item._id)}>
                           {isLoading ? (
                           <VscLoading size={16} className="animate-spin" />
                          ) : (
                           <BiPlus size={16} />
                          )}
                          </button>
                   </div>

                   <p className="font-medium w-16 sm:w-20 text-right text-sm sm:text-base">
                     ₹{cartItem.quantity * item.price}
                   </p>

                 </div>
              })}
          </div>
        </div>

        {/* Right Side: Order Summary */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0">
          <div className="rounded-xl bg-white p-5 shadow-sm space-y-3 sticky top-24">
            <h3 className="font-bold text-lg mb-4 border-b pb-2">Order Summary</h3>
          <div className="flex justify-between text-sm">
            <span>Total Items</span>
            <span>{quantity}</span>
            </div>

            
            <div className="flex justify-between text-sm">
               <span>Subtotal</span>
               <span>₹{subTotal}</span>
            </div>
            <div className="flex justify-between text-sm">
               <span>Delivery Fee</span>
               <span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span>
            </div>
            <div className="flex justify-between text-sm">
               <span>Platform Fee</span>
               <span>₹{platformFee}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                 <span>Discount</span>
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
              <span>Grand-Total</span>
               <span>₹{grandTotal}</span>
             </div>

             <CouponSection 
               orderValue={subTotal} 
               onApplyDiscount={(discount, code) => {
                 setDiscountAmount(discount);
                 setAppliedCouponCode(code);
               }} 
             />

            <button
            className={`mt-3 w-full rounded-lg bg-[#E23744] py-3 text-sm font-semibold text-white hover:bg-red-800 ${!(restaurant?.isOpen) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            disabled={!restaurant || !restaurant.isOpen}
            onClick={checkout}
            >
            {!restaurant ? "Restaurant Unavailable" : (!restaurant.isOpen ? "Restaurant is Closed" : "Proceed to Checkout")} 
            </button>

            <button
            className="mt-3 w-full rounded-lg bg-[#232222] py-3 text-sm font-semibold text-white hover:bg-gray-600 cursor-pointer flex justify-center items-center gap-2"
            onClick={clearCart}
            disabled={clearingCart}
            >
             Clear Cart <TbTrash size={16} />
            </button>

            <button
            className="mt-3 w-full rounded-lg border-2 border-[#E23744] bg-white py-3 text-sm font-semibold text-[#E23744] hover:bg-red-50 cursor-pointer"
            onClick={() => navigate("/")}
            >
             Explore More Restaurants
            </button>

          </div>
        </div>
      </div>
    </div>
  )
};

export default Cart
