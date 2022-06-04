mod errors;

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};
use errors::ErrorCode;
use pyth_sdk_solana::{load_price_feed_from_account_info, PriceFeed};


declare_id!("FVUPGJ2QiLbW1dtcKMkPyAfhcSPeACVR2GujZfxh3W8e");

#[program]
pub mod prediction {
    use super::*;

    pub fn init_game(ctx: Context<InitializeGame>) -> Result<()> {


        let up_vault_account_key = ctx.accounts.up_vault.to_account_info().key;
        let (up_vault_account_authority, _up_vault_nonce) =
            Pubkey::find_program_address(&[up_vault_account_key.key().as_ref()], ctx.program_id);

        // up_vault owner must be authority of up_vault
        require_keys_eq!(ctx.accounts.up_vault.owner, up_vault_account_authority, ErrorCode::InvalidUpVaultAccountAuthority);

        let down_vault_account_key = ctx.accounts.down_vault.to_account_info().key;
        let (down_vault_account_authority, _down_vault_nonce) =
            Pubkey::find_program_address(&[down_vault_account_key.key().as_ref()], ctx.program_id);

        // down_vault owner must be authority of down_vault
        require_keys_eq!(ctx.accounts.down_vault.owner, down_vault_account_authority, ErrorCode::InvalidDownVaultAccountAuthority);


        let game = &mut ctx.accounts.game;
        game.owner = ctx.accounts.owner.key();

        game.up_vault_pubkey = ctx.accounts.up_vault.key();
        game.up_vault_authority = ctx.accounts.up_vault_authority.key();

        game.down_vault_pubkey = ctx.accounts.down_vault.key();
        game.down_vault_authority = ctx.accounts.down_vault_authority.key();

        game.token_mint_pubkey = ctx.accounts.token_mint.key();

        game.price_feed_pubkey = ctx.accounts.price_oracle.key();
        game.round = 0;
        game.round_start_time = Clock::from_account_info(&ctx.accounts.clock_account_info).unwrap().unix_timestamp;
        let price_feed_result = load_price_feed_from_account_info(&ctx.accounts.price_oracle).unwrap();
        let price: i64 = price_feed_result.get_current_price().unwrap().price;
        game.round_start_price = price;
        game.round_current_price = price;

        Ok(())
    }

    pub fn update_game(ctx: Context<UpdateGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;

        require_keys_eq!(ctx.accounts.price_oracle.key(), game.price_feed_pubkey, ErrorCode::PriceFeedKeyMismatch);
        
        // get the price feed from pyth oracle
        let price_feed_result = load_price_feed_from_account_info(&ctx.accounts.price_oracle).unwrap();

        // update the round price
        game.round_current_price = price_feed_result.get_current_price().unwrap().price;

        // update the round time
        game.round_current_time = Clock::from_account_info(&ctx.accounts.clock_account_info).unwrap().unix_timestamp;

        // calculate the difference in price or set to zero
        game.round_price_difference = game.round_start_price.checked_sub(game.round_current_price).unwrap_or(0);

        // calculate the difference in time or set to zero
        game.round_time_difference = game.round_start_time.checked_sub(game.round_current_time).unwrap_or(0);

        if game.round_time_difference > (5 * 1000 * 60) {
            // end game
        }
        
        Ok(())
    }
}



#[derive(Accounts)]
pub struct InitializeGame<'info> {
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
    /// CHECK: checked in `init_game_pda`
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
    
    /// CHECK: checked in `init_game_pda`
    pub down_vault_authority: AccountInfo<'info>,

    /// CHECK: checked in `init_game_pda`
    pub price_oracle: AccountInfo<'info>,

    /// CHECK: checked in `init_game_pda`
    pub clock_account_info: AccountInfo<'info>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}



#[derive(Accounts)]
pub struct UpdateGame<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account()]
    pub game: Account<'info, Game>,

    // pub token_mint: Account<'info, Mint>,

    // #[account(
    //     token::mint = token_mint,
    //     token::authority = up_vault_authority
    // )]
    // pub up_vault: Account<'info, TokenAccount>,
    // /// CHECK: checked in `init_game_pda`
    // pub up_vault_authority: AccountInfo<'info>,

    // #[account(
    //     token::mint = token_mint,
    //     token::authority = down_vault_authority
    // )]
    // pub down_vault: Account<'info, TokenAccount>,
    
    // /// CHECK: checked in `init_game_pda`
    // pub down_vault_authority: AccountInfo<'info>,

    /// CHECK: checked in `init_game_pda`
    pub price_oracle: AccountInfo<'info>,

    /// CHECK: checked in `init_game_pda`
    pub clock_account_info: AccountInfo<'info>,
}

#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,

    pub up_vault_authority: Pubkey,
    pub up_vault_pubkey: Pubkey,
    pub up_vault_amount: u128,

    pub down_vault_pubkey: Pubkey,
    pub down_vault_authority: Pubkey,
    pub down_vault_amount: u128,

    pub token_mint_pubkey: Pubkey,

    pub round: u32,
    pub price_feed_pubkey: Pubkey,
    pub round_start_time: i64,
    pub round_current_time: i64,
    pub round_time_difference: i64,
    pub round_start_price: i64,
    pub round_current_price: i64,
    pub round_price_difference: i64
}