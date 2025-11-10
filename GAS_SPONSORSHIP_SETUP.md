# Gas Sponsorship Setup Guide

## Overview
Gas sponsorship (gasless transactions) allows users to claim APEX tokens without paying gas fees. This makes your platform incredibly beginner-friendly.

## How It Works
- Coinbase Developer Platform (CDP) provides paymaster services for Base network
- You get **$15,000 in free gas credits** through the Base Gasless Campaign
- Users connecting with Coinbase Smart Wallet get automatic gas sponsorship
- Claims become completely free for your users

## Setup Steps

### 1. Get Your Paymaster URL (5 minutes)

1. **Create Account**: Go to [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) and sign up
2. **Navigate to Paymaster**: Click **Onchain Tools > Paymaster**
3. **Select Network**: 
   - For testing: Choose **Base Sepolia**
   - For production: Choose **Base Mainnet**
4. **Copy Endpoint**: In the **Configuration** tab, copy your **Paymaster & Bundler endpoint** URL
   - It looks like: `https://api.developer.coinbase.com/rpc/v1/base/YOUR_KEY_HERE`

### 2. Whitelist Your Claim Contract

Still in the CDP dashboard:

1. Go to **Contract allowlist** section
2. Click **Add Contract**
3. Enter:
   - **Contract Name**: "APEX Claim Contract"
   - **Contract Address**: Your deployed APEXClaimV2 contract address
   - **Functions to allow**: `claim(address,uint256,uint256,uint256,uint256,bytes)`
4. Click **Save**

### 3. Add Secret to Replit

In your Replit project:

1. Click the **Secrets** tool (🔒 icon in left sidebar)
2. Add a new secret:
   - **Key**: `CDP_PAYMASTER_URL`
   - **Value**: Paste your paymaster endpoint URL from step 1
3. Click **Add Secret**

### 4. Test It Out

1. Restart your Replit workflow
2. Connect with Coinbase Smart Wallet
3. Try claiming tokens - you should see "Sponsored" or "Free" in the transaction UI
4. The transaction completes without requiring ETH for gas!

## Budget & Limits

In the CDP dashboard, you can set:
- **Per-user limits**: How much gas each user can consume
- **Global limits**: Total gas sponsorship budget
- **Time-based limits**: Daily/weekly/monthly caps

This prevents abuse while keeping things free for legitimate users.

## Monitoring

CDP Dashboard shows:
- Real-time gas sponsorship usage
- Number of sponsored transactions
- Per-user gas consumption
- Remaining credits

## Production Recommendations

For production, create a **proxy endpoint** instead of exposing the paymaster URL:

```typescript
// Example proxy (already implemented in server/routes.ts)
app.post("/api/paymaster", async (req, res) => {
  // Add custom logic:
  // - Rate limiting
  // - User verification
  // - Transaction filtering
  
  const response = await fetch(process.env.CDP_PAYMASTER_URL, {
    method: 'POST',
    body: JSON.stringify(req.body),
  });
  
  res.json(await response.json());
});
```

## Need More Credits?

- Base Gasless Campaign offers up to $15k
- Additional funding available through Base Builder Rewards
- Contact CDP support on Discord for limit increases

## Support

- CDP Discord: Join #paymaster channel
- Documentation: [docs.cdp.coinbase.com/paymaster](https://docs.cdp.coinbase.com/paymaster)
- Base Docs: [docs.base.org/identity/smart-wallet/guides/paymasters](https://docs.base.org/identity/smart-wallet/guides/paymasters)

## Status

✅ Backend proxy endpoint created (`/api/paymaster`)  
✅ Infrastructure ready for gas sponsorship  
⏳ Waiting for CDP_PAYMASTER_URL secret  
⏳ Frontend claim component needs update to use experimental hooks

Once you add the `CDP_PAYMASTER_URL` secret, gas sponsorship will be automatically enabled!
