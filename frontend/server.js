const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Read data.json once at startup
const dataPath = path.join(__dirname, 'data.json');
const rawData = fs.readFileSync(dataPath);
const siteData = JSON.parse(rawData);

// Routes
app.get('/', (req, res) => res.render('home', { title: 'Home' }));
app.get('/resume', (req, res) => res.render('resume', { title: 'Resume' }));
app.get('/projects', (req, res) => res.render('projects', { title: 'Projects', projects: siteData.projects }));
app.get('/blog', (req, res) => res.render('blog', { title: 'Blog', blog: siteData.blog }));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
