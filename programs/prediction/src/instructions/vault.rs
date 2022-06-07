use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

use crate::errors::ErrorCode;

use crate::state::vault::Vault;

pub fn init_vault(ctx: Context<InitVault>) -> Result<()> {

    let up_token_account_key = ctx.accounts.up_token_account.to_account_info().key;
    let (up_token_account_authority, up_token_account_nonce) =
        Pubkey::find_program_address(&[up_token_account_key.key().as_ref()], ctx.program_id);

    // up_vault owner must be authority of up_vault
    require_keys_eq!(ctx.accounts.up_token_account.owner, up_token_account_authority, ErrorCode::InvalidUpVaultAccountAuthority);

    let down_token_account_key = ctx.accounts.down_token_account.to_account_info().key;
    let (down_token_account_authority, down_token_account_nonce) =
        Pubkey::find_program_address(&[down_token_account_key.key().as_ref()], ctx.program_id);

    // down_vault owner must be authority of down_vault
    require_keys_eq!(ctx.accounts.down_token_account.owner, down_token_account_authority, ErrorCode::InvalidDownVaultAccountAuthority);

    let vault = &mut ctx.accounts.vault;

    vault.init(
        ctx.accounts.up_token_account.key(),
        ctx.accounts.up_token_account_authority.key(),
        up_token_account_nonce,
        ctx.accounts.down_token_account.key(),
        ctx.accounts.down_token_account_authority.key(),
        down_token_account_nonce
    )
}

pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
    require_keys_eq!(ctx.accounts.signer.key(), ctx.accounts.vault.owner.key(), ErrorCode::SignerNotOwnerOfVault);
    
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
pub struct InitVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), b"vault"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Vault>() + 8
    )]
    pub vault: Box<Account<'info, Vault>>,

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        init, 
        seeds = [owner.key().as_ref(), b"up"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = up_token_account_authority
    )]
    pub up_token_account:  Box<Account<'info, TokenAccount>>,
    /// CHECK: checked in `init_game`
    pub up_token_account_authority: AccountInfo<'info>,

    #[account(
        init, 
        seeds = [owner.key().as_ref(), b"down"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = down_token_account_authority
    )]
    pub down_token_account: Box<Account<'info, TokenAccount>>,
    
    /// CHECK: checked in `init_game`
    pub down_token_account_authority: AccountInfo<'info>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,

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

    pub from_token_account_authority: AccountInfo<'info>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>

}

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account()]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = signer.key() == up_token_account.owner && up_token_account.owner == up_token_account_authority.key()

    )]
    pub up_token_account:  Box<Account<'info, TokenAccount>>,
    /// CHECK: checked in `init_game`
    pub up_token_account_authority: AccountInfo<'info>,

    #[account(
        mut,
        constraint = signer.key() == down_token_account.owner && down_token_account.owner == down_token_account_authority.key()
    )]
    pub down_token_account: Box<Account<'info, TokenAccount>>,
    
    /// CHECK: checked in `init_game`
    pub down_token_account_authority: AccountInfo<'info>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,

}
