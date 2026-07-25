import React, { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { reelsService, restaurantService } from "../../config";
import { getToken } from "../../utils/authStorage";
import { useAppData } from "../../context/AppContext";
import { useSocket } from "../../context/SocketContext";
import CommentsModal from "./CommentsModal";
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiShoppingCart,
  FiVolume2,
  FiVolumeX,
  FiPlay,
  FiBookmark,
  FiShoppingBag,
} from "react-icons/fi";
import { toast } from "react-hot-toast";

export interface ReelData {
  _id: string;
  restaurantId: string;
  restaurantName: string;
  uploadedBy: string;
  title: string;
  caption?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  foodName: string;
  price: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  category?: string;
  hashtags?: string[];
  isLikedByMe?: boolean;
}

interface ReelCardProps {
  reel: ReelData;
  isActive: boolean;
}

interface BurstHeart {
  id: number;
  x: number;
  y: number;
  scale: number;
  emoji: string;
  rot: number;
}

const EMOJI_BURST_POOL = ["❤️", "💖", "🔥", "✨", "💕"];

const ReelCard: React.FC<ReelCardProps> = ({ reel, isActive }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(reel.isLikedByMe || false);
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(reel.commentsCount || 0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [bursts, setBursts] = useState<BurstHeart[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("saved_reels");
      const list: string[] = saved ? JSON.parse(saved) : [];
      return list.includes(reel._id);
    } catch {
      return false;
    }
  });
  const [addingToCart, setAddingToCart] = useState(false);

  const toggleBookmark = () => {
    try {
      const saved = localStorage.getItem("saved_reels");
      let list: string[] = saved ? JSON.parse(saved) : [];
      const nextState = !isBookmarked;
      if (nextState) {
        if (!list.includes(reel._id)) list.push(reel._id);
      } else {
        list = list.filter(id => id !== reel._id);
      }
      localStorage.setItem("saved_reels", JSON.stringify(list));
      setIsBookmarked(nextState);
      toast.success(nextState ? "Saved reel to your favorites! 🔖" : "Removed reel from saved");
    } catch {
      toast.error("Failed to save reel.");
    }
  };

  const { fetchCart } = useAppData();

  // Socket.IO Realtime Sync
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !reel?._id) return;

    socket.emit("join:room", `reel:${reel._id}`);

    const handleLikeUpdate = (data: { reelId: string; likesCount: number }) => {
      if (data.reelId === reel._id) {
        setLikesCount(data.likesCount);
      }
    };

    const handleCommentAdded = (data: { reelId: string; commentsCount: number }) => {
      if (data.reelId === reel._id) {
        setCommentsCount(data.commentsCount);
      }
    };

    socket.on("reel:like_updated", handleLikeUpdate);
    socket.on("reel:comment_added", handleCommentAdded);

    return () => {
      socket.off("reel:like_updated", handleLikeUpdate);
      socket.off("reel:comment_added", handleCommentAdded);
    };
  }, [socket, reel._id]);

  // Handle Video Auto Play / Pause & Sound state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
      // Analytics view
      const token = getToken("customer") || getToken();
      axios.post(
        `${reelsService}/api/reels/${reel._id}/view`,
        { watchSeconds: 5, completed: false },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      ).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, reel._id]);

  // Sync mute state to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const toggleSound = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
    toast(nextMuted ? "Muted 🔇" : "Sound Enabled 🔊", {
      icon: nextMuted ? "🔇" : "🔊",
      duration: 1500,
      style: { background: "#18181b", color: "#fff", borderRadius: "12px", fontSize: "12px" }
    });
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    // Unmute on tap if currently muted
    if (isMuted) {
      setIsMuted(false);
      video.muted = false;
    }

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const triggerBurstShower = () => {
    const newBursts: BurstHeart[] = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      x: (Math.random() - 0.5) * 260,
      y: (Math.random() - 0.5) * 140,
      scale: 0.7 + Math.random() * 0.9,
      emoji: EMOJI_BURST_POOL[Math.floor(Math.random() * EMOJI_BURST_POOL.length)],
      rot: (Math.random() - 0.5) * 60,
    }));
    setBursts(prev => [...prev, ...newBursts]);
    setTimeout(() => {
      setBursts(prev => prev.filter(b => !newBursts.includes(b)));
    }, 1100);
  };

  const toggleLike = async () => {
    const token = getToken("customer") || getToken("seller") || getToken();
    if (!token) {
      toast.error("Please log in to like reels.");
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount(prev => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    if (nextLiked) {
      setShowHeartAnim(true);
      triggerBurstShower();
      setTimeout(() => setShowHeartAnim(false), 900);
    }

    try {
      await axios.post(
        `${reelsService}/api/reels/${reel._id}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      setIsLiked(!nextLiked);
      setLikesCount(prev => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      toggleLike();
    } else {
      setShowHeartAnim(true);
      triggerBurstShower();
      setTimeout(() => setShowHeartAnim(false), 900);
    }
  };

  const handleAddToCart = async () => {
    const token = getToken("customer") || getToken();
    if (!token) {
      toast.error("Please log in to add items to your cart.");
      return;
    }

    try {
      setAddingToCart(true);

      // Check if foodName exists in the restaurant's menu items
      const { data: menuItems } = await axios.get(
        `${restaurantService}/api/item/all/${reel.restaurantId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const matchingItem = Array.isArray(menuItems)
        ? menuItems.find(
            (m: any) =>
              m.name.trim().toLowerCase() === reel.foodName.trim().toLowerCase() &&
              m.isAvailable !== false
          )
        : null;

      if (!matchingItem) {
        toast.error(`Item "${reel.foodName}" is currently not available in this restaurant.`, {
          duration: 3500,
          style: { background: "#18181b", color: "#fff", border: "1px solid #ef4444" }
        });
        return;
      }

      // Exact match found! Add to cart
      await axios.post(
        `${restaurantService}/api/cart/add`,
        {
          restaurantId: reel.restaurantId,
          itemId: matchingItem._id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchCart();
      toast.success(`🛒 "${matchingItem.name}" added to cart! Redirecting...`, { duration: 1500 });
      setTimeout(() => {
        navigate("/cart");
      }, 500);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add dish to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/reels?id=${reel._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.title,
          text: `Check out ${reel.foodName} from ${reel.restaurantName} on Zomato Clone!`,
          url: shareUrl,
        });
      } catch (e) {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Reel link copied to clipboard! 📋");
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black snap-start snap-always flex items-center justify-center overflow-hidden select-none">
      
      {/* Centered 9:16 Shorts Frame Container for All Screen Ratios */}
      <div className="relative w-full max-w-[480px] h-full bg-black flex items-center justify-center overflow-hidden border-x border-white/10 shadow-2xl">

        {/* Background Video Player */}
        {hasVideoError ? (
          <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center text-gray-400 space-y-3 bg-gray-950">
            <FiShoppingBag className="w-12 h-12 text-red-500 opacity-60" />
            <p className="text-sm font-bold text-white">Video Removed or Unavailable</p>
            <p className="text-xs text-gray-400 max-w-xs">This Cloudinary video asset was explicitly deleted from media storage.</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={reel.videoUrl}
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover cursor-pointer"
            onClick={togglePlay}
            onDoubleClick={handleDoubleTap}
            onError={() => setHasVideoError(true)}
          />
        )}

        {/* Play/Pause Overlay Indicator */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer pointer-events-auto z-10"
          >
            <div className="h-16 w-16 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center text-2xl shadow-xl border border-white/20">
              <FiPlay className="ml-1" />
            </div>
          </div>
        )}

        {/* Floating Multi-Heart & Emoji Particle Shower on Double Tap / Like */}
        {bursts.map((b) => (
          <div
            key={b.id}
            className="absolute pointer-events-none z-30 transition-all duration-1000 ease-out animate-bounce"
            style={{
              transform: `translate(${b.x}px, ${b.y - 120}px) scale(${b.scale}) rotate(${b.rot}deg)`,
              opacity: 0,
              transition: "all 1s ease-out",
            }}
          >
            <span className="text-4xl sm:text-5xl drop-shadow-[0_10px_20px_rgba(239,68,68,0.8)]">
              {b.emoji}
            </span>
          </div>
        ))}

        {/* Instagram-style Big Heart Pulse on Double Tap */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 overflow-hidden">
            <div className="relative flex items-center justify-center">
              <FiHeart className="w-24 h-24 sm:w-28 sm:h-28 text-[#E23744] fill-[#E23744] animate-ping drop-shadow-[0_10px_35px_rgba(226,55,68,0.9)] transition-transform duration-300" />
            </div>
          </div>
        )}

        {/* Sound Toggle Badge & Equalizer */}
        <button
          onClick={toggleSound}
          className="absolute top-6 right-6 z-20 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center gap-2 text-xs font-bold shadow-lg hover:bg-black/70 transition cursor-pointer"
        >
          {!isMuted ? (
            <>
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-[#E23744] animate-[bounce_0.6s_infinite_100ms] h-3"></span>
                <span className="w-0.5 bg-red-400 animate-[bounce_0.6s_infinite_300ms] h-2"></span>
                <span className="w-0.5 bg-[#E23744] animate-[bounce_0.6s_infinite_200ms] h-3.5"></span>
              </div>
              <FiVolume2 size={15} className="text-[#E23744]" />
              <span>Sound On</span>
            </>
          ) : (
            <>
              <FiVolumeX size={15} className="text-red-400" />
              <span>Tap for Sound</span>
            </>
          )}
        </button>

        {/* Right-side Floating Action Buttons Overlay */}
        <div className="absolute right-3 sm:right-4 bottom-14 sm:bottom-20 z-20 flex flex-col items-center gap-3 sm:gap-5">
          
          {/* Like Button */}
          <button
            onClick={toggleLike}
            className="group flex flex-col items-center gap-1 text-white cursor-pointer"
          >
            <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-xl sm:text-2xl transition duration-200 ${
              isLiked 
                ? "bg-[#E23744] text-white shadow-lg scale-110" 
                : "bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70"
            }`}>
              <FiHeart className={isLiked ? "fill-white text-white" : "text-white"} />
            </div>
            <span className="text-[10px] sm:text-xs font-bold font-mono drop-shadow">{likesCount}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => setIsCommentsOpen(true)}
            className="group flex flex-col items-center gap-1 text-white cursor-pointer"
          >
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-xl sm:text-2xl shadow-lg hover:bg-black/70 transition">
              <FiMessageCircle />
            </div>
            <span className="text-[10px] sm:text-xs font-bold font-mono drop-shadow">{commentsCount}</span>
          </button>

          {/* Bookmark / Save Button */}
          <button
            onClick={toggleBookmark}
            className="group flex flex-col items-center gap-1 text-white cursor-pointer"
          >
            <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-xl sm:text-2xl transition duration-200 ${
              isBookmarked 
                ? "bg-amber-500 text-white shadow-lg scale-110" 
                : "bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70"
            }`}>
              <FiBookmark className={isBookmarked ? "fill-white text-white" : "text-white"} />
            </div>
            <span className="text-[10px] sm:text-xs font-bold drop-shadow">Save</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="group flex flex-col items-center gap-1 text-white cursor-pointer"
          >
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-xl sm:text-2xl shadow-lg hover:bg-black/70 transition">
              <FiShare2 />
            </div>
            <span className="text-[10px] sm:text-xs font-bold drop-shadow">Share</span>
          </button>
        </div>

        {/* Clean Floating Bottom Info Overlay - Fully Transparent so Full Reel Video is Visible */}
        <div className="absolute bottom-3 left-3 right-16 sm:right-20 z-20 space-y-2 text-white pointer-events-none">
          
          {/* Restaurant Pill Badge */}
          <Link
            to={`/restaurant/${reel.restaurantId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[11px] sm:text-xs font-extrabold hover:bg-black/70 transition shadow-lg pointer-events-auto"
          >
            <FiShoppingBag className="text-red-400 text-xs sm:text-sm" />
            <span className="truncate max-w-[130px] sm:max-w-[180px]">{reel.restaurantName}</span>
            <span className="text-[9px] sm:text-[10px] text-white bg-[#E23744] px-1.5 py-0.5 rounded-full font-bold">Visit Store</span>
          </Link>

          {/* Title & Caption */}
          <div className="pointer-events-auto">
            <h2 className="text-sm sm:text-base font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-snug">
              {reel.title}
            </h2>
            {reel.caption && (
              <p className="text-[11px] text-gray-200 mt-0.5 line-clamp-2 leading-relaxed font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {reel.caption}
              </p>
            )}
          </div>

          {/* Minimal Floating Dish CTA Bar */}
          <div className="flex items-center justify-between bg-black/40 backdrop-blur-md rounded-xl p-2 border border-white/20 max-w-sm pointer-events-auto shadow-lg">
            <div>
              <div className="text-[9px] uppercase font-extrabold text-gray-300 tracking-wider drop-shadow">Featured Dish</div>
              <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 drop-shadow">
                <span className="truncate max-w-[110px] sm:max-w-[150px]">{reel.foodName}</span>
                <span className="text-emerald-400 font-mono">₹{reel.price}</span>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#E23744] hover:bg-red-600 text-white font-extrabold text-xs shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              <FiShoppingCart size={14} />
              <span>{addingToCart ? "Adding..." : "Order Now"}</span>
            </button>
          </div>
        </div>

        {/* Comments Bottom Drawer Modal */}
        <CommentsModal
          isOpen={isCommentsOpen}
          onClose={() => setIsCommentsOpen(false)}
          reelId={reel._id}
          commentsCount={commentsCount}
          onCommentAdded={() => setCommentsCount(prev => prev + 1)}
        />
      </div>
    </div>
  );
};

export default ReelCard;
