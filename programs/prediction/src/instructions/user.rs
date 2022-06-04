use anchor_lang::prelude::*;

pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
}