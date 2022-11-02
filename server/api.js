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

config({ path: '.env.' + env })

let connectionConfig = {
    commitment: 'finalized',
    httpHeaders: {
        
    }
};

let bearer = process.env[process.env.ENV?.trim() + "_AUTHORIZATION_BEARER"];

if (bearer !== '') {
    connectionConfig.httpHeaders["Authorization"] = "Bearer " + bearer
}

let connection = new Connection(process.env[process.env.ENV?.trim() + "_ENDPOINT"], connectionConfig);
let cluster = process.env.ENV?.trim().toLowerCase();
let isDevnet = cluster === 'devnet'

let workspace = Workspace.load(connection, new anchor.Wallet(owner), cluster)

let paf = new PollingAccountsFetcher(connection.rpcEndpoint, 5000, 5)
paf.start();

let vaults = new Set()
let games = new Set()
let histories = new Map()
let rounds = new Set()

async function loadGeneric(paf, workspace, vaults, rounds, games, histories) {
    console.log('loading generic api');
    await loadVaults(paf, workspace, vaults);
    await loadRounds(paf, workspace, rounds);
    await loadGames(paf, workspace, games);
    await loadGameHistories(paf, workspace, games, histories);
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
                    paf.accounts.delete(gameUserPredictionHistoryPubkey.toBase58());
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
                await loadGeneric(paf, workspace, vaults, rounds, games, histories),
            ]);
        }, 60 * 1000)
    } catch (error) {
        databaseUpdateLoop()
    }
}

databaseUpdateLoop();


const database = express();
database.use(cors());
database.use(bodyParser.json());

database.get('/game', (req, res) => {
    res.send([...games.values()].map(pub => {
        let account = paf.accounts.get(pub);
        if (account !== undefined)
            return JSON.stringify(paf.accounts.get(pub).data)
        else
            return undefined
    }).filter(g => g !== undefined))
})

database.get('/round', (req, res) => {

    res.send([...rounds.values()].map(pub => {
        let account = paf.accounts.get(pub);
        if (account !== undefined)
            return JSON.stringify(paf.accounts.get(pub).data)
        else
            return undefined
    }).filter(r => r !== undefined))
})


database.get('/history', (req, res) => {
    res.send(JSON.stringify(histories.values()))
})

database.get('/vault', (req, res) => {
    res.send([...vaults.values()].map(pub => {
        let account = paf.accounts.get(pub);
        if (account !== undefined)
            return JSON.stringify(paf.accounts.get(pub).data)
        else
            return undefined
    }).filter(v => v !== undefined))
})

database.listen(4000, () => { console.log('database started on port 4000') });