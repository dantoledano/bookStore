const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8574;

app.use(bodyParser.json());

let books = [];
let currentId = 1;

app.get('/books/health', (req, res) => {// Health check endpoint
    res.status(200).send('OK');
});


app.post('/book', (req, res) => {// Create new book
    const { title, author, year, price, genres } = req.body;
    const existingBook = books.find(book => book.title.toLowerCase() === title.toLowerCase());
    if (existingBook) {// Input checks
        return res.status(409).json({ errorMessage: `Error: Book with the title [${title}] already exists in the system` });
    }
    if (year < 1940 || year > 2100) {
        return res.status(409).json({ errorMessage: `Error: Can’t create new Book that its year [${year}] is not in the accepted range [1940 -> 2100]` });
    }
    if (price <= 0) {
        return res.status(409).json({ errorMessage: `Error: Can’t create new Book with negative price` });
    }

    const newBook = {
        id: currentId++,
        title,
        author,
        year,
        price,
        genres
    };
    books.push(newBook);
    res.status(200).json({ result: newBook.id }); 
});


app.get('/books/total', (req, res) => {// Get books count
    const { author, 'price-bigger-than': priceBiggerThan, 'price-less-than': priceLessThan, 'year-bigger-than': yearBiggerThan, 'year-less-than': yearLessThan, genres } = req.query;
    let filteredBooks = books;
    const validGenres = ["SCI_FI", "NOVEL", "HISTORY", "MANGA", "ROMANCE", "PROFESSIONAL"];
    if (genres) {
        const genreList = genres.split(',');
        if (!genreList.every(genre => validGenres.includes(genre))) {
            return res.status(400).json({ errorMessage: "Invalid genre value" }); //Adding a meassage is not mandatory
        }
        filteredBooks = filteredBooks.filter(book => book.genres.some(genre => genreList.includes(genre)));
    }

    if (author) {
        filteredBooks = filteredBooks.filter(book => book.author.toLowerCase() === author.toLowerCase());
    }
    if (priceBiggerThan) {
        filteredBooks = filteredBooks.filter(book => book.price >= parseInt(priceBiggerThan));
    }
    if (priceLessThan) {
        filteredBooks = filteredBooks.filter(book => book.price <= parseInt(priceLessThan));
    }
    if (yearBiggerThan) {
        filteredBooks = filteredBooks.filter(book => book.year >= parseInt(yearBiggerThan));
    }
    if (yearLessThan) {
        filteredBooks = filteredBooks.filter(book => book.year <= parseInt(yearLessThan));
    }

    res.status(200).json({ result: filteredBooks.length });
});


app.get('/books', (req, res) => {// Get books data
    const { author, 'price-bigger-than': priceBiggerThan, 'price-less-than': priceLessThan, 'year-bigger-than': yearBiggerThan, 'year-less-than': yearLessThan, genres } = req.query;
    let filteredBooks = books;
    const validGenres = ["SCI_FI", "NOVEL", "HISTORY", "MANGA", "ROMANCE", "PROFESSIONAL"];

    if (genres) {
        const genreList = genres.split(',');
        if (!genreList.every(genre => validGenres.includes(genre))) {
            return res.status(400).json({ errorMessage: "Error: Invalid genre value" });
        }
        filteredBooks = filteredBooks.filter(book => book.genres.some(genre => genreList.includes(genre)));
    }
    if (author) {
        filteredBooks = filteredBooks.filter(book => book.author.toLowerCase() === author.toLowerCase());
    }
    if (priceBiggerThan) {
        filteredBooks = filteredBooks.filter(book => book.price >= parseInt(priceBiggerThan));
    }
    if (priceLessThan) {
        filteredBooks = filteredBooks.filter(book => book.price <= parseInt(priceLessThan));
    }
    if (yearBiggerThan) {
        filteredBooks = filteredBooks.filter(book => book.year >= parseInt(yearBiggerThan));
    }
    if (yearLessThan) {
        filteredBooks = filteredBooks.filter(book => book.year <= parseInt(yearLessThan));
    }

    filteredBooks.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
    const result = filteredBooks.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        price: book.price,
        year: book.year,
        genres: book.genres
    }));

    res.status(200).json({result});
});

// Get single book data
app.get('/book', (req, res) => {
    const { id } = req.query;
    const book = books.find(book => book.id == id);
    if (!book) {
        return res.status(404).json({ errorMessage: `Error: no such Book with id ${id}` });
    }
    res.status(200).json({ result: book });
});

// Update book price
app.put('/book', (req, res) => {
    const { id, price } = req.query;
    const book = books.find(book => book.id == id);
    if (!book) {
        return res.status(404).json({ errorMessage: `Error: no such Book with id ${id}` });
    }
    if (price <= 0) {
        return res.status(409).json({ errorMessage: `Error: price update for book [${id}] must be positive integer` });
    }
    const oldPrice = book.price;
    book.price = parseInt(price);
    res.status(200).json({ result: oldPrice });
});

// Delete book
app.delete('/book', (req, res) => {
    const { id } = req.query;
    const bookIndex = books.findIndex(book => book.id == id);
    if (bookIndex === -1) {
        return res.status(404).json({ errorMessage: `Error: no such Book with id ${id}` });
    }
    books.splice(bookIndex, 1);
    res.status(200).json({ result: books.length });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});