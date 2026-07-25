import { useState, useEffect } from "react";
import axios from "axios";
import { adminService } from "../../config";
import { getToken } from "../../utils/authStorage";
import { Skeleton } from "boneyard-js/react";
import { toast } from "react-hot-toast";
import { FiCheckCircle, FiAlertTriangle, FiPhoneCall, FiUserCheck, FiPauseCircle, FiArrowRight, FiZap, FiSliders } from "react-icons/fi";

interface RecommendationItem {
    id: string;
    title: string;
    reason: string;
    actionLabel: string;
    actionType: string;
    severity: "high" | "medium" | "low";
}

const AdminRecommendations = () => {
    const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRecommendations = async () => {
        try {
            const token = getToken();
            const res = await axios.get(`${adminService}/api/v1/admin/control-tower`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRecommendations(res.data.ruleBasedRecommendations || []);
        } catch (err) {
            console.error("Failed to fetch recommendations:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const handleActionExecute = (rec: RecommendationItem) => {
        toast.success(`Action Triggered: ${rec.actionLabel}`, {
            style: { background: "#059669", color: "#fff", borderRadius: "12px" },
        });
        setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
    };

    return (
        <Skeleton name="admin-recommendations" loading={loading}>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800/60">
                            Rule-Based Intelligence
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            💡 Operations Recommendation Center
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed">
                            Automatically identifies operational issues across restaurants, riders, and city zones, and suggests concrete actions.
                        </p>
                    </div>
                </div>

                {/* Recommendations List */}
                {recommendations.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm space-y-2">
                        <FiCheckCircle className="mx-auto text-4xl text-emerald-500" />
                        <h3 className="font-extrabold text-gray-900 text-base">All Recommendations Resolved!</h3>
                        <p className="text-xs text-gray-400">Platform operations are running at peak SLA performance.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recommendations.map((rec) => (
                            <div key={rec.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:shadow-md transition">
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            rec.severity === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                                            rec.severity === 'medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                            'bg-blue-100 text-blue-800 border border-blue-200'
                                        }`}>
                                            {rec.severity} priority
                                        </span>
                                        <h3 className="font-extrabold text-base text-gray-900">{rec.title}</h3>
                                    </div>
                                    <p className="text-xs text-gray-600 font-medium leading-relaxed">
                                        <strong className="text-gray-900">Reason:</strong> {rec.reason}
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleActionExecute(rec)}
                                    className="px-5 py-3 rounded-2xl bg-[#E23744] hover:bg-red-600 text-white font-bold text-xs transition shadow-md cursor-pointer whitespace-nowrap self-start sm:self-auto flex items-center gap-2"
                                >
                                    {rec.actionLabel} <FiArrowRight size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Skeleton>
    );
};

export default AdminRecommendations;
