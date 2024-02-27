const fs = require('fs');

class Load {
	constructor(data) {
		this.config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
		this.nodes = data.nodes;
		this.connections = data.connections;
		this.posts = data.posts;
		this.network = data.network;
	}

	async execute() {
		if (!fs.existsSync(this.config.dataFolder)) {
			fs.mkdirSync(this.config.dataFolder);
		}

		fs.writeFileSync(this.config.nodesDataPath, JSON.stringify(this.nodes), 'utf8');
		fs.writeFileSync(this.config.connectionsDataPath, JSON.stringify(this.connections), 'utf8');
		fs.writeFileSync(this.config.postsDataPath, JSON.stringify(this.posts), 'utf8');
		fs.writeFileSync(this.config.networkDataPath, JSON.stringify(this.network), 'utf8');
	}
}

module.exports = Load;