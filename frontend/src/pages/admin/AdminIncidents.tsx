import { useState, useEffect } from "react";
import axios from "axios";
import { adminService } from "../../config";
import { getToken } from "../../utils/authStorage";
import { Skeleton } from "boneyard-js/react";
import { toast } from "react-hot-toast";
import { FiShield, FiAlertOctagon, FiCheckCircle, FiClock, FiRefreshCw, FiZap } from "react-icons/fi";

interface IncidentItem {
    id: string;
    title: string;
    status: string;
    priority: string;
    time: string;
    category: string;
}

const AdminIncidents = () => {
    const [incidents, setIncidents] = useState<IncidentItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchIncidents = async () => {
        try {
            const token = getToken();
            const res = await axios.get(`${adminService}/api/v1/admin/control-tower`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setIncidents(res.data.incidentLogs || []);
        } catch (err) {
            console.error("Failed to fetch incidents:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncidents();
    }, []);

    const handleResolveIncident = (incId: string) => {
        toast.success(`Incident #${incId} marked as Resolved!`, {
            style: { background: "#059669", color: "#fff", borderRadius: "12px" },
        });
        setIncidents((prev) =>
            prev.map((i) => (i.id === incId ? { ...i, status: "Resolved" } : i))
        );
    };

    return (
        <Skeleton name="admin-incidents" loading={loading}>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <span className="text-xs font-mono uppercase tracking-widest text-red-400 font-bold bg-red-950/80 px-3 py-1 rounded-full border border-red-800/60">
                            System Recovery Audit
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            🚨 Incident & Recovery Center
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed">
                            Tracks operational issues (late deliveries, kitchen delays, payment failures) from detection to resolution.
                        </p>
                    </div>
                </div>

                {/* Incidents Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h3 className="font-extrabold text-base text-gray-900">Incident Recovery Log</h3>
                        <span className="text-xs text-gray-400 font-mono">Real-Time Operational Audit</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-500 border-b">
                                <tr>
                                    <th className="p-4">Incident ID</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Issue Description</th>
                                    <th className="p-4">Priority</th>
                                    <th className="p-4">Time Detected</th>
                                    <th className="p-4">Resolution Status</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {incidents.map((inc) => (
                                    <tr key={inc.id} className="hover:bg-gray-50 transition">
                                        <td className="p-4 font-mono font-bold text-gray-900">{inc.id}</td>
                                        <td className="p-4 font-bold text-purple-700">{inc.category}</td>
                                        <td className="p-4 font-bold text-gray-800">{inc.title}</td>
                                        <td className="p-4 font-mono">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                inc.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {inc.priority}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 font-mono">{inc.time}</td>
                                        <td className="p-4 font-bold">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] ${
                                                inc.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                                                inc.status === 'Resolving' ? 'bg-blue-100 text-blue-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                                {inc.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {inc.status !== 'Resolved' && (
                                                <button
                                                    onClick={() => handleResolveIncident(inc.id)}
                                                    className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition cursor-pointer"
                                                >
                                                    Resolve
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Skeleton>
    );
};

export default AdminIncidents;
