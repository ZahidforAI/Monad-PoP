"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, LogOut, Shield, User, Store, MessageSquare, Menu, X, Sun, Moon, ShoppingBag, History } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navigation() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Sync theme on initial load
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }
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

  const navLinks = [
    { name: "Explore", href: "/explore", icon: ShoppingBag },
    { name: "Sell", href: "/sell", icon: User },
    { name: "Requests", href: "/requests", icon: History },
    { name: "My Passports", href: "/passports", icon: Shield },
    { name: "Merchant Portal", href: "/merchant", icon: Store },
    { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
  ];

  if (isAdmin) {
    navLinks.push({ name: "Admin Portal", href: "/admin", icon: Shield });
  }

  const renderAuthButton = () => {
    if (loading) {
      return (
        <button className="px-4 py-2 bg-card-border/50 text-foreground/40 rounded-lg text-sm animate-pulse cursor-not-allowed border border-card-border">
          Loading...
        </button>
      );
    }

    if (!isConnected) {
      return (
        <button
          onClick={() => connect({ connector: injected() })}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg text-sm transition-all duration-300 hover:opacity-90 hover:shadow-lg border border-primary/20"
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
          className="flex items-center gap-2 px-4 py-2 bg-accent-rose hover:bg-accent-rose/90 text-white font-medium rounded-lg text-sm transition-all duration-300 border border-accent-rose/30"
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
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-cyan to-monad-purple hover:opacity-95 text-white font-medium rounded-lg text-sm transition-all duration-300 border border-accent-cyan/30"
        >
          {authenticating ? "Verifying..." : "Verify Session"}
        </button>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex flex-col items-end text-xs">
          <span className="font-semibold text-foreground">{shortAddress(sessionAddress)}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isAdmin && (
              <span className="px-1.5 py-0.5 bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 rounded text-[9px] font-bold tracking-wider">
                ADMIN
              </span>
            )}
            {isMerchant && (
              <span className="px-1.5 py-0.5 bg-monad-lightPurple/15 text-monad-lightPurple border border-monad-lightPurple/30 rounded text-[9px] font-bold tracking-wider">
                MERCHANT
              </span>
            )}
            <span className="px-1.5 py-0.5 bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 rounded text-[9px] font-bold tracking-wider">
              SECURE
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out / Disconnect"
          className="p-2 bg-card border border-card-border hover:bg-accent-rose/10 hover:text-accent-rose hover:border-accent-rose/25 rounded-lg transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <nav className="w-full bg-card/90 backdrop-blur-md border-b border-card-border sticky top-0 z-50 px-6 py-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-monad-purple to-accent-cyan flex items-center justify-center font-black text-white text-base shadow-lg group-hover:scale-105 transition-transform duration-300">
            M
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground group-hover:text-monad-lightPurple transition">
            Monad <span className="text-monad-lightPurple font-light">PoP</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-2 text-sm font-medium transition ${
                  isActive ? "text-monad-lightPurple font-semibold" : "text-foreground/75 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Theme and Auth Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 bg-card border border-card-border hover:bg-card-border/50 text-foreground/80 hover:text-foreground rounded-lg transition-all"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          
          {renderAuthButton()}
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 bg-card border border-card-border text-foreground/85 rounded-lg"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          
          {renderAuthButton()}
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-foreground/85 hover:text-foreground rounded-lg bg-card border border-card-border"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-card-border flex flex-col gap-4 animate-fade-in">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? "bg-monad-purple/10 text-monad-lightPurple border-l-2 border-monad-lightPurple" : "text-foreground/75 hover:text-foreground hover:bg-card-border"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
