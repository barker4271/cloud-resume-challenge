import { app } from "@azure/functions";
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";

export async function getVisits(context, req) {
  try {
    const account = process.env.STORAGE_ACCOUNT_NAME;
    const key = process.env.STORAGE_ACCOUNT_KEY;

    if (!account || !key) {
      throw new Error("Missing storage credentials");
    }

    const credential = new AzureNamedKeyCredential(account, key);

    const tableClient = new TableClient(
      `https://${account}.table.core.windows.net`,
      "visits",
      credential
    );

    const partitionKey = "counter";
    const rowKey = "site";

    let count = 1;

    try {
      const entity = await tableClient.getEntity(partitionKey, rowKey);
      count = Number(entity.count) + 1;

      await tableClient.updateEntity(
        {
          partitionKey,
          rowKey,
          count
        },
        "Replace"
      );
    } catch (err) {
      if (err.statusCode === 404) {
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
    context.log.error("Visit counter failed:", err);
    return {
      status: 500,
      jsonBody: {
        error: err.message,
        type: err.name
      }
    };
  }
}

app.http("getVisits", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getVisits
});
