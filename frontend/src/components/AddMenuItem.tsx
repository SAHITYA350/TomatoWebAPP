import { getToken } from "../utils/authStorage";
import { useState, useEffect } from "react";
import axios from "axios";
import { restaurantService } from "../config";
import { toast } from "react-hot-toast";
import { BiUpload } from "react-icons/bi";

const AddMenuItem = ({ onItemAdded }: { onItemAdded: () => void }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [image, setImage] = useState<File | null>(null);  
    const [loading, setLoading] = useState(false);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiInsights, setAiInsights] = useState("");
    const [isAiScanEnabled, setIsAiScanEnabled] = useState(false);
    
    const resetForm = () => {
        setName("");
        setDescription("");
        setPrice("");
        setImage(null);
        setAiInsights("");
    };

    useEffect(() => {
        const handlePrefill = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                const { name: pName, price: pPrice } = customEvent.detail;
                if (pName) setName(pName);
                if (pPrice) setPrice(String(pPrice));
                toast.success("✍️ Pre-filled dish name & price via Voice!");
            }
        };
        window.addEventListener("seller-prefill-item", handlePrefill);
        return () => window.removeEventListener("seller-prefill-item", handlePrefill);
    }, []);
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setImage(file);
        if (!file || !isAiScanEnabled) return;

        try {
            setAiAnalyzing(true);
            setAiInsights("AI is scanning dish image & matching regional Zomato/Swiggy pricing...");

            let chatHistory: any[] = [];
            const savedConvs = localStorage.getItem("tomato_conversations");
            const activeConvId = localStorage.getItem("tomato_current_conv_id");
            if (savedConvs && activeConvId) {
                try {
                    const convs = JSON.parse(savedConvs);
                    const activeConv = convs.find((c: any) => c.id === activeConvId);
                    if (activeConv && activeConv.messages) {
                        chatHistory = activeConv.messages.slice(-10).map((m: any) => ({
                            role: m.role,
                            content: m.content
                        }));
                    }
                } catch (e) {
                    console.error("Failed to parse conversations in AddMenuItem:", e);
                }
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("chatHistory", JSON.stringify(chatHistory));

            const { data } = await axios.post(`${restaurantService}/api/ai/analyze-dish`, formData, {
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            if (data.name) setName(data.name);
            if (data.description) setDescription(data.description);
            if (data.recommendedPrice) setPrice(String(data.recommendedPrice));
            if (data.competitorInsights) {
                setAiInsights(data.competitorInsights);
            } else {
                setAiInsights("Metadata optimized successfully!");
            }
            toast.success("✨ AI Auto-Filled dish details & pricing!");
        } catch (err) {
            console.error("AI dish analysis failed:", err);
            setAiInsights("AI scan failed. Please enter details manually.");
        } finally {
            setAiAnalyzing(false);
        }
    };

    const handleSubmit = async () => {
        if (!name || !price || !image) {
            alert("Name, Price and Image are required.");
            return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        formData.append("price", price);
        formData.append("file", image);

        try {
            setLoading(true);
            await axios.post(`${restaurantService}/api/item/new`, formData, {
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
            });
            toast.success("Item added successfully");
            resetForm();
            onItemAdded();
        } catch (error) {
            console.log(error);
            toast.error("Failed to add item"); 
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md space-y-4 m-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Add Menu Item</h2>
                <label className="flex items-center cursor-pointer gap-2">
                    <span className="text-xs font-medium text-gray-600">AI Auto-Fill</span>
                    <div className="relative">
                        <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={isAiScanEnabled} 
                            onChange={(e) => setIsAiScanEnabled(e.target.checked)} 
                            disabled={aiAnalyzing}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${isAiScanEnabled ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAiScanEnabled ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                </label>
            </div>
            
            <label className={`flex cursor-pointer items-center justify-center flex-col gap-2 rounded-xl border-2 border-dashed p-6 text-sm hover:bg-gray-50 border-gray-300 ${isAiScanEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
                <BiUpload className={`h-8 w-8 ${isAiScanEnabled ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                <span className={`font-semibold text-center ${!isAiScanEnabled && 'text-gray-500'}`}>{image ? image.name : "Upload Dish Image"}</span>
                {isAiScanEnabled && <span className="text-[10px] text-gray-400 text-center">AI automatically scans item & advises pricing!</span>}
                <input 
                    type="file" 
                    accept="image/*" 
                    hidden 
                    onChange={handleImageChange}
                    disabled={aiAnalyzing}
                />
            </label>

            {aiInsights && (
                <div className={`p-3.5 rounded-lg text-xs border ${
                    aiAnalyzing 
                        ? "bg-blue-50 border-blue-200 text-blue-800 animate-pulse" 
                        : "bg-green-50 border-green-200 text-green-800"
                }`}>
                    <span className="font-bold">✨ AI Pricing Advisor:</span>
                    <p className="mt-1 leading-normal">{aiInsights}</p>
                </div>
            )}

            <input 
                type="text" 
                placeholder="Item name.." 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                disabled={aiAnalyzing}
                className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-red-500" 
            />

            <textarea 
                placeholder="Item description.." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                disabled={aiAnalyzing}
                className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-red-500" 
            />

            <input 
                type="number" 
                placeholder="Price ₹" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                disabled={aiAnalyzing}
                className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-red-500" 
            />

            <button 
                onClick={handleSubmit} 
                disabled={loading || aiAnalyzing} 
                className="w-full rounded-lg py-3 text-sm transition font-semibold text-white bg-[#e23744] hover:bg-[#d32f3a] disabled:opacity-50 cursor-pointer"
            >
                {loading ? "Adding Item..." : "Add Item"}
            </button>
        </div>
    );
};

export default AddMenuItem;