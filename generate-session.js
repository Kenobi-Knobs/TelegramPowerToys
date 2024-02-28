const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const input = require('input');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const apiId = config.api.apiId;
const apiHash = config.api.apiHash;
const stringSession = new StringSession("");

(async () => {
	console.log('Loading...');
	const client = new TelegramClient(stringSession, apiId, apiHash, {
		connectionRetries: 5,
	});
	await client.start({
		phoneNumber: async () => await input.text('Please enter your number: '),
		password: async () => await input.text('Please enter your password: '),
		phoneCode: async () =>
			await input.text('Please enter the code you received: '),
		onError: (err) => console.log(err),
	});
	console.log('You should now be connected.');
	console.log('You session string is:');
	console.log(client.session.save());

	console.log('if all goes well, you recieve a message with the session string in your saved messages');
	await client.sendMessage('me', { message: client.session.save()});

	saveSessionStringToConfig(client.session.save());
	console.log('Session string saved to config.json.');

	await client.disconnect();
	console.log('You should now be disconnected.');
	process.exit();
})();

function saveSessionStringToConfig(sessionString) {
	config.api.sessionString = sessionString;
	fs.writeFileSync('./config.json', JSON.stringify(config, null, 2), 'utf8');
}