const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { execSync } = require('child_process');
const { config } = require('dotenv')

config({path: '.env'})


const bs58 = require('bs58')
const { PublicKey, Connection, Keypair } = require("@solana/web3.js");
const { getMint, mintTo, getAccount, getAssociatedTokenAddress } = require("@solana/spl-token");

const owner = require('./owner.js')
const anchor = require('@project-serum/anchor')
const admin = require('sdk/lib/admin')
const _api = require('./api.js')

let devnetConnection = new Connection(process.env.DEVNET_ENDPOINT.toString());
let mainnetConnection = new Connection(process.env.MAINNET_ENDPOINT.toString());

const devnetMintKeypair = Keypair.fromSecretKey(bs58.decode("3dS4W9gKuGQcvA4s9dSRKLGJ8UAdu9ZeFLxJfv6WLK4BzZZnt3L2WNSJchjtgLi7BnxMTcpPRU1AG9yfEkR2cxDT"))
const devnetMintDecimals = 6;

;(async () => {
    let devnetMint = await getMint(devnetConnection, devnetMintKeypair.publicKey);
    let mainnetMint = await getMint(mainnetConnection, new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"))
    
    try {
        devnetMint = await admin.createFakeMint(devnetConnection, devnetMintKeypair, owner, devnetMintDecimals);
    } catch (error) {
        console.error(error);
    }
    // let ownerMintAta = await getAssociatedTokenAddress(devnetMint.address, owner.publicKey)
    // await admin.closeAll(owner, devnetConnection, 'devnet', ownerMintAta)
    await admin.init(owner, devnetConnection, 'devnet', devnetMint)

    // await admin.init(owner, mainnetConnection, 'mainnet-beta', mainnetMint)
})();


execSync('rm -rf ./frontend/*')
execSync('rm -rf ./aggr/*')

execSync('cp -r ../frontend/dist/* frontend')
execSync('cp -r ../aggr/dist/* aggr')


/**
 * DEVNET FRONTEND SERVER
 */

const devnet = express();
devnet.use(cors());
devnet.use(bodyParser.json());

devnet.use(express.static('frontend'));
devnet.get('/*', (req, res) => {
    res.sendFile(__dirname + '/frontend/index.html');
})

devnet.listen(3000, () => {console.log('devnet started on port 3000')});

/**
 * MAINNET FRONTEND SERVER
 */
const mainnet = express();
mainnet.use(cors());
mainnet.use(bodyParser.json());

mainnet.use(express.static('frontend'));
mainnet.get('/*', (req, res) => {
    res.sendFile(__dirname + '/frontend/index.html');
})

mainnet.listen(3001, () => {console.log('mainnet started on port 3001')});


const faucet = express();
faucet.use(cors());
faucet.use(bodyParser.json())


/**
 * DEVNET FAUCET SERVER
 */

faucet.get('/airdrop/:destination', async (req, res) => {
    let address = new PublicKey(req.params.destination);
    let tryAirdrop = async (retry=0) => {
        if (retry < 10) {
            try {
                let account = await getAccount(devnetConnection, address);
                if (account.isInitialized) {
                    mintTo(devnetConnection, owner, devnetMintKeypair.publicKey, address, owner, BigInt(((new anchor.BN(1000)).mul((new anchor.BN(10)).pow(new anchor.BN(devnetMintDecimals)))).toString()), [owner]).then((signature) => {
                        return res.send(signature);
                    }).catch(error => {
                        console.error(error);
                        return res.status(500).send(error);
                    })
                } else {
                    setTimeout(() => {
                        tryAirdrop(retry+1);
                    }, 1000)
                }
            } catch (error) {
                console.error(error);
                setTimeout(() => {
                    tryAirdrop(retry+1);
                }, 1000)
            }
        } else {
            return res.status(400).send(new Error("Airdrop failed"))
        }
    }
    await tryAirdrop();
});

faucet.listen(3003, () => {
    console.log('faucet started on port 3003');
})


/**
 * AGGR SERVER
 */

const aggr = express();
aggr.use(cors());
aggr.use(bodyParser.json());

aggr.use(express.static('aggr'));
aggr.get('/*', (req, res) => {
	res.sendFile(__dirname + '/aggr/index.html');
})

aggr.listen(3002, () => {console.log('aggr started on port 3002')});
