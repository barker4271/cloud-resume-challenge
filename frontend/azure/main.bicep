@description('Location for all resources.')
param location string = resourceGroup().location

@description('Cosmos DB account name')
param cosmosAccountName string

@description('Cosmos DB database name')
param cosmosDatabaseName string

@description('Cosmos DB container name')
param cosmosContainerName string

@description('Existing storage account name')
param storageAccountName string

// -------------------------------------------------------
// EXISTING RESOURCES (NOT MODIFIED)
// -------------------------------------------------------

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

// -------------------------------------------------------
// COSMOS DB ACCOUNT (SERVERLESS) — FIXED VERSION
// (Removed apiProperties.serverVersion, which caused failure)
// -------------------------------------------------------

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'

    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]

    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }

    // Serverless capability (allowed)
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

// -------------------------------------------------------
// COSMOS DB SQL DATABASE
// -------------------------------------------------------

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  name: '${cosmosAccount.name}/${cosmosDatabaseName}'
  properties: {
    resource: {
      id: cosmosDatabaseName
    }
  }
}

// -------------------------------------------------------
// COSMOS DB CONTAINER
// -------------------------------------------------------

resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  name: '${cosmosAccount.name}/${cosmosDatabase.name}/${cosmosContainerName}'
  properties: {
    resource: {
      id: cosmosContainerName
      partitionKey: {
        paths: [
          '/topic'  // Partition by topic
        ]
        kind: 'Hash'
      }
    }
  }
}

output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
