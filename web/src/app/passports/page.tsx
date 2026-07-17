"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  Search,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Wallet,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag,
  Tag
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Passport {
  id: string;
  chainReceiptId: string;
  merchantAddress: string;
  buyerAddress: string;
  productIdentifier: string;
  productName: string;
  brand: string;
  model: string;
  imageUrl: string | null;
  description: string;
  purchasedAt: string;
  warrantyUntil: string | null;
  status: string;
  merchantReference: string;
  issueTxHash: string;
}

export default function PassportsPage() {
  const router = useRouter();
  const { isConnected, sessionAddress, loading, authenticating, login, switchNetwork, isCorrectNetwork } = useAuth();
  const { connect } = useConnect();

  const [passports, setPassports] = useState<Passport[]>([]);
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState("");

  const loadPassports = async () => {
    if (!sessionAddress) return;
    setFetching(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/receipts?role=buyer");
      const data = await res.json();
      if (data.receipts) {
        setPassports(data.receipts);
      } else {
        setErrorMsg(data.error || "Failed to load passports");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error fetching passports");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (sessionAddress) {
      loadPassports();
    }
  }, [sessionAddress]);

  // Statistics
  const activeWarranties = passports.filter(p => {
    if (!p.warrantyUntil) return false;
    return new Date(p.warrantyUntil) > new Date() && p.status === "Active";
  }).length;

  const activeReturns = passports.filter(p => {
    if (!p.status) return false;
    return p.status === "Active";
  }).length;

  // Filter & Search Logic
  const filteredPassports = passports.filter(p => {
    const matchesSearch =
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.merchantReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.productIdentifier.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || p.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center gap-1.5 text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider">
            Active
          </span>
        );
      case "Returned":
        return (
          <span className="inline-flex items-center gap-1.5 text-accent-amber bg-accent-amber/10 border border-accent-amber/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider">
            Returned
          </span>
        );
      case "Refunded":
        return (
          <span className="inline-flex items-center gap-1.5 text-accent-rose bg-accent-rose/10 border border-accent-rose/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider">
            Refunded
          </span>
        );
      case "Replaced":
        return (
          <span className="inline-flex items-center gap-1.5 text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider">
            Replaced
          </span>
        );
      case "Revoked":
        return (
          <span className="inline-flex items-center gap-1.5 text-foreground/45 bg-foreground/5 border border-outline-variant px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider">
            Revoked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-foreground/60 bg-foreground/10 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider">
            {status}
          </span>
        );
    }
  };

  const getVerificationBadge = (p: Passport) => {
    if (p.issueTxHash.startsWith("demo-tx-hash")) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/45 border border-outline-variant font-bold tracking-tighter" title="Demo passport seed">
          DEMO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 font-bold tracking-wider">
        VERIFIED
      </span>
    );
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">SECURE_AUTHENTICATION_INITIALIZING...</p>
        </div>
      </div>
    );
  }

  if (!isConnected || !sessionAddress) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full bg-card border border-outline-variant p-8 rounded-lg text-center shadow-xl relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 text-primary">
            <Wallet className="w-6 h-6" />
          </div>
          
          <h2 className="font-display text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-foreground/60 text-sm mb-8 leading-relaxed">
            Please connect your wallet and verify your session to view your verified digital product passports.
          </p>

          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              className="w-full py-3 bg-primary text-white font-semibold rounded-lg text-xs font-mono uppercase tracking-widest hover:opacity-90 transition-all"
            >
              Connect Wallet
            </button>
          ) : !isCorrectNetwork ? (
            <button
              onClick={switchNetwork}
              className="w-full py-3 bg-accent-rose text-white font-semibold rounded-lg text-xs font-mono uppercase tracking-widest hover:opacity-90 transition-all"
            >
              Switch to Monad Testnet
            </button>
          ) : (
            <button
              onClick={login}
              disabled={authenticating}
              className="w-full py-3 bg-primary text-white font-semibold rounded-lg text-xs font-mono uppercase tracking-widest hover:opacity-90 transition-all"
            >
              {authenticating ? "Verifying..." : "Verify Session"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant pb-6">
        <div className="relative inline-block">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="px-6 py-2">
            <h1 className="font-display text-4xl font-bold mb-1">My Passports</h1>
            <p className="font-mono text-xs text-foreground/50 tracking-wider">PRODUCT_PASSPORT_REGISTRY_V2.0</p>
          </div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>
        </div>

        <button
          onClick={loadPassports}
          disabled={fetching}
          className="px-4 py-2 border border-outline-variant hover:bg-primary-container/20 text-xs font-mono font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
          {fetching ? "Syncing..." : "Sync Passports"}
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-outline-variant bg-card divide-y sm:divide-y-0 sm:divide-x divide-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-5 text-center">
          <p className="font-mono text-[10px] text-foreground/50 tracking-widest uppercase mb-1">OWNED PASSPORTS</p>
          <p className="font-mono text-2xl text-primary font-bold">{passports.length}</p>
        </div>
        <div className="px-6 py-5 text-center">
          <p className="font-mono text-[10px] text-foreground/50 tracking-widest uppercase mb-1">ACTIVE COVERAGE</p>
          <p className="font-mono text-2xl text-foreground font-bold">{activeWarranties}</p>
        </div>
        <div className="px-6 py-5 text-center bg-accent-emerald/5">
          <p className="font-mono text-[10px] text-accent-emerald tracking-widest uppercase mb-1 font-bold">VALID LEDGERS</p>
          <p className="font-mono text-2xl text-accent-emerald font-bold">{activeReturns}</p>
        </div>
      </div>

      {/* Controls */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center w-full">
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="text"
              placeholder="SEARCH PASSPORTS BY BRAND, PRODUCT NAME, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border-b border-outline-variant focus:border-primary focus:ring-0 font-mono text-sm pl-12 pr-4 py-3.5 uppercase transition-all outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full lg:w-auto overflow-x-auto">
            {["ALL", "ACTIVE", "RETURNED", "REFUNDED", "REPLACED", "REVOKED"].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`font-mono text-[10px] px-4 py-2.5 border font-bold tracking-widest rounded transition-all shrink-0 uppercase ${
                  statusFilter === status
                    ? "bg-primary text-white border-primary"
                    : "bg-card border-outline-variant text-foreground/60 hover:text-foreground hover:bg-primary-container/10"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="p-4 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-accent-rose text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* Grid of Passports */}
      {fetching ? (
        <div className="text-center py-24 bg-card rounded-lg border border-outline-variant">
          <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">LOADING_PASSPORT_LEDGERS...</p>
        </div>
      ) : filteredPassports.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-lg border border-outline-variant flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-foreground/20 mb-4" />
          <h3 className="text-base font-bold text-foreground mb-1">No Passports Found</h3>
          <p className="text-foreground/50 text-xs max-w-xs leading-relaxed">
            No owned product passport credentials match your filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPassports.map(p => (
            <div
              key={p.id}
              className="bg-card border border-outline-variant rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group relative"
            >
              {/* Image Header */}
              <div className="h-48 w-full bg-primary-container/5 relative border-b border-outline-variant overflow-hidden">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.productName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-foreground/15">
                    <ShoppingBag className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  {getStatusBadge(p.status)}
                </div>
                <div className="absolute top-4 right-4">
                  {getVerificationBadge(p)}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-primary tracking-widest uppercase">{p.brand}</span>
                  <h3 className="font-display font-bold text-lg text-foreground truncate">{p.productName}</h3>
                  <p className="text-xs text-foreground/60 font-mono">Model: {p.model}</p>
                </div>

                <div className="border-t border-outline-variant/30 pt-4 grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-foreground/40 block uppercase">Passport ID</span>
                    <span className="font-bold">#MP-{p.chainReceiptId}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-foreground/40 block uppercase">Warranty</span>
                    <span className="font-semibold text-primary/95">
                      {p.warrantyUntil ? new Date(p.warrantyUntil).toLocaleDateString() : "None"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href={`/passports/${p.chainReceiptId}`}
                    className="flex-1 py-2 text-center border border-outline-variant hover:bg-card-border/60 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition"
                  >
                    View Details
                  </Link>
                  {p.status === "Active" && (
                    <Link
                      href={`/sell?passportId=${p.chainReceiptId}`}
                      className="py-2 px-3 border border-primary bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-mono font-semibold uppercase transition flex items-center justify-center gap-1.5"
                      title="Sell on Escrow Marketplace"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Sell
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Perforation line */}
      <div className="mt-6 flex items-center gap-4 opacity-50 select-none">
        <div className="perforated-line"></div>
        <span className="font-mono text-[9px] whitespace-nowrap text-foreground/40 uppercase tracking-widest font-bold">End of Passport Ledger</span>
        <div className="perforated-line"></div>
      </div>

    </div>
  );
}
