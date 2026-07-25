import type React from "react";

export interface User {
     _id: string;
     name: string;
     email: string;
     image: string;
     picture?: string;
     role: string | null;
}

export interface LocationData {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    accuracy?: number;
}

export interface AppContextType {
    user: User | null;
    loading: boolean;
    isAuth: boolean;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    location: LocationData | null;
    setLocationManual: (lat: number, lon: number, customAddress?: string) => Promise<void>;
    loadingLocation: boolean;
    city: string;
    locationError: string | null;
    setLocationError: React.Dispatch<React.SetStateAction<string | null>>;
    cart: ICart[] | null;
    fetchCart: () => Promise<void>;
    subTotal: number;
    quantity: number;
    logout: (role?: string | null) => void;
    showPreloader: boolean;
    setShowPreloader: React.Dispatch<React.SetStateAction<boolean>>;
    visibleRestaurants: IRestaurant[];
    setVisibleRestaurants: React.Dispatch<React.SetStateAction<IRestaurant[]>>;
    resolveLocation: () => Promise<void>;
}

export interface IRestaurant {
    _id: string;
    name: string;
    description?: string;
    image: string;
    ownerId: string;
    phone: number;
    isVerified: boolean;
    autoLocation:{
        type: "Point",
        coordinates: [number, number]; //[longitude, latitude]
        formattedAddress: string; 
        };
        isOpen: boolean;
        isSmartMode: boolean;
        createdAt: Date;
    }
    
    export interface IMenuItem  {
    _id: string;
    restaurantId: string;
    name: string;
    description: string;
    image?: string;
    price: number;
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
}


export interface ICart{
    _id: string;
    userId: string;
    restaurantId: string | IRestaurant;
    itemId: string | IMenuItem;
    quantity: number;
    cretedAt: Date;
    updatedAt: Date;
}



export interface IOrder {
    _id: string;
    userId: string;
    restaurantId: string;
    restaurantName: string;
    riderId?: string | null;
    riderPhone: number | null;
    riderName: string | null;
    distance: number;
    riderAmount: number;

    items: {
        itemId: string;
        name: string;
        price: number;
        quantity: number;
        image?: string;
    }[];

    subtotal: number;
    deliveryFee: number;
    platformFee: number;
    totalAmount: number;

    addressId: string;

    deliveryAddress: {
        formattedAddress: string;
        mobile: number;
        latitude: number;
        longitude: number;
    };

    status: | "placed" | "accepted" | "preparing" | "ready_for_rider" | "rider_assigned" | "picked_up" | "delivered" | "cancelled";

    paymentMethod: "razorpay" | "stripe";
    paymentStatus: "pending" | "paid" | "failed";

    restaurantRating?: number;
    restaurantFeedback?: string;
    riderRating?: number;
    riderFeedback?: string;

    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}