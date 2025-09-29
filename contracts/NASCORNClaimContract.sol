// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title NASCORN Claim Contract
 * @dev Smart contract for claiming NASCORN tokens based on iRacing performance stats
 * Rewards are distributed based on verified racing achievements with halving mechanism
 */
contract NASCORNClaimContract is Ownable, ReentrancyGuard, Pausable {
    
    IERC20 public nascornToken;
    
    // Constants
    uint256 public constant MAX_CLAIM_AMOUNT = 100_000_000 * 10**18; // 100 million tokens max per user
    uint256 public constant INITIAL_TOTAL_SUPPLY = 10_000_000_000 * 10**18; // 10 billion initial supply
    uint256 public constant HALVING_THRESHOLD = 1_000_000_000 * 10**18; // 1 billion tokens trigger halving
    
    // Initial reward rates (will be halved periodically)
    uint256 public validAccountReward = 1_000_000 * 10**18; // 1 million for valid account
    uint256 public winReward = 420_000 * 10**18; // 420k per win
    uint256 public top5Reward = 69_000 * 10**18; // 69k per top 5
    uint256 public startReward = 42_000 * 10**18; // 42k per start
    
    // Tracking variables
    uint256 public totalClaimed;
    uint256 public currentHalvingEpoch;
    
    // User data structures
    struct UserStats {
        uint256 careerWins;
        uint256 careerTop5s;
        uint256 careerStarts;
        uint256 lastClaimTimestamp;
        uint256 totalClaimed;
        bool hasClaimedInitial;
        bool isRegistered;
    }
    
    struct LeaderboardEntry {
        address userAddress;
        string iracingId;
        uint256 totalClaimed;
        uint256 weeklyEarned;
        uint256 lastClaimTime;
    }
    
    // Mappings
    mapping(string => UserStats) public userStats; // iRacing ID => UserStats
    mapping(string => address) public iracingIdToAddress; // iRacing ID => Ethereum address
    mapping(address => string) public addressToIracingId; // Ethereum address => iRacing ID
    mapping(string => bool) public authorizedUpdaters; // Backend addresses that can update stats
    
    // Leaderboard tracking
    string[] public registeredUsers;
    mapping(string => uint256) public weeklyEarnings; // Track weekly earnings per user
    uint256 public weeklyResetTimestamp;
    
    // Events
    event UserRegistered(string iracingId, address userAddress);
    event RewardsClaimed(string iracingId, uint256 amount, uint256 wins, uint256 top5s, uint256 starts);
    event StatsUpdated(string iracingId, uint256 wins, uint256 top5s, uint256 starts);
    event RewardRatesHalved(uint256 newEpoch);
    event AuthorizedUpdaterAdded(string updaterAddress);
    event AuthorizedUpdaterRemoved(string updaterAddress);
    event WeeklyReset();
    
    modifier onlyAuthorizedUpdater() {
        require(authorizedUpdaters[addressToString(msg.sender)], "Not authorized to update stats");
        _;
    }
    
    modifier validIracingId(string memory iracingId) {
        require(bytes(iracingId).length > 0, "Invalid iRacing ID");
        _;
    }
    
    constructor(address _nascornToken) {
        nascornToken = IERC20(_nascornToken);
        weeklyResetTimestamp = block.timestamp + 7 days;
    }
    
    /**
     * @dev Register a new user with their iRacing ID
     * @param iracingId The user's iRacing account ID
     */
    function registerUser(string memory iracingId) external validIracingId(iracingId) {
        require(!userStats[iracingId].isRegistered, "User already registered");
        require(bytes(addressToIracingId[msg.sender]).length == 0, "Address already linked");
        
        userStats[iracingId].isRegistered = true;
        userStats[iracingId].lastClaimTimestamp = block.timestamp;
        
        iracingIdToAddress[iracingId] = msg.sender;
        addressToIracingId[msg.sender] = iracingId;
        registeredUsers.push(iracingId);
        
        emit UserRegistered(iracingId, msg.sender);
    }
    
    /**
     * @dev Update user stats (called by authorized backend after OAuth verification)
     * @param iracingId The user's iRacing account ID
     * @param wins Current career wins
     * @param top5s Current career top 5 finishes
     * @param starts Current career race starts
     */
    function updateUserStats(
        string memory iracingId,
        uint256 wins,
        uint256 top5s,
        uint256 starts
    ) external onlyAuthorizedUpdater validIracingId(iracingId) {
        require(userStats[iracingId].isRegistered, "User not registered");
        
        userStats[iracingId].careerWins = wins;
        userStats[iracingId].careerTop5s = top5s;
        userStats[iracingId].careerStarts = starts;
        
        emit StatsUpdated(iracingId, wins, top5s, starts);
    }
    
    /**
     * @dev Claim rewards based on current stats
     */
    function claimRewards() external nonReentrant whenNotPaused {
        string memory iracingId = addressToIracingId[msg.sender];
        require(bytes(iracingId).length > 0, "User not registered");
        
        UserStats storage user = userStats[iracingId];
        require(user.isRegistered, "User not registered");
        
        // Check for weekly reset
        if (block.timestamp >= weeklyResetTimestamp) {
            _resetWeeklyEarnings();
        }
        
        // Check for halving
        _checkAndApplyHalving();
        
        uint256 rewardAmount = 0;
        
        // Initial account reward (one-time)
        if (!user.hasClaimedInitial) {
            rewardAmount += validAccountReward;
            user.hasClaimedInitial = true;
        }
        
        // Calculate new rewards since last claim
        uint256 newWins = user.careerWins;
        uint256 newTop5s = user.careerTop5s;  
        uint256 newStarts = user.careerStarts;
        
        // For subsequent claims, only reward new achievements
        if (user.totalClaimed > 0) {
            // This would need to track previous stats to calculate deltas
            // For simplicity in this implementation, we reward full stats each time
            // In production, you'd store previous claim stats
        }
        
        rewardAmount += (newWins * winReward);
        rewardAmount += (newTop5s * top5Reward);
        rewardAmount += (newStarts * startReward);
        
        // Apply max claim cap
        if (user.totalClaimed + rewardAmount > MAX_CLAIM_AMOUNT) {
            rewardAmount = MAX_CLAIM_AMOUNT - user.totalClaimed;
        }
        
        require(rewardAmount > 0, "No rewards to claim");
        require(nascornToken.balanceOf(address(this)) >= rewardAmount, "Insufficient contract balance");
        
        // Update user data
        user.totalClaimed += rewardAmount;
        user.lastClaimTimestamp = block.timestamp;
        
        // Update tracking
        totalClaimed += rewardAmount;
        weeklyEarnings[iracingId] += rewardAmount;
        
        // Transfer tokens
        nascornToken.transfer(msg.sender, rewardAmount);
        
        emit RewardsClaimed(iracingId, rewardAmount, newWins, newTop5s, newStarts);
    }
    
    /**
     * @dev Get user's racing statistics
     * @param iracingId The user's iRacing account ID
     */
    function getUserStats(string memory iracingId) external view returns (
        uint256 careerWins,
        uint256 careerTop5s,
        uint256 careerStarts,
        uint256 totalClaimed,
        uint256 lastClaimTimestamp,
        bool hasClaimedInitial
    ) {
        UserStats memory user = userStats[iracingId];
        return (
            user.careerWins,
            user.careerTop5s,
            user.careerStarts,
            user.totalClaimed,
            user.lastClaimTimestamp,
            user.hasClaimedInitial
        );
    }
    
    /**
     * @dev Get top 25 users by total claims
     */
    function getTopClaimers() external view returns (LeaderboardEntry[] memory) {
        LeaderboardEntry[] memory entries = new LeaderboardEntry[](registeredUsers.length);
        
        for (uint256 i = 0; i < registeredUsers.length; i++) {
            string memory iracingId = registeredUsers[i];
            UserStats memory user = userStats[iracingId];
            
            entries[i] = LeaderboardEntry({
                userAddress: iracingIdToAddress[iracingId],
                iracingId: iracingId,
                totalClaimed: user.totalClaimed,
                weeklyEarned: weeklyEarnings[iracingId],
                lastClaimTime: user.lastClaimTimestamp
            });
        }
        
        // Sort by total claimed (descending)
        _sortByTotalClaimed(entries);
        
        // Return top 25 or all if less than 25
        uint256 length = entries.length > 25 ? 25 : entries.length;
        LeaderboardEntry[] memory topEntries = new LeaderboardEntry[](length);
        for (uint256 i = 0; i < length; i++) {
            topEntries[i] = entries[i];
        }
        
        return topEntries;
    }
    
    /**
     * @dev Get top 25 users by weekly earnings
     */
    function getTopWeeklyEarners() external view returns (LeaderboardEntry[] memory) {
        LeaderboardEntry[] memory entries = new LeaderboardEntry[](registeredUsers.length);
        
        for (uint256 i = 0; i < registeredUsers.length; i++) {
            string memory iracingId = registeredUsers[i];
            UserStats memory user = userStats[iracingId];
            
            entries[i] = LeaderboardEntry({
                userAddress: iracingIdToAddress[iracingId],
                iracingId: iracingId,
                totalClaimed: user.totalClaimed,
                weeklyEarned: weeklyEarnings[iracingId],
                lastClaimTime: user.lastClaimTimestamp
            });
        }
        
        // Sort by weekly earned (descending)
        _sortByWeeklyEarned(entries);
        
        // Return top 25 or all if less than 25
        uint256 length = entries.length > 25 ? 25 : entries.length;
        LeaderboardEntry[] memory topEntries = new LeaderboardEntry[](length);
        for (uint256 i = 0; i < length; i++) {
            topEntries[i] = entries[i];
        }
        
        return topEntries;
    }
    
    /**
     * @dev Check and apply halving if threshold reached
     */
    function _checkAndApplyHalving() internal {
        uint256 expectedEpoch = totalClaimed / HALVING_THRESHOLD;
        
        if (expectedEpoch > currentHalvingEpoch) {
            // Apply halving
            validAccountReward = validAccountReward / 2;
            winReward = winReward / 2;
            top5Reward = top5Reward / 2;
            startReward = startReward / 2;
            
            currentHalvingEpoch = expectedEpoch;
            
            emit RewardRatesHalved(currentHalvingEpoch);
        }
    }
    
    /**
     * @dev Reset weekly earnings tracking
     */
    function _resetWeeklyEarnings() internal {
        for (uint256 i = 0; i < registeredUsers.length; i++) {
            weeklyEarnings[registeredUsers[i]] = 0;
        }
        weeklyResetTimestamp = block.timestamp + 7 days;
        emit WeeklyReset();
    }
    
    /**
     * @dev Sort leaderboard entries by total claimed (descending)
     */
    function _sortByTotalClaimed(LeaderboardEntry[] memory entries) internal pure {
        uint256 length = entries.length;
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (entries[j].totalClaimed < entries[j + 1].totalClaimed) {
                    LeaderboardEntry memory temp = entries[j];
                    entries[j] = entries[j + 1];
                    entries[j + 1] = temp;
                }
            }
        }
    }
    
    /**
     * @dev Sort leaderboard entries by weekly earned (descending)
     */
    function _sortByWeeklyEarned(LeaderboardEntry[] memory entries) internal pure {
        uint256 length = entries.length;
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (entries[j].weeklyEarned < entries[j + 1].weeklyEarned) {
                    LeaderboardEntry memory temp = entries[j];
                    entries[j] = entries[j + 1];
                    entries[j + 1] = temp;
                }
            }
        }
    }
    
    /**
     * @dev Add authorized updater (backend service)
     * @param updaterAddress Address that can update user stats
     */
    function addAuthorizedUpdater(string memory updaterAddress) external onlyOwner {
        authorizedUpdaters[updaterAddress] = true;
        emit AuthorizedUpdaterAdded(updaterAddress);
    }
    
    /**
     * @dev Remove authorized updater
     * @param updaterAddress Address to remove from authorized updaters
     */
    function removeAuthorizedUpdater(string memory updaterAddress) external onlyOwner {
        authorizedUpdaters[updaterAddress] = false;
        emit AuthorizedUpdaterRemoved(updaterAddress);
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Withdraw tokens (emergency only)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        nascornToken.transfer(owner(), amount);
    }
    
    /**
     * @dev Get current reward rates
     */
    function getCurrentRewardRates() external view returns (
        uint256 accountReward,
        uint256 perWin,
        uint256 perTop5,
        uint256 perStart,
        uint256 halvingEpoch
    ) {
        return (validAccountReward, winReward, top5Reward, startReward, currentHalvingEpoch);
    }
}

    // Helper function to convert address to string
    function addressToString(address addr) internal pure returns (string memory) {
        return Strings.toHexString(uint160(addr), 20);
    }