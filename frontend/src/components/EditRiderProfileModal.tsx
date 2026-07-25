import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { authService, riderService } from '../config';
import { getToken, setToken } from '../utils/authStorage';
import { useAppData } from '../context/AppContext';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const riderIcon = new L.DivIcon({
    html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>`,
    className: "leaflet-custom-marker",
});

function MapUpdater({ location }: { location: {lat: number, lng: number} | null }) {
    const map = useMap();
    if (location) {
        map.flyTo([location.lat, location.lng], map.getZoom());
    }
    return null;
}

function MapEvents({ setLocation }: { setLocation: (loc: {lat: number, lng: number}) => void }) {
    useMapEvents({
        click(e) {
            setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });
    return null;
}

interface EditRiderProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentProfile: any;
    onProfileUpdated: () => void;
}

const EditRiderProfileModal: React.FC<EditRiderProfileModalProps> = ({ isOpen, onClose, currentProfile, onProfileUpdated }) => {
    const { user, setUser } = useAppData(); 
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(currentProfile?.phoneNumber || '');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState(currentProfile?.picture || user?.image || '');
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(
        currentProfile?.location?.coordinates ? 
        { lng: currentProfile.location.coordinates[0], lat: currentProfile.location.coordinates[1] } 
        : null
    );
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const fetchCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    toast.success("Location updated via GPS");
                },
                (err) => toast.error("Failed to get location")
            );
        } else {
            toast.error("Geolocation is not supported by your browser");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Update Auth (Name)
            if (name !== user?.name) {
                const { data } = await axios.put(`${authService}/api/auth/update`, { name }, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                if (data.token && data.user) {
                    setToken(data.token, data.user.role); 
                    setUser(data.user);
                }
            }

            // Update Rider (Phone, Image, Location)
            const formData = new FormData();
            if (phone !== currentProfile?.phoneNumber) formData.append('phoneNumber', phone);
            if (image) formData.append('file', image); // 'file' matches multer
            if (location) {
                formData.append('latitude', location.lat.toString());
                formData.append('longitude', location.lng.toString());
            }

            let hasUpdates = false;
            for (let value of formData.values()) { hasUpdates = true; break; }

            if (hasUpdates) {
                await axios.put(`${riderService}/api/rider/profile`, formData, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            }

            toast.success("Profile updated successfully!");
            onProfileUpdated();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 select-none">
            <div className="bg-white w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="sticky top-0 z-10 bg-white flex justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg sm:text-xl font-black text-gray-900">Edit Rider Profile</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <img src={preview || "https://res.cloudinary.com/dcbynk200/image/upload/v1727786432/user_r1eebz.png"} alt="Profile" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-gray-50 shadow-md" />
                            <label className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md cursor-pointer border border-gray-100 hover:bg-gray-50 transition-colors">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">Full Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-gray-50/50" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-gray-50/50" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Location</label>
                        <div className="flex gap-2 mb-3">
                            <div className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 text-sm truncate flex items-center">
                                {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Location not set'}
                            </div>
                            <button type="button" onClick={fetchCurrentLocation} className="px-4 py-2.5 bg-green-50 text-green-600 rounded-xl font-medium hover:bg-green-100 transition-colors whitespace-nowrap">
                                Update GPS
                            </button>
                        </div>
                        {location ? (
                            <div className="h-48 w-full rounded-xl overflow-hidden border border-gray-200 relative z-0 group">
                                <MapContainer center={[location.lat, location.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                                    <Marker position={[location.lat, location.lng]} icon={riderIcon} />
                                    <MapUpdater location={location} />
                                    <MapEvents setLocation={setLocation} />
                                </MapContainer>
                                
                                <div className="absolute top-2 left-2 z-[400] bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 text-xs font-semibold text-gray-600 pointer-events-none">
                                    Tap map to adjust pin
                                </div>

                                <button type="button" onClick={(e) => { e.preventDefault(); fetchCurrentLocation(); }} className="absolute bottom-4 right-4 z-[400] bg-white p-3 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-gray-100 text-blue-600 hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                                </button>
                            </div>
                        ) : (
                            <div className="h-48 w-full rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                <span className="text-sm font-medium">Click "Update GPS" to show map</span>
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default EditRiderProfileModal;
