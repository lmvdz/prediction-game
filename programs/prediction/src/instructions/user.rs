use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

use crate::state::Vault;
use crate::state::Game;
use crate::state::Round;
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

pub fn init_user_prediction(ctx: Context<InitUserPrediction>, up_or_down: i8, amount: u64) -> Result<()> {
    let round = &mut ctx.accounts.round;

    // update the round
    require!(round.update(&ctx.accounts.price_program, &ctx.accounts.price_feed).is_ok(), ErrorCode::FailedToUpdateRound);

    // round can't be over
    require!(!(round.finished.unwrap_or(false)), ErrorCode::UserPredictionDeniedRoundFinished);

    let user_prediction = &mut ctx.accounts.user_prediction;

    // check to make sure the user_prediction amount is zero
    require_eq!(amount, user_prediction.amount.unwrap_or(0), ErrorCode::UserPredictionAmountNotZero);

    let user_prediction_pubkey = user_prediction.key(); 

    // the user_prediction account should be initialized, but the data needs to be initialized
    require!(user_prediction.init(&user_prediction_pubkey, &ctx.accounts.user.key(), &ctx.accounts.signer.key(), &ctx.accounts.game.key(), amount, up_or_down).is_ok(), ErrorCode::FailedToInitUserPrediction);
    

    // push the user_prediction to the user_predictions array
    require!(round.push(user_prediction).is_ok(), ErrorCode::FailedToAppendUserPrediction);


    // push the user_prediction to the user_predictions array
    require!(ctx.accounts.user_predictions.push(user_prediction, round).is_ok(), ErrorCode::FailedToAppendUserPrediction);

    
    // deposit the amount from the user_prediction
    require!(ctx.accounts.vault.deposit(&ctx.accounts.from_token_account, &ctx.accounts.to_token_account, &ctx.accounts.from_token_account_authority, &ctx.accounts.token_program, amount).is_ok(), ErrorCode::UserPredictionFailedToDeposit);

    Ok(())
}

pub fn settle_and_or_close_user_prediction(ctx: Context<SettleAndOrCloseUserPrediction>) -> Result<()> {

    let round = &mut ctx.accounts.round;

    // update the round
    require!(round.update(&ctx.accounts.price_program, &ctx.accounts.price_feed).is_ok(), ErrorCode::FailedToUpdateRound);

    // round has to be over
    require!((round.finished.unwrap_or(false)), ErrorCode::RoundNotFinished);

    let user_prediction = &mut ctx.accounts.user_prediction;
    let user_predictions = &mut ctx.accounts.user_predictions;
    if user_prediction.settled.unwrap_or(false) {
        require!(user_prediction.settle(round).is_ok(), ErrorCode::FailedToSettleUserPrediction)
    }

    // push the user_prediction to the user_predictions array
    require!(round.pop(user_prediction).is_ok(), ErrorCode::FailedToPopUserPrediction);


    // push the user_prediction to the user_predictions array
    require!(user_predictions.pop(user_prediction, round).is_ok(), ErrorCode::FailedToPopUserPrediction);

    



    Ok(())
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
        constraint = game.key().eq(&round.game)
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        constraint = vault.owner == round.owner
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
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

    /// CHECK: checked in `init_user_prediction`
    pub price_program: AccountInfo<'info>,

    /// CHECK: checked in `init_user_prediction`
    pub price_feed: AccountInfo<'info>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleAndOrCloseUserPrediction<'info> { 
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account()]
    pub game: Box<Account<'info, Game>>,

    #[account(
        constraint = game.key().eq(&round.game) && round.finished.unwrap_or(false)
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        constraint = vault.owner == round.owner
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        constraint = user.owner.eq(&signer.key())
    )]
    pub user: Box<Account<'info, User>>,

    #[account(mut)]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(mut)]
    pub user_predictions: Box<Account<'info, UserPredictions>>,

    #[account(
        constraint = user_prediction.owner == to_token_account.owner,
        token::mint = token_mint.key()
    )]
    pub to_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = vault.owner == from_token_account.owner,
        token::mint = token_mint.key()
    )]
    pub from_token_account: Box<Account<'info, TokenAccount>>,

    #[account()]
    pub from_token_account_authority: AccountInfo<'info>,

    /// CHECK: checked in `init_user_prediction`
    pub price_program: AccountInfo<'info>,

    /// CHECK: checked in `init_user_prediction`
    pub price_feed: AccountInfo<'info>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}