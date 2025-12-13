/**
 * server.js
 *
 * Main Express application for wookietoast.com
 * - Serves static pages
 * - Renders EJS views
 * - Stores and retrieves blog posts from Azure Cosmos DB
 */

/* ------------------------------------------------------------------
   FIX: Azure App Service Node 18 does NOT expose global crypto
   Cosmos SDK requires crypto.randomUUID()
   ------------------------------------------------------------------ */
const crypto = require("crypto");
global.crypto = crypto.webcrypto;

/* ------------------------------------------------------------------
   Imports
   ------------------------------------------------------------------ */

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

const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_KEY;

const COSMOS_DATABASE_NAME = "wookieblog";
const COSMOS_CONTAINER_NAME = "wookiecontainer";

const cosmosClient = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY
});

const database = cosmosClient.database(COSMOS_DATABASE_NAME);
const container = database.container(COSMOS_CONTAINER_NAME);

/* ------------------------------------------------------------------
   Local Counter
   ------------------------------------------------------------------ */

const counterPath = path.join(__dirname, "counter.json");
let counter = JSON.parse(fs.readFileSync(counterPath, "utf-8"));

/* ------------------------------------------------------------------
   Express + EJS Setup
   ------------------------------------------------------------------ */

app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

/* ------------------------------------------------------------------
   Load static site data
   ------------------------------------------------------------------ */

const dataPath = path.join(__dirname, "data.json");
const siteData = JSON.parse(fs.readFileSync(dataPath));

/* ------------------------------------------------------------------
   Routes
   ------------------------------------------------------------------ */

app.get("/", (req, res) => {
  counter.visits += 1;
  fs.writeFileSync(counterPath, JSON.stringify(counter, null, 2));

  res.render("home", {
    title: "Home",
    visits: counter.visits
  });
});

app.get("/resume", (req, res) => {
  res.render("resume", {
    title: "Resume",
    resume: siteData.resume
  });
});

app.get("/projects", (req, res) => {
  res.render("projects", {
    title: "Projects",
    projects: siteData.projects
  });
});

/* ------------------------------------------------------------------
   BLOG ROUTES (Cosmos DB)
   ------------------------------------------------------------------ */

app.get('/blog', async (req, res) => {
  res.render('blog', {
    layout: false,   // 🔑 disables layout.ejs completely
    title: 'Blog',
    posts: []
  });
});


app.get("/blog/new", (req, res) => {
  res.render("blog-new", { title: "New Blog Post" });
});

app.post("/blog", async (req, res, next) => {
  try {
    const { topic, body } = req.body;

    const newPost = {
      id: crypto.randomUUID(),
      topic,
      body,
      createdAt: new Date().toISOString()
    };

    await container.items.create(newPost);
    res.redirect("/blog");

  } catch (err) {
    console.error("===== COSMOS BLOG INSERT FAILED =====");
    console.error(err);
    console.error("====================================");
    next(err);
  }
});

/* ------------------------------------------------------------------
   Health Check
   ------------------------------------------------------------------ */

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ------------------------------------------------------------------
   Error Handling
   ------------------------------------------------------------------ */

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("500", { title: "Server Error" });
});

app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

/* ------------------------------------------------------------------
   Start Server
   ------------------------------------------------------------------ */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
