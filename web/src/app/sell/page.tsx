"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther } from "viem";
import {
  Tag,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Info,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { monadPoPAbi, CONTRACT_ADDRESS } from "@/lib/monad";

interface Passport {
  id: string;
  chainReceiptId: string;
  productName: string;
  brand: string;
  model: string;
  imageUrl: string | null;
  description: string;
  status: string;
}

interface Listing {
  passportId: number;
  status: string;
}

function SellProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedId = searchParams.get("passportId");

  const { isConnected: isWeb3Connected } = useAccount();
  const { sessionAddress, loading: authLoading, login, isCorrectNetwork, switchNetwork } = useAuth();

  const [passports, setPassports] = useState<Passport[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [fetching, setFetching] = useState(false);
  const [selectedPassport, setSelectedPassport] = useState<Passport | null>(null);
  const [price, setPrice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { writeContract, data: txHash, isPending: isTxPending, error: txError } = useWriteContract();
  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const loadData = async () => {
    if (!sessionAddress) return;
    setFetching(true);
    setErrorMsg("");
    try {
      // 1. Fetch owned passports
      const passRes = await fetch("/api/receipts?role=buyer");
      const passData = await passRes.json();
      
      // 2. Fetch active listings to filter
      const listRes = await fetch("/api/listings");
      const listData = await listRes.json();

      const ownedPassports = passData.receipts || [];
      const activeListings = listData.listings || [];

      setPassports(ownedPassports);
      setListings(activeListings);

      // Pre-select passport if specified in query param
      if (preSelectedId) {
        const found = ownedPassports.find((p: Passport) => p.chainReceiptId === preSelectedId);
        if (found) setSelectedPassport(found);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to retrieve wallet passports and listings.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (sessionAddress) {
      loadData();
    }
  }, [sessionAddress, preSelectedId]);

  // Synchronize listing in database on transaction success
  useEffect(() => {
    if (isTxSuccess && txHash) {
      const confirmListing = async () => {
        try {
          const res = await fetch("/api/listings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txHash }),
          });
          const result = await res.json();
          if (result.success) {
            setSuccessMsg("Listing successfully created on-chain and registered in database!");
            setTimeout(() => {
              router.push("/explore");
            }, 2000);
          } else {
            setErrorMsg(result.error || "Failed to register listing off-chain.");
          }
        } catch (err) {
          console.error(err);
          setErrorMsg("Ledger connection verification error.");
        }
      };
      confirmListing();
    }
  }, [isTxSuccess, txHash]);

  // Handle transaction error
  useEffect(() => {
    if (txError) {
      console.error("Listing transaction error:", txError);
      setErrorMsg(txError.message || "Smart contract transaction rejected or failed.");
    }
  }, [txError]);

  // Filter owned passports to display only those that are Active and NOT already listed
  const unlistedPassports = passports.filter((p) => {
    if (p.status !== "Active") return false;
    // Check if there is an active listing for this passport
    const isAlreadyListed = listings.some(
      (l) => l.passportId === parseInt(p.chainReceiptId, 10) && ["Active", "Requested", "Accepted"].includes(l.status)
    );
    return !isAlreadyListed;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedPassport) {
      setErrorMsg("Please select a product passport to sell.");
      return;
    }

    if (!price || parseFloat(price) <= 0 || isNaN(parseFloat(price))) {
      setErrorMsg("Please enter a valid MON price greater than zero.");
      return;
    }

    try {
      const priceWei = parseEther(price);
      // Dummy metadataHash
      const dummyHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: monadPoPAbi,
        functionName: "createListing",
        args: [BigInt(selectedPassport.chainReceiptId), priceWei, dummyHash],
      } as any);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error submitting listing request.");
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">LOADING_INVENTORY...</p>
        </div>
      </div>
    );
  }

  // Auth requirement
  if (!sessionAddress) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full bg-card border border-outline-variant p-8 rounded-lg text-center shadow-xl relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 text-primary">
            <Tag className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-foreground/60 text-sm mb-8 leading-relaxed">
            Please connect and verify your wallet session to list owned physical products on the escrow marketplace.
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

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant pb-6">
        <div className="relative inline-block">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="px-6 py-2">
            <h1 className="font-display text-4xl font-bold mb-1">List Product</h1>
            <p className="font-mono text-xs text-foreground/50 tracking-wider">CREATE_MARKETPLACE_LISTING_V1.0</p>
          </div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>
        </div>
      </header>

      {/* Notices */}
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

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="bg-card border border-outline-variant rounded-xl p-8 relative space-y-6">
            <div className="registration-mark mark-tl"></div>
            <div className="registration-mark mark-tr"></div>
            <div className="registration-mark mark-bl"></div>
            <div className="registration-mark mark-br"></div>

            {/* Passport Selector */}
            <div className="space-y-2">
              <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-wider block">
                Select Owned Product Passport
              </label>
              {unlistedPassports.length === 0 ? (
                <div className="p-6 bg-primary-container/5 border border-dashed border-outline-variant/60 rounded-lg text-center">
                  <p className="text-xs text-foreground/50">
                    No unlisted active passports found in this wallet. If you have active passports, they might already be listed.
                  </p>
                  <Link href="/passports" className="text-xs text-primary underline mt-2 block font-semibold">
                    View My Passports
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-1">
                  {unlistedPassports.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setSelectedPassport(p)}
                      className={`flex items-center gap-4 p-4 border rounded-lg text-left transition-all ${
                        selectedPassport?.id === p.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-outline-variant/60 bg-card hover:bg-primary-container/10"
                      }`}
                    >
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.productName}
                          className="w-12 h-12 rounded object-cover border border-outline-variant shrink-0 bg-background"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-background border border-outline-variant flex items-center justify-center text-foreground/20 shrink-0">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono font-bold text-primary block uppercase">{p.brand}</span>
                        <h4 className="font-display font-semibold text-sm text-foreground truncate">{p.productName}</h4>
                        <span className="text-[10px] font-mono text-foreground/45 block">Passport: #MP-{p.chainReceiptId}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price field */}
            <div className="space-y-2">
              <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-wider block">
                Listing Price (MON)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/45 font-bold" />
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 1.25"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-background border border-outline-variant focus:border-primary focus:ring-0 font-mono text-sm pl-12 pr-4 py-3 rounded-lg outline-none"
                  required
                />
              </div>
            </div>

            {/* Submit buttons */}
            <div className="pt-4">
              {isTxPending || isTxWaiting ? (
                <div className="text-center p-4 bg-primary-container/10 border border-outline-variant/30 rounded-lg space-y-2">
                  <div className="w-5 h-5 border-t-2 border-primary animate-spin mx-auto"></div>
                  <p className="text-[11px] font-mono text-foreground/50 uppercase tracking-widest">
                    {isTxWaiting ? "VERIFYING_ESCROW_CREATION..." : "SIGNING_LEDGER_TRANSACTION..."}
                  </p>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={!selectedPassport}
                  className="w-full py-3.5 bg-primary text-white text-xs font-mono font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-1.5"
                >
                  Confirm Escrow Listing <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

          </form>
        </div>

        {/* Right Column: Details/Receipt preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-outline-variant rounded-xl p-6 space-y-4">
            <span className="text-[10px] text-foreground/45 font-bold uppercase tracking-wider block border-b border-outline-variant/35 pb-2">Listing Preview</span>
            {selectedPassport ? (
              <div className="space-y-4">
                {selectedPassport.imageUrl ? (
                  <img
                    src={selectedPassport.imageUrl}
                    alt={selectedPassport.productName}
                    className="w-full h-48 object-cover rounded-lg border border-outline-variant shadow-sm bg-background"
                  />
                ) : (
                  <div className="w-full h-48 bg-primary-container/5 rounded-lg border border-dashed border-outline-variant flex items-center justify-center text-foreground/15">
                    <ShoppingBag className="w-16 h-16" />
                  </div>
                )}
                <div className="space-y-1.5 font-mono text-xs">
                  <span className="text-primary font-bold block uppercase">{selectedPassport.brand}</span>
                  <h4 className="font-display font-bold text-base text-foreground leading-snug">{selectedPassport.productName}</h4>
                  <p className="text-foreground/55">Model: {selectedPassport.model}</p>
                  <p className="text-foreground/45 text-[11px]">{selectedPassport.description}</p>
                </div>
                
                {price && !isNaN(parseFloat(price)) && parseFloat(price) > 0 && (
                  <div className="border-t border-dashed border-outline-variant/50 pt-4 flex justify-between items-center font-mono">
                    <span className="text-xs text-foreground/50">Asking Price</span>
                    <span className="text-sm font-bold text-foreground">{parseFloat(price).toLocaleString()} MON</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-foreground/40 font-mono text-xs">
                Select a passport on the left to see preview details.
              </div>
            )}
          </div>

          <div className="bg-primary-container/10 border border-outline-variant p-5 rounded-lg flex gap-3 text-xs leading-relaxed">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 font-sans text-foreground/75">
              <strong className="text-foreground font-semibold block mb-0.5">Escrow Security Notice</strong>
              When you list a product, the digital passport is flagged as "Listed" but remains in your wallet. The buyer funds will be securely held in the escrow contract until you deliver the physical item and the buyer signs the receipt.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default function SellProductPage() {
  return (
    <Suspense fallback={
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">LOADING_INVENTORY...</p>
        </div>
      </div>
    }>
      <SellProductContent />
    </Suspense>
  );
}
