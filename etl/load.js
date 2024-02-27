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
		// create data folder if not exists
		if (!fs.existsSync(this.config.dataFolder)) {
			fs.mkdirSync(this.config.dataFolder);
		}

		fs.writeFileSync(this.config.dataFolder + '/nodes.json', JSON.stringify(this.nodes), 'utf8');
		fs.writeFileSync(this.config.dataFolder + '/connections.json', JSON.stringify(this.connections), 'utf8');
		fs.writeFileSync(this.config.dataFolder + '/posts.json', JSON.stringify(this.posts), 'utf8');
		fs.writeFileSync(this.config.dataFolder + '/network.json', JSON.stringify(this.network), 'utf8');
	}
}

module.exports = Load;