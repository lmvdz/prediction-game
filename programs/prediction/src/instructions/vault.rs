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

    vault.up_token_account_pubkey = ctx.accounts.up_token_account.key();
    vault.up_token_account_authority = ctx.accounts.up_token_account_authority.key();
    vault.up_token_account_nonce = up_token_account_nonce;

    vault.down_token_account_pubkey = ctx.accounts.down_token_account.key();
    vault.down_token_account_authority = ctx.accounts.down_token_account_authority.key();
    vault.down_token_account_nonce = down_token_account_nonce;


    Ok(())
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
