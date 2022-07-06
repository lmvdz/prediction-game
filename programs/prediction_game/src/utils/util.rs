use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token, transfer, Transfer};

pub fn close_token_account<'info>(token_account: AccountInfo<'info>, destination: AccountInfo<'info>, authority: AccountInfo<'info>, token_program: AccountInfo<'info>) -> Result<()> {
    let cpi_accounts = anchor_spl::token::CloseAccount {
        account: token_account.clone(),
        destination: destination.clone(),
        authority: authority.clone(),
    };
    anchor_spl::token::close_account(CpiContext::new(token_program.clone(), cpi_accounts))
}

pub fn close_token_account_signed<'info>(token_account: AccountInfo<'info>, destination: AccountInfo<'info>, authority: AccountInfo<'info>, token_program: AccountInfo<'info>, signers: &[&[&[u8]]]) -> Result<()> {
    let cpi_accounts = anchor_spl::token::CloseAccount {
        account: token_account.clone(),
        destination: destination.clone(),
        authority: authority.clone(),
    };
    anchor_spl::token::close_account(CpiContext::new_with_signer(token_program.clone(), cpi_accounts, signers))
}

pub fn transfer_token_account<'info>(
    from_token_account: &mut Account<'info, TokenAccount>, 
    to_token_account: &Account<'info, TokenAccount>, 
    from_token_account_authority: &AccountInfo<'info>, 
    token_program: &Program<'info, Token>, 
    amount: u64
) -> Result<()> {

    let cpi_accounts = Transfer {
        from: from_token_account.to_account_info().clone(),
        to: to_token_account.to_account_info().clone(),
        authority: from_token_account_authority.to_account_info().clone()
    };

    let cpi_program = token_program.to_account_info().clone();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

    transfer(cpi_context, amount)
}

pub fn transfer_token_account_signed<'info>(
    from_token_account: &Account<'info, TokenAccount>, 
    to_token_account: &Account<'info, TokenAccount>, 
    from_token_account_authority: &AccountInfo<'info>, 
    signers: &[&[&[u8]]],
    token_program: &Program<'info, Token>, 
    amount: u64
) -> Result<()> {
    

    let cpi_accounts = Transfer {
        from: from_token_account.to_account_info().clone(),
        to: to_token_account.to_account_info().clone(),
        authority: from_token_account_authority.to_account_info().clone()
    };
    
    let cpi_program = token_program.to_account_info();
    let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signers);

    transfer(cpi_context, amount)
}