const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to read JSON
function readData(callback) {
  fs.readFile(path.join(__dirname, 'data.json'), 'utf8', (err, data) => {
    if (err) return callback(err);
    callback(null, JSON.parse(data));
  });
}

// Routes
app.get('/experience', (req, res) => {
  readData((err, data) => {
    if (err) return res.status(500).send('Error reading data.json');
    res.json(data.experience);
  });
});

app.get('/education', (req, res) => {
  readData((err, data) => {
    if (err) return res.status(500).send('Error reading data.json');
    res.json(data.education);
  });
});

app.get('/skills', (req, res) => {
  readData((err, data) => {
    if (err) return res.status(500).send('Error reading data.json');
    res.json(data.skills);
  });
});

app.get('/languages', (req, res) => {
  readData((err, data) => {
    if (err) return res.status(500).send('Error reading data.json');
    res.json(data.languages);
  });
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
