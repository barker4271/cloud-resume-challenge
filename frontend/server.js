/*****************************************************
 * server.js
 *
 * Main Express application entry point.
 *
 * Step 2 goals:
 * - Keep existing site behavior unchanged
 * - Initialize Azure Cosmos DB safely
 * - Prepare database/container references
 * - Do NOT add blog routes yet
 *****************************************************/

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');

/**
 * Azure Cosmos DB SDK
 * This was installed via:
 *   npm install @azure/cosmos
 */
const { CosmosClient } = require('@azure/cosmos');

const app = express();

/**
 * Azure App Service injects PORT automatically.
 * Local dev will fall back to 3000.
 */
const PORT = process.env.PORT || 3000;

/* ====================================================
   ============ COSMOS DB CONFIGURATION ===============
   ==================================================== */

/**
 * These values MUST exist as App Settings
 * in Azure App Service → Configuration
 *
 * We intentionally do NOT hardcode secrets.
 */
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_KEY;

const COSMOS_DATABASE_NAME = 'WookieBlog';
const COSMOS_CONTAINER_NAME = 'WookieContainer';

/**
 * Safety check:
 * If these are missing, we want to fail loudly
 * instead of silently breaking blog features later.
 */
if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
  console.error('❌ Cosmos DB configuration missing.');
  console.error('Ensure COSMOS_ENDPOINT and COSMOS_KEY are set.');
} else {
  console.log('✅ Cosmos DB configuration detected.');
}

/**
 * Create Cosmos client.
 * This does NOT make a network call yet.
 */
const cosmosClient = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY
});

/**
 * Get database and container references.
 * These are lightweight objects.
 */
const cosmosDatabase = cosmosClient.database(COSMOS_DATABASE_NAME);
const cosmosContainer = cosmosDatabase.container(COSMOS_CONTAINER_NAME);

/**
 * Optional: quick startup connectivity test.
 * This confirms permissions and connectivity.
 * Safe to keep — runs once at startup.
 */
(async () => {
  try {
    await cosmosDatabase.read();
    console.log('✅ Connected to Cosmos DB:', COSMOS_DATABASE_NAME);
  } catch (err) {
    console.error('❌ Cosmos DB connection failed');
    console.error(err.message);
  }
})();

/* ====================================================
   ============ EXPRESS APP CONFIG ====================
   ==================================================== */

// View engine setup
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing (needed later for blog form submissions)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ====================================================
   ============ EXISTING FILE-BASED DATA ===============
   ==================================================== */

/**
 * Visit counter (unchanged)
 * Note: This will continue to work independently
 * from Cosmos DB for now.
 */
const counterPath = path.join(__dirname, 'counter.json');
let counter = JSON.parse(fs.readFileSync(counterPath, 'utf-8'));

/**
 * Static site content (resume, projects, blog text)
 * Blog posts will be replaced later with Cosmos data.
 */
const dataPath = path.join(__dirname, 'data.json');
const rawData = fs.readFileSync(dataPath);
const siteData = JSON.parse(rawData);

/* ====================================================
   ==================== ROUTES ========================
   ==================================================== */

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

/**
 * Blog page (still static for now).
 * We will replace this in Step 4.
 */
app.get('/blog', (req, res) => {
  res.render('blog', {
    title: 'Blog',
    blog: siteData.blog
  });
});

// Health check (used by Azure + Front Door)
app.get('/health', (req, res) => res.status(200).send('OK'));

/* ====================================================
   =============== ERROR HANDLING =====================
   ==================================================== */

// 500 handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { title: 'Server Error' });
});

// 404 handler (must be last)
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

/* ====================================================
   =============== START SERVER =======================
   ==================================================== */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
