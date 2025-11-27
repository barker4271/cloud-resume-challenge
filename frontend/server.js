const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Tell Express to use the "views" folder for templates
app.set('view engine', 'ejs');

const expressLayouts = require('express-ejs-layouts');

app.use(expressLayouts);


// Serve all static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// -------- ROUTES --------

// Home page
app.get('/', (req, res) => {
  res.render('home', { title: "Home" });
});

// Resume page
app.get('/resume', (req, res) => {
  res.render('resume', { title: "Resume" });
});

// Projects page
app.get('/projects', (req, res) => {
  res.render('projects', { title: "Projects" });
});

// Blog page
app.get('/blog', (req, res) => {
  res.render('blog', { title: "Blog" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
