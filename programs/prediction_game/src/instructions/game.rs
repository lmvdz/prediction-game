use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;

use crate::errors::ErrorCode;

use crate::state::Crank;
use crate::state::UserPrediction;
use crate::state::User;
use crate::state::Game;
use crate::state::Round;
use crate::state::Vault;
use crate::utils::transfer_token_account_signed;

// initialize game
pub fn init_game(ctx: Context<InitializeGame>, oracle: u8, base_symbol: String, fee_bps: u16, crank_bps: u16, round_length: i64) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let owner = &ctx.accounts.owner;
    let vault = &mut ctx.accounts.vault;
    let game_pubkey = game.key();

    game.owner = owner.key();
    game.address = game_pubkey;

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

    Ok(())
}

pub fn settle_predictions<'info>(mut ctx: Context<'_, '_, '_, 'info, SettlePredictions<'info>>) -> Result<()> {

    let ctx = &mut ctx;
    let accounts = ctx.remaining_accounts;
    let current_round = &mut ctx.accounts.current_round;
    let game = &ctx.accounts.game;
    

    let crank = &mut ctx.accounts.crank;

    if !crank.last_crank_round.eq(&current_round.key()) {
        current_round.total_unique_crankers = current_round.total_unique_crankers.saturating_add(1);
        crank.last_crank_round = current_round.key();
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
            let mut index: usize = 0;

            for _i in 0..(accounts.len()/2) {

                let prediction = &mut Account::<'info, UserPrediction>::try_from(&accounts[index]).unwrap();
                let prediction_account_info = prediction.to_account_info();
                // let token_account = &Account::<'info, TokenAccount>::try_from(&accounts[index+1]).unwrap();
                let user_account = &mut Account::<'info, User>::try_from(&accounts[index+1]).unwrap();
                let user_account_info = user_account.to_account_info();


                require_keys_eq!(prediction.owner, user_account.owner, ErrorCode::PredictionAndUserOwnerMismatch);

                index += 2;

                if !prediction.settled {
                    
                    if !current_round.invalid {
                        if winning_round_amount.gt(&0) {
                            // return initial amount and winnings to winners 
                            if prediction.up_or_down == current_round.round_winning_direction {
    
                                let winnings = (( (losing_round_amount as f64) / (winning_round_amount as f64) * (prediction.amount as f64) ) - 0.5).round() as u64;
                                
                                current_round.total_amount_settled = current_round.total_amount_settled.saturating_add(winnings);
        
                                let initial_amount = prediction.amount;
                                current_round.total_amount_settled = current_round.total_amount_settled.saturating_add(initial_amount);
        
                                user_account.claimable = user_account.claimable.saturating_add(winnings).saturating_add(initial_amount);
                                
                            }
                        } else {

                            // return initial amount minus fees to losers
                            let initial_amount = prediction.amount.saturating_sub(((prediction.amount) / 10000) * game.fee_bps as u64);
                            current_round.total_amount_settled = current_round.total_amount_settled.saturating_add(initial_amount);
    
                            user_account.claimable = user_account.claimable.saturating_add(initial_amount);
                        }
                    } else {
                        // return initial amount minus fees to all
                        current_round.total_amount_settled = current_round.total_amount_settled.saturating_add(prediction.amount);

                        user_account.claimable = user_account.claimable.saturating_add(prediction.amount);
                    }

                    let dst: &mut [u8] = &mut user_account_info.try_borrow_mut_data()?;
                    let mut cursor = std::io::Cursor::new(dst);
                    let _write_user_account = user_account.try_serialize(&mut cursor);

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

pub fn payout_cranks<'info>(mut ctx: Context<'_, '_, '_, 'info, PayoutCranks<'info>>) -> Result<()> {
    let ctx = &mut ctx;
    let current_round = &mut ctx.accounts.current_round;
    let game = &ctx.accounts.game;

    let round_key = current_round.key();
    let accounts = ctx.remaining_accounts;

    if accounts.len() % 2 == 0 && accounts.len() >= 2 {
        let mut index: usize = 0;

        for _i in 0..(accounts.len()/2) {

            let crank = &mut Account::<'info, Crank>::try_from(&accounts[index]).unwrap();
            let crank_account_info = crank.to_account_info();
            // let token_account = &Account::<'info, TokenAccount>::try_from(&accounts[index+1]).unwrap();
            let user_account = &mut Account::<'info, User>::try_from(&accounts[index+1]).unwrap();
            let user_account_info = user_account.to_account_info();

            index+=2;

            if !crank.last_paid_crank_round.eq(&round_key) && crank.last_crank_round.eq(&round_key) {
                // 25% of the fee collected goes to crankers
                let crank_pay = if current_round.invalid {
                    ( ( (crank.cranks as f64) / (current_round.total_cranks as f64) * (((current_round.total_fee_collected as f64) / 10000.0 ) * game.crank_bps as f64)) - 0.5).round() as u64
                } else {
                    0
                };

                user_account.claimable = user_account.claimable.saturating_add(crank_pay);

                let dst: &mut [u8] = &mut user_account_info.try_borrow_mut_data()?;
                let mut cursor = std::io::Cursor::new(dst);
                let _write_user_account = user_account.try_serialize(&mut cursor);

                crank.last_paid_crank_round = current_round.key();

                let dst: &mut [u8] = &mut crank_account_info.try_borrow_mut_data()?;
                let mut cursor = std::io::Cursor::new(dst);
                let _write_crank = crank.try_serialize(&mut cursor);
                
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
    let game = &mut ctx.accounts.game;
    let vault = &mut ctx.accounts.vault;
    

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
    
    let fee_vault_ata = &mut ctx.accounts.fee_vault_ata;
    let fee_vault_ata_key = &fee_vault_ata.key();
    let fee_vault_ata_authority_nonce = vault.fee_vault_ata_authority_nonce;
    let fee_vault_ata_authority = & ctx.accounts.fee_vault_ata_authority;

    let to_token_account = &mut ctx.accounts.to_token_account;
    
    let token_program = &ctx.accounts.token_program;

    let signature_seeds = [fee_vault_ata_key.as_ref(), &[fee_vault_ata_authority_nonce]];
    let signers = &[&signature_seeds[..]];

    require!(transfer_token_account_signed(fee_vault_ata, to_token_account, fee_vault_ata_authority, signers, token_program, fee_vault_ata.amount).is_ok(), ErrorCode::FailedToTakeFee);

    Ok(())
}

pub fn collect_fee<'info>(mut ctx: Context<'_, '_, '_, 'info, CollectFee<'info>>) -> Result<()> {

    let ctx = &mut ctx;
    let current_round = &mut ctx.accounts.current_round;
    let game = &mut ctx.accounts.game;

    let crank = &mut ctx.accounts.crank;

    if !crank.last_crank_round.eq(&current_round.key()) {
        current_round.total_unique_crankers = current_round.total_unique_crankers.saturating_add(1);
        crank.last_crank_round = current_round.key();
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
    let current_round = &mut ctx.accounts.current_round;

    let crank = &mut ctx.accounts.crank;

    if !crank.last_crank_round.eq(&current_round.key()) {
        current_round.total_unique_crankers = current_round.total_unique_crankers.saturating_add(1);
        crank.last_crank_round = current_round.key();
        crank.cranks = 1;
    } else {
        crank.cranks = crank.cranks.saturating_add(1);
    }
    current_round.total_cranks = current_round.total_cranks.saturating_add(1);


    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;
    let oracle = ctx.accounts.game.oracle;

    require!(current_round.update_round(oracle, price_program, price_feed).is_ok(), ErrorCode::FailedToUpdateRound);

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
    pub game: Box<Account<'info, Game>>,

    #[account(
        constraint = vault.owner == owner.key()
    )]
    pub vault: Box<Account<'info, Vault>>,

    /// CHECK:
    pub price_program: AccountInfo<'info>,

    /// CHECK:
    pub price_feed: AccountInfo<'info>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    
    pub token_program: Program<'info, Token>,
    
    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CollectFee<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub crank: Box<Account<'info, Crank>>,

    #[account(mut, constraint = game.current_round == current_round.key())]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut,
        constraint = current_round.finished @ ErrorCode::RoundNotFinished,
        constraint = !current_round.fee_collected @ ErrorCode::FeeAlreadyCollected,
        constraint = !current_round.settled @ ErrorCode::RoundAlreadySettled,
        constraint = !current_round.cranks_paid @ ErrorCode::RoundCranksAlreadyPaid
    )]
    pub current_round: Box<Account<'info, Round>>,


    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimFee<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut, 
        constraint = game.owner == signer.key()
    )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut
    )]
    pub vault: Box<Account<'info, Vault>>,

    /// CHECK: 
    #[account(
        constraint = vault.vault_ata_authority == vault_ata_authority.key() @ ErrorCode::GameVaultTokenAccountAuthorityMismatch
    )]
    pub vault_ata_authority: AccountInfo<'info>,

    #[account(
        mut,
        constraint = vault_ata.key() == vault.vault_ata @ ErrorCode::GameFeeVaultTokenAccountAuthorityMismatch
    )]
    pub vault_ata:  Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = fee_vault_ata.key() == vault.fee_vault_ata @ ErrorCode::GameFeeVaultTokenAccountAuthorityMismatch
    )]
    pub fee_vault_ata:  Box<Account<'info, TokenAccount>>,


    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawFee<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut, 
        constraint = game.owner == signer.key()
    )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = fee_vault_ata.key() == vault.fee_vault_ata @ ErrorCode::GameVaultMismatch
    )]
    pub fee_vault_ata: Box<Account<'info, TokenAccount>>,

    /// CHECK: 
    #[account(
        constraint = fee_vault_ata.owner == fee_vault_ata_authority.key() @ ErrorCode::GameVaultTokenAccountAuthorityMismatch
    )]
    pub fee_vault_ata_authority: AccountInfo<'info>,

    #[account(
        mut,
        constraint = to_token_account.owner == signer.key()
    )]
    pub to_token_account: Box<Account<'info, TokenAccount>>,


    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PayoutCranks<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut, constraint = game.current_round == current_round.key())]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut,
        constraint = current_round.finished @ ErrorCode::RoundNotFinished,
        constraint = current_round.fee_collected @ ErrorCode::RoundFeeNotCollected,
        constraint = current_round.settled @ ErrorCode::RoundNotSettled,
        constraint = !current_round.cranks_paid @ ErrorCode::RoundCranksAlreadyPaid,
    )]
    pub current_round: Box<Account<'info, Round>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePredictions<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut, constraint = game.current_round == current_round.key())]
    pub game: Box<Account<'info, Game>>,

    #[account(mut)]
    pub crank: Box<Account<'info, Crank>>,

    #[account(
        mut,
        constraint = current_round.finished @ ErrorCode::RoundNotFinished,
        constraint = current_round.fee_collected @ ErrorCode::RoundFeeNotCollected
    )]
    pub current_round: Box<Account<'info, Round>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateGame<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut
    )]
    pub game: Box<Account<'info, Game>>,

    #[account(mut)]
    pub crank: Box<Account<'info, Crank>>,

    #[account(
        mut,
        constraint = current_round.game == game.key() @ ErrorCode::RoundGameKeyNotEqual
    )]
    pub current_round: Box<Account<'info, Round>>,


    /// CHECK:
    #[account(
        constraint = game.price_program == price_program.key() @ ErrorCode::RoundPriceProgramNotEqual,
    )]
    pub price_program: AccountInfo<'info>,

    /// CHECK:
    #[account(
        constraint = game.price_feed == price_feed.key() @ ErrorCode::RoundPriceFeedNotEqual,
    )]
    pub price_feed: AccountInfo<'info>,

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
