import { parseEther, formatEther } from 'viem';

// Smart contract addresses (will be set after deployment)
export const NASCORN_TOKEN_ADDRESS = "0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07"; // NASCORN token on Base
export const CLAIM_CONTRACT_ADDRESS = import.meta.env.VITE_CLAIM_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Smart contract ABIs
export const NASCORN_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const CLAIM_CONTRACT_ABI = [
  // User management functions
  {
    "inputs": [{"internalType": "string", "name": "iracingId", "type": "string"}],
    "name": "registerUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Stats update (called by backend)
  {
    "inputs": [
      {"internalType": "string", "name": "iracingId", "type": "string"},
      {"internalType": "uint256", "name": "wins", "type": "uint256"},
      {"internalType": "uint256", "name": "top5s", "type": "uint256"},
      {"internalType": "uint256", "name": "starts", "type": "uint256"}
    ],
    "name": "updateUserStats",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Rewards claiming
  {
    "inputs": [],
    "name": "claimRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // View functions
  {
    "inputs": [{"internalType": "string", "name": "iracingId", "type": "string"}],
    "name": "getUserStats",
    "outputs": [
      {"internalType": "uint256", "name": "careerWins", "type": "uint256"},
      {"internalType": "uint256", "name": "careerTop5s", "type": "uint256"},
      {"internalType": "uint256", "name": "careerStarts", "type": "uint256"},
      {"internalType": "uint256", "name": "totalClaimed", "type": "uint256"},
      {"internalType": "uint256", "name": "lastClaimTimestamp", "type": "uint256"},
      {"internalType": "bool", "name": "hasClaimedInitial", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "getCurrentRewardRates",
    "outputs": [
      {"internalType": "uint256", "name": "accountReward", "type": "uint256"},
      {"internalType": "uint256", "name": "perWin", "type": "uint256"},
      {"internalType": "uint256", "name": "perTop5", "type": "uint256"},
      {"internalType": "uint256", "name": "perStart", "type": "uint256"},
      {"internalType": "uint256", "name": "halvingEpoch", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Leaderboard functions
  {
    "inputs": [],
    "name": "getTopClaimers",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "userAddress", "type": "address"},
          {"internalType": "string", "name": "iracingId", "type": "string"},
          {"internalType": "uint256", "name": "totalClaimed", "type": "uint256"},
          {"internalType": "uint256", "name": "weeklyEarned", "type": "uint256"},
          {"internalType": "uint256", "name": "lastClaimTime", "type": "uint256"}
        ],
        "internalType": "struct NASCORNClaimContract.LeaderboardEntry[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "getTopWeeklyEarners",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "userAddress", "type": "address"},
          {"internalType": "string", "name": "iracingId", "type": "string"},
          {"internalType": "uint256", "name": "totalClaimed", "type": "uint256"},
          {"internalType": "uint256", "name": "weeklyEarned", "type": "uint256"},
          {"internalType": "uint256", "name": "lastClaimTime", "type": "uint256"}
        ],
        "internalType": "struct NASCORNClaimContract.LeaderboardEntry[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Global stats
  {
    "inputs": [],
    "name": "totalClaimed",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "currentHalvingEpoch",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Admin functions  
  {
    "inputs": [{"internalType": "string", "name": "updaterAddress", "type": "string"}],
    "name": "addAuthorizedUpdater",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Utility functions for token amounts
export const formatNascornAmount = (amount: bigint): string => {
  return parseFloat(formatEther(amount)).toLocaleString();
};

export const parseNascornAmount = (amount: string): bigint => {
  return parseEther(amount);
};

// Calculate estimated rewards based on stats
export interface RewardCalculation {
  accountReward: number;
  winRewards: number;
  top5Rewards: number;
  startRewards: number;
  totalRewards: number;
  cappedRewards: number;
}

export const calculateEstimatedRewards = (
  careerWins: number,
  careerTop5s: number,
  careerStarts: number,
  hasClaimedInitial: boolean,
  currentRates?: {
    accountReward: bigint;
    perWin: bigint;
    perTop5: bigint;
    perStart: bigint;
  }
): RewardCalculation => {
  // Default rates (will be overridden by contract rates)
  const defaultRates = {
    accountReward: parseEther("1000000"), // 1M
    perWin: parseEther("420000"),         // 420k
    perTop5: parseEther("69000"),         // 69k
    perStart: parseEther("42000")         // 42k
  };
  
  const rates = currentRates || defaultRates;
  
  const accountReward = hasClaimedInitial ? 0 : Number(formatEther(rates.accountReward));
  const winRewards = careerWins * Number(formatEther(rates.perWin));
  const top5Rewards = careerTop5s * Number(formatEther(rates.perTop5));
  const startRewards = careerStarts * Number(formatEther(rates.perStart));
  
  const totalRewards = accountReward + winRewards + top5Rewards + startRewards;
  const cappedRewards = Math.min(totalRewards, 100_000_000); // 100M cap
  
  return {
    accountReward,
    winRewards,
    top5Rewards,
    startRewards,
    totalRewards,
    cappedRewards
  };
};

// Error handling utilities
export class ContractError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ContractError';
  }
}

export const parseContractError = (error: any): string => {
  if (error?.message?.includes('User rejected')) {
    return 'Transaction was rejected by user';
  }
  
  if (error?.message?.includes('insufficient funds')) {
    return 'Insufficient funds for transaction';
  }
  
  if (error?.message?.includes('execution reverted')) {
    // Try to extract revert reason
    const revertMatch = error.message.match(/execution reverted: (.+)/);
    if (revertMatch) {
      return `Contract error: ${revertMatch[1]}`;
    }
    return 'Transaction failed - contract rejected the operation';
  }
  
  if (error?.message?.includes('gas')) {
    return 'Transaction failed due to gas estimation';
  }
  
  // Fallback
  return error?.message || 'Unknown error occurred';
};

// Network configuration
export const BASE_CHAIN_CONFIG = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://base.drpc.org'] },
    default: { http: ['https://base.drpc.org'] },
  },
  blockExplorers: {
    etherscan: { name: 'Basescan', url: 'https://basescan.org' },
    default: { name: 'Basescan', url: 'https://basescan.org' },
  },
};