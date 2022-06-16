use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

use crate::errors::ErrorCode;

use crate::state::{Round, Game, Vault};

pub fn init_first_round(ctx: Context<InitFirstRound>) -> Result<()> {
    let round = &mut ctx.accounts.round;
    let game = &mut ctx.accounts.game;

    game.current_round = round.key();
    game.previous_round = round.key();

    round.owner = ctx.accounts.owner.key();
    round.game = ctx.accounts.game.key();
    round.address = round.key();
    round.price_program_pubkey = ctx.accounts.price_program.key();
    round.price_feed_pubkey = ctx.accounts.price_feed.key();

    round.round_number = 1_u32; // starting round is 1

    let now = Clock::get()?.unix_timestamp;

    round.round_length = 600;

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

    round.total_amount_settled = 0;
    round.total_predictions = 0;
    round.total_predictions_settled = 0;

    Ok(())
}


fn init_round_shared(owner: Pubkey, price_program: Pubkey, price_feed: Pubkey, next_round: &mut Box<Account<Round>>, current_round: &mut Box<Account<Round>>, game: &mut Box<Account<Game>>) -> Result<()> {
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

    next_round.owner = owner.key();
    next_round.game = game.key();
    next_round.address = next_round.key();
    next_round.price_program_pubkey = price_program.key();
    next_round.price_feed_pubkey = price_feed.key();

    next_round.round_number = if current_round.round_number.eq(&u32::MAX) {
        1
    } else {
        current_round.round_number.saturating_add(1)
    };

    game.round_number = next_round.round_number;

    let now = Clock::get()?.unix_timestamp;

    next_round.round_length = 600;

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

    next_round.total_amount_settled = 0;
    next_round.total_predictions = 0;
    next_round.total_predictions_settled = 0;

    Ok(())
}

pub fn init_second_round(ctx: Context<InitSecondRound>) -> Result<()> {
    let second_round = &mut ctx.accounts.second_round;
    let first_round = &mut ctx.accounts.first_round;
    let game = &mut ctx.accounts.game;

    init_round_shared(ctx.accounts.owner.key(), ctx.accounts.price_program.key(), ctx.accounts.price_feed.key(), second_round, first_round, game)
}

pub fn init_next_round_and_close_previous(ctx: Context<InitNextRoundAndClosePrevious>) -> Result<()> {
    let next_round = &mut ctx.accounts.next_round;
    let current_round = &mut ctx.accounts.current_round;
    let game = &mut ctx.accounts.game;

    init_round_shared(ctx.accounts.owner.key(), ctx.accounts.price_program.key(), ctx.accounts.price_feed.key(), next_round, current_round, game)
}



impl Round {
    pub fn update_round<'info>(
        &mut self, 
        price_program: &AccountInfo<'info>, 
        price_feed: &AccountInfo<'info>

    ) -> Result<()> {
        if !self.finished {
            // update the round time
            self.round_current_time = Clock::get()?.unix_timestamp;
            // calculate the difference in time or set to zero
            self.round_time_difference = self.round_current_time.checked_sub(self.round_start_time).unwrap_or(0);
            
            // update the round price
            // self.round_current_price = get_price(price_program, price_feed).unwrap_or(self.round_start_price);  // production
            self.round_current_price += 1; // localnet testing
            
            // calculate the difference in price or set to zero
            self.round_price_difference = self.round_current_price.checked_sub(self.round_start_price).unwrap_or(0);
    
            // if round.round_time_difference > (5 * 60) { // 5 minutes for production
            if self.round_time_difference > self.round_length {

                self.round_end_price = self.round_current_price;
    
                self.round_winning_direction = if self.round_end_price > self.round_start_price {
                    1
                } else {
                    2
                };
    
                self.finished = true;

            } else if self.round_time_difference > (self.round_length / 2) {
                self.round_predictions_allowed = false;
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
    pub owner: Signer<'info>,

    #[account(mut)]
    pub game: Box<Account<'info, Game>>,

    #[account(
        init,
        seeds = [
            crate::ID.as_ref(), 
            env!("CARGO_PKG_VERSION").as_bytes(), 
            owner.key().as_ref(), 
            game.key().as_ref(), 
            &[(1_u32).to_be_bytes()[0]], 
            &[(1_u32).to_be_bytes()[1]], 
            &[(1_u32).to_be_bytes()[2]], 
            &[(1_u32).to_be_bytes()[3]], 
            b"round"
        ], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub round: Box<Account<'info, Round>>,
    
    /// CHECK:
    pub price_program: AccountInfo<'info>,

    /// CHECK:
    pub price_feed: AccountInfo<'info>,

    // required for Account
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct InitSecondRound<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, constraint = owner.key() == game.owner )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        init,
        seeds = [
            crate::ID.as_ref(), 
            env!("CARGO_PKG_VERSION").as_bytes(), 
            owner.key().as_ref(), 
            game.key().as_ref(), 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[0] } else { game.round_number.saturating_add(1).to_be_bytes()[0] }], 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[1] } else { game.round_number.saturating_add(1).to_be_bytes()[1] }], 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[2] } else { game.round_number.saturating_add(1).to_be_bytes()[2] }],  
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[3] } else { game.round_number.saturating_add(1).to_be_bytes()[3] }],  
            b"round"
        ], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Round>() + 8,
        constraint = first_round.price_program_pubkey == price_program.key(),
        constraint = first_round.price_feed_pubkey == price_feed.key()
    )]
    pub second_round: Box<Account<'info, Round>>,

    #[account(
        mut,
        constraint = owner.key() == first_round.owner,
        constraint = first_round.key() == game.current_round,
        constraint = first_round.finished,
        constraint = first_round.settled
    )]
    pub first_round: Box<Account<'info, Round>>,

    #[account(
        mut,
        constraint = owner.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut, 
        constraint = vault.owner == game.owner
    )]
    pub vault: Box<Account<'info, Vault>>,
    
    #[account(
        mut, 
        constraint = vault.up_token_account_pubkey == up_token_account.key(),
        constraint = owner.key() == up_token_account.owner
    )]
    pub up_token_account:  Box<Account<'info, TokenAccount>>,

    #[account(
        mut, 
        constraint = vault.down_token_account_pubkey == down_token_account.key(),
        constraint = owner.key() == up_token_account.owner
    )]
    pub down_token_account: Box<Account<'info, TokenAccount>>,
    
    /// CHECK:
    pub price_program: AccountInfo<'info>,

    /// CHECK:
    pub price_feed: AccountInfo<'info>,

    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitNextRoundAndClosePrevious<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, constraint = owner.key() == game.owner )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        init,
        seeds = [
            crate::ID.as_ref(), 
            env!("CARGO_PKG_VERSION").as_bytes(), 
            owner.key().as_ref(), 
            game.key().as_ref(), 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[0] } else { game.round_number.saturating_add(1).to_be_bytes()[0] }], 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[1] } else { game.round_number.saturating_add(1).to_be_bytes()[1] }], 
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[2] } else { game.round_number.saturating_add(1).to_be_bytes()[2] }],  
            &[if game.round_number.eq(&u32::MAX) { (1_u32).to_be_bytes()[3] } else { game.round_number.saturating_add(1).to_be_bytes()[3] }],  
            b"round"
        ], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Round>() + 8,
        constraint = current_round.price_program_pubkey == price_program.key(),
        constraint = current_round.price_feed_pubkey == price_feed.key()
    )]
    pub next_round: Box<Account<'info, Round>>,

    #[account(
        mut,
        constraint = owner.key() == current_round.owner,
        constraint = current_round.key() == game.current_round,
        constraint = current_round.finished,
        constraint = current_round.settled
    )]
    pub current_round: Box<Account<'info, Round>>,

    #[account(
        mut,
        constraint = owner.key() == receiver.key()
    )]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        close = receiver,
        constraint = owner.key() == previous_round.owner,
        constraint = previous_round.key() == game.previous_round,
        constraint = previous_round.finished,
        constraint = previous_round.settled
    )]
    pub previous_round: Box<Account<'info, Round>>,

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut, 
        constraint = vault.owner == game.owner
    )]
    pub vault: Box<Account<'info, Vault>>,
    
    #[account(
        mut, 
        constraint = vault.up_token_account_pubkey == up_token_account.key(),
        constraint = owner.key() == up_token_account.owner
    )]
    pub up_token_account:  Box<Account<'info, TokenAccount>>,

    #[account(
        mut, 
        constraint = vault.down_token_account_pubkey == down_token_account.key(),
        constraint = owner.key() == up_token_account.owner
    )]
    pub down_token_account: Box<Account<'info, TokenAccount>>,
    
    /// CHECK:
    pub price_program: AccountInfo<'info>,

    /// CHECK:
    pub price_feed: AccountInfo<'info>,

    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RoundRollover<'info> {
    #[account(mut)]
    pub owner: Signer<'info>
}