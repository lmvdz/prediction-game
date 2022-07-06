use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;

use crate::errors::ErrorCode;


use crate::state::Vault;
use crate::utils::close_token_account_signed;
use crate::utils::transfer_token_account_signed;

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

    let (fee_vault_ata_authority, fee_vault_ata_authority_nonce) =
        Pubkey::find_program_address(&[vault.fee_vault_ata.as_ref()], ctx.program_id);

    // fee vault ata authority needs to be equal to the calculated one
    require_keys_eq!(vault.fee_vault_ata_authority, fee_vault_ata_authority, ErrorCode::InvalidFeeVaultATAAuthority);
    
    vault.fee_vault_ata_authority_nonce = fee_vault_ata_nonce;

    require_eq!(fee_vault_ata_authority_nonce, vault.fee_vault_ata_authority_nonce, ErrorCode::InvalidFeeVaultAuthorityNonce);

    vault.vault_ata = ctx.accounts.vault_ata.key();
    vault.vault_ata_authority = ctx.accounts.vault_ata_authority.key();

    let (vault_ata_authority, vault_ata_authority_nonce) =
        Pubkey::find_program_address(&[vault.vault_ata.as_ref()], ctx.program_id);

    // vault ata authority needs to be equal to the calculated one
    require_keys_eq!(vault.vault_ata_authority, vault_ata_authority, ErrorCode::InvalidVaultATAAuthority);

    vault.vault_ata_authority_nonce = vault_ata_nonce;

    require_eq!(vault_ata_authority_nonce, vault.vault_ata_authority_nonce, ErrorCode::InvalidVaultAuthorityNonce);

    Ok(())
}

pub fn close_fee_vault_token_account<'info>(ctx: Context<'_, '_, '_, 'info, CloseFeeVaultTokenAccount<'info>>) -> Result<()> {

    let token_program = &ctx.accounts.token_program;
    let fee_vault = &mut ctx.accounts.fee_vault;
    let fee_vault_key = fee_vault.key();
    let vault = &ctx.accounts.vault;
    let signature_seeds = [fee_vault_key.as_ref(), &[vault.fee_vault_ata_authority_nonce]];
    let signers = &[&signature_seeds[..]];

    if fee_vault.amount > 0 {
        require!(transfer_token_account_signed(fee_vault, &ctx.accounts.receiver_ata, &ctx.accounts.fee_vault_ata_authority, signers, token_program, fee_vault.amount).is_ok(), ErrorCode::FailedToWithdraw);
    }

    require!(close_token_account_signed( 
        fee_vault.to_account_info().clone(), 
        ctx.accounts.receiver.to_account_info().clone(), 
        ctx.accounts.fee_vault_ata_authority.to_account_info().clone(), 
        token_program.to_account_info().clone(),
        signers
    ).is_ok(), ErrorCode::FailedToCloseVaultTokenAccount);
    
    Ok(())
}

pub fn close_vault_token_account<'info>(ctx: Context<'_, '_, '_, 'info, CloseVaultTokenAccount<'info>>) -> Result<()> {

    let token_program = &ctx.accounts.token_program;
    let vault_ata = &mut ctx.accounts.vault_ata;
    let vault_ata_key = vault_ata.key();
    let vault = &ctx.accounts.vault;

    let signature_seeds = [vault_ata_key.as_ref(), &[vault.vault_ata_authority_nonce]];
    let signers = &[&signature_seeds[..]];


    if vault_ata.amount > 0 {
        require!(transfer_token_account_signed(vault_ata, &ctx.accounts.receiver_ata, &ctx.accounts.vault_ata_authority, signers, token_program, vault_ata.amount).is_ok(), ErrorCode::FailedToWithdraw);
    }

    require!(close_token_account_signed( 
        ctx.accounts.vault_ata.to_account_info().clone(), 
        ctx.accounts.receiver.to_account_info().clone(), 
        ctx.accounts.vault_ata_authority.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone(),
        signers
    ).is_ok(), ErrorCode::FailedToCloseVaultTokenAccount);
    
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

    /// CHECK: make sure the authority is not malicously calculated
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

    /// CHECK: make sure the authority is not malicously calculated
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
        constraint = vault.owner == signer.key(),
    )]
    pub vault:  Box<Account<'info, Vault>>,


    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = signer.key() == receiver_ata.owner
    )]
    pub receiver_ata:  Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = fee_vault.owner == fee_vault_ata_authority.key(),
    )]
    pub fee_vault:  Box<Account<'info, TokenAccount>>,

    /// CHECK: make sure the authority is not malicously calculated
    #[account( constraint = fee_vault_ata_authority.key() == vault.fee_vault_ata_authority )]
    pub fee_vault_ata_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>
}

#[derive(Accounts)]
pub struct CloseVaultTokenAccount<'info> {
    #[account()]
    pub signer: Signer<'info>,


    #[account(
        mut,
        constraint = vault.owner == signer.key(),
    )]
    pub vault:  Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = signer.key() == receiver_ata.owner
    )]
    pub receiver_ata:  Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = vault_ata.owner == vault_ata_authority.key(),
    )]
    pub vault_ata:  Box<Account<'info, TokenAccount>>,

    /// CHECK: make sure the authority is not malicously calculated
    #[account( constraint = vault_ata_authority.key() == vault.vault_ata_authority )]
    pub vault_ata_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,

}

#[derive(Accounts)]
pub struct AdminCloseVaultAccount<'info> {

    pub signer: Signer<'info>,

    #[account(
        mut
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        close = receiver
    )]
    pub vault:  Box<Account<'info, Vault>>

}