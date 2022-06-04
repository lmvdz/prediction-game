use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::state::game::Game;
use crate::state::round::Round;
use crate::errors::ErrorCode;

pub fn update_round(ctx: Context<UpdateRound>) -> Result<()> {

    require_keys_eq!(ctx.accounts.price_feed.key(), ctx.accounts.round.price_feed_pubkey, ErrorCode::PriceFeedKeyMismatch);
    require_keys_eq!(*ctx.accounts.price_feed.owner, ctx.accounts.price_program.key(), ErrorCode::PriceProgramNotOwnerOfPriceFeed); // disable in localnet

    let round = &mut ctx.accounts.round;

    round.update(&ctx.accounts.price_program, &ctx.accounts.price_feed, &ctx.accounts.clock)
}

#[derive(Accounts)]
pub struct InitRound<'info> {

    #[account()]
    pub game: Box<Account<'info, Game>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), &game.round_number.to_le_bytes(), b"round"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Game>() + 8
    )]
    pub round: Box<Account<'info, Round>>,

    pub token_mint: Box<Account<'info, Mint>>,


    /// CHECK: checked in `init_game`
    pub price_program: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub price_feed: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub clock: AccountInfo<'info>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct UpdateRound<'info> {

    #[account(mut)]
    pub round: Account<'info, Round>,

    /// CHECK: checked in `update_game`
    pub price_program: AccountInfo<'info>,

    /// CHECK: checked in `update_game`
    pub price_feed: AccountInfo<'info>,

    /// CHECK: checked in `update_game`
    pub clock: AccountInfo<'info>
}