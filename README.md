# ArXiv Papers Chatbot

A Node.js application that allows users to search and retrieve academic papers from the arXiv repository using their public API, enhanced with AI-powered natural language understanding and Model Context Protocol (MCP) integration.

## Project Overview

This application provides a command-line interface to search for academic papers on specific topics and retrieve detailed information about papers using their arXiv IDs. The application stores search results locally for quick access to previously searched papers and uses OpenAI's API to enable natural language interactions. It also implements the Model Context Protocol (MCP) to extend AI capabilities.

## Features

- **AI-Powered Chat Interface**: Interact with the application using natural language
- **Search for Papers**: Search the arXiv repository for papers on specific topics
- **Retrieve Paper Details**: Get detailed information about papers using their arXiv ID
- **Local Storage**: Save search results locally for quick access
- **Command-line Interface**: Simple text-based interface for interacting with the application
- **Conversation Context**: The AI remembers previous interactions for more coherent conversations
- **MCP Integration**: Extends AI capabilities through the Model Context Protocol

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
4. Run the application:
   ```
   node MCP_Chatbot/index.js
   ```
5. To use MCP functionality, run the MCP server in a separate terminal:
   ```
   node MCP_Server/server.js
   ```

## Dependencies

- **axios**: For making HTTP requests to the arXiv API
- **xml2js**: For parsing XML responses from the arXiv API
- **dotenv**: For loading environment variables from a .env file
- **openai**: For AI-powered natural language processing
- **@modelcontextprotocol/sdk**: For implementing the Model Context Protocol
- **zod**: For schema validation in MCP tools

## Usage

The application supports natural language queries as well as specific command formats:

1. **Natural language queries**:
   ```
   Find me 5 papers about quantum computing
   What papers do you have on machine learning?
   Tell me about paper 2310.15370v1
   ```

2. **Traditional command format**:
   ```
   Search for [number] papers on "[topic]"
   Info on paper [paper_id]
   ```

3. **Exit the application**:
   ```
   quit
   ```

## Project Structure

The project has been reorganized into a more modular structure:

```
PapersChatbot/
├── .env                      # Environment variables file (contains OpenAI API key)
├── MCP_Chatbot/              # Main chatbot application
│   ├── index.js              # Main application entry point
│   ├── constants/            # Application constants and configurations
│   ├── helpers/              # Helper functions for the chatbot
│   ├── config/               # Configuration files including MCP server settings
│   │   └── mcpservers.json   # MCP server configuration
│   └── dist/                 # Compiled/distribution files
│
├── MCP_Server/               # MCP server implementation
│   ├── server.js             # MCP server implementation (renamed from mcp_tools.js)
│   └── papers/               # Directory where paper information is stored
│       └── [topic]/          # Subdirectories for each search topic
│           └── papers_info.json  # JSON file containing paper details
│
└── node_modules/             # Node.js dependencies
```

### Key Components:

- **MCP_Chatbot**: Contains the main chatbot application logic, user interface, and configuration
- **MCP_Server**: Contains the Model Context Protocol server implementation and paper storage
- **.env**: Environment variables file (contains OpenAI API key)

## How It Works

1. **AI-Powered Interaction**:
   - User queries are sent to the OpenAI API
   - The API determines whether to search for papers or retrieve paper information
   - The application maintains conversation context for more natural interactions

2. **Paper Search Process**:
   - Makes a request to the arXiv API with search parameters
   - Parses the XML response
   - Extracts relevant paper information (title, authors, summary, etc.)
   - Saves this information to a JSON file in a topic-specific directory
   - Returns a list of paper IDs

3. **Paper Information Retrieval**:
   - Searches through all stored JSON files
   - If the paper ID is found, it returns the detailed information
   - If not found, it returns an error message

4. **MCP Integration**:
   - The Model Context Protocol server runs separately from the main application
   - Provides AI tools for paper searching and information retrieval
   - Communicates with AI assistants through a standardized protocol
   - Enables more powerful and flexible AI interactions

## Model Context Protocol (MCP)

The application implements the Model Context Protocol (MCP), which is an open protocol that standardizes how applications provide context and tools to AI models. Key aspects of the MCP implementation include:

1. **MCP Server**: 
   - Runs as a separate process (`node MCP_Server/server.js`)
   - Registers tools that can be called by AI assistants
   - Handles communication with AI models through a standardized protocol

2. **MCP Tools**:
   - **searchPapers**: Searches for papers on arXiv based on a topic
   - **extractInfo**: Retrieves detailed information about a specific paper

3. **MCP Resources**:
   - **topics**: Lists all available paper topics
   - **topic-papers**: Provides detailed information about papers for a specific topic

4. **MCP Prompts**:
   - **generate-search-prompt**: Creates a structured prompt for paper searching and analysis

5. **Benefits of MCP**:
   - Standardized way to extend AI capabilities
   - Enables AI to interact with external systems and data
   - Provides a consistent interface for tool usage
   - Allows for more complex and powerful AI interactions

6. **Implementation Details**:
   - Uses the `@modelcontextprotocol/sdk` package
   - Implements schema validation with Zod
   - Returns structured data as JavaScript objects
   - Communicates through standard I/O streams

## API Integration

### arXiv API
The application uses the arXiv API to search for papers. The API endpoint used is:
```
http://export.arxiv.org/api/query
```

Search parameters include:
- `search_query`: The search topic/keywords
- `start`: Starting index (default: 0)
- `max_results`: Maximum number of results to return
- `sortBy`: Sort order (default: relevance)

### OpenAI API
The application uses OpenAI's API for natural language processing:
- Processes user queries to understand intent
- Uses function calling to execute appropriate actions
- Maintains conversation context for coherent multi-turn interactions

## Future Enhancements

Potential improvements for the application:

1. Add support for more complex search queries (by author, date range, etc.)
2. Implement paper download functionality
3. Add a web-based interface
4. Integrate with other academic paper repositories
5. Add citation generation in various formats
6. Enhance AI capabilities with more specialized knowledge about academic papers
7. Add user authentication and personalized paper recommendations
8. Expand MCP tools to support more advanced paper analysis features

## License

ISC

## Author

This project was created as a demonstration of integrating with the arXiv API using Node.js and enhancing it with AI capabilities through the Model Context Protocol.
