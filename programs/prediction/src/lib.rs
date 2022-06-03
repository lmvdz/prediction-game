mod errors;

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};
use errors::ErrorCode;

declare_id!("FVUPGJ2QiLbW1dtcKMkPyAfhcSPeACVR2GujZfxh3W8e");

#[program]
pub mod prediction {
    use super::*;

    pub fn init_game_pda(ctx: Context<InitializeGamePDA>) -> Result<()> {


        // let up_vault_account_key = ctx.accounts.up_vault.to_account_info().key;
        let (up_vault_account_authority, _up_vault_nonce) =
            Pubkey::find_program_address(&[ctx.accounts.owner.key().as_ref(), b"up"], ctx.program_id);

        // up_vault owner must be authority of up_vault
        require_keys_eq!(ctx.accounts.up_vault.owner, up_vault_account_authority, ErrorCode::InvalidUpVaultAccountAuthority);

        // let down_vault_account_key = ctx.accounts.down_vault.to_account_info().key;
        let (down_vault_account_authority, _down_vault_nonce) =
            Pubkey::find_program_address(&[ctx.accounts.owner.key().as_ref(), b"down"], ctx.program_id);

        // down_vault owner must be authority of down_vault
        require_keys_eq!(ctx.accounts.down_vault.owner, down_vault_account_authority, ErrorCode::InvalidDownVaultAccountAuthority);


        let game = &mut ctx.accounts.game;
        game.owner = ctx.accounts.owner.key();

        game.up_vault_pubkey = ctx.accounts.up_vault.key();
        game.up_vault_authority = ctx.accounts.up_vault_authority.key();

        game.down_vault_pubkey = ctx.accounts.down_vault.key();
        game.down_vault_authority = ctx.accounts.down_vault_authority.key();



        Ok(())
    }
}



#[derive(Accounts)]
pub struct InitializeGamePDA<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), b"game"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Game>() + 8
    )]
    pub game: Account<'info, Game>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init, 
        seeds = [owner.key().as_ref(), b"up"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = up_vault_authority
    )]
    pub up_vault: Account<'info, TokenAccount>,
    /// CHECK: checked in `initialize`
    pub up_vault_authority: AccountInfo<'info>,
    #[account(
        init, 
        seeds = [owner.key().as_ref(), b"down"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = down_vault_authority
    )]
    pub down_vault: Account<'info, TokenAccount>,
    /// CHECK: checked in `initialize`
    pub down_vault_authority: AccountInfo<'info>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,

    pub up_vault_authority: Pubkey,
    pub up_vault_pubkey: Pubkey,

    pub down_vault_pubkey: Pubkey,
    pub down_vault_authority: Pubkey,
}