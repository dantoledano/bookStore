const express = require("express");
const bodyParser = require("body-parser");
const winston = require("winston");
const path = require("path");

const app = express();
const PORT = 8574;

app.use(bodyParser.json());

let books = [];
let currentId = 1;
let requestCounter = 0;

const validGenres = [
  "SCI_FI",
  "NOVEL",
  "HISTORY",
  "MANGA",
  "ROMANCE",
  "PROFESSIONAL",
];

// Ensure logs directory exists
const logsDir = path.join(__dirname, "logs");
const fs = require("fs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create loggers
const requestLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss.SSS" }),
    winston.format.printf(({ timestamp, level, message, requestId }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message} | request #${requestId}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logsDir, "requests.log"),
    }),
  ],
});

const booksLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss.SSS" }),
    winston.format.printf(({ timestamp, level, message, requestId }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message} | request #${requestId}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, "books.log") }),
  ],
});

// Middleware to log each request
app.use((req, res, next) => {
  requestCounter++;
  const requestId = requestCounter;
  const startTime = new Date();
  const logMessage = `Incoming request | #${requestId} | resource: ${
    req.path
  } | HTTP Verb ${req.method.toUpperCase()}`;

  requestLogger.info(logMessage, { requestId });

  res.on("finish", () => {
    const duration = new Date() - startTime;
    requestLogger.debug(`request duration: ${duration}ms`, { requestId });
  });

  next();
});

// Health check endpoint
app.get("/books/health", (req, res) => {
  res.status(200).send("OK");
});

// Create new book
app.post("/book", (req, res) => {
  const { title, author, year, price, genres } = req.body;

  const existingBook = books.find(
    (book) => book.title.toLowerCase() === title.toLowerCase()
  );
  if (existingBook) {
    const errorMessage = `Error: Book with the title [${title}] already exists in the system`;
    booksLogger.error(errorMessage, { requestId: requestCounter });
    return res.status(409).json({ errorMessage });
  }
  if (year < 1940 || year > 2100) {
    const errorMessage = `Error: Can’t create new Book that its year [${year}] is not in the accepted range [1940 -> 2100]`;
    booksLogger.error(errorMessage, { requestId: requestCounter });
    return res.status(409).json({ errorMessage });
  }
  if (price <= 0) {
    const errorMessage = `Error: Can’t create new Book with negative price`;
    booksLogger.error(errorMessage, { requestId: requestCounter });
    return res.status(409).json({ errorMessage });
  }

  const newBook = {
    id: currentId++,
    title,
    author,
    year,
    price,
    genres,
  };

  booksLogger.info(`Creating new Book with Title [${title}]`, {
    requestId: requestCounter,
  });
  booksLogger.debug(
    `Currently there are ${books.length} Books in the system. New Book will be assigned with id ${newBook.id}`,
    { requestId: requestCounter }
  );

  books.push(newBook);
  res.status(200).json({ result: newBook.id });
});

// Filter books utility
function filterBooks(query) {
  let {
    author,
    "price-bigger-than": priceBiggerThan,
    "price-less-than": priceLessThan,
    "year-bigger-than": yearBiggerThan,
    "year-less-than": yearLessThan,
    genres,
  } = query;
  let filteredBooks = books;

  if (genres) {
    const genreList = genres.split(",");
    if (!genreList.every((genre) => validGenres.includes(genre))) {
      throw new Error("Invalid genre value");
    }
    filteredBooks = filteredBooks.filter((book) =>
      book.genres.some((genre) => genreList.includes(genre))
    );
  }

  if (author) {
    filteredBooks = filteredBooks.filter(
      (book) => book.author.toLowerCase() === author.toLowerCase()
    );
  }
  if (priceBiggerThan) {
    filteredBooks = filteredBooks.filter(
      (book) => book.price >= parseInt(priceBiggerThan)
    );
  }
  if (priceLessThan) {
    filteredBooks = filteredBooks.filter(
      (book) => book.price <= parseInt(priceLessThan)
    );
  }
  if (yearBiggerThan) {
    filteredBooks = filteredBooks.filter(
      (book) => book.year >= parseInt(yearBiggerThan)
    );
  }
  if (yearLessThan) {
    filteredBooks = filteredBooks.filter(
      (book) => book.year <= parseInt(yearLessThan)
    );
  }

  return filteredBooks;
}

// Get books count
app.get("/books/total", (req, res) => {
  try {
    const filteredBooks = filterBooks(req.query);
    booksLogger.info(
      `Total Books found for requested filters is ${filteredBooks.length}`,
      { requestId: requestCounter }
    );
    res.status(200).json({ result: filteredBooks.length });
  } catch (error) {
    res.status(400).json({ errorMessage: error.message });
  }
});

// Get books data
app.get("/books", (req, res) => {
  try {
    let filteredBooks = filterBooks(req.query);
    filteredBooks.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
    const result = filteredBooks.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      price: book.price,
      year: book.year,
      genres: book.genres,
    }));
    booksLogger.info(
      `Total Books found for requested filters is ${filteredBooks.length}`,
      { requestId: requestCounter }
    );
    res.status(200).json({ result });
  } catch (error) {
    res.status(400).json({ errorMessage: error.message });
  }
});

// Get single book data
app.get("/book", (req, res) => {
  const { id } = req.query;
  const book = books.find((book) => book.id == id);
  if (!book) {
    const errorMessage = `Error: no such Book with id ${id}`;
    booksLogger.error(errorMessage, { requestId: requestCounter });
    return res.status(404).json({ errorMessage });
  }
  booksLogger.debug(`Fetching book id ${id} details`, {
    requestId: requestCounter,
  });
  res.status(200).json({ result: book });
});

// Update book price
app.put("/book", (req, res) => {
  const { id, price } = req.query;
  const book = books.find((book) => book.id == id);
  if (!book) {
    const errorMessage = `Error: no such Book with id ${id}`;
    booksLogger.error(errorMessage, { requestId: requestCounter });
    return res.status(404).json({ errorMessage });
  }
  if (price <= 0) {
    const errorMessage = `Error: price update for book [${id}] must be a positive integer`;
    booksLogger.error(errorMessage, { requestId: requestCounter });
    return res.status(409).json({ errorMessage });
  }
  const oldPrice = book.price;
  book.price = parseInt(price);
  booksLogger.info(`Update Book id [${id}] price to ${price}`, {
    requestId: requestCounter,
  });
  booksLogger.debug(
    `Book [${book.title}] price change: ${oldPrice} --> ${price}`,
    { requestId: requestCounter }
  );
  res.status(200).json({ result: oldPrice });
});

// Delete book
app.delete("/book", (req, res) => {
  const { id } = req.query;
  const bookIndex = books.findIndex((book) => book.id == id);
  if (bookIndex === -1) {
    const errorMessage = `Error: no such Book with id ${id}`;
    booksLogger.error(errorMessage, { requestId: requestCounter });
    return res.status(404).json({ errorMessage });
  }
  const [deletedBook] = books.splice(bookIndex, 1);
  booksLogger.info(`Removing book [${deletedBook.title}]`, {
    requestId: requestCounter,
  });
  booksLogger.debug(
    `After removing book [${deletedBook.title}] id: [${id}] there are ${books.length} books in the system`,
    { requestId: requestCounter }
  );
  res.status(200).json({ result: books.length });
});

// Get logger level
app.get("/logs/level", (req, res) => {
  const { "logger-name": loggerName } = req.query;
  let logger;

  if (loggerName === "request-logger") {
    logger = requestLogger;
  } else if (loggerName === "books-logger") {
    logger = booksLogger;
  } else {
    return res.status(400).send("Error: Invalid logger name");
  }

  res.status(200).send(logger.level.toUpperCase());
});

// Set logger level
app.put("/logs/level", (req, res) => {
  const { "logger-name": loggerName, "logger-level": loggerLevel } = req.query;
  let logger;
  if (loggerName === "request-logger") {
    logger = requestLogger;
  } else if (loggerName === "books-logger") {
    logger = booksLogger;
  } else {
    return res.status(400).send("Error: Invalid logger name");
  }

  const validLevels = ["error", "warn", "info", "http", "debug"];
  if (!validLevels.includes(loggerLevel.toLowerCase())) {
    return res.status(400).send("Error: Invalid logger level");
  }

  logger.level = loggerLevel.toLowerCase();
  res.status(200).send(logger.level.toUpperCase());
});

// Error-handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (res.statusCode === 400) {
    res.status(400).json({ errorMessage: err.message });
  } else {
    const logMessage = `Error: ${err.message}`;
    const requestId = requestCounter;

    // Log to the appropriate logger based on the request path
    if (req.path.startsWith("/book")) {
      booksLogger.error(logMessage, { requestId });
    } else {
      requestLogger.error(logMessage, { requestId });
    }

    res.status(500).json({ errorMessage: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
