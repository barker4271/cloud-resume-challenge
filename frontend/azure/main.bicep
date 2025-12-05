// ============================================================================
// Cosmos DB, Storage Account, and App Service Enhancement Bicep Template
// THIS VERSION DOES NOT MODIFY YOUR APP SERVICE STARTUP COMMAND
// ============================================================================

// -------------------------
// PARAMETERS
// -------------------------

@description('Name of the Cosmos DB account')
param cosmosAccountName string

@description('Name of the Cosmos DB SQL database')
param cosmosDatabaseName string

@description('Name of the Cosmos DB container')
param cosmosContainerName string

@description('Location of the resources')
param location string = resourceGroup().location

@description('The name of the storage account to create')
param storageAccountName string = 'wookiestorage'

// -------------------------
// COSMOS DB ACCOUNT
// -------------------------

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    apiProperties: {
      serverVersion: '4.0'
    }
  }
}

// -------------------------
// COSMOS SQL DATABASE
// -------------------------

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  name: '${cosmosAccount.name}/${cosmosDatabaseName}'
  properties: {
    resource: {
      id: cosmosDatabaseName
    }
  }
  dependsOn: [
    cosmosAccount
  ]
}

// -------------------------
// COSMOS CONTAINER
// -------------------------

resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  name: '${cosmosAccount.name}/${cosmosDatabaseName}/${cosmosContainerName}'
  properties: {
    resource: {
      id: cosmosContainerName
      partitionKey: {
        paths: [
          '/topic'
        ]
        kind: 'Hash'
      }
    }
  }
  dependsOn: [
    cosmosDatabase
  ]
}

// -------------------------
// STORAGE ACCOUNT
// -------------------------

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

// -------------------------
// APP SERVICE PLAN (EXISTING)
// -------------------------

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' existing = {
  name: 'wookietoast-plan'
}

// -------------------------
// WEB APP (EXISTING W/O STARTUP COMMAND CHANGE)
// -------------------------

resource webApp 'Microsoft.Web/sites@2023-01-01' existing = {
  name: 'wookietoast-web'
}

// NOTE:
// We intentionally do NOT modify webApp.properties.siteConfig.appCommandLine
// because your existing startup command ("node server.js") is working and stable.
// ============================================================================

output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
