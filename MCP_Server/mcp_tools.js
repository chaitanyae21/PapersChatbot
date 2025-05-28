/**
 * MCP Server implementation for the ArXiv Papers Chatbot
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Parser } from 'xml2js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PAPER_DIR } from '../MCP_Chatbot/constants/constants.js';
import { z } from 'zod';

// Initialize MCP server
const server = new McpServer({
  name: "Paper Research MCP",
  version: "1.0.0"
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Searches for academic papers on arXiv based on a given topic
 */
server.tool("searchPapers", { topic: z.string(), maxResults: z.number() }, async ({topic, maxResults = 5}) => {
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

  return { paperIds: paperIds };
});

/**
 * Retrieves detailed information about a specific paper by its ID
 */
server.tool("extractInfo", { paperId: z.string() }, ({ paperId }) => {
  const dirs = fs.readdirSync(PAPER_DIR);

  for (const dir of dirs) {
    const filePath = path.join(PAPER_DIR, dir, "papers_info.json");
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath));
      if (data[paperId]) {
        return { paper: data[paperId] };
      }
    }
  }
  return { error: `There's no saved information related to paper ${paperId}.` };
});


/**
 * MCP Resource implementations
 */

// List available topics
server.resource(
  "topics",
  "papers://folders",
  async () => {
    const topics = fs.readdirSync(PAPER_DIR)
      .filter(f => fs.existsSync(path.join(PAPER_DIR, f, "papers_info.json")));

    const markdown = [
      "# Available Topics\n",
      ...topics.map(t => `- ${t}`),
      "\nUse @<topic> to read the papers in that folder."
    ].join("\n");

    return { contents: [{ uri: "papers://folders", text: markdown }] };
  }
);

// Detailed paper info for a topic
server.resource(
  "topic-papers",
  new ResourceTemplate("papers://{topic}", { list: undefined }),
  async (_uri, { topic }) => {
    const file = path.join(PAPER_DIR, topic, "papers_info.json");
    if (!fs.existsSync(file)) {
      return { contents: [{ uri: _uri.href, text: `# No papers for ${topic}` }] };
    }
    const data = JSON.parse(fs.readFileSync(file, "utf8"));

    const md = [
      `# Papers on ${topic}\n`,
      `Total papers: ${Object.keys(data).length}\n\n`,
      ...Object.entries(data).map(([id, p]: any) => (
        `## ${p.title}\n` +
        `- **ID**: ${id}\n` +
        `- **Authors**: ${p.authors.join(', ')}\n` +
        `- **Published**: ${p.published}\n` +
        `- **PDF**: [link](${p.pdf_url})\n\n` +
        `### Summary\n${p.summary.slice(0,500)}…\n\n---\n`)),
    ].join("");

    return { contents: [{ uri: _uri.href, text: md }] };
  }
);


/**
 * MCP Prompt implementation for generating search prompts
 */
server.prompt(
  "generate-search-prompt",
  { topic: z.string(), numPapers: z.number().optional().default(5) },
  ({ topic, numPapers }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Search for ${numPapers} academic papers about '${topic}' using the search_papers tool. Follow these instructions:
    1. First, search for papers using search_papers(topic='${topic}', max_results=${numPapers})
    2. For each paper found, extract and organize the following information:
       - Paper title
       - Authors
       - Publication date
       - Brief summary of the key findings
       - Main contributions or innovations
       - Methodologies used
       - Relevance to the topic '${topic}'
    
    3. Provide a comprehensive summary that includes:
       - Overview of the current state of research in '${topic}'
       - Common themes and trends across the papers
       - Key research gaps or areas for future investigation
       - Most impactful or influential papers in this area
    
    4. Organize your findings in a clear, structured format with headings and bullet points for easy readability.
    
    Please present both detailed information about each paper and a high-level synthesis of the research landscape in ${topic}.`,
      }
    }]
  })
);

// Initialize and connect the MCP server
const transport = new StdioServerTransport();
await server.connect(transport);
