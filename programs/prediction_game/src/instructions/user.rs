use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

use crate::state::Vault;
use crate::state::Game;
use crate::state::Round;
use crate::state::User;
use crate::state::UserPrediction;
// use crate::state::UserPredictions;
use crate::errors::ErrorCode;
use crate::utils::util::close_token_account;

pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
    
    let user = &mut ctx.accounts.user;
    let user_pubkey = user.key();
    user.init(
        user_pubkey, 
        ctx.accounts.owner.key(), 
        ctx.accounts.token_account.key(), 
        ctx.accounts.owner.key()
    )

}

pub fn init_user_prediction(ctx: Context<InitUserPrediction>, up_or_down: u8, amount: u64) -> Result<()> {
    let round = &mut ctx.accounts.round;

    // round can't be over
    require!(!(round.finished), ErrorCode::RoundAlreadyFinished);

    require!(!(round.settled), ErrorCode::RoundAlreadySettled);

    let user_prediction = &mut ctx.accounts.user_prediction;

    user_prediction.owner = ctx.accounts.signer.key();
    user_prediction.address = user_prediction.key();
    user_prediction.user = ctx.accounts.user.key();
    user_prediction.game = ctx.accounts.game.key();
    user_prediction.up_or_down = up_or_down;
    user_prediction.amount = amount;
    user_prediction.settled = false;
    
    

    // deposit the amount from the user_prediction
    require!(
        ctx.accounts.vault.deposit(
            &ctx.accounts.from_token_account, 
            &ctx.accounts.to_token_account, 
            &ctx.accounts.signer, 
            &ctx.accounts.token_program, 
            user_prediction.amount
        ).is_ok(), 
        ErrorCode::UserPredictionFailedToDeposit
    );

    if user_prediction.up_or_down != 0 {
        if user_prediction.up_or_down == 1 {
            round.total_up_amount = round.total_up_amount.checked_add(user_prediction.amount).unwrap();
        } else if user_prediction.up_or_down == 2 {
            round.total_down_amount = round.total_down_amount.checked_add(user_prediction.amount).unwrap();
        }
    }

    Ok(())
}

pub fn transfer_user_token_account(ctx: Context<UserTransfer>, amount: u64) -> Result<()> {

    ctx.accounts.user.transfer(
        ctx.accounts.from_token_account.to_account_info(), 
        ctx.accounts.to_token_account.to_account_info(), 
        ctx.accounts.from_token_account_authority.clone(), 
        ctx.accounts.token_program.to_account_info(), 
        amount
    )

}

pub fn close_user_token_account(ctx: Context<CloseUserTokenAccount>) -> Result<()> {
    close_token_account(
        ctx.accounts.user_token_account.to_account_info().clone(), 
        ctx.accounts.receiving_token_account.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    )
}


#[derive(Accounts)]
pub struct CloseUserAccount<'info> {

    #[account()]
    pub signer: Signer<'info>,

    #[account(mut, 
        close = receiver,
        constraint = signer.key() == user.owner @ ErrorCode::SignerNotOwner
    )]
    pub user: Box<Account<'info, User>>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>

}

#[derive(Accounts)]
pub struct CloseUserTokenAccount<'info> {

    #[account()]
    pub signer: Signer<'info>,

    #[account(mut, 
        constraint = signer.key() == user_token_account.owner @ ErrorCode::SignerNotOwner
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, 
        constraint = signer.key() == user_token_account.owner @ ErrorCode::SignerNotOwner,
        constraint = receiving_token_account.mint == user_token_account.mint @ ErrorCode::TokenAccountMintMismatch
    )]
    pub receiving_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>

}


#[derive(Accounts)]
pub struct UserTransfer<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub user: Box<Account<'info, User>>,

    #[account(
        constraint = to_token_account.owner == user.owner @ErrorCode::UserOwnerNotToTokenAccountOwner,
        token::mint = token_mint.key()
    )]
    pub to_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = from_token_account.owner == from_token_account_authority.key() @ ErrorCode::FromTokenAccountAuthorityNotEqual,
        constraint = from_token_account.owner == user.owner @ ErrorCode::UserOwnerNotFromTokenAccountOwner,
        token::mint = token_mint.key()
    )]
    pub from_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK:
    pub from_token_account_authority: AccountInfo<'info>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>

}

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), b"user"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<User>() + 8
    )]
    pub user: Box<Account<'info, User>>, 

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        init, 
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), b"token_account"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = owner
    )]
    pub token_account:  Box<Account<'info, TokenAccount>>,

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
        constraint = game.key() == round.game @ ErrorCode::RoundGameKeyNotEqual,
        constraint = !round.finished @ ErrorCode::RoundAlreadyFinished
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        constraint = vault.owner == round.owner @ ErrorCode::RoundOwnerNotVaultOwner
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        constraint = user.owner == signer.key() @ ErrorCode::SignerNotOwnerOfUser
    )]
    pub user: Box<Account<'info, User>>,

    #[account(
        init,
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), signer.key().as_ref(), game.key().as_ref(), round.key().as_ref(), &round.round_number.to_le_bytes(), b"user_prediction"], 
        bump, 
        payer = signer,
        space = std::mem::size_of::<UserPrediction>() + 8,
        constraint = user_prediction.up_or_down == 1 || user_prediction.up_or_down == 2 @ ErrorCode::UserPredictionCanOnlyBeUpOrDown
    )]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    // #[account(mut)]
    // pub user_predictions: Box<Account<'info, UserPredictions>>,

    #[account(
        constraint = vault.owner == to_token_account.owner @ ErrorCode::VaultOwnerNotToTokenAccountOwner,
        constraint = (vault.up_token_account_pubkey == to_token_account.key() || vault.down_token_account_pubkey == to_token_account.key()) @ ErrorCode::ToTokenAccountNotPartOfVault,
        token::mint = token_mint.key()
    )]
    pub to_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = signer.key() == from_token_account.owner @ ErrorCode::SignerNotOwnerOfFromTokenAccount,
        token::mint = token_mint.key()
    )]
    pub from_token_account: Box<Account<'info, TokenAccount>>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseUserPrediction<'info> { 
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account()]
    pub game: Box<Account<'info, Game>>,

    #[account(
        constraint = game.key() == round.game @ ErrorCode::RoundGameKeyNotEqual,
        constraint = round.finished @ ErrorCode::RoundNotFinished
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        constraint = vault.owner == round.owner @ ErrorCode::RoundOwnerNotVaultOwner
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        constraint = user.owner == signer.key() @ ErrorCode::SignerNotOwnerOfUser
    )]
    pub user: Box<Account<'info, User>>,

    #[account(mut, close = user_prediction_close_receiver)]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(mut)]
    pub user_prediction_close_receiver: SystemAccount<'info>
}