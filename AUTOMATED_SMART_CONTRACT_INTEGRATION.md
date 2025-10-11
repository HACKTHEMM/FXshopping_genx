# Automated Smart Contract Integration

## Overview
The FX Shopping platform now features **fully automated smart contract deployment and integration**. Users can seamlessly use the app without any manual setup - the smart contract is deployed automatically when needed.

## How It Works

### 1. **Automatic Detection**
- App checks if Route Registry contract is already deployed
- If not found, automatically triggers deployment process

### 2. **Seamless Deployment**
- Builds Rust contract from source
- Optimizes WASM for deployment
- Deploys to Stellar testnet
- Saves contract ID for future use

### 3. **Integrated User Flow**
```
User selects route → Auto-deploy contract → Register route → Execute transaction → Finalize route
```

## User Experience

### **Before (Manual Setup Required)**
1. Install Rust
2. Install Soroban CLI
3. Configure testnet
4. Generate account
5. Fund account
6. Deploy contract manually
7. Set environment variables
8. Use the app

### **After (Fully Automated)**
1. Use the app - everything happens automatically!

## Technical Implementation

### **Auto-Deployment System**
```typescript
// lib/auto-contract-deployment.ts
export async function ensureContractDeployed(): Promise<DeploymentResult> {
  // Check if already deployed
  if (isContractDeployed()) {
    return { success: true, contractId: getContractId() };
  }
  
  // Auto-deploy if needed
  return await autoDeployContract();
}
```

### **Smart Contract Integration**
```typescript
// In Routes.tsx - handleSelectRoute
const deployment = await ensureContractDeployed();
if (deployment.success) {
  const attestationHash = await registerRouteWithContract(route, userPublicKey);
  // ... continue with transaction
}
```

### **UI Feedback**
- Purple status bar shows deployment progress
- "Deploying smart contract..." → "Smart contract deployed successfully"
- Smart contract button appears next to Stellar Explorer link
- Attestation hash displayed with status

## Contract Functions

### **Route Registration (Before Transaction)**
```rust
pub fn register_route(
    env: Env,
    route_id: String,
    expected_net: i128,
    sender: Address,
) -> String
```

### **Route Finalization (After Transaction)**
```rust
pub fn finalize_route(
    env: Env,
    route_id: String,
    tx_hash: BytesN<32>,
    actual_net: i128,
) -> i128
```

## Deployment Process

### **Automatic Steps**
1. **Check Prerequisites**: Rust, Cargo, Soroban CLI
2. **Build Contract**: `cargo build --target wasm32-unknown-unknown --release`
3. **Optimize WASM**: `soroban contract optimize`
4. **Deploy to Testnet**: `soroban contract deploy`
5. **Save Contract ID**: Store in `.contract-id` file
6. **Update Environment**: Add to `.env.local`

### **Error Handling**
- Graceful fallback if deployment fails
- Transaction continues without attestation
- User sees clear error messages
- No blocking of core functionality

## User Interface

### **Deployment Status**
```
🟣 Deploying smart contract...
🟣 Smart contract deployed successfully
```

### **Success Display**
```
✅ Transaction Hash: ABC123...
[View on Stellar Explorer →] [View Smart Contract →]

Route Attestation:
attestation_route123_1234567890
✅ Route registered and finalized on-chain
```

### **Smart Contract Button**
- Blue button next to green Stellar Explorer button
- Links to contract explorer: `https://stellar.expert/explorer/testnet/contract/CONTRACT_ID`
- Shows attestation details and status

## Benefits

### **For Users**
- **Zero Setup**: Just use the app
- **Transparency**: See all contract interactions
- **Audit Trail**: Immutable route records
- **Professional UX**: Seamless integration

### **For Developers**
- **No Manual Deployment**: Everything automated
- **Error Recovery**: Graceful fallbacks
- **Environment Management**: Auto-configured
- **Monitoring**: Clear status indicators

## File Structure

```
lib/
├── auto-contract-deployment.ts    # Auto-deployment logic
├── smart-contract.ts              # Contract integration
└── stellar-transaction.ts         # Transaction building

contracts/
└── route-registry/
    ├── src/lib.rs                 # Rust contract source
    ├── Cargo.toml                 # Dependencies
    └── src/test.rs                # Contract tests

scripts/
├── setup-smart-contract-environment.js  # Full setup script
├── deploy-route-registry-contract.ps1   # PowerShell deployment
└── deploy-route-registry-contract.sh     # Bash deployment
```

## Environment Variables

### **Automatic Setup**
```env
NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHXKS3J2V
```

### **Manual Override**
If you want to use a specific contract:
1. Set `NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID` in `.env.local`
2. App will use your contract instead of auto-deploying

## Troubleshooting

### **Common Issues**

1. **"Rust not found"**
   - App will attempt to install Rust automatically
   - Manual install: https://rustup.rs/

2. **"Soroban CLI not found"**
   - App will attempt to install Soroban CLI
   - Manual install: `cargo install --locked soroban-cli`

3. **"Contract deployment failed"**
   - Check internet connection
   - Verify testnet access
   - Check account funding

4. **"Account not funded"**
   - App will attempt to fund with friendbot
   - Manual funding: `curl "https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY"`

### **Manual Setup (If Needed)**
```bash
# Run the full setup script
node scripts/setup-smart-contract-environment.js
```

## Production Considerations

### **Security**
- Use proper key management
- Implement access controls
- Validate all inputs

### **Performance**
- Cache contract deployments
- Optimize WASM size
- Monitor gas costs

### **Monitoring**
- Track deployment success rates
- Monitor contract usage
- Alert on failures

## Next Steps

1. **Test the Integration**: Use the app and verify auto-deployment
2. **Monitor Performance**: Check deployment times and success rates
3. **Optimize**: Improve error handling and user feedback
4. **Scale**: Prepare for mainnet deployment

## Support

For issues with:
- **Auto-deployment**: Check console logs and error messages
- **Contract interaction**: Verify contract ID and network
- **UI display**: Check browser console for errors
- **Manual setup**: Use the setup script as fallback

The automated smart contract integration provides a seamless, professional experience where users can focus on using the app rather than managing infrastructure.
