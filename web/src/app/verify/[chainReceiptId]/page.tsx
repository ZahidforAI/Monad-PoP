"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Database,
  Link2,
  Lock,
  ArrowLeft,
  Info
} from "lucide-react";
import Link from "next/link";
import { CONTRACT_ADDRESS } from "@/lib/monad";

interface OnChainReport {
  id: string;
  receiptHash: string;
  productId: string;
  merchant: string;
  buyer: string;
  purchasedAt: string;
  warrantyUntil: string;
  status: string;
}

interface DbRecord {
  productName: string;
  productIdentifier: string;
  sku: string | null;
  serialNumber: string | null;
  merchantReference: string;
  amount: string;
  currency: string;
  purchasedAt: string;
  returnDeadline: string;
  warrantyUntil: string;
  status: string;
  calculatedHash: string;
}

export default function PublicVerifyPage({ params }: { params: { chainReceiptId: string } }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [existsOnChain, setExistsOnChain] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [hashMatches, setHashMatches] = useState(false);
  const [onChainStatus, setOnChainStatus] = useState("");
  const [onChainReport, setOnChainReport] = useState<OnChainReport | null>(null);
  const [dbRecord, setDbRecord] = useState<DbRecord | null>(null);
  const [infoMessage, setInfoMessage] = useState("");

  const verifyReceipt = async () => {
    setLoading(true);
    setErrorMsg("");
    setInfoMessage("");
    try {
      const res = await fetch(`/api/verify/data?id=${params.chainReceiptId}`);
      
      if (res.status === 444) {
        setExistsOnChain(false);
        setErrorMsg("Receipt record does not exist on the Monad PoP smart contract. Double check the receipt ID.");
        return;
      }
      
      const data = await res.json();
      
      if (data.error) {
        setErrorMsg(data.error);
        return;
      }

      setExistsOnChain(data.existsOnChain);
      setIsValid(data.isValid);
      setHashMatches(data.hashMatches);
      setOnChainStatus(data.onChainStatus);
      setOnChainReport(data.onChainReport);
      setDbRecord(data.dbRecord);
      if (data.message) {
        setInfoMessage(data.message);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to fetch verification data. Connection issues with Monad RPC.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.chainReceiptId) {
      verifyReceipt();
    }
  }, [params.chainReceiptId]);

  const shortAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Title */}
      <div className="text-center relative py-4">
        <span className="font-mono text-[10px] text-primary font-bold tracking-widest uppercase">PUBLIC VERIFICATION STATUS</span>
        <h1 className="font-display text-4xl font-bold mt-1 text-foreground">Receipt Authenticity</h1>
        <p className="text-xs font-mono text-foreground/50 mt-1">RECEIPT ID: #{params.chainReceiptId}</p>
      </div>

      {/* Large Status Ticket Container */}
      <div className="max-w-xl w-full mx-auto bg-card border border-outline-variant rounded-lg overflow-hidden shadow-sm relative flex flex-col">
        
        {/* Corner Registration Marks */}
        <div className="registration-mark mark-tl"></div>
        <div className="registration-mark mark-tr"></div>
        <div className="registration-mark mark-bl"></div>
        <div className="registration-mark mark-br"></div>

        {/* Top serrated tab */}
        <div className="h-4 bg-primary-container/20 border-b border-dashed border-outline-variant flex items-center justify-center">
          <div className="w-16 h-1 bg-outline-variant rounded-full"></div>
        </div>

        <div className="p-8 space-y-8 flex-1 flex flex-col justify-between">
          
          {/* Status Header */}
          <div className="flex flex-col items-center text-center pb-6 border-b border-dashed border-outline-variant">
            {isValid ? (
              <>
                <div className="w-12 h-12 rounded-full bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center mb-4 text-accent-emerald">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold">RECEIPT IS VERIFIED</h2>
                <p className="text-xs text-foreground/60 mt-1 max-w-sm">
                  On-chain hash matches database metadata. Status is ACTIVE.
                </p>
              </>
            ) : onChainReport && onChainReport.status !== "Active" ? (
              <>
                <div className="w-12 h-12 rounded-full bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center mb-4 text-accent-amber">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold">RECEIPT STATUS: {onChainReport.status.toUpperCase()}</h2>
                <p className="text-xs text-foreground/60 mt-1 max-w-sm">
                  The blockchain recorded status for this receipt is: {onChainReport.status}.
                </p>
              </>
            ) : !hashMatches && dbRecord ? (
              <>
                <div className="w-12 h-12 rounded-full bg-accent-rose/10 border border-accent-rose/30 flex items-center justify-center mb-4 text-accent-rose">
                  <XCircle className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-accent-rose">METADATA MISMATCH</h2>
                <p className="text-xs text-accent-rose/80 mt-1 max-w-sm font-semibold">
                  WARNING: Recalculated receipt metadata hash does not match the hash stored on-chain!
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold">RAW ON-CHAIN RECORD</h2>
                <p className="text-xs text-foreground/60 mt-1 max-w-sm">
                  {infoMessage || "Verified on-chain. Off-chain detail metadata is unavailable."}
                </p>
              </>
            )}
          </div>

          {/* Ledger Data */}
          <div className="space-y-6 text-xs font-mono">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-wider block mb-1">RECEIPT ID</span>
                <span className="text-foreground font-semibold">#MP-{params.chainReceiptId}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-wider block mb-1">TIMESTAMP</span>
                <span className="text-foreground">
                  {onChainReport ? new Date(onChainReport.purchasedAt).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>

            {onChainReport && (
              <>
                <div className="border-t border-outline-variant/35 pt-4">
                  <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-wider block mb-1">MERCHANT SIGNER</span>
                  <p className="text-foreground font-mono text-[11px] break-all select-all">{onChainReport.merchant}</p>
                </div>

                <div className="border-t border-outline-variant/35 pt-4">
                  <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-wider block mb-1">RECEIPT HASH (ON-CHAIN)</span>
                  <p className="text-foreground font-mono text-[11px] break-all select-all">{onChainReport.receiptHash}</p>
                </div>
              </>
            )}
          </div>

          {/* Product & Purchase Details (Off-chain metadata) */}
          {dbRecord && (
            <div className="border-t border-dashed border-outline-variant/60 pt-6 space-y-4">
              <span className="font-mono text-[9px] text-primary font-bold uppercase tracking-widest block mb-2">OFF-CHAIN VERIFIED METADATA</span>
              
              <div className="bg-primary-container/5 border border-outline-variant/55 rounded-lg p-5 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-sans font-bold text-foreground text-sm">{dbRecord.productName}</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {parseFloat(dbRecord.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {dbRecord.currency}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[11px] font-mono text-foreground/75 border-t border-outline-variant/30 pt-3">
                  <div>
                    <span className="text-[9px] text-foreground/40 block uppercase">Product SKU</span>
                    <span className="font-semibold">{dbRecord.productIdentifier}</span>
                  </div>
                  {dbRecord.serialNumber && (
                    <div>
                      <span className="text-[9px] text-foreground/40 block uppercase">Serial No</span>
                      <span className="font-semibold">{dbRecord.serialNumber}</span>
                    </div>
                  )}
                  {dbRecord.sku && (
                    <div>
                      <span className="text-[9px] text-foreground/40 block uppercase">Sub-SKU</span>
                      <span className="font-semibold">{dbRecord.sku}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] text-foreground/40 block uppercase">Warranty</span>
                    <span className="font-semibold text-primary">
                      {dbRecord.warrantyUntil !== "None" 
                        ? new Date(dbRecord.warrantyUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                        : "No Warranty"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-8 flex justify-between items-center border-t border-outline-variant/35 pt-6 text-xs font-mono uppercase tracking-wider">
            {onChainReport ? (
              <a
                href={`https://testnet.monadvision.com/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline font-bold"
              >
                Monad Explorer
                <ExternalLink className="w-3.5 h-3.5 text-accent-cyan" />
              </a>
            ) : (
              <span className="text-foreground/40">EXPLORER_UNAVAILABLE</span>
            )}
            <Link
              href="/"
              className="text-foreground/60 hover:text-foreground font-bold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Portal Home
            </Link>
          </div>

        </div>

        {/* Perforated bottom effect */}
        <div className="receipt-perforation"></div>
      </div>

      {/* Trust Banner Note */}
      <div className="max-w-xl w-full mx-auto bg-primary-container/10 border border-outline-variant p-6 rounded-lg flex items-start gap-3 relative">
        <div className="registration-mark mark-tl"></div>
        <div className="registration-mark mark-tr"></div>
        <div className="registration-mark mark-bl"></div>
        <div className="registration-mark mark-br"></div>
        
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-foreground/75 leading-relaxed font-sans">
          <strong className="text-foreground font-semibold block mb-1">Blockchain Verification Notice</strong>
          An on-chain credential verifies that an authorized merchant recorded a sale transaction to this buyer's wallet at a specific date. However, the blockchain record does <strong>not</strong> independently prove current physical possession, real-world product condition, or absolute legal title. It represents an immutable digital receipt of transaction history.
        </div>
      </div>

    </div>
  );
}
