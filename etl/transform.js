class Transform {
	constructor(data) {
		this.nodes = data.nodes;
		this.connections = data.connections;
	}

	async execute() {
		// remove self connections
		this.connections = this.connections.filter((item) => item.source !== item.target);

		// remove not existing nodes
		let existingNodesIds = this.nodes.map((item) => item.id);
		this.connections = this.connections.filter((item) => existingNodesIds.includes(item.source) && existingNodesIds.includes(item.target));

		// add property targtName and sourceName to connections
		this.connections = this.connections.map((item) => {
			let sourceNode = this.nodes.find((node) => node.id === item.source);
			let targetNode = this.nodes.find((node) => node.id === item.target);
			item.sourceName = sourceNode.username;
			item.targetName = targetNode.username;
			return item;
		});

		// sort nodes by participants count
		this.nodes.sort((a, b) => b.participantsCount - a.participantsCount);

		return {nodes: this.nodes, connections: this.connections};
	}
}

module.exports = Transform;