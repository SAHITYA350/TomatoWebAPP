import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { reelsService } from "../config";
import { getToken } from "../utils/authStorage";
import ReelCard, { type ReelData } from "../components/reels/ReelCard";
import { FiArrowLeft, FiFilm, FiGrid, FiBookmark } from "react-icons/fi";
import { toast } from "react-hot-toast";

interface FoodReelsProps {
  restaurantId?: string;
  restaurantName?: string;
}

const CATEGORIES = ["All", "Saved", "Fast Food", "Biryani", "Street Food", "Tandoori", "Desserts"];

const FoodReels: React.FC<FoodReelsProps> = ({ restaurantId: propRestaurantId, restaurantName: propRestaurantName }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const restaurantId = propRestaurantId || searchParams.get("restaurantId") || undefined;
  const initialCategory = searchParams.get("category") || "All";

  const [reels, setReels] = useState<ReelData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [category, setCategory] = useState(initialCategory);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialReels();
  }, [restaurantId, category]);

  const fetchInitialReels = async () => {
    try {
      setLoading(true);
      const token = getToken("customer") || getToken();

      if (category === "Saved") {
        const savedIds: string[] = JSON.parse(localStorage.getItem("saved_reels") || "[]");
        const { data } = await axios.get(`${reelsService}/api/reels`, {
          params: { limit: 20 },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const savedList = (data.reels || []).filter((r: ReelData) => savedIds.includes(r._id));
        setReels(savedList);
        setHasNextPage(false);
        setNextCursor(null);
        setActiveIndex(0);
        return;
      }

      const params: any = { limit: 8 };
      if (restaurantId) params.restaurantId = restaurantId;
      if (category && category !== "All") params.category = category;

      const { data } = await axios.get(`${reelsService}/api/reels`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setReels(data.reels || []);
      setNextCursor(data.nextCursor || null);
      setHasNextPage(data.hasNextPage || false);
      setActiveIndex(0);
    } catch (err) {
      console.error("Failed to fetch food reels:", err);
      toast.error("Failed to load food reels.");
    } finally {
      setLoading(false);
    }
  };

  const fetchNextPage = async () => {
    if (!nextCursor || !hasNextPage || loadingMore) return;

    try {
      setLoadingMore(true);
      const token = getToken("customer") || getToken();
      const params: any = { cursor: nextCursor, limit: 8 };
      if (restaurantId) params.restaurantId = restaurantId;
      if (category && category !== "All") params.category = category;

      const { data } = await axios.get(`${reelsService}/api/reels`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (data.reels && data.reels.length > 0) {
        setReels(prev => [...prev, ...data.reels]);
        setNextCursor(data.nextCursor || null);
        setHasNextPage(data.hasNextPage || false);
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      console.error("Failed to fetch next reels page:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Scroll listener to update activeIndex & trigger cursor pagination
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const index = Math.round(target.scrollTop / target.clientHeight);
    if (index !== activeIndex && index >= 0 && index < reels.length) {
      setActiveIndex(index);
    }

    // Trigger cursor pagination when 2 items away from end
    if (index >= reels.length - 2 && hasNextPage && !loadingMore) {
      fetchNextPage();
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden font-sans">
      
      {/* Top Floating Control Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          
          {/* Back / Brand Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 transition shadow-md"
            >
              <FiArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2 text-white">
              <FiFilm className="h-6 w-6 text-red-500" />
              <div>
                <h1 className="text-sm font-black tracking-tight leading-tight">
                  {propRestaurantName ? `${propRestaurantName} Reels` : restaurantId ? "Restaurant Food Reels" : "Tomato Food Reels"}
                </h1>
                <p className="text-[10px] text-gray-300 font-medium">Watch & Order Sizzling Dishes</p>
              </div>
            </div>
          </div>

          {/* Restaurant Filter Active Tag */}
          {restaurantId && (
            <span className="px-3 py-1 rounded-full bg-red-600/80 backdrop-blur-md text-white text-[10px] font-extrabold uppercase border border-red-400">
              Filtered Store
            </span>
          )}
        </div>

        {/* Categories Bar (Only on global feed) */}
        {!restaurantId && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pointer-events-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition shadow-sm flex items-center gap-1 cursor-pointer ${
                  category === cat
                    ? "bg-white text-gray-900 font-extrabold shadow-md"
                    : "bg-black/40 text-white/90 backdrop-blur-md border border-white/10 hover:bg-black/60"
                }`}
              >
                {cat === "Saved" && <FiBookmark className={category === "Saved" ? "text-amber-500 fill-amber-500" : "text-amber-400"} />}
                <span>{cat}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Snap-Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-[100dvh] overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-white gap-3">
            <div className="h-10 w-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold tracking-wide">Loading Food Reels...</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white text-center p-6 space-y-3">
            <FiFilm className="h-12 w-12 text-gray-500 mb-1" />
            <h3 className="text-lg font-bold">No Food Reels Available</h3>
            <p className="text-xs text-gray-400 max-w-xs">
              {restaurantId
                ? "This restaurant hasn't uploaded any food reels yet. Check back soon!"
                : "No food reels found in this category."}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition"
            >
              Explore Restaurants
            </button>
          </div>
        ) : (
          reels.map((reel, idx) => (
            <ReelCard
              key={reel._id}
              reel={reel}
              isActive={idx === activeIndex}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FoodReels;
