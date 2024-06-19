# Book Management API

A simple Express.js API for managing books, including creation, retrieval, updating, and deletion with filtering and sorting capabilities.
The API also includes logging middleware to log requests and book-related operations, ensuring error details are recorded for better traceability.

## Features

- **Health Check**: `GET /books/health`
- **Create Book**: `POST /book`
- **Get All Books**: `GET /books`
- **Get Book Details**: `GET /book`
- **Update Book Price**: `PUT /book`
- **Delete Book**: `DELETE /book`
- **Get Books Count**: `GET /books/total`

## Getting Started

1. **Install dependencies**:
    ```bash
    npm install
    ```
2. **Run the server**:
    ```bash
    node index.js
    ```
   The server runs on port `8574`.

## Valid Genres

- `SCI_FI`
- `NOVEL`
- `HISTORY`
- `MANGA`
- `ROMANCE`
- `PROFESSIONAL`

## License

MIT License

