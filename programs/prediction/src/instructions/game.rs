use anchor_lang::prelude::*;



use crate::state::Vault;
use crate::state::Game;
use crate::state::Round;
use crate::errors::ErrorCode;

// initialize game
pub fn init_game(ctx: Context<InitializeGame>) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let owner = &ctx.accounts.owner;
    let round = &mut ctx.accounts.round;
    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;
    let game_pubkey = game.key();
    
    game.init(owner, game_pubkey, round, price_program, price_feed)
}

// crank
pub fn update_game(ctx: Context<UpdateGame>) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let round = &mut ctx.accounts.round;
    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;

    game.update(price_program, price_feed, round)
}


#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), game.key().as_ref(), b"game"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Game>() + 8
    )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), game.key().as_ref(), b"round"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub round: Box<Account<'info, Round>>,

    #[account()]
    pub vault: Box<Account<'info, Vault>>,

    /// CHECK: checked in `init_game`
    pub price_program: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub price_feed: AccountInfo<'info>,

    // required for Account
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct UpdateGame<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub game: Box<Account<'info, Game>>,

    #[account(mut)]
    pub round: Box<Account<'info, Round>>,

    /// CHECK: checked in `init_game`
    pub price_program: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub price_feed: AccountInfo<'info>,


    // required for Account
    pub system_program: Program<'info, System>,
}


