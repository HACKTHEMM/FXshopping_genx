# StellarFX Shopper API Documentation

## Overview

The StellarFX Shopper API provides endpoints for intelligent cross-border payment routing, execution, and monitoring. It integrates with the Stellar blockchain and various FX providers to find the most cost-effective payment routes.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Currently, the API operates without authentication for demo purposes. In production, implement proper API key authentication.

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Search Routes**: 60 requests per minute per IP
- **Execute Payment**: 10 requests per minute per IP

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE"
}
```

## Endpoints

### 1. Search Payment Routes

Find the best payment routes for a given currency pair and amount.

**Endpoint**: `POST /api/routes/search`

**Request Body**:
```json
{
  "sourceCurrency": "USD",
  "targetCurrency": "INR", 
  "sourceAmount": 1000,
  "sourceAccount": "GCKFBEIYTKPQY5H...", // Optional
  "targetAccount": "GBKFBEIYTKPQY5H..." // Optional
}
```

**Response**:
```json
{
  "success": true,
  "query": {
    "sourceCurrency": "USD",
    "targetCurrency": "INR",
    "sourceAmount": 1000
  },
  "routes": [
    {
      "id": "stellar_onchain_1234567890_0",
      "type": "stellar_onchain",
      "sourceCurrency": "USD",
      "targetCurrency": "INR",
      "sourceAmount": 1000,
      "targetAmount": 83250,
      "fees": {
        "stellarFee": 0.00001,
        "totalFees": 0.00001
      },
      "netRecipientAmount": 83249.99999,
      "provider": {
        "name": "Stellar Network",
        "address": "native"
      },
      "estimatedTime": "instant",
      "confidence": 99,
      "requiresKYC": false
    },
    {
      "id": "offchain_wise_1234567890_0",
      "type": "offchain_fx",
      "sourceCurrency": "USD",
      "targetCurrency": "INR",
      "sourceAmount": 1000,
      "targetAmount": 83250,
      "fees": {
        "stellarFee": 0,
        "fxSpread": 2.5,
        "totalFees": 2.5
      },
      "netRecipientAmount": 83247.5,
      "provider": {
        "name": "Wise",
        "anchorInfo": {
          "code": "WISE",
          "domain": "https://api.wise.com"
        }
      },
      "estimatedTime": "1-2 business days",
      "confidence": 95,
      "requiresKYC": true
    }
  ],
  "summary": {
    "totalRoutes": 2,
    "bestRoute": { /* best route object */ },
    "savings": {
      "vsWorst": 2.49999,
      "vsAverage": 1.24999
    },
    "routeTypes": {
      "stellar": 1,
      "offchain": 1
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Execute Payment

Execute a payment using a selected route.

**Endpoint**: `POST /api/routes/execute`

**Request Body**:
```json
{
  "routeId": "stellar_onchain_1234567890_0",
  "sourceAccount": "GCKFBEIYTKPQY5H...",
  "targetAccount": "GBKFBEIYTKPQY5H...",
  "memo": "Payment via StellarFX Shopper",
  "sourceCurrency": "USD",
  "targetCurrency": "INR",
  "sourceAmount": 1000,
  "targetAmount": 83250,
  "routeType": "stellar_onchain"
}
```

**Response (Stellar)**:
```json
{
  "success": true,
  "transaction": {
    "id": "stellar_onchain_1234567890_0",
    "hash": "a1b2c3d4e5f6789...",
    "sourceAccount": "GCKFBEIYTKPQY5H...",
    "targetAccount": "GBKFBEIYTKPQY5H...",
    "sourceCurrency": "USD",
    "targetCurrency": "INR",
    "sourceAmount": 1000,
    "targetAmount": 83250,
    "status": "success",
    "network": "testnet",
    "timestamp": "2024-01-15T10:30:00Z",
    "fees": {
      "stellarFee": 0.00001,
      "totalFees": 0.00001
    },
    "memo": "Payment via StellarFX Shopper"
  },
  "execution": {
    "method": "stellar_path_payment",
    "estimatedTime": "instant",
    "actualTime": "2.1s",
    "confirmationBlocks": 1
  }
}
```

**Response (Off-chain)**:
```json
{
  "success": true,
  "transaction": {
    "id": "offchain_wise_1234567890_0",
    "providerTransactionId": "provider_tx_123...",
    "stellarTransactionHash": "stellar_tx_456...",
    "sourceAccount": "GCKFBEIYTKPQY5H...",
    "targetAccount": "GBKFBEIYTKPQY5H...",
    "sourceCurrency": "USD",
    "targetCurrency": "INR",
    "sourceAmount": 1000,
    "targetAmount": 83250,
    "status": "processing",
    "network": "offchain",
    "timestamp": "2024-01-15T10:30:00Z",
    "fees": {
      "providerFee": 2.5,
      "stellarFee": 0.00001,
      "totalFees": 2.50001
    },
    "memo": "Payment via StellarFX Shopper"
  },
  "execution": {
    "method": "offchain_fx_provider",
    "estimatedTime": "1-2 business days",
    "actualTime": "processing",
    "confirmationBlocks": null
  },
  "tracking": {
    "providerTrackingUrl": "https://provider.example.com/track/provider_tx_123",
    "stellarExplorerUrl": "https://stellar.expert/explorer/testnet/tx/stellar_tx_456"
  }
}
```

### 3. Check Transaction Status

Get the current status of a payment transaction.

**Endpoint**: `GET /api/routes/status`

**Query Parameters**:
- `transactionId` (optional): Provider transaction ID
- `transactionHash` (optional): Stellar transaction hash

**Example**: `/api/routes/status?transactionHash=a1b2c3d4e5f6789...`

**Response**:
```json
{
  "success": true,
  "transaction": {
    "id": "stellar_onchain_1234567890_0",
    "hash": "a1b2c3d4e5f6789...",
    "status": "success",
    "sourceAccount": "GCKFBEIYTKPQY5H...",
    "targetAccount": "GBKFBEIYTKPQY5H...",
    "sourceCurrency": "USD",
    "targetCurrency": "INR",
    "sourceAmount": 1000,
    "targetAmount": 83250,
    "fees": {
      "stellarFee": 0.00001,
      "providerFee": 0,
      "totalFees": 0.00001
    },
    "netRecipientAmount": 83249.99999,
    "timestamp": "2024-01-15T10:30:00Z",
    "confirmations": 1,
    "network": "testnet",
    "memo": "Payment via StellarFX Shopper"
  },
  "execution": {
    "method": "stellar_path_payment",
    "estimatedTime": "instant",
    "actualTime": "2.1s",
    "confirmationBlocks": 1
  },
  "tracking": {
    "stellarExplorerUrl": "https://stellar.expert/explorer/testnet/tx/a1b2c3d4e5f6789",
    "providerTrackingUrl": null
  }
}
```

### 4. Get Supported Currencies

Get a list of all supported currencies and their information.

**Endpoint**: `GET /api/currencies`

**Response**:
```json
{
  "success": true,
  "currencies": [
    {
      "code": "USD",
      "name": "US Dollar",
      "symbol": "$",
      "type": "fiat",
      "decimals": 2,
      "icon": "https://flagcdn.com/w20/us.png",
      "network": "offchain",
      "description": "United States Dollar"
    },
    {
      "code": "XLM",
      "name": "Stellar Lumens",
      "symbol": "XLM",
      "type": "native",
      "decimals": 7,
      "icon": "https://stellar.expert/explorer/public/img/assets/XLM.png",
      "network": "stellar",
      "description": "Native Stellar cryptocurrency"
    }
  ],
  "popularPairs": [
    {
      "from": "USD",
      "to": "INR",
      "name": "USD to INR",
      "volume": "high"
    }
  ],
  "exchangeRates": {
    "timestamp": "2024-01-15T10:30:00Z",
    "base": "USD",
    "rates": {
      "USD": 1.0,
      "EUR": 0.85,
      "GBP": 0.73,
      "INR": 83.25,
      "PHP": 55.50,
      "XLM": 0.12,
      "USDC": 1.0
    }
  },
  "limits": {
    "minimum": 1,
    "maximum": 1000000,
    "default": 100
  },
  "supportedNetworks": [
    {
      "name": "Stellar",
      "code": "stellar",
      "type": "blockchain",
      "description": "Stellar blockchain network"
    },
    {
      "name": "Off-chain",
      "code": "offchain",
      "type": "traditional",
      "description": "Traditional banking and FX providers"
    }
  ]
}
```

### 5. Health Check

Check the health status of the API and its dependencies.

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "api": {
      "status": "healthy",
      "latency": 15
    },
    "stellar": {
      "status": "healthy",
      "latency": 250,
      "network": "testnet",
      "horizonUrl": "https://horizon-testnet.stellar.org"
    },
    "database": {
      "status": "healthy",
      "latency": 5
    }
  },
  "uptime": 86400,
  "memory": {
    "used": 52428800,
    "total": 134217728
  },
  "environment": "production"
}
```

## Route Types

### Stellar On-chain Routes
- **Type**: `stellar_onchain`
- **Description**: Direct path payments through the Stellar network
- **Fees**: Stellar network fees only
- **Speed**: Instant
- **KYC**: Not required
- **Limits**: Subject to Stellar network limits

### Stellar Anchor Routes
- **Type**: `stellar_anchor`
- **Description**: Payments through Stellar anchors (regulated entities)
- **Fees**: Anchor fees + Stellar network fees
- **Speed**: Instant to 1-2 business days
- **KYC**: Usually required
- **Limits**: Subject to anchor policies

### Off-chain FX Routes
- **Type**: `offchain_fx`
- **Description**: Traditional FX provider routes
- **Fees**: Provider fees + FX spreads
- **Speed**: 1-3 business days
- **KYC**: Usually required
- **Limits**: Subject to provider policies

## Status Codes

### Transaction Statuses
- `pending`: Transaction is pending confirmation
- `processing`: Transaction is being processed
- `success`: Transaction completed successfully
- `failed`: Transaction failed
- `completed`: Transaction completed (for off-chain payments)

### API Status Codes
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `503`: Service Unavailable

## SDK Examples

### JavaScript/TypeScript
```typescript
// Search for routes
const response = await fetch('/api/routes/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceCurrency: 'USD',
    targetCurrency: 'INR',
    sourceAmount: 1000
  })
});

const data = await response.json();
const bestRoute = data.routes[0];

// Execute payment
const executionResponse = await fetch('/api/routes/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    routeId: bestRoute.id,
    sourceAccount: 'GCKFBEIYTKPQY5H...',
    targetAccount: 'GBKFBEIYTKPQY5H...',
    routeType: bestRoute.type
  })
});
```

### Python
```python
import requests

# Search for routes
response = requests.post('/api/routes/search', json={
    'sourceCurrency': 'USD',
    'targetCurrency': 'INR',
    'sourceAmount': 1000
})

data = response.json()
best_route = data['routes'][0]

# Execute payment
execution_response = requests.post('/api/routes/execute', json={
    'routeId': best_route['id'],
    'sourceAccount': 'GCKFBEIYTKPQY5H...',
    'targetAccount': 'GBKFBEIYTKPQY5H...',
    'routeType': best_route['type']
})
```

## Webhooks

Coming soon - webhook support for real-time payment status updates.

## Support

For API support and questions:
- Email: api-support@stellarfxshopper.com
- Documentation: https://docs.stellarfxshopper.com
- Status Page: https://status.stellarfxshopper.com
