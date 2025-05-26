# ArXiv Papers Chatbot

A Node.js application that allows users to search and retrieve academic papers from the arXiv repository using their public API.

## Project Overview

This application provides a simple command-line interface to search for academic papers on specific topics and retrieve detailed information about papers using their arXiv IDs. The application stores search results locally for quick access to previously searched papers.

## Features

- **Search for Papers**: Search the arXiv repository for papers on specific topics
- **Retrieve Paper Details**: Get detailed information about papers using their arXiv ID
- **Local Storage**: Save search results locally for quick access
- **Command-line Interface**: Simple text-based interface for interacting with the application

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the application:
   ```
   node index.js
   ```

## Dependencies

- **axios**: For making HTTP requests to the arXiv API
- **xml2js**: For parsing XML responses from the arXiv API
- **dotenv**: For loading environment variables from a .env file

## Usage

The application supports the following commands:

1. **Search for papers**:
   ```
   Search for [number] papers on "[topic]"
   ```
   Example: `Search for 5 papers on "quantum computing"`

2. **Get paper information**:
   ```
   Info on paper [paper_id]
   ```
   Example: `Info on paper 2310.15370v1`

3. **Exit the application**:
   ```
   quit
   ```

## Project Structure

- **index.js**: Main application file containing the core functionality
- **papers/**: Directory where paper information is stored
  - **[topic]/**: Subdirectories for each search topic
    - **papers_info.json**: JSON file containing paper details for a specific topic

## How It Works

1. When you search for papers, the application:
   - Makes a request to the arXiv API with your search parameters
   - Parses the XML response
   - Extracts relevant paper information (title, authors, summary, etc.)
   - Saves this information to a JSON file in a topic-specific directory
   - Returns a list of paper IDs

2. When you request information about a specific paper:
   - The application searches through all stored JSON files
   - If the paper ID is found, it returns the detailed information
   - If not found, it returns an error message

## API Integration

The application uses the arXiv API to search for papers. The API endpoint used is:
```
http://export.arxiv.org/api/query
```

Search parameters include:
- `search_query`: The search topic/keywords
- `start`: Starting index (default: 0)
- `max_results`: Maximum number of results to return
- `sortBy`: Sort order (default: relevance)

## Future Enhancements

Potential improvements for the application:

1. Add support for more complex search queries (by author, date range, etc.)
2. Implement paper download functionality
3. Add a web-based interface
4. Integrate with other academic paper repositories
5. Add citation generation in various formats
6. Implement natural language processing for more flexible query handling

## License

ISC

## Author

This project was created as a demonstration of integrating with the arXiv API using Node.js.
