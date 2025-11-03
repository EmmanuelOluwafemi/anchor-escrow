import { TransactionInstruction, PublicKey } from "@solana/web3.js";
import {
  ESCROW_PROGRAM_ID,
  getOfferPDA,
  getVaultAddress,
  getTokenAccountAddress,
  STANDARD_PROGRAMS,
} from "./solana";
import {
  MakeOfferParams,
  TakeOfferParams,
  RefundOfferParams,
  deriveMakeOfferAccounts,
  deriveTakeOfferAccounts,
  deriveRefundOfferAccounts,
  fetchOffer,
} from "./escrow";

// Instruction discriminators
const MAKE_OFFER_DISCRIMINATOR = Buffer.from([214, 98, 97, 35, 59, 12, 44, 178]);
const TAKE_OFFER_DISCRIMINATOR = Buffer.from([128, 156, 242, 207, 237, 192, 103, 240]);
const REFUND_OFFER_DISCRIMINATOR = Buffer.from([171, 18, 70, 32, 244, 121, 60, 75]);

function encodeU64(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value, 0);
  return buffer;
}

export async function buildMakeOfferInstruction(
  params: MakeOfferParams
): Promise<TransactionInstruction> {
  const accounts = await deriveMakeOfferAccounts(params);

  // Encode instruction data
  const data = Buffer.concat([
    MAKE_OFFER_DISCRIMINATOR,
    encodeU64(params.offerId),
    encodeU64(params.tokenAOfferedAmount),
    encodeU64(params.tokenBWantedAmount),
  ]);

  return new TransactionInstruction({
    programId: ESCROW_PROGRAM_ID,
    keys: [
      {
        pubkey: accounts.associatedTokenProgram,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.tokenProgram,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.systemProgram,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.maker,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: accounts.tokenMintA,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.tokenMintB,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.makerTokenAccountA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.offer,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.vault,
        isSigner: false,
        isWritable: true,
      },
    ],
    data,
  });
}

export async function buildTakeOfferInstruction(
  params: TakeOfferParams
): Promise<TransactionInstruction> {
  const accounts = await deriveTakeOfferAccounts(params);

  // Encode instruction data (no args for take_offer)
  const data = TAKE_OFFER_DISCRIMINATOR;

  return new TransactionInstruction({
    programId: ESCROW_PROGRAM_ID,
    keys: [
      {
        pubkey: accounts.associatedTokenProgram,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.tokenProgram,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.systemProgram,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.taker,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: accounts.maker,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.tokenMintA,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.tokenMintB,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.takerTokenAccountA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.takerTokenAccountB,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.makerTokenAccountB,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.offer,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.vault,
        isSigner: false,
        isWritable: true,
      },
    ],
    data,
  });
}

export async function buildRefundOfferInstruction(
  params: RefundOfferParams
): Promise<TransactionInstruction> {
  const accounts = await deriveRefundOfferAccounts(params);

  // Encode instruction data (no args for refund_offer)
  const data = REFUND_OFFER_DISCRIMINATOR;

  return new TransactionInstruction({
    programId: ESCROW_PROGRAM_ID,
    keys: [
      {
        pubkey: accounts.tokenProgram,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.systemProgram,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.maker,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: accounts.tokenMintA,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.makerTokenAccountA,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.offer,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.vault,
        isSigner: false,
        isWritable: true,
      },
    ],
    data,
  });
}
