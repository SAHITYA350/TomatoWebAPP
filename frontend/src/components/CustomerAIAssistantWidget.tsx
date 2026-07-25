import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { getToken } from "../utils/authStorage";
import { restaurantService } from "../config";
import axios from "axios";
import { FiSend, FiX, FiRefreshCcw, FiShoppingCart } from "react-icons/fi";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    comboData?: ComboData | null;
    cartAction?: CartAction | null;
}

interface ComboItem {
    itemId: string;
    restaurantId: string;
    name: string;
    price: number;
}

interface ComboData {
    title: string;
    description: string;
    totalPrice: number;
    items: ComboItem[];
}

interface CartAction {
    action: "added";
    itemId: string;
    restaurantId: string;
    itemName: string;
    quantity: number;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const WIDGET_STYLES = `
@keyframes slide-in-desktop { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slide-in-mobile  { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0);   opacity: 1; } }
@keyframes dot-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-6px); opacity: 1; } }
@keyframes cart-pop { 0% { transform: scale(1); } 50% { transform: scale(1.35) rotate(-12deg); } 100% { transform: scale(1); } }
.ai-dot { animation: dot-bounce 1.2s infinite; }
.ai-dot:nth-child(2) { animation-delay: 0.2s; }
.ai-dot:nth-child(3) { animation-delay: 0.4s; }
.cart-pop { animation: cart-pop 0.45s ease; }
.markdown-body ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
.markdown-body ol { list-style-type: decimal; padding-left: 1.5rem; }
.markdown-body p  { margin-bottom: 0.4rem; }
.markdown-body strong { color: #E23744; font-weight: 700; }
.markdown-body em { color: #6b7280; font-style: italic; }
.markdown-body table { width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid rgba(226,55,68,0.15); border-radius: 8px; overflow: hidden; display: block; overflow-x: auto; }
.markdown-body th { background-color: #E23744; color: white; padding: 6px 10px; font-weight: 700; text-align: left; font-size: 12px; white-space: nowrap; }
.markdown-body td { padding: 6px 10px; border-bottom: 1px solid rgba(226,55,68,0.1); font-size: 12px; color: #4b5563; }
.dark .markdown-body td { color: #d1d5db; border-bottom: 1px solid rgba(255,255,255,0.06); }
.markdown-body tr:nth-child(even) { background-color: rgba(226,55,68,0.03); }
.dark .markdown-body tr:nth-child(even) { background-color: rgba(255,255,255,0.02); }
`;

const QUICK_ACTIONS = [
    { label: "🌱 Veg meal",    text: "Suggest a vegetarian meal for me" },
    { label: "🍗 Non-Veg",    text: "Suggest a non-vegetarian meal" },
    { label: "🍱 Combos",     text: "Show me some food combos" },
    { label: "⭐ Ratings",    text: "Which restaurant has the best rating?" },
    { label: "🎫 Discounts",  text: "What discounts are available?" },
    { label: "🔁 My history", text: "What have I ordered before?" },
    { label: "📍 Near me",    text: "What restaurants are near me?" },
];

const GROUP_SIZES = [1, 2, 3, 4, 5, "6+"] as const;

const CustomerAIAssistantWidget: React.FC = () => {
    const currentLoc = useLocation();
    const { user, fetchCart, setShowPreloader, location, visibleRestaurants } = useAppData();
    const [isOpen, setIsOpen]     = useState(false);
    const [input, setInput]       = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading]   = useState(false);
    const [cartPopped, setCartPopped] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!document.getElementById("tomato-ai-styles")) {
            const s = document.createElement("style");
            s.id = "tomato-ai-styles";
            s.innerHTML = WIDGET_STYLES;
            document.head.appendChild(s);
        }
    }, []);

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen, loading]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const rawName = user?.name?.trim() || user?.email?.split("@")[0] || "";
            const firstName = rawName ? rawName.split(" ")[0] : "there";
            setMessages([{
                id: Date.now().toString(),
                role: "assistant",
                content: `Hey ${firstName}! 👋 I'm **Tomato AI**, your personal food waiter created by Sahitya Ghosh.\n\nI can find food, book items to your cart, check ratings and discounts — just ask! What are you craving today? 🍅`,
            }]);
        }
    }, [isOpen, messages.length, user]);

    const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
        if (e) e.preventDefault();
        const text = (overrideText || input).trim();
        if (!text || loading) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const token = getToken("customer");
            if (!token) throw new Error("Please log in first.");

            const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
            const screenContext = {
                location: location ? { lat: location.latitude, lng: location.longitude } : null,
                visibleRestaurants: visibleRestaurants?.map(r => ({ name: r.name, description: r.description })) || [],
            };

            const { data } = await axios.post(
                `${restaurantService}/api/ai/chat`,
                { message: text, history, screenContext },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data.cartAction) {
                await fetchCart();
                setCartPopped(true);
                setTimeout(() => setCartPopped(false), 600);
                toast.success(`🛒 Added "${data.cartAction.itemName}" to your cart!`, { duration: 3000 });
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.text || "...",
                comboData: data.comboData || null,
                cartAction: data.cartAction || null,
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err: any) {
            console.error("AI Chat Error:", err);
            const isNetworkErr = err?.code === "ERR_NETWORK" || err?.message?.includes("Network Error") || !err?.response;
            const errorText = isNetworkErr
                ? "⚠️ Connection error: Unable to reach Tomato AI server. Please verify backend microservices are running and try again!"
                : (err?.response?.data?.message || "Something went wrong. Please try again.");

            const aiErrorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: errorText,
            };
            setMessages(prev => [...prev, aiErrorMsg]);
            toast.error(isNetworkErr ? "Network Connection Error" : (err?.response?.data?.message || "Error communicating with AI"));
        } finally {
            setLoading(false);
        }
    };

    const handleAddComboToCart = async (combo: ComboData) => {
        try {
            setShowPreloader(true);
            const token = getToken("customer");
            if (!token) throw new Error("Please log in first.");
            await Promise.all(
                combo.items.map(item =>
                    axios.post(`${restaurantService}/api/cart/add`,
                        { restaurantId: item.restaurantId, itemId: item.itemId, quantity: 1 },
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                )
            );
            await fetchCart();
            toast.success(`🍱 "${combo.title}" added to cart!`);
            setIsOpen(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to add combo.");
        } finally {
            setShowPreloader(false);
        }
    };

    if (!user || user.role !== "customer" || currentLoc.pathname === "/reels") return null;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    const asksPeople = lastMsg?.role === "assistant" && /how many people|for how many|group size|number of people/i.test(lastMsg.content);

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    aria-label="Open Tomato AI"
                    className="fixed bottom-6 right-6 z-[9990] flex items-center justify-center cursor-pointer overflow-hidden border-2 border-white/30 shadow-2xl"
                    style={{
                        width: "60px", height: "60px",
                        backgroundColor: "#E23744",
                        color: "white",
                        borderRadius: "50%",
                    }}
                >
                    <span className="text-2xl drop-shadow-md select-none">🍅</span>
                    {cartPopped && (
                        <span className="absolute top-0 right-0 w-5 h-5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center text-white text-[10px] font-black cart-pop">✓</span>
                    )}
                </button>
            )}

            {isOpen && (
                <div
                    className="fixed z-[9999] flex flex-col overflow-hidden bg-white/96 dark:bg-[#0f0f1a]/96 backdrop-blur-2xl shadow-2xl"
                    style={{
                        bottom: isMobile ? "0" : "24px",
                        right:  isMobile ? "0" : "24px",
                        width:  isMobile ? "100%" : "390px",
                        height: isMobile ? "88vh"  : "620px",
                        borderTopLeftRadius: "24px",
                        borderTopRightRadius: "24px",
                        borderBottomLeftRadius:  isMobile ? "0" : "24px",
                        borderBottomRightRadius: isMobile ? "0" : "24px",
                        animation: isMobile ? "slide-in-mobile 0.35s cubic-bezier(0.16,1,0.3,1)" : "slide-in-desktop 0.35s cubic-bezier(0.16,1,0.3,1)",
                        border: "1px solid rgba(226,55,68,0.18)",
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#c0282f] via-[#E23744] to-[#ff6b74] text-white flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center w-11 h-11 bg-white/20 rounded-full text-2xl shadow-inner backdrop-blur-sm flex-shrink-0">
                                🍅
                                <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                            </div>
                            <div>
                                <h3 className="font-black text-[17px] leading-tight tracking-tight">Tomato AI</h3>
                                <p className="text-[11px] text-white/75 font-medium">by Sahitya Ghosh · Online 🟢</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setMessages([])} className="p-2 hover:bg-white/20 rounded-full transition-all" title="Clear chat"><FiRefreshCcw size={15} /></button>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-all" title="Close"><FiX size={19} /></button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50/80 to-white/80 dark:from-black/20 dark:to-black/10">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.role === "assistant" && (
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#E23744] to-[#ff6b74] flex items-center justify-center text-sm mr-2 mt-1 shadow-md">🍅</div>
                                )}
                                <div className={`relative max-w-[82%] px-4 py-3 text-sm shadow-sm ${
                                    msg.role === "user"
                                        ? "bg-gradient-to-br from-[#E23744] to-[#e85562] text-white rounded-[20px] rounded-tr-[4px]"
                                        : "bg-white dark:bg-[#1e1e38] text-gray-800 dark:text-gray-100 rounded-[20px] rounded-tl-[4px] border border-gray-100 dark:border-gray-800/60"
                                }`}>
                                    {msg.role === "user" ? (
                                        <span className="font-medium leading-relaxed">{msg.content}</span>
                                    ) : (
                                        <div className="markdown-body font-medium leading-relaxed">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                            {msg.cartAction && (
                                                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                                                    <FiShoppingCart className="text-green-600 flex-shrink-0" size={14} />
                                                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                                                        ✅ "{msg.cartAction.itemName}" added to cart × {msg.cartAction.quantity}
                                                    </span>
                                                </div>
                                            )}
                                            {msg.comboData && (
                                                <div className="mt-4 p-4 rounded-2xl border border-[#E23744]/20 bg-gradient-to-br from-white to-[#fff5f5] dark:from-[#2a1a1e] dark:to-[#1a1a2e] shadow-inner">
                                                    <div className="flex items-start justify-between mb-1">
                                                        <h4 className="font-black text-[#E23744] text-[15px] leading-tight">{msg.comboData.title}</h4>
                                                        <span className="text-[10px] bg-[#E23744]/10 text-[#E23744] font-black px-2 py-0.5 rounded-full ml-2 flex-shrink-0 tracking-wide">COMBO</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{msg.comboData.description}</p>
                                                    <ul className="space-y-1.5 mb-3 list-none pl-0">
                                                        {msg.comboData.items.map((item, idx) => (
                                                            <li key={idx} className="flex justify-between items-center text-xs font-semibold px-3 py-2 bg-white/80 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-800">
                                                                <span className="text-gray-700 dark:text-gray-200">{item.name}</span>
                                                                <span className="text-[#E23744] font-black">₹{item.price}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <div className="flex items-center justify-between pt-3 border-t border-[#E23744]/10">
                                                        <div className="font-bold text-sm">Total: <span className="text-[#E23744] text-base font-black">₹{msg.comboData.totalPrice}</span></div>
                                                        <button
                                                            onClick={() => handleAddComboToCart(msg.comboData!)}
                                                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#E23744] to-[#ff6b74] hover:from-[#c0282f] text-white font-black text-xs rounded-full active:scale-95 transition-all shadow-md shadow-[#E23744]/30"
                                                        >
                                                            <FiShoppingCart size={12} />
                                                            Add All to Cart
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex w-full justify-start">
                                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#E23744] to-[#ff6b74] flex items-center justify-center text-sm mr-2 shadow-md">🍅</div>
                                <div className="flex items-center gap-2 bg-white dark:bg-[#1e1e38] px-4 py-3 rounded-[20px] rounded-tl-[4px] shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className="w-2 h-2 bg-[#E23744] rounded-full ai-dot" />
                                    <div className="w-2 h-2 bg-[#E23744] rounded-full ai-dot" />
                                    <div className="w-2 h-2 bg-[#E23744] rounded-full ai-dot" />
                                    <span className="text-xs text-gray-400 ml-1 font-medium">thinking…</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    {messages.length <= 2 && !loading && (
                        <div className="px-4 py-2 bg-white dark:bg-[#0f0f1a] overflow-x-auto flex gap-2 flex-shrink-0 border-t border-gray-100 dark:border-gray-800/50" style={{scrollbarWidth:"none"}}>
                            {QUICK_ACTIONS.map((q, i) => (
                                <button key={i} onClick={() => handleSend(undefined, q.text)}
                                    className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-[#E23744] bg-[#E23744]/8 hover:bg-[#E23744]/18 rounded-full border border-[#E23744]/20 whitespace-nowrap transition-all">
                                    {q.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Group size quick pick */}
                    {!loading && asksPeople && (
                        <div className="px-4 py-2 bg-white dark:bg-[#0f0f1a] flex gap-2 flex-wrap flex-shrink-0 border-t border-gray-100 dark:border-gray-800/50">
                            <span className="text-xs text-gray-400 w-full font-medium">Quick pick 👇</span>
                            {GROUP_SIZES.map(n => (
                                <button key={n} onClick={() => handleSend(undefined, `For ${n} people`)}
                                    className="px-3 py-1.5 text-sm font-bold text-[#E23744] bg-[#E23744]/10 hover:bg-[#E23744]/20 rounded-full border border-[#E23744]/20 transition-all">
                                    {n} {n === 1 ? "person" : "people"}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 bg-white dark:bg-[#0f0f1a] border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Ask me anything about food…"
                                className="flex-1 bg-gray-100 dark:bg-[#1e1e38] text-gray-800 dark:text-white rounded-full py-3 pl-5 pr-4 outline-none focus:ring-2 focus:ring-[#E23744]/40 transition-all text-sm font-medium placeholder:text-gray-400"
                                disabled={loading}
                                autoComplete="off"
                            />
                            <button type="submit" disabled={!input.trim() || loading}
                                className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#E23744] to-[#ff6b74] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#E23744]/30 active:scale-95 transition-all">
                                <FiSend size={16} className="-ml-0.5 mt-0.5" />
                            </button>
                        </form>
                        <p className="text-center text-[10px] text-gray-300 dark:text-gray-600 mt-2">
                            Tomato AI by Sahitya Ghosh · Powered by Groq &amp; LangGraph
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default CustomerAIAssistantWidget;
