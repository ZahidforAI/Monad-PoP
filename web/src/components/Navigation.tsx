"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, LogOut, Menu, X, Sun, Moon, ShoppingBag, HelpCircle, FileText, PlusCircle, MessageSquare, Clipboard } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navigation() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Sync theme on initial load
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }

    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const {
    sessionAddress,
    isCorrectNetwork,
    loading,
    authenticating,
    isMerchant,
    isAdmin,
    login,
    logout,
    switchNetwork,
  } = useAuth();

  const shortAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Nav links configured according to DESIGN.md
  const mainLinks = [
    { name: "Marketplace", href: "/explore", icon: ShoppingBag },
    { name: "How It Works", href: "/#how-it-works", icon: HelpCircle },
    { name: "Proofs", href: "/passports", icon: FileText },
  ];

  const appLinks = [
    { name: "Sell", href: "/sell", icon: PlusCircle },
    { name: "Requests", href: "/requests", icon: Clipboard },
    { name: "Assistant", href: "/assistant", icon: MessageSquare },
  ];

  if (isMerchant) {
    appLinks.push({ name: "Merchant Portal", href: "/merchant", icon: PlusCircle });
  }

  const renderAuthButton = (isMobileView = false) => {
    if (loading) {
      return (
        <button className="px-5 py-2.5 bg-card-border/50 text-foreground/40 rounded-full text-xs font-mono uppercase tracking-wider animate-pulse cursor-not-allowed border border-card-border">
          loading...
        </button>
      );
    }

    if (!isConnected) {
      return (
        <button
          onClick={() => connect({ connector: injected() })}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-mono text-xs font-bold uppercase tracking-widest rounded-full hover:bg-monad-lightPurple hover:shadow-lg active:scale-95 transition-all duration-200 border border-primary/20"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
      );
    }

    if (!isCorrectNetwork) {
      return (
        <button
          onClick={switchNetwork}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-rose hover:opacity-90 text-white font-mono text-xs font-bold uppercase tracking-widest rounded-full active:scale-95 transition-all duration-200 border border-accent-rose/30"
        >
          Switch to Monad
        </button>
      );
    }

    if (!sessionAddress) {
      return (
        <button
          onClick={login}
          disabled={authenticating}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent-cyan to-primary hover:opacity-95 text-white font-mono text-xs font-bold tracking-widest uppercase rounded-full active:scale-95 transition-all duration-200 border border-accent-cyan/30"
        >
          {authenticating ? "Verifying..." : "Verify Session"}
        </button>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end text-right">
          <span className="font-mono text-xs font-semibold text-foreground">{shortAddress(sessionAddress)}</span>
          <div className="flex items-center gap-1 mt-0.5">
            {isAdmin && (
              <span className="px-1.5 py-0.5 bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 rounded text-[9px] font-mono font-bold tracking-wider uppercase">
                ADMIN
              </span>
            )}
            {isMerchant && (
              <span className="px-1.5 py-0.5 bg-monad-lightPurple/15 text-monad-lightPurple border border-monad-lightPurple/30 rounded text-[9px] font-mono font-bold tracking-wider uppercase">
                MERCHANT
              </span>
            )}
            <span className="px-1.5 py-0.5 bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 rounded text-[9px] font-mono font-bold tracking-wider uppercase">
              SECURE
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out / Disconnect"
          className="p-2.5 bg-card border border-card-border hover:bg-accent-rose/10 hover:text-accent-rose hover:border-accent-rose/25 rounded-full transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <>
      <nav
        className={`w-full fixed top-0 left-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "py-3 px-6 md:px-12 bg-background/80 dark:bg-purple-950/80 backdrop-blur-md border-b border-card-border/60 shadow-sm"
            : "py-6 px-6 md:px-12 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-monad-lightPurple flex items-center justify-center font-black text-white text-lg shadow-lg group-hover:scale-105 transition-transform duration-300">
              M
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground leading-none group-hover:text-primary transition">
                Monad <span className="text-primary font-normal">PoP</span>
              </span>
              <span className="text-[9px] font-mono text-foreground/45 tracking-widest uppercase mt-0.5">Testnet MVP</span>
            </div>
          </Link>

          {/* Center Navigation Links (Marketplace, How It Works, Proofs) */}
          <div className="hidden md:flex items-center gap-7">
            {mainLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive ? "text-primary font-semibold" : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            
            {/* Divider */}
            <span className="h-4 w-[1px] bg-card-border"></span>

            {/* App Actions links (Sell, Requests, Assistant) */}
            {appLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-xs font-mono uppercase tracking-wider transition-colors ${
                    isActive ? "text-primary font-bold" : "text-foreground/50 hover:text-foreground"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right Actions: Testnet Badge, Theme Toggle, Connect Button */}
          <div className="hidden md:flex items-center gap-4">
            {/* Testnet Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-mono font-bold tracking-widest text-primary uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse"></span>
              Monad Testnet
            </div>

            <button
              onClick={toggleTheme}
              className="p-2.5 bg-card border border-card-border hover:bg-primary/5 hover:text-primary rounded-full transition-all"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            
            {renderAuthButton()}
          </div>

          {/* Mobile Navigation Trigger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 bg-card border border-card-border text-foreground/80 rounded-full"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-foreground/80 rounded-full bg-card border border-card-border"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Accessible Full-screen Mobile Menu (DESIGN.md) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-purple-950 text-white flex flex-col justify-between p-8 animate-fade-in">
          {/* Header inside mobile menu */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white text-purple-950 flex items-center justify-center font-black text-base">
                M
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Monad <span className="font-light text-purple-300">PoP</span>
              </span>
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white transition-all"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Links */}
          <div className="flex flex-col gap-6 my-auto">
            <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest block mb-2 border-b border-white/10 pb-1">NAVIGATION</span>
            {mainLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-3xl font-bold tracking-tight text-left transition-colors ${
                    isActive ? "text-purple-300" : "text-white hover:text-purple-300"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest block mt-6 mb-2 border-b border-white/10 pb-1">APPLICATION ACTIONS</span>
            <div className="grid grid-cols-2 gap-4">
              {appLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-sm font-mono uppercase tracking-wider text-left transition-colors ${
                      isActive ? "text-purple-300 font-bold" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Footer Actions / Wallet status inside mobile menu */}
          <div className="border-t border-white/10 pt-6 space-y-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse"></span>
              <span className="font-mono text-xs tracking-wider text-purple-200">MONAD TESTNET (10143)</span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              {renderAuthButton(true)}
            </div>
          </div>
        </div>
      )}
      
      {/* Spacer to push content below the nav bar when fixed */}
      <div className="h-[84px] w-full"></div>
    </>
  );
}
