@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Existing storage account name (reuse)')
param storageAccountName string = 'wookiestore'

@description('Name of the Function App')
param functionAppName string = 'wookietoast-visits-func'

@description('Name of the Function App Service Plan')
param functionPlanName string = 'wookietoast-visits-plan'

/*
|--------------------------------------------------------------------------
| EXISTING STORAGE ACCOUNT
|--------------------------------------------------------------------------
| We reuse your existing storage account.
*/
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

/*
|--------------------------------------------------------------------------
| TABLE SERVICE (DEFAULT)
|--------------------------------------------------------------------------
*/
resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-01-01' = {
  name: 'default'
  parent: storageAccount
}

/*
|--------------------------------------------------------------------------
| VISITS TABLE
|--------------------------------------------------------------------------
*/
resource visitsTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-01-01' = {
  name: 'visits'
  parent: tableService
}

/*
|--------------------------------------------------------------------------
| FUNCTION APP SERVICE PLAN (WINDOWS CONSUMPTION)
|--------------------------------------------------------------------------
*/
resource functionPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: functionPlanName
  location: location
  kind: 'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

/*
|--------------------------------------------------------------------------
| WINDOWS FUNCTION APP...since the linux install stuff was nasty
|--------------------------------------------------------------------------
*/
resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'AzureWebJobsStorage'
          value: storageAccount.properties.primaryEndpoints.blob
        }
      ]
    }
  }
}
