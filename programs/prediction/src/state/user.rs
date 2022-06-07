
use anchor_lang::prelude::*;
use crate::errors::ErrorCode;

use crate::state::Round;

#[account]
#[derive(Default)]

pub struct User {

    // accounts

    pub address: Pubkey,

    pub owner: Pubkey,

    pub token_mint_pubkey: Pubkey,

    pub token_account_pubkey: Pubkey,

    pub token_account_authority_pubkey: Pubkey,

    pub predictions: Pubkey

}

impl User {
    pub fn init(&mut self, user: Pubkey, user_predictions: Pubkey, owner: Pubkey, token_account: Pubkey, token_account_authority: Pubkey) -> Result<()> {
        self.address = user.key();
        self.owner = owner.key();
        self.predictions = user_predictions.key();
        self.token_account_pubkey = token_account.key();
        self.token_account_authority_pubkey = token_account_authority.key();
        Ok(())
    }

    pub fn close(&mut self) -> Result<()> {
        // close_account(ctx)
        Ok(())
    }
}



#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum UpOrDown {
    Up,
    Down
}

#[account]
#[derive(Default, Copy)]
pub struct UserPrediction {

    // accounts
    pub owner: Pubkey,

    pub address: Pubkey,

    pub user: Pubkey,

    pub game: Pubkey,


    // args
    pub up_or_down: Option<i8>,

    pub amount: Option<u64>,


    // state
    pub settled: Option<bool>

}

impl UserPrediction {

    pub fn init(&mut self, user_prediciton: &Pubkey, user: &Pubkey, owner: &Pubkey, game: &Pubkey, amount: u64, up_or_down: i8) -> Result<()> {
        self.address = user_prediciton.key();
        self.user = user.key();
        self.amount = Some(amount);
        self.owner = owner.key();
        self.up_or_down = Some(up_or_down);
        self.game = game.key();
        self.settled = Some(false);
        Ok(())
    }

    pub fn settle(&mut self, round: &mut Round ) -> Result<()> {
        if !self.settled.unwrap_or(false) && round.finished.unwrap_or(false) {
            // transfer wins (if applicable)
            self.settled = Some(true);
            self.close()
        } else {
            Ok(())
        }
        
    }

    pub fn close(&mut self) -> Result<()> {
        require!(self.settled.unwrap_or(false), ErrorCode::FailedToCloseUnsettledUserPosition);
        // close_account(ctx)
        Ok(())
    }
}



#[account]
#[derive(Default)]
pub struct UserPredictions {
    pub predictions: [[Pubkey; 32];32]
}

impl UserPredictions {

    pub fn push<'info>(&mut self, user_prediction: &Account<'info, UserPrediction>, round: &mut Account<'info, Round>) -> Result<()> {
        // round can't be finished
        require!(!round.finished.unwrap_or(false), ErrorCode::RoundAlreadyFinished);

        // there has to be space to add the prediction to the round
        require!(self.predictions.iter().any(|p_array| p_array.iter().any(|p| p.eq(&Pubkey::default())) && p_array.iter().all(|p| !p.eq(&user_prediction.key()))), ErrorCode::PredictionAlreadyPushed);


        // find index
        let user_first_array_index = self.predictions.iter().position(|p_array| p_array.iter().any(|p| p.eq(&Pubkey::default())));
        require!(user_first_array_index.is_some(), ErrorCode::NoSpaceToPushPrediction);
        let user_sercond_array_index_to_insert = self.predictions[user_first_array_index.unwrap()].iter().position(|p| p.eq(&Pubkey::default()));
        require!(user_sercond_array_index_to_insert.is_some(), ErrorCode::NoSpaceToPushPrediction);
        
        // add user_prediction pubkey to user.predictions array
        self.predictions[user_first_array_index.unwrap()][user_sercond_array_index_to_insert.unwrap()] = user_prediction.key();
        // make sure it was pushed
        require!(self.predictions[user_first_array_index.unwrap()][user_sercond_array_index_to_insert.unwrap()].eq(&user_prediction.key()), ErrorCode::FailedToAppendUserPrediction);

        Ok(())

    }

    pub fn pop<'info>(&mut self, user_prediction: &mut Account<'info, UserPrediction>, round: &mut Account<'info, Round>) -> Result<()> {
        // round has to be finished
        require!(round.finished.unwrap_or(false), ErrorCode::RoundNotFinished);

        // settle the prediction if unsettled
        if !user_prediction.settled.unwrap_or(false) {
            // check that it has been settled
            require!(user_prediction.settle(round).is_ok(), ErrorCode::PredictionHasntBeenSettled)
        }


        // find index
        let user_first_array_index = self.predictions.iter().position(|p_array| p_array.iter().any(|p| p.eq(&user_prediction.key())));
        require!(user_first_array_index.is_some(), ErrorCode::NoPredictionToPopFound);
        let user_sercond_array_index_to_insert = self.predictions[user_first_array_index.unwrap()].iter().position(|p| p.eq(&user_prediction.key()));
        require!(user_sercond_array_index_to_insert.is_some(), ErrorCode::NoPredictionToPopFound);

        // remove user_prediction pubkey from user.predictions array
        self.predictions[user_first_array_index.unwrap()][user_sercond_array_index_to_insert.unwrap()] = Pubkey::default();
        // make sure it was popped
        require!(self.predictions[user_first_array_index.unwrap()][user_sercond_array_index_to_insert.unwrap()].eq(&Pubkey::default()), ErrorCode::FailedToPopUserPrediction);

        Ok(())

    }

}