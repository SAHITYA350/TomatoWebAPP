import { getToken } from "../utils/authStorage";
import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { ORDER_ACTIONS } from "../utils/orderflow";
import axios from "axios";
import { restaurantService, riderService } from "../config";
import { toast } from "react-hot-toast";
import { useSocket } from "../context/SocketContext";
import RiderLocationMap from "./RiderLocationMap";

interface props {
    order: IOrder;
    onStatusUpdate?: () => void;
    restaurantLocation?: { lat: number; lng: number };
}

const statusColor = (status: string) => {
    switch(status){
        case "placed": 
             return "bg-yellow-100 text-yellow-700";
        case "accepted": 
             return "bg-orange-100 text-orange-700";
        case "preparing": 
             return "bg-blue-100 text-blue-700";
        case "ready_for_rider": 
             return "bg-indigo-100 text-indigo-700";
        case "picked_up": 
             return "bg-purple-100 text-purple-700";
        case "delivered": 
             return "bg-green-100 text-green-700";
        default: 
             return "bg-gray-100 text-gray-700";
    }
};

const OrderCard = ({ order, onStatusUpdate, restaurantLocation }: props) => {
    const [loading, setLoading] = useState(false);
    const [notifyLoading, setNotifyLoading] = useState(false);
    const [ridersStatus, setRidersStatus] = useState<string>("");
    
    const actions = ORDER_ACTIONS[order.status] || [];
    const { socket } = useSocket();

    useEffect(() => {
      if(order.status !== "ready_for_rider") {
        return;
      } 

      // Silently auto-retry notifying riders every 15 seconds
      const autoRetry = async () => {
        try {
          await axios.put(`${restaurantService}/api/order/${order._id}`, 
             { status: "ready_for_rider" }, 
             { headers: { Authorization: `Bearer ${getToken()}` } }
          );
        } catch (error) {
           console.log("Auto-retry rider search failed silently", error);
        }
      };

      const timer = setInterval(autoRetry, 25000); // Wait 30 seconds before sending the next ping

      const onRidersFound = (data: { orderId: string, count: number }) => {
        if (data.orderId === order._id) {
            setRidersStatus(`Found ${data.count} nearby riders. Sending notifications...`);
            toast.success(`Found ${data.count} nearby riders!`);
        }
      };

      const onNoRidersFound = (data: { orderId: string }) => {
        if (data.orderId === order._id) {
            setRidersStatus("No riders online! Consider notifying offline riders.");
            toast.error(`No online riders found for Order #${order._id.slice(-6)}`);
        }
      };

      if (socket) {
        socket.on("order:riders_found", onRidersFound);
        socket.on("order:no_riders_found", onNoRidersFound);
      }

      return () => {
        clearInterval(timer);
        if (socket) {
            socket.off("order:riders_found", onRidersFound);
            socket.off("order:no_riders_found", onNoRidersFound);
        }
      };
    }, [order.status, socket]);

    const notifyOfflineRiders = async () => {
        try {
            setNotifyLoading(true);
            const { data } = await axios.post(`${riderService}/api/rider/notify-offline/${order._id}`, {
                restaurantId: order.restaurantId,
                restaurantName: order.restaurantName,
                orderId: order._id
            }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            toast.success(data.message || "Offline riders notified successfully via email!");
            setRidersStatus("Offline riders notified via email.");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to notify offline riders");
        } finally {
            setNotifyLoading(false);
        }
    };

    const updateStatus = async(status: string) => {
     try {
          setLoading(true);
          await axios.put(`${restaurantService}/api/order/${order._id}`, 
             { status }, 
             {
                 headers: {
                     Authorization: `Bearer ${getToken()}`,
                 },
             }
          );
          toast.success("Order updated");
          onStatusUpdate?.();
       } catch (error: any) {
         const msg = error?.response?.data?.message || error?.message || "Failed to update order";
         toast.error(msg);        
       }finally{
         setLoading(false);
      }
    }
    
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Order #{order._id.slice(-6)}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(
                order.status
            )}`}>
            {order.status.replaceAll("_", " ")}
            </span>
        </div>

      <div className="text-sm text-gray-600 space-y-2 border-b border-gray-100 pb-2">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-8 w-8 rounded object-cover border border-gray-100"
                />
              )}
              <span className="font-medium text-gray-800">{item.name}</span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
              Qty: {item.quantity}
            </span>
          </div>
         ))}
      </div>

      <div className="flex justify-between text-sm font-medium">
        <span>Total</span>
        <span>₹{order.totalAmount}</span>  
      </div> 

      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>Payment: {order.paymentStatus}</span>
      </div>

      {
        order.paymentStatus === "paid" && actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
                {actions.map((status) => (
                    <button 
                    key={status}
                    disabled={loading}
                    onClick={() => updateStatus(status)}
                    className="cursor-pointer rounded-lg bg-[#e73744] px-3 py-1 text-xs text-white hover:bg-[#d32f3a] disabled:opacity-50"
                    >
                    Mark as {status.replaceAll("_", " ")}
                    </button>
                ))}
            </div>
        )
      }

      {order.status === "ready_for_rider" && (
        <div className="pt-2 space-y-2">
          <div className="w-full flex justify-center items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-xs font-semibold text-indigo-600">
             <span className="relative flex h-2.5 w-2.5">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
             </span>
             {ridersStatus || "Automatically searching for Rider..."}
          </div>

          {ridersStatus.includes("No riders online") && (
              <button 
                onClick={notifyOfflineRiders}
                disabled={notifyLoading}
                className="w-full cursor-pointer rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {notifyLoading ? "Sending Emails..." : "Notify Offline Riders (Email)"}
              </button>
          )}
        </div>
      )}

      {(order.status === "rider_assigned" || order.status === "picked_up") && (
          <RiderLocationMap 
            orderId={order._id} 
            restaurantLocation={restaurantLocation}
            deliveryLocation={[order.deliveryAddress.latitude, order.deliveryAddress.longitude]}
            deliveryAddress={order.deliveryAddress.formattedAddress}
            orderStatus={order.status}
          />
      )}

      {order.restaurantRating && (
        <div className="mt-3 rounded-lg bg-green-50 p-3 border border-green-100">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm font-bold text-green-700">Customer Rating:</span>
            <span className="text-sm text-green-600">{order.restaurantRating} ⭐</span>
          </div>
          {order.restaurantFeedback && (
            <p className="text-xs text-green-700 italic">"{order.restaurantFeedback}"</p>
          )}
        </div>
      )}

    </div>
  )
}

export default OrderCard;
