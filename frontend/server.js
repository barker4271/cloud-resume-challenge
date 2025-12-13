/**
 * server.js
 *
 * Main Express application for wookietoast.com
 * - Serves static pages
 * - Renders EJS views
 * - Stores and retrieves blog posts from Azure Cosmos DB
 */

const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const fs = require("fs");

// Azure Cosmos DB SDK
const { CosmosClient } = require("@azure/cosmos");

const app = express();
const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------------
   Cosmos DB Configuration
   ------------------------------------------------------------------ */

// These MUST exist as App Settings in Azure
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_KEY;

// Names MUST match exactly what you deployed via Bicep
const COSMOS_DATABASE_NAME = "wookieblog";
const COSMOS_CONTAINER_NAME = "wookiecontainer";

// Create Cosmos client (does NOT make a network call yet)
const cosmosClient = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY
});

// Get database + container references
const database = cosmosClient.database(COSMOS_DATABASE_NAME);
const container = database.container(COSMOS_CONTAINER_NAME);

/* ------------------------------------------------------------------
   Local Counter (file-based)
   ------------------------------------------------------------------ */

const counterPath = path.join(__dirname, "counter.json");
let counter = JSON.parse(fs.readFileSync(counterPath, "utf-8"));

/* ------------------------------------------------------------------
   Express + EJS Setup
   ------------------------------------------------------------------ */

app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// Parse form submissions
app.use(express.urlencoded({ extended: true }));

/* ------------------------------------------------------------------
   Load static site data
   ------------------------------------------------------------------ */

const dataPath = path.join(__dirname, "data.json");
const rawData = fs.readFileSync(dataPath);
const siteData = JSON.parse(rawData);

/* ------------------------------------------------------------------
   Routes
   ------------------------------------------------------------------ */

// Home
app.get("/", (req, res) => {
  counter.visits += 1;
  fs.writeFileSync(counterPath, JSON.stringify(counter, null, 2));

  res.render("home", {
    title: "Home",
    visits: counter.visits
  });
});

// Resume
app.get("/resume", (req, res) => {
  res.render("resume", {
    title: "Resume",
    resume: siteData.resume
  });
});

// Projects
app.get("/projects", (req, res) => {
  res.render("projects", {
    title: "Projects",
    projects: siteData.projects
  });
});

/* ------------------------------------------------------------------
   BLOG ROUTES (Cosmos-backed)
   ------------------------------------------------------------------ */

// View blog posts
app.get("/blog", async (req, res, next) => {
  try {
    // Intentionally simple query for debugging
    // (ORDER BY will be reintroduced once confirmed working)
    const querySpec = {
      query: "SELECT * FROM c"
    };

    const { resources: posts } = await container.items
      .query(querySpec, { enableCrossPartitionQuery: true })
      .fetchAll();

    res.render("blog", {
      title: "Blog",
      posts
    });

  } catch (err) {
    // VERY IMPORTANT: log everything Cosmos gives us
    console.error("===== COSMOS BLOG QUERY FAILED =====");
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    console.error("Body:", err.body);
    console.error("===================================");

    next(err); // pass to 500 handler
  }
});

// New blog post form
app.get("/blog/new", (req, res) => {
  res.render("blog-new", {
    title: "New Blog Post"
  });
});

// Handle blog post submission
app.post("/blog", async (req, res, next) => {
  try {
    const { topic, body } = req.body;

    const newPost = {
      id: Date.now().toString(),          // required by Cosmos
      topic,                              // partition key
      body,
      createdAt: new Date().toISOString()
    };

    await container.items.create(newPost);

    res.redirect("/blog");

  } catch (err) {
    console.error("===== COSMOS BLOG INSERT FAILED =====");
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    console.error("Body:", err.body);
    console.error("====================================");

    next(err);
  }
});

// Health check (used by App Service)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ------------------------------------------------------------------
   Error Handling
   ------------------------------------------------------------------ */

// 500 handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("500", { title: "Server Error" });
});

// 404 handler (must be last)
app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

/* ------------------------------------------------------------------
   Start Server
   ------------------------------------------------------------------ */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
