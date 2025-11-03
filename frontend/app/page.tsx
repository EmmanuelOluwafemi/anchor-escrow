"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MakeOffer } from "@/components/make-offer";
import { ViewOffers } from "@/components/view-offers";
import { TakeOffer } from "@/components/take-offer";
import { RefundOffer } from "@/components/refund-offer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Escrow Program
            </h1>
            <p className="text-muted-foreground mt-2">
              Test frontend for Solana Escrow Program
            </p>
          </div>
          <WalletMultiButton />
        </header>

        <Tabs defaultValue="offers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="offers">View Offers</TabsTrigger>
            <TabsTrigger value="make">Make Offer</TabsTrigger>
            <TabsTrigger value="take">Take Offer</TabsTrigger>
            <TabsTrigger value="refund">Refund</TabsTrigger>
          </TabsList>

          <TabsContent value="offers">
            <ViewOffers />
          </TabsContent>

          <TabsContent value="make">
            <MakeOffer />
          </TabsContent>

          <TabsContent value="take">
            <TakeOffer />
          </TabsContent>

          <TabsContent value="refund">
            <RefundOffer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
