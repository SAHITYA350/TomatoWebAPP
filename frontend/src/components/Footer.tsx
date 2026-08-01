import { useLocation } from "react-router-dom";
import { FiLinkedin, FiGithub, FiInstagram, FiMail, FiCode, FiGlobe, FiHeart } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

const Footer = () => {
    let pathname = "";
    try {
        const location = useLocation();
        pathname = location?.pathname || "";
    } catch (e) {
        pathname = window.location.pathname || "";
    }

    if (pathname === "/reels") return null;

    return (
        <footer className="bg-[#090a10] text-gray-400 pt-10 sm:pt-14 pb-8 border-t border-gray-800/80 mt-12 sm:mt-16 select-none w-full font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Top Section: Brand + Country/Language Selectors */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 sm:pb-10 border-b border-gray-800/80">
                    <div className="flex items-center gap-2.5">
                        <a href="/" className="inline-flex items-center gap-1.5 text-2xl sm:text-3xl font-black tracking-tighter text-[#E23744]">
                            <span className="text-3xl sm:text-4xl leading-none">🍅</span>
                            <span className="italic">Tomato</span>
                        </a>
                        <span className="text-[10px] sm:text-xs bg-red-500/10 text-red-400 font-bold px-2 py-0.5 sm:py-1 rounded-md border border-red-500/20 uppercase tracking-wider">
                            AI EDITION
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-gray-300">
                        <div className="flex items-center gap-2 bg-[#12141f] border border-gray-800 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-gray-800 transition shadow-xs">
                            <FiGlobe className="text-gray-400" />
                            <span>India (IN)</span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#12141f] border border-gray-800 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-gray-800 transition shadow-xs">
                            <span>🌐 English</span>
                        </div>
                    </div>
                </div>

                {/* Main Links Navigation Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 py-8 sm:py-10 border-b border-gray-800/80 text-xs">
                    
                    {/* Column 1: About Tomato */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">About Tomato</h4>
                        <ul className="space-y-2 font-medium text-gray-400">
                            <li><a href="#" className="hover:text-white transition">Who We Are</a></li>
                            <li><a href="#" className="hover:text-white transition">Blog & Tech</a></li>
                            <li><a href="#" className="hover:text-white transition">Work With Us</a></li>
                            <li><a href="#" className="hover:text-white transition">Investor Relations</a></li>
                            <li><a href="#" className="hover:text-white transition">Report Fraud</a></li>
                            <li><a href="#" className="hover:text-white transition">Press & Media</a></li>
                        </ul>
                    </div>

                    {/* Column 2: Tomatoverse */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Tomatoverse</h4>
                        <ul className="space-y-2 font-medium text-gray-400">
                            <li><a href="#" className="hover:text-white transition">Tomato AI Assistant</a></li>
                            <li><a href="/reels" className="hover:text-white transition">Food Reels</a></li>
                            <li><a href="#" className="hover:text-white transition">Blinkit Express</a></li>
                            <li><a href="#" className="hover:text-white transition">Feeding India</a></li>
                            <li><a href="#" className="hover:text-white transition">Hyperpure Quality</a></li>
                            <li><a href="#" className="hover:text-white transition">Tomato Live</a></li>
                        </ul>
                    </div>

                    {/* Column 3: For Restaurants & Partners */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">For Restaurants</h4>
                        <ul className="space-y-2 font-medium text-gray-400">
                            <li><a href="#" className="hover:text-white transition">Partner With Us</a></li>
                            <li><a href="#" className="hover:text-white transition">Apps For You</a></li>
                            <li><a href="#" className="hover:text-white transition">Seller AI Operations</a></li>
                            <li><a href="#" className="hover:text-white transition">Rider Fleet Logistics</a></li>
                            <li><a href="#" className="hover:text-white transition">Smart Bundle Agent</a></li>
                        </ul>
                    </div>

                    {/* Column 4: Learn More */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Learn More</h4>
                        <ul className="space-y-2 font-medium text-gray-400">
                            <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-white transition">Security & Trust</a></li>
                            <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-white transition">Sitemap</a></li>
                            <li><a href="#" className="hover:text-white transition">Cookie Preferences</a></li>
                        </ul>
                    </div>

                    {/* Column 5: Developer Connect Card (Sahitya Ghosh) */}
                    <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-1 space-y-3 bg-[#11131c] border border-gray-800/80 p-4 rounded-2xl shadow-xs">
                        <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center justify-between gap-2">
                            <span>DEVELOPER CONNECT</span>
                            <span className="text-[9px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                                SAHITYA GHOSH
                            </span>
                        </h4>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                            Designed & Engineered by <strong className="text-gray-200">Sahitya Ghosh</strong>. Full-stack microservices architecture.
                        </p>

                        {/* Social Icons Row */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <a
                                href="https://www.linkedin.com/in/sahitya-ghosh-9ba098292/"
                                target="_blank"
                                rel="noreferrer"
                                title="LinkedIn Profile"
                                className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition cursor-pointer"
                            >
                                <FiLinkedin size={14} />
                            </a>

                            <a
                                href="https://github.com/SAHITYA350"
                                target="_blank"
                                rel="noreferrer"
                                title="GitHub Repository"
                                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition cursor-pointer"
                            >
                                <FiGithub size={14} />
                            </a>

                            <a
                                href="https://leetcode.com/u/sahityaghosh/"
                                target="_blank"
                                rel="noreferrer"
                                title="LeetCode Profile"
                                className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-gray-950 border border-amber-500/30 transition cursor-pointer"
                            >
                                <FiCode size={14} />
                            </a>

                            <a
                                href="https://www.instagram.com/sahityaghosh_350/?__pwa=1#"
                                target="_blank"
                                rel="noreferrer"
                                title="Instagram Profile"
                                className="p-2 rounded-xl bg-pink-500/20 hover:bg-pink-600 text-pink-400 hover:text-white border border-pink-500/30 transition cursor-pointer"
                            >
                                <FiInstagram size={14} />
                            </a>

                            <a
                                href="https://wa.me/918777099335"
                                target="_blank"
                                rel="noreferrer"
                                title="WhatsApp Contact"
                                className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition cursor-pointer"
                            >
                                <FaWhatsapp size={14} />
                            </a>

                            <a
                                href="mailto:sahityaghosh350@gmail.com"
                                title="Email Contact"
                                className="p-2 rounded-xl bg-red-500/20 hover:bg-[#E23744] text-red-400 hover:text-white border border-red-500/30 transition cursor-pointer"
                            >
                                <FiMail size={14} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Legal & Copyright Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 sm:pt-8 text-[11px] sm:text-xs text-gray-400 font-sans">
                    <p className="font-medium text-center sm:text-left leading-relaxed">
                        By continuing past this page, you agree to our Terms of Service, Cookie Policy, Privacy Policy and Content Policies. 2026 © Tomato™ Ltd. All rights reserved.
                    </p>
                    <p className="shrink-0 text-gray-400 text-[11px] flex items-center gap-1 font-sans">
                        Built with <FiHeart className="text-red-500 fill-red-500 mx-0.5" size={12} /> by <span className="font-bold text-gray-200">Sahitya Ghosh</span>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
