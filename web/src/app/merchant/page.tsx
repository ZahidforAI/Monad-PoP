"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWriteContract } from "wagmi";
import {
  Store,
  Plus,
  History,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Send,
  Loader2,
  Lock,
  CheckCircle,
  Share2,
  ChevronDown
} from "lucide-react";
import { CONTRACT_ADDRESS, monadPoPAbi } from "@/lib/monad";
import { getAddress } from "viem";

interface Receipt {
  id: string;
  chainReceiptId: string;
  merchantReference: string;
  productIdentifier: string;
  productName: string;
  buyerAddress: string;
  amount: string;
  currency: string;
  purchasedAt: string;
  status: string;
  issueTxHash: string;
}

const STATUS_OPTIONS = [
  { name: "Active", value: 0 },
  { name: "Returned", value: 1 },
  { name: "Refunded", value: 2 },
  { name: "Replaced", value: 3 },
  { name: "Revoked", value: 4 }
];

export default function MerchantPage() {
  const { isConnected, sessionAddress, isMerchant, loading, login, logout, switchNetwork, isCorrectNetwork } = useAuth();
  const { writeContractAsync } = useWriteContract();

  // Form states
  const [buyerWallet, setBuyerWallet] = useState("");
  const [productName, setProductName] = useState("");
  const [productIdentifier, setProductIdentifier] = useState("");
  const [sku, setSku] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("MON");
  const [returnDays, setReturnDays] = useState("14");
  const [warrantyDays, setWarrantyDays] = useState("365");
  const [merchantReference, setMerchantReference] = useState("");

  // UI state
  const [issuingStep, setIssuingStep] = useState<"IDLE" | "PREPARING" | "PROMPTING_WALLET" | "WAITING_TX" | "CONFIRMING_DB">("IDLE");
  const [issuingError, setIssuingError] = useState("");
  const [issuingSuccess, setIssuingSuccess] = useState(false);
  const [pastReceipts, setPastReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Status Change state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number>(1);
  const [statusError, setStatusError] = useState("");

  const loadPastReceipts = async () => {
    if (!sessionAddress) return;
    setLoadingReceipts(true);
    try {
      const res = await fetch("/api/receipts?role=merchant");
      const data = await res.json();
      if (data.receipts) {
        setPastReceipts(data.receipts);
      }
    } catch (err) {
      console.error("Error loading merchant receipts:", err);
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    if (sessionAddress && isMerchant) {
      loadPastReceipts();
      // Generate default reference code
      setMerchantReference(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  }, [sessionAddress, isMerchant]);

  // Issue receipt flow
  const handleIssueReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssuingError("");
    setIssuingSuccess(false);

    // 1. Validations
    try {
      getAddress(buyerWallet);
    } catch {
      setIssuingError("Invalid buyer Ethereum address format");
      return;
    }

    if (!productName || !productIdentifier || !amount) {
      setIssuingError("Please fill out all required fields");
      return;
    }

    setIssuingStep("PREPARING");

    // Calculate dates
    const purchasedAt = new Date().toISOString();
    const returnDeadline = returnDays ? new Date(Date.now() + parseInt(returnDays) * 86400000).toISOString() : undefined;
    const warrantyUntil = warrantyDays ? new Date(Date.now() + parseInt(warrantyDays) * 86400000).toISOString() : undefined;

    const payload = {
      schemaVersion: "1.0",
      merchantReference,
      buyerWallet,
      product: {
        productIdentifier,
        displayName: productName,
        ...(sku ? { sku } : {}),
        ...(serialNumber ? { serialNumber } : {}),
      },
      purchase: {
        purchasedAt,
        currency,
        amount,
        ...(returnDeadline ? { returnDeadline } : {}),
        ...(warrantyUntil ? { warrantyUntil } : {}),
      },
    };

    try {
      // 2. Prepare receipt payload
      const prepRes = await fetch("/api/receipts/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptPayload: payload }),
      });

      const prepData = await prepRes.json();
      if (prepData.error) {
        throw new Error(prepData.error);
      }

      const { contractArgs, canonicalPayload } = prepData;

      // 3. Prompt Wallet Sign & Broadcast
      setIssuingStep("PROMPTING_WALLET");
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: monadPoPAbi,
        functionName: "issueReceipt",
        args: [
          contractArgs.buyer,
          contractArgs.productId,
          contractArgs.receiptHash,
          BigInt(contractArgs.purchasedAt),
          BigInt(contractArgs.warrantyUntil)
        ],
      } as any);

      // 4. Wait for Tx & Confirm on Database
      setIssuingStep("WAITING_TX");
      
      // Auto-poll confirmation endpoint
      setIssuingStep("CONFIRMING_DB");
      let confirmed = false;
      let attempts = 0;

      while (!confirmed && attempts < 10) {
        attempts++;
        await new Promise((r) => setTimeout(r, 2000)); // wait 2s
        try {
          const confRes = await fetch("/api/receipts/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txHash, receiptPayload: canonicalPayload }),
          });
          const confData = await confRes.json();
          if (confData.success) {
            confirmed = true;
            setIssuingSuccess(true);
            loadPastReceipts();
            // Reset form fields
            setBuyerWallet("");
            setProductName("");
            setProductIdentifier("");
            setSku("");
            setSerialNumber("");
            setAmount("");
            setMerchantReference(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
          }
        } catch {
          // Keep trying
        }
      }

      if (!confirmed) {
        throw new Error("Transaction completed, but off-chain database sync is taking longer than expected. Please refresh past log to sync.");
      }

    } catch (err: any) {
      console.error(err);
      setIssuingError(err.message || "Failed to issue receipt credential");
    } finally {
      setIssuingStep("IDLE");
    }
  };

  // Sync / update status
  const handleUpdateStatus = async (receiptId: string, chainReceiptId: string, statusEnum: number) => {
    setStatusError("");
    setUpdatingId(receiptId);
    
    try {
      // 1. Submit on-chain status update
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: monadPoPAbi,
        functionName: "updateReceiptStatus",
        args: [BigInt(chainReceiptId), statusEnum],
      } as any);

      // 2. Poll PATCH api/receipts/[id]/status
      let synced = false;
      let attempts = 0;

      while (!synced && attempts < 8) {
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch(`/api/receipts/${receiptId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: STATUS_OPTIONS.find(o => o.value === statusEnum)?.name }),
        });
        const data = await res.json();
        if (data.success) {
          synced = true;
          loadPastReceipts();
        }
      }

    } catch (err: any) {
      console.error(err);
      setStatusError(err.message || "Failed to update on-chain status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Sync demo receipt status immediately (no transaction)
  const handleSyncDemoStatus = async (receiptId: string, statusStr: string) => {
    setSyncingId(receiptId);
    try {
      await fetch(`/api/receipts/${receiptId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusStr }),
      });
      loadPastReceipts();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
    }
  };

  const shortAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">AUTHENTICATING_MERCHANT_PROFILE...</p>
        </div>
      </div>
    );
  }

  // 1. Connection check
  if (!isConnected || !sessionAddress) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full bg-card border border-outline-variant p-8 rounded-lg text-center shadow-xl relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 text-primary">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Merchant Portal</h2>
          <p className="text-foreground/60 text-sm mb-8 leading-relaxed">
            Please connect your wallet and verify your session to enter the merchant receipts management system.
          </p>
          <button
            onClick={login}
            className="w-full py-3 bg-primary text-white font-semibold rounded-lg text-xs font-mono uppercase tracking-widest hover:opacity-90 transition-all"
          >
            Authenticate Wallet
          </button>
        </div>
      </div>
    );
  }

  // 2. Role Check
  if (!isMerchant) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full bg-card border border-outline-variant p-8 rounded-lg text-center shadow-xl relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <AlertTriangle className="w-12 h-12 text-accent-rose mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Access Forbidden</h2>
          <p className="text-foreground/70 text-sm mb-6 leading-relaxed">
            Your connected wallet address <span className="text-primary font-mono">{shortAddress(sessionAddress)}</span> does not have the on-chain <strong className="font-semibold text-foreground">MERCHANT_ROLE</strong> on the Monad PoP contract.
          </p>
          <p className="text-xs text-foreground/50 mb-8 leading-relaxed">
            If you are checking out the MVP hackathon build, you can assign yourself the merchant role on the <strong className="text-foreground">Admin Portal</strong>.
          </p>
          <div className="flex gap-4">
            <button onClick={logout} className="w-full py-2.5 border border-outline-variant text-foreground/80 text-xs font-semibold rounded-lg hover:bg-card-border transition-colors">
              Disconnect Wallet
            </button>
          </div>
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
            <h1 className="font-display text-3xl font-bold mb-1">Issue New Receipt</h1>
            <p className="text-xs font-mono text-foreground/50 tracking-wider">STORE_REF: MMS-001 &bull; MERCHANT_MINT_PORTAL</p>
          </div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto text-xs font-mono text-foreground/60 border border-outline-variant px-4 py-2 bg-card rounded-lg">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          MONAD_TESTNET_ONLINE
        </div>
      </header>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Left column: Form */}
        <section className="space-y-8">
          <form onSubmit={handleIssueReceipt} className="grid grid-cols-1 gap-6 text-sm">
            
            {/* Buyer Wallet */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Buyer Wallet Address *</label>
              <input
                type="text"
                required
                placeholder="0x..."
                value={buyerWallet}
                onChange={(e) => setBuyerWallet(e.target.value)}
                className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 font-mono transition-colors"
              />
            </div>

            {/* Product display name & code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Chronos Watch"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Product SKU / ID *</label>
                <input
                  type="text"
                  required
                  placeholder="SKU-CHRONOS-01"
                  value={productIdentifier}
                  onChange={(e) => setProductIdentifier(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 font-mono transition-colors"
                />
              </div>
            </div>

            {/* SKU and Serial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Sub-SKU (Optional)</label>
                <input
                  type="text"
                  placeholder="CH-BLACK-M"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 font-mono transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Serial Number (Optional)</label>
                <input
                  type="text"
                  placeholder="SN-9988219-0"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 font-mono transition-colors"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Amount / Paid *</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 font-mono transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Currency *</label>
                <input
                  type="text"
                  required
                  placeholder="MON"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 font-mono transition-colors"
                />
              </div>
            </div>

            {/* Expirations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Return Period (Days)</label>
                <input
                  type="number"
                  placeholder="14"
                  value={returnDays}
                  onChange={(e) => setReturnDays(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 font-mono transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Warranty Period (Days)</label>
                <input
                  type="number"
                  placeholder="365"
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 font-mono transition-colors"
                />
              </div>
            </div>

            {/* Error displays */}
            {issuingError && (
              <div className="p-4 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-accent-rose text-xs font-mono">
                {issuingError}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={issuingStep !== "IDLE"}
              className="w-full bg-primary text-white py-4 rounded-lg font-mono font-bold tracking-widest text-xs uppercase hover:opacity-90 transition-all active:scale-95 flex justify-center items-center gap-2 border border-primary/20"
            >
              <span>{issuingStep === "IDLE" ? "GENERATE PROOF OF PURCHASE" : "PROCESSING..."}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>

        {/* Right column: Preview Specimen */}
        <section className="flex flex-col items-center">
          <div className="w-full max-w-sm relative">
            <div className="bg-card border border-outline-variant rounded-lg overflow-hidden relative shadow-sm min-h-[580px] flex flex-col">
              
              {/* Perforated top tab */}
              <div className="h-4 bg-primary-container/20 border-b border-dashed border-outline-variant flex items-center justify-center">
                <div className="w-16 h-1 bg-outline-variant rounded-full"></div>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                <div className="text-center mb-8">
                  <h4 className="font-display text-2xl font-bold">Monad PoP</h4>
                  <p className="font-mono text-[9px] tracking-widest text-foreground/50 uppercase mt-0.5">DIGITAL LEDGER RECEIPT</p>
                </div>

                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start text-xs">
                    <div className="space-y-4">
                      <div>
                        <p className="font-mono text-[9px] text-foreground/40 uppercase mb-0.5">Issue Date</p>
                        <p className="font-mono font-medium">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] text-foreground/40 uppercase mb-0.5">Recipient</p>
                        <p className="font-mono font-medium truncate w-32">{buyerWallet || "NOT SPECIFIED"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[9px] text-foreground/40 uppercase mb-0.5">Receipt ID</p>
                      <p className="font-mono font-medium">{merchantReference}</p>
                    </div>
                  </div>

                  <div className="border-t border-b border-dashed border-outline-variant py-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-foreground text-sm">{productName || "Product Name"}</p>
                      <p className="font-mono font-bold text-sm">{amount ? `${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "0.00"} {currency}</p>
                    </div>
                    <p className="font-mono text-[10px] text-foreground/50">SKU: {productIdentifier || "---"}</p>
                    <p className="font-mono text-[10px] text-foreground/50">SN: {serialNumber || "---"}</p>
                  </div>

                  <div>
                    <p className="font-mono text-[9px] text-foreground/40 uppercase mb-0.5">Warranty Coverage</p>
                    <p className="font-sans text-xs text-foreground/80">
                      {warrantyDays ? `Expires in ${warrantyDays} days` : "No warranty set"}
                    </p>
                  </div>

                  <div className="pt-6 flex flex-col items-center justify-center mt-auto">
                    <div className="w-28 h-28 bg-primary-container/20 rounded border border-outline-variant flex items-center justify-center text-foreground/30">
                      <Lock className="w-10 h-10" />
                    </div>
                    <p className="font-mono text-[9px] text-foreground/40 mt-3 uppercase tracking-wider">HASH: MINT_PENDING</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-outline-variant pt-4 text-center">
                  <p className="font-mono text-[9px] text-primary font-bold uppercase tracking-wider">AUTHORIZED BY MONAD_MEMBER</p>
                </div>
              </div>

              {/* Perforation bottom effect */}
              <div className="receipt-perforation"></div>
            </div>
          </div>
        </section>
      </div>

      {/* History log list */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          Issued Receipts Log
        </h2>

        {statusError && (
          <div className="p-4 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-accent-rose text-xs font-mono mb-4">
            {statusError}
          </div>
        )}

        {loadingReceipts ? (
          <div className="text-center py-20 bg-card rounded-lg border border-outline-variant">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-foreground/50 text-xs font-mono">REFRESHING_MERCHANT_LOG...</p>
          </div>
        ) : pastReceipts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-lg border border-outline-variant">
            <Store className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
            <p className="text-foreground/60 text-sm font-bold">No receipts issued yet</p>
            <p className="text-foreground/40 text-xs mt-1">Receipts you mint will show up here.</p>
          </div>
        ) : (
          <div className="bg-card border border-outline-variant rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary-container/20 text-foreground/60 font-mono text-[10px] uppercase border-b border-outline-variant">
                    <th className="px-6 py-4 font-bold tracking-wider">Reference ID</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Product Name</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Buyer Wallet</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Amount</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Date</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Action / Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-sm">
                  {pastReceipts.map(r => (
                    <tr key={r.id} className="hover:bg-primary-container/5 transition-colors">
                      <td className="px-6 py-5 font-mono font-medium text-foreground">{r.merchantReference}</td>
                      <td className="px-6 py-5 font-bold text-foreground">{r.productName}</td>
                      <td className="px-6 py-5 font-mono text-xs text-foreground/70">{shortAddress(r.buyerAddress)}</td>
                      <td className="px-6 py-5 text-right font-mono font-bold text-foreground">
                        {parseFloat(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {r.currency}
                      </td>
                      <td className="px-6 py-5 font-mono text-foreground/60 text-xs">
                        {new Date(r.purchasedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-mono text-[11px] font-bold text-primary uppercase">{r.status}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.issueTxHash.startsWith("demo-tx-hash") ? (
                            // Demo receipt action
                            <select
                              disabled={syncingId === r.id}
                              value={r.status}
                              onChange={(e) => handleSyncDemoStatus(r.id, e.target.value)}
                              className="bg-card border border-outline-variant font-mono text-[10px] uppercase py-1.5 px-3 rounded-lg focus:outline-none focus:border-primary text-foreground"
                            >
                              <option value="Active">Active</option>
                              <option value="Returned">Returned</option>
                              <option value="Refunded">Refunded</option>
                              <option value="Replaced">Replaced</option>
                              <option value="Revoked">Revoked</option>
                            </select>
                          ) : (
                            // On-chain receipt action
                            <select
                              disabled={updatingId === r.id}
                              value={STATUS_OPTIONS.find(o => o.name === r.status)?.value ?? 0}
                              onChange={(e) => handleUpdateStatus(r.id, r.chainReceiptId, parseInt(e.target.value))}
                              className="bg-card border border-outline-variant font-mono text-[10px] uppercase py-1.5 px-3 rounded-lg focus:outline-none focus:border-primary text-foreground"
                            >
                              {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {updatingId === r.id && (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Transaction Progress Overlay */}
      {issuingStep !== "IDLE" && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
          <div className="bg-card p-10 rounded-lg shadow-2xl text-center max-w-sm border border-outline-variant relative">
            <div className="registration-mark mark-tl"></div>
            <div className="registration-mark mark-tr"></div>
            <div className="registration-mark mark-bl"></div>
            <div className="registration-mark mark-br"></div>
            
            <div className="mb-6 flex justify-center text-primary">
              <Loader2 className="w-12 h-12 animate-spin" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Confirming On Monad</h3>
            <p className="text-foreground/60 text-xs font-mono uppercase tracking-wider">
              {issuingStep === "PREPARING" && "hashing_receipt_payload..."}
              {issuingStep === "PROMPTING_WALLET" && "authorizing_transaction_sign..."}
              {issuingStep === "WAITING_TX" && "awaiting_monad_testnet_confirm..."}
              {issuingStep === "CONFIRMING_DB" && "syncing_ledger_metadata..."}
            </p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {issuingSuccess && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[100] flex items-center justify-center animate-fade-in">
          <div className="bg-card rounded-lg shadow-2xl max-w-sm w-full mx-6 overflow-hidden border border-outline-variant relative p-8 text-center flex flex-col items-center">
            <div className="registration-mark mark-tl"></div>
            <div className="registration-mark mark-tr"></div>
            <div className="registration-mark mark-bl"></div>
            <div className="registration-mark mark-br"></div>

            <div className="w-12 h-12 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-6 h-6" />
            </div>
            
            <h3 className="font-display text-2xl font-bold mb-2">Receipt Anchored</h3>
            <p className="text-foreground/60 text-sm mb-8 leading-relaxed">
              Proof of Purchase is permanently anchored to the Monad PoP smart contract ledger.
            </p>

            <button
              onClick={() => setIssuingSuccess(false)}
              className="w-full py-3 bg-primary text-white font-mono font-bold text-xs uppercase tracking-widest rounded-lg hover:opacity-90 transition-all active:scale-95"
            >
              Issue Another Receipt
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
