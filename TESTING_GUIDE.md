# 🧪 Freighter Wallet Testing Guide

**Date:** October 10, 2025
**Purpose:** Step-by-step guide to test real Stellar testnet transactions with Freighter wallet

---

## 📋 Prerequisites

Before you can test transactions, you need:

1. ✅ Freighter wallet browser extension
2. ✅ Stellar testnet account with XLM
3. ✅ Trustlines for test assets (INRTEST, USDTEST)
4. ✅ Funded test assets in your wallet

---

## 🦊 Step 1: Install Freighter Wallet

### Install Extension:

**Chrome/Brave/Edge:**
1. Go to: https://www.freighter.app/
2. Click "Add to Chrome" (or your browser)
3. Click "Add Extension"
4. Pin the extension to your toolbar

**Firefox:**
1. Go to: https://addons.mozilla.org/en-US/firefox/addon/freighter/
2. Click "Add to Firefox"
3. Click "Add"

### Initial Setup:

1. Click the Freighter icon in your browser toolbar
2. Choose **"Create new wallet"** (or import if you have one)
3. **IMPORTANT:** Write down your 12-word recovery phrase and store it safely
4. Create a password
5. Click "Confirm"

---

## 🌐 Step 2: Switch to Stellar Testnet

**By default, Freighter uses Mainnet. You MUST switch to Testnet:**

1. Open Freighter wallet
2. Click the **gear icon** (⚙️) in the top right → Settings
3. Scroll down to **"Network"** section
4. Click the dropdown (currently shows "Public")
5. Select **"Testnet"**
6. Confirm the switch

**Verify:** The network indicator at the top should now show "TESTNET"

---

## 💰 Step 3: Fund Your Testnet Account with XLM

You need XLM to:
- Pay network fees (~0.00001 XLM per transaction)
- Create trustlines (~0.5 XLM reserve per trustline)

### Get Free Testnet XLM:

**Method 1: Freighter Built-in Friendbot**
1. Open Freighter
2. Make sure you're on Testnet
3. Click **"Fund with Friendbot"** button (if available)
4. Wait for confirmation

**Method 2: Stellar Laboratory**
1. Copy your public key from Freighter (starts with `G...`)
2. Go to: https://laboratory.stellar.org/#account-creator?network=test
3. Paste your public key
4. Click **"Get test network lumens"**
5. Wait 5-10 seconds
6. Check Freighter - you should have 10,000 XLM

**Method 3: Manual Friendbot API**
```bash
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY_HERE"
```

**Verify:** Freighter should show ~10,000 XLM balance

---

## 🔗 Step 4: Add Trustlines for Test Assets

Trustlines tell the Stellar network you trust a specific asset issuer.

### Test Asset Details:

| Asset Code | Issuer (first 8 chars) | Full Issuer |
|------------|------------------------|-------------|
| **INRTEST** | GAYYZIK2... | `GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC` |
| **USDTEST** | GAYYZIK2... | `GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC` |
| **EURTEST** | GAYYZIK2... | `GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC` |
| **PHPTEST** | GAYYZIK2... | `GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC` |

### Add Trustline via Freighter:

1. Open Freighter wallet
2. Click **"Manage Assets"** or **"Add Asset"**
3. Click **"Add manually"** or **"Custom asset"**
4. Enter:
   - **Asset Code:** `INRTEST`
   - **Issuer:** `GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC`
5. Click **"Add"** or **"Confirm"**
6. Approve the transaction (costs ~0.5 XLM reserve)
7. **Repeat** for USDTEST if needed

**Verify:** You should see INRTEST with 0 balance in your wallet

### Add Trustline via Stellar Laboratory (Alternative):

1. Go to: https://laboratory.stellar.org/#txbuilder?network=test
2. **Source Account:** Paste your public key
3. Click **"Fetch next sequence number"**
4. **Operation Type:** Select "Change Trust"
5. **Asset:** Custom
6. **Asset Code:** `INRTEST`
7. **Issuer Account ID:** `GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC`
8. Leave **Limit** empty (unlimited trust)
9. Click **"Sign in Transaction Signer"**
10. Click **"Sign with Freighter"**
11. Approve in Freighter popup
12. Click **"Submit to Post Transaction endpoint"**

---

## 💵 Step 5: Get Test Assets (INRTEST, USDTEST)

Now you need actual INRTEST tokens to test transactions.

### Option A: Request from Asset Issuer (Recommended)

If you control the issuer account (`GAYYZIK2...`), you can send yourself tokens:

1. Use the issuer's secret key
2. Send payment via Stellar Laboratory or SDK

### Option B: Use Stellar Laboratory to Create Payment

**From Issuer Account to Your Account:**

1. Go to: https://laboratory.stellar.org/#txbuilder?network=test
2. **Source Account:** `GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC` (issuer)
3. Click **"Fetch next sequence number"**
4. **Operation Type:** "Payment"
5. **Destination:** Your Freighter public key
6. **Asset:** Custom
7. **Asset Code:** `INRTEST`
8. **Issuer:** `GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC`
9. **Amount:** `1000` (or any amount)
10. Sign with **issuer's secret key** (not Freighter)
11. Submit

### Option C: Swap XLM for INRTEST on Testnet DEX

If there's liquidity in the orderbook:

1. Use Stellar Laboratory or DEX interface
2. Create a path payment: XLM → INRTEST
3. Sign with Freighter

**Verify:** Freighter should show INRTEST balance (e.g., 1000 INRTEST)

---

## 🧪 Step 6: Test the FX Shopping App

Now you're ready to test real transactions!

### Start the App:

```bash
cd /path/to/fxshopping
npm run dev
```

Open: http://localhost:3000

### Test Transaction Flow:

1. **Fill out the payment form:**
   - **From:** INR
   - **To:** USD
   - **Amount:** 10000 (or any amount less than your INRTEST balance)
   - Click **"Find Routes"**

2. **Review routes:**
   - You should see the Stellar route with **✅ FROM TESTNET** badges
   - Traditional providers will show **📊 ESTIMATED** badges
   - Anchor steps will show **🟣 SIMULATED ANCHOR** badges

3. **Select the Stellar route:**
   - Click **"Select This Route"**
   - The app will automatically:
     - ✅ Connect to Freighter
     - ✅ Check your trustlines
     - ✅ Check your balance
     - ✅ Build transaction XDR
     - ✅ Request signature from Freighter

4. **Approve in Freighter:**
   - A Freighter popup will appear
   - **Review the transaction details carefully:**
     - Operation: Path Payment Strict Send
     - Send: X INRTEST
     - Receive (min): Y USDTEST
     - Fee: 0.00001 XLM
   - Click **"Approve"** or **"Sign"**

5. **Wait for confirmation:**
   - The app will submit the transaction to Horizon
   - You'll see a loading spinner
   - Once confirmed, you'll see:
     - ✅ Transaction hash
     - Link to Stellar Explorer

6. **Verify on Stellar Explorer:**
   - Click the **"View on Stellar Explorer"** link
   - You should see your transaction on https://stellar.expert/explorer/testnet/tx/{hash}
   - Verify:
     - ✅ Status: Success
     - ✅ Operations: Path Payment Strict Send
     - ✅ Source: Your account
     - ✅ Amounts match

7. **Check Freighter Balance:**
   - Open Freighter
   - Your INRTEST balance should have decreased
   - Your USDTEST balance should have increased
   - Your XLM balance should have decreased by ~0.00001

---

## 🐛 Troubleshooting

### Error: "Freighter wallet not found"
- **Solution:** Install Freighter extension and refresh the page

### Error: "Please switch to Stellar Testnet"
- **Solution:** Open Freighter → Settings → Network → Select "Testnet"

### Error: "Please add a trustline for INRTEST"
- **Solution:** Follow Step 4 to add trustline

### Error: "Insufficient INRTEST balance"
- **Solution:** Follow Step 5 to get test tokens
- **Verify:** Check your Freighter wallet shows INRTEST balance > amount you're trying to send

### Error: "User declined access" or "Transaction cancelled"
- **Solution:** You clicked "Reject" in Freighter. Try again and click "Approve"

### Error: "op_low_reserve" or similar
- **Solution:** You need more XLM. Get more from Friendbot (Step 3)

### Error: "Transaction failed: tx_bad_seq"
- **Solution:** Refresh the page and try again (sequence number mismatch)

### Transaction is pending forever
- **Solution:**
  - Check network status: https://status.stellar.org/
  - Wait 5-10 seconds and refresh
  - Check Horizon testnet: https://horizon-testnet.stellar.org/

### Can't see transaction on Stellar Explorer
- **Wait:** Testnet can be slow sometimes (5-10 seconds)
- **Check URL:** Make sure you're on testnet explorer, not mainnet
- **Verify hash:** Copy the transaction hash and search manually

---

## 📊 Verifying Real vs Simulated Data

### What You're Actually Testing on Stellar Testnet:

✅ **REAL:**
- Transaction signing with Freighter
- XDR transaction building
- Path payment operation
- Submission to Horizon testnet
- On-chain settlement in ~5 seconds
- Real orderbook pathfinding
- Real network fees (100 stroops)

🟣 **SIMULATED:**
- Anchor deposit (INR → INRTEST conversion)
- Anchor withdrawal (USDTEST → USD conversion)
- The 1:1 peg assumption

📊 **ESTIMATED:**
- Traditional provider quotes (Wise, MoneyGram, etc.)

### Checking Orderbook Liquidity:

You can verify the actual orderbook depth:

```bash
curl "https://horizon-testnet.stellar.org/order_book?selling_asset_type=credit_alphanum12&selling_asset_code=INRTEST&selling_asset_issuer=GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC&buying_asset_type=credit_alphanum12&buying_asset_code=USDTEST&buying_asset_issuer=GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC"
```

---

## 🎯 Test Scenarios

### Scenario 1: Simple INRTEST → USDTEST Swap
- **Goal:** Test basic path payment
- **Steps:** Send 10,000 INRTEST, receive ~115 USDTEST
- **Expected:** Transaction succeeds in ~5 seconds

### Scenario 2: Insufficient Balance
- **Goal:** Test error handling
- **Steps:** Try to send more INRTEST than you have
- **Expected:** Error: "Insufficient INRTEST balance"

### Scenario 3: No Trustline
- **Goal:** Test trustline validation
- **Steps:** Remove INRTEST trustline, try to transact
- **Expected:** Error: "Please add a trustline for INRTEST"

### Scenario 4: Wrong Network
- **Goal:** Test network validation
- **Steps:** Switch Freighter to mainnet, try to transact
- **Expected:** Error: "Please switch to Stellar Testnet"

### Scenario 5: User Rejection
- **Goal:** Test user cancellation
- **Steps:** Click "Reject" in Freighter popup
- **Expected:** Error: "Transaction cancelled by user"

---

## 🔬 Advanced Testing

### Test Multiple Transactions:

1. Complete a transaction
2. Click **"Start New Transaction"**
3. Repeat with different amounts
4. Verify each transaction on Stellar Explorer

### Test Different Asset Pairs:

1. Add trustline for EURTEST or PHPTEST
2. Get some tokens
3. Try EURTEST → USDTEST
4. Try PHPTEST → INRTEST

### Monitor Network Activity:

Watch your account in real-time:
```bash
# Replace YOUR_PUBLIC_KEY with your Freighter public key
curl "https://horizon-testnet.stellar.org/accounts/YOUR_PUBLIC_KEY/transactions?order=desc&limit=5"
```

---

## 📝 Issuer Account Information

If you need to access the issuer account to fund test tokens:

**Issuer Public Key:**
```
GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC
```

**To get the secret key:**
- Check the script: `scripts/setup-stellar-assets.js`
- Or regenerate the account if needed

**⚠️ IMPORTANT:** This is a TESTNET account. Never use testnet keys on mainnet!

---

## ✅ Success Checklist

Before testing, make sure:

- [ ] Freighter wallet installed
- [ ] Switched to Testnet network
- [ ] Account funded with XLM (>2 XLM)
- [ ] Trustline added for INRTEST
- [ ] Test tokens received (INRTEST balance > 0)
- [ ] App running on localhost:3000
- [ ] Browser console open (F12) to see logs

---

## 🎓 What You'll Learn

By completing this testing guide, you'll understand:

1. How Stellar testnet works
2. How trustlines enable custom assets
3. How path payments find optimal routes
4. How Freighter wallet signs transactions
5. How to verify transactions on-chain
6. The difference between real and simulated data in the app

---

## 📚 Additional Resources

- **Freighter Documentation:** https://docs.freighter.app/
- **Stellar Laboratory:** https://laboratory.stellar.org/
- **Stellar Testnet Explorer:** https://stellar.expert/explorer/testnet
- **Horizon Testnet API:** https://horizon-testnet.stellar.org/
- **SEP-24 Spec:** https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
- **Stellar SDK Docs:** https://stellar.github.io/js-stellar-sdk/

---

## 🚀 Next Steps After Testing

Once you've successfully tested transactions:

1. **Try different routes** - Compare Stellar vs traditional providers
2. **Test edge cases** - Large amounts, low liquidity scenarios
3. **Review transparency** - Verify all badges and disclaimers are clear
4. **Phase 3: Stellar Oracle Integration** - Replace 1:1 peg with real rates
5. **Phase 4: Smart Contract Deployment** - Add on-chain attestation

---

**Happy Testing! 🎉**

If you encounter issues not covered in the troubleshooting section, check the browser console (F12) for detailed error messages.
