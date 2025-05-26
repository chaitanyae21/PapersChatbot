// ========================================================================
// ARXIV PAPERS CHATBOT - A Node.js application to search and retrieve
// academic papers from the arXiv repository using their public API
// ========================================================================

// ---------------------- IMPORTING REQUIRED PACKAGES ----------------------
// Handling command-line input/output
import readline from 'readline';
// OpenAI API client for AI-powered chat functionality
import OpenAI from 'openai';
// Loading environment variables from .env file
import dotenv from 'dotenv';
// Import tools and functions from tools.js
import { tools, executeTool, PAPER_DIR } from './tools.js';

// Initialize environment variables
dotenv.config();

// Initialize OpenAI client with API key from environment variables
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ---------------------- USER INTERACTION ----------------------

/**
 * Create a readline interface for command-line interaction
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Array to store conversation history for context
 * This allows the AI to remember previous interactions
 */
const inputs = [];

/**
 * Prompts the user for input and processes their query using OpenAI
 */
function promptInput() {
  rl.question("\nQuery: ", async (query) => {
    // Exit the application if the user types "quit"
    if (query.toLowerCase() === "quit") return rl.close();
    
    // Add user query to conversation history
    inputs.push({ role: "user", content: query });

    // Send the conversation to OpenAI for processing
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: inputs,
      tools,
    }); 

    // If the AI responds with text, display it
    if(response.output_text){
      console.log(response.output_text);
    }
    // If the AI wants to call a function
    else if(response.output[0]){
      // Extract function call details
      const tool_call = response.output[0];
      const args = JSON.parse(tool_call.arguments);
      const toolName = tool_call.name;
      
      // Execute the requested function
      const result = await executeTool(toolName, args);

      // Add the function call and its result to conversation history
      inputs.push(tool_call);
      inputs.push({ 
        type: 'function_call_output',
        call_id: tool_call.call_id,
        output: result.toString()
      });

      // Send the function result back to OpenAI for processing
      const response2 = await client.responses.create({
        model: "gpt-4.1",
        input: inputs,
        tools,
        store: true,
      });
    
      // Display the AI's response after processing the function result
      console.log(response2.output_text)
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
console.log("  - Or try asking in natural language: \"Find me recent papers about machine learning\"");
promptInput();
