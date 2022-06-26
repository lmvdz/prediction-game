const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const devnet = express();
devnet.use(cors());
devnet.use(bodyParser.json());

devnet.use(express.static('../frontend/dist'));
devnet.get('/*', (req, res) => {
	res.sendFile(__dirname + '../frontend/dist/index.html');
})

devnet.listen(3000, () => {console.log('devnet started on port 3000')});

const mainnet = express();
mainnet.use(cors());
mainnet.use(bodyParser.json());

mainnet.use(express.static('/../frontend/dist'));
mainnet.get('/*', (req, res) => {
	res.sendFile(__dirname + '/../frontend/dist/index.html');
})

mainnet.listen(3001, () => {console.log('mainnet started on port 3001')});


const aggr = express();
aggr.use(cors());
aggr.use(bodyParser.json());

aggr.use(express.static('/../aggr/dist'));
aggr.get('/*', (req, res) => {
	res.sendFile(__dirname + '/../aggr/dist/index.html');
})

mainnet.listen(3002, () => {console.log('devnet started on port 3002')});