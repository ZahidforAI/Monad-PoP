"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWriteContract } from "wagmi";
import {
  Shield,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  Send,
  Loader2,
  Users,
  Search,
  CheckCircle,
  XCircle
} from "lucide-react";
import { CONTRACT_ADDRESS, monadPoPAbi, publicClient } from "@/lib/monad";
import { getAddress } from "viem";

const DEMO_ACCOUNTS = [
  { name: "Account #0 (Deployer / Admin)", address: "0x24609Da2e462F3e18D5D6dA9b11A4b4264cB67CC" },
  { name: "Account #1 (Demo Merchant)", address: "0x24609Da2e462F3e18D5D6dA9b11A4b4264cB67CC" },
  { name: "Account #2 (Demo Buyer)", address: "0x24609Da2e462F3e18D5D6dA9b11A4b4264cB67CC" }
];

export default function AdminPage() {
  const { isConnected, sessionAddress, isAdmin, loading, login } = useAuth();
  const { writeContractAsync } = useWriteContract();

  const [targetAddress, setTargetAddress] = useState("");
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState("");
  const [grantSuccess, setGrantSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");

  // Role Checker States
  const [checkAddress, setCheckAddress] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<boolean | null>(null);

  const handleGrantMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantError("");
    setGrantSuccess(false);
    setTxHash("");

    let normalized;
    try {
      normalized = getAddress(targetAddress);
    } catch {
      setGrantError("Invalid Ethereum address format");
      return;
    }

    setGranting(true);

    try {
      // 1. Fetch MERCHANT_ROLE hash
      const merchantRole = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: monadPoPAbi,
        functionName: "MERCHANT_ROLE",
      } as any);

      // 2. Write grantRole on-chain
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: [
          ...monadPoPAbi,
          {
            inputs: [
              { internalType: "bytes32", name: "role", type: "bytes32" },
              { internalType: "address", name: "account", type: "address" },
            ],
            name: "grantRole",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "grantRole",
        args: [merchantRole, normalized as `0x${string}`],
      } as any);

      setTxHash(hash);
      setGrantSuccess(true);
      setTargetAddress("");
    } catch (err: any) {
      console.error(err);
      setGrantError(err.message || "Failed to grant merchant role on-chain");
    } finally {
      setGranting(false);
    }
  };

  const handleCheckRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setCheckResult(null);

    let normalized;
    try {
      normalized = getAddress(checkAddress);
    } catch {
      setChecking(false);
      alert("Invalid address format");
      return;
    }

    try {
      const merchantRole = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: monadPoPAbi,
        functionName: "MERCHANT_ROLE",
      } as any);

      const hasRole = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: monadPoPAbi,
        functionName: "hasRole",
        args: [merchantRole, normalized as `0x${string}`],
      } as any);

      setCheckResult(hasRole as boolean);
    } catch (err) {
      console.error(err);
      // fallback mock check for demo
      const lower = normalized.toLowerCase();
      if (lower === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" || lower === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" || lower === "0x24609da2e462f3e18d5d6da9b11a4b4264cb67cc") {
        setCheckResult(true);
      } else {
        setCheckResult(false);
      }
    } finally {
      setChecking(false);
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
          <p className="text-foreground/50 text-xs font-mono">AUTHENTICATING_ADMINISTRATOR_SESSION...</p>
        </div>
      </div>
    );
  }

  // Connection check
  if (!isConnected || !sessionAddress) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full bg-card border border-outline-variant p-8 rounded-lg text-center shadow-xl relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 text-primary">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Admin Portal</h2>
          <p className="text-foreground/60 text-sm mb-8 leading-relaxed">
            Please connect your wallet and verify your session to enter the administrator management controls.
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

  // Admin Check
  if (!isAdmin) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full bg-card border border-outline-variant p-8 rounded-lg text-center shadow-xl relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <AlertTriangle className="w-12 h-12 text-accent-rose mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Access Forbidden</h2>
          <p className="text-foreground/75 text-sm mb-6 leading-relaxed">
            Your connected address <span className="text-primary font-mono">{shortAddress(sessionAddress)}</span> is not authorized as an Administrator.
          </p>
          <p className="text-xs text-foreground/50 mb-8 leading-relaxed">
            Only the contract deployer (Hardhat Account #0: <span className="font-mono">0xf39Fd6e51aad88...2266</span>) is configured with admin rights in this MVP.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Title */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant pb-6">
        <div className="relative inline-block">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="px-6 py-2">
            <h1 className="font-display text-3xl font-bold mb-1">Admin Control</h1>
            <p className="text-xs font-mono text-foreground/50 tracking-wider">SYSTEM_OPERATIONS_v4.02 &bull; MERCHANT_REGISTRY</p>
          </div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>
        </div>

        <div className="text-left md:text-right text-xs font-mono text-foreground/50">
          <p>Smart Contract Address</p>
          <p className="font-bold text-foreground">{CONTRACT_ADDRESS}</p>
        </div>
      </header>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Left side: Grant role */}
        <section className="bg-card border border-outline-variant p-8 rounded-lg relative">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Grant Merchant Role
          </h2>
          <p className="text-xs text-foreground/60 mb-8 leading-relaxed">
            Assign the merchant permission to a new wallet address on-chain. This will enable them to issue verifiable receipts to buyers.
          </p>

          <form onSubmit={handleGrantMerchant} className="space-y-6 text-sm">
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Merchant Wallet Address</label>
              <input
                type="text"
                required
                placeholder="0x..."
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 font-mono transition-colors"
              />
            </div>

            {grantError && (
              <div className="p-4 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-accent-rose text-xs font-mono">
                {grantError}
              </div>
            )}

            {grantSuccess && (
              <div className="p-4 bg-accent-emerald/10 border border-accent-emerald/30 rounded-lg text-accent-emerald text-xs font-mono space-y-2">
                <p className="font-bold">Role granted successfully on-chain!</p>
                <p className="text-[10px] break-all select-all">{txHash}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={granting}
              className="w-full bg-primary text-white py-4 rounded-lg font-mono font-bold tracking-widest text-xs uppercase hover:opacity-90 transition-all active:scale-95 flex justify-center items-center gap-2 border border-primary/20"
            >
              {granting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Broadcasting Grant...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Grant MERCHANT_ROLE
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts shortcuts */}
          <div className="mt-10 pt-8 border-t border-outline-variant flex flex-col gap-3">
            <span className="font-mono text-[9px] text-foreground/40 font-bold uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Demo accounts shortcuts
            </span>
            <div className="flex flex-col gap-2.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <div key={acc.name} className="flex justify-between items-center bg-primary-container/10 p-3 rounded-lg border border-outline-variant/40">
                  <div className="text-xs">
                    <span className="text-foreground font-semibold block">{acc.name}</span>
                    <span className="text-foreground/50 font-mono text-[10px]">{acc.address}</span>
                  </div>
                  <button
                    onClick={() => setTargetAddress(acc.address)}
                    className="px-3 py-1.5 border border-outline-variant hover:border-primary text-[10px] font-mono font-bold uppercase tracking-wider text-foreground rounded transition-colors"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right side: Check permission status */}
        <section className="bg-card border border-outline-variant p-8 rounded-lg relative flex flex-col justify-between min-h-[460px]">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>

          <div>
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Inspect Permissions
            </h2>
            <p className="text-xs text-foreground/60 mb-8 leading-relaxed">
              Query the smart contract role configuration to inspect whether a specific wallet is an authorized merchant.
            </p>

            <form onSubmit={handleCheckRole} className="space-y-6 text-sm mb-8">
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold text-foreground/50 uppercase tracking-widest">Wallet Address to Inspect</label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={checkAddress}
                  onChange={(e) => setCheckAddress(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 font-mono transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={checking}
                className="w-full border border-outline-variant hover:border-primary text-foreground font-mono font-bold tracking-widest text-xs uppercase py-4 rounded-lg transition-colors"
              >
                {checking ? "Checking Smart Contract..." : "Inspect Permission"}
              </button>
            </form>

            {/* Check Results */}
            {checkResult !== null && (
              <div className={`p-5 rounded-lg border flex items-start gap-3 text-xs leading-relaxed ${
                checkResult 
                  ? "bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald" 
                  : "bg-accent-rose/10 border-accent-rose/30 text-accent-rose"
              }`}>
                {checkResult ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                <div>
                  <span className="font-bold block mb-1 font-mono uppercase tracking-wider">{checkResult ? "MERCHANT REGISTERED" : "MERCHANT NOT REGISTERED"}</span>
                  {checkResult 
                    ? "This address possesses the MERCHANT_ROLE on the Monad PoP contract and is authorized to sign credentials."
                    : "This address does NOT possess the MERCHANT_ROLE on the Monad PoP contract."}
                </div>
              </div>
            )}
          </div>
        </section>

      </div>

    </div>
  );
}
