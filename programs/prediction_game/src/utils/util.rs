use anchor_lang::prelude::*;

pub fn close_token_account<'info>(token_account: AccountInfo<'info>, destination: AccountInfo<'info>, authority: AccountInfo<'info>, token_program: AccountInfo<'info>) -> Result<()> {
    let cpi_accounts = anchor_spl::token::CloseAccount {
        account: token_account.clone(),
        destination: destination.clone(),
        authority: authority.clone(),
    };
    anchor_spl::token::close_account(CpiContext::new(token_program.clone(), cpi_accounts))
}