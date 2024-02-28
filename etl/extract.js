const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');

const MAX_OFFSET_DATE = 2147483647;

class Extract {
	constructor() {
		this.config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
		const apiId = this.config.api.apiId;
		const apiHash = this.config.api.apiHash;
		const session = new StringSession(this.config.api.sessionString);
		this.client = new TelegramClient(session, apiId, apiHash, {});
	}

	async execute() {
		await this.client.connect();

		console.log('Start extracting')
		console.log('-------------------------------------------');

		let channelNodes = [];
		let channelConnections = [];
		let chanelPosts = [];

		let firstChannelNode = await this.getChannelNode(this.config.firstChanelUsername);
		if (!firstChannelNode.id) {
			console.log('Channel private or not found');
			return {nodes: channelNodes, connections: channelConnections, posts: chanelPosts};
		}

		let firstContext = await this.getChannelContext(firstChannelNode.username);

		channelNodes.push(firstChannelNode);
		channelConnections = [...firstContext.connections];
		chanelPosts = [...firstContext.posts];

		// list of queued channels for analisys, only unique ids
		let channelsforAnalisys = firstContext.connections.filter((item, index, self) =>
			index === self.findIndex((t) => (
				t.target === item.target
			))
		).map((item) => item.target);
		let analisedChannels = [firstChannelNode.id];

		let loopCounter = 0;
		while (loopCounter < this.config.deepAnalisisLimit) {
			let currentChannelId = channelsforAnalisys.shift();
			let currentChannelNode = await this.getChannelNode(currentChannelId);

			// if channel not found or already analised
			if (!currentChannelNode.id || analisedChannels.includes(currentChannelNode.id)) {
				continue;
			}
			// if not username
			if (currentChannelNode.username === null || currentChannelNode.username === undefined) {
				continue;
			}

			console.log('target:', currentChannelNode.username, '| progress:', (loopCounter + 1) + '/' + this.config.deepAnalisisLimit);

			let currentContext = await this.getChannelContext(currentChannelNode.username);

			channelNodes.push(currentChannelNode);
			channelConnections = [...channelConnections, ...currentContext.connections];
			chanelPosts = [...chanelPosts, ...currentContext.posts];

			for (let i = 0; i < currentContext.connections.length; i++) {
				if (!analisedChannels.includes(currentContext.connections[i].target)) {
					channelsforAnalisys.push(currentContext.connections[i].target);
				}
			}

			analisedChannels.push(currentChannelNode.id);
			loopCounter++;
		}

		return {nodes: channelNodes, connections: channelConnections, posts: chanelPosts};
	}

	async getChannelNode(channelId) {
		try {
			let channelInfo = await this.client.invoke(
				new Api.channels.GetFullChannel({
					channel: channelId,
				})
			);

			let channelNode = {
				id: parseInt(channelInfo.fullChat.id),
				name: channelInfo.chats[0].title,
				username: channelInfo.chats[0].username,
				participantsCount: channelInfo.fullChat.participantsCount,
				about: channelInfo.fullChat.about,
				lastUpdate: Date.now(),
			};

			return channelNode;
		} catch (error) {
			return {};
		}
	}

	async getChannelContext(channelName) {
		let connections = [];
		let posts = [];

		const channelHistory = await this.client.invoke(
			new Api.messages.GetHistory({
				peer: channelName,
				offsetId: 0,
				offsetDate: MAX_OFFSET_DATE, 
				addOffset: 0,
				limit: this.config.postAnalisisLimit,
				maxId: 0,
				minId: 0,
				hash: 0
			})
		);

		for (let i = 0; i < channelHistory.messages.length; i++) {
			if (channelHistory.messages[i].fwdFrom && channelHistory.messages[i].fwdFrom.fromId) {
				if (parseInt(channelHistory.messages[i].fwdFrom.fromId.channelId)) {
					let targetId = parseInt(channelHistory.messages[i].fwdFrom.fromId.channelId);
					let sourceId = parseInt(channelHistory.messages[i].peerId.channelId);
					connections.push({
						source: sourceId,
						target: targetId,
						connectionDate: channelHistory.messages[i].date,
						channelPost: channelHistory.messages[i].fwdFrom.channelPost,
						postAuthor: channelHistory.messages[i].fwdFrom.postAuthor,
						message: channelHistory.messages[i].message,
						lastUpdate: Date.now(),
					});
				}
			} else if (channelHistory.messages[i].message) {
				posts.push({
					channelId: parseInt(channelHistory.messages[i].peerId.channelId),
					channelName: channelName,
					date: channelHistory.messages[i].date,
					commentsEnabled: channelHistory.messages[i].replies ? true : false,
					coments: channelHistory.messages[i].replies?.replies || 0,
					messageText: channelHistory.messages[i].message,
					views: channelHistory.messages[i].views,
					forwards: channelHistory.messages[i].forwards,
					reactionsEnabled: channelHistory.messages[i].reactions ? true : false,
					reactions: this.getRactions(channelHistory.messages[i].reactions),
				});
			}
		}

		return {connections: connections, posts: posts};
	}

	getRactions(reactions) {
		let reactionsArray = [];

		if (!reactions || reactions.results.length === 0) {
			return reactionsArray;
		}

		let reactionsResults = reactions.results;
		for (let i = 0; i < reactionsResults.length; i++) {
			reactionsArray.push({
				reaction: reactionsResults[i].reaction.emoticon,
				count: reactionsResults[i].count,
			});
		}

		return reactionsArray;
	}
}

module.exports = Extract;