use pyth_sdk_solana::load_price_feed_from_account_info;
use chainlink_solana as chainlink;
use std::str::FromStr;

use anchor_lang::prelude::*;


#[account]
pub struct Decimal {
    pub value: i128,
    pub decimals: u32,
}

impl Decimal {
    pub fn new(value: i128, decimals: u32) -> Self {
        Decimal { value, decimals }
    }
}

impl std::fmt::Display for Decimal {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut scaled_val = self.value.to_string();
        if scaled_val.len() <= self.decimals as usize {
            scaled_val.insert_str(
                0,
                &vec!["0"; self.decimals as usize - scaled_val.len()].join(""),
            );
            scaled_val.insert_str(0, "0.");
        } else {
            scaled_val.insert(scaled_val.len() - self.decimals as usize, '.');
        }
        f.write_str(&scaled_val)
    }
}

pub fn get_price<'info>(price_program: &AccountInfo<'info>, price_feed: &AccountInfo<'info>) -> Result<i128> {
    let mut price: i128 = 0;
    if Pubkey::from_str("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny").unwrap().eq(&price_program.key()) { // chainlink
        let round = chainlink::latest_round_data(
            price_program.to_account_info(),
            price_feed.to_account_info(),
        )?;
        let decimals = chainlink::decimals(
            price_program.to_account_info(),
            price_feed.to_account_info(),
        )?;
        price = Decimal::new(round.answer, u32::from(decimals)).value;
    } else if 
        Pubkey::from_str("gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s").unwrap().eq(&price_program.key()) // pyth devnet
        ||
        Pubkey::from_str("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH").unwrap().eq(&price_program.key())  // pyth mainnet
    { 
        let price_feed_result = load_price_feed_from_account_info(price_feed).unwrap();
        price = price_feed_result.get_current_price().unwrap().price.into();
    }
    Ok(price)
}