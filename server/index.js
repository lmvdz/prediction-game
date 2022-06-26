const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

exec('rm -rf ./frontend')
exec('rm -rf ./aggr')

exec('cp -r ../frontend/dist frontend')
exec('cp -r ../aggr/dist aggr')

const devnet = express();
devnet.use(cors());
devnet.use(bodyParser.json());

devnet.use(express.static('frontend'));
devnet.get('/*', (req, res) => {
	res.sendFile(__dirname + 'frontend/index.html');
})

devnet.listen(3000, () => {console.log('devnet started on port 3000')});

const mainnet = express();
mainnet.use(cors());
mainnet.use(bodyParser.json());

mainnet.use(express.static('frontend'));
mainnet.get('/*', (req, res) => {
	res.sendFile(__dirname + 'frontend/index.html');
})

mainnet.listen(3001, () => {console.log('mainnet started on port 3001')});


const aggr = express();
aggr.use(cors());
aggr.use(bodyParser.json());

aggr.use(express.static('aggr'));
aggr.get('/*', (req, res) => {
	res.sendFile(__dirname + 'aggr/index.html');
})

mainnet.listen(3002, () => {console.log('devnet started on port 3002')});