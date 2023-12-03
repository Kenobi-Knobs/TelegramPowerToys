const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
	const nodesPath = path.join(__dirname, './data/nodes.json');
	const edgesPath = path.join(__dirname, './data/edges.json');
	const rawNodesData = fs.readFileSync(nodesPath);
	const rawEdgesData = fs.readFileSync(edgesPath);

	const nodesData = JSON.parse(rawNodesData);
	const edgesData = JSON.parse(rawEdgesData);

	res.render('index', { nodes: nodesData, edges: edgesData });
});

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
})
