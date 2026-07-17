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
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Receipt {
  id: string;
  chainReceiptId: string;
  contractAddress: string;
  chainId: number;
  merchantAddress: string;
  buyerAddress: string;
  merchantReference: string;
  productIdentifier: string;
  productName: string;
  sku: string | null;
  serialNumber: string | null;
  amount: string;
  currency: string;
  purchasedAt: string;
  returnDeadline: string | null;
  warrantyUntil: string | null;
  receiptHash: string;
  issueTxHash: string;
  status: string;
}

export default function WalletPage() {
  const router = useRouter();
  const { isConnected, sessionAddress, loading, authenticating, login, switchNetwork, isCorrectNetwork } = useAuth();
  const { connect } = useConnect();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [fetchingReceipts, setFetchingReceipts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState("");

  const loadReceipts = async () => {
    if (!sessionAddress) return;
    setFetchingReceipts(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/receipts?role=buyer");
      const data = await res.json();
      if (data.receipts) {
        setReceipts(data.receipts);
      } else {
        setErrorMsg(data.error || "Failed to load receipts");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error fetching receipts");
    } finally {
      setFetchingReceipts(false);
    }
  };

  useEffect(() => {
    if (sessionAddress) {
      loadReceipts();
    }
  }, [sessionAddress]);

  // Statistics
  const activeWarranties = receipts.filter(r => {
    if (!r.warrantyUntil) return false;
    return new Date(r.warrantyUntil) > new Date() && r.status === "Active";
  }).length;

  const activeReturns = receipts.filter(r => {
    if (!r.returnDeadline || r.status !== "Active") return false;
    return new Date(r.returnDeadline) > new Date();
  }).length;

  // Filter & Search Logic
  const filteredReceipts = receipts.filter(r => {
    const matchesSearch =
      r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.merchantReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.sku && r.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.productIdentifier.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || r.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center gap-1 text-primary">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Active</span>
          </span>
        );
      case "Returned":
        return (
          <span className="inline-flex items-center gap-1 text-accent-amber">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-amber"></span>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Returned</span>
          </span>
        );
      case "Refunded":
        return (
          <span className="inline-flex items-center gap-1 text-accent-rose">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-rose"></span>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Refunded</span>
          </span>
        );
      case "Replaced":
        return (
          <span className="inline-flex items-center gap-1 text-monad-lightPurple">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-monad-lightPurple"></span>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Replaced</span>
          </span>
        );
      case "Revoked":
        return (
          <span className="inline-flex items-center gap-1 text-foreground/40">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-foreground/30"></span>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Revoked</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-foreground/50">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">{status}</span>
          </span>
        );
    }
  };

  const getVerificationBadge = (r: Receipt) => {
    if (r.issueTxHash.startsWith("demo-tx-hash")) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/40 border border-outline-variant font-bold tracking-tighter" title="Demo receipt seed">
          DEMO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 font-bold tracking-wider">
        ON-CHAIN
      </span>
    );
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/60 text-xs font-mono">SECURE_AUTHENTICATION_INITIALIZING...</p>
        </div>
      </div>
    );
  }

  // 1. Connection states
  if (!isConnected || !sessionAddress) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full bg-card border border-outline-variant p-8 rounded-lg text-center shadow-xl relative">
          {/* Registration Marks */}
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 text-primary">
            <Wallet className="w-6 h-6" />
          </div>
          
          <h2 className="font-display text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-foreground/60 text-sm mb-8 leading-relaxed">
            Please connect your wallet and verify your session to view your permanent digital purchase credentials.
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
      
      {/* Header with registration marks */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant pb-6">
        <div className="relative inline-block">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="px-6 py-2">
            <h1 className="font-display text-4xl font-bold mb-1">Your receipts</h1>
            <p className="font-mono text-xs text-foreground/50 tracking-wider">SECURE_LEDGER_WALLET_V2.0</p>
          </div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>
        </div>

        <button
          onClick={loadReceipts}
          disabled={fetchingReceipts}
          className="px-4 py-2 border border-outline-variant hover:bg-primary-container/20 text-xs font-mono font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetchingReceipts ? "animate-spin" : ""}`} />
          {fetchingReceipts ? "Syncing..." : "Sync Ledger"}
        </button>
      </header>

      {/* Stats Block */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-outline-variant bg-card divide-y sm:divide-y-0 sm:divide-x divide-outline-variant rounded-lg overflow-hidden">
        <div className="px-6 py-5 text-center">
          <p className="font-mono text-[10px] text-foreground/50 tracking-widest uppercase mb-1">TOTAL RECEIPTS</p>
          <p className="font-mono text-2xl text-primary font-bold">{receipts.length}</p>
        </div>
        <div className="px-6 py-5 text-center">
          <p className="font-mono text-[10px] text-foreground/50 tracking-widest uppercase mb-1">ACTIVE WARRANTIES</p>
          <p className="font-mono text-2xl text-foreground font-bold">{activeWarranties}</p>
        </div>
        <div className="px-6 py-5 text-center bg-accent-rose/5">
          <p className="font-mono text-[10px] text-accent-rose tracking-widest uppercase mb-1 font-bold">RETURN DEADLINES</p>
          <p className="font-mono text-2xl text-accent-rose font-bold">{activeReturns}</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center w-full">
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="text"
              placeholder="SEARCH BY SKU / MERCHANT / ORDER ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border-b border-outline-variant focus:border-primary focus:ring-0 font-mono text-sm pl-12 pr-4 py-3.5 uppercase transition-all outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
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

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-accent-rose text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* Receipts Table */}
      {fetchingReceipts ? (
        <div className="text-center py-24 bg-card rounded-lg border border-outline-variant">
          <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">MIGRATING_LEDGER_STATE...</p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-lg border border-outline-variant flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-foreground/20 mb-4" />
          <h3 className="text-base font-bold text-foreground mb-1">No receipts found</h3>
          <p className="text-foreground/50 text-xs max-w-xs leading-relaxed">
            We couldn't find any digital purchase records matching your criteria.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-container/20 text-foreground/60 font-mono text-[10px] uppercase border-b border-outline-variant">
                  <th className="px-6 py-4 font-bold tracking-wider">Product</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Merchant</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Date</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Warranty</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Verification</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm">
                {filteredReceipts.map(r => (
                  <tr 
                    key={r.id} 
                    className="hover:bg-primary-container/5 cursor-pointer transition-colors group"
                    onClick={() => router.push(`/receipts/${r.id}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="font-bold text-foreground">{r.productName}</div>
                      <div className="font-mono text-[10px] text-foreground/40 mt-0.5">SKU: {r.sku || "N/A"}</div>
                    </td>
                    <td className="px-6 py-5 text-foreground/75 font-medium">{r.merchantReference}</td>
                    <td className="px-6 py-5 text-right font-mono font-bold text-foreground">
                      {parseFloat(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {r.currency}
                    </td>
                    <td className="px-6 py-5 font-mono text-foreground/60 text-xs">
                      {new Date(r.purchasedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                    </td>
                    <td className="px-6 py-5">{getStatusBadge(r.status)}</td>
                    <td className="px-6 py-5 text-foreground/70 text-xs">
                      {r.warrantyUntil ? (
                        new Date(r.warrantyUntil) > new Date() ? (
                          <span className="text-primary font-medium">Expires {new Date(r.warrantyUntil).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                        ) : (
                          <span className="text-foreground/40">Expired</span>
                        )
                      ) : (
                        <span className="text-foreground/30">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5">{getVerificationBadge(r)}</td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-1.5 hover:bg-primary/10 text-foreground/45 hover:text-primary rounded-lg transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-primary-container/5 border-t border-outline-variant">
            <span className="font-mono text-[10px] text-foreground/50 uppercase">
              Displaying {filteredReceipts.length} of {receipts.length} validated proofs
            </span>
          </div>
        </div>
      )}

      {/* Decorative Perforation Break */}
      <div className="mt-6 flex items-center gap-4 opacity-50 select-none">
        <div className="perforated-line"></div>
        <span className="font-mono text-[9px] whitespace-nowrap text-foreground/40 uppercase tracking-widest">End of Verified Ledger</span>
        <div className="perforated-line"></div>
      </div>

    </div>
  );
}
