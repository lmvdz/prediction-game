use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;

use crate::errors::ErrorCode;

use crate::state::Vault;
use crate::state::Game;
use crate::state::Round;

// initialize game
pub fn init_game(ctx: Context<InitializeGame>, vault_up_token_account_nonce: u8, vault_down_token_account_nonce: u8) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let owner = &ctx.accounts.owner;
    let round = &mut ctx.accounts.round;
    let vault = &mut ctx.accounts.vault;
    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;
    let game_pubkey = game.key();

    game.owner = owner.key();
    game.address = game_pubkey;
    game.round_number = 1;
    game.current_round = round.key();
    game.total_volume = 0;

    require!(vault.init(
        ctx.accounts.up_token_account.key(),
        ctx.accounts.up_token_account_authority.key(),
        vault_up_token_account_nonce,
        ctx.accounts.down_token_account.key(),
        ctx.accounts.down_token_account_authority.key(),
        vault_down_token_account_nonce
    ).is_ok(), ErrorCode::FailedToInitVault);

    require!(round.init(owner.key(), price_program, price_feed, 1).is_ok(), ErrorCode::FailedToInitRound);

    Ok(())
}

// crank
pub fn update_game<'info>(mut ctx: Context<'_, '_, '_, 'info, UpdateGame<'info>>) -> Result<()> {
    let ctx = &mut ctx;
    let accounts = ctx.remaining_accounts;
    let round = &mut ctx.accounts.round;
    let vault  = &mut ctx.accounts.vault;
    let price_program = &ctx.accounts.price_program;
    let price_feed = &ctx.accounts.price_feed;
    let token_program = &ctx.accounts.token_program;

    if !round.finished {
        require!(round.update(price_program, price_feed).is_ok(), ErrorCode::FailedToUpdateRound);
    }
    
    if round.finished && !round.settled {
        let winning_vault;
        let losing_vault;
        let winning_vault_authority;
        let losing_vault_authority;
        

        if round.round_winning_direction == 1 {
            winning_vault = &ctx.accounts.up_token_account;
            losing_vault = &ctx.accounts.down_token_account;
            winning_vault_authority = &ctx.accounts.up_token_account_authority;
            losing_vault_authority = &ctx.accounts.down_token_account_authority;
        } else {
            winning_vault = &ctx.accounts.down_token_account;
            losing_vault = &ctx.accounts.up_token_account;
            winning_vault_authority = &ctx.accounts.down_token_account_authority;
            losing_vault_authority = &ctx.accounts.up_token_account_authority;
        }
        if !round.settled {
            let winning_vault_amount;
            let losing_vault_amount;

            if round.round_winning_direction == 1 {
                winning_vault_amount = vault.up_amount;
                losing_vault_amount = vault.down_amount;
            } else {
                winning_vault_amount = vault.down_amount;
                losing_vault_amount = vault.up_amount;
            }

            round.predictions.iter().flatten().for_each(|prediction| {

                if prediction.up_or_down == round.round_winning_direction {
                    let winnings = losing_vault_amount * (prediction.amount / winning_vault_amount);

                    let destination = accounts.iter().find(|t| {
                        t.owner.eq(&prediction.owner)
                    }).unwrap();

                    let account = &Account::<'info, TokenAccount>::try_from(destination).unwrap();
                    // withdraw winnings from loser vault
                    let _winnings_withdraw_result = vault.withdraw(
                        losing_vault, 
                        account, 
                        losing_vault_authority, 
                        token_program, 
                        winnings
                    );
                    let _initial_amount_withdraw_result = vault.withdraw(
                        winning_vault, 
                        account, 
                        winning_vault_authority, 
                        token_program, 
                        prediction.amount
                    );
                }
            });
        }
    }
    Ok(())
}




#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), game.key().as_ref(), b"game"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Game>() + 8
    )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), game.key().as_ref(), b"round"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<Round>() + 8
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        init,
        seeds = [owner.key().as_ref(), game.key().as_ref(), b"vault"],
        bump,
        payer = owner,
        space = std::mem::size_of::<Vault>() + 8 
    )]
    pub vault: Box<Account<'info, Vault>>,

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        init, 
        seeds = [owner.key().as_ref(), game.key().as_ref(), vault.key().as_ref(), b"up"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = up_token_account_authority
    )]
    pub up_token_account:  Box<Account<'info, TokenAccount>>,
    
    #[account(
        constraint = up_token_account.owner == up_token_account_authority.key() @ ErrorCode::VaultUpTokenAccountAuthorityMismatch
    )]
    pub up_token_account_authority: AccountInfo<'info>,

    #[account(
        init, 
        seeds = [owner.key().as_ref(), game.key().as_ref(), vault.key().as_ref(), b"down"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = down_token_account_authority
    )]
    pub down_token_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        constraint = down_token_account.owner == down_token_account_authority.key() @ ErrorCode::VaultDownTokenAccountAuthorityMismatch
    )]
    pub down_token_account_authority: AccountInfo<'info>,

    #[account(
        constraint = round.price_program_pubkey == price_program.key() @ ErrorCode::RoundPriceProgramNotEqual
    )]
    pub price_program: AccountInfo<'info>,

    #[account(
        constraint = round.price_feed_pubkey == price_feed.key() @ ErrorCode::RoundPriceFeedNotEqual
    )]
    pub price_feed: AccountInfo<'info>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    
    // required for Account
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct UpdateGame<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        constraint = game.owner == signer.key() @ ErrorCode::SignerNotOwner
    )]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut,
        constraint = round.owner == signer.key() @ ErrorCode::SignerNotOwner,
        constraint = round.game == game.key() @ ErrorCode::RoundGameKeyNotEqual
    )]
    pub round: Box<Account<'info, Round>>,


    #[account(
        mut,
        constraint = vault.owner == signer.key() @ ErrorCode::SignerNotOwner,
        constraint = round.owner == vault.owner @ ErrorCode::RoundOwnerNotVaultOwner
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = up_token_account.owner == up_token_account_authority.key() @ ErrorCode::VaultUpTokenAccountAuthorityMismatch
    )]
    pub up_token_account:  Box<Account<'info, TokenAccount>>,
    
    #[account(
        constraint = up_token_account.owner == up_token_account_authority.key() @ ErrorCode::VaultUpTokenAccountAuthorityMismatch
    )]
    pub up_token_account_authority: AccountInfo<'info>,

    #[account(
        mut,
        constraint = down_token_account.owner == down_token_account_authority.key() @ ErrorCode::VaultDownTokenAccountAuthorityMismatch
    )]
    pub down_token_account: Box<Account<'info, TokenAccount>>,
    
    #[account(
        constraint = down_token_account.owner == down_token_account_authority.key() @ ErrorCode::VaultDownTokenAccountAuthorityMismatch
    )]
    pub down_token_account_authority: AccountInfo<'info>,

    #[account(
        constraint = round.price_program_pubkey == price_program.key() @ ErrorCode::RoundPriceProgramNotEqual,
        constraint = price_feed.owner.eq(&price_program.key()) @ ErrorCode::PriceProgramNotOwnerOfPriceFeed
    )]
    pub price_program: AccountInfo<'info>,

    #[account(
        constraint = round.price_feed_pubkey == price_feed.key() @ ErrorCode::RoundPriceFeedNotEqual,
        constraint = price_feed.owner.eq(&price_program.key()) @ ErrorCode::PriceProgramNotOwnerOfPriceFeed
    )]
    pub price_feed: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,

    // required for Account
    pub system_program: Program<'info, System>,
}


