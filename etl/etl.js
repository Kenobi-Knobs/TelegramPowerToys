const Extract = require('./extract');
const Transform = require('./transform');
const Load = require('./load');

(async function run() {
	const extract = new Extract();
	let start = Date.now();
	let data = await extract.execute();
	let end = Date.now();

	console.log('-------------------------------------------');
	console.log('👌Finish extracting | time elapsed', getElapsedTime(start, end));
	console.log('nodes:',data.nodes.length, 'connections:', data.connections.length, 'posts:', data.posts.length);
	await extract.client.disconnect();
	await delay(500);

	const transform = new Transform(data);
	start = Date.now();
	data = await transform.execute();
	end = Date.now();
	
	console.log('-------------------------------------------');
	console.log('👌Finish transforming | time elapsed', getElapsedTime(start, end));
	console.log('nodes:',data.nodes.length, 'connections:', data.connections.length , 'posts:', data.posts.length);

	const load = new Load(data);
	start = Date.now();
	await load.execute();
	end = Date.now();

	console.log('-------------------------------------------');
	console.log('👌Finish loading | time elapsed', getElapsedTime(start, end));

	process.exit()
})();

function delay(time) {
	return new Promise(resolve => setTimeout(resolve, time));
}

function getElapsedTime(start, end) {
	let elapsed = end - start;
	let milliseconds = elapsed % 1000;
	let seconds = Math.floor(elapsed / 1000);
	let minutes = Math.floor(seconds / 60);
	let hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m ${seconds % 60}s ${milliseconds}ms`;
}