import React, { useState } from "react";
import axios from "axios";
import { reelsService, utilsService } from "../../config";
import { getToken } from "../../utils/authStorage";
import { FiX, FiUploadCloud, FiVideo } from "react-icons/fi";
import { toast } from "react-hot-toast";

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  onReelCreated?: () => void;
}

const CreateReelModal: React.FC<CreateReelModalProps> = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  onReelCreated,
}) => {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [foodName, setFoodName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Fast Food");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("video/")) {
        toast.error("Please upload a valid video file (.mp4, .webm).");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !foodName.trim() || !price || !videoFile) {
      toast.error("Title, food name, price & video file are required!");
      return;
    }

    const token = getToken("seller") || getToken("customer") || getToken();
    if (!token) {
      toast.error("Please log in to upload reels.");
      return;
    }

    try {
      setLoading(true);

      // 1. Convert video file to base64 Data URI for Utils Service Cloudinary upload
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(videoFile);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      const { data: uploadRes } = await axios.post(
        `${utilsService}/api/upload`,
        { buffer: base64Data },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const videoUrl = uploadRes.url || uploadRes.fileUrl;
      if (!videoUrl) {
        throw new Error("Failed to retrieve uploaded video URL.");
      }

      // 2. Create Reel record in Reels microservice
      await axios.post(
        `${reelsService}/api/reels/upload`,
        {
          restaurantId,
          restaurantName,
          title: title.trim(),
          caption: caption.trim(),
          foodName: foodName.trim(),
          price: Number(price),
          category,
          videoUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Food Reel published successfully!");
      onReelCreated?.();
      onClose();
      // Reset form
      setTitle("");
      setCaption("");
      setFoodName("");
      setPrice("");
      setVideoFile(null);
      setVideoPreview(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload reel.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#12121e] rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#181828]/50">
          <div className="flex items-center gap-2">
            <FiVideo className="text-red-500 h-5 w-5" />
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
              Upload Food Reel
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Video Selector Dropzone */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
              Select Video (.mp4 / .webm) *
            </label>
            {videoPreview ? (
              <div className="relative rounded-2xl overflow-hidden bg-black h-48 border border-gray-200">
                <video src={videoPreview} controls className="h-full w-full object-contain" />
                <button
                  type="button"
                  onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-black transition"
                >
                  <FiX size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-44 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition p-4 text-center">
                <FiUploadCloud className="h-10 w-10 text-red-500 mb-2" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Click to upload food video</span>
                <span className="text-[10px] text-gray-400 mt-1">Short clips (15-30 seconds) perform best</span>
                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reel Title *</label>
              <input
                type="text"
                placeholder="e.g. Sizzling Biryani Prep"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Dish Name *</label>
              <input
                type="text"
                placeholder="e.g. Chicken Biryani"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Price (₹) *</label>
              <input
                type="number"
                placeholder="195"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-red-500"
              >
                <option value="Fast Food">Fast Food</option>
                <option value="Biryani">Biryani</option>
                <option value="Street Food">Street Food</option>
                <option value="Desserts">Desserts</option>
                <option value="Beverages">Beverages</option>
                <option value="Tandoori">Tandoori</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Caption / Description</label>
            <textarea
              rows={2}
              placeholder="Describe what makes this dish special..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md hover:shadow-lg hover:from-red-600 hover:to-rose-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Publishing Reel...</span>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <FiUploadCloud size={16} />
                  <span>Publish Reel</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReelModal;
