/**
 * ArXiv Papers Chatbot - Search and retrieve academic papers from arXiv
 */

import readline from 'readline';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Initialize environment variables
dotenv.config();

let tools;
let prompts;
let resources;

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
  const mcpPath = path.join(dirname, "config", "mcpservers.json");
  console.log(mcpPath);
  try {
    const data = await fs.readFileSync(mcpPath, 'utf8');
    const mcpServers = Object.values(JSON.parse(data).mcpServers);
    for (const server of mcpServers) {
      await connectToServer(server);
    }  
    tools = await listTools();
    // prompts = await fetchPrompts(); //commenting these since the current connected mcp server from config file does not provide any resources or prompts
    // resources = await fetchResources();
  } catch (err) {
    console.error('Error reading/parsing file:', err);
  }  
}

async function connectToServer(serverData){
  const transport = new StdioClientTransport(serverData);
  await mcpClient.connect(transport);
}

/**
 * Fetches MCP tools and converts them to OpenAI function call format
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
  return tools;
}

/**
 * Fetches MCP prompts
 */
async function fetchPrompts() {
  const promptsResponse = await mcpClient.listPrompts();
  console.log(promptsResponse);
  prompts = promptsResponse.prompts.map(prompt=>{
    return {
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments
    }
  });
  console.log(prompts);
  return prompts;
}

function listPrompts(){
  console.log("Available prompts:");
  if(!prompts) {
    console.log("No prompts found.");
    return;
  }
  prompts.forEach(prompt=>{
    console.log(`  ${prompt.name}: ${prompt.description}`);
  });
}

function getPrompt(promptName, args){
  const prompt = prompts.find(prompt => prompt.name == promptName);
  if(prompt == null){
    console.log(`Prompt ${promptName} not found.`);
    return null;
  }
  return {
    name: prompt.name,
    description: prompt.description,
    arguments: args
  }
}

function executePrompt(promptName, args){
  const query = getPrompt(promptName,args);
  if(query == null) return;
  processQuery(query);
}

/**
 * Fetches MCP resources
 */
async function fetchResources() {
  const resourcesResponse = await mcpClient.listResources();
  console.log(resourcesResponse);
  resources = resourcesResponse.resources.map(resource=>{
    return {
      resource_uri: resource.resource_uri.toString()
    }
  });
  console.log(resources);
  return resources;
}

function listResources(){
  console.log("Available resources:");
  resources.forEach(resource=>{
    console.log(`  ${resource.resource_uri}`);
  });
}


async function processQuery(query){
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
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function promptInput() {
    rl.question("\nQuery: ", async (query) => {
      // Exit the application if the user types "quit"
      if (query.toLowerCase() === "quit") {
        rl.close();
        process.exit();
      }
      else if(query.toLowerCase().startsWith("/prompts")){
        listPrompts()
        promptInput();
      }
      else if(query.toLowerCase().startsWith("/resources")){
        listResources()
        promptInput();
      }
      else{
        await processQuery(query);
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
