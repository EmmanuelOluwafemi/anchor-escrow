"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMakeOfferInstruction } from "@/lib/instructions";
import { parseTokenAmount, formatTokenAmount, getTokenAccountAddress } from "@/lib/solana";
import { getTokenBalance, getMintDecimals } from "@/lib/escrow";

export function MakeOffer() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [tokenMintA, setTokenMintA] = useState("");
  const [tokenMintB, setTokenMintB] = useState("");
  const [offerId, setOfferId] = useState("");
  const [tokenAAmount, setTokenAAmount] = useState("");
  const [tokenBAmount, setTokenBAmount] = useState("");
  const [decimalsA, setDecimalsA] = useState(9);
  const [decimalsB, setDecimalsB] = useState(9);
  const [balanceA, setBalanceA] = useState<bigint>(0n);

  async function handleMakeOffer() {
    if (!publicKey) {
      setError("Please connect your wallet");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tokenMintAPubkey = new PublicKey(tokenMintA);
      const tokenMintBPubkey = new PublicKey(tokenMintB);
      const offerIdBigInt = BigInt(offerId);
      const tokenAOfferedAmount = parseTokenAmount(tokenAAmount, decimalsA);
      const tokenBWantedAmount = parseTokenAmount(tokenBAmount, decimalsB);

      if (tokenMintAPubkey.equals(tokenMintBPubkey)) {
        throw new Error("Token mints must be different");
      }

      if (tokenAOfferedAmount <= 0n || tokenBWantedAmount <= 0n) {
        throw new Error("Amounts must be greater than zero");
      }

      // Get the maker's token account address
      const makerTokenAccountA = await getTokenAccountAddress(publicKey, tokenMintAPubkey, false);

      // Check if the ATA exists, if not, create it
      const transaction = new Transaction();

      try {
        const account = await getAccount(connection, makerTokenAccountA, "confirmed", TOKEN_PROGRAM_ID);

        // Check if user has enough tokens
        const balance = BigInt(account.amount.toString());
        if (balance < tokenAOfferedAmount) {
          throw new Error(
            `Insufficient balance. You have ${formatTokenAmount(balance, decimalsA)} but need ${formatTokenAmount(tokenAOfferedAmount, decimalsA)}`,
          );
        }
      } catch (err: any) {
        if (err.message && err.message.includes("Insufficient balance")) {
          throw err;
        }
        // Account doesn't exist, create it
        const createATAInstruction = createAssociatedTokenAccountInstruction(
          publicKey, // payer
          makerTokenAccountA, // ata
          publicKey, // owner
          tokenMintAPubkey, // mint
          TOKEN_PROGRAM_ID,
        );
        transaction.add(createATAInstruction);
      }

      // Build and add the make offer instruction
      const makeOfferInstruction = await buildMakeOfferInstruction({
        maker: publicKey,
        tokenMintA: tokenMintAPubkey,
        tokenMintB: tokenMintBPubkey,
        offerId: offerIdBigInt,
        tokenAOfferedAmount,
        tokenBWantedAmount,
        useTokenExtensions: false,
      });

      transaction.add(makeOfferInstruction);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed",
      );

      setSuccess(`Offer created! Signature: ${signature}`);
    } catch (err: any) {
      console.error("Error creating offer:", err);
      setError(err.message || "Failed to create offer");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMintInfo(mint: string, type: "A" | "B") {
    try {
      const mintPubkey = new PublicKey(mint);
      const decimals = await getMintDecimals(connection, mintPubkey);
      if (type === "A") {
        setDecimalsA(decimals);
        if (publicKey) {
          const { getTokenAccountAddress } = await import("@/lib/solana");
          const tokenAccount = await getTokenAccountAddress(publicKey, mintPubkey);
          const balance = await getTokenBalance(connection, tokenAccount);
          setBalanceA(balance);
        }
      } else {
        setDecimalsB(decimals);
      }
    } catch (err) {
      console.error("Failed to load mint info:", err);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make Offer</CardTitle>
        <CardDescription>Create a new escrow offer to trade tokens</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tokenMintA">Token Mint A (You're Offering)</Label>
          <div className="flex gap-2">
            <Input
              id="tokenMintA"
              placeholder="Enter token mint address"
              value={tokenMintA}
              onChange={(e) => {
                setTokenMintA(e.target.value);
                if (e.target.value) handleLoadMintInfo(e.target.value, "A");
              }}
            />
            <Button type="button" variant="outline" onClick={() => handleLoadMintInfo(tokenMintA, "A")}>
              Load
            </Button>
          </div>
          {decimalsA && (
            <p className="text-xs text-muted-foreground">
              Decimals: {decimalsA} | Your Balance: {formatTokenAmount(balanceA, decimalsA)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenMintB">Token Mint B (You Want)</Label>
          <div className="flex gap-2">
            <Input
              id="tokenMintB"
              placeholder="Enter token mint address"
              value={tokenMintB}
              onChange={(e) => {
                setTokenMintB(e.target.value);
                if (e.target.value) handleLoadMintInfo(e.target.value, "B");
              }}
            />
            <Button type="button" variant="outline" onClick={() => handleLoadMintInfo(tokenMintB, "B")}>
              Load
            </Button>
          </div>
          {decimalsB && <p className="text-xs text-muted-foreground">Decimals: {decimalsB}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="offerId">Offer ID</Label>
          <Input
            id="offerId"
            type="number"
            placeholder="Enter unique offer ID"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenAAmount">Token A Amount</Label>
          <Input
            id="tokenAAmount"
            placeholder={`Enter amount (decimals: ${decimalsA})`}
            value={tokenAAmount}
            onChange={(e) => setTokenAAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenBAmount">Token B Amount (Wanted)</Label>
          <Input
            id="tokenBAmount"
            placeholder={`Enter amount (decimals: ${decimalsB})`}
            value={tokenBAmount}
            onChange={(e) => setTokenBAmount(e.target.value)}
          />
        </div>

        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {success && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">{success}</div>
        )}

        <Button onClick={handleMakeOffer} disabled={loading || !publicKey} className="w-full">
          {loading ? "Creating Offer..." : "Create Offer"}
        </Button>
      </CardContent>
    </Card>
  );
}
