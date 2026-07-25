import React, { useState } from "react";
import axios from "axios";
import { riderService } from "../config";
import { getToken } from "../utils/authStorage";
import { FiX, FiSend, FiHelpCircle, FiBookOpen, FiShield } from "react-icons/fi";
import { toast } from "react-hot-toast";

interface RiderAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SOPAnswer {
  matchedCategory: string;
  title: string;
  answer: string;
  allMatchedDocs?: Array<{ title: string; category: string }>;
}

const SAMPLE_QUESTIONS = [
  "What should I do if the customer refuses the order?",
  "What happens if my bike has a puncture or accident?",
  "Customer is not answering the phone or wrong address?",
  "What to do if restaurant is taking too long to prepare food?",
  "Guidelines for heavy rain & storm delivery"
];

const RiderAIAssistantModal: React.FC<RiderAIAssistantModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SOPAnswer | null>(null);

  if (!isOpen) return null;

  const handleAskSOP = async (inputQuery: string) => {
    const q = inputQuery || query;
    if (!q.trim()) return;

    try {
      setLoading(true);
      const token = getToken("rider") || getToken();
      const { data } = await axios.post(
        `${riderService}/api/rider/ai/sop-rag`,
        { query: q },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResult(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to query SOP Knowledge Base.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-gray-950 border border-gray-800 rounded-3xl p-4 sm:p-6 text-white space-y-3.5 sm:space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-3 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-[#E23744] flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg shrink-0">
              🤖
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-xs sm:text-base text-white flex flex-wrap items-center gap-1 sm:gap-1.5 leading-tight">
                Rider AI SOP & RAG Assistant
                <span className="text-[9px] sm:text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full border border-red-500/30">
                  RAG Active
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">Official Delivery SOP & Emergency Knowledge Base</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition shrink-0"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Quick Sample Questions Pills */}
        <div className="space-y-1.5">
          <label className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <FiHelpCircle size={12} className="text-red-400" />
            Quick SOP Questions:
          </label>
          <div className="flex flex-wrap gap-1">
            {SAMPLE_QUESTIONS.map((sq, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(sq);
                  handleAskSOP(sq);
                }}
                className="px-2 py-1 rounded-xl bg-gray-900 border border-gray-800 hover:border-red-500/50 text-[10px] sm:text-[11px] text-gray-300 hover:text-white transition text-left cursor-pointer"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskSOP(query);
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gray-900 border border-gray-800 rounded-2xl p-2 focus-within:border-red-500 transition"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask any delivery SOP question..."
            className="flex-1 bg-transparent px-2 text-xs text-white placeholder-gray-500 focus:outline-none py-1"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-xl bg-[#E23744] hover:bg-red-600 font-extrabold text-xs text-white shadow-lg transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Search</span>
                <FiSend size={12} />
              </>
            )}
          </button>
        </form>

        {/* Answer Output Result */}
        {result && (
          <div className="p-3 sm:p-4 rounded-2xl bg-gray-900 border border-gray-800 space-y-2 sm:space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] sm:text-[10px] font-bold uppercase">
                <FiBookOpen size={11} />
                {result.matchedCategory || "SOP Guideline"}
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 font-mono">100% Policy Match</span>
            </div>

            <h4 className="font-extrabold text-xs sm:text-sm text-white">{result.title}</h4>

            <div className="text-[11px] sm:text-xs text-gray-300 whitespace-pre-line leading-relaxed font-sans bg-black/40 p-2.5 sm:p-3 rounded-xl border border-gray-800/60">
              {result.answer}
            </div>

            {result.allMatchedDocs && result.allMatchedDocs.length > 1 && (
              <div className="pt-2 border-t border-gray-800 text-[9px] sm:text-[10px] text-gray-400">
                <span className="font-bold text-gray-300">Related Manuals: </span>
                {result.allMatchedDocs.slice(1).map((d) => d.title).join(" • ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderAIAssistantModal;
