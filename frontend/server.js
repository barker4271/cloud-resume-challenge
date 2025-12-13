/**
 * server.js
 *
 * Main Express server for Wookietoast
 * - Serves pages using EJS templates
 * - Stores and retrieves blog posts from Azure Cosmos DB
 */

const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const fs = require("fs");
const crypto = require("crypto"); // REQUIRED for UUIDs in Node 18
const { CosmosClient } = require("@azure/cosmos");

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================================================
   Azure Cosmos DB Configuration
============================================================ */

// These come from Azure App Service → Configuration → App settings
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_KEY;

// Names you created via Bicep
const DATABASE_NAME = "wookieblog";
const CONTAINER_NAME = "wookiecontainer";

// Create Cosmos client
const cosmosClient = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY,
});

// Get database + container references
const database = cosmosClient.database(DATABASE_NAME);
const container = database.container(CONTAINER_NAME);

/* ============================================================
   Express App Setup
============================================================ */

// Needed to read POST form data
app.use(express.urlencoded({ extended: true }));

// View engine
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");

// Static assets
app.use(express.static(path.join(__dirname, "public")));

/* ============================================================
   Load Static Site Data
============================================================ */

const dataPath = path.join(__dirname, "data.json");
const siteData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

/* ============================================================
   Routes — Core Pages
============================================================ */

app.get("/", (req, res) => {
  res.render("home", {
    title: "Home",
  });
});

app.get("/resume", (req, res) => {
  res.render("resume", {
    title: "Resume",
    resume: siteData.resume,
  });
});

app.get("/projects", (req, res) => {
  res.render("projects", {
    title: "Projects",
    projects: siteData.projects,
  });
});

/* ============================================================
   Blog — LIST posts (READ from Cosmos)
============================================================ */

app.get("/blog", async (req, res, next) => {
  try {
    const query = {
      query: "SELECT * FROM c ORDER BY c.createdAt DESC",
    };

    const { resources: posts } = await container.items
      .query(query)
      .fetchAll();

    res.render("blog", {
      title: "Blog",
      posts,
    });
  } catch (err) {
    console.error("===== COSMOS BLOG QUERY FAILED =====");
    console.error(err);
    console.error("===================================");
    next(err);
  }
});

/* ============================================================
   Blog — NEW post form
============================================================ */

app.get("/blog/new", (req, res) => {
  res.render("blog-new", {
    title: "New Blog Post",
  });
});

/* ============================================================
   Blog — CREATE post (WRITE to Cosmos)
   🔑 THIS IS THE FIX FOR YOUR 404
============================================================ */

app.post("/blog/new", async (req, res, next) => {
  try {
    const { topic, body } = req.body;

    // Basic validation
    if (!topic || !body) {
      return res.status(400).send("Topic and body are required");
    }

    const newPost = {
      id: crypto.randomUUID(),   // Required by Cosmos
      topic,
      body,
      createdAt: new Date().toISOString(),
    };

    await container.items.create(newPost);

    // After saving, go back to the blog list
    res.redirect("/blog");
  } catch (err) {
    console.error("===== COSMOS BLOG INSERT FAILED =====");
    console.error(err);
    console.error("====================================");
    next(err);
  }
});

/* ============================================================
   Health Check
============================================================ */

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ============================================================
   Error Handling
============================================================ */

// 500 handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("500", { title: "Server Error" });
});

// 404 handler (last)
app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

/* ============================================================
   Start Server
============================================================ */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
