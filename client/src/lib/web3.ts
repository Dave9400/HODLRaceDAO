import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// Base network configuration
export const config = createConfig({
  chains: [base],
  connectors: [
    metaMask(),
    coinbaseWallet({
      appName: 'HODL Racing DAO',
      appLogoUrl: 'https://hodlracing.io/logo.png'
    }),
    // Note: WalletConnect requires a real project ID from https://cloud.reown.com
    // Using placeholder for development - replace with real project ID for production
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '9f8e9c0d4c4f4b9b8c7a6f5e4d3c2b1a',
    }),
  ],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
})

// NASCORN token configuration
export const NASCORN_TOKEN = {
  address: '0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07' as const,
  symbol: 'NASCORN',
  decimals: 18,
  name: 'NASCORN'
}

// Common contract ABIs
export const ERC20_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

// Utility functions
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals)
  const quotient = amount / divisor
  const remainder = amount % divisor
  
  if (remainder === BigInt(0)) {
    return quotient.toString()
  }
  
  const fractional = remainder.toString().padStart(decimals, '0')
  const trimmed = fractional.replace(/0+$/, '')
  
  return trimmed.length > 0 ? `${quotient}.${trimmed}` : quotient.toString()
}