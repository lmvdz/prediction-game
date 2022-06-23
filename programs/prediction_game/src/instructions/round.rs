use anchor_lang::prelude::*;

use crate::errors::ErrorCode;

use crate::state::{Round, Game, Crank};

pub fn init_first_round(ctx: Context<InitFirstRound>, round_length: i64) -> Result<()> {
    let round = &mut ctx.accounts.round;
    let game = &mut ctx.accounts.game;

    game.current_round = round.key();
    game.previous_round = round.key();

    round.owner = game.owner.key();
    round.game = ctx.accounts.game.key();
    round.address = round.key();

    round.round_number = 1_u32; // starting round is 1

    let now = Clock::get()?.unix_timestamp;

    round.round_length = round_length;

    round.round_start_time = now;
    round.round_current_time = now;
    round.round_time_difference = 0;

    round.round_predictions_allowed = true;

    // let price = get_price(price_program, price_feed).unwrap_or(0); // production
    let price = 0; // localnet

    round.round_start_price = price;
    round.round_current_price = price;
    round.round_price_difference = 0;

    round.finished = false;
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


fn init_round_shared(next_round: &mut Box<Account<Round>>, current_round: &mut Box<Account<Round>>, game: &mut Box<Account<Game>>) -> Result<()> {
    game.current_round = next_round.key();
    game.previous_round = current_round.key();

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
    next_round.game = game.key();
    next_round.address = next_round.key();

    next_round.round_number = if current_round.round_number.eq(&u32::MAX) {
        1
    } else {
        current_round.round_number.saturating_add(1)
    };

    game.round_number = next_round.round_number;

    let now = Clock::get()?.unix_timestamp;

    next_round.round_length = current_round.round_length;

    next_round.round_start_time = now;
    next_round.round_current_time = now;
    next_round.round_time_difference = 0;

    next_round.round_predictions_allowed = true;

    // let price = get_price(price_program, price_feed).unwrap_or(0);
    let price = 0;

    next_round.round_start_price = price;
    next_round.round_current_price = price;
    next_round.round_price_difference = 0;

    next_round.finished = false;
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

    Ok(())
}

pub fn init_second_round(ctx: Context<InitSecondRound>) -> Result<()> {
    let second_round = &mut ctx.accounts.second_round;
    let first_round = &mut ctx.accounts.first_round;
    let game = &mut ctx.accounts.game;

    init_round_shared(second_round, first_round, game)
}

pub fn init_next_round_and_close_previous(ctx: Context<InitNextRoundAndClosePrevious>) -> Result<()> {
    let next_round = &mut ctx.accounts.next_round;
    let current_round = &mut ctx.accounts.current_round;
    let game = &mut ctx.accounts.game;

    init_round_shared(next_round, current_round, game)
}



impl Round {
    pub fn update_round<'info>(
        &mut self, 
        price_program: &AccountInfo<'info>, 
        price_feed: &AccountInfo<'info>

    ) -> Result<()> {
        if !self.finished {
    
            if self.round_predictions_allowed && self.round_time_difference >= (self.round_length / 2) { // for production
                self.round_predictions_allowed = false;
            }
            // if self.round_time_difference > (2) { 
            if self.round_time_difference >= self.round_length { // for production

                self.round_end_price = self.round_current_price;
    
                self.round_winning_direction = if self.round_end_price > self.round_start_price {
                    1
                } else {
                    2
                };
                self.finished = true;
            } else {
                // update the round time
                self.round_current_time = Clock::get()?.unix_timestamp;
                // calculate the difference in time or set to zero
                self.round_time_difference = self.round_current_time.checked_sub(self.round_start_time).unwrap_or(0);
                
                // update the round price
                // self.round_current_price = get_price(price_program, price_feed).unwrap_or(self.round_start_price);  // production
                self.round_current_price += 1; // localnet testing
                
                // calculate the difference in price or set to zero
                self.round_price_difference = self.round_current_price.checked_sub(self.round_start_price).unwrap_or(0);
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
        constraint = round.owner == signer.key() @ ErrorCode::SignerNotOwner,
        close = receiver
    )]
    pub round: Box<Account<'info, Round>>
}

#[derive(Accounts)]
pub struct InitFirstRound<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: Box<Account<'info, Game>>,

    #[account(mut)]
    pub crank: Box<Account<'info, Crank>>,

    #[account(
        init,
        seeds = [
            
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
    pub round: Box<Account<'info, Round>>,

    // required for Account
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct InitSecondRound<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: Box<Account<'info, Game>>,

    #[account(mut)]
    pub crank: Box<Account<'info, Crank>>,

    #[account(
        init,
        seeds = [
            game.key().as_ref(), 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[0] } else { game.round_number.saturating_add(1).to_be_bytes()[0] }], 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[1] } else { game.round_number.saturating_add(1).to_be_bytes()[1] }], 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[2] } else { game.round_number.saturating_add(1).to_be_bytes()[2] }],  
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[3] } else { game.round_number.saturating_add(1).to_be_bytes()[3] }],  
            b"round"
        ], 
        bump, 
        payer = signer,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub second_round: Box<Account<'info, Round>>,

    #[account(
        mut,
        constraint = first_round.key() == game.current_round @ ErrorCode::RoundKeyNotGameCurrentKey,
        constraint = first_round.finished @ ErrorCode::RoundNotFinished,
        constraint = first_round.fee_collected @ ErrorCode::RoundFeeNotCollected,
        constraint = first_round.settled @ ErrorCode::RoundNotSettled
    )]
    pub first_round: Box<Account<'info, Round>>,

    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitNextRoundAndClosePrevious<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: Box<Account<'info, Game>>,

    #[account(mut)]
    pub crank: Box<Account<'info, Crank>>,

    #[account(
        mut,
        constraint = signer.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        init,
        seeds = [
            
            game.key().as_ref(), 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[0] } else { game.round_number.saturating_add(1).to_be_bytes()[0] }], 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[1] } else { game.round_number.saturating_add(1).to_be_bytes()[1] }], 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[2] } else { game.round_number.saturating_add(1).to_be_bytes()[2] }],  
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[3] } else { game.round_number.saturating_add(1).to_be_bytes()[3] }],  
            b"round"
            
        ], 
        bump, 
        payer = signer,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub next_round: Box<Account<'info, Round>>,

    #[account(
        mut,
        constraint = current_round.key() == game.current_round,
        constraint = current_round.finished @ ErrorCode::RoundNotFinished,
        constraint = current_round.fee_collected @ ErrorCode::RoundFeeNotCollected,
        constraint = current_round.settled @ ErrorCode::RoundNotSettled,
        constraint = current_round.cranks_paid @ ErrorCode::RoundCranksNotPaid
    )]
    pub current_round: Box<Account<'info, Round>>,

    #[account(
        mut,
        close = receiver,
        constraint = previous_round.key() == game.previous_round,
        constraint = previous_round.finished @ ErrorCode::RoundNotFinished,
        constraint = previous_round.fee_collected @ ErrorCode::RoundFeeNotCollected,
        constraint = previous_round.settled @ ErrorCode::RoundNotSettled,
        constraint = previous_round.cranks_paid @ ErrorCode::RoundCranksNotPaid,
    )]
    pub previous_round: Box<Account<'info, Round>>,

    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RoundRollover<'info> {
    #[account(mut)]
    pub owner: Signer<'info>
}