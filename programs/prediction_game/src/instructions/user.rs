use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

use crate::state::Vault;
use crate::state::Game;
use crate::state::Round;
use crate::state::User;
use crate::state::UserPrediction;
// use crate::state::UserPredictions;
use crate::errors::ErrorCode;

pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
    
    let user = &mut ctx.accounts.user;
    let user_pubkey = user.key();
    user.init(
        user_pubkey, 
        ctx.accounts.owner.key(), 
        ctx.accounts.token_account.key(), 
        ctx.accounts.owner.key()
    )

}

pub fn init_user_prediction(ctx: Context<InitUserPrediction>, up_or_down: u8, amount: u64) -> Result<()> {
    let round = &mut ctx.accounts.round;

    // let bytes = round.round_number.to_be_bytes();

    // for i in 0..bytes.len() {
    //     msg!("{}", bytes[i]);
    // }
    // round can't be over
    require!(!(round.finished), ErrorCode::RoundAlreadyFinished);

    require!(!(round.settled), ErrorCode::RoundAlreadySettled);

    require!(up_or_down == 1 || up_or_down == 2, ErrorCode::InvalidUserPredictionDirection);

    let user_prediction = &mut ctx.accounts.user_prediction;
    let user_prediction_pubkey = user_prediction.key();
    user_prediction.owner = ctx.accounts.signer.key();
    user_prediction.address = user_prediction_pubkey;
    user_prediction.user = ctx.accounts.user.key();
    user_prediction.game = ctx.accounts.game.key();
    user_prediction.up_or_down = up_or_down;
    user_prediction.amount = amount;
    user_prediction.deposited = false;
    user_prediction.settled = false;


    let vault = &mut ctx.accounts.vault;
    let from_token_account = &mut ctx.accounts.from_token_account;
    let to_token_account = &mut ctx.accounts.to_token_account;
    let authority = &mut ctx.accounts.signer.to_account_info();
    let token_program = &ctx.accounts.token_program;

    if user_prediction.up_or_down == 1 {
        round.total_up_amount = round.total_up_amount.checked_add(user_prediction.amount).unwrap();
        user_prediction.deposited = true;
    } else if user_prediction.up_or_down == 2 {
        round.total_down_amount = round.total_down_amount.checked_add(user_prediction.amount).unwrap();
        user_prediction.deposited = true;
    }

    user_prediction.deposit(vault, from_token_account, to_token_account, authority, token_program)
}

pub fn transfer_user_token_account(ctx: Context<UserTransfer>, amount: u64) -> Result<()> {

    ctx.accounts.user.transfer(
        ctx.accounts.from_token_account.to_account_info(), 
        ctx.accounts.to_token_account.to_account_info(), 
        ctx.accounts.signer.to_account_info().clone(), 
        ctx.accounts.token_program.to_account_info(), 
        amount
    )

}

// pub fn close_user_token_account(ctx: Context<CloseUserTokenAccount>) -> Result<()> {
//     close_token_account(
//         ctx.accounts.user_token_account.to_account_info().clone(), 
//         ctx.accounts.receiving_token_account.to_account_info().clone(), 
//         ctx.accounts.signer.to_account_info().clone(), 
//         ctx.accounts.token_program.to_account_info().clone()
//     )
// }


#[derive(Accounts)]
pub struct CloseUserAccount<'info> {

    #[account()]
    pub signer: Signer<'info>,

    #[account(mut, 
        close = receiver,
        constraint = signer.key() == user.owner @ ErrorCode::SignerNotOwner
    )]
    pub user: Box<Account<'info, User>>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

}

#[derive(Accounts)]
pub struct CloseUserTokenAccount<'info> {

    #[account()]
    pub signer: Signer<'info>,

    #[account(mut, 
        constraint = signer.key() == user_token_account.owner @ ErrorCode::SignerNotOwner
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, 
        constraint = signer.key() == user_token_account.owner @ ErrorCode::SignerNotOwner,
        constraint = receiving_token_account.mint == user_token_account.mint @ ErrorCode::TokenAccountMintMismatch
    )]
    pub receiving_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>

}


#[derive(Accounts)]
pub struct UserTransfer<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub user: Box<Account<'info, User>>,

    #[account(
        mut,
        constraint = to_token_account.owner == user.owner @ErrorCode::UserOwnerNotToTokenAccountOwner,
        token::mint = token_mint.key()
    )]
    pub to_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = from_token_account.owner == user.owner @ ErrorCode::UserOwnerNotFromTokenAccountOwner,
        token::mint = token_mint.key()
    )]
    pub from_token_account: Box<Account<'info, TokenAccount>>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>

}

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), b"user"], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<User>() + 8
    )]
    pub user: Box<Account<'info, User>>, 

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        init, 
        seeds = [crate::ID.as_ref(), env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), b"token_account"], 
        bump, 
        payer = owner, 
        token::mint = token_mint,
        token::authority = owner
    )]
    pub token_account:  Box<Account<'info, TokenAccount>>,

    // required for TokenAccount
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    // required for Account
    pub system_program: Program<'info, System>,
}

// #[derive(Accounts)]
// pub struct DepositUserPrediction<'info> {
//     #[account(mut)]
//     pub signer: Signer<'info>,

//     #[account()]
//     pub game: Box<Account<'info, Game>>,

//     #[account(
//         mut,
//         constraint = game.key() == round.game @ ErrorCode::RoundGameKeyNotEqual,
//         constraint = !round.finished @ ErrorCode::RoundAlreadyFinished
//     )]
//     pub round: Box<Account<'info, Round>>,

//     #[account(
//         mut,
//         constraint = vault.owner == round.owner @ ErrorCode::RoundOwnerNotVaultOwner
//     )]
//     pub vault: Box<Account<'info, Vault>>,

//     #[account(
//         mut,
//         constraint = signer.key() == user_prediction.owner @ ErrorCode::SignerNotOwnerOfUserPrediction
//     )]
//     pub user_prediction: Box<Account<'info, UserPrediction>>,


    
//     // required for Account
//     pub system_program: Program<'info, System>,
// }

#[derive(Accounts)]
pub struct InitUserPrediction<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut,
        constraint = game.key() == round.game @ ErrorCode::RoundGameKeyNotEqual,
        constraint = !round.finished @ ErrorCode::RoundAlreadyFinished
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        mut,
        constraint = vault.owner == round.owner @ ErrorCode::RoundOwnerNotVaultOwner
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(mut,
        constraint = user.owner == signer.key() @ ErrorCode::SignerNotOwnerOfUser
    )]
    pub user: Box<Account<'info, User>>,

    #[account(
        init,
        seeds = [
            crate::ID.as_ref(), 
            env!("CARGO_PKG_VERSION").as_bytes(), 
            signer.key().as_ref(), 
            game.key().as_ref(), 
            round.key().as_ref(), 
            &[round.round_number.to_be_bytes()[0]], 
            &[round.round_number.to_be_bytes()[1]],
            &[round.round_number.to_be_bytes()[2]], 
            &[round.round_number.to_be_bytes()[3]],
            b"user_prediction"
        ],
        bump, 
        payer = signer,
        space = std::mem::size_of::<UserPrediction>() + 8,
    )]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(
        mut,
        constraint = vault.owner == to_token_account.owner @ ErrorCode::VaultOwnerNotToTokenAccountOwner,
        constraint = (vault.up_token_account_pubkey == to_token_account.key() || vault.down_token_account_pubkey == to_token_account.key()) @ ErrorCode::ToTokenAccountNotPartOfVault,
        token::mint = token_mint.key()
    )]
    pub to_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = signer.key() == from_token_account.owner @ ErrorCode::SignerNotOwnerOfFromTokenAccount,
        constraint = from_token_account.amount > 0 @ ErrorCode::FromTokenAccountZeroBalance,
        token::mint = token_mint.key()
    )]
    pub from_token_account: Box<Account<'info, TokenAccount>>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,

    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseUserPrediction<'info> { 
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account()]
    pub game: Box<Account<'info, Game>>,

    #[account(
        constraint = game.key() == round.game @ ErrorCode::RoundGameKeyNotEqual,
        constraint = round.finished @ ErrorCode::RoundNotFinished
    )]
    pub round: Box<Account<'info, Round>>,

    #[account()]
    pub user: Box<Account<'info, User>>,

    #[account(
        mut, 
        close = user_prediction_close_receiver,
        constraint = user_prediction.settled @ ErrorCode::UserPredictionNotSettled
    )]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(
        mut,
        constraint = user.owner == user_prediction_close_receiver.key() @ ErrorCode::UserOwnerNotReceiver
    )]
    pub user_prediction_close_receiver: SystemAccount<'info>
}