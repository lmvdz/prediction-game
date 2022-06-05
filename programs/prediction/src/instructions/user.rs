use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

use crate::state::{User, UserPredictions};

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
        seeds = [owner.key().as_ref(), b"up"], 
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