

use anchor_lang::prelude::*;

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

    pub round: Pubkey,

    pub up_or_down: u8,

    pub amount: u64,

    // state
    pub settled: bool,

    pub deposited: bool

}