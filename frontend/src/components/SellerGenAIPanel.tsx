import remarkGfm from "remark-gfm";
import React, { useState, useEffect, useRef } from "react";
import { useAppData } from "../context/AppContext";
import { getToken } from "../utils/authStorage";
import { restaurantService } from "../config";
import axios from "axios";
import { 
    FiMessageSquare, FiX, FiSend, FiMic, FiMicOff, 
    FiVolume2, FiVolumeX, FiInfo, FiMenu, FiPlus, 
    FiTrash2, FiDownload 
} from "react-icons/fi";
import toast from "react-hot-toast";

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
            if (val === 100) {
                temp = (temp || 1) * 100;
            } else if (val === 1000) {
                total += (temp || 1) * 1000;
                temp = 0;
            } else {
                temp += val;
            }
        } else if (/^\d+$/.test(w)) {
            temp += parseInt(w, 10);
        }
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
            osc.type = "sine";
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.12);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === "send") {
            osc.type = "triangle";
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
        } else if (type === "success") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            osc.frequency.setValueAtTime(783.99, now + 0.16);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === "error") {
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.setValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        console.warn("Audio Context beep failed:", e);
    }
};

const SellerGenAIPanel = () => {
    const { user } = useAppData();
    const [showSidebar, setShowSidebar] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [voiceOutput, setVoiceOutput] = useState(true);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [handsFree, setHandsFree] = useState(false);
    const [assistantState, setAssistantState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
    const [interimTranscript, setInterimTranscript] = useState("");
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [recognitionLang, setRecognitionLang] = useState<"en-IN" | "hi-IN" | "bn-IN">("en-IN");
    
    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef("");
    const handsFreeRef = useRef(handsFree);
    const assistantStateRef = useRef(assistantState);
    const activeAudioRef = useRef<HTMLAudioElement | null>(null);
    const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isSendingRef = useRef(false);

    useEffect(() => {
        handsFreeRef.current = handsFree;
    }, [handsFree]);

    useEffect(() => {
        assistantStateRef.current = assistantState;
    }, [assistantState]);

    useEffect(() => {
        if (!window.speechSynthesis) return;
        const updateVoices = () => {
            const loadedVoices = window.speechSynthesis.getVoices();
            setVoices(loadedVoices);
            console.log(`🎙️ Preloaded ${loadedVoices.length} speechSynthesis voices.`);
        };
        updateVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }
    }, []);

    const updateAssistantState = (state: "idle" | "listening" | "thinking" | "speaking") => {
        setAssistantState(state);
        assistantStateRef.current = state;
    };

    const updateHandsFree = (val: boolean) => {
        setHandsFree(val);
        handsFreeRef.current = val;
    };

    const playAudioQueue = (audioList: string[], fallbackText: string) => {
        if (!audioList || audioList.length === 0) {
            speakText(fallbackText);
            return;
        }

        let index = 0;
        const playNext = () => {
            if (index >= audioList.length) {
                updateAssistantState("idle");
                resumeHandsFreeAfterSpeak();
                return;
            }
            
            const audio = new Audio(audioList[index]);
            activeAudioRef.current = audio;
            
            const audioSafetyTimeout = setTimeout(() => {
                console.warn(`Audio chunk ${index} playback safety timeout fired. Skipping to next...`);
                audio.pause();
                index++;
                playNext();
            }, 15000);

            audio.onplay = () => updateAssistantState("speaking");
            audio.onended = () => {
                clearTimeout(audioSafetyTimeout);
                index++;
                playNext();
            };
            audio.onerror = () => {
                clearTimeout(audioSafetyTimeout);
                console.warn(`Audio chunk ${index} errored, skipping...`);
                index++;
                playNext();
            };
            audio.play().catch((err) => {
                clearTimeout(audioSafetyTimeout);
                console.log("Audio playback blocked, trying fallback:", err);
                speakText(fallbackText);
            });
        };
        playNext();
    };

    const rawSellerName = user?.name?.trim() || user?.email?.split("@")[0] || "";
    const sellerFirstName = rawSellerName ? rawSellerName.split(" ")[0] : "Partner";
    const defaultWelcomeMsg = `Hi ${sellerFirstName}! ⚡ I am your Tomato OS Executive AI Co-Pilot. I have analyzed your restaurant profile, menu items, and sales statistics. How can I assist you today?`;

    // Load conversations from LocalStorage
    const [conversations, setConversations] = useState<Conversation[]>(() => {
        const saved = localStorage.getItem("tomato_conversations");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse conversations:", e);
            }
        }
        const defaultId = Date.now().toString();
        return [
            {
                id: defaultId,
                title: "Tomato OS Assistant",
                messages: [
                    {
                        role: "assistant",
                        content: defaultWelcomeMsg,
                    },
                ],
            },
        ];
    });

    const [currentConvId, setCurrentConvId] = useState<string>(() => {
        const savedActive = localStorage.getItem("tomato_current_conv_id");
        return savedActive || (conversations[0]?.id || Date.now().toString());
    });

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const currentConv = conversations.find((c) => c.id === currentConvId) || conversations[0];
    const messages = currentConv ? currentConv.messages : [];

    // Save active ID
    useEffect(() => {
        localStorage.setItem("tomato_current_conv_id", currentConvId);
    }, [currentConvId]);

    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    // Auto-scroll chat inside container only (prevent window page scroll)
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Update messages in localStorage
    const updateMessages = (newMessages: Message[]) => {
        setConversations((prev) => {
            const updated = prev.map((c) => {
                if (c.id === currentConvId) {
                    let title = c.title;
                    if (title === "Tomato OS Assistant" || title === "New Chat") {
                        const firstUserMsg = newMessages.find((m) => m.role === "user");
                        if (firstUserMsg) {
                            title = firstUserMsg.content.slice(0, 22) + (firstUserMsg.content.length > 22 ? "..." : "");
                        }
                    }
                    return { ...c, title, messages: newMessages };
                }
                return c;
            });
            localStorage.setItem("tomato_conversations", JSON.stringify(updated));
            return updated;
        });
    };

    // Core sendMessage function
    const detectLanguage = (text: string): "bn-IN" | "hi-IN" | "en-IN" => {
        if (/[\u0980-\u09FF]/.test(text)) return "bn-IN";
        if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
        return "en-IN";
    };

    // Core sendMessage function
    const sendMessage = async (text: string, isFromVoice: boolean = false) => {
        if (!text.trim() || loading || isSendingRef.current) return;
        isSendingRef.current = true;

        const userMsg = text.trim();
        setInput("");

        const nextUserMsg: Message = { role: "user", content: userMsg };
        const activeMessages = [...messages, nextUserMsg];
        updateMessages(activeMessages);
        setLoading(true);
        updateAssistantState("thinking");

        try {
            const history = messages
                .slice(-50)
                .map((m) => ({ role: m.role, content: m.content }));

            const { data } = await axios.post(
                `${restaurantService}/api/ai/chat`,
                {
                    message: userMsg,
                    history,
                    generateAudio: isFromVoice && voiceOutput,
                    isSeller: true,
                    screenContext: { role: "seller" },
                },
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                    },
                }
            );

            updateMessages([...activeMessages, { role: "assistant", content: data.text }]);
            playChime("success");

            // Read aloud ONLY if query came from voice input and voice output is enabled
            if (isFromVoice && voiceOutput) {
                if (data.audio && Array.isArray(data.audio) && data.audio.length > 0) {
                    playAudioQueue(data.audio, data.text);
                } else if (typeof data.audio === "string") {
                    playAudioQueue([data.audio], data.text);
                } else {
                    speakText(data.text);
                }
            } else {
                updateAssistantState("idle");
                resumeHandsFreeAfterSpeak();
            }
        } catch (error: any) {
            console.error("AI Chat Error:", error);
            playChime("error");
            updateAssistantState("idle");
            resumeHandsFreeAfterSpeak();
            const errMsg = error?.response?.data?.message || "Failed to get AI response.";
            toast.error(errMsg);
        } finally {
            setLoading(false);
            isSendingRef.current = false;
        }
    };

    // Listen to outer events (e.g. from OrderCard update)
    useEffect(() => {
        const handleOpenPrompt = (e: Event) => {
            const customEvent = e as CustomEvent;
            setShowSidebar(false);
            if (customEvent.detail) {
                sendMessage(customEvent.detail, false);
            }
        };
        window.addEventListener("open-ai-assistant", handleOpenPrompt);
        return () => window.removeEventListener("open-ai-assistant", handleOpenPrompt);
    }, [conversations, currentConvId, loading]);

    // Handle standard text chat submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input, false);
    };

    const speakText = (text: string) => {
        if (!voiceOutput || !window.speechSynthesis) {
            updateAssistantState("idle");
            resumeHandsFreeAfterSpeak();
            return;
        }
        
        try {
            window.speechSynthesis.cancel();
            
            let cleanText = text.replace(/[*#_`\-]/g, "");
            const lang = detectLanguage(text);
            
            if (lang.startsWith("bn")) {
                cleanText = cleanText.replace(/₹/g, " টাকা ");
            } else if (lang.startsWith("hi")) {
                cleanText = cleanText.replace(/₹/g, " रुपये ");
            } else {
                cleanText = cleanText.replace(/₹/g, " rupees ");
            }
            
            const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 300));
            utterance.lang = lang;
            
            const allVoices = window.speechSynthesis.getVoices();
            const langVoices = allVoices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(lang.toLowerCase().slice(0, 2)));
            
            // Try to find a female voice first
            let selectedVoice = langVoices.find(v => {
                const name = v.name.toLowerCase();
                if (name.includes("male") && !name.includes("female")) {
                    return false;
                }
                return name.includes("female") || 
                       name.includes("zira") || 
                       name.includes("kalpana") || 
                       name.includes("hazel") || 
                       name.includes("heera") ||
                       name.includes("swara") ||
                       name.includes("aditi");
            });
            
            if (!selectedVoice) {
                // Find any voice that is not explicitly male
                selectedVoice = langVoices.find(v => {
                    const name = v.name.toLowerCase();
                    return !name.includes("male") || name.includes("female");
                });
            }
            if (!selectedVoice) {
                selectedVoice = langVoices[0];
            }
            
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log(`🎙️ Speaking using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
            } else {
                console.log(`🎙️ Speaking using browser default voice for lang: ${lang}`);
            }

            const estimatedDurationMs = Math.max(15000, (cleanText.length * 80) + 5000);
            let safetyTimeout = setTimeout(() => {
                console.warn("SpeechSynthesis safety timeout fired. Forcing restart...");
                window.speechSynthesis.cancel();
                updateAssistantState("idle");
                resumeHandsFreeAfterSpeak();
            }, 60000); // Increased safety timeout to 60 seconds

            utterance.onstart = () => updateAssistantState("speaking");
            utterance.onend = () => {
                clearTimeout(safetyTimeout);
                updateAssistantState("idle");
                resumeHandsFreeAfterSpeak();
            };
            utterance.onerror = (errEvent) => {
                console.warn("SpeechSynthesis utterance error:", errEvent);
                clearTimeout(safetyTimeout);
                updateAssistantState("idle");
                resumeHandsFreeAfterSpeak();
            };
            
            // Store reference globally to prevent garbage collection in Chrome
            activeUtteranceRef.current = utterance;
            
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 100);
        } catch (e) {
            console.warn("SpeechSynthesis failed:", e);
            updateAssistantState("idle");
            resumeHandsFreeAfterSpeak();
        }
    };

    const resumeHandsFreeAfterSpeak = () => {
        if (handsFreeRef.current) {
            setTimeout(() => {
                if (assistantStateRef.current !== "listening") {
                    updateAssistantState("idle");
                    playChime("wake");
                }
            }, 600);
        }
    };

    // Client-side local command intent parser
    const handleLocalVoiceIntent = (transcript: string): boolean => {
        const text = transcript.toLowerCase().trim();
        
        if (text.includes("open restaurant") || text.includes("open shop") || text.includes("start operations")) {
            playChime("success");
            toast.success("🎙️ Voice command: Opening restaurant...");
            window.dispatchEvent(new CustomEvent("seller-toggle-restaurant", { detail: true }));
            return true;
        }
        if (text.includes("close restaurant") || text.includes("close shop") || text.includes("stop operations")) {
            playChime("success");
            toast.success("🎙️ Voice command: Closing restaurant...");
            window.dispatchEvent(new CustomEvent("seller-toggle-restaurant", { detail: false }));
            return true;
        }
        if (text.includes("show menu") || text.includes("go to menu") || text.includes("view menu") || text.includes("menu items")) {
            playChime("success");
            toast.success("🎙️ Voice command: Navigating to Menu...");
            window.dispatchEvent(new CustomEvent("seller-change-tab", { detail: "menu" }));
            return true;
        }
        if (text.includes("show add item") || text.includes("go to add item") || text.includes("add new item") || text.includes("upload item") || text.includes("add item page")) {
            playChime("success");
            toast.success("🎙️ Voice command: Navigating to Add Item...");
            window.dispatchEvent(new CustomEvent("seller-change-tab", { detail: "add-item" }));
            return true;
        }
        if (text.includes("show sales") || text.includes("go to sales") || text.includes("view sales") || text.includes("show stats") || text.includes("business stats")) {
            playChime("success");
            toast.success("🎙️ Voice command: Navigating to Sales Stats...");
            window.dispatchEvent(new CustomEvent("seller-change-tab", { detail: "sales" }));
            return true;
        }
        if (text.includes("clear chat") || text.includes("clear screen")) {
            playChime("success");
            handleClearChat();
            toast.success("🎙️ Voice command: Clearing chat screen...");
            return true;
        }

        const addDetails = parseAddCommand(text);
        if (addDetails) {
            playChime("success");
                    toast.success(`🎙️ Voice: Prefilling "${addDetails.name}" (₹${addDetails.price})`);
            window.dispatchEvent(new CustomEvent("seller-change-tab", { detail: "add-item" }));
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent("seller-prefill-item", { detail: addDetails }));
            }, 300);
            return true;
        }

        return false;
    };

    const audioContextRef = useRef<AudioContext | null>(null);
    const silenceTimerRef = useRef<any>(null);
    const vadStreamRef = useRef<MediaStream | null>(null);

    // Continuous VAD using MediaRecorder
    useEffect(() => {
        if (!handsFree) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }
            if (vadStreamRef.current) {
                vadStreamRef.current.getTracks().forEach(t => t.stop());
                vadStreamRef.current = null;
            }
            return;
        }

        const startVAD = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
                });
                vadStreamRef.current = stream;
                
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = audioContext;
                
                const source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                source.connect(analyser);
                analyser.fftSize = 512;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                
                let isSpeakingLocally = false;
                
                const detectSilence = () => {
                    if (!handsFreeRef.current) return;
                    
                    // Don't listen to user while AI is speaking
                    if (assistantStateRef.current === "speaking" || assistantStateRef.current === "thinking") {
                        requestAnimationFrame(detectSilence);
                        return;
                    }

                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        sum += dataArray[i];
                    }
                    const avg = sum / bufferLength;

                    // Threshold for speech detection (adjust if needed, usually ~10-15)
                    if (avg > 15) {
                        if (!isSpeakingLocally) {
                            isSpeakingLocally = true;
                            
                            // Start MediaRecorder
                            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
                                audioChunksRef.current = [];
                                const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
                                mediaRecorderRef.current = recorder;
                                
                                recorder.ondataavailable = (e) => {
                                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                                };
                                
                                recorder.onstop = async () => {
                                    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                                    // If enough audio data was captured, send it
                                    if (blob.size > 4000) {
                                        updateAssistantState("thinking");
                                        await transcribeAndSendVoiceFile(blob);
                                    } else {
                                        // Ignore tiny blips, go back to listening
                                        updateAssistantState("idle");
                                        resumeHandsFreeAfterSpeak();
                                    }
                                };
                                
                                recorder.start();
                                updateAssistantState("listening");
                            }
                        }
                        
                        // Reset silence timeout
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = setTimeout(() => {
                            isSpeakingLocally = false;
                            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                                mediaRecorderRef.current.stop();
                            }
                            updateHandsFree(false); // Toggle voice input button OFF when seller stops talking
                        }, 2000); // 2 seconds of silence = stop recording and send
                    }
                    
                    requestAnimationFrame(detectSilence);
                };
                
                detectSilence();
                playChime("wake");
                toast.success("🤖 Auto Voice Active - Start Speaking in any language!");
                updateAssistantState("idle");

            } catch (err) {
                console.error("VAD initialization error:", err);
                toast.error("Failed to access microphone for hands-free mode.");
                updateHandsFree(false);
            }
        };

        // Small delay to ensure state updates
        setTimeout(startVAD, 300);

        return () => {
            clearTimeout(silenceTimerRef.current);
        };
    }, [handsFree]);

    const toggleHandsFree = () => {
        updateHandsFree(!handsFree);
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
        }
    };

    useEffect(() => {
        if (!voiceOutput && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            if (activeAudioRef.current) {
                activeAudioRef.current.pause();
            }
            if (assistantState === "speaking") {
                updateAssistantState("idle");
                resumeHandsFreeAfterSpeak();
            }
        }
    }, [voiceOutput]);

    // Voice Chat functions
    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast.error("Microphone access is not supported on this browser.");
            return;
        }

        try {
            if (activeAudioRef.current) {
                activeAudioRef.current.pause();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
            });
            audioChunksRef.current = [];

            const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                await transcribeAndSendVoiceFile(audioBlob);
                stream.getTracks().forEach((track) => track.stop());
            };

            recorder.start();
            setIsRecording(true);
            toast.success("Recording started... Speak now!");
        } catch (err) {
            console.error("Microphone access error:", err);
            toast.error("Please allow microphone access to use voice.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const transcribeAndSendVoiceFile = async (blob: Blob) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", blob, "voice.webm");
            formData.append("language", recognitionLang);

            // Fast standalone transcription
            const { data } = await axios.post(
                `${restaurantService}/api/ai/transcribe`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                    },
                }
            );
            
            const transcribedText = data.text;
            console.log("🎙️ Standalone Transcription:", transcribedText);
            
            if (transcribedText) {
                // Populate input field briefly to show what was transcribed
                setInput(transcribedText);
                // Immediately send as standard text message with voice output enabled
                await sendMessage(transcribedText, true);
            } else {
                updateAssistantState("idle");
            }
        } catch (error) {
            console.error("Transcription failed", error);
            toast.error("Failed to transcribe audio.");
            updateAssistantState("idle");
        } finally {
            setLoading(false);
        }
    };

    const sendVoiceFile = async (blob: Blob) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", blob, "voice.webm");
            formData.append("language", recognitionLang);
            formData.append("isSeller", "true");
            formData.append("screenContext", JSON.stringify({ role: "seller" }));

            const history = messages
                .slice(-50)
                .map((m) => ({ role: m.role, content: m.content }));
            formData.append("history", JSON.stringify(history));

            const { data } = await axios.post(
                `${restaurantService}/api/ai/chat`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                    },
                }
            );

            updateMessages([
                ...messages,
                { role: "user", content: data.userMessage || "🎙️ Voice Query", isVoice: true },
                { role: "assistant", content: data.text },
            ]);

            if (data.audio && voiceOutput) {
                if (Array.isArray(data.audio) && data.audio.length > 0) {
                    playAudioQueue(data.audio, data.text);
                } else if (typeof data.audio === "string") {
                    playAudioQueue([data.audio], data.text);
                } else {
                    speakText(data.text);
                }
            } else if (voiceOutput) {
                speakText(data.text);
            }
        } catch (error: any) {
            console.error("Voice processing failed:", error);
            toast.error("Failed to process voice query.");
        } finally {
            setLoading(false);
        }
    };

    // Chat management actions
    const handleNewChat = () => {
        const newId = Date.now().toString();
        const newConv: Conversation = {
            id: newId,
            title: "New Chat",
            messages: [
                {
                    role: "assistant",
                    content: defaultWelcomeMsg,
                },
            ],
        };
        setConversations((prev) => {
            const updated = [...prev, newConv];
            localStorage.setItem("tomato_conversations", JSON.stringify(updated));
            return updated;
        });
        setCurrentConvId(newId);
        setShowSidebar(false);
    };

    const handleDeleteChat = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConversations((prev) => {
            let updated = prev.filter((c) => c.id !== id);
            if (updated.length === 0) {
                const defaultId = Date.now().toString();
                updated = [
                    {
                        id: defaultId,
                        title: "Tomato OS Assistant",
                        messages: [
                            {
                                role: "assistant" as const,
                                content: defaultWelcomeMsg,
                            },
                        ],
                    },
                ];
                setCurrentConvId(defaultId);
            } else if (currentConvId === id) {
                setCurrentConvId(updated[updated.length - 1].id);
            }
            localStorage.setItem("tomato_conversations", JSON.stringify(updated));
            return updated;
        });
    };

    const handleDeleteAll = () => {
        const confirm = window.confirm("Delete all conversations?");
        if (!confirm) return;
        const defaultId = Date.now().toString();
        const defaultConvs: Conversation[] = [
            {
                id: defaultId,
                title: "Tomato OS Assistant",
                messages: [
                    {
                        role: "assistant",
                        content: defaultWelcomeMsg,
                    },
                ],
            },
        ];
        setConversations(defaultConvs);
        setCurrentConvId(defaultId);
        localStorage.setItem("tomato_conversations", JSON.stringify(defaultConvs));
        setShowSidebar(false);
    };

    const handleClearChat = () => {
        updateMessages([
            {
                role: "assistant",
                content: "Chat cleared. What can I do for you now?",
            },
        ]);
    };

    // Export transcripts
    const exportAsTxt = () => {
        const text = messages.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n\n");
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_${currentConvId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    const exportAsHtml = () => {
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${currentConv?.title}</title>
          <style>
            body { font-family: sans-serif; max-width: 650px; margin: 40px auto; padding: 20px; line-height: 1.6; background: #f9fafb; color: #111827; }
            h1 { text-align: center; color: #1a1a2e; }
            .msg { margin-bottom: 20px; padding: 15px; border-radius: 12px; }
            .user { background: #fee2e2; border-left: 5px solid #ef4f5f; }
            .assistant { background: white; border: 1px solid #e5e7eb; border-left: 5px solid #10b981; }
            .role { font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 5px; color: #666; }
          </style>
        </head>
        <body>
          <h1>${currentConv?.title}</h1>
          ${messages.map((m) => `
            <div class="msg ${m.role}">
              <div class="role">${m.role}</div>
              <div>${m.content.replace(/\n/g, "<br>")}</div>
            </div>
          `).join("")}
        </body>
        </html>`;
        const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_${currentConvId}.html`;
        a.click();
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    const exportAsPdf = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        const htmlContent = `
        <html>
        <head>
          <title>AI Chat - ${currentConv?.title}</title>
          <style>
            body { font-family: sans-serif; padding: 30px; line-height: 1.5; }
            h1 { text-align: center; }
            .msg { margin-bottom: 15px; padding: 12px; border-bottom: 1px solid #eee; }
            .role { font-weight: bold; color: #555; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${currentConv?.title}</h1>
          ${messages.map((m) => `
            <div class="msg">
              <div class="role">${m.role.toUpperCase()}</div>
              <div style="white-space: pre-wrap;">${m.content}</div>
            </div>
          `).join("")}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
        </html>`;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setShowExportMenu(false);
    };

    const exportAsImage = (type: "png" | "jpg") => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = 800;
        let y = 60;
        const padding = 40;
        const lineSpacing = 24;

        ctx.font = "16px sans-serif";
        const lines: { text: string; isUser: boolean; isHeader?: boolean }[] = [];

        const wrapText = (text: string, maxWidth: number) => {
            const words = text.split(" ");
            let currentLine = "";
            const wrapped: string[] = [];

            for (let i = 0; i < words.length; i++) {
                const testLine = currentLine + words[i] + " ";
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && i > 0) {
                    wrapped.push(currentLine);
                    currentLine = words[i] + " ";
                } else {
                    currentLine = testLine;
                }
            }
            wrapped.push(currentLine);
            return wrapped;
        };

        messages.forEach((m) => {
            lines.push({ text: `[${m.role.toUpperCase()}]:`, isUser: m.role === "user", isHeader: true });
            const wrap = wrapText(m.content, width - padding * 2);
            wrap.forEach((line) => {
                lines.push({ text: line, isUser: m.role === "user" });
            });
            lines.push({ text: "", isUser: false });
        });

        canvas.width = width;
        canvas.height = lines.length * lineSpacing + y + padding;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Title
        ctx.fillStyle = "#1a1a2e";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(currentConv?.title || "AI Chat Transcript", padding, y);
        y += 40;

        lines.forEach((l) => {
            if (!l.text) {
                y += 8;
                return;
            }
            if (l.isHeader) {
                ctx.font = "bold 13px sans-serif";
                ctx.fillStyle = l.isUser ? "#ef4f5f" : "#10b981";
            } else {
                ctx.font = "15px sans-serif";
                ctx.fillStyle = "#374151";
            }
            ctx.fillText(l.text, padding, y);
            y += lineSpacing;
        });

        const url = canvas.toDataURL(`image/${type === "png" ? "png" : "jpeg"}`);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_${currentConvId}.${type}`;
        a.click();
        setShowExportMenu(false);
    };

    // Helper to render markdown-like lists in chat bubbles or structured JSON dashboard cards
    const renderContent = (content: string) => {
        const extractJSON = (text: string) => {
            let obj: any = null;
            const trimmedText = text.trim();
            try {
                obj = JSON.parse(trimmedText);
            } catch (e) {
                const match = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match && match[1]) {
                    try { obj = JSON.parse(match[1].trim()); } catch (e) {}
                }
                if (!obj) {
                    const firstBrace = trimmedText.indexOf("{");
                    const lastBrace = trimmedText.lastIndexOf("}");
                    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                        try { obj = JSON.parse(trimmedText.substring(firstBrace, lastBrace + 1)); } catch (e) {}
                    }
                }
            }

            if (obj && typeof obj === "object") {
                // Auto-unwrap root wrapper keys if LLM introduces keys like live_orders_dashboard or live_orders_operations_dashboard
                const keys = Object.keys(obj);
                if (keys.length === 1 && typeof obj[keys[0]] === "object" && obj[keys[0]] !== null && !Array.isArray(obj[keys[0]])) {
                    const inner = obj[keys[0]];
                    if (
                        inner.orders || inner.active_orders_details || inner.top_selling_items ||
                        inner.items || inner.restaurant_name || inner.active_orders_count !== undefined ||
                        inner.total_active_orders !== undefined || inner.recommendations || inner.summary
                    ) {
                        return inner;
                    }
                }
                return obj;
            }
            return null;
        };

        const data = extractJSON(content);
        
        const rawOrders = data?.orders || data?.active_orders_details || data?.active_orders_summary?.active_orders_details || [];
        const validOrders = Array.isArray(rawOrders)
            ? rawOrders.filter((o: any) => o && (o.order_id || o.orderId || o._id || (o.items && o.items.length > 0)))
            : [];
        
        const hasTopSelling = Boolean(data?.top_selling_items && data.top_selling_items.length > 0);
        const hasLowRated = Boolean(data?.low_rated_items && data.low_rated_items.length > 0);
        const hasMenuItems = Boolean(data?.items && data.items.length > 0);
        const hasRecommendations = Boolean(
            (data?.recommendations && data.recommendations.length > 0) ||
            (data?.insights && data.insights.length > 0)
        );

        const isDashboardJson = data !== null && (
            validOrders.length > 0 ||
            hasTopSelling ||
            hasLowRated ||
            hasMenuItems ||
            hasRecommendations
        );

        if (!isDashboardJson && data && (data.summary || data.message || data.answer)) {
            content = data.summary || data.message || data.answer;
        }

        if (isDashboardJson && data) {
            const ordersList = data.orders ||
                data.active_orders_details ||
                data.active_orders_summary?.active_orders_details ||
                [];

            const activeCount = data.active_orders_count ??
                data.total_active_orders ??
                data.active_orders_summary?.total_active_orders ??
                ordersList.length;

            const totalRev = data.total_revenue ||
                data.total_revenue_from_active_orders ||
                data.active_orders_summary?.total_revenue_from_active_orders ||
                "";

            const summaryText = data.summary ||
                data.active_orders_summary?.restaurant_name ||
                data.restaurantName ||
                "Restaurant Operations & Active Orders Dashboard";

            return (
                <div className="flex flex-col gap-3.5 text-gray-800 w-full min-w-0 max-w-lg">
                    {/* Header Summary */}
                    <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-90">
                            ⚡ Tomato OS Operations Dashboard
                        </div>
                        <p className="text-xs sm:text-sm font-semibold mt-1.5 leading-relaxed">
                            {summaryText}
                        </p>
                        <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-white/20 text-[10px] sm:text-xs">
                            {data.total_orders !== undefined && (
                                <div>
                                    <span className="opacity-75">Total Orders: </span>
                                    <span className="font-bold">{data.total_orders}</span>
                                </div>
                            )}
                            {totalRev && (
                                <div>
                                    <span className="opacity-75">Revenue: </span>
                                    <span className="font-bold">{totalRev}</span>
                                </div>
                            )}
                            <div>
                                <span className="opacity-75">Active Orders: </span>
                                <span className="font-bold">{activeCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Top Selling Items Table Card */}
                    {data.top_selling_items && data.top_selling_items.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                                    🔥 Top-Selling Items
                                </span>
                                <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-100">
                                    Bestsellers
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider">
                                            <th className="pb-1.5 font-bold">Item</th>
                                            <th className="pb-1.5 font-bold text-center">Orders</th>
                                            <th className="pb-1.5 font-bold text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.top_selling_items.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="py-2 font-semibold text-gray-800">{item.name}</td>
                                                <td className="py-2 text-center font-bold text-gray-600">{item.ordersCount || item.count || item.orders}</td>
                                                <td className="py-2 text-right font-mono font-bold text-emerald-600">{item.revenue || `₹${item.totalRevenue || 0}`}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Low Rated Items & Feedback Card */}
                    {data.low_rated_items && data.low_rated_items.length > 0 && (
                        <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                                <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                                    ⚠️ Low-Rated Items & Feedback Audit
                                </span>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                    Quality Control
                                </span>
                            </div>
                            <div className="space-y-2">
                                {data.low_rated_items.map((review: any, idx: number) => (
                                    <div key={idx} className="bg-amber-50/40 rounded-lg p-2.5 border border-amber-100/60 text-xs space-y-1">
                                        <div className="flex justify-between items-center font-bold text-gray-800">
                                            <span>{review.issue || review.item || "Customer Review Concern"}</span>
                                            <span className="text-amber-600 font-mono text-[11px] font-bold">{review.rating}</span>
                                        </div>
                                        <p className="text-gray-600 italic text-[11px]">"{review.feedback}"</p>
                                        {review.customer && (
                                            <p className="text-[9px] text-gray-400 text-right">— {review.customer} ({review.date || 'Recent'})</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Menu Inventory Items Grid */}
                    {data.items && data.items.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 space-y-2">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-xs font-extrabold text-gray-900">🍽️ Restaurant Menu Inventory ({data.totalItems || data.items.length})</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {data.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-xs">
                                        <span className="font-semibold text-gray-800">{item.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-gray-900">{item.price}</span>
                                            <span className="text-[10px] font-bold">{item.isAvailable}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Orders List */}
                    {(() => {
                        const validOrders = (ordersList || []).filter((o: any) => o && (o.order_id || o.orderId || o._id || (o.items && o.items.length > 0)));
                        if (validOrders.length === 0) {
                            return (
                                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center text-xs text-gray-500 font-medium shadow-xs">
                                    📭 No active orders in this report.
                                </div>
                            );
                        }
                        return (
                            <div className="space-y-3">
                                {validOrders.map((order: any, oIdx: number) => {
                                    const orderId = order.order_id || order.orderId || order._id || "N/A";
                                    const orderStatus = order.status || "placed";
                                    const orderTotal = order.order_total || order.total_amount || order.totalAmount || "0";
                                    const customerName = order.customer_name || order.customerName || "Customer";
                                    const rawItems = order.items;
                                const itemsArray = Array.isArray(rawItems)
                                    ? rawItems
                                    : typeof rawItems === "string"
                                    ? [{ name: rawItems, quantity: 1, unit_price: "", total_price: orderTotal }]
                                    : [];

                                return (
                                    <div key={oIdx} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition duration-200">
                                        <div className="bg-gray-50 border-b border-gray-100 px-3 py-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                                <span className="font-extrabold text-xs sm:text-sm text-gray-900">Order ID: {orderId}</span>
                                            </div>
                                            <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                                                {orderStatus}
                                            </span>
                                        </div>

                                        <div className="p-3.5 space-y-3.5">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                                                    <span>Customer: {customerName}</span>
                                                    {order.placed_at && <span>{order.placed_at}</span>}
                                                </div>
                                                <div className="space-y-1.5">
                                                    {itemsArray.map((item: any, iIdx: number) => (
                                                        <div key={iIdx} className="flex justify-between items-center text-xs">
                                                            <span className="font-medium text-gray-700">
                                                                {item.quantity || 1}x <span className="font-semibold text-gray-900">{item.name || item}</span>
                                                            </span>
                                                            {item.total_price && (
                                                                <span className="text-gray-500 font-mono text-[10px] sm:text-xs">
                                                                    ₹{item.total_price}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-100 text-xs sm:text-sm font-bold text-gray-900">
                                                    <span>Total Amount:</span>
                                                    <span className="font-mono text-red-600">₹{orderTotal}</span>
                                                </div>
                                            </div>

                                            {order.rider && (
                                                <div className="bg-gray-50/70 rounded-lg p-3 border border-gray-100 flex flex-col gap-2">
                                                    <div className="flex items-center gap-3">
                                                        {order.rider.rider_image_url ? (
                                                            <div className="relative h-10 w-10 shrink-0 rounded-full border bg-white overflow-hidden">
                                                                <img
                                                                    src={order.rider.rider_image_url}
                                                                    alt={order.rider.name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border border-white"></span>
                                                            </div>
                                                        ) : (
                                                            <div className="h-10 w-10 shrink-0 rounded-full border bg-gray-100 flex items-center justify-center text-gray-400 text-lg">
                                                                👤
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-gray-900 truncate">Rider: {order.rider.name || order.rider_assigned || "Not Assigned"}</p>
                                                            <p className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                                                                <span>📞 {order.rider.phone || "N/A"}</span>
                                                                <span>•</span>
                                                                <span>🚲 {order.rider.vehicle_type || "Delivery Bike"}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* Actionable Strategic Recommendations Container Box */}
                    {((data.recommendations && data.recommendations.length > 0) || (data.insights && data.insights.length > 0)) && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3.5 flex flex-col gap-2">
                            <p className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                                💡 Strategic & Actionable Recommendations
                            </p>
                            <ul className="space-y-1.5 text-xs text-blue-800 font-medium">
                                {(data.recommendations || data.insights).map((rec: string, idx: number) => (
                                    <li key={idx} className="flex gap-2 items-start leading-relaxed">
                                        <span className="text-blue-500 font-bold">•</span>
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }

        // ── SMART MARKDOWN-TO-UI-CARD PARSER FOR TEXT RESPONSES ────────────────
        // If the AI returns text with markdown headers/tables, render visual UI cards instead of plain asterisks!
        const sections = content.split(/(?=###\s+|\n{2,})/);

        return (
            <div className="flex flex-col gap-3 text-gray-800 w-full min-w-0 max-w-lg font-sans">
                {sections.map((sec, sIdx) => {
                    const trimmed = sec.trim();
                    if (!trimmed) return null;

                    // Table Section Detection (| Header | Header |)
                    if (trimmed.includes("|") && (trimmed.includes("-|-") || trimmed.includes("---"))) {
                        const lines = trimmed.split("\n").filter(l => l.trim().startsWith("|"));
                        if (lines.length >= 2) {
                            const headers = lines[0].split("|").map(h => h.trim()).filter(Boolean);
                            const rows = lines.slice(2).map(r => r.split("|").map(c => c.trim()).filter(Boolean));

                            return (
                                <div key={sIdx} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 my-1 space-y-2">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider bg-gray-50">
                                                    {headers.map((h, hIdx) => (
                                                        <th key={hIdx} className="p-2 font-bold">{h.replace(/\*\*/g, "")}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {rows.map((row, rIdx) => (
                                                    <tr key={rIdx} className="hover:bg-gray-50/60 transition">
                                                        {row.map((cell, cIdx) => (
                                                            <td key={cIdx} className="p-2 font-medium text-gray-800">
                                                                {cell.startsWith("₹") ? (
                                                                    <span className="font-mono font-bold text-emerald-600">{cell}</span>
                                                                ) : cell.includes("⭐") ? (
                                                                    <span className="font-bold text-amber-600 font-mono">{cell}</span>
                                                                ) : (
                                                                    cell.replace(/\*\*/g, "")
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        }
                    }

                    // Warning / Quality Audit Section (contains ⚠️ or Low-Rated)
                    if (trimmed.includes("⚠️") || trimmed.toLowerCase().includes("low-rated") || trimmed.toLowerCase().includes("quality")) {
                        return (
                            <div key={sIdx} className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-xl p-3.5 shadow-sm space-y-2">
                                {trimmed.split("\n").map((line, lIdx) => {
                                    if (line.startsWith("###") || line.startsWith("**")) {
                                        return (
                                            <h4 key={lIdx} className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 border-b border-amber-200/60 pb-1.5">
                                                {line.replace(/^###\s*/, "").replace(/\*\*/g, "")}
                                            </h4>
                                        );
                                    }
                                    return (
                                        <p key={lIdx} className="text-xs text-amber-950 leading-relaxed font-medium">
                                            {line.replace(/\*\*/g, "")}
                                        </p>
                                    );
                                })}
                            </div>
                        );
                    }

                    // Bestseller / Top Selling Section (contains 🔥 or 📈 or Bestseller)
                    if (trimmed.includes("🔥") || trimmed.includes("📈") || trimmed.toLowerCase().includes("top selling") || trimmed.toLowerCase().includes("সর্বাধিক বিক্রিত")) {
                        return (
                            <div key={sIdx} className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-sm space-y-2">
                                {trimmed.split("\n").map((line, lIdx) => {
                                    if (line.startsWith("###") || line.startsWith("**")) {
                                        return (
                                            <div key={lIdx} className="flex justify-between items-center border-b border-emerald-100 pb-1.5">
                                                <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                                                    {line.replace(/^###\s*/, "").replace(/\*\*/g, "")}
                                                </h4>
                                                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    Bestseller
                                                </span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <p key={lIdx} className="text-xs text-gray-800 leading-relaxed">
                                            {line.replace(/\*\*/g, "")}
                                        </p>
                                    );
                                })}
                            </div>
                        );
                    }

                    // Recommendations / Insights Section (contains 💡 or Strategic or Action)
                    if (trimmed.includes("💡") || trimmed.toLowerCase().includes("recommendation") || trimmed.toLowerCase().includes("insight") || trimmed.toLowerCase().includes("পরামর্শ")) {
                        return (
                            <div key={sIdx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-150 rounded-xl p-3.5 shadow-sm space-y-2">
                                {trimmed.split("\n").map((line, lIdx) => {
                                    if (line.startsWith("###") || line.startsWith("**")) {
                                        return (
                                            <h4 key={lIdx} className="text-xs font-extrabold text-blue-900 border-b border-blue-200/60 pb-1.5 border-dashed">
                                                {line.replace(/^###\s*/, "").replace(/\*\*/g, "")}
                                            </h4>
                                        );
                                    }
                                    return (
                                        <p key={lIdx} className="text-xs text-blue-900 leading-relaxed font-medium">
                                            {line.replace(/\*\*/g, "")}
                                        </p>
                                    );
                                })}
                            </div>
                        );
                    }

                    // Header line (###)
                    if (trimmed.startsWith("###")) {
                        return (
                            <div key={sIdx} className="bg-gray-900 text-white rounded-xl p-3 shadow-sm my-0.5">
                                <h3 className="text-xs sm:text-sm font-extrabold tracking-wide">
                                    {trimmed.replace(/^###\s*/, "").replace(/\*\*/g, "")}
                                </h3>
                            </div>
                        );
                    }

                    // Default styled card block
                    return (
                        <div key={sIdx} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-2xs space-y-1">
                            {trimmed.split("\n").map((line, lIdx) => (
                                <p key={lIdx} className="text-xs leading-relaxed text-gray-800 font-medium">
                                    {line.replace(/\*\*/g, "")}
                                </p>
                            ))}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (user?.role !== "seller") return null;

    return (
        <div className="font-sans relative">
            {/* Custom Animations style tag */}

            {/* Chat Dialog Panel */}
                <div className="relative flex h-[calc(100vh-140px)] md:h-[600px] w-full flex-col rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between bg-[#000000] p-4 text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowSidebar(!showSidebar)}
                                className="text-white/80 hover:text-white cursor-pointer mr-1"
                                title="Chat History"
                            >
                                <FiMenu className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${
                                    assistantState === "listening"
                                        ? "bg-cyan-400 animate-pulse"
                                        : assistantState === "thinking"
                                        ? "bg-purple-400 animate-spin border-t-white"
                                        : assistantState === "speaking"
                                        ? "bg-green-400 animate-bounce"
                                        : "bg-red-400"
                                }`}></span>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-bold tracking-tight">Tomato AI</h3>
                                    <p className="text-xs text-white opacity-90 mt-1">Tomato OS Voice & Chat</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            {/* Export Menu Trigger */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="text-white/80 hover:text-white cursor-pointer transition p-1"
                                    title="Export Chat"
                                >
                                    <FiDownload className="h-4.5 w-4.5" />
                                </button>
                                {showExportMenu && (
                                    <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border text-gray-800 text-xs py-1.5 z-1000 font-medium">
                                        <button onClick={exportAsPdf} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 cursor-pointer">📄 Export as PDF</button>
                                        <button onClick={() => exportAsImage("png")} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 cursor-pointer font-sans">🖼️ Export as PNG</button>
                                        <button onClick={() => exportAsImage("jpg")} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 cursor-pointer">🖼️ Export as JPG</button>
                                        <button onClick={exportAsHtml} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 cursor-pointer">📝 Export as HTML</button>
                                        <button onClick={exportAsTxt} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 cursor-pointer">📄 Export as Text</button>
                                    </div>
                                )}
                            </div>

                            {/* Voice Mute/Unmute */}
                            <button
                                onClick={() => setVoiceOutput(!voiceOutput)}
                                className="text-white/80 hover:text-white transition cursor-pointer p-1"
                                title={voiceOutput ? "Mute Voice Output" : "Enable Voice Output"}
                            >
                                {voiceOutput ? <FiVolume2 className="h-4.5 w-4.5 text-green-400" /> : <FiVolumeX className="h-4.5 w-4.5" />}
                            </button>

                        </div>
                    </div>

                    {/* ChatGPT-style History Sidebar Drawer */}
                    {showSidebar && (
                        <div className="absolute left-0 top-14 bottom-0 w-64 bg-[#232323] text-white shadow-2xl z-999 flex flex-col border-r border-white/5 animate-slide-in">
                            {/* Sidebar Header */}
                            <div className="p-3 border-b border-white/5 flex items-center justify-between shrink-0">
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Conversations</span>
                                <button
                                    onClick={handleNewChat}
                                    className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer"
                                >
                                    <FiPlus className="h-3.5 w-3.5" />
                                    New Chat
                                </button>
                            </div>

                            {/* Conversations List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {conversations.map((conv) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => {
                                            setCurrentConvId(conv.id);
                                            setShowSidebar(false);
                                        }}
                                        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition ${
                                            conv.id === currentConvId
                                                ? "bg-white/10 text-white font-bold"
                                                : "text-white/70 hover:bg-white/5 hover:text-white"
                                        }`}
                                    >
                                        <span className="truncate flex-1 pr-2">{conv.title}</span>
                                        <button
                                            onClick={(e) => handleDeleteChat(conv.id, e)}
                                            className="text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-0.5 cursor-pointer"
                                            title="Delete Chat"
                                        >
                                            <FiTrash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Sidebar Footer */}
                            <div className="p-3 border-t border-white/5 flex gap-2 shrink-0">
                                <button
                                    onClick={handleDeleteAll}
                                    className="flex-1 text-center bg-white/12 hover:bg-red-800 hover:text-white py-2 rounded-lg text-xs font-semibold cursor-pointer border border-white/5 transition"
                                >
                                    Clear History
                                </button>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="text-center bg-white/12 hover:bg-white/10 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border border-white/5 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Message Area */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto bg-gray-50 p-2 sm:p-4 space-y-3 sm:space-y-4">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs ${
                                        msg.role === "user"
                                            ? "bg-[#e23744] text-white rounded-br-none"
                                            : "bg-white text-gray-800 border rounded-bl-none"
                                    }`}
                                >
                                    {renderContent(msg.content)}
                                    {msg.isVoice && (
                                        <span className="text-[9px] opacity-70 block text-right mt-1 font-mono">🎙️ Voice Input</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="rounded-2xl border bg-white px-3 sm:px-4 py-2.5 sm:py-3 text-gray-500 rounded-bl-none">
                                    <div className="flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }}></span>
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }}></span>
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions Bar */}
                    <div className="bg-blue-50/50 border-t border-b px-2.5 sm:px-3 py-2 sm:py-2.5 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0 flex items-center gap-1.5 sm:gap-2">
                        {[
                            "What are my active kitchen orders right now?",
                            "আমার রেস্টুরেন্টের আজকের সেল কত হল?",
                            "What is the average price of Chicken Biryani near me?",
                            "Which food items are trending locally?",
                            "Show customer ratings and review feedback.",
                            "আমার কোন আইটেমটি সবচেয়ে বেশি বিক্রি হচ্ছে?",
                            "आज मेरी कुल सेल्स और बेस्ट सेलिंग डिश बताओ?",
                            "Show all items currently in my menu stock.",
                            "Give me 3 AI recommendations to increase daily sales."
                        ].map((prompt, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => sendMessage(prompt, false)}
                                disabled={loading}
                                className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white border border-blue-100 text-[10px] text-blue-700 hover:bg-blue-100 hover:border-blue-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>

                    {/* Language Selector */}
                    <div className="bg-gray-100/50 border-t border-b px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between shrink-0">
                        <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-wider">Voice Lang:</span>
                        <div className="flex gap-1 sm:gap-1.5">
                            {[
                                { code: "en-IN", label: "English" },
                                { code: "bn-IN", label: "বাংলা" },
                                { code: "hi-IN", label: "हिन्दी" }
                            ].map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => setRecognitionLang(lang.code as any)}
                                    className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded-md transition-colors cursor-pointer ${
                                        recognitionLang === lang.code 
                                            ? "bg-red-500 text-white shadow-xs" 
                                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                                    }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Input Control Box */}
                    <form onSubmit={handleSubmit} className="border-t bg-white p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Unified Voice Assistant mic toggle */}
                        <button
                            type="button"
                            onClick={toggleHandsFree}
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer ${
                                handsFree
                                    ? "bg-red-500 border-red-500 text-white animate-pulse"
                                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                            title={handsFree ? "Stop Voice Assistant" : "Start Voice Assistant"}
                        >
                            {handsFree ? <FiMicOff className="h-5 w-5" /> : <FiMic className="h-5 w-5" />}
                        </button>

                        <textarea
                            rows={1}
                            placeholder={handsFree ? "Listening..." : "Ask your assistant..."}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (input.trim() && !loading) {
                                        handleSubmit(e as any);
                                    }
                                }
                            }}
                            disabled={loading}
                            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs sm:text-sm outline-none focus:border-red-500 focus:bg-white transition resize-none overflow-y-auto"
                            style={{ minHeight: '40px', maxHeight: '120px' }}
                        />

                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white transition hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <FiSend className="h-4 w-4" />
                        </button>
                    </form>
                </div>
        </div>
    );
};

export default SellerGenAIPanel;
