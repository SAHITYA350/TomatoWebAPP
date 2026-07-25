import { getToken } from "../../utils/authStorage";
import { useEffect, useState } from "react";
import axios from "axios";
import { adminService } from "../../config";
import { FiSearch, FiChevronDown, FiChevronUp } from "react-icons/fi";
import UserAvatar from "../../components/UserAvatar";

interface Customer {
    _id: string;
    name: string;
    email: string;
    image: string;
    role: string | null;
    createdAt: string;
}

const AdminCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [orderMap, setOrderMap] = useState<Record<string, any[]>>({});

    const fetchCustomers = async (p = page, s = search) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${adminService}/api/v1/admin/customers`, {
                params: { page: p, limit: 15, search: s },
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setCustomers(data.customers);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => fetchCustomers(1, search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => { fetchCustomers(); }, [page]);

    const toggleExpand = async (userId: string) => {
        if (expandedId === userId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(userId);
        if (!orderMap[userId]) {
            try {
                const { data } = await axios.get(`${adminService}/api/v1/admin/customers/${userId}/orders`, {
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                setOrderMap((prev) => ({ ...prev, [userId]: data.orders }));
            } catch (err) {
                console.error(err);
            }
        }
    };

    const roleColor: Record<string, string> = {
        customer: "bg-blue-100 text-blue-700",
        seller: "bg-orange-100 text-orange-700",
        rider: "bg-purple-100 text-purple-700",
        admin: "bg-red-100 text-red-700",
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Customers</h2>
                    <p className="text-xs text-gray-500">{total} total users</p>
                </div>
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text" placeholder="Search by name or email..."
                        value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full rounded-lg border bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-[#e23744] sm:w-72"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#e23744]"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                    <div>
                        {/* Mobile list view */}
                        <div className="block md:hidden divide-y">
                            {customers.map((c) => (
                                <div key={c._id} className="p-4 space-y-3 hover:bg-gray-50 transition">
                                    <div className="flex items-center justify-between" onClick={() => toggleExpand(c._id)}>
                                        <div className="flex items-center gap-3">
                                            <UserAvatar src={c.image} name={c.name} className="h-10 w-10" />
                                            <div>
                                                <p className="font-semibold text-gray-800">{c.name}</p>
                                                <p className="text-xs text-gray-500">{c.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleColor[c.role || ""] || "bg-gray-100 text-gray-600"}`}>
                                                {c.role || "none"}
                                            </span>
                                            {expandedId === c._id ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
                                        </div>
                                    </div>
                                    
                                    {/* Expanded orders inside card */}
                                    {expandedId === c._id && (
                                        <div className="bg-gray-50 rounded-lg p-3 space-y-2 mt-2">
                                            {orderMap[c._id] ? (
                                                orderMap[c._id].length > 0 ? (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold text-gray-600 border-b pb-1">Orders ({orderMap[c._id].length})</p>
                                                        {orderMap[c._id].slice(0, 5).map((o: any) => (
                                                            <div key={o._id} className="flex flex-col gap-1 rounded bg-white p-2 text-xs shadow-sm border border-gray-100">
                                                                <div className="flex justify-between">
                                                                    <span className="font-mono text-gray-500">#{String(o._id).slice(-6)}</span>
                                                                    <span className={`rounded-full px-1.5 py-0.2 font-semibold text-[10px] ${o.status === "delivered" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                                                        {o.status?.replace(/_/g, " ")}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between font-medium">
                                                                    <span>{o.restaurantName}</span>
                                                                    <span>₹{o.totalAmount}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400">No orders from this user</p>
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
                            {customers.length === 0 && (
                                <div className="p-8 text-center text-gray-400">No customers found</div>
                            )}
                        </div>

                        {/* Desktop view */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3"></th>
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Joined</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {customers.map((c) => (
                                        <>
                                            <tr key={c._id} className="hover:bg-gray-50 cursor-pointer transition" onClick={() => toggleExpand(c._id)}>
                                                <td className="px-4 py-3">
                                                    <UserAvatar src={c.image} name={c.name} className="h-8 w-8" />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                                                <td className="px-4 py-3 text-gray-500">{c.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleColor[c.role || ""] || "bg-gray-100 text-gray-600"}`}>
                                                        {c.role || "none"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-gray-400">
                                                    {expandedId === c._id ? <FiChevronUp /> : <FiChevronDown />}
                                                </td>
                                            </tr>
                                            {expandedId === c._id && (
                                                <tr key={`${c._id}-orders`}>
                                                    <td colSpan={6} className="bg-gray-50 px-6 py-4">
                                                        {orderMap[c._id] ? (
                                                            orderMap[c._id].length > 0 ? (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-semibold text-gray-600">Orders ({orderMap[c._id].length})</p>
                                                                    {orderMap[c._id].slice(0, 5).map((o: any) => (
                                                                        <div key={o._id} className="flex items-center justify-between rounded-lg bg-white px-4 py-2 text-xs shadow-sm">
                                                                            <span className="font-mono text-gray-500">#{String(o._id).slice(-6)}</span>
                                                                            <span>{o.restaurantName}</span>
                                                                            <span className="font-semibold">₹{o.totalAmount}</span>
                                                                            <span className={`rounded-full px-2 py-0.5 font-semibold ${o.status === "delivered" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                                                                {o.status?.replace(/_/g, " ")}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-400">No orders from this user</p>
                                                            )
                                                        ) : (
                                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#e23744]"></div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                    {customers.length === 0 && (
                                        <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No customers found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40">
                        Prev
                    </button>
                    <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40">
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminCustomers;
