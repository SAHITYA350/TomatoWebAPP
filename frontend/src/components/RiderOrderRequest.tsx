import { getToken } from "../utils/authStorage";
import { useEffect, useRef, useState } from "react";
import { riderService } from "../config";
import axios from "axios";
import { toast } from "react-hot-toast";

interface Props {
    orderId: string;
    pingTimestamp?: number;
    onAccepted: () => void;
    onTimeout: () => void;
}

const RiderOrderRequest = ({orderId, pingTimestamp, onAccepted, onTimeout}: Props) => {

   const [accepting, setAccepting] = useState(false);
   const [secondsLeft, setSecondsLeft] = useState(20);

   const onAcceptedRef = useRef(onAccepted);
   const onTimeoutRef = useRef(onTimeout);

   useEffect(() => {
     onAcceptedRef.current = onAccepted;
     onTimeoutRef.current = onTimeout;
   }, [onAccepted, onTimeout]);

   useEffect(() => {
     // Reset the timer back to 20 seconds whenever a new ping arrives from the restaurant
     setSecondsLeft(20);
   }, [pingTimestamp]);

   useEffect(() => {
     if (secondsLeft === 0) {
       onTimeoutRef.current();
     }
   }, [secondsLeft]);

   useEffect(() => {
    const interval = setInterval(() => {
        setSecondsLeft((prev) => {
            if(prev <= 1){
                clearInterval(interval);
                return 0;
            }
            return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }, []);

        const acceptOrder = async () => {
            setAccepting(true);
            try {
                await axios.post(`${riderService}/api/rider/accept/${orderId}`,
                    {},
                    {
                     headers:{
                        Authorization: `Bearer ${getToken()}`,
                     },
                }
            );

            toast.success("Order Accepted");
            onAcceptedRef.current();
            } catch (error:any) {
                toast.error(error?.response?.data?.message || "Failed to accept order");
                onTimeoutRef.current();
            }finally{
                setAccepting(false);
            }
        };

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border border-green-300 space-y-3">
        <p className="text-center text-xs font-semibold text-red-600">
            Accept within {secondsLeft}s
        </p>
        
        <p className="text-center text-xs font-semibold text-green-600">
            New Delivery Request
        </p>
         
         <p className="text-xs text-gray-600">
            Order ID: <b>{orderId.slice(-6)}</b>
         </p>

         <button 
         disabled={accepting}
         onClick={acceptOrder}
         className="w-full rounded-lg bg-green-600 py-2 text-sm cursor-pointer font-semibold text-white hover:bg-green-700 disabled:opacity-50"
         >{accepting ? "Accepting..." : "Accept Order"}</button>

    </div>
  )
}

export default RiderOrderRequest
