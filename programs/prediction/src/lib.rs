mod errors;

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};
use errors::ErrorCode;
use pyth_sdk_solana::load_price_feed_from_account_info;
use chainlink_solana as chainlink;
use std::str::FromStr;

#[account]
pub struct Decimal {
    pub value: i128,
    pub decimals: u32,
}

impl Decimal {
    pub fn new(value: i128, decimals: u32) -> Self {
        Decimal { value, decimals }
    }
}

impl std::fmt::Display for Decimal {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut scaled_val = self.value.to_string();
        if scaled_val.len() <= self.decimals as usize {
            scaled_val.insert_str(
                0,
                &vec!["0"; self.decimals as usize - scaled_val.len()].join(""),
            );
            scaled_val.insert_str(0, "0.");
        } else {
            scaled_val.insert(scaled_val.len() - self.decimals as usize, '.');
        }
        f.write_str(&scaled_val)
    }
}

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

        // price_program must be owner of price_feed
        // require_keys_eq!(*ctx.accounts.price_feed.owner, ctx.accounts.price_program.key(), ErrorCode::PriceProgramNotOwnerOfPriceFeed);

        let game = &mut ctx.accounts.game;
        game.owner = ctx.accounts.owner.key();
        game.address = game.key();

        game.up_vault_pubkey = ctx.accounts.up_vault.key();
        game.up_vault_authority = ctx.accounts.up_vault_authority.key();

        game.down_vault_pubkey = ctx.accounts.down_vault.key();
        game.down_vault_authority = ctx.accounts.down_vault_authority.key();

        game.token_mint_pubkey = ctx.accounts.token_mint.key();

        game.price_program_pubkey = ctx.accounts.price_program.key();
        game.price_feed_pubkey = ctx.accounts.price_feed.key();
        game.round = 0;
        game.round_start_time = Clock::from_account_info(&ctx.accounts.clock).unwrap().unix_timestamp;

        // let price = get_price(&ctx.accounts.price_program, &ctx.accounts.price_feed).unwrap_or(0); // disabled in localnet
        let price = 100;
        game.round_start_price = price;
        game.round_current_price = price;
        

        Ok(())
    }

    

    pub fn update_game(ctx: Context<UpdateGame>) -> Result<()> {

        require_keys_eq!(ctx.accounts.price_feed.key(), ctx.accounts.game.price_feed_pubkey, ErrorCode::PriceFeedKeyMismatch);
        // require_keys_eq!(*ctx.accounts.price_feed.owner, ctx.accounts.price_program.key(), ErrorCode::PriceProgramNotOwnerOfPriceFeed); // disable in localnet

        let game = &mut ctx.accounts.game;

        
        // update the round price
        // game.round_current_price = get_price(&ctx.accounts.price_program, &ctx.accounts.price_feed).unwrap_or(game.round_start_price);  // disabled in localnet
        game.round_current_price += 1;
        // update the round time
        game.round_current_time = Clock::from_account_info(&ctx.accounts.clock).unwrap().unix_timestamp;

        // calculate the difference in price or set to zero
        game.round_price_difference = game.round_current_price.checked_sub(game.round_start_price).unwrap_or(0);

        // calculate the difference in time or set to zero
        game.round_time_difference = game.round_current_time.checked_sub(game.round_start_time).unwrap_or(0);

        if game.round_time_difference > (5 * 60) {
            // end game
        }
        
        Ok(())
    }

}

pub fn get_price<'info>(price_program: &AccountInfo<'info>, price_feed: &AccountInfo<'info>) -> Result<i128> {
    let mut price: i128 = 0;
    if Pubkey::from_str("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny").unwrap().eq(&price_program.key()) { // chainlink
        let round = chainlink::latest_round_data(
            price_program.to_account_info(),
            price_feed.to_account_info(),
        )?;
        let decimals = chainlink::decimals(
            price_program.to_account_info(),
            price_feed.to_account_info(),
        )?;
        price = Decimal::new(round.answer, u32::from(decimals)).value;
    } else if 
        Pubkey::from_str("gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s").unwrap().eq(&price_program.key()) // pyth devnet
        ||
        Pubkey::from_str("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH").unwrap().eq(&price_program.key())  // pyth mainnet
    { 
        let price_feed_result = load_price_feed_from_account_info(price_feed).unwrap();
        price = price_feed_result.get_current_price().unwrap().price.into();
    }
    Ok(price)
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
    pub game: Box<Account<'info, Game>>,

    
    pub token_mint: Box<Account<'info, Mint>>,


    #[account(
        init, 
        seeds = [owner.key().as_ref(), b"up"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = up_vault_authority
    )]
    pub up_vault:  Box<Account<'info, TokenAccount>>,
    /// CHECK: checked in `init_game`
    pub up_vault_authority: AccountInfo<'info>,



    #[account(
        init, 
        seeds = [owner.key().as_ref(), b"down"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = down_vault_authority
    )]
    pub down_vault: Box<Account<'info, TokenAccount>>,
    
    /// CHECK: checked in `init_game`
    pub down_vault_authority: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub price_program: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub price_feed: AccountInfo<'info>,

    /// CHECK: checked in `init_game`
    pub clock: AccountInfo<'info>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}



#[derive(Accounts)]
pub struct UpdateGame<'info> {

    #[account(mut)]
    pub game: Account<'info, Game>,

    /// CHECK: checked in `init_game`
    pub price_program: AccountInfo<'info>,

    /// CHECK: checked in `update_game`
    pub price_feed: AccountInfo<'info>,

    /// CHECK: checked in `update_game`
    pub clock: AccountInfo<'info>,
}

#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,
    pub address: Pubkey,

    pub up_vault_authority: Pubkey,
    pub up_vault_pubkey: Pubkey,
    pub up_vault_amount: u128,

    pub down_vault_pubkey: Pubkey,
    pub down_vault_authority: Pubkey,
    pub down_vault_amount: u128,

    pub token_mint_pubkey: Pubkey,

    pub round: u32,
    pub price_program_pubkey: Pubkey,
    pub price_feed_pubkey: Pubkey,
    pub round_start_time: i64,
    pub round_current_time: i64,
    pub round_time_difference: i64,
    pub round_start_price: i128,
    pub round_current_price: i128,
    pub round_price_difference: i128
}