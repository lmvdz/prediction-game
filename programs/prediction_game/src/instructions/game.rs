use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;

use crate::errors::ErrorCode;

use crate::state::UserPrediction;
use crate::state::Vault;
use crate::state::Game;
use crate::state::Round;
use crate::utils::close_token_account;

// initialize game
pub fn init_game(ctx: Context<InitializeGame>, vault_up_token_account_nonce: u8, vault_down_token_account_nonce: u8, token_decimal: u8) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let owner = &ctx.accounts.owner;
    let fee_vault = &mut ctx.accounts.game_fee_vault;
    let vault = &mut ctx.accounts.vault;
    let game_pubkey = game.key();
    let token_mint_key = ctx.accounts.token_mint.key();

    game.owner = owner.key();
    game.address = game_pubkey;
    game.vault = vault.key();
    game.fee_vault = fee_vault.key();
    game.round_number = 1_u32;
    game.total_volume = 0;
    game.total_volume_rollover = 0;
    game.token_decimal = token_decimal;
    game.token_mint = token_mint_key;

    vault.owner = owner.key();
    vault.address = vault.key();
    vault.token_mint_pubkey = token_mint_key;

    vault.up_token_account_pubkey = ctx.accounts.up_token_account.key();
    vault.up_token_account_authority = owner.key();
    vault.up_token_account_nonce = vault_up_token_account_nonce;

    vault.down_token_account_pubkey = ctx.accounts.down_token_account.key();
    vault.down_token_account_authority = owner.key();
    vault.down_token_account_nonce = vault_down_token_account_nonce;

    vault.up_amount = 0;
    vault.down_amount = 0;

    // require!(round.init(owner.key(), price_program, price_feed, 1).is_ok(), ErrorCode::FailedToInitRound);

    Ok(())
}

pub fn settle_predictions<'info>(mut ctx: Context<'_, '_, '_, 'info, SettlePredictions<'info>>) -> Result<()> {

    let ctx = &mut ctx;
    let accounts = ctx.remaining_accounts;
    let current_round = &mut ctx.accounts.current_round;
    let vault  = &mut ctx.accounts.vault;
    let token_program = &ctx.accounts.token_program;


    if current_round.finished && current_round.fee_collected && !current_round.settled && (current_round.round_winning_direction == 1 || current_round.round_winning_direction == 2) {
        let (
            winning_vault,
            losing_vault,
            winning_vault_authority,
            losing_vault_authority,
            winning_round_amount,
            losing_round_amount
        ) = if current_round.round_winning_direction == 1 {

            (
                &mut ctx.accounts.up_token_account, 
                &mut ctx.accounts.down_token_account,
                &mut ctx.accounts.up_token_account_authority,
                &mut ctx.accounts.down_token_account_authority,
                current_round.total_up_amount,
                current_round.total_down_amount
            )

        } else {

            (
                &mut ctx.accounts.down_token_account, 
                &mut ctx.accounts.up_token_account, 
                &mut ctx.accounts.down_token_account_authority, 
                &mut ctx.accounts.up_token_account_authority,
                current_round.total_down_amount,
                current_round.total_up_amount
            )

        };

        if accounts.len() % 2 == 0 && accounts.len() >= 2 {
            let mut index: usize = 0;

            for _i in 0..(accounts.len()/2) {

                let prediction = &mut Account::<'info, UserPrediction>::try_from(&accounts[index]).unwrap();
                let prediction_account_info = prediction.to_account_info();
                let token_account = &Account::<'info, TokenAccount>::try_from(&accounts[index+1]).unwrap();


                require_keys_eq!(prediction.owner, token_account.owner, ErrorCode::PredictionAndTokenAccountOwnerMismatch);

                index+=2;

                if !prediction.settled {

                    if prediction.up_or_down == current_round.round_winning_direction {

                        let winnings = (((losing_round_amount as f64) / (winning_round_amount as f64) * (prediction.amount as f64)) - 0.5).round() as u64;
                        // msg!("{} {}", winnings, prediction.amount);
                        // withdraw winnings from loser vault
                        require!(vault.withdraw(
                            losing_vault,  
                            token_account, 
                            losing_vault_authority, 
                            token_program, 
                            winnings
                        ).is_ok(), ErrorCode::FailedToWithdraw);

                        current_round.total_amount_settled = current_round.total_amount_settled.saturating_add(winnings.into());

                        require!(vault.withdraw(
                            winning_vault, 
                            token_account, 
                            winning_vault_authority, 
                            token_program, 
                            prediction.amount
                        ).is_ok(), ErrorCode::FailedToWithdraw);

                        current_round.total_amount_settled = current_round.total_amount_settled.saturating_add(prediction.amount.into());

                    }

                    prediction.settled = true;
                    current_round.total_predictions_settled = current_round.total_predictions_settled.saturating_add(1);

                    let dst: &mut [u8] = &mut prediction_account_info.try_borrow_mut_data()?;
                    let mut cursor = std::io::Cursor::new(dst);
                    let _write_prediction = prediction.try_serialize(&mut cursor);

                }
            }
        }

        if current_round.total_predictions_settled == current_round.total_predictions {
            current_round.settled = true;          
        }

    }
    Ok(())
}

pub fn update_game<'info>(mut ctx: Context<'_, '_, '_, 'info, UpdateGame<'info>>) -> Result<()> {
    let ctx = &mut ctx;
    let current_round = &mut ctx.accounts.current_round;
    
    let vault = &mut ctx.accounts.vault;
    let fee_vault = &mut ctx.accounts.game_fee_vault;
    let up_vault = &mut ctx.accounts.up_token_account;
    let down_vault = &mut ctx.accounts.down_token_account;
    let up_vault_auth = &mut ctx.accounts.up_token_account_authority;
    let down_vault_auth = &mut ctx.accounts.down_token_account_authority;
    let token_program = &ctx.accounts.token_program;

    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;

    require!(current_round.update_round(price_program, price_feed).is_ok(), ErrorCode::FailedToUpdateRound);

    if current_round.finished && !current_round.fee_collected {
        
        let (
            losings_fee, 
            losing_token_account,
            losing_authority,
        ) = if current_round.round_winning_direction == 1 {
            (
                ((current_round.total_down_amount) / 1000) * 3, 
                down_vault, 
                down_vault_auth
            )
        } else {
            (
                ((current_round.total_up_amount) / 1000) * 3, 
                up_vault, 
                up_vault_auth
            )
        };

        require!(vault.withdraw(losing_token_account, fee_vault, losing_authority, token_program, losings_fee).is_ok(), ErrorCode::FailedToTakeFee);

        if current_round.round_winning_direction == 1 {
            current_round.total_down_amount = current_round.total_down_amount.saturating_sub(losings_fee);
        } else {
            current_round.total_up_amount = current_round.total_up_amount.saturating_sub(losings_fee);
        }

        current_round.fee_collected = true;

    }

    Ok(())
}

pub fn close_game_fee_vault<'info>(ctx: Context<'_, '_, '_, 'info, CloseGameFeeVault<'info>>) -> Result<()> {

    require!(close_token_account( 
        ctx.accounts.game_fee_vault.to_account_info().clone(), 
        ctx.accounts.receiver.to_account_info().clone(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info().clone()
    ).is_ok(), ErrorCode::FailedToCloseUpTokenAccount);
    
    Ok(())
}



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
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), game.key().as_ref(), b"game_fee_vault"], 
        bump, 
        payer = owner,
        token::mint = token_mint,
        token::authority = owner
    )]
    pub game_fee_vault:  Box<Account<'info, TokenAccount>>,

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

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    
    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePredictions<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = game.owner == signer.key() @ ErrorCode::SignerNotOwner
    )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut,
        constraint = current_round.owner == signer.key() @ ErrorCode::SignerNotOwner,
        constraint = current_round.game == game.key() @ ErrorCode::RoundGameKeyNotEqual
    )]
    pub current_round: Box<Account<'info, Round>>,


    #[account(
        mut,
        constraint = vault.owner == signer.key() @ ErrorCode::SignerNotOwner,
        constraint = current_round.owner == vault.owner @ ErrorCode::RoundOwnerNotVaultOwner
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
        constraint = current_round.owner == signer.key() @ ErrorCode::SignerNotOwner,
        constraint = current_round.game == game.key() @ ErrorCode::RoundGameKeyNotEqual
    )]
    pub current_round: Box<Account<'info, Round>>,


    #[account(
        mut,
        constraint = vault.owner == signer.key() @ ErrorCode::SignerNotOwner,
        constraint = current_round.owner == vault.owner @ ErrorCode::RoundOwnerNotVaultOwner
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = game_fee_vault.owner == game_fee_vault_authority.key() @ ErrorCode::GameFeeVaultTokenAccountAuthorityMismatch
    )]
    pub game_fee_vault:  Box<Account<'info, TokenAccount>>,

    /// CHECK:
    #[account(
        constraint = game_fee_vault.owner == game_fee_vault_authority.key() @ ErrorCode::GameFeeVaultTokenAccountAuthorityMismatch
    )]
    pub game_fee_vault_authority: AccountInfo<'info>,

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
        constraint = current_round.price_program_pubkey == price_program.key() @ ErrorCode::RoundPriceProgramNotEqual,
        // constraint = price_feed.owner.eq(&price_program.key()) @ ErrorCode::PriceProgramNotOwnerOfPriceFeed
    )]
    pub price_program: AccountInfo<'info>,

    /// CHECK:
    #[account(
        constraint = current_round.price_feed_pubkey == price_feed.key() @ ErrorCode::RoundPriceFeedNotEqual,
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

    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = game.owner == signer.key() @ ErrorCode::SignerNotOwner,
        close = receiver
    )]
    pub game: Box<Account<'info, Game>>,

    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct CloseGameFeeVault<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = game_fee_vault.owner == signer.key(),
    )]
    pub game_fee_vault:  Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>
}

