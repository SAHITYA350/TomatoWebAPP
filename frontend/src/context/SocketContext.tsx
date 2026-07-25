import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode
} from 'react';
import {io, Socket} from 'socket.io-client';
import { useAppData } from './AppContext';
import { realtimeService, restaurantService } from '../config';
import { getToken } from '../utils/authStorage';
import axios from 'axios';

interface SocketContextType {
    socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const { isAuth, user, location } = useAppData();

    const [socket, setSocket] = useState<Socket | null>(null);
    const hasWarnedRef = useRef(false);

    // Report user location and online/offline status
    useEffect(() => {
        if (!isAuth || !user || !location?.latitude || !location?.longitude) return;

        const userId = user._id;
        const name = user.name || "User";
        const type = user.role || "customer";
        const lat = location.latitude;
        const lng = location.longitude;

        // Register online
        axios.post(`${restaurantService}/api/realtime/user-online`, {
            userId,
            type,
            name,
            lat,
            lng,
            status: "online"
        }, {
            headers: { Authorization: `Bearer ${getToken()}` }
        }).catch(err => {
            console.error("Failed to register user online:", err.message);
        });

        // Periodically report location (every 10 seconds)
        const locationInterval = setInterval(async () => {
            const updateLoc = async (currentLat: number, currentLng: number) => {
                try {
                    await axios.post(`${restaurantService}/api/realtime/location-update`, {
                        userId,
                        lat: currentLat,
                        lng: currentLng,
                        status: "online"
                    }, {
                        headers: { Authorization: `Bearer ${getToken()}` }
                    });
                } catch (err: any) {
                    console.warn("User location sync pending connection:", err.message);
                }
            };

            // For testing/simulation purposes, if the user explicitly set a location via the UI, prefer that over GPS.
            if (location?.latitude && location?.longitude) {
                updateLoc(location.latitude, location.longitude);
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => updateLoc(position.coords.latitude, position.coords.longitude),
                    (err) => {
                        console.warn("Geolocation watch warning:", err.message);
                    },
                    { enableHighAccuracy: true, timeout: 8000 }
                );
            }
        }, 10000);

        // Unregister offline on cleanup
        return () => {
            clearInterval(locationInterval);
            axios.post(`${restaurantService}/api/realtime/user-offline`, {
                userId
            }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            }).catch(err => {
                console.error("Failed to register user offline:", err.message);
            });
        };
    }, [isAuth, user, location]);

    useEffect(() => {
        if(!isAuth) {
           socket?.disconnect();
           setSocket(null);
           return;
        }

        hasWarnedRef.current = false;

       const socketInstance = io(realtimeService, {
        auth: {
            token: getToken(),
          },
          transports: ['websocket'],
          reconnectionAttempts: 5,
          reconnectionDelay: 5000,
       });

       setSocket(socketInstance);

       socketInstance.on("connect", () => {
          hasWarnedRef.current = false;
          console.log("Socket Connected", socketInstance.id);
       })

       socketInstance.on("disconnect", () => {
          console.log("Socket Disconnected");
       });

       socketInstance.on("connect_error", (err) => {
         if(!hasWarnedRef.current) {
           console.warn("Socket connection failed (realtime service may be offline):", err.message);
           hasWarnedRef.current = true;
         }
       });

       socketInstance.io.on("reconnect_failed", () => {
         console.warn("Socket gave up reconnecting to realtime service.");
       });

       return () => {
         socketInstance.disconnect();
         setSocket(null);
       };
    }, [isAuth]);

    return (
        <SocketContext.Provider value={{ socket }}>
           {children}
        </SocketContext.Provider>
    )
  };

  export const useSocket = () => useContext(SocketContext);