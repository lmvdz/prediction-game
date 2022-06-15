use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token};
use crate::{errors::ErrorCode, utils::transfer_token_account};

#[account]
#[derive(Default)]
pub struct Vault {
    
    pub address: Pubkey,
    pub owner: Pubkey,
    pub token_mint_pubkey: Pubkey,
    
    pub up_token_account_pubkey: Pubkey,
    pub up_token_account_authority: Pubkey,
    pub up_token_account_nonce: u8,
    
    pub down_token_account_pubkey: Pubkey,
    pub down_token_account_authority: Pubkey,
    pub down_token_account_nonce: u8,

    pub up_amount: u64,
    pub down_amount: u64

}

impl Vault {

    

    pub fn deposit<'info>(
        &mut self,
        from_token_account: &mut Account<'info, TokenAccount>, 
        to_token_account: &mut Account<'info, TokenAccount>, 
        from_token_account_authority: &mut AccountInfo<'info>, 
        token_program: &Program<'info, Token>, 
        amount: u64
    ) -> Result<()> {


        require!(to_token_account.key().eq(&self.up_token_account_pubkey) || to_token_account.key().eq(&self.down_token_account_pubkey), ErrorCode::ToAccountDoesNotMatchVaultUpOrDown);
        require_gte!(from_token_account.amount, amount, ErrorCode::InsufficientTokenAccountAmount);
        
        let new_to_account_amount = to_token_account.amount.saturating_add(amount);

        require_eq!(new_to_account_amount.saturating_sub(amount), to_token_account.amount, ErrorCode::DepositOverflow);


        require!(transfer_token_account(from_token_account, to_token_account, from_token_account_authority, token_program, amount).is_ok(), ErrorCode::FailedToDeposit);

        if to_token_account.key().eq(&self.up_token_account_pubkey) {
            self.up_amount = (self.up_amount).saturating_add(amount);
        } else if to_token_account.key().eq(&self.down_token_account_pubkey) {
            self.down_amount = (self.down_amount).saturating_add(amount);
        }
        
        Ok(())
    }

    pub fn withdraw<'info>(
        &mut self,
        from_token_account: &mut Account<'info, TokenAccount>, 
        to_token_account: &Account<'info, TokenAccount>, 
        from_token_account_authority: &AccountInfo<'info>, 
        token_program: &Program<'info, Token>, 
        amount: u64
    ) -> Result<()> {

        require!(from_token_account.key().eq(&self.up_token_account_pubkey) || from_token_account.key().eq(&self.down_token_account_pubkey), ErrorCode::ToAccountDoesNotMatchVaultUpOrDown);
        require_gte!(from_token_account.amount, amount, ErrorCode::InsufficientTokenAccountAmount);

        let new_from_account_amount = from_token_account.amount.saturating_sub(amount);

        require_eq!(new_from_account_amount.saturating_add(amount), from_token_account.amount, ErrorCode::WithdrawUnderflow);


        require!(transfer_token_account(from_token_account, to_token_account, from_token_account_authority, token_program, amount).is_ok(), ErrorCode::FailedToWithdraw);

        if from_token_account.key().eq(&self.up_token_account_pubkey) {
            self.up_amount = (self.up_amount).saturating_sub(amount);
        } else if from_token_account.key().eq(&self.down_token_account_pubkey) {
            self.down_amount = (self.down_amount).saturating_sub(amount);
        }
        Ok(())
    }

}