import { app } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

app.http("getVisits", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {

    const storageAccount = process.env.STORAGE_ACCOUNT_NAME;
    const storageKey = process.env.STORAGE_ACCOUNT_KEY;

    if (!storageAccount || !storageKey) {
      return {
        status: 500,
        jsonBody: { error: "Storage not configured" }
      };
    }

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
    let count;

    try {
      try {
        const entity = await tableClient.getEntity(partitionKey, rowKey);
        count = entity.count + 1;
        entity.count = count;
        await tableClient.updateEntity(entity, "Replace");
      } catch (err) {
        if (err.statusCode === 404) {
          count = 1;
          await tableClient.createEntity({ partitionKey, rowKey, count });
        } else {
          throw err;
        }
      }

      return { status: 200, jsonBody: { visits: count } };

    } catch {
      return { status: 500, jsonBody: { error: "Visit counter error" } };
    }
  }
});
