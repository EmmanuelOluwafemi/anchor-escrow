"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRefundOfferInstruction } from "@/lib/instructions";
import { fetchOffer } from "@/lib/escrow";

export function RefundOffer() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [offerId, setOfferId] = useState("");

  async function handleRefundOffer() {
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

      if (!offer.maker.equals(publicKey)) {
        throw new Error("Only the maker can refund this offer");
      }

      const instruction = await buildRefundOfferInstruction({
        maker: publicKey,
        tokenMintA: offer.tokenMintA,
        offerId: offerIdBigInt,
        useTokenExtensions: false,
      });

      const transaction = new Transaction().add(instruction);

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
      setSuccess(`Offer refunded! Signature: ${signature}`);
    } catch (err: any) {
      setError(err.message || "Failed to refund offer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refund Offer</CardTitle>
        <CardDescription>
          Refund your escrow offer and get your tokens back
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
          onClick={handleRefundOffer}
          disabled={loading || !publicKey}
          className="w-full"
          variant="destructive"
        >
          {loading ? "Refunding..." : "Refund Offer"}
        </Button>
      </CardContent>
    </Card>
  );
}
