// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract NASCORNClaim {
    IERC20 public immutable token;
    address public immutable owner;
    address public immutable signer;
    
    uint256 public constant TOTAL_CLAIM_POOL = 500_000_000 * 1e18;
    uint256 public constant HALVING_INTERVAL = 100_000_000 * 1e18;
    
    uint256 public constant POINTS_PER_WIN = 1000;
    uint256 public constant POINTS_PER_TOP5 = 100;
    uint256 public constant POINTS_PER_START = 10;
    uint256 public constant BASE_TOKENS_PER_POINT = 1000 * 1e18;
    
    uint256 public totalClaimed;
    mapping(uint256 => bool) public hasClaimed;
    mapping(address => uint256) public claimCount;
    
    event Claimed(address indexed user, uint256 iracingId, uint256 amount, uint256 claimNumber);
    
    error AlreadyClaimed();
    error InvalidSignature();
    error InsufficientBalance();
    error Unauthorized();
    
    constructor(address _token, address _signer) {
        token = IERC20(_token);
        owner = msg.sender;
        signer = _signer;
    }
    
    function claim(
        uint256 iracingId,
        uint256 wins,
        uint256 top5s,
        uint256 starts,
        bytes memory signature
    ) external {
        if (hasClaimed[iracingId]) revert AlreadyClaimed();
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            iracingId,
            wins,
            top5s,
            starts
        ));
        
        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));
        
        if (recoverSigner(ethSignedHash, signature) != signer) {
            revert InvalidSignature();
        }
        
        uint256 points = (wins * POINTS_PER_WIN) + 
                        (top5s * POINTS_PER_TOP5) + 
                        (starts * POINTS_PER_START);
        
        uint256 baseReward = points * BASE_TOKENS_PER_POINT;
        
        uint256 reward = calculateRewardWithHalvingAndBonus(baseReward);
        
        if (totalClaimed + reward > TOTAL_CLAIM_POOL) {
            reward = TOTAL_CLAIM_POOL - totalClaimed;
        }
        
        if (reward == 0 || token.balanceOf(address(this)) < reward) {
            revert InsufficientBalance();
        }
        
        hasClaimed[iracingId] = true;
        totalClaimed += reward;
        uint256 claimNumber = ++claimCount[msg.sender];
        
        require(token.transfer(msg.sender, reward), "Transfer failed");
        
        emit Claimed(msg.sender, iracingId, reward, claimNumber);
    }
    
    function calculateRewardWithHalvingAndBonus(uint256 baseReward) internal view returns (uint256) {
        uint256 multiplier = getCurrentMultiplier();
        uint256 bonus = getEarlyAdopterBonus();
        uint256 reward = (baseReward * multiplier * bonus) / 10000;
        
        uint256 remainingInPool = TOTAL_CLAIM_POOL > totalClaimed 
            ? TOTAL_CLAIM_POOL - totalClaimed 
            : 0;
            
        return reward < remainingInPool ? reward : remainingInPool;
    }
    
    function getNextBoundary(uint256 claimed) internal pure returns (uint256) {
        uint256[6] memory boundaries = [
            50_000_000 * 1e18,
            100_000_000 * 1e18,
            200_000_000 * 1e18,
            300_000_000 * 1e18,
            400_000_000 * 1e18,
            500_000_000 * 1e18
        ];
        
        for (uint256 i = 0; i < boundaries.length; i++) {
            if (claimed < boundaries[i]) {
                return boundaries[i];
            }
        }
        
        return 500_000_000 * 1e18;
    }
    
    function getMultiplierForClaimed(uint256 claimed) internal pure returns (uint256) {
        uint256 tranche = claimed / HALVING_INTERVAL;
        return getMultiplierForTranche(tranche);
    }
    
    function getMultiplierForTranche(uint256 tranche) internal pure returns (uint256) {
        if (tranche >= 5) return 3;
        if (tranche == 4) return 6;
        if (tranche == 3) return 12;
        if (tranche == 2) return 25;
        if (tranche == 1) return 50;
        return 100;
    }
    
    function getBonusForClaimed(uint256 claimed) internal pure returns (uint256) {
        if (claimed < HALVING_INTERVAL / 2) return 200;
        if (claimed < HALVING_INTERVAL) return 150;
        if (claimed < HALVING_INTERVAL * 2) return 125;
        return 100;
    }
    
    function getCurrentMultiplier() public view returns (uint256) {
        uint256 halvings = totalClaimed / HALVING_INTERVAL;
        if (halvings >= 5) return 3;
        if (halvings == 4) return 6;
        if (halvings == 3) return 12;
        if (halvings == 2) return 25;
        if (halvings == 1) return 50;
        return 100;
    }
    
    function getEarlyAdopterBonus() public view returns (uint256) {
        if (totalClaimed < HALVING_INTERVAL / 2) return 200;
        if (totalClaimed < HALVING_INTERVAL) return 150;
        if (totalClaimed < HALVING_INTERVAL * 2) return 125;
        return 100;
    }
    
    function recoverSigner(bytes32 hash, bytes memory signature) 
        internal 
        pure 
        returns (address) 
    {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        return ecrecover(hash, v, r, s);
    }
    
    function emergencyWithdraw() external {
        if (msg.sender != owner) revert Unauthorized();
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(owner, balance), "Transfer failed");
    }
    
    function getClaimableAmount(
        uint256 wins,
        uint256 top5s,
        uint256 starts
    ) external view returns (uint256) {
        uint256 points = (wins * POINTS_PER_WIN) + 
                        (top5s * POINTS_PER_TOP5) + 
                        (starts * POINTS_PER_START);
        
        uint256 baseReward = points * BASE_TOKENS_PER_POINT;
        uint256 reward = calculateRewardWithHalvingAndBonus(baseReward);
        
        if (totalClaimed + reward > TOTAL_CLAIM_POOL) {
            reward = TOTAL_CLAIM_POOL - totalClaimed;
        }
        
        return reward;
    }
}
