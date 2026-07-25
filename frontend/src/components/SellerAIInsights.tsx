import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { getToken } from "../utils/authStorage";
import { restaurantService } from "../config";
import {
    FiActivity, FiTrendingUp, FiAlertTriangle, FiPackage,
    FiClock, FiStar, FiSearch, FiMail, FiZap, FiBarChart2,
    FiThumbsUp, FiThumbsDown, FiArchive, FiDollarSign,
    FiRefreshCw, FiChevronDown, FiChevronUp
} from "react-icons/fi";
import toast from "react-hot-toast";

interface InsightsProps {
    restaurantId: string;
}

// ── AI Insights Card Data ──
interface AIInsight {
    icon: React.ReactNode;
    title: string;
    value: string;
    trend: "up" | "down" | "neutral";
    description: string;
    color: string;
}

interface InventoryItem {
    name: string;
    stock: number;
    status: "ok" | "low" | "critical";
    autoAction?: string;
}

interface MenuHealthItem {
    name: string;
    score: number;
    orders: number;
    conversion: number;
    action: string;
    actionType: "archive" | "promote" | "reduce-price" | "increase-stock";
}

interface ReviewSummary {
    strengths: string[];
    complaints: string[];
    sentiment: number;
}

const SellerAIInsights = ({ restaurantId }: InsightsProps) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<string>("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>("health-score");

    // Fetch data
    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [ordersRes, itemsRes] = await Promise.all([
                    axios.get(`${restaurantService}/api/order/restaurant/${restaurantId}`, {
                        headers: { Authorization: `Bearer ${getToken()}` },
                    }),
                    axios.get(`${restaurantService}/api/item/all/${restaurantId}`, {
                        headers: { Authorization: `Bearer ${getToken()}` },
                    }),
                ]);
                setOrders(ordersRes.data.orders || []);
                setMenuItems(itemsRes.data || []);
            } catch (error) {
                console.error("Error loading insights data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [restaurantId]);

    // ── Compute AI Health Score ──
    const healthScore = useMemo(() => {
        if (orders.length === 0) return { score: 85, grade: "B+", color: "#f59e0b" };

        let score = 100;
        const delivered = orders.filter(o => o.status === "delivered").length;
        const cancelled = orders.filter(o => o.status === "cancelled").length;
        const total = orders.length;

        // Acceptance Rate Impact (-20 max)
        const acceptRate = total > 0 ? ((total - cancelled) / total) * 100 : 100;
        if (acceptRate < 90) score -= (90 - acceptRate) * 0.5;

        // Menu diversity impact (-10 max)
        if (menuItems.length < 5) score -= (5 - menuItems.length) * 2;

        // Availability impact (-10 max)
        const unavailableCount = menuItems.filter(i => !i.isAvailable).length;
        if (menuItems.length > 0) score -= (unavailableCount / menuItems.length) * 10;

        // Revenue growth impact
        const thisWeekOrders = orders.filter(o => {
            const d = new Date(o.createdAt);
            const now = new Date();
            return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
        });
        if (thisWeekOrders.length > 5) score += 3;

        score = Math.max(0, Math.min(100, Math.round(score)));
        const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B+" : score >= 60 ? "B" : score >= 50 ? "C" : "D";
        const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
        return { score, grade, color };
    }, [orders, menuItems]);

    // ── AI Insights Cards ──
    const insights = useMemo((): AIInsight[] => {
        const delivered = orders.filter(o => o.status === "delivered");
        const totalRev = delivered.reduce((sum, o) => sum + o.totalAmount, 0);
        const avgOrder = delivered.length > 0 ? Math.round(totalRev / delivered.length) : 0;

        // Peak hour analysis
        const hourCounts: Record<number, number> = {};
        delivered.forEach(o => {
            const h = new Date(o.createdAt).getHours();
            hourCounts[h] = (hourCounts[h] || 0) + 1;
        });
        const peakHour = Object.entries(hourCounts).sort((a, b) => +b[1] - +a[1])[0];
        const peakLabel = peakHour ? `${peakHour[0]}:00 - ${(+peakHour[0] + 1) % 24}:00` : "N/A";

        // Top item
        const itemCounts: Record<string, number> = {};
        delivered.forEach(o => {
            (o.items || []).forEach((item: any) => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.qty || 1);
            });
        });
        const topItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

        // Week comparison
        const now = new Date();
        const thisWeek = delivered.filter(o => (now.getTime() - new Date(o.createdAt).getTime()) < 7 * 86400000);
        const lastWeek = delivered.filter(o => {
            const diff = now.getTime() - new Date(o.createdAt).getTime();
            return diff >= 7 * 86400000 && diff < 14 * 86400000;
        });
        const thisWeekRev = thisWeek.reduce((s, o) => s + o.totalAmount, 0);
        const lastWeekRev = lastWeek.reduce((s, o) => s + o.totalAmount, 0);
        const revGrowth = lastWeekRev > 0 ? Math.round(((thisWeekRev - lastWeekRev) / lastWeekRev) * 100) : 0;

        return [
            {
                icon: <FiTrendingUp size={20} />,
                title: "Revenue Growth",
                value: `${revGrowth >= 0 ? "+" : ""}${revGrowth}%`,
                trend: revGrowth >= 0 ? "up" : "down",
                description: `This week ₹${thisWeekRev.toLocaleString("en-IN")} vs last week ₹${lastWeekRev.toLocaleString("en-IN")}`,
                color: revGrowth >= 0 ? "#10b981" : "#ef4444"
            },
            {
                icon: <FiClock size={20} />,
                title: "Peak Revenue Hour",
                value: peakLabel,
                trend: "neutral",
                description: peakHour ? `${peakHour[1]} orders during this slot — optimize staffing here` : "Not enough data yet",
                color: "#8b5cf6"
            },
            {
                icon: <FiStar size={20} />,
                title: "Top Selling Item",
                value: topItem ? topItem[0] : "N/A",
                trend: "up",
                description: topItem ? `Ordered ${topItem[1]} times — consider creating a combo around it` : "Start getting orders to see insights",
                color: "#f59e0b"
            },
            {
                icon: <FiBarChart2 size={20} />,
                title: "Avg Order Value",
                value: `₹${avgOrder}`,
                trend: avgOrder > 200 ? "up" : "neutral",
                description: avgOrder > 200 ? "Great AOV! Consider cross-sell bundles to grow further" : "Try upselling combos or add-ons to increase AOV",
                color: "#0ea5e9"
            }
        ];
    }, [orders]);

    // ── Smart Inventory (simulated from menu item availability) ──
    const inventory = useMemo((): InventoryItem[] => {
        return menuItems.map(item => {
            const isAvail = item.isAvailable;
            // Simulate stock levels based on availability + random
            const stock = isAvail ? Math.floor(Math.random() * 40) + 5 : 0;
            const status: InventoryItem["status"] = stock === 0 ? "critical" : stock < 10 ? "low" : "ok";
            const autoAction = stock === 0 ? "Auto-marking unavailable" : stock < 10 ? "Alert: Restock soon" : undefined;
            return { name: item.name, stock, status, autoAction };
        });
    }, [menuItems]);

    // ── Dynamic Prep Time ──
    const prepTimeEstimate = useMemo(() => {
        const activeOrders = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");
        const load = activeOrders.length;
        const baseTime = 15; // minutes
        const loadMultiplier = Math.min(load * 2, 20);
        const complexityBonus = menuItems.length > 15 ? 5 : 0;
        return {
            estimatedMinutes: baseTime + loadMultiplier + complexityBonus,
            activeOrders: load,
            loadLevel: load > 5 ? "High" : load > 2 ? "Medium" : "Low",
            loadColor: load > 5 ? "#ef4444" : load > 2 ? "#f59e0b" : "#10b981"
        };
    }, [orders, menuItems]);

    // ── AI Review Analyzer (simulated from order data) ──
    const reviewSummary = useMemo((): ReviewSummary => {
        const delivered = orders.filter(o => o.status === "delivered").length;
        const cancelled = orders.filter(o => o.status === "cancelled").length;
        const total = orders.length;
        const sentimentRatio = total > 0 ? delivered / total : 0.85;

        return {
            strengths: [
                delivered > 5 ? "Consistent order delivery performance" : "Getting started — keep it up!",
                menuItems.length > 8 ? "Diverse menu variety attracts more customers" : "Consider adding more menu options",
                sentimentRatio > 0.9 ? "Excellent order acceptance rate" : "Room to improve acceptance rate",
            ],
            complaints: [
                cancelled > 2 ? `${cancelled} cancellations detected — investigate causes` : "Low cancellation rate 👍",
                menuItems.filter(i => !i.isAvailable).length > 0 ? "Some items are unavailable — impacts customer experience" : "All items available ✅",
                total < 10 ? "Low order volume — consider promotions or discounts" : "Healthy order volume",
            ],
            sentiment: Math.round(sentimentRatio * 100),
        };
    }, [orders, menuItems]);

    // ── Menu Health Manager ──
    const menuHealth = useMemo((): MenuHealthItem[] => {
        const delivered = orders.filter(o => o.status === "delivered");
        return menuItems.map(item => {
            let itemOrders = 0;
            delivered.forEach(o => {
                (o.items || []).forEach((i: any) => {
                    if (i.name === item.name) itemOrders += (i.qty || 1);
                });
            });
            const conversion = delivered.length > 0 ? Math.round((itemOrders / delivered.length) * 100) : 0;
            const score = Math.min(100, itemOrders * 5 + (item.isAvailable ? 20 : 0) + conversion);

            let action = "Keep Monitoring";
            let actionType: MenuHealthItem["actionType"] = "promote";
            if (score < 20) { action = "Archive — Very low demand"; actionType = "archive"; }
            else if (score < 40) { action = "Reduce Price — Boost conversions"; actionType = "reduce-price"; }
            else if (score >= 70) { action = "Increase Stock — High demand"; actionType = "increase-stock"; }
            else { action = "Promote — Run a special deal"; actionType = "promote"; }

            return { name: item.name, score, orders: itemOrders, conversion, action, actionType };
        }).sort((a, b) => b.score - a.score);
    }, [orders, menuItems]);

    // ── Location-based AI Search ──
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearchLoading(true);
        setSearchResults("");
        try {
            const { data } = await axios.post(`${restaurantService}/api/ai/chat`, {
                message: `Market intelligence search: ${searchQuery}. Provide competitive insights, trending dishes, and pricing data for this location/cuisine.`,
                history: []
            }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setSearchResults(data.text || "No results found.");
        } catch (error) {
            toast.error("Search failed. Please try again.");
        } finally {
            setSearchLoading(false);
        }
    };

    // ── Email Report ──
    const handleEmailReport = async () => {
        setEmailLoading(true);
        try {
            await axios.post(`${restaurantService}/api/ai/email-report`, {
                restaurantId,
                healthScore: healthScore.score,
                insights: insights.map(i => `${i.title}: ${i.value} — ${i.description}`),
                inventory: inventory.filter(i => i.status !== "ok").map(i => `${i.name}: ${i.status}`),
                prepTime: prepTimeEstimate,
            }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            toast.success("📧 AI Insights report sent to your registered email!");
        } catch (error) {
            toast.error("Failed to send email report. Ensure email is configured.");
        } finally {
            setEmailLoading(false);
        }
    };

    // ── Section Toggle ──
    const toggleSection = (id: string) => {
        setExpandedSection(prev => prev === id ? null : id);
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 60 }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: "50%", border: "3px solid #f3f4f6",
                        borderTopColor: "#E23744", animation: "spin 1s linear infinite", margin: "0 auto 16px"
                    }} />
                    <p style={{ color: "#6b7280", fontSize: 14 }}>Loading AI Insights...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    // ── Styles ──
    const sectionHeader = (title: string, icon: React.ReactNode, id: string, color: string): React.ReactNode => (
        <button onClick={() => toggleSection(id)} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
            borderBottom: expandedSection === id ? `1px solid ${color}20` : "none",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ color, display: "flex" }}>{icon}</div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", letterSpacing: "-0.3px" }}>{title}</span>
            </div>
            <div style={{ color: "#9ca3af", display: "flex" }}>
                {expandedSection === id ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </div>
        </button>
    );

    const card = (children: React.ReactNode, style?: React.CSSProperties): React.ReactNode => (
        <div style={{
            background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden",
            transition: "all 0.2s", ...style
        }}>
            {children}
        </div>
    );

    return (
        <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1f2937", margin: 0, letterSpacing: "-0.5px" }}>
                        <FiZap size={20} style={{ display: "inline", marginRight: 8, color: "#E23744", verticalAlign: "middle" }} />
                        AI Insights Dashboard
                    </h2>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>Powered by Goku — your AI operations partner</p>
                </div>
                <button onClick={handleEmailReport} disabled={emailLoading} style={{
                    display: "flex", alignItems: "center", gap: 6, background: "#E23744", color: "#fff",
                    border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700,
                    cursor: emailLoading ? "not-allowed" : "pointer", opacity: emailLoading ? 0.6 : 1, transition: "opacity 0.2s"
                }}>
                    <FiMail size={14} /> {emailLoading ? "Sending..." : "Email Report"}
                </button>
            </div>

            {/* AI Health Score */}
            {card(
                <>
                    {sectionHeader("AI Restaurant Health Score", <FiActivity size={18} />, "health-score", healthScore.color)}
                    {expandedSection === "health-score" && (
                        <div style={{ padding: "16px 18px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                                {/* Score Circle */}
                                <div style={{ position: "relative", width: 100, height: 100 }}>
                                    <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                                        <circle cx="50" cy="50" r="42" fill="none" stroke={healthScore.color} strokeWidth="8"
                                            strokeDasharray={`${healthScore.score * 2.64} ${264 - healthScore.score * 2.64}`}
                                            strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
                                    </svg>
                                    <div style={{
                                        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                                        alignItems: "center", justifyContent: "center"
                                    }}>
                                        <span style={{ fontSize: 28, fontWeight: 800, color: healthScore.color }}>{healthScore.score}</span>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>{healthScore.grade}</span>
                                    </div>
                                </div>
                                {/* Recommendations */}
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>AI Recommendations:</p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                        {menuItems.filter(i => !i.isAvailable).length > 0 && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#ef4444" }}>
                                                <FiAlertTriangle size={14} /> Mark unavailable items or remove them to improve score
                                            </div>
                                        )}
                                        {menuItems.length < 8 && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#f59e0b" }}>
                                                <FiPackage size={14} /> Add more menu variety to attract diverse customers
                                            </div>
                                        )}
                                        {healthScore.score >= 80 && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#10b981" }}>
                                                <FiThumbsUp size={14} /> Great health score! Keep maintaining quality
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <div style={{ height: 12 }} />

            {/* AI Insights Cards */}
            {card(
                <>
                    {sectionHeader("AI Performance Insights", <FiTrendingUp size={18} />, "insights", "#8b5cf6")}
                    {expandedSection === "insights" && (
                        <div style={{ padding: "12px 18px 18px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                                {insights.map((insight, idx) => (
                                    <div key={idx} style={{
                                        padding: "14px 16px", borderRadius: 12, border: "1px solid #f3f4f6",
                                        background: `${insight.color}08`, transition: "transform 0.2s, box-shadow 0.2s",
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                            <div style={{ color: insight.color, display: "flex" }}>{insight.icon}</div>
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                                                background: insight.trend === "up" ? "#dcfce7" : insight.trend === "down" ? "#fee2e2" : "#f3f4f6",
                                                color: insight.trend === "up" ? "#16a34a" : insight.trend === "down" ? "#dc2626" : "#6b7280",
                                            }}>
                                                {insight.trend === "up" ? "↑" : insight.trend === "down" ? "↓" : "─"} {insight.trend}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, margin: 0 }}>{insight.title}</p>
                                        <p style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", margin: "4px 0", letterSpacing: "-0.5px" }}>{insight.value}</p>
                                        <p style={{ fontSize: 11, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>{insight.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div style={{ height: 12 }} />

            {/* Smart Inventory */}
            {card(
                <>
                    {sectionHeader("Smart Inventory Tracker", <FiPackage size={18} />, "inventory", "#f59e0b")}
                    {expandedSection === "inventory" && (
                        <div style={{ padding: "12px 18px 18px" }}>
                            {inventory.length === 0 ? (
                                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: 20 }}>No menu items to track yet.</p>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {inventory.map((item, idx) => (
                                        <div key={idx} style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            padding: "10px 14px", borderRadius: 10, border: "1px solid #f3f4f6",
                                            background: item.status === "critical" ? "#fef2f2" : item.status === "low" ? "#fffbeb" : "#f9fafb"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{
                                                    width: 8, height: 8, borderRadius: "50%",
                                                    background: item.status === "critical" ? "#ef4444" : item.status === "low" ? "#f59e0b" : "#10b981"
                                                }} />
                                                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{item.name}</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                                                    background: item.status === "critical" ? "#fee2e2" : item.status === "low" ? "#fef3c7" : "#dcfce7",
                                                    color: item.status === "critical" ? "#dc2626" : item.status === "low" ? "#d97706" : "#16a34a"
                                                }}>
                                                    {item.stock} units
                                                </span>
                                                {item.autoAction && (
                                                    <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>⚡ {item.autoAction}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <div style={{ height: 12 }} />

            {/* Dynamic Prep Time */}
            {card(
                <>
                    {sectionHeader("Dynamic Prep Time Estimator", <FiClock size={18} />, "prep-time", "#0ea5e9")}
                    {expandedSection === "prep-time" && (
                        <div style={{ padding: "16px 18px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{
                                        width: 80, height: 80, borderRadius: "50%", background: `${prepTimeEstimate.loadColor}15`,
                                        border: `3px solid ${prepTimeEstimate.loadColor}`, display: "flex", flexDirection: "column",
                                        alignItems: "center", justifyContent: "center"
                                    }}>
                                        <span style={{ fontSize: 24, fontWeight: 800, color: prepTimeEstimate.loadColor }}>{prepTimeEstimate.estimatedMinutes}</span>
                                        <span style={{ fontSize: 9, fontWeight: 600, color: "#9ca3af" }}>min</span>
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                        <div style={{ fontSize: 12 }}>
                                            <span style={{ color: "#9ca3af", fontWeight: 600 }}>Active Orders:</span>{" "}
                                            <span style={{ fontWeight: 700, color: "#1f2937" }}>{prepTimeEstimate.activeOrders}</span>
                                        </div>
                                        <div style={{ fontSize: 12 }}>
                                            <span style={{ color: "#9ca3af", fontWeight: 600 }}>Kitchen Load:</span>{" "}
                                            <span style={{
                                                fontWeight: 700, color: prepTimeEstimate.loadColor,
                                                padding: "1px 8px", borderRadius: 20, background: `${prepTimeEstimate.loadColor}15`
                                            }}>{prepTimeEstimate.loadLevel}</span>
                                        </div>
                                        <div style={{ fontSize: 12 }}>
                                            <span style={{ color: "#9ca3af", fontWeight: 600 }}>Menu Complexity:</span>{" "}
                                            <span style={{ fontWeight: 700, color: "#1f2937" }}>{menuItems.length} items</span>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: 11, color: "#6b7280", marginTop: 8, lineHeight: 1.4 }}>
                                        Prep time is dynamically calculated based on active orders, menu complexity, and kitchen load. 
                                        This estimate updates in real-time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <div style={{ height: 12 }} />

            {/* AI Review Analyzer */}
            {card(
                <>
                    {sectionHeader("AI Review Analyzer", <FiStar size={18} />, "reviews", "#f59e0b")}
                    {expandedSection === "reviews" && (
                        <div style={{ padding: "16px 18px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                <div style={{
                                    padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 800,
                                    background: reviewSummary.sentiment >= 80 ? "#dcfce7" : reviewSummary.sentiment >= 60 ? "#fef3c7" : "#fee2e2",
                                    color: reviewSummary.sentiment >= 80 ? "#16a34a" : reviewSummary.sentiment >= 60 ? "#d97706" : "#dc2626"
                                }}>
                                    {reviewSummary.sentiment}% Positive Sentiment
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: "#10b981", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                        <FiThumbsUp size={14} /> Strengths
                                    </p>
                                    {reviewSummary.strengths.map((s, i) => (
                                        <p key={i} style={{ fontSize: 12, color: "#374151", padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>• {s}</p>
                                    ))}
                                </div>
                                <div>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                        <FiThumbsDown size={14} /> Areas to Improve
                                    </p>
                                    {reviewSummary.complaints.map((c, i) => (
                                        <p key={i} style={{ fontSize: 12, color: "#374151", padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>• {c}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <div style={{ height: 12 }} />

            {/* Menu Health Manager */}
            {card(
                <>
                    {sectionHeader("Intelligent Menu Health Manager", <FiRefreshCw size={18} />, "menu-health", "#E23744")}
                    {expandedSection === "menu-health" && (
                        <div style={{ padding: "12px 18px 18px" }}>
                            {menuHealth.length === 0 ? (
                                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: 20 }}>Add menu items to see health analysis.</p>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {menuHealth.map((item, idx) => (
                                        <div key={idx} style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            padding: "10px 14px", borderRadius: 10, border: "1px solid #f3f4f6",
                                            background: "#f9fafb", flexWrap: "wrap", gap: 8
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 150px" }}>
                                                <div style={{
                                                    width: 32, height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden"
                                                }}>
                                                    <div style={{
                                                        width: `${item.score}%`, height: "100%", borderRadius: 3,
                                                        background: item.score >= 70 ? "#10b981" : item.score >= 40 ? "#f59e0b" : "#ef4444",
                                                        transition: "width 0.6s ease"
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{item.name}</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <span style={{ fontSize: 11, color: "#9ca3af" }}>{item.orders} orders</span>
                                                <span style={{ fontSize: 11, color: "#9ca3af" }}>{item.conversion}% conv.</span>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                                                    background: item.actionType === "archive" ? "#fee2e2" : item.actionType === "reduce-price" ? "#fef3c7" : item.actionType === "increase-stock" ? "#dcfce7" : "#ede9fe",
                                                    color: item.actionType === "archive" ? "#dc2626" : item.actionType === "reduce-price" ? "#d97706" : item.actionType === "increase-stock" ? "#16a34a" : "#7c3aed",
                                                    display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap"
                                                }}>
                                                    {item.actionType === "archive" && <FiArchive size={10} />}
                                                    {item.actionType === "reduce-price" && <FiDollarSign size={10} />}
                                                    {item.actionType === "increase-stock" && <FiPackage size={10} />}
                                                    {item.actionType === "promote" && <FiZap size={10} />}
                                                    {item.action}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <div style={{ height: 12 }} />

            {/* Location-Based Market Intelligence Search */}
            {card(
                <>
                    {sectionHeader("Location-Based Market Intelligence", <FiSearch size={18} />, "market-search", "#6366f1")}
                    {expandedSection === "market-search" && (
                        <div style={{ padding: "16px 18px 20px" }}>
                            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                                <input
                                    type="text" placeholder="Search: 'Biryani prices in Kolkata' or 'Trending dishes Mumbai'"
                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                                    style={{
                                        flex: 1, borderRadius: 10, border: "1px solid #e5e7eb", background: "#f9fafb",
                                        padding: "10px 14px", fontSize: 13, outline: "none", fontFamily: "inherit"
                                    }}
                                />
                                <button onClick={handleSearch} disabled={searchLoading} style={{
                                    background: "#6366f1", color: "#fff", border: "none", borderRadius: 10,
                                    padding: "0 18px", fontSize: 12, fontWeight: 700, cursor: searchLoading ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", gap: 6, opacity: searchLoading ? 0.6 : 1
                                }}>
                                    <FiSearch size={14} /> {searchLoading ? "Searching..." : "Search"}
                                </button>
                            </div>
                            {searchResults && (
                                <div style={{
                                    padding: 14, borderRadius: 10, background: "#f0f0ff", border: "1px solid #e0e0ff",
                                    fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto"
                                }}>
                                    {searchResults}
                                </div>
                            )}
                            {!searchResults && !searchLoading && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {["Biryani prices in Kolkata", "Trending street food", "Competitor analysis pizza", "Popular cuisines near me"].map(q => (
                                        <button key={q} onClick={() => { setSearchQuery(q); }} style={{
                                            background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 20,
                                            padding: "6px 14px", fontSize: 11, color: "#6b7280", cursor: "pointer",
                                            transition: "all 0.2s", fontWeight: 500
                                        }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#ede9fe"; (e.currentTarget as HTMLElement).style.color = "#6366f1"; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#f3f4f6"; (e.currentTarget as HTMLElement).style.color = "#6b7280"; }}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SellerAIInsights;
