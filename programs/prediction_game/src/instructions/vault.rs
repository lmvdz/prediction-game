use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token};

use crate::errors::ErrorCode;

use crate::state::Game;
use crate::state::vault::Vault;
use crate::utils::util::close_token_account;

pub fn close_vault_and_token_accounts<'info>(ctx: Context<'_, '_, '_, 'info, CloseVaultAndTokenAccounts<'info>>) -> Result<()> {

    require!(close_token_account( 
        ctx.accounts.up_token_account.to_account_info().clone(), 
        ctx.accounts.receiver.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseUpTokenAccount);

    require!(close_token_account( 
        ctx.accounts.down_token_account.to_account_info().clone(), 
        ctx.accounts.receiver.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseDownTokenAccount);
    
    Ok(())
}

pub fn close_vault_token_accounts<'info>(ctx: Context<'_, '_, '_, 'info, CloseVaultTokenAccounts<'info>>) -> Result<()> {

    require!(close_token_account( 
        ctx.accounts.up_token_account.to_account_info().clone(), 
        ctx.accounts.receiver.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseUpTokenAccount);

    require!(close_token_account( 
        ctx.accounts.down_token_account.to_account_info().clone(), 
        ctx.accounts.receiver.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseDownTokenAccount);
    
    Ok(())
}

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(mut, 
        close = receiver,
        constraint = signer.key() == vault.owner
    )]
    pub vault: Box<Account<'info, Vault>>,

}

#[derive(Accounts)]
pub struct CloseVaultTokenAccounts<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = up_token_account.owner == signer.key(),
    )]
    pub up_token_account:  Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = down_token_account.owner == signer.key(),
    )]
    pub down_token_account: Box<Account<'info, TokenAccount>>,


    pub token_program: Program<'info, Token>,

}


#[derive(Accounts)]
pub struct CloseVaultAndTokenAccounts<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = game.owner == signer.key() @ ErrorCode::SignerNotOwner
    )]
    pub game: Box<Account<'info, Game>>,


    #[account(mut, 
        close = receiver,
        constraint = vault.owner == signer.key()
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = up_token_account.owner == signer.key(),
    )]
    pub up_token_account:  Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = down_token_account.owner == signer.key(),
    )]
    pub down_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,

}
