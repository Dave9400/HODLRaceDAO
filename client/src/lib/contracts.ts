import { parseEther, formatEther } from 'viem';

// Smart contract addresses (deployed on Base Sepolia testnet)
export const NASCORN_TOKEN_ADDRESS = "0x4578B2246f4A01432760d3e36CACC6fACca3c8a1"; // Mock NASCORN token
export const CLAIM_CONTRACT_ADDRESS = import.meta.env.VITE_CLAIM_CONTRACT_ADDRESS || "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8";

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
  {
    "inputs": [
      {"internalType": "uint256", "name": "iracingId", "type": "uint256"},
      {"internalType": "uint256", "name": "wins", "type": "uint256"},
      {"internalType": "uint256", "name": "top5s", "type": "uint256"},
      {"internalType": "uint256", "name": "starts", "type": "uint256"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentMultiplier",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "hasClaimed",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalClaimed",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "claimCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "signer",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TOTAL_CLAIM_POOL",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "HALVING_INTERVAL",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "POINTS_PER_WIN",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "POINTS_PER_TOP5",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "POINTS_PER_START",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "BASE_TOKENS_PER_POINT",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "wins", "type": "uint256"},
      {"internalType": "uint256", "name": "top5s", "type": "uint256"},
      {"internalType": "uint256", "name": "starts", "type": "uint256"}
    ],
    "name": "getClaimableAmount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "iracingId", "type": "uint256"},
      {"internalType": "uint256", "name": "wins", "type": "uint256"},
      {"internalType": "uint256", "name": "top5s", "type": "uint256"},
      {"internalType": "uint256", "name": "starts", "type": "uint256"}
    ],
    "name": "getClaimableAmountForId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "name": "lastClaim",
    "outputs": [
      {"internalType": "uint256", "name": "wins", "type": "uint256"},
      {"internalType": "uint256", "name": "top5s", "type": "uint256"},
      {"internalType": "uint256", "name": "starts", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "iracingId", "type": "uint256"}
    ],
    "name": "getLastClaimedStats",
    "outputs": [
      {"internalType": "uint256", "name": "wins", "type": "uint256"},
      {"internalType": "uint256", "name": "top5s", "type": "uint256"},
      {"internalType": "uint256", "name": "starts", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DOMAIN_SEPARATOR",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CLAIM_TYPEHASH",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "iracingId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "claimNumber", "type": "uint256"}
    ],
    "name": "Claimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "EmergencyWithdrawal",
    "type": "event"
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