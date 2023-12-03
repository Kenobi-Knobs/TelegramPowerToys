﻿
// get the width and height of the window
const width = document.documentElement.clientWidth - 20;
const height = document.documentElement.clientHeight - 20;

const ARROW_FILL = '#838383';
const STROKE_COLOR = '#999';
const NODE_FILL = '#78a5fd';
const SELECTED_NODE_FILL = '#ff678b';
const LINKED_NODE_FILL = '#fff85c';
const LINKED_LINK_COLOR = '#a6a000';
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

// create the svg
const svg = d3.select('body')
	.append('svg')
	.attr('width', width)
	.attr('height', height)
	.call(d3.zoom().scaleExtent([0.1, 10]).on('zoom', zoomed))
	.append('g');

// create the simulation
const simulation = d3.forceSimulation()
	.force('link', d3.forceLink().id(d => d.id))
	.force('charge', d3.forceManyBody().strength(-1000))
	.force('center', d3.forceCenter(width / 2, height / 2));

const arrow = createMarker(svg, links);
const link = createLink(svg, links);
const node = createNode(svg, nodes);
const label = createLabel(svg, nodes);

// simulation setup
simulation.nodes(nodes).on('tick', ticked);
simulation.force('link').links(links);

//#region Create Graph elements
function createMarker(svg, links) {
	return svg.append('defs').selectAll('marker')
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
}

function createLink(svg, links) {
	return svg.append('g')
		.attr('class', 'links')
		.selectAll('line')
		.data(links)
		.enter()
		.append('line')
		.attr('stroke', STROKE_COLOR)
		.attr('stroke-width', 2)
		.attr('marker-end', (d, i) => `url(#arrowhead-${i})`);
}

function createNode(svg, nodes) {
	return svg.append('g')
		.attr('class', 'nodes')
		.selectAll('circle')
		.data(nodes)
		.enter()
		.append('circle')
		.style('cursor', 'pointer')
		.on('click', selectNode)
		.attr('r', d => getCircleRadius(d.participantsCount))
		.attr('fill', NODE_FILL);
}

function createLabel(svg, nodes) {
	return svg.append('g')
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
}

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
//#endregion

//#region Drag and zoom
function dragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
}

function dragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
}

function dragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = d.x;
	d.fy = d.y;
}

function textdragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
}

function textdragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
	d.x = d3.event.x;
	d.y = d3.event.y;
}

function textdragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = d.x;
	d.fy = d.y;
}

function zoomed() {
	svg.attr('transform', d3.event.transform);
};
//#endregion

//#region Graph and info manipulation
function selectNode(d) {
	if (selected && selected.id === d.id) {
		selected = null;
		selectedlinkedNodes = [];
		selectedlinkedLinks = [];
		svg.selectAll('circle').attr('fill', NODE_FILL);
		svg.selectAll('line').attr('stroke', STROKE_COLOR);
		const infoContainer = document.querySelector('.info-container');
		infoContainer.hidden = true;
		return;
	}

	if (selected) {
		let node = svg.selectAll('circle').filter(node => node.id === selected.id);
		node.attr('fill', NODE_FILL);
	}

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
	higlihtLinkedNodes(node);

	const infoContainer = document.querySelector('.info-container');
	const nodeName = document.querySelector('#node-name');
	const nodeLink = document.querySelector('#node-link');
	const nodeParticipants = document.querySelector('#node-participants');
	const nodeDescription = document.querySelector('#node-description');
	const link = 'https://t.me/' + d.username;
	const nodeLinkText = `<a href='${link}' target='_blank'>${'@'+d.username}</a>`;
	const nodeParticipantsText = "👤" + d.participantsCount;
	const nodeDescriptionText = d.about || 'Опис відсутній';
	
	nodeName.innerHTML = d.name;
	nodeLink.innerHTML = nodeLinkText;
	nodeParticipants.innerHTML = nodeParticipantsText;
	nodeDescription.innerHTML = nodeDescriptionText;
	infoContainer.hidden = false;
}

function higlihtLinkedNodes(node) {
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
}
//#endregion