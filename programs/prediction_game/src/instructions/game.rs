use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;

use crate::errors::ErrorCode;

use crate::state::UserPrediction;
use crate::state::Vault;
use crate::state::Game;
use crate::state::Round;
use crate::state::get_price;

// initialize game
pub fn init_game(ctx: Context<InitializeGame>, vault_up_token_account_nonce: u8, vault_down_token_account_nonce: u8) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let owner = &ctx.accounts.owner;
    let round = &mut ctx.accounts.round;
    let vault = &mut ctx.accounts.vault;
    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;
    let game_pubkey = game.key();

    game.owner = owner.key();
    game.address = game_pubkey;
    game.vault = vault.key();
    game.round_number = 1;
    game.current_round = round.key();
    game.total_volume = 0;

    vault.owner = owner.key();
    vault.address = vault.key();
    vault.token_mint_pubkey = ctx.accounts.token_mint.key();

    vault.up_token_account_pubkey = ctx.accounts.up_token_account.key();
    vault.up_token_account_authority = owner.key();
    vault.up_token_account_nonce = vault_up_token_account_nonce;

    vault.down_token_account_pubkey = ctx.accounts.down_token_account.key();
    vault.down_token_account_authority = owner.key();
    vault.down_token_account_nonce = vault_down_token_account_nonce;

    vault.up_amount = 0;
    vault.down_amount = 0;


    round.owner = owner.key();
    round.game = game.key();
    round.address = round.key();
    round.price_program_pubkey = price_program.key();
    round.price_feed_pubkey = price_feed.key();

    round.round_number = 1;

    let now = Clock::get()?.unix_timestamp;

    round.round_start_time = now;
    round.round_current_time = now;
    round.round_time_difference = 0;

    let price = get_price(price_program, price_feed).unwrap_or(0);
    // let price = 0;

    round.round_start_price = price;
    round.round_current_price = price;
    round.round_price_difference = 0;

    round.finished = false;
    round.settled = false;


    // require!(round.init(owner.key(), price_program, price_feed, 1).is_ok(), ErrorCode::FailedToInitRound);

    Ok(())
}

// essentially crank. does most of the required work
pub fn update_game<'info>(mut ctx: Context<'_, '_, '_, 'info, UpdateGame<'info>>) -> Result<()> {
    let ctx = &mut ctx;
    let accounts = ctx.remaining_accounts;
    let round = &mut ctx.accounts.round;
    let vault  = &mut ctx.accounts.vault;
    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;
    let token_program = &ctx.accounts.token_program;

    if !round.finished {
        require!(round.update(
            price_program, price_feed
        ).is_ok(), ErrorCode::FailedToUpdateRound);
    }
    
    if round.finished && !round.settled && (round.round_winning_direction == 1 || round.round_winning_direction == 2) {
            let (
                winning_vault,
                losing_vault,
                winning_vault_authority,
                losing_vault_authority,
                winning_vault_amount,
                losing_vault_amount
            ) = if round.round_winning_direction == 1 {

                (
                    &ctx.accounts.up_token_account, 
                    &ctx.accounts.down_token_account,
                    &ctx.accounts.up_token_account_authority,
                    &ctx.accounts.down_token_account_authority,
                    round.total_up_amount,
                    round.total_down_amount
                )
    
            } else {
    
               (
                    &ctx.accounts.down_token_account, 
                    &ctx.accounts.up_token_account, 
                    &ctx.accounts.down_token_account_authority, 
                    &ctx.accounts.up_token_account_authority,
                    round.total_down_amount,
                    round.total_up_amount
                )
    
            };

            if accounts.len() % 2 == 0 && accounts.len() >= 2 {
                for i in 0..(accounts.len()/2) {

                    let prediction = &mut Account::<'info, UserPrediction>::try_from(&accounts[i]).unwrap();
                    let token_account = &Account::<'info, TokenAccount>::try_from(&accounts[i+1]).unwrap();
    
                    if !prediction.settled {
                        if prediction.up_or_down == round.round_winning_direction {

                            let winnings = losing_vault_amount * (prediction.amount / winning_vault_amount);
        
                            // withdraw winnings from loser vault
                            let _winnings_withdraw_result = vault.withdraw(
                                losing_vault, 
                                token_account, 
                                losing_vault_authority, 
                                token_program, 
                                winnings
                            );

                            let _initial_amount_withdraw_result = vault.withdraw(
                                winning_vault, 
                                token_account, 
                                winning_vault_authority, 
                                token_program, 
                                prediction.amount
                            );
                            // prediction.close();

                        }
                        prediction.settled = true;
                    }
                }
            }
        }
    Ok(())
}

// pub fn close_game<'info>(mut ctx: Context<'_, '_, '_, 'info, CloseGame<'info>>) -> Result<()> {
//     // let ctx = &mut ctx;
//     // let game = &ctx.accounts.game;
    
//     Ok(())
// }



#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), b"game"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Game>() + 8
    )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        init,
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), game.key().as_ref(), b"round"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        init,
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), game.key().as_ref(), b"vault"],
        bump,
        payer = owner,
        space = std::mem::size_of::<Vault>() + 8 
    )]
    pub vault: Box<Account<'info, Vault>>,

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        init, 
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), game.key().as_ref(), vault.key().as_ref(), b"up"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = owner
    )]
    pub up_token_account:  Box<Account<'info, TokenAccount>>,
    #[account(
        init, 
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), game.key().as_ref(), vault.key().as_ref(), b"down"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = owner
    )]
    pub down_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK:
    // #[account(
    //     constraint = round.price_program_pubkey == price_program.key() @ ErrorCode::RoundPriceProgramNotEqual
    // )]
    pub price_program: AccountInfo<'info>,

    /// CHECK:
    // #[account(
    //     constraint = round.price_feed_pubkey == price_feed.key() @ ErrorCode::RoundPriceFeedNotEqual
    // )]
    pub price_feed: AccountInfo<'info>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    
    // required for Account
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct UpdateGame<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = game.owner == signer.key() @ ErrorCode::SignerNotOwner
    )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut,
        constraint = round.owner == signer.key() @ ErrorCode::SignerNotOwner,
        constraint = round.game == game.key() @ ErrorCode::RoundGameKeyNotEqual
    )]
    pub round: Box<Account<'info, Round>>,


    #[account(
        mut,
        constraint = vault.owner == signer.key() @ ErrorCode::SignerNotOwner,
        constraint = round.owner == vault.owner @ ErrorCode::RoundOwnerNotVaultOwner
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = up_token_account.owner == up_token_account_authority.key() @ ErrorCode::VaultUpTokenAccountAuthorityMismatch
    )]
    pub up_token_account:  Box<Account<'info, TokenAccount>>,
    
    /// CHECK:
    #[account(
        constraint = up_token_account.owner == up_token_account_authority.key() @ ErrorCode::VaultUpTokenAccountAuthorityMismatch
    )]
    pub up_token_account_authority: AccountInfo<'info>,

    #[account(
        mut,
        constraint = down_token_account.owner == down_token_account_authority.key() @ ErrorCode::VaultDownTokenAccountAuthorityMismatch
    )]
    pub down_token_account: Box<Account<'info, TokenAccount>>,
    
    /// CHECK:
    #[account(
        constraint = down_token_account.owner == down_token_account_authority.key() @ ErrorCode::VaultDownTokenAccountAuthorityMismatch
    )]
    pub down_token_account_authority: AccountInfo<'info>,

    /// CHECK:
    #[account(
        constraint = round.price_program_pubkey == price_program.key() @ ErrorCode::RoundPriceProgramNotEqual,
        // constraint = price_feed.owner.eq(&price_program.key()) @ ErrorCode::PriceProgramNotOwnerOfPriceFeed
    )]
    pub price_program: AccountInfo<'info>,

    /// CHECK:
    #[account(
        constraint = round.price_feed_pubkey == price_feed.key() @ ErrorCode::RoundPriceFeedNotEqual,
        // constraint = price_feed.owner.eq(&price_program.key()) @ ErrorCode::PriceProgramNotOwnerOfPriceFeed
    )]
    pub price_feed: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,

    // required for Account
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct CloseGame<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = game.owner == signer.key() @ ErrorCode::SignerNotOwner,
        close = receiver
    )]
    pub game: Box<Account<'info, Game>>,

    pub system_program: Program<'info, System>,
}

