use anchor_lang::prelude::*;

use crate::errors::ErrorCode;

use crate::state::Round;



// pub fn close_round<'info>(mut ctx: Context<'_, '_, '_, 'info, CloseRound<'info>>) -> Result<()> {
//     let ctx = &mut ctx;
//     let round = &ctx.accounts.round;
    
//     Ok(())
// }

#[derive(Accounts)]
pub struct CloseRound<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

    #[account(
        mut,
        constraint = round.owner == signer.key() @ ErrorCode::SignerNotOwner,
        close = receiver
    )]
    pub round: Box<Account<'info, Round>>
}