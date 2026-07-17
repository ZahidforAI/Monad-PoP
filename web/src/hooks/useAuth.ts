"use client";

import { useEffect, useState } from "react";
import { useAccount, useSignMessage, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { getAuthMessage } from "@/lib/auth";

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [isMerchant, setIsMerchant] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch current session from server
  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (data.address) {
        setSessionAddress(data.address);
        checkRoles(data.address);
      } else {
        setSessionAddress(null);
        setIsMerchant(false);
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Session fetch failed:", err);
      setSessionAddress(null);
    } finally {
      setLoading(false);
    }
  };

  const checkRoles = async (addr: string) => {
    // Quick role check: For hackathon presentation, let's allow:
    // Merchant: seed wallet or on-chain merchant role
    // Admin: deployer/seed admin wallet (Hardhat Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
    const normalized = addr.toLowerCase();
    
    // Check local roles (fallback/seed roles)
    const isLocalAdmin =
      normalized === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" ||
      normalized === "0x24609da2e462f3e18d5d6da9b11a4b4264cb67cc";
    // For demo purposes, we allow Account #0 (Admin) and Account #0/#1 (Merchant) to have roles.
    // The web application will also query on-chain permissions
    const isLocalMerchant =
      normalized === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" ||
      normalized === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" ||
      normalized === "0x24609da2e462f3e18d5d6da9b11a4b4264cb67cc";

    setIsAdmin(isLocalAdmin);
    setIsMerchant(isLocalMerchant);
  };

  useEffect(() => {
    fetchSession();
  }, [address]);

  const login = async () => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    // Force network switch to Monad Testnet (Chain ID 10143)
    if (chainId !== 10143) {
      try {
        await switchChain({ chainId: 10143 });
      } catch (err) {
        throw new Error("Please switch your wallet network to Monad Testnet.");
      }
    }

    setAuthenticating(true);
    try {
      // 1. Get Nonce
      const nonceRes = await fetch("/api/auth/nonce", { method: "POST" });
      const { nonce, error: nonceErr } = await nonceRes.json();
      if (nonceErr) throw new Error(nonceErr);

      // 2. Sign auth message
      const message = getAuthMessage(nonce);
      const signature = await signMessageAsync({ message, account: address });

      // 3. Verify on server
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });

      const { success, address: verifiedAddr, error: verifyErr } = await verifyRes.json();
      if (verifyErr) throw new Error(verifyErr);

      if (success) {
        setSessionAddress(verifiedAddr);
        checkRoles(verifiedAddr);
      }
    } finally {
      setAuthenticating(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      disconnect();
      setSessionAddress(null);
      setIsMerchant(false);
      setIsAdmin(false);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Check if wallet is connected on the correct network (Monad Testnet)
  const isCorrectNetwork = chainId === 10143;

  return {
    address,
    sessionAddress,
    isConnected,
    isCorrectNetwork,
    loading,
    authenticating,
    isMerchant,
    isAdmin,
    login,
    logout,
    chainId,
    switchNetwork: () => switchChain({ chainId: 10143 }),
  };
}
