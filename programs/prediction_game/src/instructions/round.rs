use std::cell::RefMut;

use anchor_lang::prelude::*;

use crate::errors::ErrorCode;

use crate::state::{Round, Game, Crank, get_price, RoundHistory, RoundHistoryItem};

pub fn init_first_round(ctx: Context<InitFirstRound>) -> Result<()> {
    let round_key = ctx.accounts.round.to_account_info().key();
    let mut round = ctx.accounts.round.load_init()?;
    let game_key = ctx.accounts.game.to_account_info().key();
    let mut game = ctx.accounts.game.load_mut()?;

    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;

    require_keys_eq!(game.price_program, price_program.to_account_info().key(), ErrorCode::RoundPriceProgramNotEqual);
    require_keys_eq!(game.price_feed, price_feed.to_account_info().key(), ErrorCode::RoundPriceFeedNotEqual);
    
    let oracle = game.oracle;

    game.current_round = round_key;
    game.previous_round = round_key;

    round.owner = game.owner.key();
    round.game = game_key;
    round.address = round_key;

    round.round_number = 1_u32; // starting round is 1

    let now = Clock::get()?.unix_timestamp;

    round.round_length = game.round_length;

    round.round_start_time = now;
    round.round_current_time = now;
    round.round_time_difference = 0;

    round.round_predictions_allowed = true;

    let (price, decimals) = get_price(oracle, price_program, price_feed).unwrap_or((0, 0)); // production & devnet
    // let price = 0; // localnet

    round.round_price_decimals = decimals; // production & devnet
    // round.round_price_decimals = 1;

    round.round_start_price = price;
    round.round_current_price = price;
    round.round_price_difference = 0;

    

    round.finished = false;
    round.invalid = false;
    round.settled = false;
    round.fee_collected = false;
    round.cranks_paid = false;

    round.total_fee_collected = 0;

    round.total_amount_settled = 0;
    round.total_predictions = 0;
    round.total_predictions_settled = 0;
    
    round.total_unique_crankers = 0;
    round.total_cranks = 0;
    round.total_amount_paid_to_cranks = 0;
    round.total_cranks_paid = 0;

    Ok(())
}


fn init_round_shared<'info>(
    next_round_loader: &AccountLoader<'info, Round>, 
    current_round_loader: &AccountLoader<'info, Round>,
    game_loader: &AccountLoader<'info, Game>, 
    round_history: &mut RefMut<RoundHistory>, 
    price_program: &AccountInfo<'info>, 
    price_feed: &AccountInfo<'info>
) -> Result<()> {
    let next_round_key = next_round_loader.to_account_info().key();
    let current_round_key = current_round_loader.to_account_info().key();
    let game_key = game_loader.to_account_info().key();

    let mut next_round = next_round_loader.load_init()?;
    let current_round = current_round_loader.load_mut()?;
    let mut game = game_loader.load_mut()?;

    require_keys_eq!(current_round_key, game.current_round, ErrorCode::RoundKeyNotGameCurrentKey);
    require!(current_round.finished, ErrorCode::RoundNotFinished);
    require!(current_round.fee_collected, ErrorCode::RoundFeeNotCollected);
    require!(current_round.settled, ErrorCode::RoundNotSettled);
    require!(current_round.cranks_paid, ErrorCode::RoundCranksNotPaid);

    require_keys_eq!(game.price_program, price_program.to_account_info().key(), ErrorCode::RoundPriceProgramNotEqual);
    require_keys_eq!(game.price_feed, price_feed.to_account_info().key(), ErrorCode::RoundPriceFeedNotEqual);

    game.current_round = next_round_key;
    game.previous_round = current_round_key;


    if game.total_volume.saturating_add(current_round.total_up_amount.into()).eq(&u128::MAX) {
        let leftover = game.total_volume.saturating_sub(u128::MAX.saturating_sub(current_round.total_up_amount.into()));
        game.total_volume_rollover += 1;
        game.total_volume = leftover;
    } else {
        game.total_volume = game.total_volume.saturating_add(current_round.total_up_amount.into());
    }

    if game.total_volume.saturating_add(current_round.total_down_amount.into()).eq(&u128::MAX) {
        let leftover = game.total_volume.saturating_sub(u128::MAX.saturating_sub(current_round.total_down_amount.into()));
        game.total_volume_rollover += 1;
        game.total_volume = leftover;
    } else {
        game.total_volume = game.total_volume.saturating_add(current_round.total_down_amount.into());
    }

    next_round.owner = game.owner.key();
    next_round.game = game_key;
    next_round.address = next_round_key;

    next_round.round_number = if {current_round.round_number}.eq(&u32::MAX) {
        1
    } else {
        current_round.round_number.saturating_add(1)
    };

    game.round_number = next_round.round_number;

    let now = Clock::get()?.unix_timestamp;

    next_round.round_length = game.round_length;

    next_round.round_start_time = now;
    next_round.round_current_time = now;
    next_round.round_time_difference = 0;

    next_round.round_predictions_allowed = true;

    let (price, _decimals) = get_price(game.oracle, price_program, price_feed).unwrap_or((0, 0));
    // let price = 0;

    next_round.round_start_price = price;
    next_round.round_current_price = price;
    next_round.round_price_difference = 0;
    next_round.round_price_decimals = 1;

    next_round.finished = false;
    next_round.invalid = false;
    next_round.settled = false;
    next_round.fee_collected = false;
    next_round.cranks_paid = false;

    next_round.total_fee_collected = 0;

    next_round.total_amount_settled = 0;
    next_round.total_predictions = 0;
    next_round.total_predictions_settled = 0;

    next_round.total_unique_crankers = 0;
    next_round.total_cranks = 0;
    next_round.total_amount_paid_to_cranks = 0;
    next_round.total_cranks_paid = 0;

    // once the round is finished append it to the history
    let next_record_id = round_history.next_record_id();

    round_history.append(RoundHistoryItem {
        record_id: next_record_id,
        address: current_round.address,
        round_number: current_round.round_number,
        round_start_time: current_round.round_start_time,
        round_current_time: current_round.round_current_time,
        round_time_difference: current_round.round_time_difference,
        round_start_price: current_round.round_start_price,
        round_current_price: current_round.round_current_price,
        round_end_price: current_round.round_end_price,
        round_price_difference: current_round.round_price_difference,
        round_price_decimals: current_round.round_price_decimals,
        round_winning_direction: current_round.round_winning_direction,
        total_fee_collected: current_round.total_fee_collected,
        total_up_amount: current_round.total_up_amount,
        total_down_amount: current_round.total_down_amount,
        total_amount_settled: current_round.total_amount_settled,
        total_predictions_settled: current_round.total_predictions_settled,
        total_predictions: current_round.total_predictions,
        total_unique_crankers: current_round.total_unique_crankers,
        total_cranks: current_round.total_cranks,
        total_cranks_paid: current_round.total_cranks_paid,
        total_amount_paid_to_cranks: current_round.total_amount_paid_to_cranks
    });

    Ok(())
}

pub fn init_second_round(ctx: Context<InitSecondRound>, _next_round_number: [u8; 4]) -> Result<()> {
    let game = &mut ctx.accounts.game;

    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;

    let round_history = &mut ctx.accounts.round_history.load_mut()?;

    init_round_shared(&ctx.accounts.second_round, &ctx.accounts.first_round, game, round_history, price_program, price_feed)
}

pub fn init_next_round_and_close_previous(ctx: Context<InitNextRoundAndClosePrevious>, _next_round_number: [u8; 4]) -> Result<()> {
    let game = &mut ctx.accounts.game;

    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;

    let round_history = &mut ctx.accounts.round_history.load_mut()?;

    init_round_shared(&ctx.accounts.next_round, &ctx.accounts.current_round, game, round_history, price_program, price_feed)
}



impl Round {
    pub fn update_round<'info>(
        &mut self, 
        oracle: u8,
        price_program: &AccountInfo<'info>, 
        price_feed: &AccountInfo<'info>

    ) -> Result<()> {
        if !self.finished {
    
            if self.round_predictions_allowed && self.round_time_difference >= (self.round_length / 2) { // for production
                self.round_predictions_allowed = false;
            }

            // update the round time
            self.round_current_time = Clock::get()?.unix_timestamp;
            // calculate the difference in time or set to zero
            self.round_time_difference = self.round_current_time.checked_sub(self.round_start_time).unwrap_or(0);
            
            // update the round price
            let (price, _decimals) = get_price(oracle, price_program, price_feed).unwrap_or((self.round_start_price, 0));  // production
            self.round_current_price = price;
            // self.round_current_price += 1; // localnet testing
            
            // calculate the difference in price or set to zero
            self.round_price_difference = self.round_current_price.checked_sub(self.round_start_price).unwrap_or(0);

            // if self.round_time_difference > (2) { 
            if self.round_time_difference >= self.round_length { // for production

                self.round_end_price = self.round_current_price;
                self.finished = true;

                self.round_winning_direction = if self.round_end_price > self.round_start_price {
                    1
                } else {
                    2
                };

                // if the round finishes after 10% of the round_length invalidate the round
                if self.round_time_difference >= self.round_length.saturating_add(self.round_length.saturating_mul(10).saturating_div(100)) {
                    self.invalid = true;
                }
                
            }
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CloseRound<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = round.load_mut()?.owner == signer.key() @ ErrorCode::SignerNotOwner,
        close = receiver
    )]
    pub round: AccountLoader<'info, Round>
}

#[derive(Accounts)]
pub struct InitFirstRound<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account(mut)]
    pub crank: AccountLoader<'info, Crank>,

    #[account(
        init,
        seeds = [
            env!("CARGO_PKG_VERSION").as_bytes(), 
            game.key().as_ref(), 
            &[(1_u32).to_be_bytes()[0]], 
            &[(1_u32).to_be_bytes()[1]], 
            &[(1_u32).to_be_bytes()[2]], 
            &[(1_u32).to_be_bytes()[3]], 
            b"round"
        ], 
        bump, 
        payer = signer,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub round: AccountLoader<'info, Round>,

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
#[instruction(next_round_number: [u8; 4])]
pub struct InitSecondRound<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account(mut)]
    pub round_history: AccountLoader<'info, RoundHistory>,

    #[account(mut)]
    pub crank: AccountLoader<'info, Crank>,

    #[account(
        init,
        seeds = [
            env!("CARGO_PKG_VERSION").as_bytes(), 
            game.key().as_ref(), 
            &[next_round_number[0]], 
            &[next_round_number[1]], 
            &[next_round_number[2]],  
            &[next_round_number[3]],  
            b"round"
        ], 
        bump, 
        payer = signer,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub second_round: AccountLoader<'info, Round>,

    #[account(mut)]
    pub first_round: AccountLoader<'info, Round>,

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
#[instruction(next_round_number: [u8; 4])]
pub struct InitNextRoundAndClosePrevious<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: AccountLoader<'info, Game>,

    #[account(mut)]
    pub round_history: AccountLoader<'info, RoundHistory>,

    #[account(mut)]
    pub crank: AccountLoader<'info, Crank>,
    
    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        init,
        seeds = [
            env!("CARGO_PKG_VERSION").as_bytes(), 
            game.key().as_ref(),
            &[next_round_number[0]],
            &[next_round_number[1]],
            &[next_round_number[2]],
            &[next_round_number[3]],
            b"round"
            
        ], 
        bump, 
        payer = signer,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub next_round: AccountLoader<'info, Round>,

    #[account(
        mut
    )]
    pub current_round: AccountLoader<'info, Round>,

    #[account(
        mut,
        close = receiver
    )]
    pub previous_round: AccountLoader<'info, Round>,

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
pub struct AdminCloseRound<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut, close = receiver)]
    pub round: AccountLoader<'info, Round>,
    
    #[account(
        mut
    )]
    pub receiver: SystemAccount<'info>,
}