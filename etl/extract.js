const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');

const MAX_OFFSET_DATE = 2147483647;

class Extract {
	constructor() {
		this.config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
		const apiId = this.config.api.apiId;
		const apiHash = this.config.api.apiHash;
		const session = new StringSession(this.config.api.sesionString);
		this.client = new TelegramClient(session, apiId, apiHash, {});
	}

	async execute() {
		await this.client.connect();

		console.log('Start extracting')
		console.log('-------------------------------------------');

		let channelNodes = [];
		let channelConnections = [];

		let firstChannelNode = await this.getChannelNode(this.config.firstChanelUsername);
		if (!firstChannelNode.id) {
			console.log('Channel private or not found');
			return {nodes: channelNodes, connections: channelConnections};
		}

		let firstConnections = await this.getConnections(firstChannelNode.username);

		channelNodes.push(firstChannelNode);
		channelConnections = [...firstConnections];

		// list of queued channels for analisys, only unique ids
		let channelsforAnalisys = firstConnections.filter((item, index, self) =>
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

			let currentConnections = await this.getConnections(currentChannelNode.username);

			channelNodes.push(currentChannelNode);
			channelConnections = [...channelConnections, ...currentConnections];

			for (let i = 0; i < currentConnections.length; i++) {
				if (!analisedChannels.includes(currentConnections[i].target)) {
					channelsforAnalisys.push(currentConnections[i].target);
				}
			}

			analisedChannels.push(currentChannelNode.id);
			loopCounter++;
		}

		return {nodes: channelNodes, connections: channelConnections};
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

	async getConnections(channelName) {
		let connections = [];

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
						type: 'forward',
						lastUpdate: Date.now(),
					});
				}
			}
		}

		return connections;
	}
}

module.exports = Extract;