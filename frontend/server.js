/**
 * server.js
 * =========
 *
 * Main Express application entry point.
 *
 * Responsibilities:
 * - Configure Express
 * - Configure EJS + layouts
 * - Serve static assets
 * - Define routes
 * - Connect to Azure Cosmos DB
 *
 * NOTE:
 * -----
 * This file is intentionally verbose and heavily commented
 * to make the control flow easy to understand.
 */

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');

/**
 * Azure Cosmos DB SDK
 * ------------------
 * This client allows us to:
 * - connect to Cosmos
 * - read/write documents
 */
const { CosmosClient } = require('@azure/cosmos');

const app = express();

/**
 * Azure App Service injects PORT automatically.
 * Locally, we fall back to 3000.
 */
const PORT = process.env.PORT || 3000;

/* ============================================================
   COSMOS DB CONFIGURATION
   ============================================================ */

/**
 * These values come from Azure App Service → Configuration
 *
 * DO NOT hard-code secrets.
 */
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_KEY;

/**
 * These names must match what you created via Bicep.
 */
const COSMOS_DATABASE_NAME = 'wookieblog';
const COSMOS_CONTAINER_NAME = 'wookiecontainer';

/**
 * Create the Cosmos client.
 * This does NOT connect immediately — connections are lazy.
 */
const cosmosClient = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY
});

/**
 * Get references to the database and container.
 * These objects are lightweight handles.
 */
const database = cosmosClient.database(COSMOS_DATABASE_NAME);
const container = database.container(COSMOS_CONTAINER_NAME);

/* ============================================================
   EXPRESS + VIEW ENGINE SETUP
   ============================================================ */

/**
 * Enable parsing of form POST bodies
 * (needed for blog creation form)
 */
app.use(express.urlencoded({ extended: true }));

/**
 * View engine: EJS
 */
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

/**
 * Static files (CSS, images, JS)
 */
app.use(express.static(path.join(__dirname, 'public')));

/* ============================================================
   LOCAL FILE-BASED CONTENT (existing functionality)
   ============================================================ */

const counterPath = path.join(__dirname, 'counter.json');
let counter = JSON.parse(fs.readFileSync(counterPath, 'utf-8'));

const dataPath = path.join(__dirname, 'data.json');
const siteData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

/* ============================================================
   ROUTES — EXISTING PAGES
   ============================================================ */

app.get('/', (req, res) => {
  counter.visits += 1;
  fs.writeFileSync(counterPath, JSON.stringify(counter, null, 2));

  res.render('home', {
    title: 'Home',
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
  /**
   * For now, this page remains unchanged.
   * Step 5 will replace this with Cosmos-backed data.
   */
  res.render('blog', {
    title: 'Blog',
    blog: siteData.blog
  });
});

/* ============================================================
   ROUTES — BLOG CREATION (NEW)
   ============================================================ */

/**
 * GET /blog/new
 * -------------
 * Renders the form that allows a user to create a new blog post.
 */
app.get('/blog/new', (req, res) => {
  res.render('blog-new', {
    title: 'New Blog Post'
  });
});

/**
 * POST /blog/new
 * --------------
 * Accepts form submission and writes a document to Cosmos DB.
 */
app.post('/blog/new', async (req, res, next) => {
  try {
    /**
     * Extract fields from the submitted form.
     */
    const { topic, body } = req.body;

    /**
     * Basic server-side validation.
     */
    if (!topic || !body) {
      return res.status(400).send('Topic and body are required.');
    }

    /**
     * Construct the blog post document.
     *
     * Cosmos DB requires:
     * - an `id` field (string)
     * - partition key value (`topic` in our case)
     */
    const blogPost = {
      id: Date.now().toString(),        // simple unique ID
      topic: topic,
      body: body,
      createdAt: new Date().toISOString()
    };

    /**
     * Insert document into Cosmos DB.
     */
    await container.items.create(blogPost);

    /**
     * Redirect back to the blog page.
     * (Later this page will read from Cosmos DB)
     */
    res.redirect('/blog');

  } catch (error) {
    /**
     * Any error here goes to the 500 handler.
     */
    next(error);
  }
});

/* ============================================================
   HEALTH CHECK
   ============================================================ */

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/* ============================================================
   ERROR HANDLING
   ============================================================ */

/**
 * 500 — Server error
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { title: 'Server Error' });
});

/**
 * 404 — Must be LAST
 */
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

/* ============================================================
   START SERVER
   ============================================================ */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
