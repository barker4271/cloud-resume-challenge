// visits-function/src/functions/getVisits.js
// Azure Functions Node.js v4 programming model (Functions runtime v4)
//
// What this function does:
// - Uses Azure Table Storage to store a single counter entity
// - Increments it on each request
// - Returns JSON: { visits: <number> }
//
// Requirements in Azure Function App "Environment variables":
// - AzureWebJobsStorage  (MUST be a *connection string*, not a URL)
// - AzureWebJobsFeatureFlags = EnableWorkerIndexing   (recommended for v4 model discovery)

import { app } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

/**
 * HTTP Trigger registration (THIS is what makes the function discoverable).
 * If you don't do this, Azure will deploy but show ZERO functions.
 */
app.http("getVisits", {
  methods: ["GET"],
  authLevel: "anonymous", // lets you call it from your website without function keys
  handler: getVisits,
});

/**
 * Handler for GET /api/getVisits
 *
 * In the v4 model, the handler signature is:
 *   async function(request, context) { ... }
 */
export async function getVisits(request, context) {
  // Azure Functions expects AzureWebJobsStorage to be a full connection string like:
  // DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net
  const storageConn = process.env.AzureWebJobsStorage;

  if (!storageConn || !storageConn.includes("AccountName=")) {
    context.error(
      "AzureWebJobsStorage is missing or not a connection string. It must be the full Storage connection string, not a URL."
    );
    return {
      status: 500,
      jsonBody: { error: "Storage not configured (AzureWebJobsStorage)" },
    };
  }

  // Table name must be lowercase in many cases (Azure is picky).
  // You already created: table "visits"
  const tableName = "visits";

  // One row is enough for a site counter
  const partitionKey = "counter";
  const rowKey = "site";

  try {
    // This is the cleanest way to build a TableClient with account key auth:
    const tableClient = TableClient.fromConnectionString(storageConn, tableName);

    let count = 0;

    try {
      // Try read existing row
      const entity = await tableClient.getEntity(partitionKey, rowKey);
      const current = Number(entity.count ?? 0);
      count = current + 1;

      // Update entity (MERGE is safer than REPLACE because it won't blow away system properties)
      await tableClient.updateEntity(
        {
          partitionKey,
          rowKey,
          count,
        },
        "Merge"
      );
    } catch (readErr) {
      // If missing, create it at 1
      if (readErr?.statusCode === 404) {
        count = 1;
        await tableClient.createEntity({
          partitionKey,
          rowKey,
          count,
        });
      } else {
        throw readErr;
      }
    }

    // Return JSON
    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Optional but handy when calling from your website domain
        "Access-Control-Allow-Origin": "*",
      },
      jsonBody: { visits: count },
    };
  } catch (err) {
    context.error("Visit counter failed:", err);
    return {
      status: 500,
      jsonBody: { error: "Visit counter error" },
    };
  }
}
