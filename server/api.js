const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const Round = require('sdk/lib/accounts/round').default
const Game = require('sdk/lib/accounts/game').default
const Vault = require('sdk/lib/accounts/vault').default

const RoundHistory = require('sdk/lib/accounts/roundHistory').default
const UserPredictionHistory = require('sdk/lib/accounts/userPredictionHistory').default


const { Workspace } = require('sdk/lib/workspace')
const { PollingAccountsFetcher } = require('polling-account-fetcher')

const owner = require('./owner.js')
const anchor = require('@project-serum/anchor')
const { Connection } = require("@solana/web3.js");

const { config } = require('dotenv')

let args = process.argv.slice(2)

let env = args[0]

config({path: '.env.'+env})

let devnetConnection = new Connection(process.env.DEVNET_ENDPOINT.toString());
const devnetWorkspace = Workspace.load(devnetConnection, new anchor.Wallet(owner), 'devnet')

let mainnetConnection = new Connection(process.env.MAINNET_ENDPOINT.toString());
const mainnetWorkspace = Workspace.load(mainnetConnection, new anchor.Wallet(owner), 'mainnet-beta')

const pafDevnet = new PollingAccountsFetcher(process.env.DEVNET_ENDPOINT.toString(), 1000, 5)
pafDevnet.start();

const pafMainnet = new PollingAccountsFetcher(process.env.MAINNET_ENDPOINT.toString(), 1000, 5)
pafMainnet.start();

let vaults = {
    devnet: new Set(),
    mainnet: new Set()
}
let games = {
    devnet: new Set(),
    mainnet: new Set()
}
let histories = {
    devnet: new Map(),
    mainnet: new Map()
}
let rounds = {
    devnet: new Set(),
    mainnet: new Set()
}

async function loadGeneric(paf, workspace, vaults, rounds, games, histories) {
    await loadVaults(paf, workspace, vaults),
    await loadRounds(paf, workspace, rounds),
    await loadGames(paf, workspace, games),
    await loadGameHistories(paf, workspace, games, histories)
}


async function loadGameHistories(paf, workspace, games, histories) {
    try {
        [...games.values()].filter(game => paf.accounts.has(game) && paf.accounts.get(game).data !== null && paf.accounts.get(game).data !== undefined).map(game => new Game(paf.accounts.get(game).data)).forEach(game => {
            let gameUserPredictionHistoryPubkey = game.account.userPredictionHistory;
            if (!paf.accounts.has(gameUserPredictionHistoryPubkey.toBase58())) {
                //@ts-ignore
                paf.addProgram('userPredictionHistory', gameUserPredictionHistoryPubkey.toBase58(), workspace.program, async (data) => {
                    if (!histories.has(game.account.address.toBase58())) {
                        histories.set(game.account.address.toBase58(), { roundHistory: null, userPredictionHistory: data });
                    } else {
                        histories.set(game.account.address.toBase58(), { ...histories.get(game.account.address.toBase58()), userPredictionHistory: data });
                    }
                }, (error) => {
                    paf.accounts.delete(gameUserPredictionHistoryPubkey.toBase58())
                });
            }
            let gameRoundHistoryPubkey = game.account.roundHistory;
            if (!paf.accounts.has(gameRoundHistoryPubkey.toBase58())) {
                //@ts-ignore
                paf.addProgram('roundHistory', gameRoundHistoryPubkey.toBase58(), workspace.program, async (data) => {
                    if (!histories.has(game.account.address.toBase58())) {
                        histories.set(game.account.address.toBase58(), { roundHistory: data, userPredictionHistory: null });
                    } else {
                        histories.set(game.account.address.toBase58(), { ...histories.get(game.account.address.toBase58()), roundHistory: data });
                    }
                }, (error) => {
                    paf.accounts.delete(gameRoundHistoryPubkey.toBase58())
                });
            }
        })
    } catch (error) {
      console.error(error);
    }
  }

async function loadRounds(paf, workspace, rounds) {
    try {
        return await Promise.allSettled(((await Promise.all((await (workspace).program.account.round.all()).map(async (roundProgramAccount) => (new Round(
            roundProgramAccount.account
        )))))).map(async round => {
            let roundAddress = round.account.address.toBase58()
            if (!rounds.has(roundAddress)) {
                rounds.add(roundAddress);
            }
        
            if (!paf.accounts.has(roundAddress)) {
                //@ts-ignore
                paf.addProgram('round', roundAddress, workspace.program, async (data) => {
                    // console.log(data);
                }, (error) => {
                    paf.accounts.delete(roundAddress)
                    rounds.delete(roundAddress)
                }, round.account)
            }
            return;
        }))
    } catch (error) {
        console.error(error);
    }
        
  }
  
  async function loadGames(paf, workspace, games) {
    try {
        return await Promise.allSettled(((await Promise.all((await (workspace).program.account.game.all()).map(async (gameProgramAccount) => (new Game(
        gameProgramAccount.account
        )))))).map(async newgame => {
            let newGameAddress = newgame.account.address.toBase58();
        
            if (!games.has(newGameAddress)) {
                games.add(newGameAddress);
            }
        
            if (!paf.accounts.has(newGameAddress)) {
                //@ts-ignore
                paf.addProgram('game', newGameAddress, workspace.program, async (data) => {
                    // console.log(data);
                }, (error) => {
                    paf.accounts.delete(newGameAddress)
                    games.delete(newGameAddress)
                }, newgame.account)
            }
            return;
        }))
    } catch (error) {
        console.error(error);
    }
  }
  
  async function loadVaults(paf, workspace, vaults) {
    try {
        return await Promise.allSettled(((await Promise.all((await workspace.program.account.vault.all()).map(async (vaultProgramAccount) => (new Vault(
            vaultProgramAccount.account
          )))))).map(async (vault) => {
            let vaultAddress = vault.account.address.toBase58();
    
            if (!vaults.has(vaultAddress)) {
              vaults.add(vaultAddress);
            }
              
            if (!paf.accounts.has(vaultAddress)) {
                //@ts-ignore
                paf.addProgram('vault', vaultAddress, workspace.program, async (data) => {
                    // console.log(data);
                }, (error) => {
                    paf.accounts.delete(vaultAddress)
                    vaults.delete(vaultAddress)
                }, vault.account)
            }
            return;
          }));
    } catch (error) {
        console.error(error);
    }
      
  }

let updateInterval = null;


const databaseUpdateLoop = () => {
    try {
        if (updateInterval) clearInterval(updateInterval)
        updateInterval = setInterval(async () => {
            await Promise.allSettled([
                await loadGeneric(pafDevnet, devnetWorkspace, vaults.devnet, rounds.devnet, games.devnet, histories.devnet),
                await loadGeneric(pafMainnet, mainnetWorkspace, vaults.mainnet, rounds.mainnet, games.mainnet, histories.mainnet)
            ]);
        }, 10 * 1000)
    } catch (error) {
        databaseUpdateLoop()
    }
}

databaseUpdateLoop();


const database = express();
database.use(cors());
database.use(bodyParser.json());

database.get('/:cluster/game', (req, res) => {
    res.send([...games[req.params.cluster].values()].map(pub => {
        return JSON.stringify(paf.accounts.get(pub).data)
    }))
})

database.get('/:cluster/round', (req, res) => {
    res.send([...rounds[req.params.cluster].values()].map(pub => {
        return JSON.stringify(paf.accounts.get(pub).data)
    }))
})


function replacer(key, value) {
    if(value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
}


database.get('/:cluster/history', (req, res) => {
    res.send(JSON.stringify(histories[req.params.cluster], replacer))
})

database.get('/:cluster/vault', (req, res) => {
    res.send([...vaults[req.params.cluster].values()].map(pub => {
        return JSON.stringify(paf.accounts.get(pub).data)
    }))
})

database.listen(4000, () => {console.log('database started on port 4000')});