import { useState } from "react";
import axios from "axios";
import { riderService } from "../../config";
import { toast } from "react-hot-toast";
import { FiTruck, FiZap } from "react-icons/fi";

interface CandidateScore {
    riderId: string;
    userId: string;
    name: string;
    phone: string;
    picture: string;
    distanceKm: number;
    distanceScore: number;
    workloadScore: number;
    ratingScore: number;
    vehicleBonus: number;
    trafficDelayPenalty: number;
    totalScore: number;
    isBatchable: boolean;
    vehicleType: string;
}

const AdminDispatchEngine = () => {
    const [restaurantLat, setRestaurantLat] = useState("20.2961");
    const [restaurantLng, setRestaurantLng] = useState("85.8245");
    const [orderId, setOrderId] = useState("SIMULATED_ORDER_892");

    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);

    const [candidates, setCandidates] = useState<CandidateScore[]>([]);
    const [recommendedRider, setRecommendedRider] = useState<CandidateScore | null>(null);

    const handleRunEvaluation = async () => {
        setLoading(true);
        try {
            const { data } = await axios.post(`${riderService}/api/rider/dispatch/evaluate`, {
                restaurantLat: Number(restaurantLat),
                restaurantLng: Number(restaurantLng),
                orderId,
            });

            if (data.success) {
                setCandidates(data.candidates || []);
                setRecommendedRider(data.recommendedRider || null);
                toast.success(`Evaluated ${data.totalOnlineRiders} active riders nearby!`, { style: { borderRadius: "10px", fontSize: "13px" } });
            } else {
                toast.error(data.message || "No online riders available nearby", { style: { borderRadius: "10px", fontSize: "13px" } });
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to evaluate rider candidates", { style: { borderRadius: "10px", fontSize: "13px" } });
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteDispatch = async () => {
        if (!recommendedRider) {
            toast.error("Please run evaluation first!");
            return;
        }

        setExecuting(true);
        try {
            const { data } = await axios.post(`${riderService}/api/rider/dispatch/execute`, {
                orderId,
                restaurantLat: Number(restaurantLat),
                restaurantLng: Number(restaurantLng),
            });

            if (data.success) {
                toast.success(data.message || "Rider assigned successfully!", { style: { background: "#059669", color: "#fff", borderRadius: "10px", fontSize: "13px" } });
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Rider assignment failed");
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
            {/* Header Hero (Clean Professional White/Slate Card - NO GRADIENT) */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                    <span className="inline-flex items-center text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        Smart Rider Selection
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <FiTruck className="text-[#E23744] shrink-0" size={22} /> Smart Rider Assignment
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed">
                        Explains why a rider is selected based on distance, workload, vehicle type, and rating.
                    </p>
                </div>

                <button
                    onClick={handleRunEvaluation}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#E23744] hover:bg-red-600 font-bold text-xs text-white rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                    <FiZap size={16} /> {loading ? "Evaluating..." : "Find Best Rider"}
                </button>
            </div>

            {/* Input Simulation Controls */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-semibold text-slate-700">
                <div>
                    <label className="block mb-1 text-slate-500 font-bold text-[11px]">Order Reference</label>
                    <input
                        type="text"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-mono text-slate-900 bg-slate-50 focus:bg-white focus:border-[#E23744] transition"
                    />
                </div>
                <div>
                    <label className="block mb-1 text-slate-500 font-bold text-[11px]">Restaurant Latitude</label>
                    <input
                        type="text"
                        value={restaurantLat}
                        onChange={(e) => setRestaurantLat(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-mono text-slate-900 bg-slate-50 focus:bg-white focus:border-[#E23744] transition"
                    />
                </div>
                <div>
                    <label className="block mb-1 text-slate-500 font-bold text-[11px]">Restaurant Longitude</label>
                    <input
                        type="text"
                        value={restaurantLng}
                        onChange={(e) => setRestaurantLng(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-mono text-slate-900 bg-slate-50 focus:bg-white focus:border-[#E23744] transition"
                    />
                </div>
            </div>

            {/* "Why was Rider Selected?" Explainable Box */}
            {recommendedRider && (
                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                            <span className="text-xl shrink-0">🏆</span>
                            <div className="min-w-0">
                                <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    Final Rank #1
                                </span>
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1 truncate">
                                    Why was Rider {recommendedRider.phone} selected?
                                </h3>
                            </div>
                        </div>

                        <button
                            onClick={handleExecuteDispatch}
                            disabled={executing}
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0 text-center"
                        >
                            {executing ? "Assigning..." : "Assign Order to Rider"}
                        </button>
                    </div>

                    {/* Breakdown Cards (2-col grid on mobile for 100% responsiveness) */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-0.5">
                            <p className="text-[9px] font-bold text-blue-700 uppercase">Distance</p>
                            <p className="text-sm sm:text-base font-black text-blue-950">{recommendedRider.distanceKm} km</p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 space-y-0.5">
                            <p className="text-[9px] font-bold text-purple-700 uppercase">Active Orders</p>
                            <p className="text-sm sm:text-base font-black text-purple-950">{recommendedRider.workloadScore === 100 ? "0 (Idle)" : "1"}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 space-y-0.5">
                            <p className="text-[9px] font-bold text-amber-700 uppercase">Rider Rating</p>
                            <p className="text-sm sm:text-base font-black text-amber-950">4.9 ★</p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-0.5">
                            <p className="text-[9px] font-bold text-emerald-700 uppercase">Traffic Delay</p>
                            <p className="text-sm sm:text-base font-black text-emerald-950">{recommendedRider.trafficDelayPenalty === 0 ? "Low" : "Moderate"}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-red-50/60 border border-red-100 space-y-0.5 col-span-2 sm:col-span-1">
                            <p className="text-[9px] font-bold text-red-700 uppercase">Overall Match</p>
                            <p className="text-sm sm:text-base font-black text-red-950">{recommendedRider.totalScore} Pts</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Ranked Candidates Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900">Rider Candidates ({candidates.length})</h3>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-mono">Ranked by Score</span>
                </div>

                {candidates.length === 0 ? (
                    <p className="text-xs text-slate-400 p-8 text-center">Click "Find Best Rider" to evaluate nearby active riders.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="p-3">Rank</th>
                                    <th className="p-3">Phone</th>
                                    <th className="p-3">Distance</th>
                                    <th className="p-3">Orders</th>
                                    <th className="p-3">Vehicle</th>
                                    <th className="p-3">Match Rank</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {candidates.map((c, idx) => (
                                    <tr key={c.riderId} className={`hover:bg-slate-50 transition ${idx === 0 ? 'bg-emerald-50/40 font-semibold' : ''}`}>
                                        <td className="p-3 font-black text-slate-900">#{idx + 1}</td>
                                        <td className="p-3 font-bold text-slate-800">{c.phone}</td>
                                        <td className="p-3 font-mono text-slate-700">{c.distanceKm} km</td>
                                        <td className="p-3 text-purple-700">{c.workloadScore === 100 ? "0 (Idle)" : "1 Active"}</td>
                                        <td className="p-3 capitalize text-slate-600">{c.vehicleType}</td>
                                        <td className="p-3 font-black text-xs text-[#E23744] font-mono">{c.totalScore} Pts</td>
                                        <td className="p-3">
                                            {idx === 0 ? (
                                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold">Recommended #1</span>
                                            ) : (
                                                <span className="text-slate-400 text-[10px]">Backup Candidate</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDispatchEngine;
