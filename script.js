// Set the dimensions for the visualization
const width = window.innerWidth;
const height = window.innerHeight;

// colors
const customColors = ['#00429d', '#1c4d9f', '#2c58a1', '#3963a2', '#456ea2', '#507aa2', '#5b85a2', '#6690a0', 
'#729c9d', '#7da79a', '#89b295', '#96be90', '#a3c988', '#b1d47f', '#c0df73', '#d0ea64', 
'#e1f54f', '#e1e089', '#e6d184', '#eac27f', '#ecb37a', '#eda476', '#ec9571', '#ea866c', 
'#e77767', '#e36862', '#dd5a5d', '#d74b59', '#cf3d54', '#c52e4f', '#bb2049', '#af1244', 
'#a2053f', '#93003a'];

// Append SVG to the body of the page to contain the visualization
// Initially, create the SVG container without the zoom handler
const svg = d3.select("#network").append("svg")
    .attr("id", "networkVisualization")
    .attr("width", width)
    .attr("height", height);

// Then, create a <g> element that will contain all the visual elements
const container = svg.append("g");

// Later, apply the zoom handler to the SVG, but the transformations will affect the <g> container
const zoomHandler = d3.zoom()
    .on("zoom", (event) => {
        svg.attr("transform", event.transform); // Apply transformations to the container
    });

svg.call(zoomHandler)
   .call(zoomHandler.transform, d3.zoomIdentity); // Initialize with default zoom level



// Load and parse the data
Promise.all([
    d3.csv("links.latest.modified_2.csv"),
    d3.csv("nodes.latest.modified_2.csv")
]).then(function(files) {
    let linksData = files[0];
    let nodesGroupData = files[1];
    const graph = transformData(linksData, nodesGroupData);
    renderGraph(graph);

    // Set up an event listener for a slider, for example
    d3.select('#centralityRange').on('input', function() {
        const threshold = +d3.select(this).node().value;
        const filteredNodes = updateNetwork(threshold, graph);
        generateLegends(filteredNodes); // Update legends with filtered nodes
    });    

    // Now safe to use 'graph.nodes' for generating legends
    generateLegends(graph.nodes); // Call legend generation here
    // Call this function with your nodes data after it is loaded
    // Populate group selector on document ready or after data is loaded
    populateGroupSelector(graph.nodes);

    // Event listener for group selection changes
    d3.select('#groupSelector').on('change', function() {
        const selectedGroup = d3.select(this).property('value');
        populateNodeSelector(graph.nodes, selectedGroup);
    });

    // Assuming you've a dropdown for node selection with id="nodeSelector"
    d3.select('#nodeSelector').on('change', function() {
        const selectedNodeId = d3.select(this).property('value');
        // Call the highlight and zoom function when a node is selected
        highlightAndZoomToNode(graph.nodes, selectedNodeId);
    });

    // Include a search bar in the interface
    d3.select('#network-wrapper').insert('input', ':first-child')
        .attr('id', 'nodeSearch')
        .attr('placeholder', 'Type to search nodes...')
        .style('font-size', '1.5em')
        .style('padding', '5px')
        .style('margin-top', '10px')
        .style('display', 'block'); // Makes sure the search bar is a block element to fill width

    // Event listener for the search input changes
    d3.select('#nodeSearch').on('input', function() {
        const searchTerm = d3.select(this).node().value.toLowerCase();
        filterNodesBySearchTerm(searchTerm, graph);
    });
    
}).catch(function(err) {
    console.log(err);
});

function transformData(linksData, nodesGroupData) {
    let nodes = [], links = [];
    let nodeSet = new Set();
    let nodeGroupMap = new Map();

    // Map group data for easy access
    nodesGroupData.forEach(d => {
        nodeGroupMap.set(d.node, d.group);
    });

    linksData.forEach(row => {
        links.push({ source: row.source, target: row.target, value: +row.value });
        nodeSet.add(row.source);
        nodeSet.add(row.target);
    });

    // Include group data in nodes
    nodes = Array.from(nodeSet).map(node => ({
        id: node,
        group: nodeGroupMap.get(node) || "No Group"
    }));

    return { nodes, links };
}


// This function will handle the drawing of the graph
function renderGraph(graph) {
    // Clear existing SVG content
    svg.selectAll("*").remove();

    const customColors = ['#00429d', '#1c4d9f', '#2c58a1', '#3963a2', '#456ea2', '#507aa2', '#5b85a2', '#6690a0', 
    '#729c9d', '#7da79a', '#89b295', '#96be90', '#a3c988', '#b1d47f', '#c0df73', '#d0ea64', 
    '#e1f54f', '#e1e089', '#e6d184', '#eac27f', '#ecb37a', '#eda476', '#ec9571', '#ea866c', 
    '#e77767', '#e36862', '#dd5a5d', '#d74b59', '#cf3d54', '#c52e4f', '#bb2049', '#af1244', 
    '#a2053f', '#93003a'];

    const color = d3.scaleOrdinal(customColors);

    const simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.links).id(d => d.id).distance(30))
        .force("charge", d3.forceManyBody().strength(-20))
        .force("center", d3.forceCenter((width / 2) - 300, height / 2));
        // .force("center", d3.forceCenter(width / 2, height / 2));
    
    simulation.on('tick', () => {
        // Update node positions
        svg.selectAll(".node")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
        
        // Update link positions
        svg.selectAll(".link")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        
        // Update the position of the highlight, if any
        const highlightedNode = svg.selectAll(".highlight");
        if (!highlightedNode.empty()) {
            const targetNodeData = nodes.find(node => node.id === highlightedNode.datum().id);
            if (targetNodeData) {
                highlightedNode
                    .attr("x", targetNodeData.x - 10) // Adjust to keep the highlight centered on the node
                    .attr("y", targetNodeData.y - 10);
            }
        }
    });
        
        // Regularly "reheat" the simulation to keep the movement going
    setInterval(() => {
        // This "reheats" the simulation by setting the alpha target to a non-zero value
        simulation.alphaTarget(0.001).restart();
    }, 5000); // Adjust the interval time as needed

    // Optionally, decrease the alpha target back to 0 after a short burst of activity
    simulation.on('tick', () => {
    // Other tick updates here
    
    // Slow down the simulation over time after the burst
    simulation.alphaTarget(simulation.alpha() * 0.99);
    });

// Make sure to stop the interval when we want to permanently freeze the simulation


    // Create a scale for the link values to adjust stroke width
    const valueScale = d3.scaleLinear()
        .domain([d3.min(graph.links, d => d.value), d3.max(graph.links, d => d.value)])
        .range([0.1, 0.5]); // Adjust the range values as needed

    const link = svg.append("g")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#999") // Optional: Set a default color for the links
        .style("stroke-opacity", 0.5)
        .attr("stroke-width", d => valueScale(d.value));

    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", "node") // Assign class 
        .attr("r", 5)
        //.style("opacity", 0.1) // Set initial dimmed opacity for all nodes
        .attr("fill", d => color(d.group)) // Color by group
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Add mouseover and mouseout events
    node.on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("r", 10) // Increase radius
          .attr("fill", "#ffab00"); // Change color to highlight
    });

    node.on("mouseout", function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("r", 5) // Revert radius
          .attr("fill", d => color(d.group)); // Revert to original color
    });
    
    // For clicking nodes
    node.on("click", (event, d) => {
        displayNodeInfo(d.id);
    });

    node.append("title")
        .text(d => d.id);

    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    const zoomHandler = d3.zoom()
    .on("zoom", (event) => {
        svg.attr("transform", event.transform);
    });
    
    svg.call(zoomHandler)
       .call(zoomHandler.transform, d3.zoomIdentity); // Initialize with default zoom level

    const queryWindow = d3.select("#query-window");
    queryWindow.html("<p style='font-size: 30px; font-weight: bold; text-align: center; margin-top: 20px;'>Select a node to view query information.</p>");

}

function displayNodeInfo(nodeId) {
    const queryWindow = d3.select("#query-window");
    // Check if nodeId is truthy; if not, display the placeholder
    if (!nodeId) {
        queryWindow.html("<p>Select a node for query information.</p>"); // Show this text when no node is selected
    } else {const details = nodeDetails[nodeId] || {};
    const queryWindow = d3.select("#query-window");
    queryWindow.html(""); // Clear previous content

    // Create a styled table
    const table = queryWindow.append("table").attr("style", "width: 100%; border-collapse: collapse;");
    table.append("thead").append("tr")
         .selectAll("th")
         .data(Object.keys(details))
         .enter()
         .append("th")
         .attr("style", "border: 1px solid black; padding: 8px; background-color: #f2f2f2;")
         .text(d => d);

    const tbody = table.append("tbody");
    const row = tbody.append("tr");
    Object.values(details).forEach(value => {
        row.append("td")
           .attr("style", "border: 1px solid black; padding: 8px;")
           .text(value);
    });
    }
}

// get node query info
let nodeDetails = {};

fetch('merged_node_details.json')
    .then(response => response.json())
    .then(data => {
        nodeDetails = data;
        // Now `nodeDetails` is populated and can be used
        // For example, we might want to initialize our visualization here
    })
    .catch(error => console.error('Error loading node details:', error));

function getNodeDetails(nodeId) {
    const details = nodeDetails[nodeId];
    if (!details) {
        console.log("No details found for:", nodeId);
        return {};
    }
    // Process and return the details for nodeId
    return details;
}
    
// For selector
const groups = ["Small HDL (average diameter 8.7 nm)", "Fatty acids", "Glycolysis related metabolites",
"Ketone bodies", "Very small VLDL (average diameter 31.3 nm)", "Cholesterol",
"Phospholipids", "Cholesteryl esters", "Free cholesterol", "Total lipids",
"Other lipids", "Fluid balance", "Small VLDL (average diameter 36.8 nm)",
"IDL (average diameter 28.6 nm)", "Lipoprotein particle concentrations",
"Apolipoproteins", "Medium VLDL (average diameter 44.5 nm)", "Large LDL (average diameter 25.5 nm)",
"Medium LDL (average diameter 23 nm)", "Small LDL (average diameter 18.7 nm)",
"Relative lipoprotein lipid concentrations", "Triglycerides", "Very large HDL (average diameter 14.3 nm)",
"Large HDL (average diameter 12.1 nm)", "Medium HDL (average diameter 10.9 nm)",
"Lipoprotein particle sizes", "Amino acids", "Inflammation", "Chylomicrons and extremely large VLDL (particle diameters from 75 nm upwards)",
"Very large VLDL (average diameter 64 nm)", "Large VLDL (average diameter 53.6 nm)"];

// Assuming the nodes data structure looks something like this:
// nodes = [{id: "Node1", group: "Group1"}, {id: "Node2", group: "Group2"}, ...];

// Function to populate the group selector with unique groups
function populateGroupSelector(nodes) {
    const groups = Array.from(new Set(nodes.map(node => node.group))).sort();
    const groupSelector = d3.select("#groupSelector");
    groupSelector.html("<option value=''>Select Group</option>");
    
    groups.forEach(group => {
        groupSelector.append("option").text(group).attr("value", group);
    });
}

// Function to filter nodes by selected group and populate node selector
function populateNodeSelector(nodes, selectedGroup) {
    const filteredNodes = nodes.filter(node => node.group === selectedGroup);
    const nodeSelector = d3.select("#nodeSelector");
    nodeSelector.html("<option value=''>Select Node</option>"); // Clear previous options

    filteredNodes.forEach(node => {
        nodeSelector.append("option").text(node.id).attr("value", node.id);
    });
}


// New function to zoom into a node
function highlightAndZoomToNode(nodes, nodeId) {
    // Reset any previously highlighted nodes to their original appearance
    svg.selectAll(".node")
        .attr("r", 5); // Reset radius to default

    // Find the selected node and update its appearance
    const selectedNode = nodes.find(node => node.id === nodeId);
    if (selectedNode) {
        svg.selectAll(".node")
            .filter(d => d.id === nodeId)
            .attr("r", 20); // Increased radius for highlighted node

        // Adjusted zooming to center on the node
        const zoomLevel = 1.5; // Desired zoom level (adjusted as needed)

        // SVG dimensions
        const svgWidth = svg.node().getBoundingClientRect().width;
        const svgHeight = svg.node().getBoundingClientRect().height;

        // Get the position of the selected node
        const selectedNode = nodes.find(node => node.id === nodeId);

        // Check if the node is defined and not out of bounds
        if (selectedNode) {
            // Calculate the translation to center the node
            let offsetX = svgWidth / 2 - selectedNode.x * zoomLevel;
            let offsetY = svgHeight / 2 - selectedNode.y * zoomLevel;

            // Apply constraints to avoid moving nodes outside of the view
            offsetX = Math.min(offsetX, svgWidth * (zoomLevel - 1));
            offsetX = Math.max(offsetX, -svgWidth * (zoomLevel - 1));

            offsetY = Math.min(offsetY, svgHeight * (zoomLevel - 1));
            offsetY = Math.max(offsetY, -svgHeight * (zoomLevel - 1));

            // Apply the zoom and translation
            svg.transition().duration(750).call(
                zoomHandler.transform,
                d3.zoomIdentity.translate(offsetX, offsetY).scale(zoomLevel)
            );
        }
    }
}




  
  


// Legends
// Define this function to generate legends based on the loaded nodes
function generateLegends(nodes) {
    // Clear previous legends
    d3.select("#legend").selectAll("*").remove();

    // Use 'nodes' to compute uniqueGroups and generate legends
    const uniqueGroups = Array.from(new Set(nodes.map(node => node.group))).sort();

    const colorScale = d3.scaleOrdinal()
        .domain(uniqueGroups)
        .range(customColors.slice(0, uniqueGroups.length));

    // Generate the legend as before, using `uniqueGroups` and `colorScale` for color lookup
    const legendSVG = d3.select("#legend").append("svg")
        .attr("width", 600)
        .attr("height", uniqueGroups.length * 20 + 20); // Adjust height based on group count

    uniqueGroups.forEach((group, index) => {
        const legendItem = legendSVG.append("g")
            .attr("transform", `translate(0, ${index * 20})`); // Adjust for horizontal or vertical layout

        // Draw the color rectangle
        legendItem.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", colorScale(group));

        // Add the text label
        legendItem.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text(group);
    });
}



function initializeNetworkView() {
    // Assuming the force simulation has already been run and nodes have x,y coordinates
    // Set SVG and visualization dimensions
    const svgWidth = svg.node().getBoundingClientRect().width;
    const svgHeight = svg.node().getBoundingClientRect().height;

    // Get the extent of the nodes
    const xExtent = d3.extent(graph.nodes, d => d.x);
    const yExtent = d3.extent(graph.nodes, d => d.y);

    // Calculate the width and height based on node extents
    const networkWidth = xExtent[1] - xExtent[0];
    const networkHeight = yExtent[1] - yExtent[0];

    // Determine the scale to fit the network within the SVG dimensions
    const xScale = svgWidth / networkWidth;
    const yScale = svgHeight / networkHeight;
    const initialScale = Math.min(xScale, yScale) * 0.8; // 0.8 to add some padding

    // Calculate the initial translation to center the network
    const initialTranslateX = svgWidth / 2 - ((xExtent[1] + xExtent[0]) / 2) * initialScale;
    const initialTranslateY = svgHeight / 2 - ((yExtent[1] + yExtent[0]) / 2) * initialScale;

    // Apply the initial transform to the SVG
    container.attr("transform", `translate(${initialTranslateX},${initialTranslateY}) scale(${initialScale})`);
}

// Function to update the network based on the centrality threshold
let nodeCentralities = {}; // Fill this with your centrality data
fetch('centrality.json')
    .then(response => response.json())
    .then(data => {
        nodeCentralities = data;
    })
    .catch(error => console.error('Error loading node nodeCentralities:', error));

    function updateNetwork(threshold, graph) {
        // Use a threshold that is based on percentage (assuming threshold is between 0 and 1)
        threshold = threshold; // threshold  is between 0 and 1
    
        // Filter nodes based on whether their centrality score meets the threshold
        // The nodes without a centrality score will be included as well
        const filteredNodes = graph.nodes.filter(node => {
            const centrality = nodeCentralities[node.id];
            return centrality === undefined || centrality > threshold;
        });
    
        // Generate a Set of IDs from the filtered nodes for quick lookup
        const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
    
        // Filter the links where both source and target nodes are in the filtered nodes
        const filteredLinks = graph.links.filter(link => {
            return filteredNodeIds.has(link.source.id) && filteredNodeIds.has(link.target.id);
        });
    
        // Now, render the network with the filtered nodes and links
        renderGraph({ nodes: filteredNodes, links: filteredLinks });

        // Return the filtered nodes for further processing, like updating legends
        return filteredNodes;
    }
    

    function filterNodesBySearchTerm(searchTerm, graph) {
        // Reset any previous search-related styling
        svg.selectAll('.node')
           .style('opacity', 1); // Reset opacity for all nodes
    
        if (searchTerm) {
            // Lower the opacity for all nodes to "fade" them out
            svg.selectAll('.node')
               .style('opacity', 0.1);
    
            // Highlight only the nodes that match the search term by setting a higher opacity
            svg.selectAll('.node')
               .filter(node => node.id.toLowerCase().includes(searchTerm))
               .style('opacity', 1)
               .attr("r", 20);
        }
    }

// Append this at the end of the existing script

// Function to download the SVG as a PNG file
function downloadSVGAsPNG(svgElement, width, height, filename) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function() {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(function(blob) {
            const a = document.createElement('a');
            document.body.appendChild(a);
            const downloadUrl = URL.createObjectURL(blob);
            a.href = downloadUrl;
            a.download = filename;
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            URL.revokeObjectURL(url);
        });
    };
    img.src = url;
}

// Create a button in the HTML for triggering the download
document.body.insertAdjacentHTML('beforeend', '<button id="downloadBtn">Download Network as PNG</button>');

// Event listener for the download button
document.getElementById('downloadBtn').addEventListener('click', function() {
    const svgElement = document.getElementById('networkVisualization'); // Selecting by ID
    const width = svgElement.clientWidth || 800; // Default width if not detectable
    const height = svgElement.clientHeight || 600; // Default height if not detectable
    downloadSVGAsPNG(svgElement, width, height, 'network_visualization.png');
});
