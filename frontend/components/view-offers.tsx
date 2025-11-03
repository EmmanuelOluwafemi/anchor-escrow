"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAllOffers, getTokenBalance, getMintDecimals } from "@/lib/escrow";
import { formatTokenAmount, getVaultAddress, getOfferPDA } from "@/lib/solana";
import type { OfferData } from "@/lib/escrow";

export function ViewOffers() {
  const { connection } = useConnection();
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [loading, setLoading] = useState(false);
  const [vaultBalances, setVaultBalances] = useState<Map<string, bigint>>(
    new Map()
  );

  async function loadOffers() {
    setLoading(true);
    try {
      const fetchedOffers = await fetchAllOffers(connection);
      setOffers(fetchedOffers);

      // Load vault balances
      const balances = new Map<string, bigint>();
      for (const offer of fetchedOffers) {
        try {
          const [offerPDA] = getOfferPDA(offer.id);
          const vault = await getVaultAddress(offerPDA, offer.tokenMintA);
          const balance = await getTokenBalance(connection, vault);
          balances.set(offer.id.toString(), balance);
        } catch (err) {
          console.error(`Failed to load vault balance for offer ${offer.id}:`, err);
        }
      }
      setVaultBalances(balances);
    } catch (err) {
      console.error("Failed to load offers:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOffers();
    const interval = setInterval(loadOffers, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [connection]);

  if (loading && offers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Offers</CardTitle>
          <CardDescription>View all available escrow offers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading offers...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Offers</CardTitle>
            <CardDescription>View all available escrow offers</CardDescription>
          </div>
          <Button onClick={loadOffers} variant="outline" disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <p className="text-muted-foreground">No offers found</p>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => {
              const vaultBalance = vaultBalances.get(offer.id.toString()) || 0n;
              return (
                <Card key={offer.id.toString()}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Offer ID
                        </p>
                        <p className="text-lg font-semibold">{offer.id.toString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Maker
                        </p>
                        <p className="text-sm font-mono break-all">
                          {offer.maker.toBase58()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Token A (Offered)
                        </p>
                        <p className="text-sm font-mono break-all">
                          {offer.tokenMintA.toBase58()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Vault Balance: {formatTokenAmount(vaultBalance, 9)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Token B (Wanted)
                        </p>
                        <p className="text-sm font-mono break-all">
                          {offer.tokenMintB.toBase58()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Amount: {formatTokenAmount(offer.tokenBWantedAmount, 9)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
