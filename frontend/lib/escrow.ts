import { Connection, Transaction, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getAccount,
} from "@solana/spl-token";
import {
  ESCROW_PROGRAM_ID,
  getOfferPDA,
  getVaultAddress,
  getTokenAccountAddress,
  STANDARD_PROGRAMS,
} from "./solana";

export interface OfferData {
  id: bigint;
  maker: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  tokenBWantedAmount: bigint;
  bump: number;
}

export interface MakeOfferParams {
  maker: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  offerId: bigint;
  tokenAOfferedAmount: bigint;
  tokenBWantedAmount: bigint;
  useTokenExtensions?: boolean;
}

export interface TakeOfferParams {
  taker: PublicKey;
  maker: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  offerId: bigint;
  useTokenExtensions?: boolean;
}

export interface RefundOfferParams {
  maker: PublicKey;
  tokenMintA: PublicKey;
  offerId: bigint;
  useTokenExtensions?: boolean;
}

export async function deriveMakeOfferAccounts(params: MakeOfferParams) {
  const { maker, tokenMintA, tokenMintB, offerId, useTokenExtensions = false } = params;

  const [offer, offerBump] = getOfferPDA(offerId);
  const makerTokenAccountA = await getTokenAccountAddress(maker, tokenMintA, useTokenExtensions);
  const vault = await getVaultAddress(offer, tokenMintA, useTokenExtensions);

  return {
    associatedTokenProgram: STANDARD_PROGRAMS.associatedTokenProgram,
    tokenProgram: useTokenExtensions
      ? STANDARD_PROGRAMS.token2022Program
      : STANDARD_PROGRAMS.tokenProgram,
    systemProgram: STANDARD_PROGRAMS.systemProgram,
    maker,
    tokenMintA,
    tokenMintB,
    makerTokenAccountA,
    offer,
    vault,
    offerBump,
  };
}

export async function deriveTakeOfferAccounts(params: TakeOfferParams) {
  const { taker, maker, tokenMintA, tokenMintB, offerId, useTokenExtensions = false } = params;

  const [offer] = getOfferPDA(offerId);
  const vault = await getVaultAddress(offer, tokenMintA, useTokenExtensions);
  const takerTokenAccountA = await getTokenAccountAddress(taker, tokenMintA, useTokenExtensions);
  const takerTokenAccountB = await getTokenAccountAddress(taker, tokenMintB, useTokenExtensions);
  const makerTokenAccountB = await getTokenAccountAddress(maker, tokenMintB, useTokenExtensions);

  return {
    associatedTokenProgram: STANDARD_PROGRAMS.associatedTokenProgram,
    tokenProgram: useTokenExtensions
      ? STANDARD_PROGRAMS.token2022Program
      : STANDARD_PROGRAMS.tokenProgram,
    systemProgram: STANDARD_PROGRAMS.systemProgram,
    taker,
    maker,
    tokenMintA,
    tokenMintB,
    takerTokenAccountA,
    takerTokenAccountB,
    makerTokenAccountB,
    offer,
    vault,
  };
}

export async function deriveRefundOfferAccounts(params: RefundOfferParams) {
  const { maker, tokenMintA, offerId, useTokenExtensions = false } = params;

  const [offer] = getOfferPDA(offerId);
  const vault = await getVaultAddress(offer, tokenMintA, useTokenExtensions);
  const makerTokenAccountA = await getTokenAccountAddress(maker, tokenMintA, useTokenExtensions);

  return {
    tokenProgram: useTokenExtensions
      ? STANDARD_PROGRAMS.token2022Program
      : STANDARD_PROGRAMS.tokenProgram,
    systemProgram: STANDARD_PROGRAMS.systemProgram,
    maker,
    tokenMintA,
    makerTokenAccountA,
    offer,
    vault,
  };
}

export async function fetchOffer(
  connection: Connection,
  offerId: bigint
): Promise<OfferData | null> {
  try {
    const [offerPDA] = getOfferPDA(offerId);
    const accountInfo = await connection.getAccountInfo(offerPDA);
    
    if (!accountInfo) {
      return null;
    }

    const data = accountInfo.data;
    
    const discriminator = data.slice(0, 8);
    const id = data.readBigUInt64LE(8);
    const maker = new PublicKey(data.slice(16, 48));
    const tokenMintA = new PublicKey(data.slice(48, 80));
    const tokenMintB = new PublicKey(data.slice(80, 112));
    const tokenBWantedAmount = data.readBigUInt64LE(112);
    const bump = data[120];

    return {
      id,
      maker,
      tokenMintA,
      tokenMintB,
      tokenBWantedAmount,
      bump,
    };
  } catch (error) {
    console.error("Error fetching offer:", error);
    return null;
  }
}

export async function fetchAllOffers(connection: Connection): Promise<OfferData[]> {
  const accounts = await connection.getProgramAccounts(ESCROW_PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: [215, 88, 60, 71, 170, 162, 73, 229], // OFFER_DISCRIMINATOR
        },
      },
    ],
  });

  return accounts
    .map((account) => {
      try {
        const data = account.account.data;
        const id = data.readBigUInt64LE(8);
        const maker = new PublicKey(data.slice(16, 48));
        const tokenMintA = new PublicKey(data.slice(48, 80));
        const tokenMintB = new PublicKey(data.slice(80, 112));
        const tokenBWantedAmount = data.readBigUInt64LE(112);
        const bump = data[120];

        return {
          id,
          maker,
          tokenMintA,
          tokenMintB,
          tokenBWantedAmount,
          bump,
        };
      } catch (error) {
        console.error("Error parsing offer:", error);
        return null;
      }
    })
    .filter((offer): offer is OfferData => offer !== null);
}

export async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey,
  useTokenExtensions: boolean = false
): Promise<bigint> {
  try {
    const account = await getAccount(
      connection,
      tokenAccount,
      "confirmed",
      useTokenExtensions ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
    );
    return BigInt(account.amount.toString());
  } catch (error) {
    return 0n;
  }
}

export async function getMintDecimals(
  connection: Connection,
  mint: PublicKey,
  useTokenExtensions: boolean = false
): Promise<number> {
  const mintInfo = await getMint(
    connection,
    mint,
    "confirmed",
    useTokenExtensions ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
  );
  return mintInfo.decimals;
}
