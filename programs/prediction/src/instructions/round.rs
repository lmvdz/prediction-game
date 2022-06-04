use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

use crate::state::game::Game;
use crate::state::round::Round;

pub fn init_round(ctx: Context<InitRound>) -> Result<()> {
    Ok(())
}

pub fn update_round(ctx: Context<UpdateRound>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct InitRound<'info> {

    #[account()]
    pub game: Box<Account<'info, Game>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), &game.round_number.to_le_bytes(), b"round"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Game>() + 8
    )]
    pub round: Account<'info, Round>,

    pub token_mint: Box<Account<'info, Mint>>,


    #[account(
        init, 
        seeds = [owner.key().as_ref(), round.key().as_ref(), b"round_up_vault"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = round_up_vault_authority
    )]
    pub round_up_vault:  Box<Account<'info, TokenAccount>>,

    /// CHECK: checked in `init_round`
    pub round_up_vault_authority: AccountInfo<'info>,



    #[account(
        init, 
        seeds = [owner.key().as_ref(), round.key().as_ref(), b"round_down_vault"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = round_down_vault_authority
    )]
    pub round_down_vault: Box<Account<'info, TokenAccount>>,
    
    /// CHECK: checked in `init_round`
    pub round_down_vault_authority: AccountInfo<'info>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct UpdateRound<'info> {

    #[account()]
    pub game: Box<Account<'info, Game>>,

    #[account(mut)]
    pub round: Account<'info, Round>
}