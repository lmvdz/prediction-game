use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;

use crate::errors::ErrorCode;

use crate::state::Crank;
use crate::state::RoundHistory;
use crate::state::UserClaimable;
use crate::state::UserPrediction;
use crate::state::Game;
use crate::state::Round;
use crate::state::UserPredictionHistory;
use crate::state::Vault;
use crate::utils::transfer_token_account_signed;

// initialize game
pub fn init_game(ctx: Context<InitializeGame>, oracle: u8, base_symbol: [u8; 16], fee_bps: u16, crank_bps: u16, round_length: i64) -> Result<()> {
    let game_key = ctx.accounts.game.to_account_info().key();
    let mut game = ctx.accounts.game.load_init()?;
    let owner = &ctx.accounts.owner;
    let vault = &mut ctx.accounts.vault;

    game.owner = owner.key();
    game.address = game_key;

    game.vault = vault.key();

    game.unclaimed_fees = 0;

    game.round_length = round_length;
    game.round_number = 1_u32;
    game.total_volume = 0;
    game.total_volume_rollover = 0;
    game.base_symbol = base_symbol;
    
    game.oracle = oracle;
    game.price_program = ctx.accounts.price_program.key();
    game.price_feed = ctx.accounts.price_feed.key();

    game.fee_bps = fee_bps;
    game.crank_bps = crank_bps;

    game.round_history = Pubkey::default();
    game.user_prediction_history = Pubkey::default();

    Ok(())
}

pub fn settle_predictions<'info>(mut ctx: Context<'_, '_, '_, 'info, SettlePredictions<'info>>) -> Result<()> {

    let ctx = &mut ctx;
    

    // remaining accounts should be passed in groups of 2
    // first is the user_prediction account
    // second is the associated user_claimable account
    // CHECK: the user field on both should be the same
    let accounts = ctx.remaining_accounts;

    // current_round of the game
    // CHECK: current_round.game == game.key()
    let current_round_key = ctx.accounts.current_round.to_account_info().key();
    let mut current_round = ctx.accounts.current_round.load_mut()?;
    // CHECK: game.current_round == current_round.key()
    let game = ctx.accounts.game.load()?;
    let vault = &ctx.accounts.vault;

    require_keys_eq!(game.current_round, current_round_key);
    require_keys_eq!(vault.to_account_info().key(), game.vault);
    require!(current_round.finished, ErrorCode::RoundNotFinished);
    require!(current_round.fee_collected, ErrorCode::RoundFeeNotCollected);
    require!(!current_round.settled, ErrorCode::RoundAlreadySettled);
    require!(!current_round.cranks_paid, ErrorCode::RoundCranksAlreadyPaid);

    // The account which is calling 
    let mut crank = ctx.accounts.crank.load_mut()?;

    if !crank.last_crank_round.eq(&current_round_key) {
        current_round.total_unique_crankers = current_round.total_unique_crankers.saturating_add(1);
        crank.last_crank_round = current_round_key;
        crank.cranks = 1;
    } else {
        crank.cranks = crank.cranks.saturating_add(1);
    }
    current_round.total_cranks = current_round.total_cranks.saturating_add(1);


    if current_round.finished && current_round.fee_collected && !current_round.settled && (current_round.round_winning_direction == 1 || current_round.round_winning_direction == 2) {
        
        let (winning_round_amount, losing_round_amount) = if current_round.round_winning_direction == 1 {
            ( current_round.total_up_amount, current_round.total_down_amount )
        } else {
            ( current_round.total_down_amount, current_round.total_up_amount )
        };

        if accounts.len() % 2 == 0 && accounts.len() >= 2 {

            for i in 0..(accounts.len()/2) {

                let prediction_loader = AccountLoader::<'info, UserPrediction>::try_from(&accounts[i*2]).unwrap();
                let mut prediction = prediction_loader.load_mut()?;

                let user_claimable_loader = AccountLoader::<'info, UserClaimable>::try_from(&accounts[(i*2)+1]).unwrap();
                let mut user_claimable = user_claimable_loader.load_mut()?;

                require_keys_eq!(prediction.user, user_claimable.user, ErrorCode::PredictionAndClaimUserMismatch);

                // find first claim 
                let mut some_user_claim = user_claimable.claims.iter_mut().find(|claim| claim.mint.eq(&vault.token_mint.key()) && claim.vault.eq(&vault.address.key()));

                some_user_claim = if some_user_claim.is_none() {
                    user_claimable.claims.iter_mut().find(|claim| claim.mint.eq(&Pubkey::default()) && claim.vault.eq(&Pubkey::default()))
                } else {
                    some_user_claim
                };

                require!(some_user_claim.is_some(), ErrorCode::NoAvailableClaimFound);

                let user_claim = some_user_claim.unwrap();

                if !prediction.settled {
                    
                    if !current_round.invalid {
                        if winning_round_amount.gt(&0) {
                            // return initial amount and winnings to winners 
                            if prediction.up_or_down == current_round.round_winning_direction {
    
                                let winnings = (( (losing_round_amount as f64) / (winning_round_amount as f64) * (prediction.amount as f64) ) - 0.5).round() as u64;
                                
                                current_round.total_amount_settled = current_round.total_amount_settled.saturating_add(winnings);
        
                                let initial_amount = prediction.amount;
                                current_round.total_amount_settled = current_round.total_amount_settled.saturating_add(initial_amount);
        
                                user_claim.amount = user_claim.amount.saturating_add(winnings).saturating_add(initial_amount);

                                if user_claim.mint.eq(&Pubkey::default()) && user_claim.vault.eq(&Pubkey::default()) {
                                    user_claim.mint = vault.token_mint.key();
                                    user_claim.vault = vault.address.key();
                                }
                                
                            }
                        } else {

                            // return initial amount minus fees to losers
                            let initial_amount = prediction.amount.saturating_sub(((prediction.amount) / 10000) * game.fee_bps as u64);
                            current_round.total_amount_settled = current_round.total_amount_settled.saturating_add(initial_amount);
    
                            user_claim.amount = user_claim.amount.saturating_add(initial_amount);

                            if user_claim.mint.eq(&Pubkey::default()) && user_claim.vault.eq(&Pubkey::default()) {
                                user_claim.mint = vault.token_mint.key();
                                user_claim.vault = vault.address.key();
                            }
                        }
                    } else {
                        // return initial amount minus fees to all
                        current_round.total_amount_settled = current_round.total_amount_settled.saturating_add(prediction.amount);

                        user_claim.amount = user_claim.amount.saturating_add(prediction.amount);

                        if user_claim.mint.eq(&Pubkey::default()) && user_claim.vault.eq(&Pubkey::default()) {
                            user_claim.mint = vault.token_mint.key();
                            user_claim.vault = vault.key();
                        }
                    }

                    // no need to write when using an AccountLoader
                    // let dst: &mut [u8] = &mut user_claim_info.try_borrow_mut_data()?;
                    // let mut cursor = std::io::Cursor::new(dst);
                    // let _write_user_claim = user_claimable.try_serialize(&mut cursor);

                    prediction.settled = true;
                    current_round.total_predictions_settled = current_round.total_predictions_settled.saturating_add(1);

                    // let dst: &mut [u8] = &mut prediction_account_info.try_borrow_mut_data()?;
                    // let mut cursor = std::io::Cursor::new(dst);
                    // let _write_prediction = prediction.try_serialize(&mut cursor);

                }
            }
        }

        if current_round.total_predictions_settled == current_round.total_predictions {
            current_round.settled = true;          
        }

    }
    Ok(())
}

pub fn payout_cranks<'info>(mut ctx: Context<'_, '_, '_, 'info, PayoutCranks<'info>>) -> Result<()> {
    let ctx = &mut ctx;
    let current_round_key = ctx.accounts.current_round.to_account_info().key();
    let mut current_round = ctx.accounts.current_round.load_mut()?;
    let game = ctx.accounts.game.load()?;
    let vault = &ctx.accounts.vault;
    let round_key = current_round_key;

    require_keys_eq!(game.current_round, current_round_key);
    require_keys_eq!(game.vault, vault.to_account_info().key());
    require!(current_round.finished, ErrorCode::RoundNotFinished);
    require!(current_round.fee_collected, ErrorCode::RoundFeeNotCollected);
    require!(current_round.settled, ErrorCode::RoundNotSettled);
    require!(!current_round.cranks_paid, ErrorCode::RoundCranksAlreadyPaid);

    let accounts = ctx.remaining_accounts;

    if accounts.len() % 2 == 0 && accounts.len() >= 2 {

        for i in 0..(accounts.len()/2) {

            // let crank_account_info = accounts[index].to_account_info().clone();
            let crank_loader = &mut AccountLoader::<'info, Crank>::try_from(&accounts[i*2]).unwrap();
            let mut crank = crank_loader.load_mut()?;

            // let token_account = &Account::<'info, TokenAccount>::try_from(&accounts[index+1]).unwrap();
            // let user_claim_info = accounts[index+1].to_account_info().clone();
            let user_claimable_loader = AccountLoader::<'info, UserClaimable>::try_from(&accounts[(i*2) + 1]).unwrap();
            let mut user_claimable = user_claimable_loader.load_mut()?;

            require_keys_eq!(crank.user, user_claimable.user, ErrorCode::UserClaimableCrankUserMismatch);

            // find first claim 
            let mut some_user_claim = user_claimable.claims.iter_mut().find(|claim| claim.mint.eq(&vault.token_mint.key()) && claim.vault.eq(&vault.address.key()));

            some_user_claim = if some_user_claim.is_none() {
                user_claimable.claims.iter_mut().find(|claim| claim.mint.eq(&Pubkey::default()) && claim.vault.eq(&Pubkey::default()))
            } else {
                some_user_claim
            };

            require!(some_user_claim.is_some(), ErrorCode::NoAvailableClaimFound);

            let user_claim = some_user_claim.unwrap();

            if !crank.last_paid_crank_round.eq(&round_key) && crank.last_crank_round.eq(&round_key) {
                // 25% of the fee collected goes to crankers
                let crank_pay = if current_round.invalid {
                    ( ( (crank.cranks as f64) / (current_round.total_cranks as f64) * (((current_round.total_fee_collected as f64) / 10000.0 ) * game.crank_bps as f64)) - 0.5).round() as u64
                } else {
                    0
                };

                if crank_pay > 0 {
                    user_claim.amount = user_claim.amount.saturating_add(crank_pay);
                
                    if user_claim.mint.eq(&Pubkey::default()) && user_claim.vault.eq(&Pubkey::default()) {
                        user_claim.mint = vault.token_mint.key();
                        user_claim.vault = vault.address.key();
                    }
                }

                

                // let dst: &mut [u8] = &mut user_claim_info.try_borrow_mut_data()?;
                // let mut cursor = std::io::Cursor::new(dst);
                // let _write_user_claim = user_claim.try_serialize(&mut cursor);

                crank.last_paid_crank_round = current_round_key;
                
                current_round.total_cranks_paid = current_round.total_cranks_paid.saturating_add(1);
                current_round.total_amount_paid_to_cranks = current_round.total_amount_paid_to_cranks.saturating_add(crank_pay);
            }
        }
    }

    if current_round.total_cranks_paid == current_round.total_unique_crankers {
        current_round.cranks_paid = true;
    }

    Ok(())

}

pub fn claim_fee<'info>(mut ctx: Context<'_, '_, '_, 'info, ClaimFee<'info>>) -> Result<()> {

    let ctx = &mut ctx;
    let mut game = ctx.accounts.game.load_mut()?;
    let vault = &mut ctx.accounts.vault;

    require_keys_eq!(game.owner, ctx.accounts.signer.to_account_info().key());
    require_keys_eq!(vault.vault_ata_authority, ctx.accounts.vault_ata_authority.to_account_info().key(), ErrorCode::GameVaultTokenAccountAuthorityMismatch);
    require_keys_eq!(ctx.accounts.vault_ata.to_account_info().key(), vault.vault_ata, ErrorCode::GameVaultTokenAccountAuthorityMismatch);
    require_keys_eq!(ctx.accounts.fee_vault_ata.to_account_info().key(), vault.fee_vault_ata, ErrorCode::GameFeeVaultTokenAccountAuthorityMismatch);

    

    let vault_ata = &mut ctx.accounts.vault_ata;
    let vault_ata_key = &vault_ata.key();
    let vault_ata_authority = & ctx.accounts.vault_ata_authority;
    let vault_ata_authority_nonce = vault.vault_ata_authority_nonce;

    let fee_vault_ata = &mut ctx.accounts.fee_vault_ata;

    let unclaimed_fees = game.unclaimed_fees;
    let token_program = &ctx.accounts.token_program;


    let signature_seeds = [vault_ata_key.as_ref(), &[vault_ata_authority_nonce]];
    let signers = &[&signature_seeds[..]];

    require!(transfer_token_account_signed(vault_ata, fee_vault_ata, vault_ata_authority, signers, token_program, unclaimed_fees).is_ok(), ErrorCode::FailedToTakeFee);

    game.unclaimed_fees = 0;

    Ok(())
}

pub fn withdraw_fee<'info>(mut ctx: Context<'_, '_, '_, 'info, WithdrawFee<'info>>) -> Result<()> {

    let ctx = &mut ctx;
    let vault = &ctx.accounts.vault;
    let game = ctx.accounts.game.load()?;

    require_keys_eq!(game.owner, ctx.accounts.signer.to_account_info().key());
    
    
    let fee_vault_ata = &mut ctx.accounts.fee_vault_ata;
    let fee_vault_ata_key = &fee_vault_ata.key();
    require_keys_eq!(*fee_vault_ata_key, vault.fee_vault_ata, ErrorCode::GameVaultMismatch);
    let fee_vault_ata_authority_nonce = vault.fee_vault_ata_authority_nonce;
    let fee_vault_ata_authority = & ctx.accounts.fee_vault_ata_authority;
    require_keys_eq!(fee_vault_ata.owner, fee_vault_ata_authority.to_account_info().key(), ErrorCode::GameVaultTokenAccountAuthorityMismatch);


    let to_token_account = &mut ctx.accounts.to_token_account;
    require_keys_eq!(to_token_account.owner, ctx.accounts.signer.to_account_info().key());
    let token_program = &ctx.accounts.token_program;

    let signature_seeds = [fee_vault_ata_key.as_ref(), &[fee_vault_ata_authority_nonce]];
    let signers = &[&signature_seeds[..]];

    require!(transfer_token_account_signed(fee_vault_ata, to_token_account, fee_vault_ata_authority, signers, token_program, fee_vault_ata.amount).is_ok(), ErrorCode::FailedToTakeFee);

    Ok(())
}

pub fn collect_fee<'info>(mut ctx: Context<'_, '_, '_, 'info, CollectFee<'info>>) -> Result<()> {

    let ctx = &mut ctx;
    let current_round_key = ctx.accounts.current_round.to_account_info().key();
    let mut current_round = ctx.accounts.current_round.load_mut()?;
    let mut game = ctx.accounts.game.load_mut()?;

    require_keys_eq!(game.current_round, current_round_key);
    require!(current_round.finished, ErrorCode::RoundNotFinished);
    require!(!current_round.fee_collected, ErrorCode::FeeAlreadyCollected);
    require!(!current_round.settled, ErrorCode::RoundAlreadySettled);
    require!(!current_round.cranks_paid, ErrorCode::RoundCranksAlreadyPaid);

    let mut crank = ctx.accounts.crank.load_mut()?;

    if !crank.last_crank_round.eq(&current_round_key) {
        current_round.total_unique_crankers = current_round.total_unique_crankers.saturating_add(1);
        crank.last_crank_round = current_round_key;
        crank.cranks = 1;
    } else {
        crank.cranks = crank.cranks.saturating_add(1);
    }

    current_round.total_cranks = current_round.total_cranks.saturating_add(1);

    if !current_round.invalid {
        let total_losings_fee = if current_round.round_winning_direction == 1 {
            ((current_round.total_down_amount) / 10000) * game.fee_bps as u64
        } else {
            ((current_round.total_up_amount) / 10000) * game.fee_bps as u64
        };
        // the total amount of fee collected
        current_round.total_fee_collected = total_losings_fee;
    
        // remove crank_bps from fee collected
        let losings_fee_remaining = total_losings_fee.saturating_sub((total_losings_fee / 10000) * game.crank_bps as u64);
    
        // move total_fee minus crank_bps to fee_vault
        if losings_fee_remaining.gt(&0_u64) {
            game.unclaimed_fees  = game.unclaimed_fees.saturating_add(losings_fee_remaining);
        }
    
        if current_round.round_winning_direction == 1 {
            current_round.total_down_amount = current_round.total_down_amount.saturating_sub(total_losings_fee);
        } else {
            current_round.total_up_amount = current_round.total_up_amount.saturating_sub(total_losings_fee);
        }
    } else {
        current_round.total_fee_collected = 0;
    }
    current_round.fee_collected = true;

    

    Ok(())
}

pub fn update_game<'info>(mut ctx: Context<'_, '_, '_, 'info, UpdateGame<'info>>) -> Result<()> {
    let ctx = &mut ctx;
    let current_round_key = ctx.accounts.current_round.to_account_info().key();
    let mut current_round = ctx.accounts.current_round.load_mut()?;
    let game = ctx.accounts.game.load()?;
    let game_key = ctx.accounts.game.to_account_info().key();

    require_keys_eq!(current_round.game, game_key, ErrorCode::RoundGameKeyNotEqual);
    require_keys_eq!(game.price_program, ctx.accounts.price_program.to_account_info().key(), ErrorCode::RoundPriceProgramNotEqual);
    require_keys_eq!(game.price_feed, ctx.accounts.price_feed.to_account_info().key(), ErrorCode::RoundPriceFeedNotEqual);

    let mut crank = ctx.accounts.crank.load_mut()?;

    if !crank.last_crank_round.eq(&current_round_key) {
        current_round.total_unique_crankers = current_round.total_unique_crankers.saturating_add(1);
        crank.last_crank_round = current_round_key;
        crank.cranks = 1;
    } else {
        crank.cranks = crank.cranks.saturating_add(1);
    }
    current_round.total_cranks = current_round.total_cranks.saturating_add(1);


    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;
    let oracle = ctx.accounts.game.load()?.oracle;

    require!(current_round.update_round(game, oracle,  price_program, price_feed).is_ok(), ErrorCode::FailedToUpdateRound);

    Ok(())
}

pub fn init_game_history(ctx: Context<InitGameHistory>) -> Result<()> {

    let mut game = ctx.accounts.game.load_mut()?;

    require_keys_eq!(game.round_history, Pubkey::default());
    require_keys_eq!(game.user_prediction_history, Pubkey::default());
    require_keys_eq!(game.owner, ctx.accounts.owner.to_account_info().key());

    let mut round_history = ctx.accounts.round_history.load_init()?;
    let mut user_prediction_history = ctx.accounts.user_prediction_history.load_init()?;
    
    round_history.address = ctx.accounts.round_history.to_account_info().key();
    user_prediction_history.address = ctx.accounts.user_prediction_history.to_account_info().key();

    round_history.game = game.address;
    user_prediction_history.game = game.address;

    game.round_history = ctx.accounts.round_history.to_account_info().key();
    game.user_prediction_history = ctx.accounts.user_prediction_history.to_account_info().key();

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [ env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), vault.key().as_ref(), price_program.key().as_ref(), price_feed.key().as_ref(), b"game"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Game>() + 8
    )]
    pub game: AccountLoader<'info, Game>,

    #[account(
        constraint = vault.owner == owner.key()
    )]
    pub vault: Box<Account<'info, Vault>>,

    /// CHECK:
    pub price_program: AccountInfo<'info>,

    /// CHECK:
    pub price_feed: AccountInfo<'info>,
    
    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitGameHistory<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account(zero)]
    pub round_history: AccountLoader<'info, RoundHistory>,

    #[account(zero)]
    pub user_prediction_history: AccountLoader<'info, UserPredictionHistory>,
    
    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CollectFee<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub crank: AccountLoader<'info, Crank>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account(mut)]
    pub current_round: AccountLoader<'info, Round>,


    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimFee<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account(
        mut
    )]
    pub vault: Box<Account<'info, Vault>>,

    /// CHECK: 
    #[account()]
    pub vault_ata_authority: AccountInfo<'info>,

    #[account(mut)]
    pub vault_ata:  Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub fee_vault_ata:  Box<Account<'info, TokenAccount>>,


    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawFee<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account()]
    pub game: AccountLoader<'info, Game>,

    #[account(
        mut
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(mut)]
    pub fee_vault_ata: Box<Account<'info, TokenAccount>>,

    /// CHECK: 
    #[account()]
    pub fee_vault_ata_authority: AccountInfo<'info>,

    #[account(mut)]
    pub to_token_account: Box<Account<'info, TokenAccount>>,


    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PayoutCranks<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account()]
    pub vault: Box<Account<'info, Vault>>,

    #[account(mut)]
    pub current_round: AccountLoader<'info, Round>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePredictions<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account()]
    pub vault: Box<Account<'info, Vault>>,

    #[account(mut)]
    pub crank: AccountLoader<'info, Crank>,

    #[account(mut)]
    pub current_round: AccountLoader<'info, Round>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateGame<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account(mut)]
    pub crank: AccountLoader<'info, Crank>,

    #[account(mut)]
    pub current_round: AccountLoader<'info, Round>,

    /// CHECK:
    #[account()]
    pub price_program: AccountInfo<'info>,

    /// CHECK:
    #[account()]
    pub price_feed: AccountInfo<'info>,

    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminCloseGame<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = game.load_mut()?.owner == signer.key() @ ErrorCode::SignerNotOwner,
        close = receiver
    )]
    pub game: AccountLoader<'info, Game>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminCloseGameHistory<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(mut, close = game_history_close_receiver)]
    pub user_prediction_history: AccountLoader<'info, UserPredictionHistory>,

    #[account(mut, close = game_history_close_receiver)]
    pub round_history: AccountLoader<'info, RoundHistory>,

    #[account(
        mut
    )]
    pub game_history_close_receiver: SystemAccount<'info>
}

#[derive(Accounts)]
pub struct AdminCloseRoundHistory<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(mut, close = round_history_close_receiver)]
    pub round_history: AccountLoader<'info, RoundHistory>,

    #[account(
        mut
    )]
    pub round_history_close_receiver: SystemAccount<'info>
}

#[derive(Accounts)]
pub struct AdminCloseUserPredictionHistory<'info> {
    #[account()]
    pub signer: Signer<'info>,

    #[account(mut, close = user_prediction_history_close_receiver)]
    pub user_prediction_history: AccountLoader<'info, UserPredictionHistory>,

    #[account(
        mut
    )]
    pub user_prediction_history_close_receiver: SystemAccount<'info>
}