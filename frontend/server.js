const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');

const app = express();
const PORT = 3000;

const counterPath = path.join(__dirname, "counter.json");
let counter = JSON.parse(fs.readFileSync(counterPath, "utf-8"));

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
app.get("/", (req, res) => {
  // Increment counter
  counter.visits += 1;

  // Save updated counter
  fs.writeFileSync(counterPath, JSON.stringify(counter, null, 2));

  res.render("home", {
    title: "Home",
    visits: counter.visits
  });
});

app.get('/resume', (req, res) => res.render('resume', { title: 'Resume', resume: siteData.resume }));
app.get('/projects', (req, res) => res.render('projects', { title: 'Projects', projects: siteData.projects }));
app.get('/blog', (req, res) => res.render('blog', { title: 'Blog', blog: siteData.blog }));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
