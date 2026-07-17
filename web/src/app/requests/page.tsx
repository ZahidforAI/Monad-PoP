"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  History,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  ShoppingBag,
  RefreshCw,
  User,
  Truck,
  CheckCircle,
  XCircle,
  Tag,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { monadPoPAbi, CONTRACT_ADDRESS } from "@/lib/monad";
import { formatEther } from "viem";

interface Passport {
  productName: string;
  brand: string;
  model: string;
  imageUrl: string | null;
}

interface Listing {
  id: string;
  chainListingId: number;
  passportId: number;
  sellerAddress: string;
  buyerAddress: string | null;
  price: string;
  status: string; // "Active", "Requested", "Accepted", "Completed", "Cancelled"
  escrowStatus: string;
  createdAt: string;
  passport: Passport;
}

export default function RequestsDashboardPage() {
  const { sessionAddress, loading: authLoading, login } = useAuth();
  
  const [received, setReceived] = useState<Listing[]>([]);
  const [sent, setSent] = useState<Listing[]>([]);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  const [txActionType, setTxActionType] = useState<string | null>(null);
  const [currentListingId, setCurrentListingId] = useState<number | null>(null);

  const { writeContract, data: txHash, isPending: isTxPending, error: txError } = useWriteContract();
  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const loadRequests = async () => {
    if (!sessionAddress) return;
    setFetching(true);
    setErrorMsg("");
    try {
      // Fetch received offers (where caller is seller)
      const recRes = await fetch(`/api/listings?seller=${sessionAddress}`);
      const recData = await recRes.json();
      
      // Fetch sent orders (where caller is buyer)
      const sentRes = await fetch(`/api/listings?buyer=${sessionAddress}`);
      const sentData = await sentRes.json();

      // Filter out raw inactive listings
      setReceived((recData.listings || []).filter((l: Listing) => l.status !== "Active" && l.status !== "Cancelled"));
      setSent(sentData.listings || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to retrieve request lists.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (sessionAddress) {
      loadRequests();
    }
  }, [sessionAddress]);

  // Synchronize database after transaction succeeds
  useEffect(() => {
    if (isTxSuccess && txHash && txActionType && currentListingId !== null) {
      const syncDb = async () => {
        try {
          const res = await fetch(`/api/listings/${currentListingId}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              txHash,
              action: txActionType,
            }),
          });
          const result = await res.json();
          if (result.success) {
            setSuccessMsg(`Ledger update completed successfully!`);
            loadRequests();
          } else {
            setErrorMsg(result.error || "Failed to update local ledger.");
          }
        } catch (err) {
          console.error(err);
          setErrorMsg("Ledger sync error.");
        } finally {
          setTxActionType(null);
          setCurrentListingId(null);
        }
      };
      syncDb();
    }
  }, [isTxSuccess, txHash]);

  // Handle contract transaction rejection
  useEffect(() => {
    if (txError) {
      console.error("Contract request action error:", txError);
      setErrorMsg(txError.message || "Smart contract transaction rejected or failed.");
      setTxActionType(null);
      setCurrentListingId(null);
    }
  }, [txError]);

  const handleEscrowAction = async (listingId: number, actionType: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    setTxActionType(actionType);
    setCurrentListingId(listingId);

    try {
      if (actionType === "accept") {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "acceptPurchaseRequest",
          args: [BigInt(listingId)],
        } as any);
      } else if (actionType === "reject") {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "rejectPurchaseRequest",
          args: [BigInt(listingId)],
        } as any);
      } else if (actionType === "cancelRequest") {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "cancelPurchaseRequest",
          args: [BigInt(listingId)],
        } as any);
      } else if (actionType === "confirmReceived") {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "confirmReceived",
          args: [BigInt(listingId)],
        } as any);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error starting on-chain operation.");
      setTxActionType(null);
      setCurrentListingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Requested":
        return (
          <span className="inline-flex items-center gap-1 text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold tracking-wider">
            Requested
          </span>
        );
      case "Accepted":
        return (
          <span className="inline-flex items-center gap-1 text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/20 px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold tracking-wider">
            In Transit
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold tracking-wider">
            Completed
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1 text-accent-rose bg-accent-rose/10 border border-accent-rose/20 px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold tracking-wider">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-foreground/45 bg-foreground/10 px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold tracking-wider">
            {status}
          </span>
        );
    }
  };

  if (authLoading) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  // Auth check
  if (!sessionAddress) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full bg-card border border-outline-variant p-8 rounded-lg text-center shadow-xl relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 text-primary">
            <History className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-foreground/60 text-sm mb-8 leading-relaxed">
            Please connect and verify your wallet session to view purchase orders and selling requests.
          </p>
          <button
            onClick={login}
            className="w-full py-3 bg-primary text-white font-semibold rounded-lg text-xs font-mono uppercase tracking-widest hover:opacity-90 transition-all animate-pulse"
          >
            Verify Session
          </button>
        </div>
      </div>
    );
  }

  const currentList = activeTab === "received" ? received : sent;

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant pb-6">
        <div className="relative inline-block">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="px-6 py-2">
            <h1 className="font-display text-4xl font-bold mb-1">Escrow Dashboard</h1>
            <p className="font-mono text-xs text-foreground/50 tracking-wider">SECURE_ESCROW_TRADES_V1.0</p>
          </div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>
        </div>

        <button
          onClick={loadRequests}
          disabled={fetching}
          className="px-4 py-2 border border-outline-variant hover:bg-primary-container/20 text-xs font-mono font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
          {fetching ? "Syncing..." : "Sync Ledgers"}
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-outline-variant/40 pb-px">
        <button
          onClick={() => setActiveTab("received")}
          className={`px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "received"
              ? "border-primary text-primary"
              : "border-transparent text-foreground/55 hover:text-foreground"
          }`}
        >
          Received Requests (As Seller) ({received.length})
        </button>
        <button
          onClick={() => setActiveTab("sent")}
          className={`px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "sent"
              ? "border-primary text-primary"
              : "border-transparent text-foreground/55 hover:text-foreground"
          }`}
        >
          Sent Orders (As Buyer) ({sent.length})
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-accent-rose text-xs font-mono">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-accent-emerald/10 border border-accent-emerald/30 rounded-lg text-accent-emerald text-xs font-mono">
          {successMsg}
        </div>
      )}

      {/* Requests table / cards */}
      {fetching ? (
        <div className="text-center py-24 bg-card rounded-lg border border-outline-variant">
          <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">SYNCHRONIZING_TRANSACTIONS...</p>
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-lg border border-outline-variant flex flex-col items-center justify-center">
          <ShoppingBag className="w-12 h-12 text-foreground/20 mb-4" />
          <h3 className="text-base font-bold text-foreground mb-1">No requests found</h3>
          <p className="text-foreground/50 text-xs max-w-xs leading-relaxed">
            You don't have any purchase requests or active escrow orders in this category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {currentList.map((l) => {
            const isProcessingThis = currentListingId === l.chainListingId && txActionType;
            const shortBuyer = l.buyerAddress ? `${l.buyerAddress.slice(0, 6)}...${l.buyerAddress.slice(-4)}` : "None";
            const shortSeller = `${l.sellerAddress.slice(0, 6)}...${l.sellerAddress.slice(-4)}`;

            return (
              <div
                key={l.id}
                className="bg-card border border-outline-variant rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Details */}
                <div className="flex items-start gap-4">
                  {l.passport.imageUrl ? (
                    <img
                      src={l.passport.imageUrl}
                      alt={l.passport.productName}
                      className="w-16 h-16 rounded object-cover border border-outline-variant shrink-0 bg-background"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded bg-primary-container/10 border border-outline-variant flex items-center justify-center text-foreground/20 shrink-0">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[9px] font-mono font-bold text-primary block uppercase">{l.passport.brand}</span>
                      {getStatusBadge(l.status)}
                    </div>
                    <h4 className="font-display font-semibold text-base text-foreground truncate">{l.passport.productName}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px] font-mono text-foreground/50 pt-1">
                      <div>
                        <span>Deal Price: </span>
                        <strong className="text-foreground font-semibold">{formatEther(BigInt(l.price))} MON</strong>
                      </div>
                      <div>
                        <span>Listing ID: </span>
                        <strong className="text-foreground font-semibold">#L-{l.chainListingId}</strong>
                      </div>
                      {activeTab === "received" ? (
                        <div>
                          <span>Buyer Address: </span>
                          <strong className="text-foreground font-semibold">{shortBuyer}</strong>
                        </div>
                      ) : (
                        <div>
                          <span>Seller Address: </span>
                          <strong className="text-foreground font-semibold">{shortSeller}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-3">
                  {isProcessingThis ? (
                    <div className="flex items-center gap-2 p-2 bg-primary-container/10 border border-outline-variant rounded-lg font-mono text-[10px] text-foreground/60">
                      <div className="w-4 h-4 border-t-2 border-primary animate-spin"></div>
                      <span>PROCESSING_ON-CHAIN...</span>
                    </div>
                  ) : (
                    <>
                      {/* Active Actions for Seller */}
                      {activeTab === "received" && l.status === "Requested" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEscrowAction(l.chainListingId, "accept")}
                            className="px-4 py-2 bg-accent-emerald text-white text-xs font-mono font-bold uppercase rounded-lg hover:opacity-90 transition"
                          >
                            Accept Offer
                          </button>
                          <button
                            onClick={() => handleEscrowAction(l.chainListingId, "reject")}
                            className="px-4 py-2 bg-accent-rose text-white text-xs font-mono font-bold uppercase rounded-lg hover:opacity-90 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {activeTab === "received" && l.status === "Accepted" && (
                        <div className="flex items-center gap-1.5 font-mono text-xs text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/20 px-3 py-1.5 rounded-lg">
                          <Truck className="w-4 h-4" /> Ship Item to Buyer
                        </div>
                      )}

                      {/* Active Actions for Buyer */}
                      {activeTab === "sent" && l.status === "Requested" && (
                        <button
                          onClick={() => handleEscrowAction(l.chainListingId, "cancelRequest")}
                          className="px-4 py-2 border border-accent-rose/20 text-accent-rose hover:bg-accent-rose hover:text-white text-xs font-mono font-bold uppercase rounded-lg transition"
                        >
                          Cancel Order
                        </button>
                      )}

                      {activeTab === "sent" && l.status === "Accepted" && (
                        <button
                          onClick={() => handleEscrowAction(l.chainListingId, "confirmReceived")}
                          className="px-4 py-2 bg-accent-emerald text-white text-xs font-mono font-bold uppercase rounded-lg hover:opacity-90 transition"
                        >
                          Confirm & Release Escrow
                        </button>
                      )}

                      {/* Completed Details */}
                      {l.status === "Completed" && (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 font-mono text-xs text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-3 py-1.5 rounded-lg">
                            <CheckCircle className="w-4 h-4" /> Done
                          </span>
                          {activeTab === "sent" && (
                            <Link
                              href={`/passports/${l.passportId}`}
                              className="px-3 py-1.5 border border-outline-variant hover:bg-card-border/60 text-xs font-mono font-semibold uppercase rounded-lg transition"
                            >
                              Open Passport
                            </Link>
                          )}
                        </div>
                      )}

                      <Link
                        href={`/explore/${l.chainListingId}`}
                        className="p-2 border border-outline-variant hover:bg-card-border/60 rounded-lg transition"
                        title="View Listing Page"
                      >
                        <ArrowUpRight className="w-4 h-4 text-foreground/50 hover:text-foreground" />
                      </Link>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Perforation footer */}
      <div className="mt-6 flex items-center gap-4 opacity-50 select-none">
        <div className="perforated-line"></div>
        <span className="font-mono text-[9px] whitespace-nowrap text-foreground/40 uppercase tracking-widest font-bold">End of Escrow Logs</span>
        <div className="perforated-line"></div>
      </div>

    </div>
  );
}
