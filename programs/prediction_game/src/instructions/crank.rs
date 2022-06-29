use anchor_lang::prelude::*;

use crate::state::Crank;
use crate::state::Game;
use crate::state::User;
use crate::errors::ErrorCode;

pub fn init_crank(ctx: Context<InitCrank>) -> Result<()> {
    
    let crank = &mut ctx.accounts.crank;
    let user = &ctx.accounts.user;

    crank.address = crank.key();
    crank.owner = ctx.accounts.owner.key();
    crank.user = user.key();
    crank.user_claimable = user.user_claimable.key();
    crank.game = ctx.accounts.game.key();

    crank.cranks = 0;
    crank.last_crank_round = Pubkey::default();
    crank.last_paid_crank_round = Pubkey::default();

    Ok(())

}

#[derive(Accounts)]
pub struct CloseCrankAccount<'info> {

    #[account()]
    pub signer: Signer<'info>,

    #[account(mut, 
        close = receiver,
        constraint = signer.key() == crank.owner @ ErrorCode::SignerNotOwner
    )]
    pub crank: Box<Account<'info, Crank>>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

}

#[derive(Accounts)]
pub struct InitCrank<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account()]
    pub game: Box<Account<'info, Game>>,
    
    #[account(
        constraint = user.owner == owner.key()  @ ErrorCode::SignerNotOwner
    )]
    pub user: Box<Account<'info, User>>,

    #[account(
        init,
        seeds = [ env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), user.key().as_ref(), game.key().as_ref(), b"crank"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Crank>() + 8
    )]
    pub crank: Box<Account<'info, Crank>>, 

    // required for Account
    pub system_program: Program<'info, System>,
}