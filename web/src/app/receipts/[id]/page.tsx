"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  AlertTriangle,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Lock,
  History,
  Info,
  Clock
} from "lucide-react";
import Link from "next/link";
import { CONTRACT_ADDRESS } from "@/lib/monad";

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
  receiptJson: string;
  receiptHash: string;
  issueTxHash: string;
  status: string;
}

export default function ReceiptDetailsPage({ params }: { params: { id: string } }) {
  const { sessionAddress, loading } = useAuth();
  
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("Checking...");
  const [verificationColor, setVerificationColor] = useState("text-gray-400");
  const [onChainHash, setOnChainHash] = useState("");
  const [onChainStatus, setOnChainStatus] = useState("");

  const loadReceipt = async () => {
    setFetching(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/receipts/${params.id}`);
      const data = await res.json();
      if (data.receipt) {
        setReceipt(data.receipt);
        verifyOnChain(data.receipt);
      } else {
        setErrorMsg(data.error || "Failed to load receipt");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error loading receipt details");
    } finally {
      setFetching(false);
    }
  };

  const verifyOnChain = async (r: Receipt) => {
    if (r.issueTxHash.startsWith("demo-tx-hash")) {
      setVerificationStatus("Demo — not on-chain");
      setVerificationColor("text-accent-amber border-accent-amber/30 bg-accent-amber/5");
      setOnChainHash("N/A (Demo mode)");
      setOnChainStatus("Active (Mocked)");
      return;
    }

    try {
      const verifyRes = await fetch(`/api/verify/data?id=${r.chainReceiptId}`);
      const vData = await verifyRes.json();

      if (vData.error) {
        setVerificationStatus("On-chain record unavailable");
        setVerificationColor("text-accent-rose border-accent-rose/30 bg-accent-rose/5");
        return;
      }

      setOnChainHash(vData.onChainHash);
      setOnChainStatus(vData.onChainStatus);

      if (vData.isValid) {
        setVerificationStatus("Verified");
        setVerificationColor("text-accent-emerald border-accent-emerald/30 bg-accent-emerald/5");
      } else if (vData.onChainHash && vData.onChainHash.toLowerCase() !== r.receiptHash.toLowerCase()) {
        setVerificationStatus("Metadata mismatch");
        setVerificationColor("text-accent-rose border-accent-rose/30 bg-accent-rose/5");
      } else {
        setVerificationStatus(vData.onChainStatus);
        setVerificationColor("text-primary border-primary/30 bg-primary/5");
      }
    } catch (err) {
      console.error(err);
      setVerificationStatus("RPC unavailable");
      setVerificationColor("text-foreground/40 border-outline-variant");
    }
  };

  useEffect(() => {
    if (sessionAddress) {
      loadReceipt();
    }
  }, [sessionAddress]);

  if (loading || fetching) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">LOADING_PROOF_CREDENTIAL...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full bg-card border border-outline-variant p-8 rounded-lg text-center relative shadow-xl">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <AlertTriangle className="w-12 h-12 text-accent-rose mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold mb-2">Access Denied</h3>
          <p className="text-sm text-foreground/60 mb-6">{errorMsg}</p>
          <Link href="/wallet" className="inline-block px-4 py-2.5 border border-outline-variant text-foreground/80 hover:text-foreground text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-colors">
            Back to Wallet
          </Link>
        </div>
      </div>
    );
  }

  if (!receipt) return null;

  const publicVerifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify/${receipt.chainReceiptId}`
    : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify/${receipt.chainReceiptId}`;

  const shortAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Navigation and Header */}
      <div>
        <Link href="/wallet" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-foreground/50 hover:text-foreground mb-6 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Wallet
        </Link>
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs text-foreground/50 tracking-wider uppercase mb-1">LEDGER ENTRY #{receipt.chainReceiptId}</p>
            <h1 className="font-display text-4xl font-bold text-foreground">Receipt Detail</h1>
          </div>
          <div className={`px-4 py-2 border rounded-lg text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-2 self-start md:self-auto ${verificationColor}`}>
            {verificationStatus === "Verified" ? <ShieldCheck className="w-4 h-4 text-accent-emerald" /> : <AlertTriangle className="w-4 h-4 text-accent-amber" />}
            Verification: {verificationStatus}
          </div>
        </header>
      </div>

      {/* Tactile Receipt Container Card */}
      <section className="relative bg-card border border-outline-variant rounded-lg overflow-hidden shadow-sm flex flex-col">
        
        {/* Corner Registration Marks */}
        <div className="registration-mark mark-tl"></div>
        <div className="registration-mark mark-tr"></div>
        <div className="registration-mark mark-bl"></div>
        <div className="registration-mark mark-br"></div>

        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px] divide-y md:divide-y-0 md:divide-x divide-outline-variant">
          
          {/* Left section: Product Info */}
          <div className="md:col-span-7 p-8 sm:p-10 space-y-10">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full font-mono text-[9px] font-bold tracking-widest uppercase mb-4">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent-cyan" />
                  Verified on Monad
                </span>
                <h2 className="font-display text-3xl font-bold text-foreground">{receipt.productName}</h2>
                <p className="text-foreground/60 text-xs mt-1">ID Code: {receipt.productIdentifier}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <label className="font-mono text-xs font-bold text-foreground/40 uppercase tracking-widest block mb-1">Merchant Reference</label>
                <p className="font-semibold text-foreground">{receipt.merchantReference}</p>
              </div>
              <div>
                <label className="font-mono text-xs font-bold text-foreground/40 uppercase tracking-widest block mb-1">Price</label>
                <p className="font-mono font-bold text-foreground">
                  {parseFloat(receipt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {receipt.currency}
                </p>
              </div>
            </div>

            <div className="perforated-line"></div>

            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <label className="font-mono text-xs font-bold text-foreground/40 uppercase tracking-widest block mb-1">Serial Number</label>
                <p className="font-mono text-foreground/80">{receipt.serialNumber || "—"}</p>
              </div>
              <div>
                <label className="font-mono text-xs font-bold text-foreground/40 uppercase tracking-widest block mb-1">Warranty</label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {receipt.warrantyUntil ? (
                    new Date(receipt.warrantyUntil) > new Date() ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-accent-emerald"></span>
                        <span className="text-foreground/80">Expires {new Date(receipt.warrantyUntil).toLocaleDateString()}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-foreground/30"></span>
                        <span className="text-foreground/40">Expired</span>
                      </>
                    )
                  ) : (
                    <span className="text-foreground/30">No Warranty Set</span>
                  )}
                </div>
              </div>
            </div>

            {/* Warning block state */}
            <div className="p-4 bg-primary-container/20 border-l-4 border-primary rounded-r-lg flex gap-3 text-xs leading-relaxed text-foreground/80">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-mono font-bold text-primary mb-1 uppercase tracking-wider">Authenticity Notes</p>
                <p>This item is backed by a cryptographically signed warranty. Ownership is verifiable via the Monad PoP protocol.</p>
              </div>
            </div>
          </div>

          {/* Right section: Proof evidence */}
          <div className="md:col-span-5 p-8 sm:p-10 bg-primary-container/5 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <h3 className="font-mono text-xs font-bold text-foreground tracking-widest uppercase flex items-center gap-2 mb-6">
                <Lock className="w-4 h-4 text-primary" />
                VERIFICATION EVIDENCE
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-mono text-[9px] text-foreground/40 font-bold uppercase tracking-wider block mb-1">Receipt Hash</label>
                  <p className="font-mono text-[10px] bg-background border border-outline-variant p-3 rounded break-all select-all text-foreground/80 leading-relaxed">
                    {receipt.receiptHash}
                  </p>
                </div>

                <div className="grid grid-cols-1 divide-y divide-outline-variant/30 pt-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="font-mono text-[10px] text-foreground/50 uppercase">Contract</span>
                    <span className="font-mono text-[11px] text-primary">{shortAddress(CONTRACT_ADDRESS)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-mono text-[10px] text-foreground/50 uppercase">Tx Hash</span>
                    <span className="font-mono text-[11px] text-foreground/75 truncate w-32 text-right" title={receipt.issueTxHash}>
                      {shortAddress(receipt.issueTxHash)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-mono text-[10px] text-foreground/50 uppercase">Timestamp</span>
                    <span className="font-mono text-[11px] text-foreground/75">
                      {new Date(receipt.purchasedAt).toLocaleDateString()} {new Date(receipt.purchasedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* QR verification share card */}
            <div className="p-5 border border-dashed border-outline-variant rounded-lg bg-card text-center flex flex-col items-center gap-4">
              <QRCodeSVG value={publicVerifyUrl} size={110} />
              <p className="font-mono text-[9px] text-foreground/40 uppercase tracking-widest">Share Verification QR</p>
              <a
                href={publicVerifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-mono text-[10px] font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
              >
                Public Link
                <ExternalLink className="w-3 h-3 text-accent-cyan" />
              </a>
            </div>
          </div>
        </div>

        {/* Perforated bottom border decoration */}
        <div className="receipt-perforation"></div>
      </section>

      {/* Sub sections: History, Policy, Replacement */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 bg-card border border-outline-variant rounded-lg relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>
          
          <History className="w-5 h-5 text-primary mb-4" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider mb-2">History</h4>
          <ul className="text-xs text-foreground/60 space-y-2 font-mono">
            <li className="flex justify-between">
              <span>Minted On-chain</span>
              <span>{new Date(receipt.purchasedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
            </li>
            <li className="flex justify-between">
              <span>Warranty Anchored</span>
              <span>Active</span>
            </li>
          </ul>
        </div>

        <div className="p-6 bg-card border border-outline-variant rounded-lg relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <ShieldCheck className="w-5 h-5 text-primary mb-4" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider mb-2">Merchant Policy</h4>
          <p className="text-xs text-foreground/60 leading-relaxed font-sans">
            Store returns are offered within 14 days of purchase. The on-chain receipt state will update to Returned when processing.
          </p>
        </div>

        <div className="p-6 bg-card border border-outline-variant rounded-lg relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <Clock className="w-5 h-5 text-primary mb-4" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider mb-2">Replacement</h4>
          <p className="text-xs text-foreground/60 leading-relaxed font-sans">
            Lost your physical receipt? This Monad PoP digital ledger credential serves as primary evidence for claiming hardware replacements.
          </p>
        </div>
      </section>

      {/* Technical Collapsible Specifications */}
      <section className="bg-card border border-outline-variant rounded-lg overflow-hidden">
        <button
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="w-full px-6 py-4 flex items-center justify-between font-bold text-sm text-foreground/80 hover:text-foreground"
        >
          <span className="font-mono text-xs font-bold uppercase tracking-widest">Technical details</span>
          {showTechDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechDetails && (
          <div className="px-6 pb-6 border-t border-outline-variant/35 pt-4 flex flex-col gap-4 text-xs font-mono text-foreground/50 leading-relaxed">
            <div>
              <span className="text-foreground/75 block font-sans font-semibold mb-1">Contract Address:</span>
              <span className="text-foreground select-all break-all">{CONTRACT_ADDRESS}</span>
            </div>
            <div>
              <span className="text-foreground/75 block font-sans font-semibold mb-1">Database Receipt Hash:</span>
              <span className="text-foreground select-all break-all">{receipt.receiptHash}</span>
            </div>
            <div>
              <span className="text-foreground/75 block font-sans font-semibold mb-1">On-Chain Receipt Hash (Contract):</span>
              <span className="text-foreground select-all break-all">{onChainHash}</span>
            </div>
            <div>
              <span className="text-foreground/75 block font-sans font-semibold mb-1">Status on Blockchain:</span>
              <span className="text-foreground">{onChainStatus || "Checking..."}</span>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
