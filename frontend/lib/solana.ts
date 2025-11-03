import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

export const ESCROW_PROGRAM_ID = new PublicKey("6zSSLr3UjdtLcLXRrCSvJAvRHdFbbMnkBjxagfttFR2r");

export const STANDARD_PROGRAMS = {
  systemProgram: new PublicKey("11111111111111111111111111111111"),
  tokenProgram: TOKEN_PROGRAM_ID,
  token2022Program: TOKEN_2022_PROGRAM_ID,
  associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
};

export function getOfferPDA(offerId: bigint): [PublicKey, number] {
  const offerIdBuffer = Buffer.alloc(8);
  offerIdBuffer.writeBigUInt64LE(offerId, 0);

  const [offerPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("offer"), offerIdBuffer],
    ESCROW_PROGRAM_ID
  );

  return [offerPDA, bump];
}

export async function getVaultAddress(
  offerPDA: PublicKey,
  tokenMintA: PublicKey,
  useTokenExtensions: boolean = false
): Promise<PublicKey> {
  const tokenProgram = useTokenExtensions ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  return getAssociatedTokenAddress(
    tokenMintA,
    offerPDA,
    true, // allowOwnerOffCurve - MUST be true for PDAs
    tokenProgram
  );
}

export async function getTokenAccountAddress(
  owner: PublicKey,
  mint: PublicKey,
  useTokenExtensions: boolean = false
): Promise<PublicKey> {
  const tokenProgram = useTokenExtensions ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  return getAssociatedTokenAddress(mint, owner, false, tokenProgram);
}

export function formatTokenAmount(amount: bigint, decimals: number = 9): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fractional = amount % divisor;
  
  if (fractional === 0n) {
    return whole.toString();
  }
  
  const fractionalStr = fractional.toString().padStart(decimals, "0");
  const trimmedFractional = fractionalStr.replace(/0+$/, "");
  
  return `${whole}.${trimmedFractional}`;
}

export function parseTokenAmount(amount: string, decimals: number = 9): bigint {
  const [whole, fractional = ""] = amount.split(".");
  const wholePart = BigInt(whole || "0");
  const fractionalPart = BigInt((fractional || "").padEnd(decimals, "0").slice(0, decimals));
  const divisor = BigInt(10 ** decimals);
  
  return wholePart * divisor + fractionalPart;
}
