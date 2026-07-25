import { useState, useEffect } from "react";
import axios from "axios";
import { restaurantService } from "../config";
import { FaStar } from "react-icons/fa";
import { MdTrendingUp } from "react-icons/md";
import { useNavigate } from "react-router-dom";

interface RecommendedItem {
  _id: string;
  name: string;
  price: number;
  image: string;
  restaurantId: string;
  restaurantName: string;
  rating: number;
  feedbackAnalysis: string;
}

const RecommendedItems = () => {
  const [items, setItems] = useState<RecommendedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data } = await axios.get(`${restaurantService}/api/campaign/recommended-items`);
        if (data && data.items) {
          setItems(data.items);
        }
      } catch (err) {
        console.error("Failed to fetch recommended items", err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Inspiration for your first order</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-2 min-w-[200px] bg-gray-50 rounded-xl p-3 animate-pulse">
              <div className="w-full h-28 bg-gray-200 rounded-lg"></div>
              <div className="w-3/4 h-4 bg-gray-200 rounded mt-2"></div>
              <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Inspiration for your first order</h2>
      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
        {items.map((item) => (
          <div 
            key={item._id} 
            onClick={() => navigate(`/restaurant/${item.restaurantId}`)}
            className="flex flex-col min-w-[220px] max-w-[220px] cursor-pointer group snap-start shrink-0 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow relative"
          >
            {/* Image & Price */}
            <div className="w-full h-32 rounded-xl overflow-hidden relative mb-3 bg-gray-100">
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-sm font-bold text-gray-900 shadow-sm">
                ₹{item.price}
              </div>
            </div>
            
            {/* Details */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-1 group-hover:text-[#E23744] transition-colors">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-1 bg-green-700 text-white px-1.5 py-0.5 rounded text-xs font-bold shrink-0">
                    {item.rating} <FaStar size={10} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">From {item.restaurantName}</p>
              </div>

              {/* Feedback Analysis Badge */}
              <div className="mt-3 flex items-start gap-1.5 bg-blue-50 text-blue-700 p-2 rounded-lg text-xs font-medium border border-blue-100">
                <MdTrendingUp size={16} className="shrink-0 mt-0.5 text-blue-600" />
                <span className="line-clamp-2 leading-tight">{item.feedbackAnalysis}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedItems;
