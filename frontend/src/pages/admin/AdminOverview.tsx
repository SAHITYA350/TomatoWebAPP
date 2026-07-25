import { getToken } from "../../utils/authStorage";
import { useEffect, useState } from "react";
import { Skeleton } from 'boneyard-js/react';
import axios from "axios";
import { adminService } from "../../config";
import { FiUsers, FiShoppingBag, FiTruck, FiDollarSign, FiTrendingUp, FiClock } from "react-icons/fi";

interface DashboardStats {
    users: { total: number; customers: number; sellers: number; riders: number };
    restaurants: { total: number; verified: number; pending: number; open: number };
    riders: { total: number; verified: number; pending: number; online: number };
    orders: { total: number; statusBreakdown: Record<string, number> };
    revenue: { total: number; today: number };
    todayOrders: number;
    recentOrders: any[];
}

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

const AdminOverview = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await axios.get(`${adminService}/api/v1/admin/dashboard/stats`, {
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                setStats(data);
            } catch (error) {
                console.error("Failed to load dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // if (loading) {
    //     return (
    //         <div className="flex h-[60vh] items-center justify-center">
    //             <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#e23744]"></div>
    //         </div>
    //     );
    // }

    if (!loading && !stats) {
        return <p className="p-6 text-gray-500">Failed to load dashboard stats.</p>;
    }

    const cards = stats ? [
        { label: "Total Customers", value: stats.users.customers, icon: <FiUsers />, bgClass: "bg-[#E23744]" },
        { label: "Total Restaurants", value: stats.restaurants.total, icon: <FiShoppingBag />, bgClass: "bg-[#E23744]" },
        { label: "Total Riders", value: stats.riders.total, icon: <FiTruck />, bgClass: "bg-[#E23744]" },
        { label: "Total Orders", value: stats.orders.total, icon: <FiClock />, bgClass: "bg-[#E23744]" },
        { label: "Total Revenue", value: `₹${stats.revenue.total.toLocaleString("en-IN")}`, icon: <FiDollarSign />, bgClass: "bg-[#E23744]" },
        { label: "Today's Revenue", value: `₹${stats.revenue.today.toLocaleString("en-IN")}`, icon: <FiTrendingUp />, bgClass: "bg-[#E23744]" },
    ] : [];

    return (
        <Skeleton name="admin-overview" loading={loading}>
            {stats && (
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {cards.map((c) => (
                            <div key={c.label} className={`relative overflow-hidden rounded-xl ${c.bgClass} p-5 text-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
                                <div className="absolute -right-3 -top-3 text-6xl opacity-15">{c.icon}</div>
                                <p className="text-sm font-medium opacity-90">{c.label}</p>
                                <p className="mt-1 text-2xl font-bold">{c.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                            <p className="text-xs font-medium text-gray-500 uppercase">Pending Restaurants</p>
                            <p className="mt-1 text-xl font-bold text-orange-600">{stats.restaurants.pending}</p>
                        </div>
                        <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                            <p className="text-xs font-medium text-gray-500 uppercase">Pending Riders</p>
                            <p className="mt-1 text-xl font-bold text-purple-600">{stats.riders.pending}</p>
                        </div>
                        <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                            <p className="text-xs font-medium text-gray-500 uppercase">Riders Online</p>
                            <p className="mt-1 text-xl font-bold text-green-600">{stats.riders.online}</p>
                        </div>
                        <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                            <p className="text-xs font-medium text-gray-500 uppercase">Today's Orders</p>
                            <p className="mt-1 text-xl font-bold text-blue-600">{stats.todayOrders}</p>
                        </div>
                    </div>

                    {/* Order Status Breakdown */}
                    {Object.keys(stats.orders.statusBreakdown).length > 0 && (
                        <div className="rounded-xl border bg-white p-5 shadow-sm">
                            <h3 className="mb-3 text-sm font-semibold text-gray-700">Order Status Breakdown</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.orders.statusBreakdown).map(([status, count]) => (
                                    <span key={status} className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[status] || "bg-gray-100 text-gray-700"}`}>
                                        {status.replace(/_/g, " ")} — {count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent Orders */}
                    <div className="rounded-xl border bg-white shadow-sm">
                        <div className="border-b px-5 py-3">
                            <h3 className="text-sm font-semibold text-gray-700">Recent Orders</h3>
                        </div>
                        <div>
                            {/* Mobile list view */}
                            <div className="block md:hidden divide-y">
                                {stats.recentOrders.map((o: any) => (
                                    <div key={o._id} className="p-4 space-y-2 hover:bg-gray-50 transition">
                                        <div className="flex justify-between items-center">
                                            <span className="font-mono text-xs text-gray-500">#{String(o._id).slice(-8)}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[o.status] || "bg-gray-100 text-gray-700"}`}>
                                                {o.status?.replace(/_/g, " ")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-800">{o.restaurantName}</span>
                                            <span className="font-semibold text-gray-900">₹{o.totalAmount}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            {new Date(o.createdAt).toLocaleString("en-IN")}
                                        </div>
                                    </div>
                                ))}
                                {stats.recentOrders.length === 0 && (
                                    <div className="p-8 text-center text-gray-400">No orders yet</div>
                                )}
                            </div>

                            {/* Desktop view */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                                        <tr>
                                            <th className="px-5 py-3">Order ID</th>
                                            <th className="px-5 py-3">Restaurant</th>
                                            <th className="px-5 py-3">Amount</th>
                                            <th className="px-5 py-3">Status</th>
                                            <th className="px-5 py-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {stats.recentOrders.map((o: any) => (
                                            <tr key={o._id} className="hover:bg-gray-50 transition">
                                                <td className="px-5 py-3 font-mono text-xs text-gray-600">{String(o._id).slice(-8)}</td>
                                                <td className="px-5 py-3">{o.restaurantName}</td>
                                                <td className="px-5 py-3 font-semibold">₹{o.totalAmount}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[o.status] || "bg-gray-100 text-gray-700"}`}>
                                                        {o.status?.replace(/_/g, " ")}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-gray-500 text-xs">{new Date(o.createdAt).toLocaleString("en-IN")}</td>
                                            </tr>
                                        ))}
                                        {stats.recentOrders.length === 0 && (
                                            <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No orders yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Skeleton>
    );
};

export default AdminOverview;
