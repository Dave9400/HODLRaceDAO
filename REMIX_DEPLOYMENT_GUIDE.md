# How to Deploy APEXClaim in Remix (Step-by-Step)

## The "Abstract Contract" Error - What's Happening

In Remix, when you have an **interface** (like `IERC20`) in the same file as your contract, Remix might be trying to show you BOTH for deployment. You **cannot deploy an interface** - only the actual contract.

---

## Step-by-Step Remix Deployment

### Step 1: Open Remix
Go to https://remix.ethereum.org

### Step 2: Create the Contract File
1. In the left sidebar, click the "File" icon
2. Click "Create New File"
3. Name it: `APEXClaim.sol`
4. Copy and paste your contract code

### Step 3: Compile
1. Click the "Solidity Compiler" icon (left sidebar)
2. Select compiler version: **0.8.20** or higher
3. Click "Compile APEXClaim.sol"
4. ✅ Should show green checkmark

### Step 4: Deploy
1. Click "Deploy & Run Transactions" icon (left sidebar)
2. **IMPORTANT**: In the "CONTRACT" dropdown, you'll see TWO items:
   - ❌ `IERC20` - Do NOT select this (it's an interface, cannot be deployed)
   - ✅ `APEXClaim` - **SELECT THIS ONE**

3. Make sure `APEXClaim` is selected in the dropdown
4. Enter constructor parameters:
   - `_token`: Token contract address
   - `_signer`: Your backend wallet address (the one that signs claims)
5. Click "Deploy"

---

## Common Mistakes

### ❌ Mistake 1: Selecting IERC20 Instead of APEXClaim
**If you see the abstract error**, you probably have `IERC20` selected in the CONTRACT dropdown.

**Fix**: Click the CONTRACT dropdown and select `APEXClaim` instead.

### ❌ Mistake 2: Wrong Solidity Version
Make sure compiler is set to **0.8.20 or higher**.

### ❌ Mistake 3: Not Connected to Network
Make sure MetaMask is:
- Installed
- Unlocked
- Connected to Base Sepolia testnet

---

## What You Need Before Deploying

### Option A: Deploy to Testnet with MockERC20

**Step 1: Deploy MockERC20 First**
1. Create a new file in Remix: `MockERC20.sol`
2. Copy this code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint256 _totalSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
```

3. Compile and deploy MockERC20:
   - Name: `APEX Token`
   - Symbol: `APEX`
   - Total Supply: `500000000000000000000000000` (500M with 18 decimals)

4. Copy the deployed MockERC20 address

**Step 2: Deploy APEXClaim**
- `_token`: The MockERC20 address you just deployed
- `_signer`: Your backend wallet address (e.g., `0x1234...`)

**Step 3: Fund APEXClaim with Tokens**
1. In Remix, go back to the MockERC20 contract
2. In "Deployed Contracts", expand MockERC20
3. Find the `transfer` function
4. Enter:
   - `to`: Your APEXClaim contract address
   - `amount`: `500000000000000000000000000` (500M tokens)
5. Click "transact"

### Option B: Use Existing Token (Mainnet)

If deploying to Base mainnet:
- `_token`: `0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07` (real APEX token)
- `_signer`: Your backend wallet address

---

## Screenshot Guide

When you're in Remix "Deploy & Run Transactions" tab:

```
┌─────────────────────────────────────┐
│ CONTRACT                       ▼    │
├─────────────────────────────────────┤
│ ❌ IERC20 - interfaces/IERC20.sol   │ <-- DON'T SELECT THIS
│ ✅ APEXClaim - APEXClaim.sol  │ <-- SELECT THIS ONE!
└─────────────────────────────────────┘
```

---

## Troubleshooting

**Q: I only see IERC20 in the dropdown**
- Make sure you compiled the file
- Check that `contract APEXClaim {` is in your code (not commented out)

**Q: Deploy button is greyed out**
- Make sure MetaMask is connected
- Check you have enough ETH for gas
- Make sure network is selected (not "JavaScript VM")

**Q: "Abstract contract" warning**
- This appears when IERC20 is selected
- **Solution**: Select `APEXClaim` from dropdown instead

**Q: Constructor parameters won't accept my values**
- Make sure addresses are in quotes: `"0x1234..."`
- Addresses must be 42 characters (0x + 40 hex digits)

---

## Quick Checklist

Before clicking Deploy:

- [ ] Compiled successfully (green checkmark)
- [ ] `APEXClaim` selected in CONTRACT dropdown (NOT IERC20)
- [ ] MetaMask connected to Base Sepolia
- [ ] Have testnet ETH for gas
- [ ] Constructor parameters filled:
  - [ ] `_token`: Valid ERC20 address
  - [ ] `_signer`: Valid wallet address
- [ ] Ready to click "Deploy" button

---

## After Successful Deployment

You'll see the contract appear under "Deployed Contracts" at the bottom of the page.

Next steps:
1. Copy the contract address
2. Fund it with tokens (using the token's `transfer` function)
3. Update your frontend to use this contract address
4. Test claiming!
