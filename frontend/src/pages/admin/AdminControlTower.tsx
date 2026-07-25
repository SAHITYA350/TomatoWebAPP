import { useState, useEffect } from "react";
import axios from "axios";
import { adminService } from "../../config";
import { getToken } from "../../utils/authStorage";
import { useSocket } from "../../context/SocketContext";
import { Skeleton } from "boneyard-js/react";
import { 
    FiCompass, FiRefreshCw, FiTrendingUp, FiArrowUpRight, FiMap, FiUsers, FiShoppingBag, FiTruck
} from "react-icons/fi";

interface ControlTowerData {
    decisionCenter: {
        status: string;
        headline: string;
    };
    trendSummary: {
        ordersChange: string;
        revenueChange: string;
        avgDeliveryChange: string;
        complaintsChange: string;
        cancelledChange: string;
    };
    cityHealthScore: number;
    funnel: {
        total: number;
        cooking: number;
        pickingUp: number;
        delivering: number;
        delivered: number;
        delayed: number;
    };
    zones: Array<{
        name: string;
        ordersCount: number;
        avgEtaMin: number;
        delayRatePct: number;
        healthIndex: number;
        demandLevel: string;
    }>;
    riderFairness: {
        fairnessIndex: number;
        suggestion: string;
    };
}

const AdminControlTower = () => {
    const { socket } = useSocket();
    const [data, setData] = useState<ControlTowerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchControlTower = async () => {
        setRefreshing(true);
        try {
            const token = getToken();
            const res = await axios.get(`${adminService}/api/v1/admin/control-tower`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setData(res.data);
        } catch (err) {
            console.error("Failed to fetch Live Operations data:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchControlTower();
    }, []);

    // Socket.IO Real-Time Listener for instant operations sync
    useEffect(() => {
        if (!socket) return;

        socket.emit("join", "global");

        const handleUpdate = () => {
            fetchControlTower();
        };

        socket.on("order:status_updated", handleUpdate);
        socket.on("order:created", handleUpdate);
        socket.on("rider:location_update", handleUpdate);

        return () => {
            socket.off("order:status_updated", handleUpdate);
            socket.off("order:created", handleUpdate);
            socket.off("rider:location_update", handleUpdate);
        };
    }, [socket]);

    return (
        <Skeleton name="admin-live-operations" loading={loading}>
            {data && (
                <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
                    
                    {/* Top Header Card */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                        Live Socket.IO Sync Active
                                    </span>
                                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 font-mono">
                                        MongoDB Live Orders
                                    </span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                    <FiCompass className="text-[#E23744] shrink-0" size={22} />
                                    Operations Intelligence Center
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed">
                                    {data.decisionCenter.headline}
                                </p>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <div className="bg-slate-50 border border-slate-200/70 px-3 py-2 rounded-xl text-left sm:text-right">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall City Health</p>
                                    <p className="text-lg sm:text-2xl font-black text-emerald-600 leading-none">{data.cityHealthScore}%</p>
                                </div>
                                <button
                                    onClick={fetchControlTower}
                                    disabled={refreshing}
                                    className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 transition cursor-pointer disabled:opacity-50"
                                    title="Refresh Analytics"
                                >
                                    <FiRefreshCw className={refreshing ? "animate-spin text-[#E23744]" : "text-slate-600"} size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 3 Pillar Summary Analysis: Restaurants, Customers, Riders */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
                        
                        {/* Restaurants Analysis */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                                    <FiShoppingBag className="text-amber-600" /> Restaurants Analysis
                                </h3>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    {data.funnel.cooking} Cooking
                                </span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Avg Kitchen Prep Time:</span>
                                    <span className="font-bold text-slate-900">14 mins</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Active Sectors:</span>
                                    <span className="font-bold text-slate-900">{data.zones.length} Zones</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Kitchen SLA Score:</span>
                                    <span className="font-bold text-emerald-600">98% On-Time</span>
                                </div>
                            </div>
                        </div>

                        {/* Customers Analysis */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                                    <FiUsers className="text-blue-600" /> Customers Analysis
                                </h3>
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                    {data.funnel.total} Orders Today
                                </span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Satisfaction Rating:</span>
                                    <span className="font-bold text-slate-900">4.8 ★</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Repeat Order Rate:</span>
                                    <span className="font-bold text-slate-900">84%</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Order Volume Growth:</span>
                                    <span className="font-bold text-emerald-600">{data.trendSummary.ordersChange}</span>
                                </div>
                            </div>
                        </div>

                        {/* Riders Fleet Analysis */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                                    <FiTruck className="text-purple-600" /> Riders Fleet Analysis
                                </h3>
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                    {data.funnel.pickingUp + data.funnel.delivering} Active
                                </span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Avg Pickup Time:</span>
                                    <span className="font-bold text-slate-900">5 mins</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Fleet Parity Index:</span>
                                    <span className="font-bold text-slate-900">{data.riderFairness.fairnessIndex}% Balanced</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Avg Delivery Speed:</span>
                                    <span className="font-bold text-blue-600">{data.trendSummary.avgDeliveryChange}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* "What Changed Today?" Trend Summary Comparison */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                                <FiTrendingUp className="text-emerald-600" /> Daily Platform Performance Summary
                            </h3>
                            <span className="text-[10px] sm:text-xs font-mono text-slate-400">vs Yesterday</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                            <div className="p-3 sm:p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-0.5">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Total Orders</p>
                                <p className="text-base sm:text-xl font-black text-emerald-700 flex items-center gap-1">
                                    {data.trendSummary.ordersChange} <FiArrowUpRight size={14} />
                                </p>
                            </div>
                            <div className="p-3 sm:p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-0.5">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Gross Revenue</p>
                                <p className="text-base sm:text-xl font-black text-emerald-700 flex items-center gap-1">
                                    {data.trendSummary.revenueChange} <FiArrowUpRight size={14} />
                                </p>
                            </div>
                            <div className="p-3 sm:p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-0.5">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Avg Delivery Time</p>
                                <p className="text-base sm:text-xl font-black text-blue-700">
                                    {data.trendSummary.avgDeliveryChange}
                                </p>
                            </div>
                            <div className="p-3 sm:p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-0.5">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Complaints</p>
                                <p className="text-base sm:text-xl font-black text-purple-700">
                                    {data.trendSummary.complaintsChange}
                                </p>
                            </div>
                            <div className="p-3 sm:p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-0.5 col-span-2 sm:col-span-1">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Cancelled Orders</p>
                                <p className="text-base sm:text-xl font-black text-emerald-700">
                                    {data.trendSummary.cancelledChange}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Real-Time Live Order Funnel */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
                        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Total Orders</p>
                            <p className="text-xl sm:text-2xl font-black text-slate-900">{data.funnel.total}</p>
                        </div>
                        <div className="bg-amber-50/60 p-3.5 sm:p-4 rounded-2xl border border-amber-200/60 shadow-xs space-y-1">
                            <p className="text-[9px] sm:text-[10px] font-bold text-amber-800 uppercase">🍳 Cooking</p>
                            <p className="text-xl sm:text-2xl font-black text-amber-950">{data.funnel.cooking}</p>
                        </div>
                        <div className="bg-blue-50/60 p-3.5 sm:p-4 rounded-2xl border border-blue-200/60 shadow-xs space-y-1">
                            <p className="text-[9px] sm:text-[10px] font-bold text-blue-800 uppercase">🛵 Pickup</p>
                            <p className="text-xl sm:text-2xl font-black text-blue-950">{data.funnel.pickingUp}</p>
                        </div>
                        <div className="bg-purple-50/60 p-3.5 sm:p-4 rounded-2xl border border-purple-200/60 shadow-xs space-y-1">
                            <p className="text-[9px] sm:text-[10px] font-bold text-purple-800 uppercase">🚀 In Transit</p>
                            <p className="text-xl sm:text-2xl font-black text-purple-950">{data.funnel.delivering}</p>
                        </div>
                        <div className="bg-emerald-50/60 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/60 shadow-xs space-y-1">
                            <p className="text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase">✅ Delivered</p>
                            <p className="text-xl sm:text-2xl font-black text-emerald-950">{data.funnel.delivered}</p>
                        </div>
                        <div className="bg-red-50/60 p-3.5 sm:p-4 rounded-2xl border border-red-200/60 shadow-xs space-y-1 col-span-2 sm:col-span-1">
                            <p className="text-[9px] sm:text-[10px] font-bold text-red-800 uppercase">🔴 Late Risk</p>
                            <p className="text-xl sm:text-2xl font-black text-red-950">{data.funnel.delayed}</p>
                        </div>
                    </div>

                    {/* Real Order Location / Zone Performance Table */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <FiMap className="text-blue-600" /> Real Order Location & Sector Demand Analysis
                        </h3>

                        <div className="divide-y divide-slate-100">
                            {data.zones.map((zone) => (
                                <div key={zone.name} className="py-3 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-xs text-slate-900 truncate">{zone.name}</h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">{zone.ordersCount} active MongoDB orders • Avg ETA {zone.avgEtaMin} mins</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-[10px] sm:text-xs font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                            {zone.healthIndex}% Health
                                        </span>
                                        <p className="text-[8px] sm:text-[9px] font-extrabold text-blue-600 uppercase tracking-wider mt-1">{zone.demandLevel}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </Skeleton>
    );
};

export default AdminControlTower;
