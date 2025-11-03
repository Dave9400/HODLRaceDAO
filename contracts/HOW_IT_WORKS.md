# How NASCORN Claim Contract Works (Simple Version)

## The Simple Formula

Every claim uses this single calculation:

```
Final Reward = Base Reward × Halving Multiplier × Early Bonus ÷ 10000
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

**Step 3: Check Current Multipliers**
- Total claimed so far: **0 tokens**
- Halving Multiplier: `100` (we're in 0-100M range = 100%)
- Early Bonus: `200` (we're under 50M = 2x bonus)

**Step 4: Calculate Final Reward**
```
Reward = (130M × 100 × 200) ÷ 10000
       = 260,000,000 tokens
       = 260M NASCORN 🏆
```

**Step 5: Check Pool Limit**
- Pool remaining: 500M tokens ✓
- You get: **260M NASCORN**

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

**Step 3: Check Current Multipliers**
- Total claimed so far: **150M tokens**
- Halving Multiplier: `50` (we're in 100M-200M range = 50%)
- Early Bonus: `125` (we're in 100M-200M range = 1.25x)

**Step 4: Calculate Final Reward**
```
Reward = (1M × 50 × 125) ÷ 10000
       = 625,000 tokens
       = 625K NASCORN
```

**Step 5: Check Pool Limit**
- Pool remaining: 350M tokens ✓
- You get: **625K NASCORN**

---

## The Multiplier Tables

### Halving Schedule (Based on Total Claimed)

| Total Claimed | Multiplier Value | Actual Rate |
|---------------|-----------------|-------------|
| 0-100M        | 100             | 100% (1.0x) |
| 100M-200M     | 50              | 50% (0.5x)  |
| 200M-300M     | 25              | 25% (0.25x) |
| 300M-400M     | 12              | 12.5% (0.125x) |
| 400M-500M     | 6               | 6.25% (0.0625x) |
| 500M+         | 3               | 3.125% (0.03125x) |

### Early Bonus (Based on Total Claimed)

| Total Claimed | Bonus Value | Actual Bonus |
|---------------|-------------|--------------|
| 0-50M         | 200         | 2.0x         |
| 50M-100M      | 150         | 1.5x         |
| 100M-200M     | 125         | 1.25x        |
| 200M+         | 100         | 1.0x (none)  |

---

## Why Divide by 10000?

The numbers 100, 200, 50, etc. are stored as integers. We multiply them together, then divide by 10000 to get the actual decimal value:

- `100 × 200 ÷ 10000 = 2.0` (100% × 2x bonus)
- `50 × 125 ÷ 10000 = 0.625` (50% × 1.25x bonus)
- `25 × 100 ÷ 10000 = 0.25` (25% × 1x bonus)

---

## Security Features

✅ **OAuth Verification**: Backend requires valid iRacing login to generate signatures  
✅ **Stats Verification**: Backend fetches stats directly from iRacing (you can't fake them)  
✅ **One Claim Per Player**: Each iRacing ID can only claim once  
✅ **Pool Cap**: Total claims can never exceed 500M tokens  
✅ **Signature Protection**: Only signed claims (verified by backend) are accepted

---

## What Makes This "Simple"?

The contract uses **snapshot-based rewards**: When you claim, it looks at the current state and applies the current multipliers. That's it. No loops, no complex math across boundaries.

**Trade-off**: If you claim right before a boundary (e.g., at 99M claimed with a 130M reward), you get the full better rate. This creates urgency to claim early - which is exactly what drives viral growth! 🚀
