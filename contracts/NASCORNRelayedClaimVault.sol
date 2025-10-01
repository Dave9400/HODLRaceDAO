// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
  NASCORNRelayedClaimVault

  - Relayer (oracle) pays gas by calling relayed functions.
  - Two-signature pattern:
      * oracleSignature: signs (racerId, wins, top5s, starts, expiry)
      * userSignature: wallet owner signs ("NASCORN LINK", racerId, wallet, expiry)
  - Contract verifies both signatures, enforces monotonic stats and halving logic,
    updates per-racer stats and totals, and transfers reward tokens to the user's wallet.
  - Owner sets `relayer` and `oracle` addresses (use multisig for owner).
  - Leaderboard arrays/events maintained (note: on-chain storage costs; recommend off-chain indexing).
*/

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract NASCORNRelayedClaimVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    uint8 public constant TOKEN_DECIMALS = 18;
    uint256 public constant DECIMAL_SCALE = 10 ** uint256(TOKEN_DECIMALS);

    IERC20 public immutable rewardToken;

    // economic params (scaled)
    uint256 public constant INITIAL_SUPPLY = 10_000_000_000 * DECIMAL_SCALE; // 10B
    uint256 public constant HALVING_STEP = 1_000_000_000 * DECIMAL_SCALE;    // 1B steps
    uint256 public constant USER_CAP = 100_000_000 * DECIMAL_SCALE;          // 100M cap
    uint256 public constant BASE_ACCOUNT_AWARD = 1_000_000 * DECIMAL_SCALE;  // one-time baseline
    uint256 public constant RATE_PER_WIN = 420_000 * DECIMAL_SCALE;
    uint256 public constant RATE_PER_TOP5 = 69_000 * DECIMAL_SCALE;
    uint256 public constant RATE_PER_START = 42_000 * DECIMAL_SCALE;

    // addresses
    address public relayer; // the address allowed to submit relayed txs (pays gas)
    address public oracle;  // address used to sign stat attestations (set by owner)

    // structs
    struct DriverStats {
        uint256 wins;
        uint256 top5s;
        uint256 starts;
        bool baselineClaimed;
    }

    struct Driver {
        address wallet;
        uint256 totalClaimed;
        uint256 lastClaimTs;
    }

    struct ClaimEvent {
        uint256 racerId;
        uint256 amount;
        uint256 timestamp;
    }

    // mappings / storage
    mapping(uint256 => Driver) public drivers;       // racerId -> Driver
    mapping(uint256 => DriverStats) public stats;    // racerId -> stored stats
    mapping(uint256 => bool) public hasEverClaimed; // racerId -> bool
    uint256 public globalClaimed;                    // total claimed tokens via this contract

    uint256[] public claimers;       // unique racerIds who've claimed
    ClaimEvent[] public claimEvents; // chronological claim events

    // events
    event RelayerChanged(address indexed oldRelayer, address indexed newRelayer);
    event OracleChanged(address indexed oldOracle, address indexed newOracle);
    event WalletRegisteredOnBehalf(uint256 indexed racerId, address indexed wallet);
    event AdminAssignedWallet(uint256 indexed racerId, address indexed newWallet);
    event RelayedClaim(uint256 indexed racerId, address indexed to, uint256 amount);
    event ClaimEventRecorded(uint256 indexed racerId, uint256 amount, uint256 timestamp);

    constructor(IERC20 _rewardToken, address initialOwner, address _relayer, address _oracle) Ownable(initialOwner) {
        require(address(_rewardToken) != address(0), "invalid token");
        require(initialOwner != address(0), "invalid owner");
        require(_relayer != address(0), "invalid relayer");
        require(_oracle != address(0), "invalid oracle");
        rewardToken = _rewardToken;
        relayer = _relayer;
        oracle = _oracle;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "only relayer");
        _;
    }

    function setRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "invalid relayer");
        emit RelayerChanged(relayer, newRelayer);
        relayer = newRelayer;
    }

    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "invalid oracle");
        emit OracleChanged(oracle, newOracle);
        oracle = newOracle;
    }

    function registerWalletOnBehalf(
        uint256 racerId,
        address wallet,
        uint256 expiry,
        bytes calldata userSig
    ) external onlyRelayer whenNotPaused nonReentrant {
        require(racerId != 0, "racerId zero");
        require(wallet != address(0), "invalid wallet");
        require(block.timestamp <= expiry, "user signature expired");

        bytes32 h = keccak256(abi.encodePacked("NASCORN LINK", racerId, wallet, expiry)).toEthSignedMessageHash();
        address signer = h.recover(userSig);
        require(signer == wallet, "invalid user signature");

        Driver storage d = drivers[racerId];
        if (d.wallet == address(0)) {
            d.wallet = wallet;
        } else {
            require(d.wallet == wallet, "racer linked to different wallet");
        }

        emit WalletRegisteredOnBehalf(racerId, wallet);
    }

    function adminAssignWallet(uint256 racerId, address newWallet) external onlyOwner {
        require(racerId != 0, "racerId zero");
        require(newWallet != address(0), "invalid wallet");
        drivers[racerId].wallet = newWallet;
        emit AdminAssignedWallet(racerId, newWallet);
    }

    function claimOnBehalfWithWallet(
        uint256 racerId,
        address wallet,
        uint256 wins,
        uint256 top5s,
        uint256 starts,
        uint256 expiry,
        bytes calldata oracleSig,
        bytes calldata userSig
    ) external onlyRelayer whenNotPaused nonReentrant {
        require(block.timestamp <= expiry, "attestation expired");
        require(racerId != 0, "racerId zero");
        require(wallet != address(0), "invalid wallet");

        // verify oracle signature (stats attestation)
        bytes32 digest = keccak256(abi.encodePacked(racerId, wins, top5s, starts, expiry)).toEthSignedMessageHash();
        address signer = digest.recover(oracleSig);
        require(signer == oracle, "invalid oracle signature");

        // verify user's wallet signature proves ownership
        bytes32 userDigest = keccak256(abi.encodePacked("NASCORN LINK", racerId, wallet, expiry)).toEthSignedMessageHash();
        address walletSigner = userDigest.recover(userSig);
        require(walletSigner == wallet, "invalid user signature");

        // Ensure wallet equals stored wallet for racerId (register if not yet set)
        Driver storage d = drivers[racerId];
        if (d.wallet == address(0)) {
            d.wallet = wallet;
            emit WalletRegisteredOnBehalf(racerId, wallet);
        } else {
            require(d.wallet == wallet, "wallet mismatch with stored driver");
        }

        // Verify monotonic stats
        DriverStats storage s = stats[racerId];
        require(wins >= s.wins && top5s >= s.top5s && starts >= s.starts, "stats decreased");

        uint256 deltaWins = wins - s.wins;
        uint256 deltaTop5 = top5s - s.top5s;
        uint256 deltaStarts = starts - s.starts;

        // compute award with halving
        uint256 divisor = _currentHalvingDivisor();
        uint256 award = 0;
        if (!s.baselineClaimed) {
            award += BASE_ACCOUNT_AWARD / divisor;
        }
        award += (deltaWins * (RATE_PER_WIN / divisor));
        award += (deltaTop5 * (RATE_PER_TOP5 / divisor));
        award += (deltaStarts * (RATE_PER_START / divisor));

        // cap to USER_CAP
        uint256 totalAfter = d.totalClaimed + award;
        if (totalAfter > USER_CAP) {
            if (d.totalClaimed >= USER_CAP) {
                award = 0;
            } else {
                award = USER_CAP - d.totalClaimed;
            }
        }

        require(award > 0, "nothing to claim");

        // update state
        s.wins = wins;
        s.top5s = top5s;
        s.starts = starts;
        if (!s.baselineClaimed) s.baselineClaimed = true;

        d.totalClaimed += award;
        d.lastClaimTs = block.timestamp;

        // bookkeeping
        globalClaimed += award;
        if (!hasEverClaimed[racerId]) {
            hasEverClaimed[racerId] = true;
            claimers.push(racerId);
        }
        claimEvents.push(ClaimEvent({racerId: racerId, amount: award, timestamp: block.timestamp}));

        // transfer tokens
        rewardToken.safeTransfer(wallet, award);

        emit RelayedClaim(racerId, wallet, award);
        emit ClaimEventRecorded(racerId, award, block.timestamp);
    }

    function _currentHalvingDivisor() internal view returns (uint256) {
        uint256 n = globalClaimed / HALVING_STEP;
        if (n == 0) return 1;
        if (n >= 128) return type(uint256).max;
        return uint256(1) << n;
    }

    function currentDivisor() external view returns (uint256) {
        return _currentHalvingDivisor();
    }

    function estimateAwardFromStats(uint256 racerId, uint256 wins, uint256 top5s, uint256 starts) external view returns (uint256) {
        Driver storage d = drivers[racerId];
        DriverStats storage s = stats[racerId];
        if (wins < s.wins || top5s < s.top5s || starts < s.starts) return 0;
        uint256 divisor = _currentHalvingDivisor();
        uint256 award = 0;
        if (!s.baselineClaimed) award += BASE_ACCOUNT_AWARD / divisor;
        award += (wins - s.wins) * (RATE_PER_WIN / divisor);
        award += (top5s - s.top5s) * (RATE_PER_TOP5 / divisor);
        award += (starts - s.starts) * (RATE_PER_START / divisor);
        if (d.totalClaimed >= USER_CAP) return 0;
        if (d.totalClaimed + award > USER_CAP) return USER_CAP - d.totalClaimed;
        return award;
    }

    function getStoredStats(uint256 racerId) external view returns (uint256 wins, uint256 top5s, uint256 starts, bool baseline) {
        DriverStats storage s = stats[racerId];
        return (s.wins, s.top5s, s.starts, s.baselineClaimed);
    }

    function totalClaimers() external view returns (uint256) { return claimers.length; }
    function totalClaimEvents() external view returns (uint256) { return claimEvents.length; }

    function topNAllTime(uint256 n) external view returns (uint256[] memory racerIds, uint256[] memory amounts) {
        if (n > 25) n = 25;
        uint256 L = claimers.length;
        if (L == 0) {
            return (new uint256[](0), new uint256[](0));
        }
        uint256 toTake = n;
        if (toTake > L) toTake = L;
        uint256[] memory ids = new uint256[](L);
        uint256[] memory vals = new uint256[](L);
        for (uint256 i = 0; i < L; ++i) {
            uint256 rid = claimers[i];
            ids[i] = rid;
            vals[i] = drivers[rid].totalClaimed;
        }
        uint256[] memory outIds = new uint256[](toTake);
        uint256[] memory outVals = new uint256[](toTake);
        for (uint256 k = 0; k < toTake; ++k) {
            uint256 bestIdx = k;
            for (uint256 j = k; j < L; ++j) {
                if (vals[j] > vals[bestIdx]) bestIdx = j;
            }
            (ids[k], ids[bestIdx]) = (ids[bestIdx], ids[k]);
            (vals[k], vals[bestIdx]) = (vals[bestIdx], vals[k]);
            outIds[k] = ids[k];
            outVals[k] = vals[k];
        }
        return (outIds, outVals);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function emergencyWithdrawTokens(IERC20 token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "invalid to");
        token.safeTransfer(to, amount);
    }
}
