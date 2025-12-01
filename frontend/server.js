const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to counter file
const counterPath = path.join(__dirname, "counter.json");
let counter = JSON.parse(fs.readFileSync(counterPath, "utf-8"));

// View engine setup
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Load site JSON content
const dataPath = path.join(__dirname, 'data.json');
const rawData = fs.readFileSync(dataPath);
const siteData = JSON.parse(rawData);

// Routes
app.get("/", (req, res) => {
  counter.visits += 1;
  fs.writeFileSync(counterPath, JSON.stringify(counter, null, 2));

  res.render("home", {
    title: "Home",
    visits: counter.visits
  });
});

app.get('/resume', (req, res) => {
  res.render('resume', {
    title: 'Resume',
    resume: siteData.resume
  });
});

app.get('/projects', (req, res) => {
  res.render('projects', {
    title: 'Projects',
    projects: siteData.projects
  });
});

app.get('/blog', (req, res) => {
  res.render('blog', {
    title: 'Blog',
    blog: siteData.blog
  });
});

app.get("/health", (req, res) => res.status(200).send("OK"));


// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
