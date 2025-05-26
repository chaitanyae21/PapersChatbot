// ========================================================================
// TOOLS.JS - Contains all tool definitions and functions for the ArXiv Papers Chatbot
// ========================================================================

// ---------------------- IMPORTING REQUIRED PACKAGES ----------------------
// File system operations (reading/writing files)
import fs from 'fs';
// Working with file and directory paths
import path from 'path';
// Making HTTP requests to the arXiv API
import axios from 'axios';
// Converting XML responses to JavaScript objects
import { Parser } from 'xml2js';
// For ES modules compatibility with __dirname
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  // Step 3: Parse the XML response into a JavaScript object
  const parser = new Parser();
  const result = await parser.parseStringPromise(xml);

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

// ---------------------- TOOL DEFINITIONS ----------------------

/**
 * Schema definition for OpenAI function calling
 * These schemas define the tools that the AI can use to interact with our application
 */
const tools = [
  {
      "type": "function",
      "name": "search_papers",
      "description": "Search for papers on arXiv based on a topic and store their information.",
      "parameters": {
          "type": "object",
          "properties": {
              "topic": {
                  "type": "string",
                  "description": "The topic to search for"
              }, 
              "max_results": {
                  "type": "integer",
                  "description": "Maximum number of results to retrieve",
                  "default": 5
              }
          },
          "required": ["topic"]
      }
  },
  {
      "type": "function",
      "name": "extract_info",
      "description": "Search for information about a specific paper across all topic directories.",
      "parameters": {
          "type": "object",
          "properties": {
              "paper_id": {
                  "type": "string",
                  "description": "The ID of the paper to look for"
              }
          },
          "required": ["paper_id"]
      }
  }
];

/**
 * Map of available tools/functions that can be executed by the chatbot
 * This maps the function names in the schema to the actual JavaScript functions
 */
const toolFunctionMap = {
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
  if (!toolFunctionMap[toolName]) return "Tool not found.";
  
  // Execute the tool with the provided arguments
  const result = await toolFunctionMap[toolName](...Object.values(toolArgs));
  
  // Convert object results to JSON strings for display
  return typeof result === "object" ? JSON.stringify(result, null, 2) : result;
}

// Export all necessary functions and objects
export {
  searchPapers,
  extractInfo,
  tools,
  toolFunctionMap,
  executeTool,
  PAPER_DIR
};
