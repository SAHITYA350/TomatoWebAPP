import { useEffect } from "react";
import ImageTrail from "./ImageTrail";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const foodImages = [
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop", // Burger
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000&auto=format&fit=crop", // Pizza
  "https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1000&auto=format&fit=crop", // Desserts
  "https://images.unsplash.com/photo-1562376552-0d160a2f238d?q=80&w=1000&auto=format&fit=crop", // Waffles
  "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1000&auto=format&fit=crop", // Pasta
  "https://images.unsplash.com/photo-1589302168068-964664d93cb0?q=80&w=1000&auto=format&fit=crop", // Biryani
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1000&auto=format&fit=crop", // Salad
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop", // BBQ
];

export const Preloader = ({
  className,
  onComplete
}: { className?: string; onComplete?: () => void }) => {

  useEffect(() => {
    // Run the preloader for exactly 20 seconds
    const finishTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 20000);

    return () => clearTimeout(finishTimer);
  }, []); // Empty dependency array ensures it doesn't restart!

  return (
    <div 
      className={cn(
        "flex items-center justify-center min-h-screen w-full overflow-hidden",
        "bg-white dark:bg-[#050505]", 
        className
      )}
    >
      {/* Title Graphic / Text in the middle */}
      <div className="absolute z-10 text-center pointer-events-none">
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-[#E23744] drop-shadow-xl">
          TOMATO
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest mt-2">
          Preparing your kitchen...
        </p>
      </div>

      {/* Auto-Animated Image Trail */}
      <div className="absolute inset-0">
        <ImageTrail items={foodImages} variant={6} />
      </div>
    </div>
  );
};

export default Preloader;
