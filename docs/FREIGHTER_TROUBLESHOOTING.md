# 🔧 Freighter Transaction Signing Troubleshooting

**Error:** "Failed to sign transaction: Failed to sign transaction"

This error occurs when Freighter can't sign the transaction. Here are the most common causes and solutions:

---

## ✅ **Quick Fixes (Try These First)**

### 1. **Verify Network Setting**
- Open Freighter wallet
- Check the network indicator at the top
- It MUST say **"TESTNET"** (not "PUBLIC" or "MAINNET")
- If it says "PUBLIC", go to Settings → Network → Select "Testnet"

### 2. **Refresh the Page**
- Close any pending Freighter popups
- Refresh your browser (F5 or Ctrl+R)
- Try the transaction again

### 3. **Check Browser Console**
With the improved error handling, you should now see more details:
- Press F12 to open browser console
- Look for messages starting with "❌"
- The actual error message from Freighter will be shown

---

## 🔍 **Common Issues & Solutions**

### Issue 1: Network Mismatch
**Error:** "Network mismatch. Please ensure Freighter is on Testnet."

**Solution:**
1. Open Freighter
2. Click Settings (⚙️)
3. Scroll to "Network"
4. Select "Testnet"
5. Try transaction again

---

### Issue 2: User Cancelled
**Error:** "Transaction cancelled by user"

**Solution:**
- You clicked "Reject" or "Cancel" in Freighter popup
- Try the transaction again
- When Freighter popup appears, click **"Approve"**

---

### Issue 3: Insufficient Balance
**Error:** "Insufficient INRTEST balance"

**Solution:**
Check your Freighter wallet:
- Open Freighter
- Check INRTEST balance
- You need at least the amount you're trying to send
- If balance is low, run:
  ```bash
  node scripts/send-test-tokens.js YOUR_PUBLIC_KEY 10000
  ```

---

### Issue 4: No Trustline
**Error:** "Trustline not established for this asset"

**Solution:**
You need to add the trustline again:
1. Open Freighter
2. Go to "Manage Assets"
3. Add INRTEST:
   - Asset Code: `INRTEST`
   - Issuer: `GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC`
4. Approve the trustline transaction

---

### Issue 5: Freighter Popup Not Appearing
**Symptoms:**
- Transaction hangs
- No Freighter popup shows

**Solutions:**
1. **Check for blocked popup:**
   - Look for popup blocker icon in browser address bar
   - Allow popups for localhost:3000

2. **Freighter extension disabled:**
   - Check browser extensions
   - Make sure Freighter is enabled

3. **Close and reopen Freighter:**
   - Click Freighter icon
   - Close the popup
   - Try transaction again

---

### Issue 6: XDR Building Error
**Error:** Something about "invalid XDR" or "sequence"

**Solutions:**
1. **Refresh the page** - sequence numbers can get out of sync
2. **Check account exists:**
   ```bash
   curl "https://horizon-testnet.stellar.org/accounts/YOUR_PUBLIC_KEY"
   ```
   Should return account details (not 404)

---

### Issue 7: Transaction Timeout
**Error:** "Signing timeout. Please try again."

**Solutions:**
1. Freighter popup might be hidden behind other windows
2. Check taskbar for Freighter popup
3. Close popup and try again
4. Restart browser if problem persists

---

## 🧪 **Debugging Steps**

### Step 1: Verify Freighter is Working
Open browser console (F12) and run:
```javascript
import('@stellar/freighter-api').then(async (freighter) => {
  const result = await freighter.isConnected();
  console.log('Freighter connected:', result);
});
```

Should show: `{ isConnected: true }`

---

### Step 2: Check Network
```javascript
import('@stellar/freighter-api').then(async (freighter) => {
  const network = await freighter.getNetwork();
  console.log('Current network:', network);
});
```

Should show: `{ network: 'TESTNET', networkPassphrase: 'Test SDF Network ; September 2015' }`

---

### Step 3: Verify Your Account
```bash
curl "https://horizon-testnet.stellar.org/accounts/GCFQNS6RDTHO2SP7CNYZJ3IU2S3MI5KERU2ITXVZXBQBCLD6IKHKOPKJ"
```

Should return your account details with balances.

---

### Step 4: Check Trustlines
In the response from Step 3, look for "balances" array:
```json
"balances": [
  {
    "asset_code": "INRTEST",
    "asset_issuer": "GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC",
    "balance": "9000.0000000"
  },
  ...
]
```

Both INRTEST and USDTEST should be present with balances > 0.

---

## 📝 **What to Check in Browser Console**

After the fix, you'll see detailed error messages:

**Good output:**
```
🔌 Connecting to Freighter wallet...
✅ Connected: GCFQNS6R...
🔍 Checking trustline for INRTEST
✅ Trustline exists
💰 Checking balance for INRTEST
✅ Balance sufficient: 9000 INRTEST
🏗️ Building transaction...
✅ Transaction built
✍️ Requesting signature from Freighter...
✅ Transaction signed successfully
📡 Submitting transaction to Stellar testnet...
✅ Transaction submitted successfully!
```

**Error output (improved):**
```
🔌 Connecting to Freighter wallet...
✅ Connected: GCFQNS6R...
...
✍️ Requesting signature from Freighter...
❌ Freighter signing error details: [actual error details]
❌ Freighter signing error: Error: [user-friendly message]
```

---

## 🚀 **After Fixing the Error**

Once you see the actual error message in the console:

1. **Match it to one of the issues above**
2. **Apply the solution**
3. **Try the transaction again**

The improved error handling will now show you:
- The exact error from Freighter
- User-friendly error messages
- Specific guidance based on error type

---

## 🆘 **Still Not Working?**

If you've tried all the above and still get errors:

1. **Restart everything:**
   - Close Freighter
   - Stop dev server (Ctrl+C)
   - Restart dev server: `npm run dev`
   - Reopen browser
   - Reconnect Freighter

2. **Check browser console for the detailed error**
   - The error message will now be much more specific
   - Look for the "❌ Freighter signing error details:" log

3. **Try a different browser:**
   - Sometimes browser extensions can conflict
   - Try Chrome/Brave if on Firefox, or vice versa

4. **Verify test tokens:**
   ```bash
   node scripts/send-test-tokens.js YOUR_PUBLIC_KEY 10000
   ```

---

## 🎯 **Most Likely Causes**

Based on the generic error you got, it's probably one of these:

1. **Network mismatch** (90% of cases)
   - Freighter is on mainnet, app expects testnet
   - **Fix:** Switch Freighter to Testnet

2. **User cancelled** (5% of cases)
   - Clicked reject in popup
   - **Fix:** Click approve next time

3. **Account/trustline issue** (5% of cases)
   - Missing trustline or insufficient balance
   - **Fix:** Check trustlines and balance

---

**Try the transaction again now!** The improved error handling will give you much better feedback about what's wrong.
