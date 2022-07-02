use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};

use crate::errors::ErrorCode;
use crate::state::Claim;
use crate::state::Game;
use crate::state::Round;
use crate::state::User;
use crate::state::UserClaimable;
use crate::state::UserPrediction;
use crate::state::Vault;
use crate::utils::transfer_token_account;
use crate::utils::transfer_token_account_signed;

pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
    
    let user = &mut ctx.accounts.user;

    user.address = user.key();
    user.owner = ctx.accounts.owner.key();

    let user_claimable_loader = &ctx.accounts.user_claimable;
    user.user_claimable = user_claimable_loader.to_account_info().key();

    
    let user_claimable = &mut user_claimable_loader.load_init()?;
    user_claimable.user = user.key();
    user_claimable.claims = [ Claim { amount: 0, mint: Pubkey::default(), vault: Pubkey::default() }; 10];
    Ok(())

}

pub fn init_user_prediction(ctx: Context<InitUserPrediction>, up_or_down: u8, amount: u64) -> Result<()> {
    let current_round = &mut ctx.accounts.current_round;
    let game = &mut ctx.accounts.game;
    let user = &mut ctx.accounts.user;
    let mut user_claimable = ctx.accounts.user_claimable.load_mut()?;

    require!(amount.saturating_div(10_u64.pow(game.token_decimal.into())) > 1, ErrorCode::MinimumPredictionAmountNotMet);

    require!(!(current_round.finished), ErrorCode::RoundAlreadyFinished);

    require!(!(current_round.settled), ErrorCode::RoundAlreadySettled);

    require!(up_or_down == 1 || up_or_down == 2, ErrorCode::InvalidUserPredictionDirection);

    let user_prediction = &mut ctx.accounts.user_prediction;
    let user_prediction_pubkey = user_prediction.key();
    user_prediction.owner = ctx.accounts.signer.key();
    user_prediction.address = user_prediction_pubkey;
    user_prediction.user = user.key();
    user_prediction.user_claimable = user.user_claimable.key();
    user_prediction.game = game.key();
    user_prediction.round = current_round.key();
    user_prediction.up_or_down = up_or_down;
    user_prediction.amount = amount;
    user_prediction.settled = false;

    let vault = &ctx.accounts.vault;
    let vault_ata = &mut ctx.accounts.vault_ata;
    let from_token_account = &mut ctx.accounts.from_token_account;
    let from_token_account_authority = &ctx.accounts.from_token_account_authority;
    let token_program = &ctx.accounts.token_program;

    if user_prediction.up_or_down == 1 {
        current_round.total_up_amount = current_round.total_up_amount.checked_add(user_prediction.amount).unwrap();
    } else if user_prediction.up_or_down == 2 {
        current_round.total_down_amount = current_round.total_down_amount.checked_add(user_prediction.amount).unwrap();
    }

    // find first claim 
    let mut some_user_claim_position = user_claimable.claims.iter().position(|claim| claim.mint.eq(&vault.token_mint.key()) && claim.vault.eq(&vault.address.key()));

    some_user_claim_position = if some_user_claim_position.is_none() {
        user_claimable.claims.iter().position(|claim| claim.mint.eq(&Pubkey::default()) && claim.vault.eq(&Pubkey::default()))
    } else {
        some_user_claim_position
    };

    require!(some_user_claim_position.is_some(), ErrorCode::NoAvailableClaimFound);

    let user_claim_position = some_user_claim_position.unwrap();

    let user_claim = &mut user_claimable.claims[user_claim_position];

    current_round.total_predictions += 1;

    // deposit or use unclaimed
    let deposit_amount = if user_claim.amount.gt(&user_prediction.amount) || user_claim.amount.eq(&user_prediction.amount) {
        
        user_claim.amount = user_claim.amount.saturating_sub(user_prediction.amount);
        0_u64

    } else if user_claim.amount.gt(&0_u64) {

        let user_prediction_remaining_amount = user_prediction.amount.saturating_sub(user_claim.amount);
        user_claim.amount = user_claim.amount.saturating_sub(user_prediction.amount);
        user_prediction_remaining_amount

    } else {
        
        user_prediction.amount

    };

    if user_claim.amount.eq(&0) && !user_claim.mint.eq(&Pubkey::default()) && !user_claim.vault.eq(&Pubkey::default()) {
        user_claim.mint = Pubkey::default();
        user_claim.vault = Pubkey::default();
    }

    if deposit_amount.gt(&0_u64) {
        require!(transfer_token_account(from_token_account, vault_ata, from_token_account_authority, token_program, deposit_amount).is_ok(), ErrorCode::UserPredictionFailedToDeposit);
    }

    Ok(())
}

pub fn user_claim_all<'info>(ctx: Context<'_, '_, '_, 'info, UserClaimAll<'info>>) -> Result<()> {
    let user = &ctx.accounts.user;
    let mut user_claimable = ctx.accounts.user_claimable.load_mut()?;
    let accounts = ctx.remaining_accounts;

    let token_program = &ctx.accounts.token_program;

    if accounts.len() % 4 == 0 && accounts.len() >= 4 {
        let mut index: usize = 0;

        for _i in 0..(accounts.len()/4) {

            // load the game
            // let game_ata_account_info = accounts[index].to_account_info().clone();
            // let game = &Account::<'info, Game>::try_from(&game_ata_account_info).unwrap();

            let vault_account_info = accounts[index].to_account_info().clone();
            let vault = &Account::<'info, Vault>::try_from(&vault_account_info).unwrap();
            let vault_ata_authority_nonce = vault.vault_ata_authority_nonce;

            // require_keys_eq!(game.vault, vault.key(), ErrorCode::GameVaultMismatch);

            // load the user_claim

            let some_user_claim_position = user_claimable.claims.iter().position(|claim| claim.mint.eq(&vault.token_mint.key()) && claim.vault.eq(&vault.address.key()));

            // require that the user claim exists
        
            require!(some_user_claim_position.is_some(), ErrorCode::NoAvailableClaimFound);
        
            let user_claim_position = some_user_claim_position.unwrap();
        
            let user_claim = &mut user_claimable.claims[user_claim_position];

            // require that the user claim has an amount to claim
        
            require!(user_claim.amount.gt(&0) && user_claim.mint.eq(&vault.token_mint.key()), ErrorCode::InsufficientClaimableAmount);

            
            let vault_ata_account_info = accounts[index+1].to_account_info().clone();
            let vault_ata = &mut Account::<'info, TokenAccount>::try_from(&vault_ata_account_info).unwrap();
            let vault_ata_key = vault_ata.key();

            require_keys_eq!(vault.vault_ata, vault_ata_key, ErrorCode::VaultAtaNotEqualToAtaOnVault);

            let vault_ata_authority = &accounts[index+2];
            
            let to_token_account_info = accounts[index+3].to_account_info().clone();
            let to_token_account = &mut Account::<'info, TokenAccount>::try_from(&to_token_account_info).unwrap();

            require_keys_eq!(to_token_account.owner, user.owner, ErrorCode::ToTokenAccountNotOwnedByUserOwner);

            let signature_seeds = [vault_ata_key.as_ref(), &[vault_ata_authority_nonce]];
            let signers = &[&signature_seeds[..]];

            require!(transfer_token_account_signed(
                vault_ata, //  from 
                to_token_account, // to 
                vault_ata_authority, // from auth
                signers, // signers
                token_program, // TOKEN_PROGRAM
                user_claim.amount
            ).is_ok(), ErrorCode::FailedToClaim);

            user_claim.amount = 0;
            user_claim.mint = Pubkey::default();
            user_claim.vault = Pubkey::default();

            index+=4;
        }
    }  

    Ok(())
}

pub fn user_claim(ctx: Context<UserClaim>, amount: u64) -> Result<()> {
    // let game = &ctx.accounts.game;
    let vault = &ctx.accounts.vault;
    let mut user_claimable = ctx.accounts.user_claimable.load_mut()?;


    let some_user_claim_position = user_claimable.claims.iter().position(|claim| claim.mint.eq(&vault.token_mint.key()) && claim.vault.eq(&vault.address.key()));

    require!(some_user_claim_position.is_some(), ErrorCode::NoAvailableClaimFound);

    let user_claim_position = some_user_claim_position.unwrap();

    let user_claim = &mut user_claimable.claims[user_claim_position];

    require!(user_claim.amount.gt(&0) && user_claim.mint.eq(&vault.token_mint.key()), ErrorCode::InsufficientClaimableAmount);

    
    let vault_ata = &mut ctx.accounts.vault_ata;
    let vault_ata_key = &vault_ata.key();
    let vault_ata_authority_nonce = vault.vault_ata_authority_nonce;
    let vault_ata_authority = &ctx.accounts.vault_ata_authority;
    let to_token_account = &mut ctx.accounts.to_token_account;
    let token_program = &ctx.accounts.token_program;

    let signature_seeds = [vault_ata_key.as_ref(), &[vault_ata_authority_nonce]];
    let signers = &[&signature_seeds[..]];

    require!(transfer_token_account_signed(
        vault_ata, //  from 
        to_token_account, // to 
        vault_ata_authority, // from auth
        signers, // signers
        token_program, // TOKEN_PROGRAM
        amount
    ).is_ok(), ErrorCode::FailedToClaim);

    user_claim.amount = user_claim.amount.saturating_sub(amount);
    user_claim.mint = Pubkey::default();
    user_claim.vault = Pubkey::default();

    Ok(())
}



#[derive(Accounts)]
pub struct CloseUserAccount<'info> {

    pub signer: Signer<'info>,

    #[account(mut, 
        close = receiver,
        constraint = signer.key() == user.owner @ ErrorCode::SignerNotOwner
    )]
    pub user: Box<Account<'info, User>>,

    #[account(
        mut, 
        close = receiver,
        constraint = user_claimable.to_account_info().key() == user.key()
    )]
    pub user_claimable: AccountLoader<'info, UserClaimable>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

}

#[derive(Accounts)]
pub struct AdminCloseUserAccount<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut, 
        close = receiver,
        // constraint = signer.key() == user.owner @ ErrorCode::SignerNotOwner
    )]
    pub user: Box<Account<'info, User>>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

}


#[derive(Accounts)]
pub struct UserClaimAll<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(constraint = signer.key() == user.owner )]
    pub user: Box<Account<'info, User>>,

    #[account(
        mut,
        has_one = user
    )]
    pub user_claimable: AccountLoader<'info, UserClaimable>,

    pub token_program: Program<'info, Token>

}

#[derive(Accounts)]
pub struct UserClaim<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(constraint = signer.key() == user.owner )]
    pub user: Box<Account<'info, User>>,

    #[account(
        mut,
        has_one = user
    )]
    pub user_claimable: AccountLoader<'info, UserClaimable>,

    #[account(
        mut,
        constraint = to_token_account.owner == user.owner @ErrorCode::UserOwnerNotToTokenAccountOwner
    )]
    pub to_token_account: Box<Account<'info, TokenAccount>>,

    #[account()]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = vault_ata.owner == vault.vault_ata_authority.key() 
    )]
    pub vault_ata: Box<Account<'info, TokenAccount>>,

    /// CHECK:
    #[account(
        constraint = vault_ata_authority.key() == vault_ata.owner
    )]
    pub vault_ata_authority: AccountInfo<'info>,

    pub token_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>

}

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        seeds = [ env!("CARGO_PKG_VERSION").as_bytes(), owner.key().as_ref(), b"user" ], 
        bump, 
        payer = owner,
        space = std::mem::size_of::<User>() + 8
    )]
    pub user: Box<Account<'info, User>>, 

    #[account(
        init,
        seeds = [ env!("CARGO_PKG_VERSION").as_bytes(), user.key().as_ref(), b"user_claimable" ],
        bump,
        payer = owner,
        space = std::mem::size_of::<UserClaimable>() + 8
    )]
    pub user_claimable: AccountLoader<'info, UserClaimable>,

    // required for Account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitUserPrediction<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account()]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut,
        constraint = user.owner == signer.key() @ ErrorCode::SignerNotOwnerOfUser
    )]
    pub user: Box<Account<'info, User>>,

    #[account(
        mut,
        has_one = user
    )]
    pub user_claimable: AccountLoader<'info, UserClaimable>,

    #[account(
        mut,
        constraint = game.key() == current_round.game @ ErrorCode::RoundGameKeyNotEqual,
        constraint = !current_round.finished @ ErrorCode::RoundAlreadyFinished,
        constraint = current_round.round_predictions_allowed @ ErrorCode::RoundPredictionsNotAllowed
    )]
    pub current_round: Box<Account<'info, Round>>,

    
    #[account(
        init,
        seeds = [
            env!("CARGO_PKG_VERSION").as_bytes(), 
            signer.key().as_ref(), 
            game.key().as_ref(), 
            current_round.key().as_ref(), 
            &[current_round.round_number.to_be_bytes()[0]], 
            &[current_round.round_number.to_be_bytes()[1]],
            &[current_round.round_number.to_be_bytes()[2]], 
            &[current_round.round_number.to_be_bytes()[3]],
            b"user_prediction"
        ],
        bump, 
        payer = signer,
        space = std::mem::size_of::<UserPrediction>() + 8
    )]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(
        constraint = vault.vault_ata == vault_ata.key()
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        constraint = vault_ata.owner == vault.vault_ata_authority @ ErrorCode::RoundOwnerNotVaultOwner
    )]
    pub vault_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut
    )]
    pub from_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK:
    #[account(
        constraint = from_token_account_authority.key() == from_token_account.owner
    )]
    pub from_token_account_authority: AccountInfo<'info>,


    pub token_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseUserPrediction<'info> { 
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut, 
        close = user_prediction_close_receiver,
        constraint = user_prediction.settled @ ErrorCode::UserPredictionNotSettled
    )]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(
        mut,
        constraint = user_prediction.owner == user_prediction_close_receiver.key() @ ErrorCode::UserOwnerNotReceiver
    )]
    pub user_prediction_close_receiver: SystemAccount<'info>
}

#[derive(Accounts)]
pub struct AdminCloseUserPrediction<'info> { 
    #[account()]
    pub signer: Signer<'info>,

    #[account(constraint = game.owner == signer.key())]
    pub game: Box<Account<'info, Game>>,

    #[account(
        mut, 
        close = user_prediction_close_receiver
    )]
    pub user_prediction: Box<Account<'info, UserPrediction>>,

    #[account(
        mut,
        constraint = user_prediction.owner == user_prediction_close_receiver.key() @ ErrorCode::UserOwnerNotReceiver
    )]
    pub user_prediction_close_receiver: SystemAccount<'info>
}

#[derive(Accounts)]
pub struct AdminCloseUserClaimable<'info> { 
    #[account()]
    pub signer: Signer<'info>,

    #[account(
        mut, 
        close = user_claimable_close_receiver
    )]
    pub user_claimable: AccountLoader<'info, UserClaimable>,

    #[account(
        mut
    )]
    pub user_claimable_close_receiver: SystemAccount<'info>
}