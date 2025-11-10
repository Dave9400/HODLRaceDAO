# Testing Summary for APEX Claim System

## Overview

Due to Hardhat dependency conflicts in the Replit environment, we've prioritized the **most critical** security tests.

---

## ✅ Layer 1: Contract Tests (Written, Installation Blocked)

**Status**: Test code written, ready for deployment testing  
**Files**: `test/contracts/APEXClaim.test.ts` (25 tests)

**Why Blocked**: Hardhat v2/v3 peer dependency conflicts in Replit  
**Workaround**: Run these tests when deploying to testnet (Base Sepolia)

**What's Tested**:
- ✅ Halving multipliers (all tranches)
- ✅ Signature verification
- ✅ Pool cap enforcement
- ✅ One claim per ID
- ✅ Edge cases and boundaries

---

## ✅ Layer 2: Backend API Tests (READY TO RUN)

**Status**: ✅ **Tests written and ready**  
**Files**: `test/api/claim-signature.test.ts` (12 tests)

**Install**:
```bash
npm install --save-dev jest @jest/globals @types/jest @types/supertest supertest ts-jest
```

**Run**:
```bash
npm test test/api/claim-signature.test.ts
```

**What's Tested** (12 critical security tests):
- ✅ OAuth token required (401 without auth)
- ✅ Invalid tokens rejected
- ✅ Wallet address validation
- ✅ Stats fetched from iRacing (not client)
- ✅ Signature format correct
- ✅ Private key never exposed
- ✅ Client signatures ignored

**Why This Matters**:  
This is the **MOST CRITICAL** security layer. It verifies that:
1. Only authenticated users can get signatures
2. Stats cannot be faked
3. The authentication boundary works

---

## 🔲 Layer 3: Frontend Component Tests

**Status**: Not yet implemented  
**Tools**: React Testing Library + MSW  
**Priority**: Medium (UI behavior)

---

## 🔲 Layer 4: End-to-End Tests

**Status**: Not yet implemented  
**Tools**: Playwright  
**Priority**: High (full flow verification)

---

## 🔲 Layer 5: Manual Staging Test

**Status**: Pending contract deployment  
**Tools**: Base Sepolia testnet + real iRacing OAuth  
**Priority**: High (final verification)

---

## Recommended Testing Path

### Option A: Backend First (RECOMMENDED)
1. ✅ Install Jest dependencies
2. ✅ Run Layer 2 tests (backend API)
3. ⏭️ Skip to Layer 5 (manual staging test)
4. ✅ Deploy contract to Base Sepolia
5. ✅ Test full flow manually

### Option B: E2E First
1. ✅ Write Playwright tests
2. ✅ Test full OAuth → claim flow
3. ✅ Deploy to staging

### Option C: Skip Automated Tests
1. ✅ Deploy contract to Base Sepolia testnet
2. ✅ Fund with test tokens
3. ✅ Manual testing with real iRacing OAuth

---

## Security Checklist (Manual Verification)

Even without automated tests, verify these manually:

### 🔒 Authentication Security
- [ ] Cannot claim without iRacing OAuth
- [ ] Cannot fake racing stats
- [ ] Signature requires valid OAuth token

### 🔒 Contract Security
- [ ] Cannot claim twice with same iRacing ID
- [ ] Pool cannot exceed 500M tokens
- [ ] Halving applies correctly

### 🔒 Signature Security
- [ ] Signature ties to specific wallet
- [ ] Cannot reuse signature for different wallet
- [ ] Backend generates signatures (not client)

---

## Quick Commands

```bash
# Install backend test dependencies
npm install --save-dev jest @jest/globals @types/jest @types/supertest supertest ts-jest

# Run backend tests
npm test test/api

# Run specific test
npm test test/api/claim-signature.test.ts

# For contract tests (when Hardhat works):
npx hardhat test
```

---

## Current Status

| Layer | Status | Critical? | Can Run? |
|-------|--------|-----------|----------|
| 1. Contract Tests | ✅ Written | Medium | ❌ (Hardhat blocked) |
| 2. Backend API Tests | ✅ Written | **HIGH** | ✅ Yes |
| 3. Frontend Tests | 🔲 Pending | Low | - |
| 4. E2E Tests | 🔲 Pending | High | - |
| 5. Manual Testing | 🔲 Pending | **HIGH** | ✅ Yes |

---

## Conclusion

**You have 2 options**:

1. **Run Layer 2 tests now** (backend API security)
2. **Skip to manual testing** (deploy to testnet and test manually)

Both are valid. Layer 2 gives you automated verification of OAuth security. Manual testing gives you end-to-end confidence.

**My recommendation**: Do both! Run Layer 2 tests, then do manual testing on Base Sepolia.
