import { getToken } from "../../utils/authStorage";
import { useEffect, useState } from "react";
import axios from "axios";
import { adminService } from "../../config";
import { FiSearch, FiCheckCircle, FiMapPin, FiChevronDown, FiChevronUp } from "react-icons/fi";
import toast from "react-hot-toast";

interface Restaurant {
    _id: string;
    name: string;
    description?: string;
    image: string;
    ownerId: string;
    phone: number;
    isVerified: boolean;
    isOpen: boolean;
    autoLocation?: { formattedAddress?: string };
    createdAt: string;
}

const filters = [
    { key: "all", label: "All" },
    { key: "verified", label: "Verified" },
    { key: "pending", label: "Pending" },
];

const AdminRestaurants = () => {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [menuMap, setMenuMap] = useState<Record<string, any[]>>({});
    const [verifying, setVerifying] = useState<string | null>(null);

    const fetchRestaurants = async (p = page, s = search, f = filter) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${adminService}/api/v1/admin/restaurants`, {
                params: { page: p, limit: 15, search: s, filter: f },
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setRestaurants(data.restaurants);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => { setPage(1); fetchRestaurants(1, search, filter); }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => { fetchRestaurants(1, search, filter); setPage(1); }, [filter]);
    useEffect(() => { fetchRestaurants(); }, [page]);

    const verifyRestaurant = async (id: string) => {
        setVerifying(id);
        try {
            await axios.patch(`${adminService}/api/v1/verify/restaurant/${id}`, {}, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            toast.success("Restaurant verified!");
            fetchRestaurants();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to verify");
        } finally {
            setVerifying(null);
        }
    };

    const toggleExpand = async (id: string) => {
        if (expandedId === id) { setExpandedId(null); return; }
        setExpandedId(id);
        if (!menuMap[id]) {
            try {
                const { data } = await axios.get(`${adminService}/api/v1/admin/restaurants/${id}/menu`, {
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                setMenuMap((prev) => ({ ...prev, [id]: data.items }));
            } catch (err) { console.error(err); }
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Restaurants</h2>
                    <p className="text-xs text-gray-500">{total} restaurants</p>
                </div>
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search restaurants..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-[#e23744] sm:w-64"
                    />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {filters.map((f) => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
                            {restaurants.map((r) => (
                                <div key={r._id} className="p-4 space-y-3 hover:bg-gray-50 transition" onClick={() => toggleExpand(r._id)}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex gap-3">
                                            <img src={r.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                                            <div>
                                                <h4 className="font-semibold text-gray-800 text-sm">{r.name}</h4>
                                                {r.description && <p className="text-xs text-gray-500 line-clamp-1">{r.description}</p>}
                                                <p className="text-xs text-gray-400 mt-1">{r.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                r.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                            }`}>
                                                {r.isOpen ? "Open" : "Closed"}
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
                                    
                                    <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50/50 p-2 rounded">
                                        <span className="flex items-center gap-1 min-w-0">
                                            <FiMapPin className="shrink-0 text-red-400" />
                                            <span className="truncate">{r.autoLocation?.formattedAddress || "—"}</span>
                                        </span>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            {!r.isVerified && (
                                                <button
                                                    onClick={() => verifyRestaurant(r._id)}
                                                    disabled={verifying === r._id}
                                                    className="rounded bg-green-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition">
                                                    {verifying === r._id ? "..." : "Verify"}
                                                </button>
                                            )}
                                            {expandedId === r._id ? <FiChevronUp /> : <FiChevronDown />}
                                        </div>
                                    </div>

                                    {/* Expanded menu inside card */}
                                    {expandedId === r._id && (
                                        <div className="bg-gray-50 rounded-lg p-3 space-y-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                            {menuMap[r._id] ? (
                                                menuMap[r._id].length > 0 ? (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold text-gray-600 border-b pb-1">Menu Items ({menuMap[r._id].length})</p>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {menuMap[r._id].map((item: any) => (
                                                                <div key={item._id} className="flex items-center gap-3 rounded bg-white p-2 shadow-sm border border-gray-100">
                                                                    {item.image && <img src={item.image} alt="" className="h-8 w-8 rounded object-cover" />}
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                                                                        <p className="text-xs font-semibold text-[#e23744]">₹{item.price}</p>
                                                                    </div>
                                                                    <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.2 text-[9px] font-semibold ${
                                                                        item.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                                                                    }`}>
                                                                        {item.isAvailable ? "Available" : "Unavailable"}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400">No menu items</p>
                                                )
                                            ) : (
                                                <div className="flex justify-center py-2">
                                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#e23744]"></div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {restaurants.length === 0 && (
                                <div className="p-8 text-center text-gray-400">No restaurants found</div>
                            )}
                        </div>

                        {/* Desktop view */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3"></th>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Phone</th>
                                        <th className="px-4 py-3">Location</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Verified</th>
                                        <th className="px-4 py-3">Action</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {restaurants.map((r) => (
                                        <>
                                            <tr key={r._id} className="hover:bg-gray-50 cursor-pointer transition" onClick={() => toggleExpand(r._id)}>
                                                <td className="px-4 py-3">
                                                    <img src={r.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-gray-800">{r.name}</p>
                                                    {r.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{r.description}</p>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{r.phone}</td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-1 text-xs text-gray-500">
                                                        <FiMapPin className="shrink-0" />
                                                        <span className="truncate max-w-[150px]">{r.autoLocation?.formattedAddress || "—"}</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                        r.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                                    }`}>
                                                        {r.isOpen ? "Open" : "Closed"}
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
                                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                    {!r.isVerified && (
                                                        <button
                                                            onClick={() => verifyRestaurant(r._id)}
                                                            disabled={verifying === r._id}
                                                            className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition">
                                                            {verifying === r._id ? "..." : "Verify"}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-400">
                                                    {expandedId === r._id ? <FiChevronUp /> : <FiChevronDown />}
                                                </td>
                                            </tr>
                                            {expandedId === r._id && (
                                                <tr key={`${r._id}-menu`}>
                                                    <td colSpan={8} className="bg-gray-50 px-6 py-4">
                                                        {menuMap[r._id] ? (
                                                            menuMap[r._id].length > 0 ? (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-semibold text-gray-600">Menu Items ({menuMap[r._id].length})</p>
                                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                                        {menuMap[r._id].map((item: any) => (
                                                                            <div key={item._id} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                                                                                {item.image && <img src={item.image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                                                                                <div className="min-w-0">
                                                                                    <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                                                                                    <p className="text-xs font-semibold text-[#e23744]">₹{item.price}</p>
                                                                                </div>
                                                                                <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                                                    item.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                                                                                }`}>
                                                                                    {item.isAvailable ? "Available" : "Unavailable"}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-400">No menu items</p>
                                                            )
                                                        ) : (
                                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#e23744]"></div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                    {restaurants.length === 0 && (
                                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No restaurants found</td></tr>
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

export default AdminRestaurants;
