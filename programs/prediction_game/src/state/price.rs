use std::cell::Ref;

use chainlink_solana as chainlink;
use pyth_sdk_solana::load_price_feed_from_account_info;
use switchboard::AggregatorAccountData;
use switchboard_v2 as switchboard;
use num_enum::FromPrimitive;

use anchor_lang::prelude::*;


#[account]
pub struct Decimal {
    pub value: i128,
    pub decimals: u32,
}

#[derive(Debug, Eq, PartialEq, FromPrimitive)]
#[repr(u8)]
pub enum Oracle {
    #[num_enum(default)]
    Undefined = 0,
    Chainlink = 1,
    Pyth = 2,
    Switchboard = 3
}

pub fn oracle_value(oracle: Oracle) -> u8 {
    match oracle {
        Oracle::Chainlink => 1,
        Oracle::Switchboard => 3,
        Oracle::Pyth => 2,
        Oracle::Undefined => 0
    }
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

pub fn get_price<'info>(oracle: &u8, price_program: &AccountInfo<'info>, price_feed: &AccountInfo<'info>) -> Result<(i128, i128)> {
    
    let oracle_from_u8 = Oracle::from(*oracle);

    let (price, decimals) = match oracle_from_u8 {
        Oracle::Chainlink => {
            let round = chainlink::latest_round_data(
                price_program.to_account_info(),
                price_feed.to_account_info(),
            )?;
            
            let decimals = chainlink::decimals(
                price_program.to_account_info(),
                price_feed.to_account_info(),
            )?;
    
            (Decimal::new(round.answer, u32::from(decimals)).value, decimals as i128)
        },
        Oracle::Pyth => {
            let price_feed_result = load_price_feed_from_account_info(price_feed).unwrap();
            let current_price = price_feed_result.get_current_price().unwrap();
            ( current_price.price.into(), current_price.expo as i128)
        },
        Oracle::Switchboard => {
            let data = price_feed.try_borrow_data()?;

            let switchboard_account: Ref<AggregatorAccountData> = Ref::map(data, |data| {
                bytemuck::from_bytes(&data[8..std::mem::size_of::<AggregatorAccountData>() + 8])
            });
            
            let switchboard_decimal = switchboard_account.get_result()?;
            ( switchboard_decimal.mantissa, switchboard_decimal.scale as i128)
        },
        Oracle::Undefined => (0, 0)
    };

    Ok((price, decimals))
}