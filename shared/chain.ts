// Shared chain configuration for both frontend and backend
// This ensures EIP-712 signatures match between client and server

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contracts: {
    apex: string;
    claim: string;
  };
  deploymentBlock: number; // Starting block for event queries
}

// Helper to get environment variables in both Node and browser
function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  return undefined;
}

// Allowlisted chain configurations
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Base Mainnet
  8453: {
    id: 8453,
    name: 'Base',
    rpcUrl: 'https://base.drpc.org',
    blockExplorer: 'https://basescan.org',
    contracts: {
      apex: getEnv('APEX_TOKEN_ADDRESS_MAINNET') || getEnv('VITE_APEX_TOKEN_ADDRESS_MAINNET') || '0xF525b62868B03ecc00DeDbbd3A2B94f7faf259F8',
      claim: getEnv('CLAIM_CONTRACT_ADDRESS_MAINNET') || getEnv('VITE_CLAIM_CONTRACT_ADDRESS_MAINNET') || '0xf9BAE7532985Ff541a608C4C01C222445a93B751',
    },
    deploymentBlock: parseInt(getEnv('DEPLOYMENT_BLOCK_MAINNET') || getEnv('VITE_DEPLOYMENT_BLOCK_MAINNET') || '0', 10),
  },
  // Base Sepolia Testnet
  84532: {
    id: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    contracts: {
      apex: getEnv('APEX_TOKEN_ADDRESS_SEPOLIA') || getEnv('VITE_APEX_TOKEN_ADDRESS_SEPOLIA') || '0xF525b62868B03ecc00DeDbbd3A2B94f7faf259F8',
      claim: getEnv('CLAIM_CONTRACT_ADDRESS_SEPOLIA') || getEnv('VITE_CLAIM_CONTRACT_ADDRESS_SEPOLIA') || '0xDC4ba89f4AE8f0F348aBCE95a59f70b7a06dB953',
    },
    deploymentBlock: parseInt(getEnv('DEPLOYMENT_BLOCK_SEPOLIA') || getEnv('VITE_DEPLOYMENT_BLOCK_SEPOLIA') || '33612762', 10),
  },
};

// Get active chain from environment variable
// Defaults to Base Sepolia (84532) for development
// Production should explicitly set VITE_ACTIVE_CHAIN_ID=8453 for Base Mainnet
export function getActiveChainId(): number {
  const envChainId = getEnv('ACTIVE_CHAIN_ID') || getEnv('VITE_ACTIVE_CHAIN_ID');
  const chainId = envChainId ? parseInt(envChainId, 10) : 84532;
  
  if (!CHAIN_CONFIGS[chainId]) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(CHAIN_CONFIGS).join(', ')}`);
  }
  
  return chainId;
}

export function getActiveChainConfig(): ChainConfig {
  const chainId = getActiveChainId();
  const config = CHAIN_CONFIGS[chainId];
  
  // Validate critical configuration values
  if (!config.contracts.claim || config.contracts.claim === '0x0') {
    throw new Error(`Chain ${chainId} (${config.name}) missing claim contract address. Please set CLAIM_CONTRACT_ADDRESS_${chainId === 8453 ? 'MAINNET' : 'SEPOLIA'}`);
  }
  
  if (config.deploymentBlock === 0) {
    throw new Error(`Chain ${chainId} (${config.name}) missing deployment block. Please set DEPLOYMENT_BLOCK_${chainId === 8453 ? 'MAINNET' : 'SEPOLIA'} environment variable.`);
  }
  
  return config;
}

// Validate that a contract address matches the expected chain
export function validateContractAddress(address: string, chainId: number): boolean {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) return false;
  
  const normalizedAddress = address.toLowerCase();
  return (
    normalizedAddress === config.contracts.apex.toLowerCase() ||
    normalizedAddress === config.contracts.claim.toLowerCase()
  );
}
