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
  Clock,
  Tag,
  Eye,
  FileText
} from "lucide-react";
import Link from "next/link";
import { CONTRACT_ADDRESS } from "@/lib/monad";

interface PassportDetail {
  id: string;
  chainReceiptId: string;
  contractAddress: string;
  chainId: number;
  merchantAddress: string;
  buyerAddress: string;
  originalBuyerAddress: string;
  productIdentifier: string;
  productName: string;
  brand: string;
  model: string;
  imageUrl: string | null;
  description: string;
  merchantName: string;
  metadataHash: string;
  issueTxHash: string;
  status: string;
  purchasedAt: string;
  warrantyUntil: string | null;
  
  // Decrypted private properties
  serialNumber: string;
  sku: string;
  merchantReference: string;
  receiptJson: string;
  privateBuyerInfo: string;
  privateNotes: string;
  warrantyDocs: string;
}

export default function PassportDetailsPage({ params }: { params: { id: string } }) {
  const { sessionAddress, loading } = useAuth();
  
  const [passport, setPassport] = useState<PassportDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("Checking...");
  const [verificationColor, setVerificationColor] = useState("text-foreground/45 border-outline-variant");
  const [onChainHash, setOnChainHash] = useState("");
  const [onChainStatus, setOnChainStatus] = useState("");

  const loadPassport = async () => {
    setFetching(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/receipts/${params.id}`);
      const data = await res.json();
      if (data.receipt) {
        setPassport(data.receipt);
        verifyOnChain(data.receipt);
      } else {
        setErrorMsg(data.error || "Failed to load passport details");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error loading passport details");
    } finally {
      setFetching(false);
    }
  };

  const verifyOnChain = async (p: PassportDetail) => {
    if (p.issueTxHash.startsWith("demo-tx-hash")) {
      setVerificationStatus("Demo — Not On-chain");
      setVerificationColor("text-accent-amber border-accent-amber/30 bg-accent-amber/5");
      setOnChainHash("N/A (Demo mode)");
      setOnChainStatus("Active (Mocked)");
      return;
    }

    try {
      const verifyRes = await fetch(`/api/verify/data?id=${p.chainReceiptId}`);
      const vData = await verifyRes.json();

      if (vData.error) {
        setVerificationStatus("On-chain record unavailable");
        setVerificationColor("text-accent-rose border-accent-rose/30 bg-accent-rose/5");
        return;
      }

      setOnChainHash(vData.onChainHash || "");
      setOnChainStatus(vData.onChainStatus || "");

      if (vData.isValid) {
        setVerificationStatus("Ledger Verified");
        setVerificationColor("text-accent-emerald border-accent-emerald/30 bg-accent-emerald/5");
      } else {
        setVerificationStatus(vData.onChainStatus);
        setVerificationColor("text-primary border-primary/30 bg-primary/5");
      }
    } catch (err) {
      console.error(err);
      setVerificationStatus("RPC Offline");
      setVerificationColor("text-foreground/40 border-outline-variant");
    }
  };

  useEffect(() => {
    if (sessionAddress) {
      loadPassport();
    }
  }, [sessionAddress]);

  if (loading || fetching) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">LOADING_PASSPORT_LEDGER...</p>
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
          <Link href="/passports" className="inline-block px-4 py-2.5 border border-outline-variant text-foreground/80 hover:text-foreground text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-colors">
            Back to Passports
          </Link>
        </div>
      </div>
    );
  }

  if (!passport) return null;

  const publicVerifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify/${passport.chainReceiptId}`
    : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify/${passport.chainReceiptId}`;

  const shortAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Navigation and Header */}
      <div>
        <Link href="/passports" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-foreground/50 hover:text-foreground mb-6 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Passports
        </Link>
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs text-foreground/50 tracking-wider uppercase mb-1">PASSPORT ENTITY #{passport.chainReceiptId}</p>
            <h1 className="font-display text-4xl font-bold text-foreground">Passport Detail</h1>
          </div>
          <div className="flex gap-3">
            {passport.status === "Active" && (
              <Link
                href={`/sell?passportId=${passport.chainReceiptId}`}
                className="px-4 py-2 border border-primary bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all self-start md:self-auto"
              >
                <Tag className="w-4 h-4" />
                List for Sale
              </Link>
            )}
            <div className={`px-4 py-2 border rounded-lg text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-2 self-start md:self-auto ${verificationColor}`}>
              {verificationStatus === "Ledger Verified" ? <ShieldCheck className="w-4 h-4 text-accent-emerald" /> : <AlertTriangle className="w-4 h-4 text-accent-amber" />}
              {verificationStatus}
            </div>
          </div>
        </header>
      </div>

      {/* Tactile Receipt Container Card */}
      <section className="relative bg-card border border-outline-variant rounded-lg overflow-hidden shadow-xl flex flex-col">
        
        {/* Corner Registration Marks */}
        <div className="registration-mark mark-tl"></div>
        <div className="registration-mark mark-tr"></div>
        <div className="registration-mark mark-bl"></div>
        <div className="registration-mark mark-br"></div>

        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px] divide-y md:divide-y-0 md:divide-x divide-outline-variant">
          
          {/* Left section: Product Info */}
          <div className="md:col-span-7 p-8 sm:p-10 space-y-8">
            <div className="flex items-start gap-6">
              {passport.imageUrl ? (
                <img
                  src={passport.imageUrl}
                  alt={passport.productName}
                  className="w-28 h-28 rounded-lg border border-outline-variant object-cover shadow-sm bg-card shrink-0"
                />
              ) : (
                <div className="w-28 h-28 rounded-lg border border-outline-variant bg-card-border/20 flex items-center justify-center text-foreground/20 shrink-0">
                  <FileText className="w-10 h-10" />
                </div>
              )}
              <div className="space-y-1.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-mono text-[9px] font-bold tracking-widest uppercase mb-1">
                  {passport.brand}
                </span>
                <h2 className="font-display text-2xl font-bold text-foreground truncate">{passport.productName}</h2>
                <p className="text-foreground/60 text-xs font-mono">Model Specification: {passport.model}</p>
                {passport.description && (
                  <p className="text-xs text-foreground/50 leading-relaxed line-clamp-2 mt-1">{passport.description}</p>
                )}
              </div>
            </div>

            {/* Encrypted Field Block (Crucial requirement!) */}
            <div className="border border-primary/25 rounded-xl overflow-hidden bg-primary-container/5 relative">
              <div className="p-4 bg-primary/10 border-b border-primary/20 flex items-center justify-between text-xs font-mono text-primary font-bold">
                <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> SECURE DECRYPTED PASSPORT DATA</span>
                <span className="text-[9px] bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30 px-1.5 py-0.5 rounded font-bold">AES-256-GCM</span>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-foreground/45 uppercase block mb-1">SERIAL NUMBER</span>
                  <span className="font-semibold text-foreground break-all bg-card/60 px-2.5 py-1.5 border border-outline-variant/30 rounded block">
                    {passport.serialNumber || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-foreground/45 uppercase block mb-1">PRODUCT SKU / SUB-SKU</span>
                  <span className="font-semibold text-foreground break-all bg-card/60 px-2.5 py-1.5 border border-outline-variant/30 rounded block">
                    {passport.sku || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-foreground/45 uppercase block mb-1">MERCHANT REFERENCE</span>
                  <span className="font-semibold text-foreground break-all bg-card/60 px-2.5 py-1.5 border border-outline-variant/30 rounded block">
                    {passport.merchantReference || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-foreground/45 uppercase block mb-1">WARRANTY EXPRY TIME</span>
                  <span className="font-semibold text-foreground break-all bg-card/60 px-2.5 py-1.5 border border-outline-variant/30 rounded block">
                    {passport.warrantyUntil ? new Date(passport.warrantyUntil).toLocaleString() : "Lifetime"}
                  </span>
                </div>
              </div>
            </div>

            <div className="perforated-line"></div>

            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <label className="font-mono text-xs font-bold text-foreground/40 uppercase tracking-widest block mb-1">Current Owner</label>
                <p className="font-mono text-foreground font-semibold break-all text-xs bg-foreground/5 px-2 py-1 rounded inline-block" title={passport.buyerAddress}>
                  {shortAddress(passport.buyerAddress)} {sessionAddress.toLowerCase() === passport.buyerAddress.toLowerCase() && "(You)"}
                </p>
              </div>
              <div>
                <label className="font-mono text-xs font-bold text-foreground/40 uppercase tracking-widest block mb-1">Original Mint Buyer</label>
                <p className="font-mono text-foreground/80 break-all text-xs bg-foreground/5 px-2 py-1 rounded inline-block" title={passport.originalBuyerAddress}>
                  {shortAddress(passport.originalBuyerAddress)}
                </p>
              </div>
            </div>
          </div>

          {/* Right section: Proof evidence */}
          <div className="md:col-span-5 p-8 sm:p-10 bg-primary-container/5 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <h3 className="font-mono text-xs font-bold text-foreground tracking-widest uppercase flex items-center gap-2 mb-6">
                <Lock className="w-4 h-4 text-primary" />
                ON-CHAIN PROVENANCE
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-mono text-[9px] text-foreground/40 font-bold uppercase tracking-wider block mb-1">Original Receipt Hash</label>
                  <p className="font-mono text-[10px] bg-background border border-outline-variant p-3 rounded break-all select-all text-foreground/80 leading-relaxed font-semibold">
                    {passport.metadataHash}
                  </p>
                </div>

                <div className="grid grid-cols-1 divide-y divide-outline-variant/30 pt-4">
                  <div className="flex justify-between items-center py-2 font-mono">
                    <span className="text-[10px] text-foreground/50 uppercase">Contract</span>
                    <span className="text-[11px] text-primary">{shortAddress(CONTRACT_ADDRESS)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 font-mono">
                    <span className="text-[10px] text-foreground/50 uppercase">Tx Hash</span>
                    <a
                      href={`https://testnet.monadvision.com/tx/${passport.issueTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-foreground/75 hover:text-primary flex items-center gap-1 underline"
                    >
                      {shortAddress(passport.issueTxHash)}
                    </a>
                  </div>
                  <div className="flex justify-between items-center py-2 font-mono">
                    <span className="text-[10px] text-foreground/50 uppercase">Issued Date</span>
                    <span className="text-[11px] text-foreground/75">
                      {new Date(passport.purchasedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* QR verification share card */}
            <div className="p-5 border border-dashed border-outline-variant rounded-xl bg-card text-center flex flex-col items-center gap-3 shadow-inner">
              <QRCodeSVG value={publicVerifyUrl} size={110} />
              <p className="font-mono text-[9px] text-foreground/40 uppercase tracking-widest font-bold">Public Verification Link</p>
              <a
                href={publicVerifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-mono text-[10px] font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
              >
                Open Verifier
                <ExternalLink className="w-3 h-3 text-accent-cyan" />
              </a>
            </div>
          </div>
        </div>

        {/* Perforated bottom border decoration */}
        <div className="receipt-perforation"></div>
      </section>

      {/* Collapsible raw json for tech users */}
      <section className="bg-card border border-outline-variant rounded-lg overflow-hidden">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full px-6 py-4 flex items-center justify-between font-bold text-sm text-foreground/80 hover:text-foreground"
        >
          <span className="font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> View Raw Encrypted Payload JSON
          </span>
          {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showRawJson && (
          <div className="px-6 pb-6 border-t border-outline-variant/35 pt-4">
            <pre className="bg-background border border-outline-variant p-4 rounded text-[11px] font-mono text-foreground/75 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
              {JSON.stringify(JSON.parse(passport.receiptJson || "{}"), null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* Technical Collapsible Specifications */}
      <section className="bg-card border border-outline-variant rounded-lg overflow-hidden">
        <button
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="w-full px-6 py-4 flex items-center justify-between font-bold text-sm text-foreground/80 hover:text-foreground"
        >
          <span className="font-mono text-xs font-bold uppercase tracking-widest">Protocol Specifications</span>
          {showTechDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechDetails && (
          <div className="px-6 pb-6 border-t border-outline-variant/35 pt-4 flex flex-col gap-4 text-xs font-mono text-foreground/50 leading-relaxed">
            <div>
              <span className="text-foreground/75 block font-sans font-semibold mb-1">Contract Deployment:</span>
              <span className="text-foreground select-all break-all">{CONTRACT_ADDRESS}</span>
            </div>
            <div>
              <span className="text-foreground/75 block font-sans font-semibold mb-1">On-Chain Passport ID:</span>
              <span className="text-foreground">{passport.chainReceiptId}</span>
            </div>
            <div>
              <span className="text-foreground/75 block font-sans font-semibold mb-1">Verified On-Chain Hash:</span>
              <span className="text-foreground select-all break-all">{onChainHash || "Pending RPC..."}</span>
            </div>
            <div>
              <span className="text-foreground/75 block font-sans font-semibold mb-1">On-Chain Status Code:</span>
              <span className="text-foreground">{onChainStatus || "Active"}</span>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
