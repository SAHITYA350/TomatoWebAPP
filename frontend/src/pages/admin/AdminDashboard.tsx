import { useState } from "react";
import { useAppData } from "../../context/AppContext";
import { FiGrid, FiUsers, FiShoppingBag, FiTruck, FiFileText, FiLogOut, FiMenu, FiX, FiMapPin, FiCpu, FiCompass } from "react-icons/fi";
import AdminOverview from "./AdminOverview";
import AdminCustomers from "./AdminCustomers";
import AdminRestaurants from "./AdminRestaurants";
import AdminRiders from "./AdminRiders";
import AdminOrders from "./AdminOrders";
import AdminLiveMap from "./AdminLiveMap";
import AdminControlTower from "./AdminControlTower";
import AdminDispatchEngine from "./AdminDispatchEngine";
import UserAvatar from "../../components/UserAvatar";
import Footer from "../../components/Footer";

type AdminTab = "overview" | "live-map" | "customers" | "restaurants" | "riders" | "orders" | "live-city-ops" | "rider-assignment";

const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Dashboard Overview", icon: <FiGrid /> },
    { key: "live-map", label: "Live Map", icon: <FiMapPin /> },
    { key: "customers", label: "Customers", icon: <FiUsers /> },
    { key: "restaurants", label: "Restaurants", icon: <FiShoppingBag /> },
    { key: "riders", label: "Riders Fleet", icon: <FiTruck /> },
    { key: "orders", label: "Orders Log", icon: <FiFileText /> },
    { key: "live-city-ops", label: "Operations Intelligence", icon: <FiCompass /> },
    { key: "rider-assignment", label: "Smart Rider Assignment", icon: <FiCpu /> },
];

const AdminDashboard = () => {
    const { user, logout } = useAppData();
    const [activeTab, setActiveTab] = useState<AdminTab>("overview");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout("admin");
    };

    const renderContent = () => {
        switch (activeTab) {
            case "overview": return <AdminOverview />;
            case "live-map": return <AdminLiveMap />;
            case "customers": return <AdminCustomers />;
            case "restaurants": return <AdminRestaurants />;
            case "riders": return <AdminRiders />;
            case "orders": return <AdminOrders />;
            case "live-city-ops": return <AdminControlTower />;
            case "rider-assignment": return <AdminDispatchEngine />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#000000] text-white transition-transform duration-300 lg:static lg:translate-x-0
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                {/* Logo */}
                <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
                    <span className="text-xl font-bold tracking-tight">
                        <span className="text-[#ff0202]"><i>🍅Tomato</i></span>
                        <span className="ml-1 text-sm font-normal opacity-60">Admin</span>
                    </span>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60 hover:text-white">
                        <FiX className="h-5 w-5" />
                    </button>
                </div>

                {/* User Info */}
                <div className="border-b border-white/10 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <UserAvatar src={user?.image} name={user?.name} className="h-9 w-9 ring-2 ring-[#e23744]/50" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{user?.name}</p>
                            <p className="truncate text-xs text-white/50">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {tabs.map((t) => (
                        <button key={t.key}
                            onClick={() => { setActiveTab(t.key); setSidebarOpen(false); }}
                            className={`flex w-full items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                                activeTab === t.key
                                    ? "bg-[#ff0015] text-white shadow-lg shadow-[#e23744]/25"
                                    : "text-white/60 hover:bg-white/5 hover:text-white"
                            }`}>
                            <span className="text-lg">{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </nav>

                {/* Logout */}
                <div className="border-t border-white/10 px-3 py-4">
                    <button onClick={handleLogout}
                        className="flex w-full items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-red-500/10 hover:text-red-400">
                        <FiLogOut className="text-lg" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm lg:px-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden">
                            <FiMenu className="h-5 w-5" />
                        </button>
                        <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                            {tabs.find(t => t.key === activeTab)?.label || "Dashboard Overview"}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden text-xs text-gray-400 sm:block">Admin Panel</span>
                        <span className="rounded-full bg-[#e23744]/10 px-2.5 py-0.5 text-xs font-semibold text-[#e23744]">Admin</span>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 flex flex-col justify-between">
                    <div>
                        {renderContent()}
                    </div>
                    <Footer />
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
