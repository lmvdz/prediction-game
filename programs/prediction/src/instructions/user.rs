use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

use crate::state::Vault;
use crate::state::Game;
use crate::state::Round;
use crate::state::UpOrDown;
use crate::state::User;
use crate::state::UserPrediction;
use crate::state::UserPredictions;
use crate::errors::ErrorCode;

pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
    let user = &mut ctx.accounts.user;
    let user_pubkey = user.key();
    user.init(
        user_pubkey, 
        ctx.accounts.user_predictions.key(), 
        ctx.accounts.owner.key(), 
        ctx.accounts.token_account.key(), 
        ctx.accounts.token_account_authority.key()
    )
}

pub fn init_user_prediction(ctx: Context<InitUserPrediction>, up_or_down: UpOrDown, amount: u64) -> Result<()> {
    // check if user already made a prediction
    require_eq!(amount, ctx.accounts.user_prediction.amount, ErrorCode::UserAccountAmountNotZero);
    // update the user's prediction amount
    ctx.accounts.user_prediction.amount = amount;
    ctx.accounts.user_prediction.up_or_down = Some(up_or_down);

    // will this work?
    let first_none_index = ctx.accounts.user_predictions.predictions.iter().position(|p| p.is_none()).unwrap();
    ctx.accounts.user_predictions.predictions.as_mut()[first_none_index] = Some(**ctx.accounts.user_prediction);

    ctx.accounts.vault.deposit(&ctx.accounts.from_token_account, &ctx.accounts.to_token_account, &ctx.accounts.from_token_account_authority, &ctx.accounts.token_program, amount)
}

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), b"user"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<User>() + 8
    )]
    pub user: Box<Account<'info, User>>, 

    #[account(
        init,
        seeds = [owner.key().as_ref(), b"user_predictions"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<UserPredictions>() + 8
    )]
    pub user_predictions: Box<Account<'info, UserPredictions>>,

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        init, 
        seeds = [owner.key().as_ref(), b"token_account"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = token_account_authority
    )]
    pub token_account:  Box<Account<'info, TokenAccount>>,
    /// CHECK: checked in `init_game`
    pub token_account_authority: AccountInfo<'info>,


    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct InitUserPrediction<'info> {
    #[account(mut)]
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
        init,
        seeds = [signer.key().as_ref(), game.key().as_ref(), b"user_prediction"], 
        bump, 
        payer = signer,
        space = std::mem::size_of::<UserPrediction>() + 8
    )]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(mut)]
    pub user_predictions: Box<Account<'info, UserPredictions>>,

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