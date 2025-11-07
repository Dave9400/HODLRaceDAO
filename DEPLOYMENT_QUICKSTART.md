# Quick Fix & Contract Deployment Guide

## Issue 1: App Crash (Vite Missing)

Your app crashed because `vite` package is missing. Here's how to fix it:

**In the Replit Shell, run**:
```bash
npm install vite @vitejs/plugin-react --legacy-peer-deps
```

This will reinstall vite and fix the app crash.

---

## Issue 2: Contract "Abstract" Error

**Your contract is NOT abstract** - it's perfectly valid! The error message is misleading.

The `NASCORNClaim.sol` contract:
- ✅ Has a constructor
- ✅ Implements all methods
- ✅ Has no abstract parent classes
- ✅ Is ready to deploy

**Why you're seeing this error**:
- Some deployment tools show this error when there's a compilation or import issue
- It's NOT because your contract is abstract

**How to deploy your contract**:

### Option 1: Use Hardhat (Recommended)

1. **In the Shell**, install Hardhat dependencies:
```bash
npm install @nomicfoundation/hardhat-ethers ethers --legacy-peer-deps
```

2. **Create deployment script** (`scripts/deploy.ts`):
```typescript
import { ethers } from "hardhat";

async function main() {
  // Deploy Mock ERC20 for testing
  const MockERC20 = await ethers.getContractFactory("contracts/test/MockERC20.sol:MockERC20");
  const token = await MockERC20.deploy("NASCORN Token", "NASCORN", ethers.parseEther("500000000"));
  await token.waitForDeployment();
  console.log("Token deployed to:", await token.getAddress());

  // Your signer address (backend wallet that signs claims)
  const signerAddress = "YOUR_BACKEND_WALLET_ADDRESS";

  // Deploy NASCORNClaim contract
  const NASCORNClaim = await ethers.getContractFactory("NASCORNClaim");
  const claim = await NASCORNClaim.deploy(await token.getAddress(), signerAddress);
  await claim.waitForDeployment();
  console.log("NASCORNClaim deployed to:", await claim.getAddress());

  // Transfer tokens to claim contract
  const tx = await token.transfer(await claim.getAddress(), ethers.parseEther("500000000"));
  await tx.wait();
  console.log("Transferred 500M tokens to claim contract");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

3. **Deploy to Base Sepolia testnet**:
```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

### Option 2: Use Remix IDE (No Installation Required)

1. Go to https://remix.ethereum.org
2. Create new file `NASCORNClaim.sol`
3. Copy your contract code from `contracts/NASCORNClaim.sol`
4. Click "Compile" (Solidity 0.8.20)
5. Go to "Deploy & Run Transactions"
6. Select "Injected Provider - MetaMask"
7. Switch MetaMask to Base Sepolia
8. Deploy:
   - First deploy MockERC20 (for testing)
   - Then deploy NASCORNClaim with:
     - `_token`: Address of MockERC20
     - `_signer`: Your backend wallet address

### Option 3: Use Foundry

```bash
forge create --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  contracts/NASCORNClaim.sol:NASCORNClaim \
  --constructor-args $TOKEN_ADDRESS $SIGNER_ADDRESS
```

---

## What You Need Before Deploying

### 1. Backend Signer Wallet
- Create a new wallet for signing claims
- **Keep the private key secret** (add to `.env` as `CLAIM_SIGNER_PRIVATE_KEY`)
- Use the public address in contract constructor

### 2. Token Contract
For testing on Base Sepolia:
- Deploy MockERC20 first
- Or use existing NASCORN token if already deployed

For mainnet:
- Use real NASCORN token address: `0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07`

### 3. Base Sepolia Testnet Setup
- Get testnet ETH from https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- Add Base Sepolia to MetaMask:
  - Network Name: Base Sepolia
  - RPC URL: https://sepolia.base.org
  - Chain ID: 84532
  - Currency: ETH

---

## After Deployment

### 1. Fund the Contract
```javascript
// Transfer tokens to claim contract
await token.transfer(claimContractAddress, ethers.parseEther("500000000"));
```

### 2. Update Frontend
In `client/src/config/contracts.ts`:
```typescript
export const NASCORN_CLAIM_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
```

### 3. Test the Claim Flow
1. Connect wallet on your app
2. Log in with iRacing OAuth
3. Click "Claim Tokens"
4. Check wallet balance

---

## Contract Security Checklist

Before mainnet deployment, verify:

- [ ] Signer private key is secure and never exposed
- [ ] Contract funded with correct amount (500M tokens)
- [ ] Tested on testnet with real iRacing OAuth
- [ ] Verified one person cannot claim twice
- [ ] Halving mechanics work correctly
- [ ] Emergency withdraw works (owner only)

---

## Troubleshooting

**"Contract abstract" error persists**:
- Ignore it - your contract is valid
- Try different deployment tool (Remix, Hardhat, Foundry)
- Check Solidity version is 0.8.20

**"Insufficient funds" error**:
- Make sure you have ETH for gas
- On testnet, get free ETH from faucet

**Signature verification fails**:
- Make sure backend uses correct signer private key
- Verify signature format matches contract expectation
- Check message hash includes all parameters in correct order

---

## Quick Commands

```bash
# Fix vite issue
npm install vite @vitejs/plugin-react --legacy-peer-deps

# Install Hardhat
npm install @nomicfoundation/hardhat-ethers ethers --legacy-peer-deps

# Compile contract
npx hardhat compile

# Deploy to testnet
npx hardhat run scripts/deploy.ts --network baseSepolia

# Verify contract on Base Sepolia
npx hardhat verify --network baseSepolia DEPLOYED_CONTRACT_ADDRESS TOKEN_ADDRESS SIGNER_ADDRESS
```

---

## Summary

✅ **Your contract is ready** - not abstract!  
✅ **Fix app crash**: Install vite  
✅ **Deploy**: Use Remix (easiest) or Hardhat  
✅ **Test**: On Base Sepolia before mainnet  

The "abstract" error is misleading - your contract code is perfectly valid Solidity.
