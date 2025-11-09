# NASCORNClaimV2 Deployment Instructions

## Step 1: Deploy via Remix IDE

1. **Open Remix IDE**: Go to https://remix.ethereum.org/

2. **Create New File**: 
   - In the file explorer, create a new file: `NASCORNClaimV2.sol`
   - Copy the entire contents of `contracts/NASCORNClaimV2.sol` into this file

3. **Compile Contract**:
   - Go to the "Solidity Compiler" tab (left sidebar)
   - Select compiler version: `0.8.20` or higher
   - Click "Compile NASCORNClaimV2.sol"
   - Verify there are no errors

4. **Deploy Contract**:
   - Go to "Deploy & Run Transactions" tab
   - Environment: Select "Injected Provider - MetaMask"
   - Make sure MetaMask is connected to **Base Sepolia** network
   - Select contract: `NASCORNClaimV2`
   - Constructor parameters:
     - `_token`: `0x4578B2246f4A01432760d3e36CACC6fACca3c8a1` (Mock NASCORN token address)
     - `_signer`: Get this from your backend signer wallet address (the address corresponding to CLAIM_SIGNER_PRIVATE_KEY)
   - Click "Deploy"
   - Confirm transaction in MetaMask
   - **Save the deployed contract address!** You'll need it for the next steps.

## Step 2: Fund the Contract

Transfer NASCORN tokens to the newly deployed contract:

```
Contract Address: <YOUR_DEPLOYED_ADDRESS>
Amount: 500,000,000 NASCORN (500M tokens)
```

## Step 3: Update Environment Variables

Update `.env` file with the new contract address:

```bash
VITE_CLAIM_CONTRACT_ADDRESS=<YOUR_DEPLOYED_ADDRESS>
```

## Step 4: Verify Storage Persistence

After deployment, test that the `lastClaim` mapping persists correctly:

1. Make a test claim with your wallet
2. Check the contract using Remix "Read Contract" functions:
   - Call `getLastClaimedStats(<your_iracing_id>)`
   - Verify it returns your claimed stats (not all zeros)
3. Try to claim again with the same stats
   - Should revert with "NoDeltaToClaim" error
4. Update your stats on iRacing (complete a race)
5. Try to claim again with new stats
   - Should succeed and give you the delta reward

## Step 5: Restart Application

After updating the environment variable:

```bash
# The workflow will auto-restart, or you can manually restart
npm run dev
```

## Verification Checklist

Before going live, verify:

- [ ] Contract deployed successfully to Base Sepolia
- [ ] Contract funded with 500M NASCORN tokens
- [ ] Environment variable updated with new contract address
- [ ] Backend signing uses correct contract address in EIP-712 domain
- [ ] First claim succeeds and shows correct reward
- [ ] `getLastClaimedStats()` returns claimed stats (not zeros)
- [ ] Second claim with same stats reverts with `NoDeltaToClaim`
- [ ] Second claim with +10 wins succeeds and gives delta reward only
- [ ] Frontend displays "New Stats Since Last Claim" correctly
- [ ] Halving progress shows correct multiplier

## Security Notes

✅ **Fixed Vulnerabilities:**
- EIP-712 domain separation prevents cross-chain/cross-contract replay
- Signature validation prevents malleability attacks
- Proper storage persistence for incremental claims

🔒 **Important:**
- Keep CLAIM_SIGNER_PRIVATE_KEY secure
- Only backend should have access to signer private key
- Contract owner address should be a secure wallet (consider multisig)
- Monitor contract for unexpected behavior

## Troubleshooting

**Problem: "Invalid signature" error**
- Solution: Ensure backend CONTRACT_ADDRESS in routes.ts matches deployed contract

**Problem: Storage not persisting**
- Solution: Verify you deployed NASCORNClaimV2.sol (not V1), check bytecode matches source

**Problem: Claims always showing full amount**
- Solution: Frontend should use `getClaimableAmountForId()`, not `getClaimableAmount()`

**Problem: Can claim with decreased stats**
- Solution: Check that backend is fetching real stats from iRacing API, not accepting client values

## Contract Addresses

**Current Deployment:**
- Old Contract (DO NOT USE): `0x773F70eD43f97E3A9b381AF7fDB10DF66f9BfB82`
- New V2 Contract: `<UPDATE_AFTER_DEPLOYMENT>`
- NASCORN Token: `0x4578B2246f4A01432760d3e36CACC6fACca3c8a1`

**Network:**
- Chain: Base Sepolia Testnet
- Chain ID: 84532
- RPC: https://sepolia.base.org
