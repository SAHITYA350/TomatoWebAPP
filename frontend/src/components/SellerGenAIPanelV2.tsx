import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppData } from "../context/AppContext";
import { getToken } from "../utils/authStorage";
import { restaurantService } from "../config";
import axios from "axios";
import { 
    FiMessageSquare, FiX, FiSend, FiMic, FiMicOff, 
    FiVolume2, FiVolumeX, FiMenu, FiPlus, FiTrash2 
} from "react-icons/fi";
import toast from "react-hot-toast";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp?: Date;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
}

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
        
        const frequencies = {
            wake: { f1: 523.25, f2: 659.25, duration: 0.35 },
            send: { f1: 300, f2: 900, duration: 0.18 },
            success: { f1: 523.25, f2: 783.99, duration: 0.4 },
            error: { f1: 120, f2: 100, duration: 0.25 }
        };

        const freq = frequencies[type];
        if (type === "wake") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq.f1, now);
            osc.frequency.setValueAtTime(freq.f2, now + 0.12);
        } else if (type === "send") {
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq.f1, now);
            osc.frequency.exponentialRampToValueAtTime(freq.f2, now + 0.15);
        } else if (type === "success") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq.f1, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            osc.frequency.setValueAtTime(freq.f2, now + 0.16);
        }

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + freq.duration);
        osc.start(now);
        osc.stop(now + freq.duration);
    } catch (e) {
        console.warn("Audio chime failed:", e);
    }
};

const speakText = (text: string, language: "en-IN" | "hi-IN" | "bn-IN" = "en-IN") => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, ""));
    utterance.lang = language;
    utterance.rate = 1;
    utterance.pitch = 1;
    
    synth.speak(utterance);
};

const SellerGenAIPanelV2 = () => {
    const { user } = useAppData();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceOutput, setVoiceOutput] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>(() => {
        try {
            const saved = localStorage.getItem("seller_ai_conversations");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [currentConvId, setCurrentConvId] = useState<string>(() => {
        const saved = localStorage.getItem("seller_ai_current_conv");
        return saved || "";
    });

    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize Web Speech API
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-IN";

        recognition.onstart = () => {
            setIsRecording(true);
            playChime("wake");
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.onresult = (event: any) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            if (event.isFinal && transcript.trim()) {
                setInput(transcript.trim());
                sendMessage(transcript.trim(), true);
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
            playChime("error");
        };

        recognitionRef.current = recognition;
    }, []);

    const currentConv = conversations.find((c) => c.id === currentConvId);
    const messages = currentConv?.messages || [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const saveConversations = (convs: Conversation[]) => {
        setConversations(convs);
        localStorage.setItem("seller_ai_conversations", JSON.stringify(convs));
    };

    const updateMessages = (newMessages: Message[]) => {
        if (!currentConvId) return;
        const updated = conversations.map((c) => {
            if (c.id === currentConvId) {
                return { ...c, messages: newMessages };
            }
            return c;
        });
        saveConversations(updated);
    };

    const createNewConversation = () => {
        const newConv: Conversation = {
            id: `conv_${Date.now()}`,
            title: "New Analysis",
            messages: [{
                role: "assistant",
                content: "Hi! I'm your AI Sales & Operations Assistant. Ask me about your restaurant's performance, sales trends, inventory, or operational insights.",
                timestamp: new Date()
            }],
            createdAt: new Date()
        };
        const updated = [newConv, ...conversations];
        saveConversations(updated);
        setCurrentConvId(newConv.id);
        localStorage.setItem("seller_ai_current_conv", newConv.id);
    };

    const sendMessage = async (text: string, isFromVoice: boolean = false) => {
        if (!text.trim() || loading) return;
        if (!currentConvId) {
            createNewConversation();
            return;
        }

        const userMsg: Message = { 
            role: "user", 
            content: text.trim(),
            timestamp: new Date()
        };

        const newMessages = [...messages, userMsg];
        updateMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            playChime("send");

            const { data } = await axios.post(
                `${restaurantService}/api/ai/chat`,
                { 
                    message: text.trim(), 
                    history: messages.slice(-10).map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                },
                {
                    headers: { Authorization: `Bearer ${getToken()}` },
                }
            );

            const assistantMsg: Message = {
                role: "assistant",
                content: data.text,
                timestamp: new Date()
            };

            updateMessages([...newMessages, assistantMsg]);
            playChime("success");

            // Update conversation title if it's the first message
            if (messages.length === 1) {
                const convs = conversations.map((c) => {
                    if (c.id === currentConvId) {
                        return {
                            ...c,
                            title: text.trim().substring(0, 30) + (text.length > 30 ? "..." : "")
                        };
                    }
                    return c;
                });
                saveConversations(convs);
            }

            // Handle voice output
            if (isFromVoice && voiceOutput) {
                const hasHindi = /[\u0900-\u097F]/.test(data.text);
                const hasBengali = /[\u0980-\u09FF]/.test(data.text);
                const language = hasHindi ? "hi-IN" : hasBengali ? "bn-IN" : "en-IN";

                if (data.audio) {
                    // Use pregenerated audio if available (English only from backend)
                    const audio = new Audio(data.audio);
                    audio.play().catch(() => {
                        // Fallback to Web Speech API
                        speakText(data.text, language);
                    });
                } else {
                    // Use browser Web Speech API for Hindi/Bengali/English
                    speakText(data.text, language);
                }
            }
        } catch (error: any) {
            console.error("AI chat error:", error);
            playChime("error");
            const errMsg = error?.response?.data?.message || "Failed to get response";
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const deleteConversation = (convId: string) => {
        const updated = conversations.filter((c) => c.id !== convId);
        saveConversations(updated);
        if (currentConvId === convId) {
            const nextConv = updated[0];
            if (nextConv) {
                setCurrentConvId(nextConv.id);
                localStorage.setItem("seller_ai_current_conv", nextConv.id);
            } else {
                setCurrentConvId("");
            }
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => {
                    setIsOpen(true);
                    if (!currentConvId) createNewConversation();
                }}
                className="fixed bottom-6 right-6 z-40 flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg hover:shadow-xl text-white hover:scale-110 transition-transform"
                title="Open AI Assistant"
            >
                <FiMessageSquare className="h-6 w-6" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white">
                <div>
                    <h3 className="font-bold text-sm">AI Assistant</h3>
                    <p className="text-xs opacity-90">Sales & Operations</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-red-700 p-1 rounded transition">
                    <FiX className="h-5 w-5" />
                </button>
            </div>

            {/* Conversations Sidebar Toggle */}
            {conversations.length > 1 && (
                <div className="px-3 py-2 border-b bg-gray-50 flex gap-2 items-center overflow-x-auto text-xs">
                    {conversations.slice(0, 3).map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => {
                                setCurrentConvId(conv.id);
                                localStorage.setItem("seller_ai_current_conv", conv.id);
                            }}
                            className={`px-2 py-1 rounded whitespace-nowrap transition ${
                                currentConvId === conv.id
                                    ? "bg-red-500 text-white"
                                    : "bg-white text-gray-700 border hover:border-red-300"
                            }`}
                        >
                            {conv.title.substring(0, 15)}
                        </button>
                    ))}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                                msg.role === "user"
                                    ? "bg-red-500 text-white rounded-br-none"
                                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                            }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white text-gray-800 border border-gray-200 px-4 py-2 rounded-lg rounded-bl-none">
                            <div className="flex gap-1">
                                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t space-y-2">
                {/* Controls */}
                <div className="flex gap-2 justify-between items-center px-2">
                    <button
                        onClick={() => {
                            if (recognitionRef.current) {
                                if (isRecording) {
                                    recognitionRef.current.stop();
                                } else {
                                    recognitionRef.current.start();
                                }
                            }
                        }}
                        className={`p-2 rounded-lg transition ${
                            isRecording
                                ? "bg-red-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        title={isRecording ? "Stop recording" : "Start voice input"}
                    >
                        {isRecording ? <FiMicOff className="h-4 w-4" /> : <FiMic className="h-4 w-4" />}
                    </button>

                    <button
                        onClick={() => setVoiceOutput(!voiceOutput)}
                        className={`p-2 rounded-lg transition ${
                            voiceOutput
                                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                : "bg-gray-200 text-gray-500"
                        }`}
                        title={voiceOutput ? "Disable voice output" : "Enable voice output"}
                    >
                        {voiceOutput ? <FiVolume2 className="h-4 w-4" /> : <FiVolumeX className="h-4 w-4" />}
                    </button>

                    <button
                        onClick={createNewConversation}
                        className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        title="New conversation"
                    >
                        <FiPlus className="h-4 w-4" />
                    </button>

                    {conversations.length > 0 && (
                        <button
                            onClick={() => currentConvId && deleteConversation(currentConvId)}
                            className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-600 transition"
                            title="Delete conversation"
                        >
                            <FiTrash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Input Field */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(input);
                            }
                        }}
                        placeholder="Ask about sales, inventory, operations..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        disabled={loading}
                    />
                    <button
                        onClick={() => sendMessage(input)}
                        disabled={loading || !input.trim() || !currentConvId}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition text-sm font-medium"
                    >
                        <FiSend className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SellerGenAIPanelV2;
