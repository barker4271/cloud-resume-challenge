/**
 * server.js
 * Main Express server for Wookietoast
 */

const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const fs = require("fs");

// IMPORTANT: make crypto global for Azure + Cosmos SDK
const crypto = require("crypto");
global.crypto = crypto;

const { CosmosClient } = require("@azure/cosmos");

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================================================
   Azure Cosmos DB Configuration
============================================================ */

const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_KEY;

const DATABASE_NAME = "wookieblog";
const CONTAINER_NAME = "wookiecontainer";

const cosmosClient = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY,
});

const database = cosmosClient.database(DATABASE_NAME);
const container = database.container(CONTAINER_NAME);

/* ============================================================
   Express Setup
============================================================ */

app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");

app.use(express.static(path.join(__dirname, "public")));

/* ============================================================
   Static Site Data
============================================================ */

const dataPath = path.join(__dirname, "data.json");
const siteData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

/* ============================================================
   Routes
============================================================ */

/**
 * Home
 * NOTE:
 * Visit counter is now handled client-side via Azure Function.
 * No server-side visit tracking remains here.
 */
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
   Blog — LIST posts
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
   Blog — New Post Form
============================================================ */

app.get("/blog/new", (req, res) => {
  res.render("blog-new", {
    title: "New Blog Post",
  });
});

/* ============================================================
   Blog — Create Post
============================================================ */

app.post("/blog/new", async (req, res, next) => {
  try {
    const { topic, body } = req.body;

    if (!topic || !body) {
      return res.status(400).send("Topic and body are required");
    }

    const newPost = {
      id: crypto.randomUUID(),
      topic,
      body,
      createdAt: new Date().toISOString(),
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

/* ============================================================
   Health Check
============================================================ */

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ============================================================
   Error Handling
============================================================ */

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("500", { title: "Server Error" });
});

app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

/* ============================================================
   Start Server
============================================================ */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
