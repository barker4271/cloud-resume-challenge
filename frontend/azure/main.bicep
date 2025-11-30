// ====================================================================
// main.bicep
// Creates:
//   ✔ Storage account (wookiestore)
//   ✔ App Service Plan (Linux)
//   ✔ Web App
// Target scope: resource group
// ====================================================================

targetScope = 'resourceGroup'

// ------------------------
// Parameters
// ------------------------
@description('The storage account name')
param storageAccountName string = 'wookiestore'

@description('Name of the App Service Plan')
param appServicePlanName string = 'wookietoast-plan'

@description('Name of the Web App')
param webAppName string = 'wookietoast-web'

@description('Location for all resources')
param location string = resourceGroup().location

// ------------------------
// Storage Account
// ------------------------
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

// ------------------------
// App Service Plan (Linux)
// ------------------------
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'       // Basic tier (supports custom domains)
    tier: 'Basic'
  }
  properties: {
    reserved: true    // required for Linux App Service
  }
}

// ------------------------
// Web App
// ------------------------
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'  // Node.js runtime for your express server
    }
  }
}

// ------------------------
// Outputs
// ------------------------
output storageAccountId string = storageAccount.id
output appServicePlanId string = appServicePlan.id
output webAppUrl string = 'https://${webAppName}.azurewebsites.net'
