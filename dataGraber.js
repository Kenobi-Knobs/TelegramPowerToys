const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require('fs');

// read config.json
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const apiId = config.api.apiId;
const apiHash = config.api.apiHash;
const session = new StringSession(config.api.sesionString);
const client = new TelegramClient(session, apiId, apiHash, {});

(async function run() {
	await client.connect();
	let channelNodes = [];
	let channelEdges = [];

	let firstChannelNode = await getChannelNode(config.firstChanelUsername);
	if (!firstChannelNode.id) {
		console.log("Channel private or not found");
		return;
	}
	let firstForwardedChannels = await getForwardedChannels(firstChannelNode.username, firstChannelNode.id);
	let firstEdges = generateChannelEdges(firstChannelNode, firstForwardedChannels);

	// add first node and edges
	channelNodes.push(firstChannelNode);
	channelEdges = [...firstEdges];

	// list of queued channels for analisys
	let channelsforAnalisys = firstForwardedChannels;
	let analisedChannels = [firstChannelNode.id];

	// analisys loop
	let loopCounter = 0;
	while (loopCounter < config.deepAnalisisLimit) {
		let currentChannelId = channelsforAnalisys.shift();
		let currentChannelNode = await getChannelNode(currentChannelId);
		if (!currentChannelNode.id || analisedChannels.includes(currentChannelNode.id)) {
			continue;
		}
		console.log("target:", currentChannelNode.username, "| progress:", (loopCounter + 1) + "/" + config.deepAnalisisLimit);

		let currentForwardedChannels = await getForwardedChannels(currentChannelNode.username, currentChannelNode.id);
		let currentEdges = generateChannelEdges(currentChannelNode, currentForwardedChannels);

		channelNodes.push(currentChannelNode);
		channelEdges = [...channelEdges, ...currentEdges];

		for (let i = 0; i < currentForwardedChannels.length; i++) {
			if (!analisedChannels.includes(currentForwardedChannels[i])) {
				channelsforAnalisys.push(currentForwardedChannels[i]);
			}
		}
		analisedChannels.push(currentChannelNode.id);
		loopCounter++;
	}

	// delete edges with not existing nodes
	let filteredEdges = [];
	for (let i = 0; i < channelEdges.length; i++) {
		if (analisedChannels.includes(channelEdges[i].from) && analisedChannels.includes(channelEdges[i].to)) {
			filteredEdges.push(channelEdges[i]);
		}
	}

	//resultss
	console.log("Nodes:", channelNodes.length);
	console.log("Edges:", filteredEdges.length);

	// save results
	fs.writeFileSync(config.nodesDataPath, JSON.stringify(channelNodes), 'utf8');
	fs.writeFileSync(config.edgesDataPath, JSON.stringify(filteredEdges), 'utf8');
	console.log("Done 👌");

	await client.disconnect();
})();

async function getChannelNode(channelId) {
	try {
		let channelInfo = await client.invoke(
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

function generateChannelEdges(channelNode, forwardedChannels) {
	let channelEdges = [];

	for (let i = 0; i < forwardedChannels.length; i++) {
		channelEdges.push({
			from: channelNode.id,
			to: forwardedChannels[i],
		});
	}

	return channelEdges;
}

async function getForwardedChannels(channelName, channelId) {
	let forwardedChannels = [];

	const channelHistory = await client.invoke(
		new Api.messages.GetHistory({peer: channelName, offsetId: 0, offsetDate: 2147483647, addOffset: 0, limit: config.postAnalisisLimit, maxId: 0, minId: 0, hash: 0})
	);

	for (let i = 0; i < channelHistory.messages.length; i++) {
		if (channelHistory.messages[i].fwdFrom && channelHistory.messages[i].fwdFrom.fromId) {
			if (parseInt(channelHistory.messages[i].fwdFrom.fromId.channelId)) {
				let fwdChannelId = parseInt(channelHistory.messages[i].fwdFrom.fromId.channelId);
				if (!forwardedChannels.includes(fwdChannelId)) {
					if (fwdChannelId !== channelId) {
						forwardedChannels.push(fwdChannelId);
					}
				}
			}
		}
	}

	return forwardedChannels;
}