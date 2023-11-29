const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
	const nodesPath = path.join(__dirname, './data/nodes.json');
	const edgesPath = path.join(__dirname, './data/edges.json');
	const rawNodesData = fs.readFileSync(nodesPath);
	const rawEdgesData = fs.readFileSync(edgesPath);

	const nodesData = JSON.parse(rawNodesData);
	const edgesData = JSON.parse(rawEdgesData);

	res.send({nodes: nodesData, edges: edgesData});
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
