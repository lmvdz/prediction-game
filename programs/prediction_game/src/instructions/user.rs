use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

use crate::errors::ErrorCode;
use crate::state::Game;
use crate::state::Round;
use crate::state::User;
use crate::state::UserPrediction;
use crate::state::Vault;
use crate::utils::transfer_token_account;
use crate::utils::transfer_token_account_signed;

pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
    
    let user = &mut ctx.accounts.user;

    user.address = user.key();
    user.owner = ctx.accounts.owner.key();
    user.claimable = 0;

    Ok(())

}

pub fn init_user_prediction(ctx: Context<InitUserPrediction>, up_or_down: u8, amount: u64) -> Result<()> {
    let current_round = &mut ctx.accounts.current_round;
    let game = &mut ctx.accounts.game;
    let user = &mut ctx.accounts.user;

    require!(amount.saturating_div(10_u64.pow(game.token_decimal.into())) > 1, ErrorCode::MinimumPredictionAmountNotMet);

    require!(!(current_round.finished), ErrorCode::RoundAlreadyFinished);

    require!(!(current_round.settled), ErrorCode::RoundAlreadySettled);

    require!(up_or_down == 1 || up_or_down == 2, ErrorCode::InvalidUserPredictionDirection);

    let user_prediction = &mut ctx.accounts.user_prediction;
    let user_prediction_pubkey = user_prediction.key();
    user_prediction.owner = ctx.accounts.signer.key();
    user_prediction.address = user_prediction_pubkey;
    user_prediction.user = user.key();
    user_prediction.game = game.key();
    user_prediction.round = current_round.key();
    user_prediction.up_or_down = up_or_down;
    user_prediction.amount = amount;
    user_prediction.settled = false;


    let vault_ata = &mut ctx.accounts.vault_ata;
    let from_token_account = &mut ctx.accounts.from_token_account;
    let from_token_account_authority = &ctx.accounts.from_token_account_authority;
    let token_program = &ctx.accounts.token_program;

    if user_prediction.up_or_down == 1 {
        current_round.total_up_amount = current_round.total_up_amount.checked_add(user_prediction.amount).unwrap();
    } else if user_prediction.up_or_down == 2 {
        current_round.total_down_amount = current_round.total_down_amount.checked_add(user_prediction.amount).unwrap();
    }

    current_round.total_predictions += 1;

    // deposit or use unclaimed
    let deposit_amount = if user.claimable.gt(&user_prediction.amount) || user.claimable.eq(&user_prediction.amount) {
        
        user.claimable = user.claimable.saturating_sub(user_prediction.amount);
        0_u64

    } else if user.claimable.gt(&0_u64) {

        let user_prediction_remaining_amount = user_prediction.amount.saturating_sub(user.claimable);
        user.claimable = user.claimable.saturating_sub(user_prediction.amount);
        user_prediction_remaining_amount

    } else {
        
        user_prediction.amount

    };

    if deposit_amount.gt(&0_u64) {
        require!(transfer_token_account(from_token_account, vault_ata, from_token_account_authority, token_program, deposit_amount).is_ok(), ErrorCode::UserPredictionFailedToDeposit);
    }

    Ok(())
}

pub fn user_claim(ctx: Context<UserClaim>, amount: u64) -> Result<()> {
    let user = &mut ctx.accounts.user;
    let vault = &ctx.accounts.vault;
    let vault_ata = &mut ctx.accounts.vault_ata;
    let vault_ata_key = &vault_ata.key();
    let vault_ata_authority_nonce = vault.vault_ata_authority_nonce;
    let vault_ata_authority = &ctx.accounts.vault_ata_authority;
    let to_token_account = &mut ctx.accounts.to_token_account;

    let token_program = &ctx.accounts.token_program;

    require!(user.claimable.gt(&amount) || user.claimable.eq(&amount), ErrorCode::InsufficientClaimableAmount);

    let signature_seeds = [vault_ata_key.as_ref(), &[vault_ata_authority_nonce]];
    let signers = &[&signature_seeds[..]];

    require!(transfer_token_account_signed(
        vault_ata, //  from 
        to_token_account, // to 
        vault_ata_authority, // from auth
        signers, // signers
        token_program, // TOKEN_PROGRAM
        amount
    ).is_ok(), ErrorCode::FailedToClaim);

    user.claimable = user.claimable.saturating_sub(amount);

    Ok(())
}


#[derive(Accounts)]
pub struct CloseUserAccount<'info> {

    pub signer: Signer<'info>,

    #[account(mut, 
        close = receiver,
        constraint = signer.key() == user.owner @ ErrorCode::SignerNotOwner,
        constraint = user.claimable.eq(&0_u64)
    )]
    pub user: Box<Account<'info, User>>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

}

#[derive(Accounts)]
pub struct UserClaim<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub user: Box<Account<'info, User>>,

    #[account(
        mut,
        constraint = to_token_account.owner == user.owner @ErrorCode::UserOwnerNotToTokenAccountOwner
    )]
    pub to_token_account: Box<Account<'info, TokenAccount>>,

    #[account()]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = vault_ata.owner == vault.vault_ata_authority.key() 
    )]
    pub vault_ata: Box<Account<'info, TokenAccount>>,

    /// CHECK:
    #[account(
        constraint = vault_ata_authority.key() == vault_ata.owner
    )]
    pub vault_ata_authority: AccountInfo<'info>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>

}

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [ owner.key().as_ref(), b"user"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<User>() + 8
    )]
    pub user: Box<Account<'info, User>>, 

    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitUserPrediction<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut,
        constraint = user.owner == signer.key() @ ErrorCode::SignerNotOwnerOfUser
    )]
    pub user: Box<Account<'info, User>>,

    #[account(
        mut,
        constraint = game.key() == current_round.game @ ErrorCode::RoundGameKeyNotEqual,
        constraint = !current_round.finished @ ErrorCode::RoundAlreadyFinished,
        constraint = current_round.round_predictions_allowed @ ErrorCode::RoundPredictionsNotAllowed
    )]
    pub current_round: Box<Account<'info, Round>>,

    
    #[account(
        init,
        seeds = [
            signer.key().as_ref(), 
            game.key().as_ref(), 
            current_round.key().as_ref(), 
            &[current_round.round_number.to_be_bytes()[0]], 
            &[current_round.round_number.to_be_bytes()[1]],
            &[current_round.round_number.to_be_bytes()[2]], 
            &[current_round.round_number.to_be_bytes()[3]],
            b"user_prediction"
        ],
        bump, 
        payer = signer,
        space = std::mem::size_of::<UserPrediction>() + 8
    )]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(
        constraint = vault.vault_ata == vault_ata.key()
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = vault_ata.owner == vault.vault_ata_authority @ ErrorCode::RoundOwnerNotVaultOwner
    )]
    pub vault_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = from_token_account.amount.saturating_add(user.claimable) > 0 @ ErrorCode::FromTokenAccountZeroBalance
    )]
    pub from_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK:
    #[account(
        constraint = from_token_account_authority.key() == from_token_account.owner
    )]
    pub from_token_account_authority: AccountInfo<'info>,


    pub token_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseUserPrediction<'info> { 
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut, 
        close = user_prediction_close_receiver,
        constraint = user_prediction.settled @ ErrorCode::UserPredictionNotSettled
    )]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(
        mut,
        constraint = user_prediction.owner == user_prediction_close_receiver.key() @ ErrorCode::UserOwnerNotReceiver
    )]
    pub user_prediction_close_receiver: SystemAccount<'info>
}