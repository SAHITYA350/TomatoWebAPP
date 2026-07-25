import { getToken } from "../../utils/authStorage";
import { useEffect, useState } from "react";
import axios from "axios";
import { adminService } from "../../config";
import { FiCheckCircle } from "react-icons/fi";
import toast from "react-hot-toast";

interface Rider {
    _id: string;
    userId: string;
    picture: string;
    phoneNumber: string;
    addharNumber: string;
    drivingLicenseNumber: string;
    isVerified: boolean;
    isAvailable: boolean;
    lastActiveAt: string;
    createdAt: string;
}

const filterOptions = [
    { key: "all", label: "All" },
    { key: "verified", label: "Verified" },
    { key: "pending", label: "Pending" },
    { key: "online", label: "Online" },
    { key: "offline", label: "Offline" },
];

const AdminRiders = () => {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [verifying, setVerifying] = useState<string | null>(null);

    const fetchRiders = async (p = page, f = filter) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${adminService}/api/v1/admin/riders`, {
                params: { page: p, limit: 15, filter: f },
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setRiders(data.riders);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRiders(1, filter); setPage(1); }, [filter]);
    useEffect(() => { fetchRiders(); }, [page]);

    const verifyRider = async (id: string) => {
        setVerifying(id);
        try {
            await axios.patch(`${adminService}/api/v1/verify/rider/${id}`, {}, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            toast.success("Rider verified!");
            fetchRiders();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to verify");
        } finally {
            setVerifying(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-gray-800">Riders</h2>
                <p className="text-xs text-gray-500">{total} riders</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
                {filterOptions.map((f) => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`flex-1 min-w-[60px] rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                            filter === f.key ? "bg-white text-[#e23744] shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#e23744]"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* Mobile list view */}
                        <div className="block md:hidden divide-y">
                            {riders.map((r) => (
                                <div key={r._id} className="p-4 space-y-3 hover:bg-gray-50 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={r.picture} alt="" className="h-12 w-12 rounded-full object-cover" />
                                            <div>
                                                <p className="font-semibold text-gray-800 text-sm">{r.phoneNumber}</p>
                                                <p className="text-xs text-gray-400 font-sans">Joined: {new Date(r.createdAt || Date.now()).toLocaleDateString("en-IN")}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                r.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                            }`}>
                                                <span className={`h-1 w-1 rounded-full ${r.isAvailable ? "bg-green-500" : "bg-gray-400"}`}></span>
                                                {r.isAvailable ? "Online" : "Offline"}
                                            </span>
                                            {r.isVerified ? (
                                                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600">
                                                    <FiCheckCircle size={10} /> Verified
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-semibold text-yellow-600">Pending</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded border border-gray-100 font-mono">
                                        <div>
                                            <span className="text-[10px] text-gray-400 block font-sans">Aadhaar</span>
                                            <span className="text-gray-700">{r.addharNumber}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block font-sans">License</span>
                                            <span className="text-gray-700">{r.drivingLicenseNumber}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[11px] text-gray-500">
                                        <span>Last Active: {r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}</span>
                                        {!r.isVerified && (
                                            <button onClick={() => verifyRider(r._id)}
                                                disabled={verifying === r._id}
                                                className="rounded bg-green-600 px-3 py-1 text-[10px] font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition cursor-pointer">
                                                {verifying === r._id ? "..." : "Verify"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {riders.length === 0 && (
                                <div className="p-8 text-center text-gray-400">No riders found</div>
                            )}
                        </div>

                        {/* Desktop view */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3"></th>
                                        <th className="px-4 py-3">Phone</th>
                                        <th className="px-4 py-3">Aadhaar</th>
                                        <th className="px-4 py-3">License</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Verified</th>
                                        <th className="px-4 py-3">Last Active</th>
                                        <th className="px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {riders.map((r) => (
                                        <tr key={r._id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3">
                                                <img src={r.picture} alt="" className="h-10 w-10 rounded-full object-cover" />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{r.phoneNumber}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.addharNumber}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.drivingLicenseNumber}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                    r.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                                }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${r.isAvailable ? "bg-green-500" : "bg-gray-400"}`}></span>
                                                    {r.isAvailable ? "Online" : "Offline"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {r.isVerified ? (
                                                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                                                        <FiCheckCircle /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-semibold text-yellow-600">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {!r.isVerified && (
                                                    <button onClick={() => verifyRider(r._id)}
                                                        disabled={verifying === r._id}
                                                        className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition">
                                                        {verifying === r._id ? "..." : "Verify"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {riders.length === 0 && (
                                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No riders found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40">Prev</button>
                    <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40">Next</button>
                </div>
            )}
        </div>
    );
};

export default AdminRiders;
