# NASCORN Claim Contract

## Overview

This smart contract allows iRacing drivers to claim NASCORN tokens based on their verified racing statistics. The contract implements a halving mechanism and early adopter bonuses to incentivize platform growth.

## Security Features

✅ **Signature Verification**: Backend signs claims with private key to prevent fake stats
✅ **One Claim Per iRacing ID**: Prevents multiple claims from same account  
✅ **Immutable Core Values**: Owner, signer, and token cannot be changed
✅ **Emergency Withdraw**: Owner can recover tokens if needed
✅ **No Reentrancy**: Uses simple transfer pattern, no external calls during critical logic

## Tokenomics

**Total Claim Pool**: 500M NASCORN (50% of 1B total supply)

### Reward Formula

```
Base Reward = (wins × 1000 + top5s × 100 + starts × 10) × 1000 tokens
Final Reward = Base Reward × Halving Multiplier × Early Adopter Bonus
```

### Halving Schedule

Rewards are calculated using the multiplier at the time of claim:

| Claimed | Multiplier | % of Original |
|---------|------------|---------------|
| 0-100M  | 100%       | 100%          |
| 100M-200M | 50%      | 50%           |
| 200M-300M | 25%      | 25%           |
| 300M-400M | 12%      | 12%           |
| 400M-500M | 6%       | 6%            |
| 500M+   | 3%         | 3%            |

**Design Note**: Claims use the current multiplier (not pro-rated across boundaries). This creates urgency to claim before halvings occur, incentivizing early adoption.

### Early Adopter Bonus

Additional multiplier based on total claimed at time of claim:

| Claimed | Bonus |
|---------|-------|
| 0-50M   | 2x    |
| 50M-100M | 1.5x  |
| 100M-200M | 1.25x |
| 200M+   | 1x    |

**Design Note**: Like halvings, bonuses apply at claim time. This rewards speed and promotes viral growth.

## Example Claims

**Pro Driver** (100 wins, 250 top5s, 500 starts) - First to claim:
- Points: 100,000 + 25,000 + 5,000 = 130,000
- Base: 130M tokens
- Multiplier: 100% (first tranche)
- Early bonus: 2x (under 50M claimed)
- Claim: 130M × 1.0 × 2.0 = **260M NASCORN** 🏆

**Amateur** (0 wins, 5 top5s, 50 starts) - Claiming after 150M distributed:
- Points: 0 + 500 + 500 = 1,000
- Base: 1M tokens
- Multiplier: 50% (second tranche)
- Early bonus: 1.25x (100M-200M range)
- Claim: 1M × 0.5 × 1.25 = **625K NASCORN**

**Weekend Racer** (1 win, 10 top5s, 100 starts) - Claiming early:
- Points: 1,000 + 1,000 + 1,000 = 3,000
- Base: 3M tokens
- Multiplier: 100%
- Early bonus: 2x
- Claim: 3M × 1.0 × 2.0 = **6M NASCORN**

## Deployment Steps

### 1. Deploy ERC20 Token

```solidity
// Deploy NASCORN token with 1B supply
constructor() ERC20("NASCORN", "CORN") {
    _mint(msg.sender, 1_000_000_000 * 1e18);
}
```

### 2. Generate Signer Wallet

```bash
# Generate a new wallet for signing claims
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
# Save the private key as CLAIM_SIGNER_PRIVATE_KEY in Replit Secrets
# Get the address for the next step
```

### 3. Deploy Claim Contract

```javascript
const claimContract = await deploy("NASCORNClaim", [
  TOKEN_ADDRESS,  // Your deployed NASCORN token address
  SIGNER_ADDRESS  // Public address from step 2
]);
```

### 4. Fund Claim Contract

```javascript
// Transfer 50% of supply to claim contract
await token.transfer(
  claimContract.address, 
  ethers.parseEther("500000000")
);
```

### 5. Configure Backend

Add to Replit Secrets:
- `CLAIM_SIGNER_PRIVATE_KEY`: Private key from step 2
- `NASCORN_CLAIM_CONTRACT`: Deployed contract address

## Usage Flow

1. **User connects wallet** and authenticates with iRacing OAuth
2. **Frontend fetches** iRacing stats from `/api/iracing/profile`
3. **Backend generates signature** via `/api/claim/generate-signature`
4. **Frontend calls contract** `claim()` function with signature
5. **Contract verifies signature** and transfers tokens

## Contract Functions

### claim()
```solidity
function claim(
    uint256 iracingId,
    uint256 wins,
    uint256 top5s,
    uint256 starts,
    bytes memory signature
) external
```

Claims tokens based on verified iRacing stats. Reverts if already claimed or invalid signature.

### getClaimableAmount()
```solidity
function getClaimableAmount(
    uint256 wins,
    uint256 top5s,
    uint256 starts
) external view returns (uint256)
```

Preview how many tokens can be claimed for given stats.

### getCurrentMultiplier()
```solidity
function getCurrentMultiplier() public view returns (uint256)
```

Returns current halving multiplier (100 = 100%, 50 = 50%, etc).

### getEarlyAdopterBonus()
```solidity
function getEarlyAdopterBonus() public view returns (uint256)
```

Returns current early adopter bonus (200 = 2x, 150 = 1.5x, etc).

### emergencyWithdraw()
```solidity
function emergencyWithdraw() external
```

Owner-only function to recover all tokens from contract.

## Audit Checklist

- [ ] Signature verification matches backend signing
- [ ] Cannot claim twice with same iRacing ID
- [ ] Halving logic correctly implements 50% reduction every 100M tokens
- [ ] Early adopter bonus correctly applies multipliers
- [ ] No integer overflow/underflow risks (using Solidity 0.8+)
- [ ] Emergency withdraw only callable by owner
- [ ] Token transfers cannot fail silently (using require)
- [ ] No reentrancy vulnerabilities (no external calls during state changes)

## License

MIT
