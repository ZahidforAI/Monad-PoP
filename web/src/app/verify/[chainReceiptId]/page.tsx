"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Info,
  Calendar,
  User,
  ShoppingBag,
  History,
  Activity
} from "lucide-react";
import Link from "next/link";

interface PassportVerificationData {
  passportId: number;
  productName: string;
  brand: string;
  model: string;
  imageUrl: string | null;
  description: string;
  merchantName: string;
  merchantAddress: string;
  passportStatus: string;
  warrantyActive: boolean;
  existsOnChain: boolean;
  receiptHashMatches: boolean;
  currentOwnerShort: string;
  listingStatus: string;
  finalProofHash: string | null;
  explorerLink: string | null;
}

export default function PublicVerifyPage({ params }: { params: { chainReceiptId: string } }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<PassportVerificationData | null>(null);

  const verifyReceipt = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/verify/data?id=${params.chainReceiptId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setErrorMsg(errorData.error || "Product passport verification failed.");
        return;
      }
      const verifiedData = await res.json();
      setData(verifiedData);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to verification services. Check RPC connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.chainReceiptId) {
      verifyReceipt();
    }
  }, [params.chainReceiptId]);

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background py-20">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-t-2 border-primary border-solid rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-foreground/50">VERIFYING_CHAIN_PROVENANCE...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="w-full flex-1 bg-background py-16 px-6 max-w-xl mx-auto text-center flex flex-col items-center justify-center">
        <XCircle className="w-16 h-16 text-accent-rose mb-6" />
        <h1 className="font-display text-2xl font-bold mb-2">Verification Failed</h1>
        <p className="text-sm text-foreground/60 mb-8 leading-relaxed">
          {errorMsg || "The requested product passport credential could not be verified on the Monad ledger."}
        </p>
        <Link
          href="/"
          className="flex items-center gap-2 border border-outline-variant px-5 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider hover:bg-card-border transition-colors text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  const statusColorMap: Record<string, string> = {
    Active: "text-accent-emerald bg-accent-emerald/10 border-accent-emerald/30",
    Returned: "text-accent-amber bg-accent-amber/10 border-accent-amber/30",
    Refunded: "text-accent-rose bg-accent-rose/10 border-accent-rose/30",
    Replaced: "text-primary bg-primary/10 border-primary/30",
    Revoked: "text-foreground/40 bg-foreground/5 border-outline-variant"
  };

  const statusColor = statusColorMap[data.passportStatus] || "text-foreground bg-foreground/10";

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Title */}
      <div className="text-center relative py-2">
        <span className="font-mono text-[10px] text-primary font-bold tracking-widest uppercase">MONAD VERIFIED PRODUCT PASSAGE</span>
        <h1 className="font-display text-4xl font-bold mt-1 text-foreground">Digital Passport Verification</h1>
        <p className="text-xs font-mono text-foreground/50 mt-1">PASSPORT ID: #{data.passportId}</p>
      </div>

      {/* Large Status Ticket Container */}
      <div className="max-w-xl w-full mx-auto bg-card border border-outline-variant rounded-lg overflow-hidden shadow-xl relative flex flex-col">
        
        {/* Corner Registration Marks */}
        <div className="registration-mark mark-tl"></div>
        <div className="registration-mark mark-tr"></div>
        <div className="registration-mark mark-bl"></div>
        <div className="registration-mark mark-br"></div>

        {/* Top serrated tab */}
        <div className="h-4 bg-primary-container/20 border-b border-dashed border-outline-variant flex items-center justify-center">
          <div className="w-16 h-1 bg-outline-variant rounded-full"></div>
        </div>

        <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
          
          {/* Status Header */}
          <div className="flex flex-col items-center text-center pb-6 border-b border-dashed border-outline-variant">
            {data.passportStatus === "Active" && data.receiptHashMatches ? (
              <>
                <div className="w-12 h-12 rounded-full bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center mb-4 text-accent-emerald">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">PASSPORT VERIFIED</h2>
                <p className="text-xs text-foreground/60 mt-1 max-w-sm">
                  This passport is actively verified on the Monad network ledger and matches merchant records.
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center mb-4 text-accent-amber">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">PASSPORT: {data.passportStatus.toUpperCase()}</h2>
                <p className="text-xs text-foreground/60 mt-1 max-w-sm">
                  This passport status has changed. Current status: <strong className="font-bold">{data.passportStatus}</strong>.
                </p>
              </>
            )}

            <div className={`mt-4 px-4 py-1.5 border rounded-full text-xs font-mono uppercase tracking-wider ${statusColor}`}>
              Status: {data.passportStatus}
            </div>
          </div>

          {/* Product Profile */}
          <div className="flex items-start gap-4 p-4 bg-primary-container/5 border border-outline-variant/40 rounded-lg">
            {data.imageUrl ? (
              <img
                src={data.imageUrl}
                alt={data.productName}
                className="w-20 h-20 rounded border border-outline-variant object-cover shadow-sm bg-card shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded border border-outline-variant bg-card flex items-center justify-center text-foreground/20 shrink-0">
                <ShoppingBag className="w-8 h-8" />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">{data.brand}</span>
              <h3 className="font-display font-bold text-sm text-foreground truncate">{data.productName}</h3>
              <p className="text-xs text-foreground/60 font-mono">Model: {data.model}</p>
              {data.description && (
                <p className="text-[11px] text-foreground/50 line-clamp-2 mt-1 leading-relaxed">{data.description}</p>
              )}
            </div>
          </div>

          {/* Authenticity and Checks */}
          <div className="space-y-3.5 text-xs font-mono border-t border-outline-variant/30 pt-5">
            <div className="flex justify-between items-center">
              <span className="text-foreground/45 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> ON-CHAIN EXISTENCE</span>
              <span className="text-accent-emerald font-bold uppercase">YES</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-foreground/45 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> METADATA INTEGRITY</span>
              <span className={data.receiptHashMatches ? "text-accent-emerald font-bold" : "text-accent-rose font-bold"}>
                {data.receiptHashMatches ? "MATCHED" : "MISMATCH"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-foreground/45 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> WARRANTY COVERAGE</span>
              <span className={data.warrantyActive ? "text-accent-emerald font-bold" : "text-foreground/40 font-bold"}>
                {data.warrantyActive ? "ACTIVE" : "EXPIRED"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-foreground/45 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> CURRENT OWNER</span>
              <span className="text-foreground font-semibold font-mono tracking-wide bg-primary-container/10 px-2 py-0.5 border border-outline-variant/30 rounded">
                {data.currentOwnerShort}
              </span>
            </div>

            {data.listingStatus !== "None" && (
              <div className="flex justify-between items-center">
                <span className="text-foreground/45 flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5" /> MARKETPLACE STATUS</span>
                <span className="text-primary font-bold uppercase">{data.listingStatus}</span>
              </div>
            )}

            {data.finalProofHash && (
              <div className="border-t border-outline-variant/20 pt-3 space-y-1">
                <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-wider block">FINAL PROOF OF SALE HASH</span>
                <p className="text-foreground font-mono text-[10px] break-all select-all font-semibold p-2 bg-primary-container/5 border border-outline-variant/30 rounded">{data.finalProofHash}</p>
              </div>
            )}
          </div>

          {/* Merchant Info */}
          <div className="border-t border-dashed border-outline-variant/60 pt-5 text-xs font-mono">
            <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-wider block mb-1.5">ISSUING MERCHANT</span>
            <div className="flex justify-between items-center">
              <span className="font-sans font-bold text-foreground">{data.merchantName}</span>
              <span className="text-foreground/50 text-[11px]">{shortenAddress(data.merchantAddress)}</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-6 flex justify-between items-center border-t border-outline-variant/35 pt-5 text-xs font-mono uppercase tracking-wider">
            {data.explorerLink ? (
              <a
                href={data.explorerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline font-bold"
              >
                Monad Explorer
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-foreground/45">EXPLORER_UNAVAILABLE</span>
            )}
            
            <Link
              href="/"
              className="text-foreground/60 hover:text-foreground font-bold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Portal Home
            </Link>
          </div>

        </div>

        {/* Perforated bottom effect */}
        <div className="receipt-perforation"></div>
      </div>

      {/* Trust Notice */}
      <div className="max-w-xl w-full mx-auto bg-primary-container/10 border border-outline-variant p-5 rounded-lg flex items-start gap-3 relative">
        <div className="registration-mark mark-tl"></div>
        <div className="registration-mark mark-tr"></div>
        <div className="registration-mark mark-bl"></div>
        <div className="registration-mark mark-br"></div>
        
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-foreground/75 leading-relaxed font-sans">
          <strong className="text-foreground font-semibold block mb-0.5">Physical Provenance Notice</strong>
          The digital passport proves the authenticity of the ledger record and the sequence of ownership. However, you should inspect physical security seals or matching engraved serial tags to confirm the real-world product matches this ledger item.
        </div>
      </div>

    </div>
  );
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
