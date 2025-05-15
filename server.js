// --- Import Required Modules ---
const express = require('express'); // Imports the Express framework
const sqlite3 = require('sqlite3').verbose(); // Imports the SQLite3 library, .verbose() gives more detailed error messages
const path = require('path'); // Imports Node.js's built-in 'path' module for working with file and directory paths

// --- Initialize Express App ---
const app = express(); // Creates an Express application
const port = process.env.PORT; // Defines the port number our server will listen on (you can change this if 3000 is in use)

// --- Database Setup ---
// Construct the absolute path to the database file. __dirname is a Node.js global variable that gives the directory name of the current module.
const dbPath = path.resolve('/inputdata', 'database.db');
// Connect to (or create if it doesn't exist) the SQLite database file.
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        // If there's an error opening the database, log it to the console.
        console.error("Error opening database", err.message);
    } else {
        // If connection is successful, log it.
        console.log("Connected to the SQLite database.");
        // SQL command to create a table named 'responses' if it doesn't already exist.
        // - id: An integer that's the primary key and auto-increments.
        // - name: Text, cannot be null (must be provided).
        // - selected_dates: Text, cannot be null (stores dates as a comma-separated string).
        // - submitted_at: Datetime, defaults to the current timestamp when a row is inserted.
        db.run(`CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            selected_dates TEXT NOT NULL,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                // If there's an error creating the table, log it.
                console.error("Error creating table", err.message);
            } else {
                // If table creation is successful or table already exists, log it.
                console.log("Table 'responses' is ready.");
            }
        });
    }
});

// --- Middleware ---
// express.json() is middleware to parse incoming requests with JSON payloads (e.g., when our frontend sends data).
app.use(express.json());
// express.static() is middleware to serve static files (like HTML, CSS, images, client-side JS).
// path.join(__dirname, 'public') creates a path to our 'public' folder.
// Now, any file in the 'public' folder can be accessed directly via its name (e.g., /style.css).
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes (Endpoints) ---

// POST: Define an endpoint at '/api/submit' to handle new response submissions.
// This will be called when a user submits the form.
app.post('/api/submit', (req, res) => {
    // Destructure 'name' and 'dates' from the request body (the JSON data sent by the frontend).
    const { name, dates } = req.body;

    // Basic validation: Check if name and dates are provided and dates is a non-empty array.
    if (!name || !dates || !Array.isArray(dates) || dates.length === 0) {
        return res.status(400).json({ message: 'Name and at least one date are required.' });
    }

    // Convert the array of dates into a single comma-separated string for storage in the database.
    const datesString = dates.join(',');

    // SQL query to insert a new row into the 'responses' table.
    // The '?' are placeholders that will be replaced by the values in the array [name, datesString].
    const sql = `INSERT INTO responses (name, selected_dates) VALUES (?, ?)`;
    db.run(sql, [name, datesString], function(err) { // 'function(err)' is used here to access 'this.lastID'
        if (err) {
            console.error("Error inserting data", err.message);
            return res.status(500).json({ message: 'Failed to save response.' });
        }
        // If insertion is successful, send back a 201 (Created) status and a success message.
        // this.lastID gives the ID of the newly inserted row.
        res.status(201).json({ message: 'Response saved successfully!', id: this.lastID });
    });
});

// GET: Define an endpoint at '/api/responses' to retrieve all submitted responses.
// This will be used by our admin page.
app.get('/api/responses', (req, res) => {
    // SQL query to select all relevant columns from the 'responses' table.
    // strftime formats the submitted_at timestamp.
    // ORDER BY submitted_at DESC shows the newest responses first.
    const sql = `SELECT id, name, selected_dates, strftime('%Y-%m-%d %H:%M', submitted_at) as submitted_at FROM responses ORDER BY submitted_at DESC`;
    // db.all() executes the SQL query and calls the callback with all resulting rows.
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching responses", err.message);
            return res.status(500).json({ message: 'Failed to retrieve responses.' });
        }
        // If successful, send back the rows (array of response objects) as JSON.
        res.json(rows);
    });
});

// DELETE: Define an endpoint to delete a specific response by its ID
app.delete('/api/responses/:id', (req, res) => {
    const idToDelete = req.params.id; // Get the 'id' from the URL path parameter

    if (!idToDelete) {
        return res.status(400).json({ message: 'Response ID is required for deletion.' });
    }

    const sql = `DELETE FROM responses WHERE id = ?`;
    db.run(sql, [idToDelete], function(err) {
        if (err) {
            console.error("Error deleting data", err.message);
            return res.status(500).json({ message: 'Failed to delete response.' });
        }
        if (this.changes === 0) {
            // No rows were deleted, meaning the ID might not exist
            return res.status(404).json({ message: 'Response not found.' });
        }
        // If deletion is successful
        res.json({ message: 'Response deleted successfully!', id: idToDelete });
    });
});

// --- HTML Routes (Serving Pages) ---

// GET: Define a route for the root URL ('/').
// When a user goes to http://localhost:3000/, this will send them the index.html file.
app.get('/', (req, res) => {
    // path.join correctly constructs the file path to public/index.html.
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET: Define a route for '/view-responses'.
// This will serve the HTML page for viewing all responses.
app.get('/view-responses', (req, res) => {
    // Sends the responses.html file from the 'views' folder.
    res.sendFile(path.join(__dirname, 'views', 'responses.html'));
});


// --- Start Server ---
// Start the Express server and make it listen for incoming requests on the defined 'port'.
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Submit responses at: http://localhost:${port}/`);
    console.log(`View responses at: http://localhost:${port}/view-responses`);
});

// --- Graceful Shutdown (Optional but good practice) ---
// Listen for the SIGINT signal (e.g., when you press Ctrl+C in the terminal to stop the server).
process.on('SIGINT', () => {
    db.close((err) => { // Attempt to close the database connection.
        if (err) {
            return console.error("Error closing database connection:", err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0); // Exit the Node.js process.
    });
});