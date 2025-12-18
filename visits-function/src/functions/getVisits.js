const { TableClient } = require("@azure/data-tables");

/**
 * HTTP-triggered Azure Function
 * Increments and returns the site visit counter
 */
module.exports = async function (context, req) {
  // These come from Function App configuration (NOT local.settings.json in Azure)
  const storageAccount = process.env.STORAGE_ACCOUNT_NAME;
  const storageKey = process.env.STORAGE_ACCOUNT_KEY;

  if (!storageAccount || !storageKey) {
    context.log.error("Storage credentials are missing");
    context.res = {
      status: 500,
      body: { error: "Storage not configured" }
    };
    return;
  }

  // Construct Table Storage connection
  const tableClient = new TableClient(
    `https://${storageAccount}.table.core.windows.net`,
    "visits",
    {
      credential: {
        accountName: storageAccount,
        accountKey: storageKey
      }
    }
  );

  const partitionKey = "counter";
  const rowKey = "site";

  try {
    let entity;
    let count;

    try {
      // Try to read existing counter
      entity = await tableClient.getEntity(partitionKey, rowKey);
      count = entity.count + 1;

      // Update existing entity
      entity.count = count;
      await tableClient.updateEntity(entity, "Replace");

    } catch (err) {
      if (err.statusCode === 404) {
        // First visit — create the row
        count = 1;
        await tableClient.createEntity({
          partitionKey,
          rowKey,
          count
        });
      } else {
        throw err;
      }
    }

    // Return the updated count
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: { visits: count }
    };

  } catch (err) {
    context.log.error("Visit counter failed", err);
    context.res = {
      status: 500,
      body: { error: "Visit counter error" }
    };
  }
};
