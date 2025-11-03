use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Offer {
    // The ID of the offer
    pub id: u64,
    // The maker of the offer
    pub maker: Pubkey,
    // The token mint of the token that the maker is offering
    pub token_mint_a: Pubkey,
    // The token mint of the token that the maker is wanting
    pub token_mint_b: Pubkey,
    // The amount of the token that the maker is wanting
    pub token_b_wanted_amount: u64,
    // The bump of the offer account
    pub bump: u8,
}
