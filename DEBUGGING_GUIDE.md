# Debugging Guide - "Account Already Funded But Not Detected"

**Date**: October 11, 2025
**Issue**: Freighter wallet is funded but app shows "account not found"

---

## 🔍 Step 1: Verify Your Account is Actually Funded

### Option A: Use the Check Script
```bash
node scripts/check-account.js YOUR_PUBLIC_KEY
```

Replace `YOUR_PUBLIC_KEY` with your actual Freighter address (starts with G).

**Expected Output if Funded**:
```
✅ Account FOUND on testnet!

Account Details:
  Account ID: GCKFBE...
  Sequence: 123456
  Subentry Count: 0

Balances:
  💰 XLM: 10000.00

Explorer URL:
https://stellar.expert/explorer/testnet/account/GCKFBE...
```

**Expected Output if NOT Funded**:
```
❌ Account NOT FOUND on testnet

This account needs to be activated.

To activate it, visit:
https://friendbot.stellar.org?addr=GCKFBE...
```

### Option B: Check Manually via Browser
1. Go to: `https://horizon-testnet.stellar.org/accounts/YOUR_PUBLIC_KEY`
2. If you see JSON data → Account is funded ✅
3. If you see "Resource Missing" (404) → Account is NOT funded ❌

### Option C: Check via Stellar Expert
1. Go to: `https://stellar.expert/explorer/testnet`
2. Enter your public key in the search
3. If account loads → Funded ✅
4. If "Account not found" → NOT funded ❌

---

## 🐛 Step 2: Check Browser Console Logs

### Open Developer Console
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I`
- **Firefox**: Press `F12` or `Ctrl+Shift+K`
- **Safari**: Press `Cmd+Option+I`

### Look for These Messages

**If account IS funded, you should see**:
```
🔍 Checking account status for: GCKFBE...
✅ Account found on network!
  Balance: 10000 XLM
  Sequence: 123456
```

**If account is NOT funded, you'll see**:
```
🔍 Checking account status for: GCKFBE...
⚠️ Account not found on testnet: GCKFBE...
  This account needs to be funded to activate it
```

### Look for Network Errors

**If you see network errors**:
```
❌ Error checking account: NetworkError
  Error type: TypeError
  Error message: Failed to fetch
  Response status: undefined
```

This means:
- Internet connection issue
- CORS problem (unlikely with Horizon)
- Horizon testnet is down (rare)

---

## 🔧 Step 3: Common Issues & Fixes

### Issue 1: Wrong Network Selected in Freighter

**Symptoms**: Account shows balance in Freighter but app says "not found"

**Cause**: Freighter is on mainnet, app is checking testnet

**Solution**:
1. Open Freighter extension
2. Click network selector (top right)
3. Select "Testnet"
4. Refresh the page
5. Try again

### Issue 2: Different Account in Freighter

**Symptoms**: You funded account A, but Freighter is now using account B

**Cause**: Freighter allows multiple accounts

**Solution**:
1. Open Freighter extension
2. Check which account is active (shown at top)
3. If wrong account, click account selector
4. Switch to the funded account
5. Refresh the page
6. Try again

### Issue 3: Friendbot Didn't Actually Work

**Symptoms**: Clicked Friendbot but account still shows as not found

**Cause**: Friendbot failed silently or transaction didn't propagate

**Solution**:
1. Go to https://friendbot.stellar.org
2. Manually enter your public key
3. Click "Get test network lumens"
4. Wait 10-15 seconds
5. Check using the verification script: `node scripts/check-account.js YOUR_KEY`
6. If still not funded, try a different browser

### Issue 4: Caching Problem

**Symptoms**: Account was just funded but app still shows old status

**Cause**: Browser or app caching the "not found" result

**Solution**:
1. Hard refresh the page: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache for this site
3. Close and reopen browser
4. Try in incognito/private mode

### Issue 5: Horizon API Delay

**Symptoms**: Just funded account but Horizon doesn't show it yet

**Cause**: Network propagation delay (rare but possible)

**Solution**:
1. Wait 30 seconds
2. Try again
3. If still not working after 1 minute, check Stellar status: https://status.stellar.org

---

## 🧪 Step 4: Test with cURL

Run this command to check if Horizon sees your account:

```bash
curl -s https://horizon-testnet.stellar.org/accounts/YOUR_PUBLIC_KEY | jq
```

(Install `jq` if needed: https://stedolan.github.io/jq/download/)

**If funded**, you'll see:
```json
{
  "id": "GCKFBE...",
  "account_id": "GCKFBE...",
  "sequence": "123456",
  "balances": [
    {
      "balance": "10000.0000000",
      "asset_type": "native"
    }
  ]
}
```

**If NOT funded**, you'll see:
```json
{
  "type": "https://stellar.org/horizon-errors/not_found",
  "title": "Resource Missing",
  "status": 404
}
```

---

## 🔍 Step 5: Debug the App Code

### Add Console Logging

Open browser console and type:

```javascript
// Get your public key from Freighter
window.freighterApi.getAddress().then(result => {
  console.log('Freighter address:', result.address);

  // Check account status
  fetch(`https://horizon-testnet.stellar.org/accounts/${result.address}`)
    .then(r => r.json())
    .then(data => console.log('Account data:', data))
    .catch(err => console.error('Account error:', err));
});
```

This will show you exactly what Horizon returns for your account.

---

## 📋 Troubleshooting Checklist

Go through this checklist:

- [ ] Verified account is funded via Stellar Expert
- [ ] Checked Freighter is on "Testnet" network
- [ ] Confirmed correct account is selected in Freighter
- [ ] Cleared browser cache and hard refreshed
- [ ] Checked browser console for error messages
- [ ] Tried in incognito/private mode
- [ ] Waited at least 30 seconds after funding
- [ ] Verified internet connection is working
- [ ] Checked Stellar status page (no outages)
- [ ] Tried manual Friendbot funding

---

## 🆘 If Nothing Works

### Get Your Public Key

1. Open Freighter extension
2. Click on your account name
3. Click "Copy Address"
4. Public key copied to clipboard (starts with G)

### Share Debug Info

If issue persists, share these details:

1. **Your public key** (safe to share, it's public)
2. **Stellar Expert URL**: https://stellar.expert/explorer/testnet/account/YOUR_KEY
3. **Console logs** (screenshot or copy/paste)
4. **Network selected** in Freighter (Testnet or Mainnet?)
5. **When account was funded** (just now, yesterday, etc.)

### Manual Verification Commands

```bash
# Check account exists
curl https://horizon-testnet.stellar.org/accounts/YOUR_KEY

# Check via laboratory
# Visit: https://laboratory.stellar.org/#explorer
# Enter your public key
# Select "Testnet"
# Click "Load Account"
```

---

## 🔄 Fresh Start Procedure

If you want to start completely fresh:

### Option 1: New Freighter Account
1. Open Freighter
2. Click account selector
3. Click "Add Account"
4. Create new account
5. Copy new address
6. Fund it with Friendbot
7. Try transaction

### Option 2: Reset Everything
1. Close browser completely
2. Reopen browser
3. Clear all site data for localhost
4. Reopen app
5. Connect Freighter
6. Should detect funded account correctly

---

## 💡 Understanding the Flow

When you click "Sign Transaction", the app does this:

```
1. Connect to Freighter ✓
   └─> Get your public key

2. Check account status 🔍
   └─> Query: horizon-testnet.stellar.org/accounts/YOUR_KEY
       ├─> 200 OK: Account exists ✅
       └─> 404 Not Found: Account doesn't exist ❌

3a. If account exists (200):
   └─> Continue to trustline check

3b. If account doesn't exist (404):
   └─> Show "Activate Account" button
       └─> Call Friendbot
           └─> Retry from step 2
```

The issue happens at step 2. Either:
- Horizon actually returns 404 (account not funded)
- Network request fails
- Wrong account being checked
- Caching shows old 404 result

---

## 🎯 Quick Fixes to Try

### Fix 1: Force Refresh
Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Fix 2: Disable Cache in DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Keep DevTools open
5. Refresh page
6. Try transaction

### Fix 3: Test in Incognito
1. Open incognito/private window
2. Go to your app
3. Connect Freighter
4. Try transaction
5. If it works → caching issue in main browser

### Fix 4: Clear Specific Cache
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

### Fix 5: Try Different Browser
Sometimes helps if it's a browser-specific bug

---

## 📞 Contact & Support

If you've tried everything and it still doesn't work:

1. Share your public key (it's public, safe to share)
2. Share the output of: `node scripts/check-account.js YOUR_KEY`
3. Share browser console screenshot
4. Share Freighter network selection screenshot

This will help diagnose the exact issue.

---

**Remember**: The public key is PUBLIC. It's safe to share for debugging. Never share your secret key/seed phrase!
