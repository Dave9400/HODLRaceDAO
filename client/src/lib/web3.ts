import { createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Base Sepolia testnet configuration
export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    farcasterMiniApp(),
    metaMask(),
    coinbaseWallet({
      appName: 'HODL Racing DAO',
      appLogoUrl: typeof window !== 'undefined' 
        ? `${window.location.origin}/app-icon.png`
        : '/app-icon.png'
    }),
    // Note: WalletConnect requires a real project ID from https://cloud.reown.com
    // Using placeholder for development - replace with real project ID for production
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '9f8e9c0d4c4f4b9b8c7a6f5e4d3c2b1a',
    }),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
})

// Mock APEX token configuration (testnet)
export const APEX_TOKEN = {
  address: '0x4578B2246f4A01432760d3e36CACC6fACca3c8a1' as const,
  symbol: 'APEX',
  decimals: 18,
  name: 'Mock APEX'
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