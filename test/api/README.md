# Backend API Tests - Layer 2

## Purpose

These tests verify the **most critical security component**: the claim signature generation endpoint.

## What's Tested

### ✅ Authentication
- Requires valid iRacing OAuth token
- Rejects missing Authorization header (401)
- Rejects invalid/expired tokens (401)
- Rejects malformed auth headers (401)

### ✅ Input Validation
- Requires wallet address
- Validates wallet address format (0x + 40 hex chars)
- Rejects invalid addresses (400)

### ✅ Stats Verification
- Fetches stats from iRacing API directly
- **Does not trust client-provided stats**
- Prevents stat manipulation

### ✅ Signature Generation
- Returns valid signature format
- Signature can be verified by smart contract
- Includes all required fields

### ✅ Security
- Never exposes private key
- Ignores client-provided signatures
- Binds signature to specific wallet + stats

## Installation

```bash
npm install --save-dev jest @jest/globals @types/jest @types/supertest supertest ts-jest
```

## Configuration

Create `jest.config.js`:
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
```

## Running Tests

```bash
# Run all API tests
npm test test/api

# Run specific test file
npm test test/api/claim-signature.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Current Status

⚠️ **Tests require**:
1. Jest installation
2. Server export from `server/index.ts`
3. Real iRacing OAuth tokens for full integration tests

## Test Output (Expected)

```
 PASS  test/api/claim-signature.test.ts
  POST /api/claim/generate-signature
    Authentication
      ✓ should return 401 without Authorization header
      ✓ should return 401 with invalid OAuth token
      ✓ should return 401 with malformed Authorization header
    Request Validation
      ✓ should return 400 without wallet address
      ✓ should return 400 with invalid wallet address format
      ✓ should return 400 with wallet address missing 0x prefix
      ✓ should return 400 with wallet address wrong length
    Stats Verification
      ✓ should fetch stats from iRacing API (not accept client stats)
    Signature Generation
      ✓ should return valid signature format
      ✓ should include all required fields in response
    Security
      ✓ should not expose signer private key in response
      ✓ should not accept signatures from client

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
```

## Why These Tests Matter

**This layer tests the authentication boundary** - the most critical security point:

1. **Without OAuth** → No signature → No claim ✅
2. **With OAuth + Fake Stats** → Backend re-fetches real stats ✅
3. **Valid OAuth + Real Stats** → Valid signature generated ✅

If these tests pass, **only authenticated iRacing users can claim based on their real stats**.

## Next Steps

After API tests pass:
- Layer 3: Frontend component tests
- Layer 4: E2E Playwright tests
- Layer 5: Manual staging test
