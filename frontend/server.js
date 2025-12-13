/**
 * server.js
 * =========
 *
 * Main Express application for wookietoast.com
 *
 * Responsibilities in THIS STEP:
 * -------------------------------
 * 1. Connect to Azure Cosmos DB
 * 2. Read blog posts from Cosmos
 * 3. Render blog.ejs using database data
 *
 * We DO NOT create blog posts yet — that comes next.
 */

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');

// Azure Cosmos DB SDK
const { CosmosClient } = require('@azure/cosmos');

const app = express();
const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------------
   AZURE COSMOS DB CONFIGURATION
   ------------------------------------------------------------------ */

/**
 * These values come from Azure App Service → Configuration → App Settings
 *
 * NEVER hardcode secrets.
 */
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_KEY;

const DATABASE_NAME = 'wookieblog';
const CONTAINER_NAME = 'wookiecontainer';

// Create Cosmos client
const cosmosClient = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY
});

// Get database + container references
const database = cosmosClient.database(DATABASE_NAME);
const container = database.container(CONTAINER_NAME);

/* ------------------------------------------------------------------
   LOCAL FILE-BASED CONTENT (non-blog)
   ------------------------------------------------------------------ */

// Counter (local file — fine for this project)
const counterPath = path.join(__dirname, 'counter.json');
let counter = JSON.parse(fs.readFileSync(counterPath, 'utf-8'));

// Static site data (resume, projects)
const dataPath = path.join(__dirname, 'data.json');
const siteData = JSON.parse(fs.readFileSync(dataPath));

/* ------------------------------------------------------------------
   EXPRESS CONFIGURATION
   ------------------------------------------------------------------ */

app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// Static assets (CSS, images, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Parse form submissions (needed later for blog creation)
app.use(express.urlencoded({ extended: true }));

/* ------------------------------------------------------------------
   ROUTES
   ------------------------------------------------------------------ */

// HOME PAGE
app.get('/', (req, res) => {
  counter.visits += 1;
  fs.writeFileSync(counterPath, JSON.stringify(counter, null, 2));

  res.render('home', {
    title: 'Home',
    visits: counter.visits
  });
});

// RESUME PAGE
app.get('/resume', (req, res) => {
  res.render('resume', {
    title: 'Resume',
    resume: siteData.resume
  });
});

// PROJECTS PAGE
app.get('/projects', (req, res) => {
  res.render('projects', {
    title: 'Projects',
    projects: siteData.projects
  });
});

/* ------------------------------------------------------------------
   BLOG PAGE — READ FROM COSMOS DB
   ------------------------------------------------------------------ */

app.get('/blog', async (req, res, next) => {
  try {
    /**
     * SQL-style query against Cosmos DB
     * ---------------------------------
     * ORDER BY createdAt DESC ensures newest posts appear first
     */
    const querySpec = {
      query: 'SELECT * FROM c ORDER BY c.createdAt DESC'
    };

    // Execute query
    const { resources: posts } = await container.items
    .query(querySpec, {
      enableCrossPartitionQuery: true
   })
    .fetchAll();


    res.render('blog', {
      title: 'Blog',
      posts: posts
    });

  } catch (err) {
    // Pass errors to the 500 handler
    next(err);
  }
});

/* ------------------------------------------------------------------
   PLACEHOLDER: CREATE BLOG PAGE (NEXT STEP)
   ------------------------------------------------------------------ */

app.get('/blog/new', (req, res) => {
  res.render('blog-new', {
    title: 'New Blog Post'
  });
});

/* ------------------------------------------------------------------
   HEALTH CHECK (used by Azure / Front Door)
   ------------------------------------------------------------------ */

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/* ------------------------------------------------------------------
   ERROR HANDLING
   ------------------------------------------------------------------ */

// 500 — Server Errors
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('500', { title: 'Server Error' });
});

// 404 — Not Found (must be LAST)
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

/* ------------------------------------------------------------------
   START SERVER
   ------------------------------------------------------------------ */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
