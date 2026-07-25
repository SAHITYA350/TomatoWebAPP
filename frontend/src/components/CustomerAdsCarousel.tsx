import { useState, useEffect } from "react";
import axios from "axios";
import { restaurantService } from "../config";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";
import { useNavigate } from "react-router-dom";

interface Ad {
  id: string;
  restaurantId?: string;
  title: string;
  subtitle: string;
  image: string;
  bgColor: string;
}

const CustomerAdsCarousel = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const { data } = await axios.get(`${restaurantService}/api/campaign/ads`);
        if (data && data.ads) {
          setAds(data.ads);
        }
      } catch (err) {
        console.error("Failed to fetch ads", err);
      }
    };
    fetchAds();
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (ads.length <= 1) return;
    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 4000);
    return () => clearInterval(intervalId);
  }, [ads.length]);

  const prevAd = () => {
    setCurrentIndex((prev) => (prev === 0 ? ads.length - 1 : prev - 1));
  };

  const nextAd = () => {
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  if (ads.length === 0) return null;

  const currentAd = ads[currentIndex];

  const handleAdClick = (ad: Ad) => {
    if (ad.restaurantId) {
      navigate(`/restaurant/${ad.restaurantId}`);
    }
  };

  return (
    <>
      {/* Mobile Marquee Layout (Horizontal Scroll) */}
      <div className="md:hidden flex gap-4 overflow-x-auto pb-4 mb-4 scrollbar-hide snap-x">
        {ads.map((ad) => (
          <div 
            key={ad.id} 
            onClick={() => handleAdClick(ad)}
            style={{ background: ad.bgColor.includes("linear-gradient") ? ad.bgColor : undefined }}
            className={`relative w-[85vw] sm:w-[320px] h-36 rounded-xl overflow-hidden shadow-sm shrink-0 snap-center p-4 flex justify-between items-center cursor-pointer ${!ad.bgColor.includes("linear-gradient") ? `bg-gradient-to-r ${ad.bgColor}` : ""}`}
          >
            <div className="text-white max-w-[55%] z-10">
              <h3 className="text-base sm:text-lg font-black leading-tight drop-shadow-md">{ad.title}</h3>
              <p className="text-[10px] sm:text-xs font-medium text-white/90 mt-1.5 line-clamp-2 leading-snug">{ad.subtitle}</p>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/20 shadow-lg z-10 shrink-0">
              <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Hero Slider */}
      <div className="hidden md:block relative w-full h-64 rounded-2xl overflow-hidden shadow-sm mb-8 group cursor-pointer" onClick={() => handleAdClick(currentAd)}>
        <div 
          style={{ background: currentAd.bgColor.includes("linear-gradient") ? currentAd.bgColor : undefined }}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${!currentAd.bgColor.includes("linear-gradient") ? `bg-gradient-to-r ${currentAd.bgColor}` : ""}`}
        />
        
        <div className="absolute inset-0 flex items-center justify-between px-12">
          <div className="flex-1 max-w-lg z-10 text-white">
            <h2 className="text-4xl font-black mb-2 animate-fade-in-up leading-tight drop-shadow-md">
              {currentAd.title}
            </h2>
            <p className="text-lg font-medium text-white/90 animate-fade-in-up animation-delay-200">
              {currentAd.subtitle}
            </p>
            <button className="mt-4 px-6 py-2 bg-white text-gray-900 font-bold rounded-full text-sm hover:scale-105 transition-transform shadow-lg cursor-pointer">
              Order Now
            </button>
          </div>
          
          <div className="w-56 h-56 relative z-10 animate-fade-in">
            <img 
              src={currentAd.image} 
              alt={currentAd.title}
              className="w-full h-full object-cover rounded-full border-4 border-white/20 shadow-2xl"
            />
          </div>
        </div>

        {ads.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); prevAd(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
            >
              <BiChevronLeft size={24} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); nextAd(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
            >
              <BiChevronRight size={24} />
            </button>
            
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {ads.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                  className={`h-2 rounded-full transition-all ${idx === currentIndex ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CustomerAdsCarousel;
