import { app } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

app.http("getVisits", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const storageAccount = process.env.STORAGE_ACCOUNT_NAME;
    const storageKey = process.env.STORAGE_ACCOUNT_KEY;

    if (!storageAccount || !storageKey) {
      context.log.error("Storage credentials are missing");
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

    try {
      let count;

      try {
        const entity = await tableClient.getEntity(partitionKey, rowKey);
        count = entity.count + 1;

        await tableClient.updateEntity(
          { ...entity, count },
          "Replace"
        );

      } catch (err) {
        if (err.statusCode === 404) {
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

      return {
        status: 200,
        jsonBody: { visits: count }
      };

    } catch (err) {
      context.log.error("Visit counter failed", err);
      return {
        status: 500,
        jsonBody: { error: "Visit counter error" }
      };
    }
  }
});
