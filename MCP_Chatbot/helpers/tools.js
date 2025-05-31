/**
 * ArXiv Papers Chatbot - Tool definitions and functions
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Parser } from 'xml2js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PAPER_DIR } from '../../constants/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Searches for academic papers on arXiv based on a given topic
 * 
 * @param {string} topic - The search topic/keywords
 * @param {number} maxResults - Maximum number of results to return (default: 5)
 * @returns {Array} - List of paper IDs found in the search
 */
async function searchPapers(topic, maxResults = 5) {
  const apiUrl = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
    topic
  )}&start=0&max_results=${maxResults}&sortBy=relevance`;

  const response = await axios.get(apiUrl);
  const xml = response.data;

  const parser = new Parser();
  const result = await parser.parseStringPromise(xml);

  const entries = result.feed.entry || [];
  const paperIds = [];
  const papersInfo = {};

  entries.forEach((entry) => {
    const id = entry.id[0].split("/").pop();
    const title = entry.title[0].trim();
    const summary = entry.summary[0].trim();
    const published = entry.published[0].split("T")[0];
    const authors = entry.author.map((a) => a.name[0]);
    const pdfLink = (entry.link.find((l) => l.$.title === "pdf") || { $: {} }).$.href || "";

    paperIds.push(id);
    papersInfo[id] = {
      title,
      authors,
      summary,
      pdf_url: pdfLink,
      published,
    };
  });

  const topicDir = path.join(PAPER_DIR, topic.toLowerCase().replace(/\s+/g, "_"));
  fs.mkdirSync(topicDir, { recursive: true });
  
  const filePath = path.join(topicDir, "papers_info.json");
  fs.writeFileSync(filePath, JSON.stringify(papersInfo, null, 2));
  console.log(`Results are saved in: ${filePath}`);

  return paperIds;
}

/**
 * Retrieves detailed information about a specific paper by its ID
 * 
 * @param {string} paperId - The ID of the paper to look up
 * @returns {Object|string} - Paper details object or error message
 */
function extractInfo(paperId) {
  const dirs = fs.readdirSync(PAPER_DIR);

  for (const dir of dirs) {
    const filePath = path.join(PAPER_DIR, dir, "papers_info.json");
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath));
      if (data[paperId]) {
        return data[paperId];
      }
    }
  }
  return `There's no saved information related to paper ${paperId}.`;
}
  
/**
 * Schema definition for OpenAI function calling
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

// Map of available tools to their implementations
const toolFunctionMap = {
  search_papers: searchPapers,
  extract_info: extractInfo,
};

/**
 * Executes a tool with the provided arguments
 */
async function executeTool(toolName, toolArgs) {
  if (!toolFunctionMap[toolName]) return "Tool not found.";
  
  const result = await toolFunctionMap[toolName](...Object.values(toolArgs));
  
  return typeof result === "object" ? JSON.stringify(result, null, 2) : result;
}

export {
  searchPapers,
  extractInfo,
  tools,
  toolFunctionMap,
  executeTool
};
