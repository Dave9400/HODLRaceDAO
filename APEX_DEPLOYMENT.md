# APEX Token & Claim Contract Deployment Guide

## Overview
After renaming from NASCORN to APEX, you'll need to redeploy the token contracts on Base Sepolia testnet.

## Contracts to Deploy

### 1. APEX ERC-20 Token
Deploy a standard ERC-20 token with:
- **Name**: "APEX"
- **Symbol**: "APEX"  
- **Decimals**: 18
- **Total Supply**: 500,000,000 APEX (500000000000000000000000000 wei)

You can use a simple ERC-20 like OpenZeppelin's:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract APEX is ERC20 {
    constructor() ERC20("APEX", "APEX") {
        _mint(msg.sender, 500_000_000 * 10**18);
    }
}
```

### 2. APEXClaimV2 Contract
Located at: `contracts/APEXClaimV2.sol`

Deploy this contract with:
- **Constructor Args**:
  - `_token`: Address of the deployed APEX ERC-20 token
  - `_signer`: Backend signer address (wallet that signs claims)

## Deployment Steps

### Using Remix IDE

1. **Deploy APEX Token**:
   - Go to https://remix.ethereum.org
   - Create new file `APEX.sol` with the ERC-20 code above
   - Compile with Solidity 0.8.20+
   - Deploy to Base Sepolia (ChainID: 84532, RPC: https://sepolia.base.org)
   - **Save the token address**

2. **Transfer Tokens to Claim Contract** (after deploying APEXClaimV2):
   - Call `transfer(claimContractAddress, 500000000000000000000000000)` on APEX token
   - This sends all 500M tokens to the claim contract

3. **Deploy APEXClaimV2**:
   - Copy `contracts/APEXClaimV2.sol` into Remix
   - Compile with Solidity 0.8.20+
   - Deploy with constructor args:
     - `_token`: APEX token address from step 1
     - `_signer`: Your backend signer wallet address
   - **Save the claim contract address and deployment block number**

## Update Application Configuration

After deploying, update these files:

### 1. Update `client/src/lib/contracts.ts`:
```typescript
export const APEX_TOKEN_ADDRESS = "0x..."; // Your deployed APEX token
export const CLAIM_CONTRACT_ADDRESS = "0x..."; // Your deployed claim contract
```

### 2. Update `server/routes.ts`:
Find the leaderboard endpoint and update the deployment block:
```typescript
const deploymentBlock = YOUR_DEPLOYMENT_BLOCK; // Block number from deployment
```

### 3. Set Environment Variable:
```bash
CLAIM_SIGNER_PRIVATE_KEY=0x... # Private key for signing claims
```

## Verification

After deployment:
1. Verify APEX token balance of claim contract: should be 500M APEX
2. Test a claim transaction
3. Check leaderboard displays correctly
4. Verify claim contract signer address matches backend

## Base Sepolia Details
- Network: Base Sepolia
- Chain ID: 84532
- RPC URL: https://sepolia.base.org
- Block Explorer: https://sepolia.basescan.org
- Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

## Notes
- Save all deployment addresses and block numbers
- Keep private keys secure
- Test with small claims first
- Monitor gas costs on testnet
