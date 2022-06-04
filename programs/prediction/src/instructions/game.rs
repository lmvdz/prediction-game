use anchor_lang::prelude::*;


use crate::state::game::Game;
use crate::state::round::Round;
use crate::errors::ErrorCode;

// initialize game
pub fn init_game(ctx: Context<InitializeGame>) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let game_pubkey = game.key();
    game.init(&ctx.accounts.owner, game_pubkey, &mut ctx.accounts.first_round, &ctx.accounts.price_program, &ctx.accounts.price_feed, &ctx.accounts.clock)
}

pub fn next_round(ctx: Context<NextRound>) -> Result<()> {
    let current_round = &mut ctx.accounts.current_round;
    let next_round = &mut ctx.accounts.next_round;
    require_eq!(current_round.round_number.checked_add(1).unwrap_or(0), next_round.round_number, ErrorCode::NextComputedRoundNumberError);
    require!(current_round.finish().is_ok(), ErrorCode::FailedToFinishRound);
    next_round.init(&ctx.accounts.price_program, &ctx.accounts.price_feed, &ctx.accounts.clock)
}


#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), b"game"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Game>() + 8
    )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), game.key().as_ref(), &(0_i128).to_le_bytes(), b"round"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub first_round: Box<Account<'info, Round>>,


    /// CHECK: checked in `init_game`
    pub price_program: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub price_feed: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub clock: AccountInfo<'info>,


    // required for Account
    pub system_program: Program<'info, System>,
}



#[derive(Accounts)]
pub struct NextRound<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), b"game"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Game>() + 8
    )]
    pub game: Box<Account<'info, Game>>,



    #[account(mut)]
    pub current_round: Box<Account<'info, Round>>,


    #[account(
        init,
        constraint = next_round.game.key().eq(&current_round.game.key()),
        seeds = [owner.key().as_ref(), game.key().as_ref(), &(game.round_number.checked_add(1).unwrap_or(0)).to_le_bytes(), b"round"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub next_round: Box<Account<'info, Round>>,


    /// CHECK: checked in `init_game`
    pub price_program: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub price_feed: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub clock: AccountInfo<'info>,


    // required for Account
    pub system_program: Program<'info, System>,
}