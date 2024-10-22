﻿// get the width and height of the window
const width = document.documentElement.clientWidth;
const height = document.documentElement.clientHeight;

const ARROW_FILL = '#838383';
const STROKE_COLOR = '#999';
const NODE_FILL = '#78a5fd';
const SELECTED_NODE_FILL = '#ff678b';
const LINKED_NODE_FILL = '#fff85c';
const LINKED_LINK_COLOR = '#a6a000';
const LANGUAGE_SELECT_COLOR = '#ff4c4c';
const PARTICIPANT_THRESHOLDS = [
	{ limit: 1000, radius: 8 },
	{ limit: 3000, radius: 10 },
	{ limit: 5000, radius: 12 },
	{ limit: 10000, radius: 14 },
	{ limit: 20000, radius: 18 },
	{ limit: 50000, radius: 22 },
	{ limit: 100000, radius: 26 },
	{ limit: 200000, radius: 30 },
];

let selected = null;
let selectedlinkedNodes = [];
let selectedlinkedLinks = [];
let selectedLanguage = null;
let selectedLanguageNodes = [];
let layout;

// create the svg and group
const svg = d3.select('body')
	.append('svg')
	.attr('width', width)
	.attr('height', height)

const group = svg.append('g');

// create the simulation
const simulation = d3.forceSimulation()
	.force('link', d3.forceLink().id(d => d.id))
	.force('charge', d3.forceManyBody().strength(-1000))
	.force('center', d3.forceCenter(width / 2, height / 2));

// create elements
const arrow = createMarker(group, links);
const link = createLink(group, links);
const node = createNode(group, nodes);
const label = createLabel(group, nodes);
const search = createSearch(nodes);

// zoom handling
const zoom_handler = d3.zoom()
	.scaleExtent([0.1, 10])

svg.call(zoom_handler
	.on('zoom', () => {
		group.attr('transform', d3.event.transform);
	})
);

// simulation setup
simulation.nodes(nodes).on('tick', ticked);
simulation.force('link').links(links);
simulation.on('tick', ticked);

// show network info
showNetworkInfo();

//#region Create Graph elements
function createMarker(group, links) {
	return group.append('defs').selectAll('marker')
		.data(links)
		.enter()
		.append('marker')
		.attr('id', (d, i) => `arrowhead-${i}`)
		.attr('viewBox', '0 0 10 10')
		.attr('refX', (d) => getTargretRadius(d.target) + 12)
		.attr('refY', 5)
		.attr('markerWidth', 4)
		.attr('markerHeight', 4)
		.attr('orient', 'auto')
		.append('path')
		.attr('d', 'M 0 0 L 10 5 L 0 10 z')
		.attr('class', 'arrow')
		.style('fill', ARROW_FILL);
};

function createLink(group, links) {
	return group.append('g')
		.attr('stroke', STROKE_COLOR)
		.attr('stroke-opacity', 0.6)
		.attr('stroke-width', 2)
		.selectAll('line')
			.data(links)
			.join('line')
			.attr('marker-end', (d, i) => `url(#arrowhead-${i})`);
};

function createNode(group, nodes) {
	return group.append('g')
		.attr('stroke', '#fff')
		.attr('stroke-width', 1.5)
		.selectAll('circle')
			.data(nodes)
			.join('circle')
				.attr('r', d => getCircleRadius(d.participantsCount))
				.attr('fill', NODE_FILL)
				.style('cursor', 'pointer')
				.call(d3.drag()
					.on('start', dragstarted)
					.on('drag', dragged)
					.on('end', dragended))
				.on('click', selectNode);
};

function createLabel(group, nodes) {
	return group.append('g')
		.attr('class', 'labels')
		.selectAll('text')
		.data(nodes)
		.enter()
		.append('text')
		.text(d => d.name)
		.attr('font-size', 8)
		.attr('text-anchor', 'middle')
		.attr('alignment-baseline', 'middle')
		.style('font-weight', 'bold')
		.style('cursor', 'pointer')
		.on('click', selectNode)
		.call(d3.drag()
			.on('start', textdragstarted)
			.on('drag', textdragged)
			.on('end', textdragended));
};
//#endregion

//#region Drag and simulation handling
function ticked() {
	link
		.attr('x1', d => d.source.x)
		.attr('y1', d => d.source.y)
		.attr('x2', d => d.target.x)
		.attr('y2', d => d.target.y);

	node
		.attr('cx', d => d.x)
		.attr('cy', d => d.y);

	label
		.attr('x', d => d.x)
		.attr('y', d => d.y);
};

function dragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
};

function dragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
};

function dragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = d.x;
	d.fy = d.y;
};

function textdragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
};

function textdragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
	d.x = d3.event.x;
	d.y = d3.event.y;
};

function textdragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = d.x;
	d.fy = d.y;
};
//#endregion

//#region Graph and info manipulation
function selectNode(d) {
	resetLanguageSelection()
	if (selected && selected.id === d.id) {
		showNetworkInfo();
		return;
	}

	if (selected) {
		let node = svg.selectAll('circle').filter(node => node.id === selected.id);
		node.attr('fill', NODE_FILL);
	}

	hideNetworkInfo();

	if (selectedlinkedNodes.length > 0) {
		const linkedNodesIds = selectedlinkedNodes.map(node => node.id);
		const linkedLinksIds = selectedlinkedLinks.map(link => link.index);
		const linkedNodesSelection = svg.selectAll('circle').filter(node => linkedNodesIds.includes(node.id));
		const linkedLinksSelection = svg.selectAll('line').filter(link => linkedLinksIds.includes(link.index));
		linkedNodesSelection.attr('fill', NODE_FILL);
		linkedLinksSelection.attr('stroke', STROKE_COLOR);
	}

	let node = svg.selectAll('circle').filter(node => node.id === d.id);
	node.attr('fill', SELECTED_NODE_FILL);
	selected = d;
	highlightLinkedNodes(node);

	let forwardedList = links.filter(link => link.source.id === d.id);
	forwardedList = addDuplicatesCountToLinks(forwardedList);
	forwardedList.sort((a, b) => b.count - a.count);

	let whoForwardedList = links.filter(link => link.target.id === d.id);
	whoForwardedList = addDuplicatesCountToLinks(whoForwardedList);
	whoForwardedList.sort((a, b) => b.count - a.count);

	const infoContainer = document.querySelector('.info-container');
	const nodeName = document.querySelector('#node-name');
	const nodeLink = document.querySelector('#node-link');
	const nodeParticipants = document.querySelector('#node-participants');
	const nodeDescription = document.querySelector('#node-description');
	nodeDescription.innerHTML = '';
	const nodeLanguage = document.querySelector('#node-language');
	nodeLanguage.innerHTML = '';
	const nodeForwardedList = document.querySelector('#node-forwarded-list');
	nodeForwardedList.innerHTML = '';
	const nodeWhoForwardedList = document.querySelector('#node-who-forwarded-list');
	nodeWhoForwardedList.innerHTML = '';
	const wordCloud = document.querySelector('#word-cloud');
	wordCloud.innerHTML = '';

	const link = 'https://t.me/' + d.username;
	const nodeLinkText = `<span>🔗</span><a href='${link}' target='_blank'>${'@'+d.username}</a>`;
	const nodeParticipantsText = '👤' + d.participantsCount;
	const nodeDescriptionText = d.about || 'Опис відсутній';
	const nodeLanguageText = '<b>Мова:</b> ' + d.language + ' ' + languageToEmoji(d.language)|| '';

	const forvardedListText = forwardedList.map(link => `<li>${link.target.name} ${link.count > 1 ? '(' + link.count + 'x)' : ''}</li>`).join('');
	const whoForvardedListText = whoForwardedList.map(link => `<li>${link.source.name} ${link.count > 1 ? '(' + link.count + 'x)' : ''}</li>`).join('');

	nodeName.innerHTML = d.name;
	nodeLink.innerHTML = nodeLinkText;
	nodeParticipants.innerHTML = nodeParticipantsText;
	nodeDescription.innerHTML = nodeDescriptionText;
	nodeLanguage.innerHTML = nodeLanguageText;

	if (forwardedList.length !== 0) {
		nodeForwardedList.innerHTML = `<div id='forwarded-list-header'>Репости ➡️</div>` + forvardedListText;
	}
	if (whoForwardedList.length !== 0) {
		nodeWhoForwardedList.innerHTML = `<div id='who-forwarded-list-header'>Репостять ⬅️</div>` + whoForvardedListText;
	}
	createWordCloud(d.wordmap, '#word-cloud');

	infoContainer.hidden = false;
};

function createWordCloud(wordmap, wordCloudSelector) {
	let maxCount = wordmap.map(item => item.count).reduce((a, b) => Math.max(a, b));
	let minCount = wordmap.map(item => item.count).reduce((a, b) => Math.min(a, b));
	let words = wordmap.map(function(item) {
		return {text: item.word, size: getSizeByCount(item.count, maxCount, minCount)};
	})

	removeWordClouds();
	layout = d3.layout.cloud()
		.size([300, 300])
		.words(words)
		.padding(2)
		.rotate(0)
		.font('Impact')
		.fontSize(function(node) { return node.size; })
		.on('end', drawWordCloud.bind(null, words, wordCloudSelector));

	layout.start();
};

function removeWordClouds() {
	d3.select('.word-cloud').selectAll('svg').remove();
};

function drawWordCloud(words, selector) {
	d3.select(selector).append('svg')
		.attr('width', layout.size()[0])
		.attr('height', layout.size()[1])
		.append('g')
		.attr('transform', 'translate(' + layout.size()[0] / 2 + ',' + layout.size()[1] / 2 + ')')
		.selectAll('text')
		.data(words)
		.enter().append('text')
		.style('font-size', function(d) { return d.size + 'px'; })
		.style('font-family', 'Impact')
		.attr('text-anchor', 'middle')
		.attr('transform', function(d) {
			return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
		})
		.attr('fill', function(d) {
			return d3.schemeCategory10[Math.floor(Math.random() * 10)];
		})
		.text(function(d) { return d.text; });
}

function highlightLinkedNodes(node) {
	const linkedNodes = [];
	const linkedLinks = [];

	links.forEach(link => {
		if (link.source.id === node.datum().id) {
			linkedNodes.push(link.target);
			linkedLinks.push(link);
		}
		if (link.target.id === node.datum().id) {
			linkedNodes.push(link.source);
			linkedLinks.push(link);
		}
	});

	const linkedNodesIds = linkedNodes.map(node => node.id);
	const linkedLinksIds = linkedLinks.map(link => link.index);
	const linkedNodesSelection = svg.selectAll('circle').filter(node => linkedNodesIds.includes(node.id));
	const linkedLinksSelection = svg.selectAll('line').filter(link => linkedLinksIds.includes(link.index));
	linkedNodesSelection.attr('fill', LINKED_NODE_FILL);
	linkedLinksSelection.attr('stroke', LINKED_LINK_COLOR);

	selectedlinkedNodes = linkedNodes;
	selectedlinkedLinks = linkedLinks;
};

function highlightNodesByLanguage(language) {
	resetLanguageButtons();
	if (selectedLanguage === language) {
		resetLanguageSelection();
		return;
	}
	resetLanguageSelection();
	const nodesByLanguage = nodes.filter(node => node.language === language);
	const nodesByLanguageIds = nodesByLanguage.map(node => node.id);
	const nodesByLanguageSelection = svg.selectAll('circle').filter(node => nodesByLanguageIds.includes(node.id));
	nodesByLanguageSelection.attr('fill', LANGUAGE_SELECT_COLOR);
	selectedLanguage = language;
	selectedLanguageNodes = nodesByLanguage;
	const languageButtons = document.querySelectorAll('.language-item');
	languageButtons.forEach(button => {
		if (button.getAttribute('data') === language) {
			button.classList.add('selected');
		}
	});
};

function resetLanguageSelection() {
	if (selectedLanguage) {
		const nodesByLanguageIds = selectedLanguageNodes.map(node => node.id);
		const nodesByLanguageSelection = svg.selectAll('circle').filter(node => nodesByLanguageIds.includes(node.id));
		nodesByLanguageSelection.attr('fill', NODE_FILL);
		selectedLanguage = null;
		selectedLanguageNodes = [];
	}
};

function resetLanguageButtons() {
	const languageButtons = document.querySelectorAll('.language-item');
	languageButtons.forEach(button => 
		button.classList.remove('selected')
	);
}

function createSearch(nodes) {
	const searchInput = document.querySelector('#search');
	const searchResults = document.querySelector('#search-results');

	searchInput.addEventListener('input', () => {
		const searchValue = searchInput.value.toLowerCase();
		if (searchValue.length !== 0) {
			const filteredNodes = nodes.filter(node => 
				node.name.toLowerCase().includes(searchValue) || node.username.toLowerCase().includes(searchValue)
			);
			const searchResultsText = filteredNodes.map(node => `<li class='search-result-item' onclick='selectSearchNode(${node.id})'>${node.name} (👤${getParticipantsCountFormat(node.participantsCount)})</li>`).join('');
			
			searchResults.innerHTML = searchResultsText;
			searchResults.hidden = false;
		} else {
			searchResults.innerHTML = '';
			searchResults.hidden = true;
		}
	});
};

function selectSearchNode(id) {
	const searchNode = svg.selectAll('circle').filter(node => node.id === id);
	const node = searchNode.datum();
	if (node.id !== selected?.id) {
		selectNode(node);
	}

	zoomToNode(node);

	const searchInput = document.querySelector('#search');
	const searchResults = document.querySelector('#search-results');
	searchInput.value = '';
	searchResults.innerHTML = '';
	searchResults.hidden = true;
};

function zoomToNode(node) {
	const x = node.x;
	const y = node.y;
	const scale = 2;

	let transform = d3.zoomIdentity
		.translate(width / 2, height / 2)
		.scale(scale)
		.translate(-x, -y);

	svg.transition()
		.duration(500)
		.call(zoom_handler.transform, transform);
};

function showNetworkInfo() {
	selected = null;
	selectedlinkedNodes = [];
	selectedlinkedLinks = [];
	svg.selectAll('circle').attr('fill', NODE_FILL);
	svg.selectAll('line').attr('stroke', STROKE_COLOR);
	const infoContainer = document.querySelector('.info-container');
	infoContainer.hidden = true;

	const networkInfo = document.querySelector('.network-info-container');

	const scanDate = document.querySelector('#scan-date');
	const nodesCount = document.querySelector('#nodes-count');
	const connectionsCount = document.querySelector('#connections-count');
	const postsCount = document.querySelector('#posts-count');
	const languages = document.querySelector('#languages');

	scanDate.innerHTML = 'Дата сканування мережі: ' + network.scanDate;
	nodesCount.innerHTML = 'Каналів: ' + network.nodesCount;
	connectionsCount.innerHTML = 'Зв\'язків: ' + network.connections;
	postsCount.innerHTML = 'Постів: ' + network.postsCount;

	const languagesContainer = network.languages.map(language => {
		const languageCode = language.code;
		return `<div class='language-item' data='${languageCode}' onclick=highlightNodesByLanguage('${languageCode}')>${languageToEmoji(languageCode)} ${languageCode}: ${language.count}</div>`;
	}).join('');
	
	languages.innerHTML = `<div id='languages-header'>Мови:</div>` + `<div id='languages-container'>` + languagesContainer + `</div>`;
	createWordCloud(network.wordmap, '#network-word-cloud');

	networkInfo.hidden = false;
}

function hideNetworkInfo() {
	const networkInfo = document.querySelector('.network-info-container');
	networkInfo.hidden = true;
}
//#endregion

//#region utils
function getTargretRadius(target) {
	const targetNode = nodes.find(node => node.id === target);
	return getCircleRadius(targetNode.participantsCount);
};

function getCircleRadius(participantsCount) {
	for (let i = 0; i < PARTICIPANT_THRESHOLDS.length; i++) {
		if (participantsCount < PARTICIPANT_THRESHOLDS[i].limit) {
			return PARTICIPANT_THRESHOLDS[i].radius;
		}
	}
	return 34;
};

function addDuplicatesCountToLinks(links) {
	return links.reduce((acc, curr) => {
		const duplicate = acc.find(item => item.source.id === curr.source.id && item.target.id === curr.target.id);
		if (duplicate) {
			duplicate.count++;
		} else {
			acc.push({ ...curr, count: 1 });
		}
		return acc;
	}, []);
};

function getParticipantsCountFormat(participantsCount) {
	if (participantsCount < 1000) {
		return participantsCount;
	}
	if (participantsCount < 1000000) {
		return (participantsCount / 1000).toFixed(1) + 'K';
	}
	return (participantsCount / 1000000).toFixed(1) + 'M';
};

function languageToEmoji(language) {
	if (language === 'unknown') {
		return '';
	} else if (language === 'uk') {
		return '🇺🇦';
	} else if (language === 'ru') {
		return '🤮';
	} else if (language === 'en') {
		return '🇺🇸';
	} else if (language === 'pl') {
		return '🇵🇱';
	} else if (language === 'be') {
		return '🇧🇾';
	} else {
		return '🌐';
	}
};

function getSizeByCount(count, max, min) {
	if (max === min) {
		return 15;
	}
	return 15 + (count - min) / (max - min) * 10;
};
//#endregion