import { useState } from "react";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authService } from "../config";
import { getToken, setToken } from "../utils/authStorage";

type Role = "customer" | "rider" | "seller" | "admin" | null;
const SelectRole = () => {

  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(false);
  const {setUser, setIsAuth} = useAppData();
  const navigate = useNavigate();
  const roles: Role[] = ["customer", "rider", "seller", "admin"];
  const addRole = async () => {
    if (!role || loading) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${authService}/api/auth/role`, 
        {role}, {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        });
        if (data.user && data.user.role) {
          setToken(data.token, data.user.role);
        }
        setUser(data.user);
        setIsAuth(true);
        navigate("/", {replace: true});

    } catch (error) {
      alert(`Error adding role`);
      console.error("Error adding role:", error);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-6">
     <h1 className="text-center text-2xl font-bold">
      Choose your role
     </h1>
     <div className="space-y-4">
      {
        roles.map((r) => (
          <button key={r} onClick={() => setRole(r)} className={`w-full rounded-xl cursor-grab border px-4 py-3 text-sm font-medium capitalize transition ${
            role === r ? "border-[#E23774] bg-[#E23744] text-white":"border-gray-300 text-gray-700 hover:bg-gray-50"
             }`
          }>
            Continue as {r}
          </button>
        ))
      }

     </div> 

      <button disabled={!role || loading} onClick={addRole} className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
        role && !loading ? "border-[#E23744] bg-[#E23744] text-white hover:bg-[#d32f3a] hover:cursor-pointer" : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}>
        {loading ? "Saving..." : "Next"}
      </button>

      </div>
    </div>
  )
}

export default SelectRole
