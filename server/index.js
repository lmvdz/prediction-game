const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const { config } = require('dotenv')

config({path: '.env.local'})

const bs58 = require('bs58')
const { PublicKey, Connection, Keypair } = require("@solana/web3.js");
const { getMint, mintTo } = require("@solana/spl-token");

const owner = require('./owner.js')
const anchor = require('@project-serum/anchor')
const admin = require('sdk/lib/admin')

let connection = new Connection(process.env.ENDPOINT, { commitment: 'confirmed' });
const mintKeypair = Keypair.fromSecretKey(bs58.decode("3dS4W9gKuGQcvA4s9dSRKLGJ8UAdu9ZeFLxJfv6WLK4BzZZnt3L2WNSJchjtgLi7BnxMTcpPRU1AG9yfEkR2cxDT"))

;(async () => {
    const mint = await getMint(connection, mintKeypair.publicKey)
    admin.init(owner, connection, process.env.CLUSTER, mint)
})();


exec('rm -rf ./frontend')
exec('rm -rf ./aggr')

exec('mkdir frontend')
exec('mkdir aggr')

exec('cp -r ../frontend/dist/* frontend/*')
exec('cp -r ../aggr/dist/* aggr/*')

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
                        return res.status(500).send(error);
                    })
                } else {
                    setTimeout(() => {
                        tryAirdrop(retry+1);
                    }, 1000)
                }
            } catch (error) {
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

