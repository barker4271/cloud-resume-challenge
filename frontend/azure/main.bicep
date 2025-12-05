// ============================================================================
// main.bicep
// Provisioning for:
//   - Storage Account (static content or future use)
//   - App Service Plan + Web App
//   - Cosmos DB Account (Serverless)
//   - Cosmos DB Database + Container
//
// Resource Group: wookietoast-rg
// ============================================================================

@description('Name of the storage account to create.')
param storageAccountName string

@description('Name of the App Service Plan.')
param appServicePlanName string

@description('Name of the Web App.')
param webAppName string

@description('Region for all resources')
param location string = resourceGroup().location

// Cosmos Parameters
@description('Name of the Cosmos DB Account')
param cosmosAccountName string

@description('Name of the Cosmos DB Database')
param cosmosDatabaseName string

@description('Name of the Cosmos DB Container')
param cosmosContainerName string

// ============================================================================
// STORAGE ACCOUNT
// ============================================================================
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
  }
}

// ============================================================================
// APP SERVICE PLAN (Linux, B1 Basic)
// ============================================================================
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
    size: 'B1'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true // Linux App Service
  }
}

// ============================================================================
// WEB APP (Node.js server)
// ============================================================================
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id

    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'

      // Startup command (we use PM2 so app restarts automatically if it crashes)
      appCommandLine: 'pm2 serve server.js --no-daemon'

      appSettings: [
        // Cosmos DB settings pushed to your Node app at runtime
        {
          name: 'COSMOS_ENDPOINT'
          value: cosmosAccount.properties.documentEndpoint
        }
        {
          name: 'COSMOS_KEY'
          value: cosmosAccount.listKeys().primaryMasterKey
        }
        {
          name: 'COSMOS_DATABASE'
          value: cosmosDatabaseName
        }
        {
          name: 'COSMOS_CONTAINER'
          value: cosmosContainerName
        }
      ]
    }
  }
}

// ============================================================================
// COSMOS DB ACCOUNT (SERVERLESS) — SQL API
// ============================================================================
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosAccountName
  location: location

  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'

    // SQL API only
    apiProperties: {
      serverVersion: '4.0'
    }

    // Enable SERVERLESS mode
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]

    // Required for serverless
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
  }
}

// ============================================================================
// COSMOS DATABASE
// ============================================================================
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: cosmosDatabaseName
  properties: {
    resource: {
      id: cosmosDatabaseName
    }
  }
}

// ============================================================================
// COSMOS CONTAINER
// ============================================================================
resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  name: '${cosmosAccountName}/${cosmosDatabaseName}/${cosmosContainerName}'
  properties: {
    resource: {
      id: cosmosContainerName
      partitionKey: {
        paths: [
          '/topic' // Topic is our partition key
        ]
        kind: 'Hash'
      }
    }
  }
}

// ============================================================================
// OUTPUTS
// ============================================================================
output webAppURL string = 'https://${webAppName}.azurewebsites.net'
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
output cosmosDatabaseOut string = cosmosDatabaseName
output cosmosContainerOut string = cosmosContainerName
