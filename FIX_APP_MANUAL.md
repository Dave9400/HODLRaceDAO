# Manual Fix for App Crash - Run These Commands

Your Replit environment is having dependency conflicts due to Hardhat. Here's how to fix it manually.

## Open the Shell Tab in Replit

Click on the "Shell" tab at the bottom of your Replit workspace, then run these commands one at a time:

### Step 1: Force Clean Install (This Will Take A Few Minutes)

```bash
rm -rf node_modules package-lock.json
```

Wait for this to complete (may take 1-2 minutes).

### Step 2: Reinstall All Packages

```bash
npm install --legacy-peer-deps
```

This will take 2-5 minutes. You'll see warnings about Hardhat - that's OK, ignore them.

### Step 3: Restart the Application

After the install completes, the app should auto-restart. If not, click the "Run" button at the top of Replit.

---

## Alternative: Simpler Approach (If Above Doesn't Work)

If the above commands hang or fail, try this smaller fix:

### Just Install Vite

```bash
npm install vite@5.4.20 --legacy-peer-deps --force
```

Then restart the app by clicking the "Run" button.

---

## What Caused This?

The issue was caused by incompatible Hardhat dependencies that were added for smart contract testing. Hardhat doesn't work well in the Replit environment, so it's been causing package installation problems.

---

## After the App Starts

Once your app is running again:

1. The frontend will load normally
2. You can continue working on your claim contract deployment
3. Use Remix IDE for contract deployment (not Hardhat in Replit)

---

## If You Still Have Issues

If the app still won't start after trying both approaches above:

1. Copy your `contracts/` folder somewhere safe
2. Fork this Repl to create a fresh copy
3. Copy your contracts back into the new Repl

---

## Contract Deployment

Remember: Your `APEXClaim.sol` contract is ready to deploy. Use Remix IDE:
1. Go to https://remix.ethereum.org
2. Create new file `APEXClaim.sol`
3. In the CONTRACT dropdown, select `APEXClaim` (NOT `IERC20`)
4. Deploy to Base Sepolia testnet

See `REMIX_DEPLOYMENT_GUIDE.md` for complete deployment instructions.
