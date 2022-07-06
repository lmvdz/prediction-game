use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
#[repr(packed)]
pub struct Crank {

    pub address: Pubkey,
    pub owner: Pubkey,
    pub user: Pubkey,
    pub user_claimable: Pubkey,
    pub game: Pubkey,
    
    pub cranks: u16,
    pub last_crank_round: Pubkey,
    pub last_paid_crank_round: Pubkey,

    pub padding01: [Pubkey; 8]

}