use anchor_lang::prelude::*;
use crate::{error::ErrorCode, state::Offer};
use crate::handlers::shared::{transfer_tokens, close_token_account};

use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct RefundOffer<'info> {
    // RefundOffer (in capitals) is a struct of names accounts that the
    // refund_offer() function will use.
    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub maker: Signer<'info>,

    pub token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        has_one = maker,
        has_one = token_mint_a,
        seeds = [b"offer", offer.id.to_le_bytes().as_ref()],
        bump = offer.bump,
    )]
    pub offer: Account<'info, Offer>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
}

// Handle the refund offer instruction by:
// 1. Returning the tokens from the vault to the maker's account
// 2. Closing the vault and returning the rent to the maker
pub fn refund_offer(context: Context<RefundOffer>) -> Result<()> {
    let offer_account_seeds = &[
        b"offer",
        &context.accounts.offer.id.to_le_bytes()[..],
        &[context.accounts.offer.bump],
    ];

    let signer_seeds = Some(&offer_account_seeds[..]);

    transfer_tokens(
        &context.accounts.vault,
        &context.accounts.maker_token_account_a,
        &context.accounts.vault.amount,
        &context.accounts.token_mint_a,
        &context.accounts.offer.to_account_info(),
        &context.accounts.token_program,
        signer_seeds,
    )
    .map_err(|_| ErrorCode::FailedVaultWithdrawal)?;

    close_token_account(
        &context.accounts.vault,
        &context.accounts.maker.to_account_info(),
        &context.accounts.offer.to_account_info(),
        &context.accounts.token_program,
        signer_seeds,
    )
    .map_err(|_| ErrorCode::FailedVaultClosure)?;

    Ok(())
}
