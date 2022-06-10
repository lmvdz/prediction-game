use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

use crate::errors::ErrorCode;

use crate::state::Game;
use crate::state::vault::Vault;
use crate::utils::util::close_token_account;

pub fn close_vault_and_token_accounts<'info>(ctx: Context<'_, '_, '_, 'info, CloseVaultAndTokenAccounts<'info>>) -> Result<()> {

    require!(close_token_account( 
        ctx.accounts.up_token_account.to_account_info().clone(), 
        ctx.accounts.reciever_token_account.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseUpTokenAccount);

    require!(close_token_account( 
        ctx.accounts.down_token_account.to_account_info().clone(), 
        ctx.accounts.reciever_token_account.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseDownTokenAccount);
    
    Ok(())
}

pub fn close_vault_token_accounts<'info>(ctx: Context<'_, '_, '_, 'info, CloseVaultTokenAccounts<'info>>) -> Result<()> {

    require!(close_token_account( 
        ctx.accounts.up_token_account.to_account_info().clone(), 
        ctx.accounts.reciever_token_account.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseUpTokenAccount);

    require!(close_token_account( 
        ctx.accounts.down_token_account.to_account_info().clone(), 
        ctx.accounts.reciever_token_account.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseDownTokenAccount);
    
    Ok(())
}

pub fn deposit(ctx: Context<VaultTransfer>, amount: u64) -> Result<()> {

    let vault = &mut ctx.accounts.vault;
    vault.deposit(&ctx.accounts.from_token_account, &ctx.accounts.to_token_account, &ctx.accounts.from_token_account_authority, &ctx.accounts.token_program, amount)
    
}

pub fn withdraw(ctx: Context<VaultTransfer>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.withdraw(&ctx.accounts.from_token_account, &ctx.accounts.to_token_account, &ctx.accounts.from_token_account_authority, &ctx.accounts.token_program, amount)
    
}


#[derive(Accounts)]
pub struct VaultTransfer<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account()]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        token::mint = token_mint.key()
    )]
    pub to_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = from_token_account.owner.eq(&from_token_account_authority.key()),
        token::mint = token_mint.key()
    )]
    pub from_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK:
    pub from_token_account_authority: AccountInfo<'info>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>

}

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

    #[account(mut, close = receiver)]
    pub vault: Box<Account<'info, Vault>>,

}

#[derive(Accounts)]
pub struct CloseVaultTokenAccounts<'info> {
    #[account()]
    pub signer: Signer<'info>,


    #[account(
        mut,
        constraint = reciever_token_account.owner == signer.key(),
        constraint = reciever_token_account.mint == up_token_account.mint @ ErrorCode::TokenAccountMintMismatch,
        constraint = reciever_token_account.mint == down_token_account.mint @ ErrorCode::TokenAccountMintMismatch,
    )]
    pub reciever_token_account: Box<Account<'info, TokenAccount>>,

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

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = reciever_token_account.owner == signer.key(), 
        constraint = reciever_token_account.mint == up_token_account.mint @ ErrorCode::TokenAccountMintMismatch,
        constraint = reciever_token_account.mint == down_token_account.mint @ ErrorCode::TokenAccountMintMismatch,
    )]
    pub reciever_token_account: Box<Account<'info, TokenAccount>>,


    #[account(
        mut,
        constraint = game.owner == signer.key() @ ErrorCode::SignerNotOwner
    )]
    pub game: Box<Account<'info, Game>>,


    #[account(mut, close = receiver)]
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
