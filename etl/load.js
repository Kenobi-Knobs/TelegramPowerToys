const fs = require('fs');

class Load {
	constructor(data) {
		this.config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
		this.nodes = data.nodes;
		this.connections = data.connections;
	}

	async execute() {
		fs.writeFileSync(this.config.nodesDataPath, JSON.stringify(this.nodes), 'utf8');
		fs.writeFileSync(this.config.connectionsDataPath, JSON.stringify(this.connections), 'utf8');
	}
}

module.exports = Load;