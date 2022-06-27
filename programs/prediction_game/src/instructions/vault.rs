use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;

use crate::errors::ErrorCode;


use crate::state::Vault;
use crate::utils::close_token_account;

pub fn init_vault(ctx: Context<InitializeVault>, vault_ata_nonce: u8, fee_vault_ata_nonce: u8) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let owner = ctx.accounts.owner.key();
    let token_mint = ctx.accounts.token_mint.key();
    let token_decimals = ctx.accounts.token_mint.decimals;

    vault.owner = owner;
    vault.address = vault.key();

    vault.token_mint = token_mint;
    vault.token_decimals = token_decimals;

    vault.fee_vault_ata = ctx.accounts.fee_vault_ata.key();
    vault.fee_vault_ata_authority = ctx.accounts.fee_vault_ata_authority.key();
    vault.fee_vault_ata_authority_nonce = fee_vault_ata_nonce;

    vault.vault_ata = ctx.accounts.vault_ata.key();
    vault.vault_ata_authority = ctx.accounts.vault_ata_authority.key();
    vault.vault_ata_authority_nonce = vault_ata_nonce;

    Ok(())
}

pub fn close_fee_vault_token_account<'info>(ctx: Context<'_, '_, '_, 'info, CloseFeeVaultTokenAccount<'info>>) -> Result<()> {

    require!(close_token_account( 
        ctx.accounts.fee_vault.to_account_info().clone(), 
        ctx.accounts.receiver.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseUpTokenAccount);
    
    Ok(())
}

pub fn close_vault_token_account<'info>(ctx: Context<'_, '_, '_, 'info, CloseVaultTokenAccount<'info>>) -> Result<()> {

    require!(close_token_account( 
        ctx.accounts.vault_ata.to_account_info().clone(), 
        ctx.accounts.receiver.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseUpTokenAccount);
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [env!("CARGO_PKG_VERSION").as_bytes(), vault.key().as_ref(), b"fee_vault_ata"], 
        bump, 
        payer = owner,
        token::mint = token_mint,
        token::authority = fee_vault_ata_authority
    )]
    pub fee_vault_ata: Box<Account<'info, TokenAccount>>,

    /// CHECK:
    pub fee_vault_ata_authority: AccountInfo<'info>,

    #[account(
        init,
        seeds = [env!("CARGO_PKG_VERSION").as_bytes(), vault.key().as_ref(), b"vault_ata"],
        bump,
        payer = owner,
        token::mint = token_mint,
        token::authority = vault_ata_authority
    )]
    pub vault_ata: Box<Account<'info, TokenAccount>>,

    /// CHECK:
    pub vault_ata_authority: AccountInfo<'info>,

    #[account(
        init,
        seeds = [env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), token_mint.key().as_ref(), b"vault"],
        bump,
        payer = owner,
        space = std::mem::size_of::<Vault>() + 8
    )]
    pub vault: Box<Account<'info, Vault>>,

    pub token_mint: Box<Account<'info, Mint>>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    
    pub token_program: Program<'info, Token>,
    
    // required for Account
    pub system_program: Program<'info, System>,

}


#[derive(Accounts)]
pub struct CloseFeeVaultTokenAccount<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = fee_vault.owner == signer.key(),
    )]
    pub fee_vault:  Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>
}

#[derive(Accounts)]
pub struct CloseVaultTokenAccount<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = vault_ata.owner == signer.key(),
    )]
    pub vault_ata:  Box<Account<'info, TokenAccount>>,



    pub token_program: Program<'info, Token>,

}