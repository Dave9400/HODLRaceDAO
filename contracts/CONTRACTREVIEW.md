# APEXClaim Contract Security Review

**Contract:** APEXClaim.sol  
**Version:** Solidity ^0.8.20  
**Purpose:** Enable iRacing users to claim APEX tokens based on verified racing statistics with incremental claims and halving mechanics

## Executive Summary

### Critical Findings
- ⛔ **CRITICAL: Signature Replay Attack** - Missing domain separation allows signature reuse across contracts/chains
- ⛔ **CRITICAL: Signature Malleability** - Missing validation enables malleable signatures
- ⛔ **HIGH: Missing lastClaim Persistence (Deployed Contract)** - Current deployment doesn't persist claim history

### Medium Findings  
- ⚠️ **MEDIUM: getClaimableAmount() Incorrect** - Returns full career balance instead of delta
- ⚠️ **MEDIUM: No SafeERC20** - Potential issues with non-standard ERC20 tokens

### Low/Informational
- ℹ️ **LOW: Undifferentiated Error** - Zero delta uses InsufficientBalance instead of specific error

---

## Contract Overview

### Core Mechanism
1. User completes iRacing races and accumulates stats (wins, top 5s, starts)
2. Backend fetches verified stats from iRacing API
3. Backend generates cryptographic signature attesting to stats
4. User submits stats + signature to claim() function
5. Contract verifies signature, calculates delta from last claim, applies halving, transfers tokens

### Trust Model
- **Backend Signer**: Trusted to only sign legitimate stats from iRacing API
- **Owner**: Trusted for emergency withdrawals only
- **Contract**: Enforces monotonic stats (can't decrease) and delta-based payouts

---

## Function-by-Function Analysis

### 1. `constructor(address _token, address _signer)`

**Purpose:** Initialize contract with token address and authorized signer

**Functionality:**
- Sets the APEX ERC20 token address (immutable)
- Sets the backend signer address that can attest to iRacing stats (immutable)
- Sets deployer as owner for emergency functions (immutable)

**Security:**
- ✅ Uses immutable for gas savings and security (can't be changed after deployment)
- ✅ No complex logic that could fail
- ⚠️ **Consideration:** Signer address cannot be rotated. If private key is compromised, contract must be redeployed

**Vulnerabilities:** None  

**Why Needed:** Essential initialization - must set dependencies before contract can operate

---

### 2. `claim(uint256 iracingId, uint256 wins, uint256 top5s, uint256 starts, bytes memory signature)`

**Purpose:** Allow users to claim APEX tokens based on verified iRacing stats

**Functionality:**
1. Load user's previous claim history from storage
2. Verify new stats haven't decreased (monotonic check)
3. Verify backend signature is valid
4. Calculate reward based on delta (new stats - old stats)
5. Check reward is non-zero and contract has sufficient balance
6. **Update claim history** (THIS IS THE BUG IN DEPLOYED CONTRACT)
7. Update totalClaimed counter
8. Transfer tokens to user
9. Emit event and increment user's claim count

**Security:**
- ✅ Follows Checks-Effects-Interactions pattern (mostly)
- ⛔ **CRITICAL VULNERABILITY - Signature Replay:**
  ```solidity
  // Current: Only hashes user + iracingId + stats
  bytes32 messageHash = keccak256(abi.encodePacked(user, iracingId, wins, top5s, starts));
  
  // Missing: chainId, contract address, nonce
  // Attack: Attacker can:
  // 1. Get legitimate signature for their account on Chain A
  // 2. Deploy identical contract on Chain B with same signer
  // 3. Replay same signature on Chain B to claim again
  // 4. Or replay on a forked contract to drain funds
  ```

- ⛔ **BUG IN DEPLOYED CONTRACT:** Lines 76-78 update `history` but changes don't persist
  ```solidity
  history.wins = wins;    // These writes don't persist in deployed contract!
  history.top5s = top5s;
  history.starts = starts;
  ```

- ✅ Monotonic stats check prevents users from reducing stats to re-claim
- ⚠️ Uses `require()` for transfer but custom errors elsewhere (inconsistent)
- ⚠️ Combines reward == 0 and insufficient balance into same error

**Potential Attacks:**
1. **Signature Replay** (Critical): Reuse signature on different chain/contract
2. **Front-running** (Low): MEV bot could front-run claim, but requires valid signature
3. **Signature Malleability** (Medium): Can flip s value to create second valid signature

**Why Needed:** Core function - only way for users to claim rewards

---

### 3. `verifySignature(address user, uint256 iracingId, uint256 wins, uint256 top5s, uint256 starts, bytes memory signature)`

**Purpose:** Verify that backend signed the provided stats for this specific user

**Functionality:**
1. Create message hash from parameters
2. Wrap in Ethereum Signed Message format
3. Recover signer address from signature
4. Compare recovered address to authorized signer

**Security:**
- ⛔ **CRITICAL: Missing Domain Separation**
  ```solidity
  // Current: No chain ID, no contract address
  bytes32 messageHash = keccak256(abi.encodePacked(user, iracingId, wins, top5s, starts));
  
  // Should use EIP-712 with domain:
  // - chainId: Prevents cross-chain replay
  // - verifyingContract: Prevents cross-contract replay  
  // - name/version: Best practice
  ```

- ⛔ **Missing Signature Validation:**
  - No check that `v` is 27 or 28
  - No check that `s` is in lower half of curve (prevents malleability)
  - No check for zero address recovery

**Exploit Scenario:**
```
1. Alice gets signature for 100 wins on Base Sepolia
2. Attacker deploys identical contract on another chain with same signer
3. Attacker deploys APEX token copy and sends to new contract
4. Alice (or attacker with her TX data) replays signature on new chain
5. Drains second contract
```

**Why Needed:** Prevents users from claiming with fake stats - only backend can attest to legitimate iRacing data

---

### 4. `recoverSigner(bytes32 hash, bytes memory signature)`

**Purpose:** Extract the address that created a signature

**Functionality:**
1. Validate signature is 65 bytes (r=32, s=32, v=1)
2. Extract r, s, v components using assembly
3. Use ecrecover to get signer address

**Security:**
- ⚠️ **Missing Validation:**
  ```solidity
  // Should add:
  require(v == 27 || v == 28, "Invalid v value");
  require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
          "Invalid s value (signature malleable)");
  address recovered = ecrecover(hash, v, r, s);
  require(recovered != address(0), "Invalid signature");
  ```

- ⚠️ `ecrecover` returns `address(0)` on failure - should be checked
- ⚠️ Allows malleable signatures (can flip s to create duplicate valid signature)

**Why Needed:** Core cryptographic primitive for signature verification

---

### 5. `calculateDeltaReward(uint256 deltaWins, uint256 deltaTop5s, uint256 deltaStarts)`

**Purpose:** Calculate token reward based on stat deltas

**Functionality:**
1. Convert stats to points: wins=1000pts, top5s=100pts, starts=10pts
2. Multiply points by 1000 tokens per point
3. Apply halving multiplier based on totalClaimed
4. Cap at remaining pool balance

**Security:**
- ✅ Uses safe arithmetic (Solidity 0.8+ has overflow protection)
- ✅ Properly caps reward at pool maximum
- ✅ Internal function - can't be called directly

**Math Example:**
```
10 wins, 50 top5s, 100 starts = 10*1000 + 50*100 + 100*10 = 16,000 points
16,000 * 1000 tokens = 16,000,000 tokens base
If 50M already claimed: multiplier = 50% 
Final reward = 16M * 0.5 = 8M tokens
```

**Why Needed:** Implements the reward calculation logic - converts racing achievement to token amount

---

### 6. `calculateRewardWithHalving(uint256 baseReward)`

**Purpose:** Apply halving multiplier based on total claimed so far

**Functionality:**
1. Get current multiplier (100%, 50%, 25%, 12%, 6%, 3%)
2. Apply multiplier to base reward
3. Cap at remaining pool to prevent overdraft

**Security:**
- ✅ Safe integer math
- ✅ Multiple caps prevent pool exhaustion
- ✅ Predictable, fair halving schedule

**Halving Schedule:**
| Total Claimed | Multiplier | Description |
|--------------|------------|-------------|
| 0-100M | 100% | Full rewards |
| 100M-200M | 50% | First halving |
| 200M-300M | 25% | Second halving |
| 300M-400M | 12% | Third halving |
| 400M-500M | 6% | Fourth halving |
| 500M+ | 3% | Final tier (but pool empty) |

**Why Needed:** Implements incentive for early participation and prevents late dumping

---

### 7. `getCurrentMultiplier()`

**Purpose:** Get current reward multiplier percentage (public view function)

**Functionality:**
- Divides totalClaimed by 100M to determine tier
- Returns multiplier percentage (100, 50, 25, 12, 6, or 3)

**Security:**
- ✅ Pure calculation, no state changes
- ✅ Public function allows frontends to display current multiplier

**Why Needed:** Transparency - users can see current reward rate

---

### 8. `emergencyWithdraw()`

**Purpose:** Allow owner to recover tokens in emergency

**Functionality:**
1. Check caller is owner
2. Get contract's token balance  
3. Transfer all tokens to owner

**Security:**
- ✅ Owner-only modifier (reverts for non-owner)
- ⚠️ **Centralization Risk:** Owner can rug pull all tokens
  - **Mitigation:** This is known and acceptable for emergency situations
  - **Best Practice:** Owner should be a multisig or timelock
- ⚠️ No event emitted (makes it harder to track)

**Use Cases:**
- Contract has critical bug and needs to be migrated
- Token contract has issue and needs emergency recovery
- Contract needs to be sunset

**Why Needed:** Safety mechanism - prevents tokens from being permanently locked if contract has issues

---

### 9. `getClaimableAmount(uint256 wins, uint256 top5s, uint256 starts)` 

**Purpose:** View function to calculate claimable amount for given stats

**Functionality:**
- Calculates reward based on **total** stats (not delta)
- Applies halving
- Caps at pool maximum

**Security:**
- ⚠️ **BUG: Ignores claim history!**
  ```solidity
  // This function doesn't look at lastClaim mapping
  // So it returns full career balance, not delta
  // Misleading for users who already claimed
  ```

- ✅ View function - no state changes
- ⚠️ **Incorrect results for repeat claimers**

**Why Needed:** Allows frontends to show estimated rewards, but should be renamed or fixed to clarify it shows "full career value" not "claimable delta"

---

### 10. `getClaimableAmountForId(uint256 iracingId, uint256 wins, uint256 top5s, uint256 starts)`

**Purpose:** View function to calculate claimable delta for a specific iRacing ID

**Functionality:**
1. Load claim history for this iRacing ID
2. Return 0 if stats decreased
3. Calculate delta (new stats - old stats)
4. Calculate reward based on delta
5. Apply halving and cap

**Security:**
- ✅ Correctly implements delta calculation
- ✅ Handles stat decrease gracefully (returns 0)
- ✅ View function - safe to call

**Why Needed:** Primary function frontends should use to show actual claimable amount for repeat claimers

---

### 11. `hasClaimed(uint256 iracingId)`

**Purpose:** Check if an iRacing ID has ever claimed

**Functionality:**
- Checks if any stat in claim history is > 0
- Returns boolean

**Security:**
- ✅ Simple, safe view function
- ⚠️ **Edge Case:** Returns false for IDs with 0 wins, 0 top5s, 0 starts that claimed (theoretical only)

**Why Needed:** Allows UIs to show first-time vs repeat claimer status

---

## State Variables Analysis

### Immutable Variables
```solidity
IERC20 public immutable token;      // APEX token contract
address public immutable owner;      // Emergency withdrawal rights
address public immutable signer;     // Backend signature authority
```
**Security:** ✅ Gas-efficient, cannot be changed post-deployment

### Constants
```solidity
uint256 public constant TOTAL_CLAIM_POOL = 500_000_000 * 1e18;  // 500M tokens
uint256 public constant HALVING_INTERVAL = 100_000_000 * 1e18;  // 100M per tier
uint256 public constant POINTS_PER_WIN = 1000;
uint256 public constant POINTS_PER_TOP5 = 100;
uint256 public constant POINTS_PER_START = 10;
uint256 public constant BASE_TOKENS_PER_POINT = 1000 * 1e18;
```
**Security:** ✅ Cannot be changed, predictable economics

### State Variables
```solidity
uint256 public totalClaimed;                          // Total tokens claimed across all users
mapping(uint256 => ClaimHistory) public lastClaim;    // iRacing ID => last claimed stats
mapping(address => uint256) public claimCount;        // Wallet => number of claims
```
**Security:**  
- ✅ totalClaimed prevents double-spending beyond pool
- ⛔ **BUG:** lastClaim doesn't persist in deployed contract (bytecode mismatch)
- ✅ claimCount useful for analytics

---

## Attack Vectors & Exploits

### 1. Cross-Chain Signature Replay (CRITICAL)
**Severity:** ⛔ Critical  
**Impact:** Complete loss of funds

**Attack:**
1. Deploy APEXClaim on Chain A (Base) with 500M APEX
2. User claims 50M tokens with valid signature
3. Attacker deploys identical APEXClaim on Chain B (Optimism) with same signer address
4. Attacker funds Chain B contract with APEX
5. Attacker replays same signature from Chain A on Chain B
6. Drains Chain B contract

**Fix:** Implement EIP-712 domain separation:
```solidity
bytes32 domainSeparator = keccak256(abi.encode(
    keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
    keccak256(bytes("APEXClaim")),
    keccak256(bytes("1")),
    block.chainid,
    address(this)
));
```

### 2. Signature Malleability (MEDIUM)
**Severity:** ⚠️ Medium  
**Impact:** Signature can be modified to create duplicate valid signature

**Attack:**
- For signature (r, s, v), can create (r, -s mod n, v') that's also valid
- Allows transaction replay with different signature
- Could bypass replay protection that relies on signature uniqueness

**Fix:** Validate `s` is in lower half of curve:
```solidity
require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0);
```

### 3. Frontend Shows Wrong Claimable Amount (MEDIUM)
**Severity:** ⚠️ Medium  
**Impact:** User confusion, potential loss of trust

**Issue:**  
- `getClaimableAmount()` shows full career value
- Should show delta for repeat claimers
- Frontend using wrong function will display incorrect amounts

**Fix:** Use `getClaimableAmountForId()` in frontend or rename/fix `getClaimableAmount()`

---

## Recommendations

### Must Fix Before Deployment
1. ⛔ **Implement EIP-712 domain separation** to prevent replay attacks
2. ⛔ **Add signature validation** (v range, s malleability, zero address)
3. ⛔ **Verify lastClaim persistence** works in new deployment

### Should Fix
4. ⚠️ **Fix or remove getClaimableAmount()** - currently misleading
5. ⚠️ **Use SafeERC20** for token transfers
6. ⚠️ **Add specific error for zero delta** claims
7. ⚠️ **Emit event in emergencyWithdraw()**

### Consider
8. ℹ️ **Add signer rotation mechanism** (requires redesign to allow owner to update signer)
9. ℹ️ **Add pause mechanism** for emergency stops
10. ℹ️ **Add claim deadline** to prevent indefinite claims

---

## Gas Optimization Opportunities

1. ✅ Already using immutable variables (good)
2. ✅ Already using custom errors (gas-efficient)
3. ⚠️ Could pack ClaimHistory struct (uint128 would support up to 340B wins - overkill for racing stats)
4. ⚠️ Could use unchecked math in places where overflow impossible
5. ✅ Using storage pointer in claim() (efficient)

---

## Testing Checklist

Before deploying fixed contract, verify:

- [ ] Signature can't be replayed on different chain
- [ ] Signature can't be replayed on different contract address  
- [ ] Malformed signatures are rejected
- [ ] lastClaim mapping persists after first claim
- [ ] Second claim with same stats gives 0 tokens
- [ ] Second claim with +10 wins gives correct delta reward
- [ ] Stats can't decrease
- [ ] Halving works correctly at each tier
- [ ] Can't claim more than pool maximum
- [ ] emergencyWithdraw only works for owner
- [ ] Correct events are emitted
- [ ] Gas usage is reasonable (<200k gas per claim)

---

## Conclusion

**Current Contract Status:** ⛔ **DO NOT USE IN PRODUCTION**

**Critical Issues:**
1. Signature replay vulnerability allows complete fund theft
2. Deployed contract doesn't persist claim history (bug)

**After Fixes:**  
- Implement EIP-712
- Add signature validation  
- Verify storage persistence
- Deploy and test thoroughly

**Risk Assessment After Fixes:**  
- **Smart Contract Risk:** Low (simple, auditable logic)
- **Economic Risk:** Medium (depends on halving parameters being fair)
- **Operational Risk:** Medium (depends on signer key security)
- **Centralization Risk:** Low-Medium (owner can emergency withdraw)

**Recommended Next Steps:**
1. Fix critical vulnerabilities
2. Add comprehensive tests
3. Deploy to testnet
4. Verify all functions work correctly
5. Consider formal audit for mainnet deployment
6. Use multisig for owner address
