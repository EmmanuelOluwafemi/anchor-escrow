# Escrow Program Frontend

A modern Next.js frontend for testing the Solana Escrow Program.

## Features

- ✅ **Make Offer**: Create new escrow offers to trade tokens
- ✅ **View Offers**: Browse all available escrow offers on-chain
- ✅ **Take Offer**: Accept an existing escrow offer
- ✅ **Refund Offer**: Refund your own offers to get tokens back
- ✅ **Wallet Integration**: Connect with Phantom, Solflare, and other Solana wallets
- ✅ **Real-time Updates**: Auto-refresh offers every 10 seconds

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A Solana wallet (Phantom, Solflare, etc.)
- Deployed escrow program (default: devnet)

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Usage

1. **Connect Your Wallet**: Click the wallet button in the top right and connect your Solana wallet
2. **View Offers**: Navigate to the "View Offers" tab to see all available escrow offers
3. **Make an Offer**:
   - Enter the token mint addresses for Token A (you're offering) and Token B (you want)
   - Enter a unique offer ID
   - Enter the amounts for both tokens
   - Click "Create Offer"
4. **Take an Offer**: Enter the offer ID and click "Take Offer"
5. **Refund an Offer**: Enter your offer ID and click "Refund Offer"

## Configuration

The program is configured for devnet by default. To change the network, edit `app/providers.tsx`:

```typescript
const network = WalletAdapterNetwork.Mainnet; // or Devnet, Testnet
```

The program ID is set in `lib/solana.ts`. Update it if you deploy to a different program ID.

## Project Structure

```
frontend/
├── app/              # Next.js app directory
│   ├── layout.tsx    # Root layout with providers
│   ├── page.tsx      # Main page with tabs
│   └── providers.tsx # Wallet and connection providers
├── components/       # React components
│   ├── ui/          # Shadcn UI components
│   ├── make-offer.tsx
│   ├── take-offer.tsx
│   ├── refund-offer.tsx
│   └── view-offers.tsx
└── lib/             # Utilities
    ├── solana.ts    # Solana utilities (PDAs, ATAs, etc.)
    ├── escrow.ts    # Escrow-specific functions
    └── instructions.ts # Instruction builders
```

## Notes

- This frontend uses the standard Token Program (not Token-2022)
- All amounts should be entered in the token's smallest unit (with decimals)
- The offer ID must be unique - if you get an "account already in use" error, try a different ID
- Make sure you have enough SOL for transaction fees and enough tokens in your wallet

## Troubleshooting

- **"Please connect your wallet"**: Make sure your wallet is connected and unlocked
- **"Account not found"**: The token account might not exist - you may need to create it first
- **"Insufficient funds"**: Check that you have enough tokens in your wallet
- **Transaction failures**: Check the Solana Explorer for detailed error messages

## License

MIT
