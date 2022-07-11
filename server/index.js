const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { execSync } = require('child_process');
const { config } = require('dotenv')

let args = process.argv.slice(2)

let env = args[0]

config({path: '.env.'+env})


const bs58 = require('bs58')
const { PublicKey, Connection, Keypair } = require("@solana/web3.js");
const { getMint, mintTo, getAccount, getAssociatedTokenAddress } = require("@solana/spl-token");

const owner = require('./owner.js')
const anchor = require('@project-serum/anchor')
const admin = require('sdk/lib/admin')

let connection = new Connection(process.env.ENDPOINT.toString());
const mintKeypair = Keypair.fromSecretKey(bs58.decode("3dS4W9gKuGQcvA4s9dSRKLGJ8UAdu9ZeFLxJfv6WLK4BzZZnt3L2WNSJchjtgLi7BnxMTcpPRU1AG9yfEkR2cxDT"))
const mintDecimals = 6;

;(async () => {
    let mint = await getMint(connection, mintKeypair.publicKey);
    
    try {
        if ((process.env.CLUSTER === 'devnet' || process.env.CLUSTER === 'testnet') && !mint) {
            mint = await admin.createFakeMint(connection, mintKeypair, owner, mintDecimals);
        }
    } catch (error) {
        console.error(error);
    }
    // let ownerMintAta = await getAssociatedTokenAddress(mint.address, owner.publicKey)
    // await admin.closeAll(owner, connection, process.env.CLUSTER, ownerMintAta)

    await admin.init(owner, connection, process.env.CLUSTER, mint)
})();


execSync('rm -rf ./frontend/*')
execSync('rm -rf ./aggr/*')

execSync('cp -r ../frontend/dist/* frontend')
execSync('cp -r ../aggr/dist/* aggr')

const devnet = express();
devnet.use(cors());
devnet.use(bodyParser.json());

devnet.use(express.static('frontend'));
devnet.get('/*', (req, res) => {
	res.sendFile(__dirname + '/frontend/index.html');
})

devnet.listen(3000, () => {console.log('devnet started on port 3000')});

const mainnet = express();
mainnet.use(cors());
mainnet.use(bodyParser.json());

mainnet.use(express.static('frontend'));
mainnet.get('/*', (req, res) => {
	res.sendFile(__dirname + '/frontend/index.html');
})

mainnet.listen(3001, () => {console.log('mainnet started on port 3001')});


const aggr = express();
aggr.use(cors());
aggr.use(bodyParser.json());

aggr.use(express.static('aggr'));
aggr.get('/*', (req, res) => {
	res.sendFile(__dirname + '/aggr/index.html');
})

aggr.listen(3002, () => {console.log('aggr started on port 3002')});


const faucet = express();
faucet.use(cors());
faucet.use(bodyParser.json())


faucet.get('/airdrop/:destination', async (req, res) => {
    let address = new PublicKey(req.params.destination);
    let tryAirdrop = async (retry=0) => {
        if (retry < 10) {
            try {
                let account = await getAccount(connection, address);
                if (account.isInitialized) {
                    mintTo(connection, owner, mintKeypair.publicKey, address, owner, BigInt(((new anchor.BN(1000)).mul((new anchor.BN(10)).pow(new anchor.BN(mintDecimals)))).toString()), [owner]).then((signature) => {
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

