const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

app.get('/', (req, res) => {
	const nodesPath = path.join(__dirname, config.dataFolder, 'nodes.json');
	const connectionsPath = path.join(__dirname, config.dataFolder, 'connections.json');
	const networkPath = path.join(__dirname, config.dataFolder, 'network.json');
	const rawNodesData = fs.readFileSync(nodesPath);
	const rawConnectionsData = fs.readFileSync(connectionsPath);
	const rawNetworkData = fs.readFileSync(networkPath);

	const nodesData = JSON.parse(rawNodesData);
	const connectionsData = JSON.parse(rawConnectionsData);
	const networkData = JSON.parse(rawNetworkData);

	res.render('index', { nodes: nodesData, connections: connectionsData, network: networkData});
});

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});