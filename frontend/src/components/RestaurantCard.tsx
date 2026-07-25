import { useNavigate } from "react-router-dom";

type props = {
  id: string;
  image: string;
  name: string;
  distance: string;
  isOpen: boolean;
  description?: string;
}

const RestaurantCard = ({ id, image, name, distance, isOpen, description } : props ) => {
 
  const navigate = useNavigate();
 
  return (
    <div className={`cursor-pointer overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md ${!isOpen?"opacity-80":""}`} onClick={() => navigate(`/restaurant/${id}`)}>
     
     <div className="relative h-40 w-full overflow-hidden">
       <img src={image} alt="" className={`h-full w-full object-cover transition duration-300 hover:scale-105 
        ${!isOpen ? "grayscale" : ""}
        `} 
      />

       {!isOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
         <span className="rounded-md bg-black/80 px-3 py-1 font-semibold text-sm text-white">
          Closed
         </span>
        </div>
       )}
     </div>

     <div className="p-3 space-y-1">
       <div className="flex justify-between items-start gap-1">
         <h3 className="truncate text-base font-semibold text-gray-800 flex-1 animate-fadeIn" title={name}>
           {name}
         </h3>
         <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0 ${isOpen ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
           {isOpen ? "OPEN" : "CLOSED"}
         </span>
       </div>
       
       {description && (
         <p className="text-xs text-gray-500 truncate" title={description}>
           {description}
         </p>
       )}
       
       <div className="pt-1 flex items-center text-xs text-gray-400 font-medium">
         <span>{distance} KM away</span>
       </div>
     </div>

    </div>
  )
}

export default RestaurantCard
