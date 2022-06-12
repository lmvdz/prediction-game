
use anchor_lang::__private::ZeroCopyAccessor;
use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token};
use crate::errors::ErrorCode;

use crate::state::Round;

use super::Vault;

#[account]
#[derive(Default)]

pub struct User {

    // accounts

    pub address: Pubkey,

    pub owner: Pubkey,

    pub token_mint_pubkey: Pubkey,

    pub token_account_pubkey: Pubkey,

    pub token_account_authority_pubkey: Pubkey

}

impl User {
    pub fn init(&mut self, user: Pubkey, owner: Pubkey, token_account: Pubkey, token_account_authority: Pubkey) -> Result<()> {
        self.address = user.key();
        self.owner = owner.key();
        self.token_account_pubkey = token_account.key();
        self.token_account_authority_pubkey = token_account_authority.key();
        Ok(())
    }

    pub fn transfer<'info>(
        &mut self, 
        from_token_account: AccountInfo<'info>, 
        to_token_account: AccountInfo<'info>, 
        authority: AccountInfo<'info>, 
        token_program: AccountInfo<'info>, 
        amount: u64
    ) -> Result<()> {
        let cpi_accounts = anchor_spl::token::Transfer {
            from: from_token_account.to_account_info().clone(),
            to: to_token_account
                .to_account_info()
                .clone(),
            authority: authority.clone(),
        };
        anchor_spl::token::transfer(CpiContext::new(token_program.clone(), cpi_accounts), amount)
    }
}



#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum UpOrDown {
    None = 0,
    Up = 1,
    Down = 2
}

#[account]
#[derive(Default, Copy)]
pub struct UserPrediction {

    // accounts
    pub owner: Pubkey,

    pub address: Pubkey,

    pub user: Pubkey,

    pub game: Pubkey,

    pub up_or_down: u8,

    pub amount: u64,

    // state
    pub settled: bool,

    pub deposited: bool

}

impl UserPrediction {

    pub fn settle(&mut self, round: &mut Round ) -> Result<()> {
        if !self.settled && round.finished {
            // transfer wins (if applicable)
            self.settled = true;
            // self.close()
        }
        Ok(())
        
    }

    pub fn deposit<'info>(
        &mut self, 
        vault: &mut Box<Account<'info, Vault>>,
        from_token_account: &mut Box<Account<'info, TokenAccount>>, 
        to_token_account: &mut Box<Account<'info, TokenAccount>>, 
        authority: &mut AccountInfo<'info>,
        token_program: &Program<'info, Token>

    ) -> Result<()> {
        vault.deposit(
            from_token_account, 
            to_token_account, 
            authority, 
            token_program, 
            self.amount
        )
    }
}

// impl UserPredictions {

//     // pub fn push<'info>(&mut self, user_prediction: &Account<'info, UserPrediction>, round: &mut Account<'info, Round>) -> Result<()> {
//     //     // round can't be finished
//     //     require!(!round.finished, ErrorCode::RoundAlreadyFinished);

//     //     // there has to be space to add the prediction to the round
//     //     require!(self.predictions.iter().any(|p_array| p_array.iter().any(|p| p.eq(&Pubkey::default())) && p_array.iter().all(|p| !p.eq(&user_prediction.key()))), ErrorCode::PredictionAlreadyPushed);


//     //     // find index
//     //     let user_first_array_index = self.predictions.iter().position(|p_array| p_array.iter().any(|p| p.eq(&Pubkey::default())));
//     //     require!(user_first_array_index.is_some(), ErrorCode::NoSpaceToPushPrediction);
//     //     let user_sercond_array_index_to_insert = self.predictions[user_first_array_index.unwrap()].iter().position(|p| p.eq(&Pubkey::default()));
//     //     require!(user_sercond_array_index_to_insert.is_some(), ErrorCode::NoSpaceToPushPrediction);
        
//     //     // add user_prediction pubkey to user.predictions array
//     //     self.predictions[user_first_array_index.unwrap()][user_sercond_array_index_to_insert.unwrap()] = user_prediction.key();
//     //     // make sure it was pushed
//     //     require!(self.predictions[user_first_array_index.unwrap()][user_sercond_array_index_to_insert.unwrap()].eq(&user_prediction.key()), ErrorCode::FailedToAppendUserPrediction);

//     //     Ok(())

//     // }

//     // pub fn pop<'info>(&mut self, user_prediction: &mut Account<'info, UserPrediction>, round: &mut Account<'info, Round>) -> Result<()> {
//     //     // round has to be finished
//     //     require!(round.finished, ErrorCode::RoundNotFinished);

//     //     // settle the prediction if unsettled
//     //     if !user_prediction.settled {
//     //         // check that it has been settled
//     //         require!(user_prediction.settle(round).is_ok(), ErrorCode::PredictionHasntBeenSettled)
//     //     }


//     //     // find index
//     //     let user_first_array_index = self.predictions.iter().position(|p_array| p_array.iter().any(|p| p.eq(&user_prediction.key())));
//     //     require!(user_first_array_index.is_some(), ErrorCode::NoPredictionToPopFound);
//     //     let user_sercond_array_index_to_insert = self.predictions[user_first_array_index.unwrap()].iter().position(|p| p.eq(&user_prediction.key()));
//     //     require!(user_sercond_array_index_to_insert.is_some(), ErrorCode::NoPredictionToPopFound);

//     //     // remove user_prediction pubkey from user.predictions array
//     //     self.predictions[user_first_array_index.unwrap()][user_sercond_array_index_to_insert.unwrap()] = Pubkey::default();
//     //     // make sure it was popped
//     //     require!(self.predictions[user_first_array_index.unwrap()][user_sercond_array_index_to_insert.unwrap()].eq(&Pubkey::default()), ErrorCode::FailedToPopUserPrediction);

//     //     Ok(())

//     // }

// }