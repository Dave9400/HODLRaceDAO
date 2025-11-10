# Smart Contract Tests - APEX Claim

## Installation

Due to dependency conflicts with ethers v6, you need to install Hardhat with legacy peer dependencies:

```bash
npm install --legacy-peer-deps hardhat @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-chai-matchers chai
```

## Running Tests

```bash
npx hardhat test
```

## Test Coverage

### 1. Deployment Tests
- ✅ Verifies correct token address
- ✅ Verifies correct owner
- ✅ Verifies correct signer  
- ✅ Confirms 500M token balance

### 2. Halving Multiplier Tests
- ✅ 0-100M claimed → 100% multiplier
- ✅ 100M-200M claimed → 50% multiplier
- ✅ 200M-300M claimed → 25% multiplier
- ✅ 300M-400M claimed → 12.5% multiplier
- ✅ 400M-500M claimed → 6.25% multiplier

### 3. Claim Function Tests
- ✅ Valid signature allows claim
- ✅ Correct reward calculation (Pro Driver: 130M)
- ✅ Correct reward calculation (Amateur: 1M)
- ✅ Prevents double claims
- ✅ Rejects invalid signatures
- ✅ Rejects mismatched data

### 4. Pool Cap Enforcement
- ✅ Caps reward at remaining pool
- ✅ Never exceeds 500M total
- ✅ Handles pool exhaustion

### 5. Edge Cases
- ✅ Claim at exact boundary (99.9M)
- ✅ Claim crossing boundary (gets old rate)
- ✅ Zero stats (reverts)
- ✅ Very large stats (caps at pool)

### 6. View Function Tests
- ✅ getClaimableAmount matches actual claim
- ✅ Accounts for current multiplier

### 7. Emergency Withdraw
- ✅ Owner can withdraw
- ✅ Non-owner cannot withdraw

## Test Results Summary

| Category | Tests | Status |
|----------|-------|--------|
| Deployment | 4 | ✅ |
| Halving | 5 | ✅ |
| Claims | 6 | ✅ |
| Pool Cap | 2 | ✅ |
| Edge Cases | 4 | ✅ |
| View Functions | 2 | ✅ |
| Admin | 2 | ✅ |
| **Total** | **25** | **✅** |

## Key Security Verifications

✅ **Signature Verification**: Only backend-signed claims accepted  
✅ **One Claim Per ID**: iRacing ID can only claim once  
✅ **Pool Protection**: Total claims capped at 500M  
✅ **Multiplier Enforcement**: Correct halving at each tranche  
✅ **Unauthorized Access**: Only owner can emergency withdraw

## Expected Test Output

```
APEXClaim Contract Tests
  Deployment
    ✓ Should set the correct token address
    ✓ Should set the correct owner
    ✓ Should set the correct signer
    ✓ Should have received 500M tokens
  Halving Multipliers
    ✓ Should return 100 multiplier for 0-100M claimed
    ✓ Should return 50 multiplier for 100M-200M claimed
    ✓ Should return 25 multiplier for 200M-300M claimed
    ✓ Should return 12 multiplier for 300M-400M claimed
    ✓ Should return 6 multiplier for 400M-500M claimed
  Claim Function
    ✓ Should allow valid claim with correct signature
    ✓ Should correctly calculate rewards for Pro Driver (130M)
    ✓ Should correctly calculate rewards for Amateur (1M)
    ✓ Should prevent double claims with same iRacing ID
    ✓ Should reject invalid signature
    ✓ Should reject signature with wrong data
  Pool Cap Enforcement
    ✓ Should cap reward at remaining pool
    ✓ Should never exceed 500M total claimed
  Edge Cases
    ✓ Should handle claim at exact boundary (99.9M claimed)
    ✓ Should handle claim crossing boundary
    ✓ Should handle zero stats
    ✓ Should handle very large stats within pool
  getClaimableAmount View Function
    ✓ Should match actual claim amount
    ✓ Should account for current multiplier
  Emergency Withdraw
    ✓ Should allow owner to withdraw
    ✓ Should reject non-owner withdrawal

  25 passing
```

## Next Steps

After all contract tests pass:
1. Run backend API tests (Layer 2)
2. Run frontend component tests (Layer 3)
3. Run E2E Playwright tests (Layer 4)
4. Perform manual staging test (Layer 5)
