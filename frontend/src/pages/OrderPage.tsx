import { getToken } from "../utils/authStorage";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import type { IOrder } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import UserOrderMap from "../components/UserOrderMap";
import { toast } from "react-hot-toast";

import RatingModal from "../components/RatingModal";

const OrderPage = () => {
  const { id } = useParams();
  const { socket } = useSocket();

  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const [isRestaurantRatingOpen, setIsRestaurantRatingOpen] = useState(false);
  const [isRiderRatingOpen, setIsRiderRatingOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRateRestaurant = async (rating: number, feedback: string) => {
    setIsSubmitting(true);
    try {
      await axios.post(
        `${restaurantService}/api/order/${id}/rate-restaurant`,
        { rating, feedback },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      toast.success("Thank you for rating the food!");
      setIsRestaurantRatingOpen(false);
      fetchOrder();
    } catch (error) {
      toast.error("Failed to submit rating.");
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateRider = async (rating: number, feedback: string) => {
    setIsSubmitting(true);
    try {
      await axios.post(
        `${restaurantService}/api/order/${id}/rate-rider`,
        { rating, feedback },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      toast.success("Thank you for rating the rider!");
      setIsRiderRatingOpen(false);
      fetchOrder();
    } catch (error) {
      toast.error("Failed to submit rating.");
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchOrder = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/${id}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      // Adjust this depending on your API response shape
      setOrder(data.order || data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Automatically pop up rating modal when order is delivered
  useEffect(() => {
    if (order && order.status === "delivered") {
      if (!order.restaurantRating) {
        setIsRestaurantRatingOpen(true);
      } else if (order.riderId && !order.riderRating) {
        setIsRiderRatingOpen(true);
      }
    }
  }, [order?.status, order?.restaurantRating, order?.riderRating, order?.riderId]);

  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = (data: { orderId: string; status: string }) => {
      fetchOrder();
      
      const statusMap: Record<string, string> = {
        accepted: "Your order has been accepted by the restaurant! 🍳",
        preparing: "The kitchen is preparing your delicious meal! 🍲",
        ready_for_rider: "Your order is ready and waiting for the delivery rider! 🛵",
        rider_assigned: "A rider has been assigned to deliver your order! 🚴",
        picked_up: "Your order has been picked up and is on the way! 🚀",
        delivered: "Your order has been delivered! Enjoy your meal! 🎉",
        cancelled: "Your order was cancelled. Please contact support."
      };

      if (data.status && statusMap[data.status]) {
        toast.success(statusMap[data.status], { icon: "🔔", duration: 5000 });
      }
    };

    const onRiderAssigned = (updatedOrder: any) => {
      fetchOrder();
      
      const statusMap: Record<string, string> = {
        rider_assigned: "A rider has been assigned to deliver your order! 🚴",
        picked_up: "Your order has been picked up and is on the way! 🚀",
        delivered: "Your order has been delivered! Enjoy your meal! 🎉"
      };

      if (updatedOrder.status && statusMap[updatedOrder.status]) {
        toast.success(statusMap[updatedOrder.status], { icon: "🔔", duration: 5000 });
      }
    };

    const onNoRidersFound = (data: { orderId: string }) => {
        if (data.orderId === id) {
            toast.error("Riders are currently busy or offline. The restaurant is manually searching for a rider for your order.", { icon: "⏳", duration: 6000 });
        }
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onRiderAssigned);
    socket.on("order:no_riders_found", onNoRidersFound);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onRiderAssigned);
      socket.off("order:no_riders_found", onNoRidersFound);
    };
  }, [socket, id]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("join", `user:${id}`);
    return () => {
      socket.emit("leave", `user:${id}`)
    }
  }, [socket, id]);

  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
     if (!socket || !id) return;

     const onRiderLocation = ({ latitude, longitude }: any) => {
      console.log("Rider Location:", latitude, longitude);
      setRiderLocation([latitude, longitude]);
     };

     socket.on("rider:location",onRiderLocation);

     return () => {
      socket.off("rider:location", onRiderLocation);
     }
  }, [socket]);

  if (loading) {
    return (
      <p className="text-center text-gray-500">
        Loading order...
      </p>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">No order found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold">
        Order #{order._id?.slice(-6) ?? "------"}
      </h1>

      <div className="rounded-lg bg-blue-50 p-3 text-sm font-medium">
        Status:{" "}
        <span className="capitalize">
          {order.status}
        </span>
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-gray-800">Items</h2>

        <div className="divide-y divide-gray-100">
          {order.items?.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-4"
            >
              <div className="flex items-center gap-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-12 w-12 rounded-lg object-cover border border-gray-100"
                  />
                )}
                <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-xs text-gray-500">₹{item.price} each</p>
                </div>
              </div>

              <div className="text-right flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                  Qty: {item.quantity}
                </span>
                <span className="font-semibold text-gray-900">
                  ₹{item.price * item.quantity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

       <div className="rounded-xl bg-white p-4 shadow-sm space-y-1">
         <h2 className="font-semibold">Delivery Address</h2>
         <p className="text-sm text-gray-600">
          {order.deliveryAddress.formattedAddress}
         </p>
         <p className="text-sm text-gray-600">Mobile: {order.deliveryAddress.mobile}</p>
       </div>

       <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">

         <div className="flex justify-between text-sm">
          <span>SubTotal</span> <span>₹{order.subtotal}</span>
         </div>
         <div className="flex justify-between text-sm">
          <span>Delivery Fee</span> <span>₹{order.deliveryFee}</span>
         </div>
         <div className="flex justify-between text-sm">
          <span>Platform Fee</span> <span>₹{order.platformFee}</span>
         </div>
         <div className="flex justify-between text-sm">
          <span>Total</span> <span>₹{order.totalAmount}</span>
         </div>

          <p className="text-xs text-gray-500">
            Payment Method: {order.paymentMethod}
          </p>

          <p className="text-xs text-gray-500">
            Payment Status: {order.paymentStatus}
          </p>
       </div>


          {
          (order.status === "rider_assigned" || 
          order.status === "picked_up") && 
          (riderLocation ? (
              <UserOrderMap 
                riderLocation={riderLocation} 
                deliveryLocation={[order.deliveryAddress.latitude!, order.deliveryAddress.longitude!]} 
                deliveryAddress={order.deliveryAddress.formattedAddress}
              />
            ) : (
              <p className="text-center py-4 text-gray-500 font-medium">Waiting for rider location...</p>
           ))}

          {order.status === "delivered" && (
            <div className="rounded-xl bg-white p-4 shadow-sm space-y-4">
              <h2 className="font-bold text-gray-800 text-lg">Rate Your Experience</h2>
              <p className="text-sm text-gray-500">Your feedback helps us improve.</p>

              {!order.restaurantRating ? (
                <button
                  onClick={() => setIsRestaurantRatingOpen(true)}
                  className="w-full rounded-lg bg-green-500 py-3 text-sm font-semibold text-white hover:bg-green-600 transition-colors cursor-pointer shadow-md shadow-green-100"
                >
                  Rate Food & Restaurant
                </button>
              ) : (
                <div className="p-3 bg-gray-50 border rounded-lg text-sm">
                  <span className="font-semibold">Restaurant Rating:</span> {order.restaurantRating} ⭐
                  {order.restaurantFeedback && <p className="italic text-gray-600 mt-1">"{order.restaurantFeedback}"</p>}
                </div>
              )}

              {order.riderId && !order.riderRating ? (
                <button
                  onClick={() => setIsRiderRatingOpen(true)}
                  className="w-full rounded-lg bg-blue-500 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-colors cursor-pointer shadow-md shadow-blue-100"
                >
                  Rate Delivery Rider
                </button>
              ) : order.riderId && order.riderRating ? (
                <div className="p-3 bg-gray-50 border rounded-lg text-sm">
                  <span className="font-semibold">Rider Rating:</span> {order.riderRating} ⭐
                  {order.riderFeedback && <p className="italic text-gray-600 mt-1">"{order.riderFeedback}"</p>}
                </div>
              ) : null}
            </div>
          )}

      <RatingModal
        isOpen={isRestaurantRatingOpen}
        onClose={() => setIsRestaurantRatingOpen(false)}
        title="Rate the Food"
        subtitle={`How was the quality and taste from ${order.restaurantName}?`}
        isSubmitting={isSubmitting}
        onSubmit={handleRateRestaurant}
      />

      <RatingModal
        isOpen={isRiderRatingOpen}
        onClose={() => setIsRiderRatingOpen(false)}
        title="Rate the Rider"
        subtitle="How was your delivery experience?"
        isSubmitting={isSubmitting}
        onSubmit={handleRateRider}
      />

    </div>
  );
};

export default OrderPage;