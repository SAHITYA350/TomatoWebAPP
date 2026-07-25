import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../config";
import { toast } from "react-hot-toast";
import { useGoogleLogin } from '@react-oauth/google';
import type { CodeResponse } from '@react-oauth/google';
import { FcGoogle } from "react-icons/fc";
import { useAppData } from "../context/AppContext";
import { setToken, setTokenBeforeRole } from "../utils/authStorage";
import Antigravity from "../components/Antigravity";

const Login = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { setIsAuth, setUser, setShowPreloader } = useAppData();
    
    const responseGoogle = async(authResult: CodeResponse) => {
        setLoading(true);
        try{
            const result = await axios.post(`${authService}/api/auth/login`, {
                code: authResult.code,
            });

            const { token, user } = result.data;
            if (user && user.role) {
                setToken(token, user.role);
            } else {
                setTokenBeforeRole(token);
            }
            setUser(user);
            setIsAuth(true);
            setShowPreloader(true); // Trigger preloader animation
            toast.success(result.data.message);
            setLoading(false);
            navigate("/");
        } catch (error: any) {
            console.error("Error logging in with Google:", error);
            if (error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
                toast.error("Auth service is not reachable. Please make sure the server is running.");
            } else {
                const msg = error?.response?.data?.message || "Failed to log in with Google. Please try again.";
                toast.error(msg);
            }
            setLoading(false);
        }
    }

    const handleGoogleError = () => {
        toast.error("Failed to log in with Google. Please try again.");
        setLoading(false);
    }

    const googleLogin = useGoogleLogin({
      onSuccess: responseGoogle,
      onError: handleGoogleError,
      onNonOAuthError: (err) => {
          // Suppress noisy COOP window.closed warnings — known Google OAuth popup issue
          if (String(err?.type || err).includes("popup_closed") || String(err).includes("popup")) {
              console.warn("Google login popup closed by user");
          }
          setLoading(false);
      },
      flow: 'auth-code',
    })

    const handleLoginClick = () => {
        // Do not set loading to true here, wait for responseGoogle to fire!
        // This prevents the button getting stuck if the popup is blocked or closed.
        googleLogin();
    };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gray-50 overflow-hidden">
      {/* 3D Antigravity Background */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <Antigravity color="#E23744" count={250} particleSize={2.5} />
      </div>

      {/* Premium Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-md px-8 py-10 mx-4 bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_20px_40px_-15px_rgba(226,55,68,0.2)] rounded-[2rem] transition-all duration-300">
        <div className="flex flex-col items-center space-y-8">
          
          <div className="flex items-center gap-2">
            <span className="text-4xl sm:text-5xl drop-shadow-md">🍅</span>
            <h1 className="text-center text-4xl sm:text-5xl font-black tracking-tight text-[#E23744] drop-shadow-sm">
              Tomato
            </h1>
          </div>

          <div className="space-y-6 w-full">
            <p className="text-center text-sm font-medium text-gray-600 bg-white/50 py-2 px-4 rounded-full inline-block w-full">
              Log-in or Sign-up to continue
            </p>
            
            <button 
              onClick={handleLoginClick} 
              disabled={loading} 
              className="group flex hover:cursor-pointer w-full items-center justify-center gap-3 rounded-2xl border-2 border-transparent bg-white shadow-md hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300 px-4 py-4"
            >
              <FcGoogle size={24} className="group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold text-gray-700 text-base">
                {loading ? "Signing in..." : "Continue with Google"}
              </span>
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 max-w-[280px]">
            By continuing, you agree to our {" "} 
            <span className="text-[#E23744] font-semibold hover:underline cursor-pointer transition-all">Terms of Service</span> 
            {" "} & {" "} 
            <span className="text-[#E23744] font-semibold hover:underline cursor-pointer transition-all">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
