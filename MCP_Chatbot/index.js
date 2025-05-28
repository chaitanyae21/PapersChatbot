// ========================================================================
// ARXIV PAPERS CHATBOT - A Node.js application to search and retrieve
// academic papers from the arXiv repository using their public API
// ========================================================================

// ---------------------- IMPORTING REQUIRED PACKAGES ----------------------
// Handling command-line input/output
import readline from 'readline';
import path from 'path';
import fs from 'fs';
// OpenAI API client for AI-powered chat functionality
import OpenAI from 'openai';
// Loading environment variables from .env file
import dotenv from 'dotenv';
// Import tools and functions from tools.js
// import { tools } from './tools.js';
import { PAPER_DIR } from './constants/constants.js';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Initialize environment variables
dotenv.config();

let tools;

// Initialize OpenAI client with API key from environment variables
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize MCP Client
const mcpClient = new Client({
  name: 'MCP Client',
  version: '1.0.0'
});

async function connectToServers(){
  const dirname = path.dirname(new URL(import.meta.url).pathname);
  const mcpPath = path.join(dirname, "mcpservers.json");
  
  try {
    const data = await fs.readFileSync(mcpPath, 'utf8');
    const mcpServers = Object.values(JSON.parse(data).mcpServers);
    for (const server of mcpServers) {
      await connectToServer(server);
    }  
    tools = await listTools(); 
  } catch (err) {
    console.error('Error reading/parsing file:', err);
  }  
}

async function connectToServer(serverData){
  const transport = new StdioClientTransport(serverData);
  
  //Initialize connection with MCP server
  await mcpClient.connect(transport);
}

/** 
 * Below is section of code we can add if we want to use tools
 * from the MCP server instead of the local ones.
 * Open AI only has documentation for remote MCPs, but it does not have documentation for local mcp connections. 
 * So we are fetching MCP tools and converting them to regular function Calls
 */

async function listTools() {
  const tools_Obj = await mcpClient.listTools();
  const mcp_tools = tools_Obj.tools;
  tools = mcp_tools.map(tool=>{
    return {
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }
  });
  console.log(tools);
  return tools;
}


// ---------------------- USER INTERACTION ----------------------

async function processQuery(query){
  /**
   * Array to store conversation history for context
   * This allows the AI to remember previous interactions
   */
  const inputs = [];
  let continueProcessing = true;

  // Add user query to conversation history
  inputs.push({ role: "user", content: query });

  // Send the conversation to OpenAI for processing
  let response = await client.responses.create({
    model: "gpt-4.1",
    input: inputs,
    tools,
  });

  while(continueProcessing){
    // If the AI responds with text, display it
    if(response.output[0].type == "message"){
      console.log(response.output_text);
      continueProcessing = false;
    }
    // If the AI wants to call a function
    else if(response.output[0].type == "function_call"){
      // Extract function call details
      const tool_call = response.output[0];
      const args = JSON.parse(tool_call.arguments);
      const toolName = tool_call.name;
      
      // Execute the requested function
      const result = await mcpClient.callTool({ name: toolName, arguments: args });
      console.log(result);

      // Add the function call and its result to conversation history
      inputs.push(tool_call);
      inputs.push({ 
        type: 'function_call_output',
        call_id: tool_call.call_id,
        output: result.toString()
      });

      // Send the function result back to OpenAI for processing
      response = await client.responses.create({
        model: "gpt-4.1",
        input: inputs,
        tools,
        store: true,
      });
    }
  }
}

const chatLoop = () => {
  /**
   * Create a readline interface for command-line interaction
   */
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  /**
   * Prompts the user for input and processes their query using OpenAI
   */
  function promptInput() {
    rl.question("\nQuery: ", async (query) => {
      // Exit the application if the user types "quit"
      if (query.toLowerCase() === "quit") {
        rl.close();
        process.exit();
      }
      else{
        await processQuery(query);

        // Continue prompting for input (recursive call)
        promptInput();
      }
    });
  }
  promptInput();
}



// Start the application
await connectToServers();
console.log("Type your queries or 'quit' to exit.");
console.log("Example commands:");
console.log("  - Search for 3 papers on \"quantum computing\"");
console.log("  - Info on paper 2304.12345");
console.log("  - Or try asking in natural language: \"Find me recent papers about machine learning\"");
await chatLoop();
