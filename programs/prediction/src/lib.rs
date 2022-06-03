use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

declare_id!("FVUPGJ2QiLbW1dtcKMkPyAfhcSPeACVR2GujZfxh3W8e");

#[program]
pub mod prediction {
    use super::*;

    pub fn init_prediction_pda(ctx: Context<InitializePredictionPDA>) -> Result<()> {
        let prediction = &mut ctx.accounts.prediction;
        prediction.owner = ctx.accounts.owner.key();
        Ok(())
    }

    pub fn init_game_pda(ctx: Context<InitializeGamePDA>, up_bump: u8, down_bump: u8) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.owner = ctx.accounts.owner.key();
        
        game.up = ctx.accounts.up.key();
        game.up_bump = up_bump;

        game.down = ctx.accounts.down.key();
        game.down_bump = down_bump;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePredictionPDA<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 32 + 8
    )]
    pub prediction: Account<'info, Prediction>,
    pub system_program: Program<'info, System>
}

#[account]
#[derive(Default)]
pub struct Prediction {
    pub owner: Pubkey
}



#[derive(Accounts)]
pub struct InitializeGamePDA<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 32 + 8
    )]
    pub game: Account<'info, Game>,

    #[account(init, seeds = [owner.key().as_ref(), b"up"], bump, payer = owner, has_one = owner, space = 200)]
    pub up: Account<'info, TokenAccount>,

    #[account(init, seeds = [owner.key().as_ref(), b"down"], bump, payer = owner, has_one = owner, space = 200)]
    pub down: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>
}

#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,
    pub down_bump: u8,
    pub down: Pubkey,
    pub up_bump: u8,
    pub up: Pubkey
}