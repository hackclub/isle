import * as d3 from 'd3';
import LZString from 'lz-string';

// Global variables
let scenes = [];
let connections = [];
let imageAspectRatio = 1;
let imageWidth = 0;
let imageHeight = 0;
let svgWidth = 0;
let svgHeight = 0;
let isStateLoaded = false;
let selectedScene = null;
let nodeClickOccurred = false;

// Settings
let settings = {
    regenerateConnections: false,
    showVoronoi: false
};

// Constants
const SEED = 42;
const BIDIRECTIONAL_PROBABILITY = 0.3;

// Deterministic random number generator using seed
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    
    random() {
        return this.next();
    }
    
    randomBetween(min, max) {
        return min + (max - min) * this.random();
    }
}

const random = new SeededRandom(SEED);

// Helper functions for proper Voronoi-based connections
function calculateDistance(scene1, scene2) {
    const dx = scene1.x - scene2.x;
    const dy = scene1.y - scene2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function findVoronoiNeighbors() {
    const neighbors = new Map();
    
    for (let i = 0; i < scenes.length; i++) {
        neighbors.set(i, []);
    }
    
    for (let i = 0; i < scenes.length; i++) {
        for (let j = i + 1; j < scenes.length; j++) {
            const scene1 = scenes[i];
            const scene2 = scenes[j];
            
            if (areVoronoiNeighbors(scene1, scene2, i, j)) {
                neighbors.get(i).push(j);
                neighbors.get(j).push(i);
            }
        }
    }
    
    return neighbors;
}

function areVoronoiNeighbors(scene1, scene2, index1, index2) {
    const midX = (scene1.x + scene2.x) / 2;
    const midY = (scene1.y + scene2.y) / 2;
    
    const dist1 = calculateDistance({x: midX, y: midY}, scene1);
    const dist2 = calculateDistance({x: midX, y: midY}, scene2);
    
    for (let k = 0; k < scenes.length; k++) {
        if (k !== index1 && k !== index2) {
            const otherScene = scenes[k];
            const distToOther = calculateDistance({x: midX, y: midY}, otherScene);
            
            if (distToOther < Math.max(dist1, dist2)) {
                return false;
            }
        }
    }
    
    return true;
}

function generateVoronoiConnections(existingConnectionsArray = []) {
    const neighbors = findVoronoiNeighbors();
    const connections = [];
    const connectionSet = new Set();
    
    const existingConnections = new Map();
    for (const conn of existingConnectionsArray) {
        const key = conn.from < conn.to ? `${conn.from}-${conn.to}` : `${conn.to}-${conn.from}`;
        existingConnections.set(key, conn.bidirectional);
    }
    
    for (let i = 0; i < scenes.length; i++) {
        const neighborList = neighbors.get(i);
        
        for (const neighborIndex of neighborList) {
            const key = i < neighborIndex ? `${i}-${neighborIndex}` : `${neighborIndex}-${i}`;
            
            if (!connectionSet.has(key)) {
                connectionSet.add(key);
                
                let isBidirectional;
                if (existingConnections.has(key)) {
                    isBidirectional = existingConnections.get(key);
                } else {
                    isBidirectional = random.random() < BIDIRECTIONAL_PROBABILITY;
                }
                
                connections.push({
                    from: i,
                    to: neighborIndex,
                    bidirectional: isBidirectional
                });
            }
        }
    }
    
    ensureGraphConnectivity(connections);
    
    console.log(`Generated ${connections.length} connections using Voronoi algorithm`);
    return connections;
}

function ensureGraphConnectivity(connections) {
    let maxIterations = 100;
    let iteration = 0;
    
    while (iteration < maxIterations) {
        const sceneStats = analyzeSceneConnectivity(connections);
        const scenesWithoutBidirectional = findScenesWithoutBidirectional(sceneStats);
        
        if (scenesWithoutBidirectional.length === 0) {
            console.log(`All scenes have bidirectional edges after ${iteration} iterations`);
            break;
        }
        
        for (const sceneIndex of scenesWithoutBidirectional) {
            ensureSceneHasBidirectional(sceneIndex, connections, sceneStats);
        }
        
        iteration++;
    }
    
    if (iteration >= maxIterations) {
        console.warn('Warning: Could not ensure all scenes have bidirectional edges within iteration limit');
    }
}

function analyzeSceneConnectivity(connections) {
    const sceneStats = new Map();
    
    for (let i = 0; i < scenes.length; i++) {
        sceneStats.set(i, { inEdges: [], outEdges: [], bidirectionalEdges: [] });
    }
    
    for (let i = 0; i < connections.length; i++) {
        const conn = connections[i];
        
        if (conn.bidirectional) {
            sceneStats.get(conn.from).bidirectionalEdges.push(i);
            sceneStats.get(conn.to).bidirectionalEdges.push(i);
        } else {
            sceneStats.get(conn.from).outEdges.push(i);
            sceneStats.get(conn.to).inEdges.push(i);
        }
    }
    
    return sceneStats;
}

function findScenesWithoutBidirectional(sceneStats) {
    const scenesWithoutBidirectional = [];
    
    for (const [sceneIndex, stats] of sceneStats.entries()) {
        if (stats.bidirectionalEdges.length === 0) {
            scenesWithoutBidirectional.push(sceneIndex);
        }
    }
    
    return scenesWithoutBidirectional;
}

function ensureSceneHasBidirectional(sceneIndex, connections, sceneStats) {
    const stats = sceneStats.get(sceneIndex);
    
    if (stats.bidirectionalEdges.length > 0) {
        return;
    }
    
    const allConnectedEdges = [...stats.inEdges, ...stats.outEdges];
    
    if (allConnectedEdges.length === 0) {
        console.warn(`Scene ${sceneIndex} has no edges - this shouldn't happen`);
        return;
    }
    
    const edgeIndex = allConnectedEdges[Math.floor(random.random() * allConnectedEdges.length)];
    const conn = connections[edgeIndex];
    
    conn.bidirectional = true;
    
    console.log(`Made edge ${edgeIndex} (${conn.from} ↔ ${conn.to}) bidirectional for scene ${sceneIndex}`);
}

// Generate deterministic color from scene ID
function getSceneColor(sceneId) {
    let hash = 0;
    const str = sceneId.toString();
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    const r = (hash * 17) % 256;
    const g = (hash * 31) % 256;
    const b = (hash * 13) % 256;
    
    return `rgba(${r}, ${g}, ${b}, 0.3)`;
}

function generateConnections() {
    connections = generateVoronoiConnections(connections);
    updateSceneConnections();
}

function updateSceneConnections() {
    for (let i = 0; i < scenes.length; i++) {
        scenes[i].connections = [];
    }
    
    for (const conn of connections) {
        scenes[conn.from].connections.push(conn.to);
        if (conn.bidirectional) {
            scenes[conn.to].connections.push(conn.from);
        }
    }
}

// Convert normalized coordinates to pixel coordinates
function normalizedToPixelX(normalizedX) {
    return (normalizedX / imageAspectRatio + 1) * (imageWidth / 2);
}

function normalizedToPixelY(normalizedY) {
    return (-normalizedY + 1) * (imageHeight / 2);
}

function pixelToNormalizedX(pixelX) {
    return ((pixelX / (imageWidth / 2)) - 1) * imageAspectRatio;
}

function pixelToNormalizedY(pixelY) {
    return -((pixelY / (imageHeight / 2)) - 1);
}

function renderScenes() {
    const svg = d3.select('#overlay-svg');
    
    svg.selectAll('.scene').remove();
    
    console.log('Rendering scenes:', scenes.length, 'scenes');
    
    const sceneGroups = svg.selectAll('.scene')
        .data(scenes)
        .enter()
        .append('g')
        .attr('class', 'scene')
        .attr('transform', d => `translate(${d.pixelX}, ${d.pixelY})`)
        .style('cursor', 'pointer');
    
    sceneGroups.append('circle')
        .attr('r', 6)
        .attr('fill', d => d.id === selectedScene ? '#FFD700' : '#FF6B6B')
        .attr('stroke', d => d.id === selectedScene ? '#FFA500' : '#ffffff')
        .attr('stroke-width', d => d.id === selectedScene ? 3 : 1.5)
        .attr('data-radius', 6)
        .style('transition', 'r 0.2s ease, stroke-width 0.2s ease');
    
    sceneGroups.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#ffffff')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .style('user-select', 'none')
        .style('pointer-events', 'none')
        .text(d => d.id);
    
    sceneGroups.select('circle')
        .on('mouseenter', function(event, d) {
            console.log('Mouse enter on scene:', d.id, d.name);
            event.stopPropagation();
            showHoverDisplay(d);
            d3.select(this)
                .attr('r', 10)
                .attr('stroke-width', d.id === selectedScene ? 4 : 2.5);
        })
        .on('mouseleave', function(event, d) {
            console.log('Mouse leave on scene:', d.id);
            event.stopPropagation();
            d3.select(this)
                .attr('r', 6)
                .attr('stroke-width', d.id === selectedScene ? 3 : 1.5);
            
            if (selectedScene !== null) {
                const selectedSceneData = scenes.find(s => s.id === selectedScene);
                if (selectedSceneData) {
                    showHoverDisplay(selectedSceneData);
                }
            } else {
                hideHoverDisplay();
            }
        })
        .on('click', function(event, d) {
            console.log('Scene clicked:', d.id);
            event.stopPropagation();
            selectScene(d.id);
        });
}

function renderConnections() {
    const svg = d3.select('#overlay-svg');
    
    svg.selectAll('.connection').remove();
    
    const connectionGroups = svg.selectAll('.connection')
        .data(connections)
        .enter()
        .append('g')
        .attr('class', 'connection');
    
    connectionGroups.append('line')
        .attr('x1', d => {
            const endpoints = calculateLineEndpoints(scenes[d.from], scenes[d.to]);
            return endpoints.x1;
        })
        .attr('y1', d => {
            const endpoints = calculateLineEndpoints(scenes[d.from], scenes[d.to]);
            return endpoints.y1;
        })
        .attr('x2', d => {
            const endpoints = calculateLineEndpoints(scenes[d.from], scenes[d.to]);
            return endpoints.x2;
        })
        .attr('y2', d => {
            const endpoints = calculateLineEndpoints(scenes[d.from], scenes[d.to]);
            return endpoints.y2;
        })
        .attr('stroke', d => d.bidirectional ? '#4ECDC4' : '#FFE66D')
        .attr('stroke-width', d => d.bidirectional ? 4 : 3)
        .attr('stroke-dasharray', d => d.bidirectional ? 'none' : '5,5')
        .style('filter', 'drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.8))');
    
    if (!svg.select('defs').empty()) {
        svg.select('defs').remove();
    }
    
    const defs = svg.append('defs');
    
    defs.append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#FFE66D')
        .style('filter', 'drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.8))');
    
    connectionGroups.select('line')
        .filter(d => !d.bidirectional)
        .attr('marker-end', 'url(#arrowhead)');
}

function calculateLineEndpoints(scene1, scene2) {
    const radius = 6;
    const dx = scene2.pixelX - scene1.pixelX;
    const dy = scene2.pixelY - scene1.pixelY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) {
        return { x1: scene1.pixelX, y1: scene1.pixelY, x2: scene2.pixelX, y2: scene2.pixelY };
    }
    
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    const startX = scene1.pixelX + unitX * radius;
    const startY = scene1.pixelY + unitY * radius;
    const endX = scene2.pixelX - unitX * radius;
    const endY = scene2.pixelY - unitY * radius;
    
    return { x1: startX, y1: startY, x2: endX, y2: endY };
}

function updateConnections() {
    renderConnections();
}

function showHoverDisplay(scene) {
    const hoverDisplay = document.getElementById('hover-display');
    
    // Clear previous content
    hoverDisplay.innerHTML = '';
    
    // Create title in italics
    const title = document.createElement('em');
    title.textContent = scene.name || `Scene ${scene.id}`;
    hoverDisplay.appendChild(title);
    
    // Add description if it exists
    if (scene.description) {
        const description = document.createElement('div');
        description.textContent = scene.description;
        description.style.marginTop = '4px';
        hoverDisplay.appendChild(description);
    }
    
    // Add claim/slack info
    const statusDiv = document.createElement('div');
    statusDiv.style.marginTop = '8px';
    statusDiv.style.fontSize = '12px';
    statusDiv.style.opacity = '0.8';
    
    if (scene.claimed) {
        // Scene is claimed
        const username = scene.claimed_by || 'Unknown user';
        statusDiv.textContent = `made by ${username} – `;
        const link = document.createElement('a');
        link.href = scene.path;
        link.textContent = 'visit!';
        link.style.color = '#4A9EFF';
        link.style.textDecoration = 'underline';
        link.target = '_self';
        statusDiv.appendChild(link);
    } else {
        // Scene is unclaimed - always show slack link
        statusDiv.textContent = 'unclaimed • ';
        const link = document.createElement('a');
        if (scene.slack_thread_url) {
            link.href = scene.slack_thread_url;
        } else {
            // If no thread exists yet, link to general channel
            link.href = 'https://hackclub.slack.com/channels/isle';
        }
        link.textContent = 'discuss in slack';
        link.style.color = '#4A9EFF';
        link.style.textDecoration = 'underline';
        link.target = '_blank';
        statusDiv.appendChild(link);
    }
    
    hoverDisplay.appendChild(statusDiv);
    hoverDisplay.classList.add('visible');
}

function hideHoverDisplay() {
    const hoverDisplay = document.getElementById('hover-display');
    hoverDisplay.classList.remove('visible');
}

function selectScene(sceneId) {
    if (selectedScene === sceneId) {
        deselectScene();
        return;
    }
    
    selectedScene = sceneId;
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) {
        showHoverDisplay(scene);
    }
    renderScenes();
    console.log(`Selected scene ${sceneId}: ${scene.name}`);
}

function deselectScene() {
    selectedScene = null;
    hideHoverDisplay();
    renderScenes();
    console.log('Deselected scene');
}



function setupEventListeners() {
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
        mapContainer.addEventListener('click', function(event) {
            if (event.target.id === 'map-container' || event.target.id === 'map-image') {
                console.log('Background click detected, deselecting');
                deselectScene();
            }
        });
    }
}



function initializeFromRailsData(railsScenes) {
    console.log('Initializing from Rails data:', railsScenes);
    
    scenes = railsScenes.map((scene, index) => {
        // If scene has coordinates, use them, otherwise generate random ones
        let x, y;
        if (scene.x !== null && scene.x !== undefined && 
            scene.y !== null && scene.y !== undefined) {
            x = parseFloat(scene.x);
            y = parseFloat(scene.y);
        } else {
            // Generate random coordinates if not set
            x = random.randomBetween(-imageAspectRatio, imageAspectRatio);
            y = random.randomBetween(-1, 1);
        }
        
        return {
            id: scene.id || index,
            x: parseFloat(x.toFixed(3)),
            y: parseFloat(y.toFixed(3)),
            pixelX: normalizedToPixelX(x),
            pixelY: normalizedToPixelY(y),
            name: scene.name || `Scene ${scene.id || index}`,
            description: scene.description || '',
            connections: scene.connections || [],
            // Preserve Rails-specific fields
            claimed: scene.claimed,
            claimed_by: scene.claimed_by,
            slack_thread_url: scene.slack_thread_url,
            path: scene.path
        };
    });
    
    // Generate connections if they don't exist
    if (scenes.some(s => s.connections.length === 0)) {
        generateConnections();
    } else {
        // Reconstruct connections from scene data
        connections = [];
        const connectionSet = new Set();
        
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            for (const targetId of scene.connections) {
                const targetIndex = scenes.findIndex(s => s.id === targetId);
                if (targetIndex !== -1) {
                    const key = i < targetIndex ? `${i}-${targetIndex}` : `${targetIndex}-${i}`;
                    
                    if (!connectionSet.has(key)) {
                        connectionSet.add(key);
                        
                        const targetScene = scenes[targetIndex];
                        const isBidirectional = targetScene && targetScene.connections.includes(scene.id);
                        
                        connections.push({
                            from: i,
                            to: targetIndex,
                            bidirectional: isBidirectional
                        });
                    }
                }
            }
        }
    }
    
    console.log(`Initialized with ${scenes.length} scenes and ${connections.length} connections`);
}

function initialize() {
    console.log('Initializing map viewer...');
    
    const mapImage = document.getElementById('map-image');
    const svg = d3.select('#overlay-svg');
    
    if (!mapImage || svg.empty()) {
        console.error('Required elements not found');
        return;
    }
    
    function onImageLoad() {
        const container = document.getElementById('map-container');
        const containerRect = container.getBoundingClientRect();
        
        imageWidth = containerRect.width;
        imageHeight = containerRect.height;
        imageAspectRatio = imageWidth / imageHeight;
        
        svgWidth = imageWidth;
        svgHeight = imageHeight;
        
        svg
            .attr('width', svgWidth)
            .attr('height', svgHeight);
        
        console.log(`Image loaded: ${imageWidth}x${imageHeight}, aspect ratio: ${imageAspectRatio}`);
        
        // Initialize scenes from Rails data (passed via window.railsScenes)
        if (window.railsScenes) {
            initializeFromRailsData(window.railsScenes);
        }
        
        renderScenes();
        renderConnections();
        setupEventListeners();
        
        console.log('Map viewer initialized successfully');
    }
    
    if (mapImage.complete) {
        onImageLoad();
    } else {
        mapImage.addEventListener('load', onImageLoad);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
