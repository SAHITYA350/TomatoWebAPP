import React, { useState } from "react";
import { FiChevronDown, FiBarChart2, FiActivity } from "react-icons/fi";

import RestaurantAnalytics from "./RestaurantAnalytics";
import RealTimeOperationsDashboard from "./RealTimeOperationsDashboard";
import MenuItems from "./MenuItems";
import AddMenuItem from "./AddMenuItem";
import type { IMenuItem } from "../types";

interface SellerDashboardLayoutProps {
    restaurantId: string;
    restaurantLat?: number;
    restaurantLng?: number;
    menuItems?: IMenuItem[];
    onMenuItemsChanged?: () => void;
    showHeader?: boolean;
    activeTab?: TabType;
    salesSubTab?: SalesSubTab;
    onTabChange?: (tab: TabType) => void;
    onSalesSubTabChange?: (subTab: SalesSubTab) => void;
}

type TabType = "sales" | "items" | "realtime";
type SalesSubTab = "overview" | "menu" | "add-item";

const SellerDashboardLayout: React.FC<SellerDashboardLayoutProps> = ({
    restaurantId,
    restaurantLat = 22.5726,
    restaurantLng = 88.3639,
    menuItems,
    onMenuItemsChanged,
    showHeader = true,
    activeTab: externalActiveTab,
    salesSubTab: externalSalesSubTab,
    onTabChange,
    onSalesSubTabChange,
}) => {
    const isControlled = externalActiveTab !== undefined && externalSalesSubTab !== undefined;
    const [internalActiveTab, setInternalActiveTab] = useState<TabType>("sales");
    const [internalSalesSubTab, setInternalSalesSubTab] = useState<SalesSubTab>("overview");
    const [showSalesMenu, setShowSalesMenu] = useState(false);

    const activeTab = externalActiveTab ?? internalActiveTab;
    const salesSubTab = externalSalesSubTab ?? internalSalesSubTab;

    const handleTabChange = (tab: TabType) => {
        if (!isControlled) {
            setInternalActiveTab(tab);
        }
        onTabChange?.(tab);
        setShowSalesMenu(false);
    };

    const handleSalesSubTabChange = (subTab: SalesSubTab) => {
        if (!isControlled) {
            setInternalActiveTab("sales");
            setInternalSalesSubTab(subTab);
        }
        onTabChange?.("sales");
        onSalesSubTabChange?.(subTab);
        setShowSalesMenu(false);
    };

    const tabs = [
        { id: "sales", label: "Sales", icon: FiBarChart2 },
        { id: "realtime", label: "Real-Time", icon: FiActivity }
    ];

    const content = (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {activeTab === "sales" && (
                <div className="animate-fadeIn">
                    {salesSubTab === "overview" && (
                        <RestaurantAnalytics
                            restaurantId={restaurantId}
                            location={{ lat: restaurantLat, lng: restaurantLng }}
                        />
                    )}
                    {salesSubTab === "menu" && (
                        <MenuItems
                            items={menuItems || []}
                            onItemDeleted={onMenuItemsChanged ?? (() => {})}
                            isSeller={true}
                        />
                    )}
                    {salesSubTab === "add-item" && (
                        <AddMenuItem onItemAdded={onMenuItemsChanged ?? (() => {})} />
                    )}
                </div>
            )}

            {activeTab === "realtime" && (
                <div className="animate-fadeIn">
                    <RealTimeOperationsDashboard
                        restaurantId={restaurantId}
                        restaurantLat={restaurantLat}
                        restaurantLng={restaurantLng}
                    />
                </div>
            )}

            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        @keyframes fadeIn {
                            from {
                                opacity: 0;
                                transform: translateY(4px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                        .animate-fadeIn {
                            animation: fadeIn 0.3s ease-out;
                        }
                    `,
                }}
            />
        </div>
    );

    if (!showHeader) {
        return <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">{content}</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-gray-900">Restaurant Dashboard</h1>
                </div>

                <div className="border-t border-gray-100 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            if (tab.id === "sales") {
                                return (
                                    <div key={tab.id} className="relative">
                                        <button
                                            onClick={() => {
                                                handleTabChange("sales");
                                                setShowSalesMenu(!showSalesMenu);
                                            }}
                                            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
                                                isActive
                                                    ? "border-red-500 text-red-600"
                                                    : "border-transparent text-gray-600 hover:text-gray-900"
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {tab.label}
                                            <FiChevronDown
                                                className={`h-4 w-4 transition ${showSalesMenu ? "rotate-180" : ""}`}
                                            />
                                        </button>

                                        {showSalesMenu && (
                                            <div className="absolute top-full left-0 mt-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-50 min-w-48">
                                                <button
                                                    onClick={() => handleSalesSubTabChange("overview")}
                                                    className={`w-full text-left px-4 py-2 text-sm transition ${
                                                        salesSubTab === "overview"
                                                            ? "bg-red-50 text-red-600 font-semibold"
                                                            : "text-gray-700 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    Sales Overview
                                                </button>
                                                <button
                                                    onClick={() => handleSalesSubTabChange("menu")}
                                                    className={`w-full text-left px-4 py-2 text-sm transition border-t ${
                                                        salesSubTab === "menu"
                                                            ? "bg-red-50 text-red-600 font-semibold"
                                                            : "text-gray-700 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    Menu Items
                                                </button>
                                                <button
                                                    onClick={() => handleSalesSubTabChange("add-item")}
                                                    className={`w-full text-left px-4 py-2 text-sm transition border-t ${
                                                        salesSubTab === "add-item"
                                                            ? "bg-red-50 text-red-600 font-semibold"
                                                            : "text-gray-700 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    Add Item
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id as TabType)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                                        isActive
                                            ? "border-red-500 text-red-600"
                                            : "border-transparent text-gray-600 hover:text-gray-900"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {content}
        </div>
    );
};

export default SellerDashboardLayout;
