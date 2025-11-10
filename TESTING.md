# Testing Guide for APEX Claim System

## Quick Start

### 1. Install Hardhat (One-Time Setup)

Due to dependency conflicts with ethers v6, install with legacy peer dependencies:

```bash
npm install --save-dev --legacy-peer-deps hardhat @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-chai-matchers chai
```

### 2. Run Contract Tests

```bash
npx hardhat test
```

---

## Testing Layers

### ✅ Layer 1: Smart Contract Tests (DONE)
**Files**: `test/contracts/APEXClaim.test.ts`  
**What**: 25 comprehensive tests covering halving, security, edge cases  
**Status**: Ready to run

**Tests Include:**
- Halving multipliers at each tranche
- Signature verification
- One claim per iRacing ID
- Pool cap enforcement
- Boundary conditions
- Reward calculations

**Run**: `npx hardhat test`

---

### 🔲 Layer 2: Backend API Tests (Next)
**What**: Test `/api/claim/generate-signature` endpoint  
**Why**: Verify OAuth requirement and stats verification

**Key Tests:**
- Request without OAuth → 401
- Valid OAuth → signature generated
- Stats fetched from iRacing (not client)
- Signature format matches contract

**Tools**: Jest + Supertest  
**Status**: Pending

---

### 🔲 Layer 3: Frontend Component Tests (Next)
**What**: Test IRacingAuth component  
**Why**: Ensure auth token storage and UI behavior

**Key Tests:**
- Auth token stored after OAuth
- Token included in signature requests
- Claim button states (disabled/enabled/loading)
- Error handling

**Tools**: React Testing Library  
**Status**: Pending

---

### 🔲 Layer 4: E2E Tests (Next)
**What**: Full user journey with Playwright  
**Why**: Verify entire flow works together

**Test Flow:**
1. Connect wallet
2. iRacing OAuth login
3. View stats
4. Generate signature
5. Submit claim
6. Verify tokens received

**Tools**: Playwright + Base Sepolia  
**Status**: Pending

---

### 🔲 Layer 5: Manual Staging Test (Final)
**What**: Human testing on testnet  
**Why**: Catch UX issues before production

**Checklist:**
- [ ] Deploy contract to Base Sepolia
- [ ] Fund with test tokens
- [ ] Test real iRacing OAuth
- [ ] Verify stats display
- [ ] Submit claim transaction
- [ ] Test already-claimed error
- [ ] Test with multiple accounts

**Status**: Pending

---

## Security Checklist

After all tests pass, verify:

✅ **No Fake Stats**: Client cannot submit fake data  
✅ **OAuth Required**: Unauthenticated users get 401  
✅ **One Claim Only**: Cannot claim twice  
✅ **Signature Binding**: Tied to wallet + stats  
✅ **Pool Protection**: Cannot exceed 500M  

---

## Current Status

| Layer | Status | Tests |
|-------|--------|-------|
| 1. Contract Tests | ✅ Ready | 25 |
| 2. Backend Tests | 🔲 Pending | 0 |
| 3. Frontend Tests | 🔲 Pending | 0 |
| 4. E2E Tests | 🔲 Pending | 0 |
| 5. Manual Testing | 🔲 Pending | - |

---

## Quick Commands

```bash
# Install Hardhat
npm install --save-dev --legacy-peer-deps hardhat @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-chai-matchers chai

# Run contract tests
npx hardhat test

# Run specific test file
npx hardhat test test/contracts/APEXClaim.test.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Clean and rebuild
npx hardhat clean && npx hardhat compile
```

---

## Test Output Example

When you run `npx hardhat test`, you should see:

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
      ...
    
  25 passing (2s)
```

---

## Troubleshooting

### Error: Cannot find module 'hardhat'
**Solution**: Run the install command above with `--legacy-peer-deps`

### Error: Contract not found
**Solution**: Make sure `contracts/APEXClaim.sol` exists and run `npx hardhat compile`

### Tests timeout
**Solution**: Increase timeout in hardhat.config.ts:
```typescript
mocha: {
  timeout: 40000
}
```

---

## Next Steps

1. **Install Hardhat** (see command above)
2. **Run tests**: `npx hardhat test`
3. **Verify all 25 tests pass** ✅
4. **Move to Layer 2**: Backend API tests
