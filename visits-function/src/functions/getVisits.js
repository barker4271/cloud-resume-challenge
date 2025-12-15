/**
 * Azure Function: getVisits
 *
 * Purpose:
 * - Acts as a serverless replacement for your old visit counter
 * - Reads the current visit count from Azure Table Storage
 * - Increments the count
 * - Saves it back
 * - Returns the updated count as JSON
 *
 * This function is triggered via HTTP (GET request).
 */

import { TableClient } from "@azure/data-tables";

/**
 * Azure Functions entry point
 */
export async function getVisits(request, context) {
  context.log("getVisits function invoked");

  try {
    /**
     * These values come from Application Settings
     * (local.settings.json locally, App Settings in Azure)
     */
    const storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const tableName = "visits";

    if (!storageConnectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    }

    /**
     * Create a TableClient to talk to Azure Table Storage
     */
    const tableClient = TableClient.fromConnectionString(
      storageConnectionString,
      tableName
    );

    /**
     * We store the visit count in a single row.
     * PartitionKey + RowKey uniquely identify it.
     */
    const partitionKey = "counter";
    const rowKey = "site";

    let visitCount = 0;

    try {
      /**
       * Try to read the existing entity
       */
      const entity = await tableClient.getEntity(partitionKey, rowKey);
      visitCount = entity.count;
    } catch (err) {
      /**
       * If the entity doesn't exist yet, that's OK.
       * We'll create it below starting at 0.
       */
      context.log("Visit counter entity not found, creating new one");
    }

    /**
     * Increment the visit count
     */
    visitCount += 1;

    /**
     * Upsert = insert if missing, update if exists
     */
    await tableClient.upsertEntity({
      partitionKey,
      rowKey,
      count: visitCount,
    });

    /**
     * Return JSON to the caller
     */
    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ visits: visitCount }),
    };
  } catch (error) {
    context.log.error("Error in getVisits function", error);

    return {
      status: 500,
      body: "Server error while updating visit count",
    };
  }
}

/**
 * Function configuration
 * This tells Azure Functions how this function is triggered
 */
export const config = {
  route: "visits",
  methods: ["GET"],
  authLevel: "anonymous",
};
