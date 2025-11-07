# Emergency Fix - App Won't Start

Your dependency environment is broken due to conflicting package versions. Here's the fastest fix:

## Option 1: Force Install (Run in Shell)

Open the **Shell** tab and copy/paste this exact command:

```bash
npm install --legacy-peer-deps --force
```

Press Enter and wait 2-5 minutes. Ignore all warnings. After it completes, click the **Run** button.

---

## Option 2: If That Fails, Use Replit's Package Tool

1. Click on the **Packages** icon in the left sidebar (looks like a cube)
2. Search for and add these packages one by one:
   - `tsx`
   - `vite`
   - `typescript`
   - `esbuild`
3. After all are installed, click **Run**

---

## Option 3: Fresh Start (Nuclear Option)

If nothing else works:

1. **Download your contract files**:
   - Right-click `contracts/` folder → Download
   - Save `contracts/NASCORNClaim.sol` somewhere safe

2. **Fork this Repl**:
   - Click the 3 dots menu (top right)
   - Click "Fork Repl"
   - This creates a clean copy

3. **Copy your contract back** into the new Repl

---

## The Real Problem

Your app has conflicting versions of:
- `@wagmi/core` (2.21.2 vs 2.22.1)
- `ethers` (v5 vs v6)
- Multiple Uniswap packages

These conflicts prevent installation from completing successfully.

---

## What You Should Do After the App Starts

**Focus on deploying your contract via Remix** - forget about the Replit app for now:

1. Go to https://remix.ethereum.org
2. Upload your `NASCORNClaim.sol` file
3. Deploy to Base Sepolia testnet
4. Test the contract manually

Your contract code is solid - the Replit app issues are just development environment problems.

---

## Quick Contract Deployment Checklist

Once you're in Remix:

- [ ] Select Solidity compiler **0.8.20 or higher**
- [ ] Click "Compile NASCORNClaim.sol"
- [ ] In "Deploy & Run", select **`NASCORNClaim`** from dropdown (NOT `IERC20`)
- [ ] Connect MetaMask to Base Sepolia
- [ ] Deploy with constructor params:
  - `_token`: MockERC20 address (or real NASCORN token)
  - `_signer`: Your backend wallet address
- [ ] Fund contract with tokens
- [ ] Test claim function

The app can be fixed later - get your contract deployed first!
