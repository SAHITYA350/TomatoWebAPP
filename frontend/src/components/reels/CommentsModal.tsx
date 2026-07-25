import React, { useState, useEffect } from "react";
import axios from "axios";
import { reelsService } from "../../config";
import { getToken } from "../../utils/authStorage";
import { FiX, FiSend, FiMessageSquare } from "react-icons/fi";
import { toast } from "react-hot-toast";

interface Comment {
  _id: string;
  userId: string;
  userName: string;
  userImage?: string;
  text: string;
  createdAt: string;
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reelId: string;
  commentsCount: number;
  onCommentAdded: () => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  reelId,
  commentsCount,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && reelId) {
      fetchComments();
    }
  }, [isOpen, reelId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${reelsService}/api/reels/${reelId}/comments`);
      setComments(data.comments || []);
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const token = getToken("customer") || getToken();
    if (!token) {
      toast.error("Please log in to leave a comment.");
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axios.post(
        `${reelsService}/api/reels/${reelId}/comment`,
        { text: text.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.comment) {
        setComments(prev => [data.comment, ...prev]);
        setText("");
        toast.success("Comment posted!");
        onCommentAdded();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#12121e] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[75vh] sm:h-[600px] overflow-hidden border border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-[#12121e]/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <FiMessageSquare className="text-red-500 h-5 w-5" />
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
              Comments ({comments.length > 0 ? comments.length : commentsCount})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-gray-50 dark:divide-gray-800/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-gray-400 gap-2">
              <div className="h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6 space-y-2">
              <FiMessageSquare className="h-8 w-8 text-gray-300" />
              <p className="text-xs font-semibold">No comments yet</p>
              <p className="text-[11px] text-gray-400">Be the first to share your thoughts on this dish!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="pt-3 first:pt-0 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  {c.userImage ? (
                    <img src={c.userImage} alt={c.userName} className="h-full w-full object-cover" />
                  ) : (
                    c.userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                      {c.userName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 leading-relaxed break-words font-medium">
                    {c.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Footer */}
        <form onSubmit={handlePostComment} className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-[#181828]/80 flex items-center gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-red-500 transition placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="h-9 w-9 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-50 transition shadow-md shrink-0 cursor-pointer"
          >
            <FiSend size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommentsModal;
