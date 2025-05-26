// ========================================================================
// ARXIV PAPERS CHATBOT - A Node.js application to search and retrieve
// academic papers from the arXiv repository using their public API
// ========================================================================

// ---------------------- IMPORTING REQUIRED PACKAGES ----------------------
// File system operations (reading/writing files)
const fs = require("fs");
// Working with file and directory paths
const path = require("path");
// Making HTTP requests to the arXiv API
const axios = require("axios");
// Converting XML responses to JavaScript objects
const xml2js = require("xml2js");
// Handling command-line input/output
const readline = require("readline");
// Loading environment variables from .env file
require("dotenv").config();

// Directory where paper information will be stored
const PAPER_DIR = "papers";

// ---------------------- CORE FUNCTIONALITY ----------------------

/**
 * Searches for academic papers on arXiv based on a given topic
 * 
 * @param {string} topic - The search topic/keywords
 * @param {number} maxResults - Maximum number of results to return (default: 5)
 * @returns {Array} - List of paper IDs found in the search
 */
async function searchPapers(topic, maxResults = 5) {
  // Step 1: Construct the arXiv API URL with the search parameters
  const apiUrl = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
    topic
  )}&start=0&max_results=${maxResults}&sortBy=relevance`;

  // Step 2: Make the HTTP request to arXiv API
  const response = await axios.get(apiUrl);
  const xml = response.data;
  console.log(xml);
  console.log("--------------------------------------------------");

  // Step 3: Parse the XML response into a JavaScript object
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xml);
  console.log(result);
  console.log("--------------------------------------------------");

  // Step 4: Extract the paper entries from the parsed result
  const entries = result.feed.entry || [];
  const paperIds = [];  // Will store just the IDs
  const papersInfo = {}; // Will store detailed information

  // Step 5: Process each paper entry
  entries.forEach((entry) => {
    // Extract the paper ID from the last part of the ID URL
    const id = entry.id[0].split("/").pop();
    // Extract other paper details
    const title = entry.title[0].trim();
    const summary = entry.summary[0].trim();
    const published = entry.published[0].split("T")[0]; // Just get the date part
    const authors = entry.author.map((a) => a.name[0]);
    // Find the PDF link if available
    const pdfLink = (entry.link.find((l) => l.$.title === "pdf") || { $: {} }).$.href || "";

    // Store the paper ID in our list
    paperIds.push(id);
    // Store detailed paper information in our object, using ID as the key
    papersInfo[id] = {
      title,
      authors,
      summary,
      pdf_url: pdfLink,
      published,
    };
  });

  // Step 6: Create a directory for this topic if it doesn't exist
  // Convert spaces to underscores and make lowercase for the directory name
  const topicDir = path.join(PAPER_DIR, topic.toLowerCase().replace(/\s+/g, "_"));
  fs.mkdirSync(topicDir, { recursive: true });
  
  // Step 7: Save the paper information to a JSON file
  const filePath = path.join(topicDir, "papers_info.json");
  fs.writeFileSync(filePath, JSON.stringify(papersInfo, null, 2));
  console.log(`Results are saved in: ${filePath}`);

  // Return just the paper IDs (can be used to look up details later)
  return paperIds;
}

/**
 * Retrieves detailed information about a specific paper by its ID
 * 
 * @param {string} paperId - The ID of the paper to look up
 * @returns {string} - JSON string with paper details or error message
 */
function extractInfo(paperId) {
  // Step 1: Get all directories in the papers folder
  const dirs = fs.readdirSync(PAPER_DIR);

  // Step 2: Search through each directory for the paper ID
  for (const dir of dirs) {
    const filePath = path.join(PAPER_DIR, dir, "papers_info.json");
    // Check if the papers_info.json file exists in this directory
    if (fs.existsSync(filePath)) {
      // Read and parse the JSON file
      const data = JSON.parse(fs.readFileSync(filePath));
      // Check if this file contains information about our paper
      if (data[paperId]) {
        // Return the paper information as a formatted JSON string
        return JSON.stringify(data[paperId], null, 2);
      }
    }
  }
  // If paper not found, return an error message
  return `There's no saved information related to paper ${paperId}.`;
}

// ---------------------- TOOL MANAGEMENT ----------------------

/**
 * Map of available tools/functions that can be executed by the chatbot
 */
const tools = {
  search_papers: searchPapers,
  extract_info: extractInfo,
};

/**
 * Executes a tool/function with the provided arguments
 * 
 * @param {string} toolName - Name of the tool to execute
 * @param {object} toolArgs - Arguments to pass to the tool
 * @returns {string} - Result of the tool execution
 */
async function executeTool(toolName, toolArgs) {
  // Check if the requested tool exists
  if (!tools[toolName]) return "Tool not found.";
  
  // Execute the tool with the provided arguments
  const result = await tools[toolName](...Object.values(toolArgs));
  
  // Convert object results to JSON strings for display
  return typeof result === "object" ? JSON.stringify(result, null, 2) : result;
}

// ---------------------- USER INTERACTION ----------------------

/**
 * Create a readline interface for command-line interaction
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompts the user for input and processes their query
 */
function promptInput() {
  rl.question("\nQuery: ", async (query) => {
    // Exit the application if the user types "quit"
    if (query.toLowerCase() === "quit") return rl.close();

    // Handle paper search queries
    if (query.includes("Search for")) {
      // Use regex to extract the number of papers and the topic
      // Format: "Search for X papers on "TOPIC""
      const match = query.match(/Search for (\d+) papers on \"(.+)\"/);
      if (match) {
        // Execute the search_papers tool with extracted parameters
        const result = await executeTool("search_papers", {
          topic: match[2],
          maxResults: parseInt(match[1], 10),
        });
        console.log("\n", result);
      }
    } 
    // Handle paper info queries
    else if (query.includes("Info on")) {
      // Use regex to extract the paper ID
      // Format: "Info on paper PAPER_ID"
      const match = query.match(/Info on paper ([^\s]+)/);
      if (match) {
        // Execute the extract_info tool with the paper ID
        const result = await executeTool("extract_info", { paperId: match[1] });
        console.log("\n", result);
      }
    } 
    // Handle unrecognized queries
    else {
      console.log("Sorry, I didn't understand that command.");
    }

    // Continue prompting for input (recursive call)
    promptInput();
  });
}

// Start the application
console.log("Type your queries or 'quit' to exit.");
console.log("Example commands:");
console.log("  - Search for 3 papers on \"quantum computing\"");
console.log("  - Info on paper 2304.12345");
promptInput();
