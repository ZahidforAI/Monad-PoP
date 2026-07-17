"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import {
  ShieldCheck,
  AlertTriangle,
  Calendar,
  ExternalLink,
  ArrowLeft,
  Lock,
  ShoppingBag,
  User,
  Store,
  Tag,
  Truck,
  CheckCircle,
  XCircle,
  HelpCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { monadPoPAbi, CONTRACT_ADDRESS } from "@/lib/monad";
import { formatEther } from "viem";

interface Passport {
  productName: string;
  brand: string;
  model: string;
  imageUrl: string | null;
  description: string;
  merchantName: string;
  merchantAddress: string;
  warrantyUntil: string | null;
}

interface Listing {
  id: string;
  chainListingId: number;
  passportId: number;
  sellerAddress: string;
  buyerAddress: string | null;
  price: string;
  status: string; // "Active", "Requested", "Accepted", "Completed", "Cancelled"
  escrowStatus: string; // "None", "Funded", "Settled", "Refunded"
  createTxHash: string;
  actionTxHash: string | null;
  saleProofHash: string | null;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  passport: Passport;
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isConnected: isWeb3Connected } = useAccount();
  const { sessionAddress, loading: authLoading, login, isCorrectNetwork, switchNetwork } = useAuth();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [txActionType, setTxActionType] = useState<string | null>(null); // "request", "accept", "reject", "cancelRequest", "confirmReceived", "cancelListing", "resolveEscrow"

  const { writeContract, data: txHash, isPending: isTxPending, error: txError } = useWriteContract();

  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const loadListing = async () => {
    setFetching(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/listings/${params.id}`);
      if (!res.ok) throw new Error("Failed to load listing");
      const data = await res.json();
      setListing(data.listing);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to retrieve listing metadata from database.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadListing();
  }, [params.id]);

  // Synchronize database after transaction succeeds
  useEffect(() => {
    if (isTxSuccess && txHash && txActionType) {
      const syncDb = async () => {
        try {
          const res = await fetch(`/api/listings/${params.id}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              txHash,
              action: txActionType,
            }),
          });
          const result = await res.json();
          if (result.success) {
            setSuccessMsg(`Transaction successfully confirmed and synced! Action: ${txActionType.toUpperCase()}`);
            loadListing();
          } else {
            setErrorMsg(result.error || "Failed to synchronize ledger update.");
          }
        } catch (err) {
          console.error(err);
          setErrorMsg("Ledger sync connection error.");
        } finally {
          setTxActionType(null);
        }
      };
      syncDb();
    }
  }, [isTxSuccess, txHash]);

  // Handle contract errors
  useEffect(() => {
    if (txError) {
      console.error("Contract transaction error:", txError);
      setErrorMsg(txError.message || "On-chain transaction rejected or failed.");
      setTxActionType(null);
    }
  }, [txError]);

  if (authLoading || fetching) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">LOADING_ESCROW_LISTING...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !listing) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full bg-card border border-outline-variant p-8 rounded-lg text-center relative shadow-xl">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <AlertTriangle className="w-12 h-12 text-accent-rose mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold mb-2">Listing Unavailable</h3>
          <p className="text-sm text-foreground/60 mb-6">{errorMsg}</p>
          <Link href="/explore" className="inline-block px-4 py-2.5 border border-outline-variant text-foreground/80 hover:text-foreground text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-colors">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const isSeller = sessionAddress?.toLowerCase() === listing.sellerAddress.toLowerCase();
  const isBuyer = sessionAddress?.toLowerCase() === listing.buyerAddress?.toLowerCase();

  const handleEscrowAction = async (actionType: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    setTxActionType(actionType);

    try {
      if (actionType === "request") {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "requestPurchase",
          args: [BigInt(listing.chainListingId)],
          value: BigInt(listing.price),
        } as any);
      } else if (actionType === "accept") {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "acceptPurchaseRequest",
          args: [BigInt(listing.chainListingId)],
        } as any);
      } else if (actionType === "reject") {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "rejectPurchaseRequest",
          args: [BigInt(listing.chainListingId)],
        } as any);
      } else if (actionType === "cancelRequest") {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "cancelPurchaseRequest",
          args: [BigInt(listing.chainListingId)],
        } as any);
      } else if (actionType === "confirmReceived") {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "confirmReceived",
          args: [BigInt(listing.chainListingId)],
        } as any);
      } else if (actionType === "cancelListing") {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "cancelListing",
          args: [BigInt(listing.chainListingId)],
        } as any);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to trigger smart contract transaction.");
      setTxActionType(null);
    }
  };

  const getStatusStepper = () => {
    const steps = [
      { key: "Active", label: "Listed", icon: Tag },
      { key: "Requested", label: "Requested", icon: ShoppingBag },
      { key: "Accepted", label: "In Transit", icon: Truck },
      { key: "Completed", label: "Completed", icon: CheckCircle },
    ];

    const currentIdx = steps.findIndex((s) => s.key === listing.status);
    const isCancelled = listing.status === "Cancelled";

    if (isCancelled) {
      return (
        <div className="flex items-center gap-2 text-accent-rose font-mono text-xs font-bold uppercase tracking-wider bg-accent-rose/10 border border-accent-rose/30 px-4 py-2 rounded-lg">
          <XCircle className="w-4 h-4" /> Listing Cancelled
        </div>
      );
    }

    return (
      <div className="w-full flex items-center justify-between gap-2 max-w-lg mx-auto py-4 font-mono text-xs font-semibold">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isDone = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {idx > 0 && (
                <div
                  className={`absolute top-4 left-[-50%] right-[50%] h-[2px] z-0 ${
                    idx <= currentIdx ? "bg-primary" : "bg-outline-variant/40"
                  }`}
                />
              )}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border z-10 ${
                  isCurrent
                    ? "bg-primary text-white border-primary shadow-lg animate-pulse"
                    : isDone
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-card text-foreground/35 border-outline-variant"
                }`}
              >
                <StepIcon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] mt-2 ${isDone ? "text-foreground font-bold" : "text-foreground/40"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const shortAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Navigation */}
      <div>
        <Link href="/explore" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-foreground/50 hover:text-foreground mb-6 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Marketplace
        </Link>
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant pb-6">
          <div>
            <p className="font-mono text-xs text-foreground/50 tracking-wider uppercase mb-1">LISTING OFFER #L-{listing.chainListingId}</p>
            <h1 className="font-display text-3xl font-bold text-foreground">{listing.passport.productName}</h1>
          </div>
          <div className="px-4 py-2 border border-outline-variant bg-card text-xs font-mono uppercase tracking-wider font-bold rounded-lg flex items-center gap-1.5 self-start md:self-auto">
            Price: {formatEther(BigInt(listing.price))} MON
          </div>
        </header>
      </div>

      {/* Stepper Status Indicator */}
      <div className="bg-card border border-outline-variant rounded-xl p-6 shadow-sm">
        <h3 className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest text-center mb-2">Escrow Deal Progression</h3>
        {getStatusStepper()}
      </div>

      {/* Alert Notices */}
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

      {/* Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Product Spec and Media */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Media Card */}
          <div className="bg-card border border-outline-variant rounded-xl overflow-hidden shadow-sm relative">
            <div className="registration-mark mark-tl"></div>
            <div className="registration-mark mark-tr"></div>
            <div className="registration-mark mark-bl"></div>
            <div className="registration-mark mark-br"></div>

            <div className="h-96 w-full bg-primary-container/5 relative overflow-hidden flex items-center justify-center">
              {listing.passport.imageUrl ? (
                <img
                  src={listing.passport.imageUrl}
                  alt={listing.passport.productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingBag className="w-24 h-24 text-foreground/15" />
              )}
            </div>
            
            <div className="p-6 border-t border-outline-variant space-y-4">
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                {listing.passport.brand}
              </span>
              <h3 className="font-display font-bold text-xl text-foreground">{listing.passport.productName}</h3>
              <p className="text-xs text-foreground/60 font-mono">Model Spec: {listing.passport.model}</p>
              {listing.passport.description && (
                <p className="text-xs text-foreground/50 leading-relaxed font-sans border-t border-outline-variant/35 pt-4">
                  {listing.passport.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Escrow Actions & Details */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Action Box */}
          <div className="bg-card border border-outline-variant rounded-xl p-8 relative shadow-lg flex flex-col justify-between">
            <div className="registration-mark mark-tl"></div>
            <div className="registration-mark mark-tr"></div>
            <div className="registration-mark mark-bl"></div>
            <div className="registration-mark mark-br"></div>

            <div className="space-y-6">
              <h3 className="font-mono text-xs font-bold text-foreground tracking-widest uppercase flex items-center gap-2 mb-6">
                <Lock className="w-4 h-4 text-primary" />
                ESCROW CLEARING ACTIONS
              </h3>

              {/* Status information panel */}
              <div className="text-xs bg-primary-container/5 border border-outline-variant/40 rounded-lg p-4 space-y-3 font-mono">
                <div className="flex justify-between">
                  <span className="text-foreground/45">Escrow Status:</span>
                  <span className="font-bold text-foreground">{listing.escrowStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/45">Seller:</span>
                  <span className="font-semibold text-foreground/80">{shortAddress(listing.sellerAddress)}</span>
                </div>
                {listing.buyerAddress && (
                  <div className="flex justify-between">
                    <span className="text-foreground/45">Buyer:</span>
                    <span className="font-semibold text-foreground/80">{shortAddress(listing.buyerAddress)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Smart contract actions */}
            <div className="pt-8">
              {txActionType || isTxPending || isTxWaiting ? (
                <div className="text-center p-4 bg-primary-container/10 border border-outline-variant/30 rounded-lg space-y-2">
                  <div className="w-5 h-5 border-t-2 border-primary animate-spin mx-auto"></div>
                  <p className="text-[11px] font-mono text-foreground/50 uppercase tracking-widest">
                    {isTxWaiting ? "CONFIRMING_ON_MONAD_TESTNET..." : "SIGNING_LEDGER_TRANSACTION..."}
                  </p>
                  {txHash && (
                    <a
                      href={`https://testnet.monadvision.com/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-primary hover:underline flex items-center justify-center gap-1 font-mono break-all"
                    >
                      Tx Hash: {shortAddress(txHash)} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  
                  {/* Action 1: Buy (Active, and caller is NOT seller) */}
                  {listing.status === "Active" && !isSeller && (
                    <button
                      onClick={() => handleEscrowAction("request")}
                      className="w-full py-3 bg-primary text-white text-xs font-mono font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition shadow-md"
                    >
                      Request Purchase ({formatEther(BigInt(listing.price))} MON)
                    </button>
                  )}

                  {/* Action 2: Accept/Reject Request (Requested, and caller IS seller) */}
                  {listing.status === "Requested" && isSeller && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleEscrowAction("accept")}
                        className="py-3 bg-accent-emerald text-white text-xs font-mono font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition shadow-sm"
                      >
                        Accept Request
                      </button>
                      <button
                        onClick={() => handleEscrowAction("reject")}
                        className="py-3 bg-accent-rose text-white text-xs font-mono font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition shadow-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Action 3: Cancel Request (Requested, and caller IS buyer) */}
                  {listing.status === "Requested" && isBuyer && (
                    <button
                      onClick={() => handleEscrowAction("cancelRequest")}
                      className="w-full py-3 bg-foreground/10 hover:bg-accent-rose/10 hover:text-accent-rose border border-outline-variant hover:border-accent-rose/25 text-foreground/80 text-xs font-mono font-bold uppercase tracking-widest rounded-lg transition"
                    >
                      Cancel Purchase Request
                    </button>
                  )}

                  {/* Action 4: Confirm Delivery (Accepted, and caller IS buyer) */}
                  {listing.status === "Accepted" && isBuyer && (
                    <button
                      onClick={() => handleEscrowAction("confirmReceived")}
                      className="w-full py-3 bg-accent-emerald text-white text-xs font-mono font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition shadow-md"
                    >
                      Confirm Delivery (Release Escrow)
                    </button>
                  )}

                  {/* Action 5: Cancel Listing (Active, and caller IS seller) */}
                  {listing.status === "Active" && isSeller && (
                    <button
                      onClick={() => handleEscrowAction("cancelListing")}
                      className="w-full py-3 border border-accent-rose/20 text-accent-rose hover:bg-accent-rose hover:text-white text-xs font-mono font-bold uppercase tracking-widest rounded-lg transition"
                    >
                      Cancel Listing
                    </button>
                  )}

                  {/* Complete/Completed Notice */}
                  {listing.status === "Completed" && (
                    <div className="p-4 bg-accent-emerald/5 border border-accent-emerald/20 rounded-lg text-center space-y-1">
                      <p className="text-accent-emerald font-bold text-xs uppercase font-mono tracking-wider">Sale Completed</p>
                      <p className="text-[11px] text-foreground/50">Ownership transferred and escrow funds released.</p>
                      {listing.saleProofHash && (
                        <p className="text-[9px] font-mono text-foreground/45 break-all mt-2 bg-background p-1.5 rounded border border-outline-variant/30">
                          Sale Proof: {listing.saleProofHash}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Informational connection prompts */}
                  {!sessionAddress && (
                    <div className="text-center space-y-3">
                      <p className="text-xs text-foreground/60 leading-relaxed">Please authenticate your wallet session to transact.</p>
                      <button
                        onClick={login}
                        className="px-6 py-2.5 bg-primary text-white text-xs font-mono font-bold uppercase rounded-lg hover:opacity-95 transition"
                      >
                        Verify Session
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="bg-card border border-outline-variant rounded-xl p-6 space-y-4 text-xs font-mono">
            <span className="text-[9px] text-foreground/45 font-bold uppercase tracking-wider block">LEDGER INFORMATION</span>
            
            <div className="grid grid-cols-1 divide-y divide-outline-variant/35 gap-y-2">
              <div className="flex justify-between py-1.5">
                <span className="text-foreground/45">Contract Address</span>
                <span className="font-semibold text-primary">{shortAddress(CONTRACT_ADDRESS)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-foreground/45">Passport ID</span>
                <span className="font-semibold text-foreground/80">#MP-{listing.passportId}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-foreground/45">Merchant Signer</span>
                <span className="font-semibold text-foreground/80">{shortAddress(listing.passport.merchantAddress)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-foreground/45">Creation Date</span>
                <span className="font-semibold text-foreground/80">{new Date(listing.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
