import { getToken } from "../../utils/authStorage";
import { useEffect, useState, Fragment } from "react";
import axios from "axios";
import { adminService } from "../../config";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const statusFilters = [
    { key: "all", label: "All" },
    { key: "placed", label: "Placed" },
    { key: "accepted", label: "Accepted" },
    { key: "preparing", label: "Preparing" },
    { key: "ready_for_rider", label: "Ready" },
    { key: "rider_assigned", label: "Assigned" },
    { key: "picked_up", label: "Picked Up" },
    { key: "delivered", label: "Delivered" },
];

const statusColor: Record<string, string> = {
    placed: "bg-blue-100 text-blue-700",
    accepted: "bg-indigo-100 text-indigo-700",
    preparing: "bg-yellow-100 text-yellow-700",
    ready_for_rider: "bg-orange-100 text-orange-700",
    rider_assigned: "bg-purple-100 text-purple-700",
    picked_up: "bg-cyan-100 text-cyan-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

const paymentColor: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-600",
};

const AdminOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchOrders = async (p = page, s = status) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${adminService}/api/v1/admin/orders`, {
                params: { page: p, limit: 15, status: s },
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setOrders(data.orders);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(1, status); setPage(1); }, [status]);
    useEffect(() => { fetchOrders(); }, [page]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-gray-800">Orders</h2>
                <p className="text-xs text-gray-500">{total} orders</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
                {statusFilters.map((f) => (
                    <button key={f.key} onClick={() => setStatus(f.key)}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                            status === f.key ? "bg-white text-[#e23744] shadow-sm" : "text-gray-500 hover:text-gray-700"
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
                        {/* Mobile view */}
                        <div className="block md:hidden divide-y">
                            {orders.map((o) => (
                                <div key={o._id} className="p-4 space-y-3 hover:bg-gray-50 transition" onClick={() => setExpandedId(expandedId === o._id ? null : o._id)}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-gray-500">#{String(o._id).slice(-8)}</span>
                                        <span className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold text-gray-800 text-sm">{o.restaurantName}</h4>
                                        <span className="font-bold text-gray-900">₹{o.totalAmount}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[o.status] || "bg-gray-100 text-gray-600"}`}>
                                                {o.status?.replace(/_/g, " ")}
                                            </span>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${paymentColor[o.paymentStatus] || "bg-gray-100 text-gray-600"}`}>
                                                {o.paymentStatus}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <span>{o.items?.length || 0} item(s)</span>
                                            {expandedId === o._id ? <FiChevronUp /> : <FiChevronDown />}
                                        </div>
                                    </div>

                                    {/* Expanded details inside card */}
                                    {expandedId === o._id && (
                                        <div className="bg-gray-50 rounded-lg p-3 space-y-3 mt-2 text-xs border border-gray-100" onClick={(e) => e.stopPropagation()}>
                                            {/* Items */}
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items</p>
                                                {o.items?.map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between bg-white px-2.5 py-1.5 rounded shadow-sm border border-gray-100">
                                                        <span>{item.name} × {item.quantity}</span>
                                                        <span className="font-semibold">₹{item.price * item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Pricing */}
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pricing Breakdown</p>
                                                <div className="bg-white p-2.5 rounded shadow-sm border border-gray-100 space-y-1">
                                                    <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{o.subtotal}</span></div>
                                                    <div className="flex justify-between text-gray-600"><span>Delivery Fee</span><span>₹{o.deliveryFee}</span></div>
                                                    <div className="flex justify-between text-gray-600"><span>Platform Fee</span><span>₹{o.platformFee}</span></div>
                                                    <div className="flex justify-between border-t pt-1 font-bold text-gray-800"><span>Total</span><span>₹{o.totalAmount}</span></div>
                                                    <div className="flex justify-between text-gray-400 text-[10px]"><span>Rider Pay / Distance</span><span>₹{o.riderAmount} / {o.distance} km</span></div>
                                                </div>
                                            </div>

                                            {/* Delivery */}
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Delivery Details</p>
                                                <div className="bg-white p-2.5 rounded shadow-sm border border-gray-100 space-y-1 text-gray-700">
                                                    <p><span className="text-gray-400 font-sans">Address: </span>{o.deliveryAddress?.formattedAddress || "—"}</p>
                                                    <p><span className="text-gray-400 font-sans">Mobile: </span>{o.deliveryAddress?.mobile || "—"}</p>
                                                    <p><span className="text-gray-400 font-sans">Method: </span><span className="uppercase">{o.paymentMethod}</span></p>
                                                    {o.riderId && (
                                                        <div className="border-t mt-1.5 pt-1.5 text-gray-600">
                                                            <p className="font-semibold text-[10px] text-gray-400 uppercase tracking-wider mb-1">Rider</p>
                                                            <p><span className="text-gray-400">Name: </span>{o.riderName || "—"}</p>
                                                            <p><span className="text-gray-400">Phone: </span>{o.riderPhone || "—"}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {orders.length === 0 && (
                                <div className="p-8 text-center text-gray-400">No orders found</div>
                            )}
                        </div>

                        {/* Desktop view */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3">Order ID</th>
                                        <th className="px-4 py-3">Restaurant</th>
                                        <th className="px-4 py-3">Items</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">Payment</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {orders.map((o) => (
                                        <Fragment key={o._id}>
                                            <tr className="hover:bg-gray-50 cursor-pointer transition"
                                                onClick={() => setExpandedId(expandedId === o._id ? null : o._id)}>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-600">#{String(o._id).slice(-8)}</td>
                                                <td className="px-4 py-3 font-medium text-gray-800">{o.restaurantName}</td>
                                                <td className="px-4 py-3 text-gray-600">{o.items?.length || 0}</td>
                                                <td className="px-4 py-3 font-semibold">₹{o.totalAmount}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paymentColor[o.paymentStatus] || "bg-gray-100 text-gray-600"}`}>
                                                        {o.paymentStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[o.status] || "bg-gray-100 text-gray-600"}`}>
                                                        {o.status?.replace(/_/g, " ")}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    {new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                                </td>
                                                <td className="px-4 py-3 text-gray-400">
                                                    {expandedId === o._id ? <FiChevronUp /> : <FiChevronDown />}
                                                </td>
                                            </tr>
                                            {expandedId === o._id && (
                                                <tr>
                                                    <td colSpan={8} className="bg-gray-50 px-6 py-4">
                                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                            {/* Items */}
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-semibold text-gray-600 uppercase">Items</p>
                                                                {o.items?.map((item: any, i: number) => (
                                                                    <div key={i} className="flex justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
                                                                        <span>{item.name} x {item.quantity}</span>
                                                                        <span className="font-semibold">₹{item.price * item.quantity}</span>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Pricing */}
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-semibold text-gray-600 uppercase">Pricing</p>
                                                                <div className="rounded-lg bg-white p-3 text-xs shadow-sm space-y-1">
                                                                    <div className="flex justify-between"><span>Subtotal</span><span>₹{o.subtotal}</span></div>
                                                                    <div className="flex justify-between"><span>Delivery Fee</span><span>₹{o.deliveryFee}</span></div>
                                                                    <div className="flex justify-between"><span>Platform Fee</span><span>₹{o.platformFee}</span></div>
                                                                    <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>₹{o.totalAmount}</span></div>
                                                                    <div className="flex justify-between text-gray-400"><span>Rider Amount</span><span>₹{o.riderAmount}</span></div>
                                                                    <div className="flex justify-between text-gray-400"><span>Distance</span><span>{o.distance} km</span></div>
                                                                </div>
                                                            </div>

                                                            {/* Delivery & Rider */}
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-semibold text-gray-600 uppercase">Delivery</p>
                                                                <div className="rounded-lg bg-white p-3 text-xs shadow-sm space-y-1">
                                                                    <p><span className="text-gray-400">Address: </span>{o.deliveryAddress?.formattedAddress || "—"}</p>
                                                                    <p><span className="text-gray-400">Mobile: </span>{o.deliveryAddress?.mobile || "—"}</p>
                                                                    <p><span className="text-gray-400">Payment: </span>{o.paymentMethod}</p>
                                                                    {o.riderId && (
                                                                        <>
                                                                            <div className="border-t mt-2 pt-2">
                                                                                <p className="font-semibold text-gray-600">Rider Info</p>
                                                                                <p><span className="text-gray-400">Name: </span>{o.riderName || "—"}</p>
                                                                                <p><span className="text-gray-400">Phone: </span>{o.riderPhone || "—"}</p>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                    {orders.length === 0 && (
                                        <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
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

export default AdminOrders;
