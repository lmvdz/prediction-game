
use anchor_lang::prelude::*;


#[account]
#[derive(Default)]

pub struct User {

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

    pub owner: Pubkey,

    pub address: Pubkey,

    pub user: Pubkey,

    pub game: Pubkey,

    pub up_or_down: Option<UpOrDown>,

    pub amount: u64

}

impl UserPrediction {

    pub fn init(&mut self, user_prediciton: Pubkey, user: Pubkey, owner: Pubkey, game: Pubkey) -> Result<()> {
        self.address = user_prediciton.key();
        self.user = user.key();
        self.amount = 0;
        self.owner = owner.key();
        self.up_or_down = None;
        self.game = game.key();
        Ok(())
    }

    pub fn close(&mut self) -> Result<()> {
        // close_account(ctx)
        Ok(())
    }
}



#[account]
#[derive(Default)]
pub struct UserPredictions {
    pub predictions: [UserPrediction; 32]
}

impl UserPredictions {
    
}