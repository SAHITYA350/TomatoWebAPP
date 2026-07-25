import { getToken } from "../utils/authStorage";
import { useState } from "react";
import type { IMenuItem } from "../types";
import { FiEyeOff, FiSearch } from "react-icons/fi";
import { BsCartPlus, BsEye } from "react-icons/bs";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import axios from "axios";
import { restaurantService } from "../config";
import { toast } from "react-hot-toast";
import { useAppData } from "../context/AppContext";


interface MenuItemsProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller: boolean;
}

const MenuItems = ({items, onItemDeleted, isSeller} : MenuItemsProps) => {
  const [loadingItemId, setLoadingItemId] =   useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleDelete = async (itemId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this item?");
    if (!confirm) return;

    try {
       await axios.delete(`${restaurantService}/api/item/${itemId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
       });
       toast.success("Item deleted successfully");
       onItemDeleted();
    } catch(error) {
      console.log(error);
     toast.error("Failed to delete item");
    }
  };


   const toggleAvailibility = async (itemId: string) => {

    try {
       const { data } = await axios.put(`${restaurantService}/api/item/status/${itemId}`, {}, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
       });

       toast.success(data.message);
       onItemDeleted();
    } catch(error) {
      console.log(error);
     toast.error("Failed to update status");
    }
  };

  const {fetchCart} = useAppData();
  const addToCart = async(restaurantId: string, itemId: string) => {
    try {
      setLoadingItemId(itemId);
      const { data } = await axios.post(`${restaurantService}/api/cart/add`, {
        restaurantId,
        itemId
      }, {
        headers: {
          Authorization: `Bearer ${getToken()}`, 
        }
      });
      toast.success(data.message);
      fetchCart();
     } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Something went wrong");
      } finally {
      setLoadingItemId(null);
     }
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col space-y-6">
      <div className="relative w-full sm:max-w-md mx-auto sm:mx-0">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <FiSearch className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-2xl border-0 py-3 pl-11 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6 transition-all bg-white/80 backdrop-blur-sm"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <p>No items found matching "{searchTerm}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((item) => {
            const isLoading = loadingItemId === item._id;

            return (
              <div 
                className={`relative flex gap-4 rounded-lg bg-white p-4 shadow-sm transition ${!item.isAvailable ? "opacity-70" : ""} `}
                 key={item._id}
               >
                <div className="relative shrink-0">
                    <img src={item.image} alt="" className={`h-20 w-20 rounded object-cover ${!item.isAvailable ? "grayscale brightness-75" : ""
                      }`} 
                    />
                    {
                      !item.isAvailable && (
                        <span className="absolute inset-0 flex items-center justify-center rounded bg-black/60 text-xs font-semibold text-white">
                          Not Available
                        </span>
                      )
                    }
                </div>

                <div className="flex flex-1 flex-col justify-between">
                 <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  {
                    item.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                    )
                  }
                 </div>
                 <div className="flex items-center justify-between">
                    <p className="font-medium">₹{item.price}</p>
                    {
                      isSeller && (
                         <div className="flex gap-2">
                          <button onClick={() => toggleAvailibility(item._id)} className="rounded-lg p-2 text-gray-600 cursor-pointer hover:bg-gray-100">{item.isAvailable ? <BsEye size={18}/> : <FiEyeOff size={18} /> }
                          </button>

                          <button onClick={() => handleDelete(item._id)} className="rounded-lg p-2 text-red-500 cursor-pointer hover:bg-red-50">
                            <BiTrash size={18} />
                          </button>
                         </div>
                      )}


                      {
                        !isSeller && (
                           <button disabled={!item.isAvailable || isLoading}
                           onClick={() => addToCart(item.restaurantId, item._id)}
                           className={`flex items-center cursor-pointer justify-center rounded-lg p-2 ${!item.isAvailable || isLoading ? "cursor-not-allowed text-gray-400" : "text-red-500 hover:bg-red-50"
                            }`}
                           >
                             {isLoading ? (
                              <VscLoading size={18} className="animate-spin" />
                             ) : (
                              <BsCartPlus size={18}
                                /> 
                              )}  
                           </button>
                         )
                        }
                 </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

export default MenuItems
