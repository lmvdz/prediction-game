use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, TokenAccount};


use crate::state::UpOrDown;
use crate::state::User;
use crate::state::UserPrediction;
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

pub fn predit(ctx: Context<PredictGame>, up_or_down: UpOrDown, amount: u64) -> Result<()> {
    // check if user already made a prediction
    require_eq!(amount, ctx.accounts.user_prediction.amount, ErrorCode::UserAccountAmountNotZero);
    // update the user's prediction amount
    ctx.accounts.user_prediction.amount = amount;
    ctx.accounts.user_prediction.up_or_down = Some(up_or_down);
    ctx.accounts.vault.deposit(&ctx.accounts.from_token_account, &ctx.accounts.to_token_account, &ctx.accounts.from_token_account_authority, &ctx.accounts.token_program, amount)
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


#[derive(Accounts)]
pub struct PredictGame<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account()]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut,
        constraint = game.key().eq(&round.game)
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        mut,
        constraint = vault.owner == round.owner
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = user.owner.eq(&signer.key())
    )]
    pub user: Box<Account<'info, User>>,

    #[account(
        mut,
        constraint = user_prediction.owner.eq(&signer.key())
    )]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(
        constraint = vault.owner == to_token_account.owner,
        token::mint = token_mint.key()
    )]
    pub to_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = signer.key().eq(&from_token_account.owner),
        token::mint = token_mint.key()
    )]
    pub from_token_account: Box<Account<'info, TokenAccount>>,

    #[account()]
    pub from_token_account_authority: AccountInfo<'info>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}