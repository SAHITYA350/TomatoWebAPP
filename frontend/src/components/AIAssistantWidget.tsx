import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppData } from "../context/AppContext";
import { getToken } from "../utils/authStorage";
import { restaurantService } from "../config";
import axios from "axios";
import {
    FiSend, FiMic, FiMicOff,
    FiVolume2, FiVolumeX, FiX,
    FiMenu, FiPlus, FiTrash2, FiDownload, FiChevronDown
} from "react-icons/fi";
import toast from "react-hot-toast";

// ── Types ──
interface Message {
    role: "user" | "assistant";
    content: string;
    isVoice?: boolean;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
}

type AssistantState = "idle" | "listening" | "thinking" | "speaking";

// ── Helpers ──
const parseSpokenNumber = (str: string): number => {
    const wordToNum: { [key: string]: number } = {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
        twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
        hundred: 100, thousand: 1000
    };
    const words = str.toLowerCase().replace(/and/g, "").split(/\s+/);
    let total = 0;
    let temp = 0;
    for (const w of words) {
        if (wordToNum[w] !== undefined) {
            const val = wordToNum[w];
            if (val === 100) { temp = (temp || 1) * 100; }
            else if (val === 1000) { total += (temp || 1) * 1000; temp = 0; }
            else { temp += val; }
        } else if (/^\d+$/.test(w)) { temp += parseInt(w, 10); }
    }
    return total + temp;
};

const parseAddCommand = (transcript: string) => {
    const text = transcript.toLowerCase();
    const match = text.match(/add\s+item\s+(.+?)\s+price\s+(.+)$/);
    if (match) {
        const namePart = match[1].trim();
        const pricePart = match[2].trim();
        const parsedPrice = parseSpokenNumber(pricePart) || parseFloat(pricePart) || 0;
        return { name: namePart, price: parsedPrice };
    }
    return null;
};

const playChime = (type: "wake" | "send" | "success" | "error") => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        if (type === "wake") {
            osc.type = "sine"; osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(659.25, now + 0.12);
            gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now); osc.stop(now + 0.35);
        } else if (type === "send") {
            osc.type = "triangle"; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
            gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.start(now); osc.stop(now + 0.18);
        } else if (type === "success") {
            osc.type = "sine"; osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(659.25, now + 0.08); osc.frequency.setValueAtTime(783.99, now + 0.16);
            gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now); osc.stop(now + 0.4);
        } else if (type === "error") {
            osc.type = "sawtooth"; osc.frequency.setValueAtTime(120, now); osc.frequency.setValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        }
    } catch (e) { console.warn("Audio beep failed:", e); }
};

// ── CSS Keyframes (injected once) ──
const WIDGET_STYLES = `
@keyframes goku-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes goku-pulse-idle { 0%,100%{box-shadow:0 0 18px 4px rgba(226,55,68,0.45)} 50%{box-shadow:0 0 30px 8px rgba(226,55,68,0.7)} }
@keyframes goku-pulse-listen { 0%,100%{box-shadow:0 0 18px 4px rgba(0,210,255,0.5)} 50%{box-shadow:0 0 35px 10px rgba(0,210,255,0.8)} }
@keyframes goku-spin-think { 0%{box-shadow:0 0 18px 4px rgba(168,85,247,0.5);transform:rotate(0deg)} 100%{box-shadow:0 0 35px 10px rgba(168,85,247,0.8);transform:rotate(360deg)} }
@keyframes goku-bounce-speak { 0%,100%{box-shadow:0 0 18px 4px rgba(16,185,129,0.5);transform:scale(1)} 50%{box-shadow:0 0 35px 10px rgba(16,185,129,0.8);transform:scale(1.08)} }
@keyframes goku-ring-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
@keyframes goku-panel-in { 0%{opacity:0;transform:translateY(20px) scale(0.95)} 100%{opacity:1;transform:translateY(0) scale(1)} }
@keyframes goku-wave { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }
`;

const AIAssistantWidget = () => {
    const { user } = useAppData();
    const [isOpen, setIsOpen] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [voiceOutput, setVoiceOutput] = useState(true);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [handsFree, setHandsFree] = useState(false);
    const [assistantState, setAssistantState] = useState<AssistantState>("idle");
    const [interimTranscript, setInterimTranscript] = useState("");

    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef("");
    const handsFreeRef = useRef(handsFree);
    const assistantStateRef = useRef(assistantState);
    const activeAudioRef = useRef<HTMLAudioElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const stylesInjectedRef = useRef(false);

    useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);
    useEffect(() => { assistantStateRef.current = assistantState; }, [assistantState]);

    // Inject keyframe styles once
    useEffect(() => {
        if (stylesInjectedRef.current) return;
        const style = document.createElement("style");
        style.textContent = WIDGET_STYLES;
        document.head.appendChild(style);
        stylesInjectedRef.current = true;
    }, []);

    // Conversations state
    const [conversations, setConversations] = useState<Conversation[]>(() => {
        const saved = localStorage.getItem("goku_conversations");
        if (saved) { try { return JSON.parse(saved); } catch (e) { /* ignore */ } }
        return [{ id: Date.now().toString(), title: "Goku Assistant", messages: [{ role: "assistant", content: "Hey there! 👋 I'm Goku, your AI restaurant operations partner. I've got eyes on your menu, orders, and sales data. Ask me anything — from performance insights to voice commands!" }] }];
    });
    const [currentConvId, setCurrentConvId] = useState<string>(() => {
        return localStorage.getItem("goku_current_conv_id") || (conversations[0]?.id || Date.now().toString());
    });

    const currentConv = conversations.find(c => c.id === currentConvId) || conversations[0];
    const messages = currentConv ? currentConv.messages : [];

    useEffect(() => { localStorage.setItem("goku_current_conv_id", currentConvId); }, [currentConvId]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOpen]);

    const updateMessages = useCallback((newMessages: Message[]) => {
        setConversations(prev => {
            const updated = prev.map(c => {
                if (c.id === currentConvId) {
                    let title = c.title;
                    if (title === "Goku Assistant" || title === "New Chat") {
                        const firstUser = newMessages.find(m => m.role === "user");
                        if (firstUser) title = firstUser.content.slice(0, 22) + (firstUser.content.length > 22 ? "..." : "");
                    }
                    return { ...c, title, messages: newMessages };
                }
                return c;
            });
            localStorage.setItem("goku_conversations", JSON.stringify(updated));
            return updated;
        });
    }, [currentConvId]);

    // ── Language detection ──
    const detectLanguage = (text: string): "bn-IN" | "hi-IN" | "en-IN" => {
        if (/[\u0980-\u09FF]/.test(text)) return "bn-IN";
        if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
        return "en-IN";
    };

    // ── Core send ──
    const sendMessage = useCallback(async (text: string, isFromVoice: boolean = false) => {
        if (!text.trim() || loading) return;
        const userMsg = text.trim();
        setInput("");
        const nextUserMsg: Message = { role: "user", content: userMsg };
        const activeMessages = [...messages, nextUserMsg];
        updateMessages(activeMessages);
        setLoading(true);
        setAssistantState("thinking");

        try {
            const history = activeMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));
            const { data } = await axios.post(`${restaurantService}/api/ai/chat`, { message: userMsg, history }, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            updateMessages([...activeMessages, { role: "assistant", content: data.text }]);
            playChime("success");
            if (isFromVoice && voiceOutput) {
                if (data.audio) {
                    const audio = new Audio(data.audio);
                    activeAudioRef.current = audio;
                    audio.onplay = () => setAssistantState("speaking");
                    audio.onended = () => { setAssistantState("idle"); resumeHandsFreeAfterSpeak(); };
                    audio.onerror = () => { setAssistantState("idle"); resumeHandsFreeAfterSpeak(); };
                    audio.play().catch(() => speakText(data.text));
                } else { speakText(data.text); }
            } else { setAssistantState("idle"); resumeHandsFreeAfterSpeak(); }
        } catch (error: any) {
            playChime("error"); setAssistantState("idle"); resumeHandsFreeAfterSpeak();
            toast.error(error?.response?.data?.message || "Failed to get AI response.");
        } finally { setLoading(false); }
    }, [messages, loading, voiceOutput, updateMessages]);

    // ── Open assistant event ──
    useEffect(() => {
        const handleOpenPrompt = (e: Event) => {
            const customEvent = e as CustomEvent;
            setIsOpen(true);
            if (customEvent.detail) sendMessage(customEvent.detail, false);
        };
        window.addEventListener("open-ai-assistant", handleOpenPrompt);
        return () => window.removeEventListener("open-ai-assistant", handleOpenPrompt);
    }, [sendMessage]);

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input, false); };

    // ── TTS ──
    const speakText = (text: string) => {
        if (!voiceOutput || !window.speechSynthesis) { setAssistantState("idle"); resumeHandsFreeAfterSpeak(); return; }
        try {
            window.speechSynthesis.cancel();
            const cleanText = text.replace(/[*#_`\-]/g, "");
            const lang = detectLanguage(text);
            const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 300));
            utterance.lang = lang;
            const voices = window.speechSynthesis.getVoices();
            let voice = voices.find(v => v.lang.startsWith(lang.slice(0, 2)) && (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("google")));
            if (!voice) voice = voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
            if (voice) utterance.voice = voice;
            utterance.onstart = () => setAssistantState("speaking");
            utterance.onend = () => { setAssistantState("idle"); resumeHandsFreeAfterSpeak(); };
            utterance.onerror = () => { setAssistantState("idle"); resumeHandsFreeAfterSpeak(); };
            window.speechSynthesis.speak(utterance);
        } catch (e) { setAssistantState("idle"); resumeHandsFreeAfterSpeak(); }
    };

    const resumeHandsFreeAfterSpeak = () => {
        if (handsFreeRef.current) {
            setTimeout(() => {
                try {
                    if (recognitionRef.current) { recognitionRef.current.start(); setAssistantState("listening"); playChime("wake"); }
                } catch (e) { /* ignore */ }
            }, 600);
        }
    };

    // ── Local voice intent ──
    const handleLocalVoiceIntent = useCallback((transcript: string): boolean => {
        const text = transcript.toLowerCase().trim();
        if (text.includes("open restaurant") || text.includes("open shop")) { playChime("success"); toast.success("🎙️ Opening restaurant..."); window.dispatchEvent(new CustomEvent("seller-toggle-restaurant", { detail: true })); return true; }
        if (text.includes("close restaurant") || text.includes("close shop")) { playChime("success"); toast.success("🎙️ Closing restaurant..."); window.dispatchEvent(new CustomEvent("seller-toggle-restaurant", { detail: false })); return true; }
        if (text.includes("show menu") || text.includes("go to menu")) { playChime("success"); toast.success("🎙️ Navigating to Menu..."); window.dispatchEvent(new CustomEvent("seller-change-tab", { detail: "menu" })); return true; }
        if (text.includes("show add item") || text.includes("add new item")) { playChime("success"); toast.success("🎙️ Navigating to Add Item..."); window.dispatchEvent(new CustomEvent("seller-change-tab", { detail: "add-item" })); return true; }
        if (text.includes("show sales") || text.includes("business stats")) { playChime("success"); toast.success("🎙️ Navigating to Sales..."); window.dispatchEvent(new CustomEvent("seller-change-tab", { detail: "sales" })); return true; }
        if (text.includes("show insights") || text.includes("ai insights")) { playChime("success"); toast.success("🎙️ Navigating to AI Insights..."); window.dispatchEvent(new CustomEvent("seller-change-tab", { detail: "ai-insights" })); return true; }
        if (text.includes("clear chat")) { playChime("success"); handleClearChat(); toast.success("🎙️ Chat cleared!"); return true; }
        const addDetails = parseAddCommand(text);
        if (addDetails) { playChime("success"); toast.success(`🎙️ Prefilling "${addDetails.name}" (₹${addDetails.price})`); window.dispatchEvent(new CustomEvent("seller-change-tab", { detail: "add-item" })); setTimeout(() => { window.dispatchEvent(new CustomEvent("seller-prefill-item", { detail: addDetails })); }, 300); return true; }
        return false;
    }, []);

    // ── Speech Recognition ──
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const rec = new SpeechRecognition();
        rec.continuous = false; rec.interimResults = true; rec.lang = "en-IN";
        rec.onstart = () => { if (handsFreeRef.current) setAssistantState("listening"); };
        rec.onresult = (e: any) => {
            let final = ""; let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) final += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
            }
            const current = final || interim;
            transcriptRef.current = current; setInterimTranscript(current); setInput(current);
        };
        rec.onerror = (event: any) => { if (event.error === "not-allowed") { toast.error("Microphone permission denied."); setHandsFree(false); setAssistantState("idle"); } };
        rec.onend = () => {
            if (handsFreeRef.current && assistantStateRef.current !== "speaking" && assistantStateRef.current !== "thinking") {
                const textToSend = transcriptRef.current.trim(); transcriptRef.current = ""; setInterimTranscript("");
                if (textToSend) { const wasMatched = handleLocalVoiceIntent(textToSend); if (!wasMatched) { playChime("send"); sendMessage(textToSend, true); } }
                else { setTimeout(() => { if (handsFreeRef.current && assistantStateRef.current === "idle") { try { rec.start(); setAssistantState("listening"); } catch (err) { /* ignore */ } } }, 400); }
            } else { if (!handsFreeRef.current) setAssistantState("idle"); }
        };
        recognitionRef.current = rec;
        if (handsFree) { try { playChime("wake"); rec.start(); setAssistantState("listening"); toast.success("🤖 Goku is listening — speak freely!"); } catch (err) { /* ignore */ } }
        else { try { rec.stop(); setAssistantState("idle"); } catch (err) { /* ignore */ } }
        return () => { try { rec.stop(); } catch (err) { /* ignore */ } };
    }, [handsFree, sendMessage, handleLocalVoiceIntent]);

    const toggleHandsFree = () => { setHandsFree(!handsFree); if (activeAudioRef.current) activeAudioRef.current.pause(); };

    // ── Voice recording (push-to-talk) ──
    const startRecording = async () => {
        if (!navigator.mediaDevices) { toast.error("Microphone not supported."); return; }
        try {
            if (activeAudioRef.current) activeAudioRef.current.pause();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstop = async () => { const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); await sendVoiceFile(blob); stream.getTracks().forEach(t => t.stop()); };
            recorder.start(); toast.success("Recording... speak now!");
        } catch (err) { toast.error("Please allow microphone access."); }
    };
    const stopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); } };

    const sendVoiceFile = async (blob: Blob) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", blob, "voice.webm");
            const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
            formData.append("history", JSON.stringify(history));
            const { data } = await axios.post(`${restaurantService}/api/ai/chat`, formData, {
                headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "multipart/form-data" },
            });
            updateMessages([...messages, { role: "user", content: data.userMessage || "🎙️ Voice Query", isVoice: true }, { role: "assistant", content: data.text }]);
            if (data.audio && voiceOutput) {
                const audio = new Audio(data.audio); activeAudioRef.current = audio;
                audio.onplay = () => setAssistantState("speaking");
                audio.onended = () => { setAssistantState("idle"); resumeHandsFreeAfterSpeak(); };
                audio.onerror = () => { setAssistantState("idle"); resumeHandsFreeAfterSpeak(); };
                audio.play().catch(() => speakText(data.text));
            } else if (voiceOutput) { speakText(data.text); }
        } catch (error) { toast.error("Voice processing failed."); } finally { setLoading(false); }
    };

    // ── Chat management ──
    const handleNewChat = () => {
        const newId = Date.now().toString();
        const newConv: Conversation = { id: newId, title: "New Chat", messages: [{ role: "assistant", content: "Hey! Goku here again. What do you need help with? 🚀" }] };
        setConversations(prev => { const u = [...prev, newConv]; localStorage.setItem("goku_conversations", JSON.stringify(u)); return u; });
        setCurrentConvId(newId); setShowSidebar(false);
    };
    const handleDeleteChat = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConversations(prev => {
            let updated = prev.filter(c => c.id !== id);
            if (updated.length === 0) { const dId = Date.now().toString(); updated = [{ id: dId, title: "Goku Assistant", messages: [{ role: "assistant", content: "Hey! I'm Goku. How can I help?" }] }]; setCurrentConvId(dId); }
            else if (currentConvId === id) setCurrentConvId(updated[updated.length - 1].id);
            localStorage.setItem("goku_conversations", JSON.stringify(updated)); return updated;
        });
    };
    const handleClearChat = () => { updateMessages([{ role: "assistant", content: "Chat cleared! What's next? 🔥" }]); };

    // ── Render helpers ──
    const renderContent = (content: string) => {
        return content.split("\n").map((line, idx) => {
            if (line.trim().startsWith("-") || line.trim().startsWith("•")) {
                return <li key={idx} style={{ marginLeft: "16px", listStyleType: "disc", fontSize: "13px", padding: "1px 0", lineHeight: 1.5 }}>{line.replace(/^[-•]\s*/, "")}</li>;
            }
            if (line.trim().startsWith("**")) {
                return <p key={idx} style={{ fontWeight: 700, fontSize: "13px", marginTop: "4px" }}>{line.replace(/\*\*/g, "")}</p>;
            }
            return <p key={idx} style={{ fontSize: "13px", padding: "1px 0", lineHeight: 1.5, wordBreak: "break-word" }}>{line}</p>;
        });
    };

    // ── Orb color map ──
    const orbStyle = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            width: 60, height: 60, borderRadius: "50%", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.3s ease", position: "relative", border: "none", outline: "none",
            color: "#fff", fontSize: "22px", fontWeight: 800,
        };
        switch (assistantState) {
            case "listening": return { ...base, background: "linear-gradient(135deg, #00d2ff, #0099cc)", animation: "goku-pulse-listen 1.2s ease-in-out infinite, goku-float 3s ease-in-out infinite" };
            case "thinking": return { ...base, background: "linear-gradient(135deg, #a855f7, #7c3aed)", animation: "goku-spin-think 1.5s linear infinite" };
            case "speaking": return { ...base, background: "linear-gradient(135deg, #10b981, #059669)", animation: "goku-bounce-speak 0.8s ease-in-out infinite" };
            default: return { ...base, background: "linear-gradient(135deg, #E23744, #c62828)", animation: "goku-pulse-idle 2s ease-in-out infinite, goku-float 4s ease-in-out infinite" };
        }
    };

    const stateLabel = () => {
        switch (assistantState) {
            case "listening": return "Listening...";
            case "thinking": return "Thinking...";
            case "speaking": return "Speaking...";
            default: return "Ask Goku";
        }
    };

    if (user?.role !== "seller") return null;

    return (
        <>
            {/* ── Floating Orb ── */}
            <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                {/* State label badge */}
                {assistantState !== "idle" && !isOpen && (
                    <div style={{
                        background: assistantState === "listening" ? "#00d2ff" : assistantState === "thinking" ? "#a855f7" : "#10b981",
                        color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        boxShadow: "0 2px 12px rgba(0,0,0,0.15)", animation: "goku-panel-in 0.3s ease"
                    }}>
                        {stateLabel()}
                    </div>
                )}

                {/* Orb button */}
                <button onClick={() => setIsOpen(!isOpen)} style={orbStyle()} title="Goku - AI Assistant">
                    {/* Spinning ring */}
                    <div style={{
                        position: "absolute", inset: -4, borderRadius: "50%",
                        border: `2px solid ${assistantState === "listening" ? "rgba(0,210,255,0.3)" : assistantState === "thinking" ? "rgba(168,85,247,0.3)" : assistantState === "speaking" ? "rgba(16,185,129,0.3)" : "rgba(226,55,68,0.2)"}`,
                        borderTopColor: assistantState === "listening" ? "#00d2ff" : assistantState === "thinking" ? "#a855f7" : assistantState === "speaking" ? "#10b981" : "#E23744",
                        animation: "goku-ring-spin 2s linear infinite"
                    }} />
                    <span style={{ position: "relative", zIndex: 1, textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>G</span>
                </button>
            </div>

            {/* ── Slide-out Chat Panel ── */}
            {isOpen && (
                <div style={{
                    position: "fixed", bottom: 96, right: 24, zIndex: 9998,
                    width: 380, maxWidth: "calc(100vw - 32px)", height: 540, maxHeight: "calc(100vh - 120px)",
                    borderRadius: 20, overflow: "hidden",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
                    animation: "goku-panel-in 0.35s ease",
                    display: "flex", flexDirection: "column", background: "#fff",
                    fontFamily: "'Inter', 'Segoe UI', sans-serif"
                }}>
                    {/* Header */}
                    <div style={{
                        background: "#E23744", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button onClick={() => setShowSidebar(!showSidebar)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", padding: 2 }}>
                                <FiMenu size={18} />
                            </button>
                            <div style={{
                                width: 10, height: 10, borderRadius: "50%",
                                background: assistantState === "listening" ? "#00d2ff" : assistantState === "thinking" ? "#a855f7" : assistantState === "speaking" ? "#10b981" : "#ff6b6b",
                                animation: assistantState === "idle" ? "none" : "goku-bounce-speak 1s infinite",
                            }} />
                            <div>
                                <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "-0.3px" }}>Goku</div>
                                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>AI Operations Partner</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => setVoiceOutput(!voiceOutput)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer" }} title={voiceOutput ? "Mute" : "Unmute"}>
                                {voiceOutput ? <FiVolume2 size={16} color="#4ade80" /> : <FiVolumeX size={16} />}
                            </button>
                            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer" }}>
                                <FiX size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Sidebar Drawer */}
                    {showSidebar && (
                        <div style={{
                            position: "absolute", left: 0, top: 48, bottom: 0, width: 240,
                            background: "#1a1a2e", color: "#fff", zIndex: 10, display: "flex", flexDirection: "column",
                            boxShadow: "4px 0 20px rgba(0,0,0,0.3)"
                        }}>
                            <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Conversations</span>
                                <button onClick={handleNewChat} style={{ background: "#E23744", border: "none", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                    <FiPlus size={12} /> New
                                </button>
                            </div>
                            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
                                {conversations.map(conv => (
                                    <div key={conv.id} onClick={() => { setCurrentConvId(conv.id); setShowSidebar(false); }}
                                        style={{
                                            padding: "8px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer", fontSize: 12,
                                            background: conv.id === currentConvId ? "rgba(255,255,255,0.1)" : "transparent",
                                            color: conv.id === currentConvId ? "#fff" : "rgba(255,255,255,0.7)",
                                            fontWeight: conv.id === currentConvId ? 700 : 400,
                                            display: "flex", justifyContent: "space-between", alignItems: "center"
                                        }}>
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: 8 }}>{conv.title}</span>
                                        <button onClick={(e) => handleDeleteChat(conv.id, e)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 2 }}>
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                <button onClick={() => setShowSidebar(false)} style={{
                                    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)",
                                    color: "#fff", borderRadius: 8, padding: "8px 0", fontSize: 11, fontWeight: 600, cursor: "pointer"
                                }}>Close</button>
                            </div>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f8f9fa" }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                                <div style={{
                                    maxWidth: "82%", borderRadius: 16, padding: "10px 14px",
                                    background: msg.role === "user" ? "#E23744" : "#fff",
                                    color: msg.role === "user" ? "#fff" : "#1f2937",
                                    boxShadow: msg.role === "user" ? "0 2px 8px rgba(226,55,68,0.2)" : "0 1px 4px rgba(0,0,0,0.06)",
                                    border: msg.role === "user" ? "none" : "1px solid #e5e7eb",
                                    borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                                    borderBottomLeftRadius: msg.role === "user" ? 16 : 4,
                                }}>
                                    {renderContent(msg.content)}
                                    {msg.isVoice && <span style={{ display: "block", textAlign: "right", fontSize: 9, opacity: 0.6, marginTop: 4, fontFamily: "monospace" }}>🎙️ Voice</span>}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "12px 18px", display: "flex", gap: 4 }}>
                                    {[0, 150, 300].map(delay => (
                                        <span key={delay} style={{
                                            width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
                                            animation: `goku-bounce-speak 0.8s ${delay}ms ease-in-out infinite`
                                        }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Voice waveform indicator when listening */}
                    {assistantState === "listening" && (
                        <div style={{ background: "rgba(0,210,255,0.08)", padding: "6px 16px", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid rgba(0,210,255,0.15)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 2, height: 16 }}>
                                {[0, 1, 2, 3, 4].map(i => (
                                    <div key={i} style={{
                                        width: 3, background: "#00d2ff", borderRadius: 2,
                                        animation: `goku-wave 0.5s ${i * 0.1}s ease-in-out infinite`,
                                        height: "100%"
                                    }} />
                                ))}
                            </div>
                            <span style={{ fontSize: 11, color: "#0099cc", fontWeight: 600 }}>
                                {interimTranscript || "Goku is listening..."}
                            </span>
                        </div>
                    )}

                    {/* Input Bar */}
                    <form onSubmit={handleSubmit} style={{
                        padding: "10px 12px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8,
                        background: "#fff", flexShrink: 0
                    }}>
                        <button type="button" onClick={toggleHandsFree} style={{
                            width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            background: handsFree ? "#E23744" : "#f3f4f6", color: handsFree ? "#fff" : "#6b7280",
                            animation: handsFree ? "goku-pulse-idle 1.5s infinite" : "none",
                            transition: "all 0.2s"
                        }} title={handsFree ? "Stop Goku" : "Start Goku"}>
                            {handsFree ? <FiMicOff size={18} /> : <FiMic size={18} />}
                        </button>
                        <input
                            type="text" placeholder={handsFree ? "Goku is listening..." : "Ask Goku anything..."}
                            value={input} onChange={e => setInput(e.target.value)} disabled={loading}
                            style={{
                                flex: 1, borderRadius: 10, border: "1px solid #e5e7eb", background: "#f9fafb",
                                padding: "8px 14px", fontSize: 13, outline: "none", fontFamily: "inherit",
                                transition: "border 0.2s"
                            }}
                            onFocus={e => (e.target.style.borderColor = "#E23744")}
                            onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                        />
                        <button type="submit" disabled={!input.trim() || loading} style={{
                            width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer",
                            background: "#E23744", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: (!input.trim() || loading) ? 0.4 : 1, transition: "opacity 0.2s"
                        }}>
                            <FiSend size={16} />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default AIAssistantWidget;
