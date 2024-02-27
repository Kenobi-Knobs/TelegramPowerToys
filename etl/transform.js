const cld = require('cld');
const { removeStopwords, eng, rus, pol } = require('stopword')
const fs = require('fs');
const ukrStopwords = fs.readFileSync('./nlp_data/stopwords_ukr.txt', 'utf8').replace(/\r/g, '').split('\n');

class Transform {
	constructor(data) {
		this.config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
		this.nodes = data.nodes;
		this.connections = data.connections;
		this.posts = data.posts;
		this.network;
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

		// extract nodes text content
		this.nodes = this.nodes.map((node) => {
			let nodeText = this.extractTextFromPosts(node, this.posts);
			nodeText = this.clearText(nodeText);
			nodeText = nodeText.toLowerCase();
			return {
				...node,
				text: nodeText
			};
		});

		//set language to each node
		this.nodes = await Promise.all(this.nodes.map(async (node) => {
			if (!node.text) {
				node.language = 'unknown';
				return node;
			}
			try {
				let language = await cld.detect(node.text);
				node.language = language.languages[0].code;
			} catch (error) {
				node.language = 'unknown';
			}
			return node;
		}));

		// remove stop words from nodes text
		this.nodes = this.nodes.map((node) => {
			if (!node.text) {
				return node;
			}
			node.text = removeStopwords(node.text.split(' '), [...ukrStopwords, ...eng, ...pol, ...rus]).join(' ');
			return node;
		});

		// generate wordmap for each node
		this.nodes = this.nodes.map((node) => {
			node.wordmap = this.generateWordmap(node.text, this.config.wordmapLimit);
			return node;
		});

		// generate network object
		this.network = {
			nodesCount: this.nodes.length,
			connections: this.connections.length,
			postsCount: this.posts.length,
			languages: this.getLanguagesCounters(this.nodes),
			wordmap: this.generateWordmap(this.nodes.map((node) => node.text).join(' '), this.config.wordmapLimit),
			scanDate: new Date().toDateString(),
		};

		// remove node.text
		this.nodes = this.nodes.map((item) => {
			delete item.text;
			return item;
		});

		return {nodes: this.nodes, connections: this.connections, posts: this.posts, network: this.network};
	}

	getLanguagesCounters(nodes) {
		let languages = [];
		nodes.forEach((node) => {
			let language = languages.find((item) => item.code === node.language);
			if (language) {
				language.count++;
			} else {
				languages.push({code: node.language, count: 1});
			}
		});
		return languages;
	}

	generateWordmap(text, limit = 20) {
		let words = text.split(' ');
		let wordmap = {};
		for (let i = 0; i < words.length; i++) {
			let word = words[i].toLowerCase();
			if (wordmap[word]) {
				wordmap[word]++;
			} else {
				wordmap[word] = 1;
			}
		}
		let sortable = [];
		for (let word in wordmap) {
			sortable.push({word: word, count: wordmap[word]});
		}
		sortable.sort((a, b) => b.count - a.count);
		return sortable.slice(0, limit);
	}

	extractTextFromPosts(node, posts) {
		let text = posts.filter((post) => post.channelId === node.id).map((post) => post.messageText).join(' ');
		return text + ' ' + node.name + ' ' + node.about;
	}

	clearText(text) {
		text = text.replace(/(https?:\/\/[^\s]+)/g, '');
		text = text.replace(/[^\p{L}\s]/gu, '');
		text = text.replace(/\s+/g, ' ');
		return text;
	}
}

module.exports = Transform;