const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve static files (index.html, style.css, images)
app.use(express.static(path.join(__dirname, 'public')));

// --- Dynamic routes ---

// Return experience JSON
app.get('/experience', (req, res) => {
  fs.readFile('data.json', 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data.json');
    const jsonData = JSON.parse(data);
    res.json(jsonData.experience);
  });
});

// Return education JSON
app.get('/education', (req, res) => {
  fs.readFile('data.json', 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data.json');
    const jsonData = JSON.parse(data);
    res.json(jsonData.education);
  });
});

// Return skills JSON
app.get('/skills', (req, res) => {
  fs.readFile('data.json', 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data.json');
    const jsonData = JSON.parse(data);
    res.json(jsonData.skills);
  });
});

// Return languages JSON
app.get('/languages', (req, res) => {
  fs.readFile('data.json', 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data.json');
    const jsonData = JSON.parse(data);
    res.json(jsonData.languages);
  });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
