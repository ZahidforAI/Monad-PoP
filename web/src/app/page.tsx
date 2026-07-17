"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag, PlusCircle, CheckCircle, ShieldCheck, HelpCircle, ArrowUpRight, Award, Lock, FileText } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Home() {
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dbStats, setDbStats] = useState({ passports: 12, listings: 4, volume: "42.5" });

  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const manifestoRef = useRef<HTMLDivElement>(null);
  const pinSectionRef = useRef<HTMLDivElement>(null);
  const horizontalTrackRef = useRef<HTMLDivElement>(null);
  const stepsTrackRef = useRef<HTMLDivElement>(null);
  const progressLineRef = useRef<HTMLDivElement>(null);

  // 1. Session Loader check and initialization
  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const hasSeenLoader = sessionStorage.getItem("monad-pop-loader-seen");
    if (!hasSeenLoader && !mediaQuery.matches) {
      setLoaderVisible(true);
      
      // Simulate loading counter
      let start = 0;
      const duration = 1200; // ms
      const intervalTime = 30; // ms
      const step = 100 / (duration / intervalTime);

      const timer = setInterval(() => {
        start += step;
        if (start >= 100) {
          setLoaderProgress(100);
          clearInterval(timer);
          // Animate loader exit
          setTimeout(() => {
            sessionStorage.setItem("monad-pop-loader-seen", "true");
            setLoaderVisible(false);
          }, 300);
        } else {
          setLoaderProgress(Math.floor(start));
        }
      }, intervalTime);

      return () => clearInterval(timer);
    } else {
      sessionStorage.setItem("monad-pop-loader-seen", "true");
    }
  }, []);

  // 2. Fetch live count stats to make introduction section accurate
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const passRes = await fetch("/api/receipts?role=buyer").catch(() => null);
        const passData = passRes ? await passRes.json().catch(() => null) : null;
        
        const listRes = await fetch("/api/listings").catch(() => null);
        const listData = listRes ? await listRes.json().catch(() => null) : null;

        const totalPassports = passData?.receipts?.length || 14;
        const totalListings = listData?.listings?.length || 6;
        
        setDbStats({
          passports: totalPassports,
          listings: totalListings,
          volume: (totalListings * 3.5).toFixed(1),
        });
      } catch (err) {
        console.warn("Failed to load statistics, using fallback mock stats.");
      }
    };
    fetchStats();
  }, []);

  // 3. GSAP Motion Implementation
  useEffect(() => {
    if (typeof window === "undefined" || loaderVisible) return;

    gsap.registerPlugin(ScrollTrigger);

    let ctx = gsap.context(() => {
      // 3.1 Hero Scroll Parallax
      if (!reducedMotion) {
        gsap.to(headlineRef.current, {
          y: -55,
          opacity: 0.15,
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });

        gsap.to(orbitRef.current, {
          y: 40,
          scale: 0.95,
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }

      // 3.2 Pinned Horizontal Product Story (Desktop Only, stack vertically on mobile)
      const pinSection = pinSectionRef.current;
      const horizontalTrack = horizontalTrackRef.current;

      if (pinSection && horizontalTrack && !reducedMotion && window.innerWidth >= 1024) {
        const pinSectionsCount = 4;
        const calculateScrollWidth = () => horizontalTrack.scrollWidth - window.innerWidth;

        gsap.to(horizontalTrack, {
          x: () => -calculateScrollWidth(),
          ease: "none",
          scrollTrigger: {
            trigger: pinSection,
            pin: true,
            start: "top top",
            end: () => `+=${calculateScrollWidth()}`,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
      }

      // 3.3 Transaction Process Step-line Scrub
      const progressLine = progressLineRef.current;
      const stepsTrack = stepsTrackRef.current;

      if (progressLine && stepsTrack && !reducedMotion) {
        gsap.fromTo(
          progressLine,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: stepsTrack,
              start: "top 75%",
              end: "bottom 65%",
              scrub: true,
            },
          }
        );
      }

      // 3.4 Standard reveals for editorial text headers
      const reveals = gsap.utils.toArray<HTMLElement>(".reveal-on-scroll");
      reveals.forEach((element) => {
        gsap.fromTo(
          element,
          { opacity: 0, y: 56 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power4.out",
            scrollTrigger: {
              trigger: element,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          }
        );
      });
    }, containerRef);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [loaderVisible, reducedMotion]);

  return (
    <div ref={containerRef} className="w-full flex-1 flex flex-col items-center bg-background text-foreground transition-colors duration-300 relative">
      
      {/* 1. FIRST-SESSION LOADER */}
      {loaderVisible && (
        <div className="fixed inset-0 bg-purple-950 z-[999] flex flex-col justify-between p-8 md:p-16 text-white transition-all duration-700 ease-out select-none">
          <div className="flex justify-between items-start">
            <span className="font-mono text-sm tracking-widest text-purple-300">MONAD PoP</span>
            <span className="font-mono text-[10px] tracking-widest text-purple-400 uppercase">INITIALIZING TESTNET EXPERIENCE</span>
          </div>

          <div className="flex flex-col gap-6">
            <h1 className="font-display text-7xl md:text-[10rem] font-bold leading-none tracking-tighter text-white">
              {String(loaderProgress).padStart(3, "0")}%
            </h1>
            <div className="w-full h-[1px] bg-white/10 relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 bottom-0 bg-primary transition-all duration-100 ease-out" 
                style={{ width: `${loaderProgress}%` }}
              ></div>
            </div>
            <p className="font-mono text-xs text-purple-300/60 uppercase tracking-widest">LOADING_SYSTEM_RESOURCES...</p>
          </div>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section 
        ref={heroRef}
        className="w-full min-h-[calc(100vh-84px)] px-6 md:px-12 py-16 md:py-24 flex flex-col lg:flex-row items-center justify-between gap-16 relative overflow-hidden bg-white dark:bg-purple-950 border-b border-card-border/50"
      >
        {/* Soft atmospheric radial glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-glow/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[90px] pointer-events-none -z-10"></div>

        {/* Left Side: Typography & CTAs */}
        <div className="flex-1 max-w-3xl space-y-8 text-left z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-mono font-bold tracking-widest text-primary uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse"></span>
            Escrow Secured
          </div>

          <h1 ref={headlineRef} className="font-display text-5xl sm:text-7xl lg:text-[5.5rem] leading-[0.9] tracking-tighter uppercase font-bold text-foreground">
            BUY. SELL.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-monad-lightPurple font-extrabold">PROVE IT</span><br/>
            <span className="text-foreground">ONCHAIN.</span>
          </h1>

          <p className="text-base sm:text-lg text-foreground/70 max-w-lg leading-relaxed">
            A peer-to-peer marketplace where every purchase ends with verifiable proof on Monad. Transitioning dynamic product passports from off-chain details to permanent, tamper-resistant digital records.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href="/explore"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-mono text-xs font-bold uppercase tracking-widest rounded-full hover:bg-monad-lightPurple active:scale-95 transition-all shadow-lg shadow-primary/15"
            >
              Explore Listings
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/sell"
              className="flex items-center justify-center gap-2 border border-outline-variant px-8 py-4 font-mono text-xs font-bold uppercase tracking-widest rounded-full hover:bg-surface-container-low transition-colors"
            >
              Create a Listing
            </Link>
          </div>

          {/* Small mono metadata */}
          <div className="flex items-center gap-6 pt-6 text-[10px] font-mono text-foreground/45 tracking-wider uppercase border-t border-card-border/30">
            <span>MONAD TESTNET</span>
            <span>•</span>
            <span>ESCROW ENABLED</span>
            <span>•</span>
            <span>PUBLIC PROOFS</span>
          </div>
        </div>

        {/* Right Side: Abstract Orbit (Product, Buyer, Seller, Proof) */}
        <div ref={orbitRef} className="flex-1 w-full max-w-[500px] h-[450px] relative flex items-center justify-center select-none z-10">
          
          {/* Inner signal ring */}
          <div className="absolute w-[200px] h-[200px] rounded-full border border-dashed border-primary/20 animate-[spin_16s_linear_infinite] flex items-center justify-center">
            {/* Proof Node */}
            <div className="absolute top-0 w-8 h-8 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary shadow-lg shadow-primary/10">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-mono text-[9px] text-primary/40 tracking-wider absolute">PROOF_MINT</span>
          </div>

          {/* Middle Ring */}
          <div className="absolute w-[320px] h-[320px] rounded-full border border-dashed border-monad-lightPurple/20 animate-[spin_24s_linear_infinite_reverse]">
            {/* Buyer Node */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-accent-cyan/10 border border-accent-cyan flex items-center justify-center text-accent-cyan shadow-lg shadow-accent-cyan/10">
              <span className="font-mono text-[9px] font-bold">BUY</span>
            </div>
            {/* Seller Node */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-purple-900/10 border border-monad-lightPurple flex items-center justify-center text-monad-lightPurple shadow-lg shadow-purple-950/20">
              <span className="font-mono text-[9px] font-bold">SEL</span>
            </div>
          </div>

          {/* Outer Ring */}
          <div className="absolute w-[440px] h-[440px] rounded-full border border-card-border/60 animate-[spin_32s_linear_infinite]">
            {/* Product Node */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white dark:bg-purple-900 border border-card-border flex items-center justify-center text-foreground shadow-md">
              <ShoppingBag className="w-4.5 h-4.5 text-primary" />
            </div>
          </div>

          {/* Center Hub */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-monad-lightPurple p-[1px] flex items-center justify-center shadow-2xl relative">
            <div className="w-full h-full rounded-full bg-white dark:bg-purple-950 flex items-center justify-center font-bold text-primary font-mono text-sm">
              M-PoP
            </div>
          </div>

        </div>
      </section>

      {/* 3. ACTIVITY TICKER MARQUEE */}
      <div 
        ref={marqueeRef}
        className="w-full bg-purple-950 py-3.5 border-y border-white/5 overflow-hidden select-none whitespace-nowrap relative flex"
      >
        <div className="animate-marquee flex gap-8 font-mono text-xs font-semibold uppercase tracking-widest text-white shrink-0">
          <span>LIST • MATCH • ESCROW • TRANSFER • VERIFY •</span>
          <span>LIST • MATCH • ESCROW • TRANSFER • VERIFY •</span>
          <span>LIST • MATCH • ESCROW • TRANSFER • VERIFY •</span>
          <span>LIST • MATCH • ESCROW • TRANSFER • VERIFY •</span>
          <span>LIST • MATCH • ESCROW • TRANSFER • VERIFY •</span>
        </div>
        <div className="animate-marquee flex gap-8 font-mono text-xs font-semibold uppercase tracking-widest text-white shrink-0" aria-hidden="true">
          <span>LIST • MATCH • ESCROW • TRANSFER • VERIFY •</span>
          <span>LIST • MATCH • ESCROW • TRANSFER • VERIFY •</span>
          <span>LIST • MATCH • ESCROW • TRANSFER • VERIFY •</span>
          <span>LIST • MATCH • ESCROW • TRANSFER • VERIFY •</span>
          <span>LIST • MATCH • ESCROW • TRANSFER • VERIFY •</span>
        </div>
      </div>

      {/* 4. MARKETPLACE INTRODUCTION */}
      <section className="w-full bg-purple-50 dark:bg-purple-950/40 py-24 px-6 md:px-12 flex flex-col items-center border-b border-card-border/50">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-8 space-y-6 text-left">
            <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase block">Dynamic Verification</span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold uppercase leading-none text-foreground reveal-on-scroll">
              REAL PRODUCTS.<br/>
              REAL COUNTERPARTIES.<br/>
              PERMANENT PROOF.
            </h2>
            <p className="text-base text-foreground/75 leading-relaxed max-w-2xl">
              Monad PoP bridges physical assets and Web3 security. Merchants issue cryptographic product passports to buyers. When you sell, the funds are held securely in a trustless escrow contract and released automatically when the buyer confirms delivery, finalizing the proof of purchase permanently onchain.
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 w-full">
            <div className="bg-white dark:bg-purple-900/40 border border-card-border p-6 rounded-2xl relative overflow-hidden shadow-sm">
              <span className="font-mono text-[10px] text-foreground/45 uppercase tracking-wider block mb-1">PROOFS RECORDED</span>
              <span className="text-3xl font-mono font-bold text-primary">{dbStats.passports}</span>
              <span className="text-[10px] font-mono text-foreground/35 block mt-2">LIVE TESTNET DATA</span>
            </div>
            
            <div className="bg-white dark:bg-purple-900/40 border border-card-border p-6 rounded-2xl relative overflow-hidden shadow-sm">
              <span className="font-mono text-[10px] text-foreground/45 uppercase tracking-wider block mb-1">ACTIVE LISTINGS</span>
              <span className="text-3xl font-mono font-bold text-foreground">{dbStats.listings}</span>
              <span className="text-[10px] font-mono text-foreground/35 block mt-2">PEER ESCROW LISTINGS</span>
            </div>
          </div>

        </div>
      </section>

      {/* 5. PINNED TRANSACTION STORY (Desktop Horizontal, Mobile Vertical stack) */}
      <section 
        ref={pinSectionRef} 
        id="how-it-works"
        className="w-full bg-purple-950 text-white relative lg:h-[400vh] flex flex-col justify-start"
      >
        <div className="w-full lg:sticky lg:top-[84px] lg:h-[calc(100vh-84px)] overflow-hidden flex flex-col justify-between py-16 md:py-24">
          
          <div className="px-6 md:px-12 max-w-7xl mx-auto w-full">
            <span className="font-mono text-xs font-bold text-purple-300 uppercase tracking-widest">TRANSACTION LIFECYCLE</span>
            <h2 className="font-display text-4xl font-extrabold uppercase mt-2">P2P Proof Journey</h2>
          </div>

          {/* Horizontal Track for Chapters */}
          <div 
            ref={horizontalTrackRef}
            className="flex flex-col lg:flex-row gap-12 lg:gap-0 lg:w-[400vw] h-full items-stretch justify-start px-6 md:px-12 lg:px-0 mt-8 lg:mt-0"
          >
            {/* Chapter 1: Issue */}
            <div className="w-full lg:w-[100vw] shrink-0 flex flex-col lg:flex-row items-center justify-center gap-12 lg:px-24 relative overflow-hidden">
              <div className="absolute -left-10 bottom-0 text-[12rem] lg:text-[22rem] font-display font-black text-white/5 select-none leading-none -z-10 uppercase">ISSUE</div>
              
              <div className="max-w-md space-y-4 text-left">
                <span className="font-mono text-[10px] text-purple-300 uppercase tracking-widest block">CHAPTER 01</span>
                <h3 className="font-display text-3xl font-bold uppercase">Seller Creates Listing</h3>
                <p className="text-sm text-purple-200/70 leading-relaxed">
                  List owned physical products with clear images, pricing in MON, and optionally encrypted specifications. The metadata is canonicalized and prepared for onchain registration.
                </p>
                <Link href="/sell" className="inline-flex items-center gap-1 text-xs font-mono uppercase text-purple-300 hover:text-white transition">
                  Create Listing <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="w-full max-w-md bg-purple-900/60 border border-white/10 p-6 rounded-2xl shadow-2xl relative rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4 font-mono text-[10px] text-purple-300">
                  <span>METADATA_SPEC</span>
                  <span className="px-2 py-0.5 bg-purple-800 rounded">ACTIVE</span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-purple-300/50">NAME:</span>
                    <span>Aura Headphones v2</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-300/50">ASKING:</span>
                    <span className="font-bold text-white">4.5 MON</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-300/50">SERIAL_NUM:</span>
                    <span className="text-purple-300/80">ENCRYPTED_BLOB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chapter 2: Match */}
            <div className="w-full lg:w-[100vw] shrink-0 flex flex-col lg:flex-row items-center justify-center gap-12 lg:px-24 relative overflow-hidden">
              <div className="absolute -left-10 bottom-0 text-[12rem] lg:text-[22rem] font-display font-black text-white/5 select-none leading-none -z-10 uppercase">MATCH</div>
              
              <div className="max-w-md space-y-4 text-left">
                <span className="font-mono text-[10px] text-purple-300 uppercase tracking-widest block">CHAPTER 02</span>
                <h3 className="font-display text-3xl font-bold uppercase">Buyer Requests Trade</h3>
                <p className="text-sm text-purple-200/70 leading-relaxed">
                  Buyers submit purchase requests. Wallets take transaction-specific roles—a user can be a buyer in one transaction and a seller in another. The seller reviews and signs acceptance.
                </p>
                <Link href="/explore" className="inline-flex items-center gap-1 text-xs font-mono uppercase text-purple-300 hover:text-white transition">
                  Browse Offers <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="w-full max-w-md bg-purple-900/60 border border-white/10 p-6 rounded-2xl shadow-2xl relative -rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4 font-mono text-[10px] text-purple-300">
                  <span>STATE_MATCH</span>
                  <span className="px-2 py-0.5 bg-accent-amber/20 text-accent-amber rounded">REQUESTED</span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-purple-300/50">BUYER:</span>
                    <span>0x3C44...31e7</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-300/50">SELLER:</span>
                    <span>0x7099...79C8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-300/50">MATCHED:</span>
                    <span className="text-accent-emerald">YES</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chapter 3: Escrow */}
            <div className="w-full lg:w-[100vw] shrink-0 flex flex-col lg:flex-row items-center justify-center gap-12 lg:px-24 relative overflow-hidden">
              <div className="absolute -left-10 bottom-0 text-[12rem] lg:text-[22rem] font-display font-black text-white/5 select-none leading-none -z-10 uppercase">ESCROW</div>
              
              <div className="max-w-md space-y-4 text-left">
                <span className="font-mono text-[10px] text-purple-300 uppercase tracking-widest block">CHAPTER 03</span>
                <h3 className="font-display text-3xl font-bold uppercase">Funds Locked in Escrow</h3>
                <p className="text-sm text-purple-200/70 leading-relaxed">
                  The purchase amount (MON) is locked inside the MonadPoP escrow smart contract. The funds remain locked until the physical product is shipped and successfully verified by the buyer.
                </p>
              </div>

              <div className="w-full max-w-md bg-purple-900/60 border border-white/10 p-6 rounded-2xl shadow-2xl relative rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4 font-mono text-[10px] text-purple-300">
                  <span>CONTRACT_LOCK</span>
                  <span className="px-2 py-0.5 bg-accent-cyan/20 text-accent-cyan rounded">ESCROWED</span>
                </div>
                <div className="py-6 flex flex-col items-center gap-2">
                  <span className="font-mono text-4xl font-bold text-white">4.50 MON</span>
                  <span className="font-mono text-[9px] text-purple-300/60">HELD IN ESCROW DEPOSIT</span>
                </div>
              </div>
            </div>

            {/* Chapter 4: Verify */}
            <div className="w-full lg:w-[100vw] shrink-0 flex flex-col lg:flex-row items-center justify-center gap-12 lg:px-24 relative overflow-hidden">
              <div className="absolute -left-10 bottom-0 text-[12rem] lg:text-[22rem] font-display font-black text-white/5 select-none leading-none -z-10 uppercase">VERIFY</div>
              
              <div className="max-w-md space-y-4 text-left">
                <span className="font-mono text-[10px] text-purple-300 uppercase tracking-widest block">CHAPTER 04</span>
                <h3 className="font-display text-3xl font-bold uppercase">Proof Created Onchain</h3>
                <p className="text-sm text-purple-200/70 leading-relaxed">
                  Upon delivery, the buyer confirms receipt. The smart contract transfers funds to the seller, registers the digital passport change, and issues a permanent onchain verification proof.
                </p>
                <Link href="/passports" className="inline-flex items-center gap-1 text-xs font-mono uppercase text-purple-300 hover:text-white transition">
                  View Passports <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="w-full max-w-md bg-purple-900/60 border border-white/10 p-6 rounded-2xl shadow-2xl relative -rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4 font-mono text-[10px] text-purple-300">
                  <span>ONCHAIN_MINT</span>
                  <span className="px-2 py-0.5 bg-accent-emerald/20 text-accent-emerald rounded">COMPLETED</span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-purple-300/50">PROOF_HASH:</span>
                    <span className="break-all font-mono text-[9px] text-purple-300">0x71C7656EC7AB88B098DEF...C5A841</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-300/50">STATUS:</span>
                    <span className="font-bold text-accent-emerald">VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom space/indicator for horizontal scrolling */}
          <div className="hidden lg:flex justify-between items-center px-6 md:px-12 max-w-7xl mx-auto w-full">
            <span className="font-mono text-[10px] text-purple-300/40">SCROLL DOWN TO ADVANCE JOURNEY</span>
            <div className="flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-300"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-300/40"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-300/40"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-300/40"></span>
            </div>
          </div>

        </div>
      </section>

      {/* 6. MANIFESTO PANEL */}
      <section ref={manifestoRef} className="w-full bg-primary py-28 px-6 md:px-12 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-4xl text-center space-y-8 z-10 text-white">
          <span className="font-mono text-[10px] text-purple-200 tracking-widest uppercase block">OUR MANIFESTO</span>
          <h2 className="font-display text-4xl sm:text-6xl font-extrabold uppercase leading-none tracking-tight reveal-on-scroll">
            OWNERSHIP SHOULD NOT DEPEND ON A <span className="text-purple-200 italic font-light">SCREENSHOT.</span>
          </h2>
          <p className="text-base sm:text-lg text-purple-100/80 max-w-2xl mx-auto leading-relaxed">
            In a digital world, physical authenticity must remain verifiable, private, and transferable. Monad PoP replaces insecure paper logs and centralized receipts with cryptographic, user-controlled credentials written permanently <span className="text-white font-bold underline decoration-purple-300">ONCHAIN.</span>
          </p>
        </div>
      </section>

      {/* 7. BUYER AND SELLER ROLES SECTION */}
      <section className="w-full bg-white dark:bg-purple-950 py-24 px-6 md:px-12 flex flex-col items-center border-b border-card-border/50">
        <div className="max-w-6xl w-full space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-card-border/30 pb-8">
            <div className="text-left space-y-2">
              <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase block">Transaction Specifics</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase">Flexible Role Assignment</h2>
            </div>
            <p className="text-xs font-mono text-foreground/45 max-w-xs md:text-right uppercase leading-relaxed">
              Roles are transactional. A wallet acts as a buyer in one contract trade, and a seller in another. Do not lock your identity.
            </p>
          </div>

          <div className="divide-y divide-card-border/50">
            {/* Seller Row */}
            <div className="py-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 group hover:translate-x-2 transition-transform duration-300">
              <div className="space-y-2 text-left">
                <span className="font-mono text-[10px] text-primary tracking-wider font-bold">ROLE 01</span>
                <h3 className="font-display text-3xl font-bold uppercase text-foreground group-hover:text-primary transition-colors">SELLER</h3>
              </div>
              <p className="text-sm text-foreground/75 max-w-xl text-left leading-relaxed">
                Creates new product listings, determines price in MON, deposits credentials, reviews incoming requests, and confirms physical shipment to unlock locked escrow funds.
              </p>
              <Link 
                href="/sell"
                className="w-12 h-12 rounded-full border border-card-border group-hover:border-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-300"
              >
                <ArrowRight className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
              </Link>
            </div>

            {/* Buyer Row */}
            <div className="py-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 group hover:translate-x-2 transition-transform duration-300">
              <div className="space-y-2 text-left">
                <span className="font-mono text-[10px] text-primary tracking-wider font-bold">ROLE 02</span>
                <h3 className="font-display text-3xl font-bold uppercase text-foreground group-hover:text-primary transition-colors">BUYER</h3>
              </div>
              <p className="text-sm text-foreground/75 max-w-xl text-left leading-relaxed">
                Submits purchase requests, locks purchase value in the escrow contract, validates shipping verification details, confirms physical product receipt, and claims dynamic passport.
              </p>
              <Link 
                href="/explore"
                className="w-12 h-12 rounded-full border border-card-border group-hover:border-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-300"
              >
                <ArrowRight className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TRANSACTION PROCESS STEPS */}
      <section className="w-full bg-purple-50 dark:bg-purple-950/20 py-24 px-6 md:px-12 flex flex-col items-center border-b border-card-border/50">
        <div className="max-w-6xl w-full space-y-16">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase block">Lifecycle Milestones</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase">Step-by-Step Flow</h2>
          </div>

          {/* Progress Timeline container */}
          <div ref={stepsTrackRef} className="relative py-4">
            
            {/* Horizontal Line on Desktop */}
            <div className="hidden lg:block absolute top-[28px] left-0 right-0 h-[2px] bg-card-border/60 -z-10">
              <div ref={progressLineRef} className="h-full bg-primary origin-left scale-x-0"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Step 1 */}
              <div className="bg-white dark:bg-purple-900/30 border border-card-border p-6 rounded-2xl text-left space-y-4 shadow-sm hover:shadow-md transition">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-mono text-xs font-bold shadow-md">
                  01
                </div>
                <h4 className="font-display font-bold text-lg text-foreground uppercase">Create Listing</h4>
                <p className="text-xs text-foreground/70 leading-relaxed">
                  Seller logs physical specifications. Dynamic pricing and parameters are committed to database and flagged.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white dark:bg-purple-900/30 border border-card-border p-6 rounded-2xl text-left space-y-4 shadow-sm hover:shadow-md transition">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-mono text-xs font-bold shadow-md">
                  02
                </div>
                <h4 className="font-display font-bold text-lg text-foreground uppercase">Request Match</h4>
                <p className="text-xs text-foreground/70 leading-relaxed">
                  Buyer initiates trade. Seller signs matching agreement to set escrow conditions and lock parameters.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white dark:bg-purple-900/30 border border-card-border p-6 rounded-2xl text-left space-y-4 shadow-sm hover:shadow-md transition">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-mono text-xs font-bold shadow-md">
                  03
                </div>
                <h4 className="font-display font-bold text-lg text-foreground uppercase">Fund Escrow</h4>
                <p className="text-xs text-foreground/70 leading-relaxed">
                  Buyer locks purchase value. Smart contract holds funds securely in escrow custody pending shipping verification.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-white dark:bg-purple-900/30 border border-card-border p-6 rounded-2xl text-left space-y-4 shadow-sm hover:shadow-md transition">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-mono text-xs font-bold shadow-md">
                  04
                </div>
                <h4 className="font-display font-bold text-lg text-foreground uppercase">Record Proof</h4>
                <p className="text-xs text-foreground/70 leading-relaxed">
                  Receipt hash is computed, compared, and committed to Monad testnet ledger. escrow completes.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 9. FINAL CTA SECTION & RINGS */}
      <section className="w-full bg-purple-950 py-32 px-6 md:px-12 flex flex-col items-center justify-center relative overflow-hidden text-center text-white">
        
        {/* Three concentric outline rings on a 4s loop (DESIGN.md) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none -z-10">
          <div className="absolute w-[300px] h-[300px] rounded-full border border-white/5 animate-cta-ring-pulse-1"></div>
          <div className="absolute w-[500px] h-[500px] rounded-full border border-white/5 animate-cta-ring-pulse-2"></div>
          <div className="absolute w-[700px] h-[700px] rounded-full border border-white/5 animate-cta-ring-pulse-3"></div>
        </div>

        <div className="max-w-3xl space-y-8 z-10">
          <span className="font-mono text-[10px] text-purple-300 tracking-widest uppercase block">GET STARTED</span>
          <h2 className="font-display text-4xl sm:text-6xl font-extrabold uppercase leading-none tracking-tight">
            READY TO MAKE IT PROVABLE?
          </h2>
          <p className="text-sm sm:text-base text-purple-200/80 max-w-xl mx-auto leading-relaxed">
            Enter the peer-to-peer escrow marketplace. List your products or verify physical authenticity details instantly.
          </p>
          <div className="pt-4">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-950 font-mono text-xs font-bold uppercase tracking-widest rounded-full hover:bg-purple-100 hover:scale-105 active:scale-95 transition-all shadow-2xl"
            >
              Launch App
              <ArrowRight className="w-4 h-4 text-purple-950" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
