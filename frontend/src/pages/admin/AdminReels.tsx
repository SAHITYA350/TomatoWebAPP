import { useState, useEffect } from "react";
import axios from "axios";
import { adminService } from "../../config";
import { getToken } from "../../utils/authStorage";
import { Skeleton } from "boneyard-js/react";
import { toast } from "react-hot-toast";
import { FiFilm, FiTrash2, FiHeart, FiMessageSquare, FiPlay } from "react-icons/fi";

interface ReelItem {
    _id: string;
    videoUrl: string;
    description: string;
    restaurantName: string;
    likes: string[];
    comments: any[];
    createdAt: string;
}

const AdminReels = () => {
    const [reels, setReels] = useState<ReelItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchReels = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const { data } = await axios.get(`${adminService}/api/v1/admin/reels?page=${page}&limit=12`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setReels(data.reels || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error("Failed to fetch food reels:", err);
            toast.error("Failed to load food reels.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReels();
    }, [page]);

    const handleDeleteReel = async (reelId: string) => {
        if (!window.confirm("Are you sure you want to delete this Food Reel? This action cannot be undone.")) return;

        setDeletingId(reelId);
        try {
            const token = getToken();
            await axios.delete(`${adminService}/api/v1/admin/reels/${reelId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Food Reel deleted successfully.");
            fetchReels();
        } catch (err) {
            toast.error("Failed to delete Food Reel.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Skeleton name="admin-reels" loading={loading}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FiFilm className="text-[#E23744]" /> Food Reels Management
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Monitor short-form video engagement across all partner restaurants ({total} total reels).
                        </p>
                    </div>
                </div>

                {/* Reels Grid */}
                {reels.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center text-gray-400 space-y-2 border border-gray-100">
                        <FiFilm className="mx-auto text-4xl text-gray-300" />
                        <p className="text-sm font-semibold text-gray-700">No Food Reels Uploaded Yet</p>
                        <p className="text-xs text-gray-400">Partner restaurants can upload promotional food reels from the Seller Portal.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {reels.map((reel) => (
                            <div key={reel._id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                                {/* Video Player / Container */}
                                <div className="relative aspect-[9/16] bg-black group">
                                    <video
                                        src={reel.videoUrl}
                                        className="h-full w-full object-cover"
                                        controls
                                        preload="metadata"
                                    />
                                    <span className="absolute top-3 left-3 text-[10px] bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold">
                                        {reel.restaurantName || "Restaurant"}
                                    </span>
                                </div>

                                {/* Content Details */}
                                <div className="p-4 space-y-3">
                                    <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-relaxed">
                                        {reel.description || "Food reel promo"}
                                    </p>

                                    {/* Stats & Delete */}
                                    <div className="flex items-center justify-between pt-2 border-t text-xs font-semibold text-gray-500">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1 text-pink-600">
                                                <FiHeart /> {reel.likes?.length || 0}
                                            </span>
                                            <span className="flex items-center gap-1 text-blue-600">
                                                <FiMessageSquare /> {reel.comments?.length || 0}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteReel(reel._id)}
                                            disabled={deletingId === reel._id}
                                            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition cursor-pointer disabled:opacity-50"
                                            title="Delete Reel"
                                        >
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-4">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3.5 py-1.5 rounded-lg border bg-white text-xs font-bold text-gray-700 disabled:opacity-40 cursor-pointer"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-bold text-gray-600 font-mono">Page {page} of {totalPages}</span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3.5 py-1.5 rounded-lg border bg-white text-xs font-bold text-gray-700 disabled:opacity-40 cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </Skeleton>
    );
};

export default AdminReels;
