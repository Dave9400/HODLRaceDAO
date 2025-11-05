# How NASCORN Claim Contract Works (Simple Version)

## The Simple Formula

Every claim uses this single calculation:

```
Final Reward = Base Reward × Halving Multiplier ÷ 100
```

Then we cap it at whatever's left in the pool.

---

## Step-by-Step Example

### Example 1: First Claim Ever

**Your Racing Stats:**
- 100 wins
- 250 top 5 finishes  
- 500 race starts

**Step 1: Calculate Points**
```
Points = (100 × 1000) + (250 × 100) + (500 × 10)
       = 100,000 + 25,000 + 5,000
       = 130,000 points
```

**Step 2: Convert to Base Reward**
```
Base Reward = 130,000 × 1000 tokens
            = 130,000,000 tokens (130M)
```

**Step 3: Check Current Multiplier**
- Total claimed so far: **0 tokens**
- Halving Multiplier: `100` (we're in 0-100M range = 100%)

**Step 4: Calculate Final Reward**
```
Reward = (130M × 100) ÷ 100
       = 130,000,000 tokens
       = 130M NASCORN 🏆
```

**Step 5: Check Pool Limit**
- Pool remaining: 500M tokens ✓
- You get: **130M NASCORN**

---

### Example 2: Claiming After 150M Already Distributed

**Your Racing Stats:**
- 0 wins
- 5 top 5 finishes
- 50 race starts

**Step 1: Calculate Points**
```
Points = (0 × 1000) + (5 × 100) + (50 × 10)
       = 0 + 500 + 500
       = 1,000 points
```

**Step 2: Convert to Base Reward**
```
Base Reward = 1,000 × 1000 tokens
            = 1,000,000 tokens (1M)
```

**Step 3: Check Current Multiplier**
- Total claimed so far: **150M tokens**
- Halving Multiplier: `50` (we're in 100M-200M range = 50%)

**Step 4: Calculate Final Reward**
```
Reward = (1M × 50) ÷ 100
       = 500,000 tokens
       = 500K NASCORN
```

**Step 5: Check Pool Limit**
- Pool remaining: 350M tokens ✓
- You get: **500K NASCORN**

---

### Example 3: Late Claimer After 450M Distributed

**Your Racing Stats:**
- 50 wins
- 100 top 5 finishes
- 200 race starts

**Step 1: Calculate Points**
```
Points = (50 × 1000) + (100 × 100) + (200 × 10)
       = 50,000 + 10,000 + 2,000
       = 62,000 points
```

**Step 2: Convert to Base Reward**
```
Base Reward = 62,000 × 1000 tokens
            = 62,000,000 tokens (62M)
```

**Step 3: Check Current Multiplier**
- Total claimed so far: **450M tokens**
- Halving Multiplier: `6` (we're in 400M-500M range = 6.25%)

**Step 4: Calculate Final Reward**
```
Reward = (62M × 6) ÷ 100
       = 3,720,000 tokens
       = 3.72M NASCORN
```

**Step 5: Check Pool Limit**
- Pool remaining: 50M tokens ✓
- You get: **3.72M NASCORN**

---

## The Multiplier Table

### Halving Schedule (Based on Total Claimed)

| Total Claimed | Multiplier Value | Actual Rate |
|---------------|-----------------|-------------|
| 0-100M        | 100             | 100% (1.0x) |
| 100M-200M     | 50              | 50% (0.5x)  |
| 200M-300M     | 25              | 25% (0.25x) |
| 300M-400M     | 12              | 12.5% (0.125x) |
| 400M-500M     | 6               | 6.25% (0.0625x) |
| 500M+         | 3               | 3.125% (0.03125x) |

---

## Why Divide by 100?

The multiplier values (100, 50, 25, 12, 6, 3) represent percentages. We divide by 100 to get the actual decimal value:

- `100 ÷ 100 = 1.0` (100%)
- `50 ÷ 100 = 0.5` (50%)
- `25 ÷ 100 = 0.25` (25%)
- `12 ÷ 100 = 0.125` (12.5%)
- `6 ÷ 100 = 0.0625` (6.25%)
- `3 ÷ 100 = 0.03125` (3.125%)

---

## Security Features

✅ **OAuth Verification**: Backend requires valid iRacing login to generate signatures  
✅ **Stats Verification**: Backend fetches stats directly from iRacing (you can't fake them)  
✅ **One Claim Per Player**: Each iRacing ID can only claim once  
✅ **Pool Cap**: Total claims can never exceed 500M tokens  
✅ **Signature Protection**: Only signed claims (verified by backend) are accepted

---

## What Makes This "Simple"?

The contract uses **snapshot-based rewards**: When you claim, it looks at the current state and applies the current multiplier. That's it. No loops, no complex math across boundaries.

**The entire calculation is just 3 lines:**
```solidity
uint256 multiplier = getCurrentMultiplier();
uint256 reward = (baseReward * multiplier) / 100;
return reward < remainingInPool ? reward : remainingInPool;
```

**Trade-off**: If you claim right before a boundary (e.g., at 99M claimed with a 130M reward), you get the full better rate. This creates urgency to claim early - which is exactly what drives viral growth! 🚀

---

## Racing Stats Breakdown

The contract values different accomplishments:

- **Wins**: 1,000 points each (most valuable!)
- **Top 5 Finishes**: 100 points each
- **Race Starts**: 10 points each (rewards participation)

Each point = 1,000 NASCORN tokens (before halving multiplier applied)

**This rewards:**
- 🏆 Skill (wins count most)
- 🎯 Consistency (top 5s matter)
- 🚗 Participation (every race counts)
