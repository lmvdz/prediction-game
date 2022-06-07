use anchor_lang::prelude::*;
use anchor_spl::token::{Transfer, TokenAccount, Token, transfer};
use crate::errors::ErrorCode;

#[account]
#[derive(Default)]
pub struct Vault {
    
    pub address: Pubkey,
    pub owner: Pubkey,
    pub token_mint_pubkey: Pubkey,
    
    pub up_token_account_pubkey: Option<Pubkey>,
    pub up_token_account_authority: Option<Pubkey>,
    pub up_token_account_nonce: Option<u8>,
    
    pub down_token_account_pubkey: Option<Pubkey>,
    pub down_token_account_authority: Option<Pubkey>,
    pub down_token_account_nonce: Option<u8>,

    pub up_amount: Option<u128>,
    pub down_amount: Option<u128>

}

impl Vault {

    pub fn init(
        &mut self, 
        up_token_account_key: Pubkey,
        up_token_account_authority_key: Pubkey,
        up_token_account_nonce: u8,
        down_token_account_key: Pubkey,
        down_token_account_authority_key: Pubkey,
        down_token_account_nonce: u8,
        
    ) -> Result<()> {
        self.up_token_account_pubkey = Some(up_token_account_key);
        self.up_token_account_authority = Some(up_token_account_authority_key);
        self.up_token_account_nonce = Some(up_token_account_nonce);

        self.down_token_account_pubkey = Some(down_token_account_key);
        self.down_token_account_authority = Some(down_token_account_authority_key);
        self.down_token_account_nonce = Some(down_token_account_nonce);

        self.up_amount = Some(0);
        self.down_amount = Some(0);

        Ok(())
    }

    fn transfer<'info>(
        &mut self,
        from_token_account: &Account<'info, TokenAccount>, 
        to_token_account: &Account<'info, TokenAccount>, 
        from_token_account_authority: &AccountInfo<'info>, 
        token_program: &Program<'info, Token>, 
        amount: u64
    ) -> Result<()> {

        let cpi_accounts = Transfer {
            from: from_token_account.to_account_info().clone(),
            to: to_token_account.to_account_info().clone(),
            authority: from_token_account_authority.to_account_info().clone(),
        };
    
        let cpi_program = token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_context, amount)
    }

    pub fn deposit<'info>(
        &mut self,
        from_token_account: &Account<'info, TokenAccount>, 
        to_token_account: &Account<'info, TokenAccount>, 
        from_token_account_authority: &AccountInfo<'info>, 
        token_program: &Program<'info, Token>, 
        amount: u64
    ) -> Result<()> {
        require!(to_token_account.key().eq(&self.up_token_account_pubkey.unwrap()) || to_token_account.key().eq(&self.down_token_account_pubkey.unwrap()), ErrorCode::ToAccountDoesNotMatchVaultUpOrDown);
        require_gte!(amount, from_token_account.amount, ErrorCode::InsufficientTokenAccountAmount);
        let new_to_account_amount = to_token_account.amount.saturating_add(amount);
        require_eq!(new_to_account_amount.saturating_sub(to_token_account.amount), amount, ErrorCode::DepositOverflow);
        require!(self.transfer(from_token_account, to_token_account, from_token_account_authority, token_program, amount).is_ok(), ErrorCode::FailedToDeposit);
        if to_token_account.key().eq(&self.up_token_account_pubkey.unwrap()) {
            self.up_amount = Some((self.up_amount.unwrap_or(0)).saturating_add(amount.into()));
        } else if to_token_account.key().eq(&self.down_token_account_pubkey.unwrap()) {
            self.down_amount = Some((self.down_amount.unwrap_or(0)).saturating_add(amount.into()));
        }
        
        Ok(())
    }

    pub fn withdraw<'info>(
        &mut self,
        from_token_account: &Account<'info, TokenAccount>, 
        to_token_account: &Account<'info, TokenAccount>, 
        from_token_account_authority: &AccountInfo<'info>, 
        token_program: &Program<'info, Token>, 
        amount: u64
    ) -> Result<()> {
        require!(from_token_account.key().eq(&self.up_token_account_pubkey.unwrap()) || from_token_account.key().eq(&self.down_token_account_pubkey.unwrap()), ErrorCode::ToAccountDoesNotMatchVaultUpOrDown);
        require_gte!(amount, from_token_account.amount, ErrorCode::InsufficientTokenAccountAmount);
        let new_from_account_amount = from_token_account.amount.saturating_sub(amount);
        require_eq!(new_from_account_amount.saturating_add(to_token_account.amount), amount, ErrorCode::WithdrawUnderflow);
        require!(self.transfer(from_token_account, to_token_account, from_token_account_authority, token_program, amount).is_ok(), ErrorCode::FailedToWithdraw);
        if from_token_account.key().eq(&self.up_token_account_pubkey.unwrap()) {
            self.up_amount = Some((self.up_amount.unwrap_or(0)).saturating_sub(amount.into()));
        } else if from_token_account.key().eq(&self.down_token_account_pubkey.unwrap()) {
            self.down_amount = Some((self.down_amount.unwrap_or(0)).saturating_sub(amount.into()));
        }
        Ok(())
    }
}