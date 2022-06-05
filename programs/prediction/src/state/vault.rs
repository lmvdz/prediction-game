use anchor_lang::prelude::*;
use anchor_spl::token::{Transfer, TokenAccount, Token, transfer};
use crate::errors::ErrorCode;

#[account]
#[derive(Default)]
pub struct Vault {
    
    pub address: Pubkey,
    pub owner: Pubkey,

    pub up_token_account_pubkey: Pubkey,
    pub up_token_account_authority: Pubkey,
    pub up_token_account_nonce: u8,
    
    pub down_token_account_pubkey: Pubkey,
    pub down_token_account_authority: Pubkey,
    pub down_token_account_nonce: u8,

    pub token_mint_pubkey: Pubkey,

    pub up_amount: u128,
    pub down_amount: u128

}

impl Vault {
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
        require_gte!(amount, from_token_account.amount, ErrorCode::InsufficientTokenAccountAmount);
        let new_to_account_amount = to_token_account.amount.saturating_add(amount);
        require_eq!(new_to_account_amount.saturating_sub(to_token_account.amount), amount, ErrorCode::DepositOverflow);
        self.transfer(from_token_account, to_token_account, from_token_account_authority, token_program, amount)
    }

    pub fn withdraw<'info>(
        &mut self,
        from_token_account: &Account<'info, TokenAccount>, 
        to_token_account: &Account<'info, TokenAccount>, 
        from_token_account_authority: &AccountInfo<'info>, 
        token_program: &Program<'info, Token>, 
        amount: u64
    ) -> Result<()> {
        require_gte!(amount, from_token_account.amount, ErrorCode::InsufficientTokenAccountAmount);
        let new_from_account_amount = from_token_account.amount.saturating_sub(amount);
        require_eq!(new_from_account_amount.saturating_add(to_token_account.amount), amount, ErrorCode::WithdrawUnderflow);
        self.transfer(from_token_account, to_token_account, from_token_account_authority, token_program, amount)
    }
}