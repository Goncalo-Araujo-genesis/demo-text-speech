const express = require('express');
const path = require('path');
const app = express();

app.get('/api/config', (req, res) => {
    res.json({
        apiUrl: process.env.API_URL,
        apiKey: process.env.API_KEY,
    });
});

// Middleware for reserved terms
const reservedTerms = ['con', 'aux', 'prn', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];

app.use((req, res, next) => {
    const pathName = req.path.slice(1);
    if (reservedTerms.includes(pathName)) {
        res.redirect('/');
    } else {
        next();
    }
});

// Serve static files from the 'dist/my-app' directory
app.use(express.static(path.join(__dirname, 'dist', 'my-app')));

// Redirect all other routes to index.html
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'my-app', 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is running on port ${port}...`);
});
