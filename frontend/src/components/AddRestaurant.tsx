import { getToken } from "../utils/authStorage";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { restaurantService } from "../config";
import { BiMapPin, BiUpload } from "react-icons/bi";
import { useAppData } from "../context/AppContext";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";
import Footer from "./Footer";

// 🔧 Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface props {
  fetchMyRestaurant: () => Promise<void>;
}

// 📍 Click-to-select location
const LocationPicker = ({
  setLocation,
}: {
  setLocation: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// 🎯 Locate me button
const LocateMeButton = ({
  onLocate,
}: {
  onLocate: (lat: number, lng: number) => void;
}) => {
  const map = useMap();
  const locateUser = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16, { animate: true });
        onLocate(latitude, longitude);
      },
      () => toast.error("Location permission denied")
    );
  };
  return (
    <button
      type="button"
      onClick={locateUser}
      className="absolute right-3 top-3 z-1000 flex items-center cursor-pointer gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow hover:bg-gray-100"
    >
      <LuLocateFixed size={16} />
      Use current location
    </button>
  );
};

const AddRestaurant = ({ fetchMyRestaurant } : props) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [phone, setPhone] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const { location: initialLocation } = useAppData();

    // Local location states initialized from AppContext geolocator
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [formattedAddress, setFormattedAddress] = useState("");
    const [fetchingAddr, setFetchingAddr] = useState(false);

    // Sync initial coordinates once they load
    useEffect(() => {
      if (initialLocation && latitude === null && longitude === null) {
        setLatitude(initialLocation.latitude);
        setLongitude(initialLocation.longitude);
        setFormattedAddress(initialLocation.formattedAddress);
      }
    }, [initialLocation, latitude, longitude]);

    // Reverse geocoding helper
    const fetchFormattedAddress = async (lat: number, lng: number) => {
      try {
        setFetchingAddr(true);
        let addressStr = "";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          if (!res.ok) throw new Error("Nominatim failed");
          const data = await res.json();
          addressStr = data.display_name || "";
        } catch (nominatimErr) {
          console.warn("Nominatim geocoding failed, trying fallback BigDataCloud API...", nominatimErr);
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );
          if (!res.ok) throw new Error("BigDataCloud fallback failed");
          const data = await res.json();

          const parts = [];
          if (data.locality) parts.push(data.locality);
          if (data.city) parts.push(data.city);
          if (data.principalSubdivision) parts.push(data.principalSubdivision);
          if (data.countryName) parts.push(data.countryName);
          addressStr = parts.join(", ");
        }
        setFormattedAddress(addressStr);
      } catch {
        toast.error("Failed to fetch address details");
      } finally {
        setFetchingAddr(false);
      }
    };

    const handleSetLocation = (lat: number, lng: number) => {
      setLatitude(lat);
      setLongitude(lng);
      fetchFormattedAddress(lat, lng);
    };

    const handleSubmit = async () => {
      if(!name || !image || latitude === null || longitude === null || !formattedAddress) {
        alert("All fields including location are required.");
        return;
      }

      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("latitude", String(latitude));
      formData.append("longitude", String(longitude));
      formData.append("formattedAddress", formattedAddress);
      formData.append("file", image);
      formData.append("phone", phone);

      try{
         setSubmitting(true);
         await axios.post(`${restaurantService}/api/restaurant/new`, formData,{
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
         });

         toast.success("Restaurant added successfully.");
         fetchMyRestaurant();
      } catch(error: any) {
        toast.error(error.response?.data?.message || "Failed to add restaurant. Please try again."); 
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5">
          <h1 className="text-xl font-semibold text-center">Add Your Restaurant</h1>
          
          <div className="space-y-4">
            <input type="text" placeholder="Restaurant name" value={name} onChange={e=> setName(e.target.value)} className="w-full rounded-lg border px-4 py-2 text-sm outline-none" />

            <input type="number" placeholder="Contact number" value={phone} onChange={e=> setPhone(e.target.value)} className="w-full rounded-lg border px-4 py-2 text-sm outline-none" />

            <textarea placeholder="Restaurant description" value={description} onChange={e=> setDescription(e.target.value)} className="w-full rounded-lg border px-4 py-2 text-sm outline-none" />

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
              <BiUpload className="h-5 w-5 text-red-500" />
              {image ? image.name : "Upload Restaurant image"}
              <input type="file" accept="image/*" hidden onChange={e => setImage(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Pin Restaurant Location on Map</label>
            <div className="relative h-64 w-full overflow-hidden rounded-lg border">
              <MapContainer
                center={[latitude || 22.6343, longitude || 88.3762]}
                zoom={latitude ? 15 : 12}
                className="h-full w-full"
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <LocationPicker setLocation={handleSetLocation} />
                <LocateMeButton onLocate={handleSetLocation} />
                {latitude && longitude && <Marker position={[latitude, longitude]} />}
              </MapContainer>
            </div>
          </div>

          {formattedAddress && (
            <div className="flex items-start gap-3 rounded-lg border bg-green-50 p-4">
              <BiMapPin className="mt-0.5 h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="text-sm text-gray-800">
                {fetchingAddr ? "Fetching address..." : `📍 ${formattedAddress}`}
              </div>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || fetchingAddr} className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-[#e23744] hover:bg-[#d32f3a] transition disabled:opacity-50 cursor-pointer">
            {submitting ? "Submitting..." : "Add Restaurant"}
          </button>
      </div>     

      <Footer />
    </div>
  );
}

export default AddRestaurant;
