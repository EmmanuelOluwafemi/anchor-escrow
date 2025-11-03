"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildTakeOfferInstruction } from "@/lib/instructions";
import { fetchOffer, getMintDecimals } from "@/lib/escrow";
import { getTokenAccountAddress, formatTokenAmount } from "@/lib/solana";

export function TakeOffer() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [offerId, setOfferId] = useState("");

  async function handleTakeOffer() {
    if (!publicKey) {
      setError("Please connect your wallet");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const offerIdBigInt = BigInt(offerId);
      const offer = await fetchOffer(connection, offerIdBigInt);

      if (!offer) {
        throw new Error("Offer not found");
      }

      // Derive all token account addresses
      const takerTokenAccountA = await getTokenAccountAddress(
        publicKey,
        offer.tokenMintA,
        false
      );
      const takerTokenAccountB = await getTokenAccountAddress(
        publicKey,
        offer.tokenMintB,
        false
      );
      const makerTokenAccountB = await getTokenAccountAddress(
        offer.maker,
        offer.tokenMintB,
        false
      );

      // Build transaction and check/create accounts that might not exist
      const transaction = new Transaction();

      // Create taker_token_account_a if it doesn't exist (for receiving token A)
      try {
        await getAccount(connection, takerTokenAccountA, "confirmed", TOKEN_PROGRAM_ID);
      } catch {
        const createTakerAInstruction = createAssociatedTokenAccountInstruction(
          publicKey, // payer
          takerTokenAccountA, // ata
          publicKey, // owner
          offer.tokenMintA, // mint
          TOKEN_PROGRAM_ID
        );
        transaction.add(createTakerAInstruction);
      }

      // Check/create taker_token_account_b (required for paying Token B)
      let takerAccountBExists = false;
      try {
        const takerAccountB = await getAccount(
          connection,
          takerTokenAccountB,
          "confirmed",
          TOKEN_PROGRAM_ID
        );
        takerAccountBExists = true;
        
        // Check balance if account exists
        const balance = BigInt(takerAccountB.amount.toString());
        const decimalsB = await getMintDecimals(connection, offer.tokenMintB);
        
        if (balance < offer.tokenBWantedAmount) {
          throw new Error(
            `Insufficient Token B balance. You have ${formatTokenAmount(balance, decimalsB)} but need ${formatTokenAmount(offer.tokenBWantedAmount, decimalsB)}. Please receive or mint more Token B tokens first.`
          );
        }
      } catch (err: any) {
        if (err.message && err.message.includes("Insufficient")) {
          throw err;
        }
        // Account doesn't exist, create it
        // Note: You still need to have Token B tokens to put in this account!
        const createTakerBInstruction = createAssociatedTokenAccountInstruction(
          publicKey, // payer
          takerTokenAccountB, // ata
          publicKey, // owner
          offer.tokenMintB, // mint
          TOKEN_PROGRAM_ID
        );
        transaction.add(createTakerBInstruction);
        
        // If account doesn't exist, warn user they need tokens
        // The account will be created, but transaction will fail if no tokens
        if (!takerAccountBExists) {
          const decimalsB = await getMintDecimals(connection, offer.tokenMintB);
          throw new Error(
            `You don't have a Token B account yet. It will be created, but you need ${formatTokenAmount(offer.tokenBWantedAmount, decimalsB)} of Token B (mint: ${offer.tokenMintB.toBase58()}) to take this offer.\n\nPlease receive or mint Token B tokens first, then try again. The account will be created automatically when you receive tokens.`
          );
        }
      }

      // Create maker_token_account_b if it doesn't exist (for maker to receive token B)
      try {
        await getAccount(connection, makerTokenAccountB, "confirmed", TOKEN_PROGRAM_ID);
      } catch {
        const createMakerBInstruction = createAssociatedTokenAccountInstruction(
          publicKey, // payer (taker pays for maker's account creation)
          makerTokenAccountB, // ata
          offer.maker, // owner (maker)
          offer.tokenMintB, // mint
          TOKEN_PROGRAM_ID
        );
        transaction.add(createMakerBInstruction);
      }

      // Build and add the take offer instruction
      const takeOfferInstruction = await buildTakeOfferInstruction({
        taker: publicKey,
        maker: offer.maker,
        tokenMintA: offer.tokenMintA,
        tokenMintB: offer.tokenMintB,
        offerId: offerIdBigInt,
        useTokenExtensions: false,
      });

      transaction.add(takeOfferInstruction);

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
        "confirmed"
      );

      setSuccess(`Offer taken! Signature: ${signature}`);
    } catch (err: any) {
      console.error("Error taking offer:", err);
      setError(err.message || "Failed to take offer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Take Offer</CardTitle>
        <CardDescription>
          Accept an existing escrow offer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="offerId">Offer ID</Label>
          <Input
            id="offerId"
            type="number"
            placeholder="Enter offer ID"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        <Button
          onClick={handleTakeOffer}
          disabled={loading || !publicKey}
          className="w-full"
        >
          {loading ? "Taking Offer..." : "Take Offer"}
        </Button>
      </CardContent>
    </Card>
  );
}
