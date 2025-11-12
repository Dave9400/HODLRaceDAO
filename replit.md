# HODL Racing DAO - Farcaster Mini App

## Overview

HODL Racing DAO is a Web3 racing community platform that integrates decentralized finance with competitive racing. Users can trade APEX tokens on the Base network and participate in a racing-focused DAO. The platform rewards real racing performance (via iRacing integration) with token incentives, merging motorsports with DeFi. It functions as a Farcaster Mini App, offering a mobile-first experience for token trading, race statistics, and DAO governance, inspired by Uniswap's design and Gran Turismo's aesthetics. The project aims to create a unique intersection of racing and cryptocurrency, fostering a vibrant community around shared passions.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 2025 - Production Multi-Chain Configuration & Paymaster Fixes
- **Shared Chain Configuration**: Created centralized configuration for multi-chain support
  - `shared/chain.ts` provides single source of truth for both frontend and backend
  - Supports Base Mainnet (8453) and Base Sepolia (84532)
  - Cross-environment helper works in both Node.js and browser
  - Configuration validation ensures deployment blocks and contract addresses are set
  - Prevents silent failures in production
- **Multi-Chain Support**: Updated all blockchain integrations
  - Frontend wagmi config supports both Base Mainnet and Sepolia
  - Backend signature generation uses shared chain ID (fixes EIP-712 mismatch)
  - Leaderboard queries correct chain with proper deployment block
  - Contract stats endpoint uses shared configuration
  - No hardcoded chain IDs, RPC URLs, or deployment blocks
- **Paymaster Production Fix**: Resolved gas sponsorship failures on Base Mainnet
  - Added fresh capability validation before paymaster calls
  - Fixed chain ID mismatch between frontend and backend
  - Coinbase Smart Wallet now uses `smartWalletOnly` preference
  - Comprehensive logging for production debugging
- **Environment Configuration**: Production requires explicit environment variables
  - `VITE_ACTIVE_CHAIN_ID=8453` for Base Mainnet (defaults to 84532 for dev)
  - `DEPLOYMENT_BLOCK_MAINNET` required for production leaderboard/stats
  - `VITE_APP_LOGO_URL` configurable (defaults to hodlracing.fun)
- **App Manifest for Wallet Apps**: Created web manifest for proper app branding
  - Wallet apps display HODL Racing logo instead of generic icon
- **Clickable Logo Navigation**: Made header logo clickable for better UX

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite.
- **Routing**: Wouter for lightweight client-side navigation.
- **UI Framework**: Shadcn/ui component library with Radix UI primitives.
- **Styling**: Tailwind CSS with a racing-inspired custom design system.
- **State Management**: React Query (TanStack Query) for server state and caching.
- **UI/UX Decisions**: Uniswap-inspired clean design with Gran Turismo aesthetics. Racing-inspired color palette (bright blue, golden yellow, warm cream), Open Sans typography, card-based layouts, and performance-focused dashboard components.
- **Features**: Gas-free claims for Coinbase Smart Wallet users via Coinbase Paymaster integration with graceful fallback. Farcaster Mini App Connector for native Farcaster wallet support. Leaderboard displays real names and aggregates claims by iRacing ID, featuring all-time and weekly data, along with racing statistics. Enhanced UI for crypto newbies with Coinbase Smart Wallet recommendations.

### Web3 Integration
- **Blockchain**: Base network (Ethereum L2).
- **Wallet Connection**: Wagmi v2 supporting MetaMask, Coinbase Wallet, WalletConnect, and Farcaster.
- **Token Standard**: ERC-20 APEX token.
- **Smart Contract Interaction**: Direct contract calls for token trading and balance queries.

### Backend Architecture
- **Server**: Express.js with TypeScript for API endpoints.
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: Connect-pg-simple for PostgreSQL-backed session storage.
- **Data Layer**: Drizzle ORM for type-safe queries; Zod schemas for runtime validation.
- **Multi-Chain Configuration**: Shared `shared/chain.ts` configuration ensures frontend/backend chain ID synchronization, with validation to prevent misconfiguration.
- **Implementations**: `/api/paymaster` proxy endpoint for secure gas sponsorship. `/api/leaderboard` endpoint fetches and aggregates blockchain claim events for leaderboard data, with optimizations for RPC limits and timestamp caching. All blockchain integrations use shared chain configuration.

### System Design Choices
- **Security**: Implemented EIP-712 domain separation for claim signatures to prevent replay attacks. Signature validation includes v-range, s-value, and non-zero recovery checks. Backend signs typed structured data matching contract structure.
- **Smart Contract Features**: Incremental claims based on stat deltas, claim history tracking, halving mechanics for rewards (500M total pool, halving every 100M claimed), and a points system (1000 points/win, 100/top 5, 10/start).
- **Development Tools**: Vite for fast builds, ESLint and TypeScript for code quality, PostCSS with Tailwind CSS, and optimized asset handling.

## External Dependencies

### Blockchain Services
- **Base Network**: Ethereum Layer 2 network supporting both Base Mainnet (8453) and Base Sepolia (84532) testnet.
  - Development defaults to Base Sepolia (84532)
  - Production requires `VITE_ACTIVE_CHAIN_ID=8453` and `DEPLOYMENT_BLOCK_MAINNET` environment variables
- **APEX Token Contract**: Custom ERC-20 token on Base (0xF525b62868B03ecc00DeDbbd3A2B94f7faf259F8).
- **Claim Contract V2**: Smart contract for APEX rewards with EIP-712 signatures (0xf9BAE7532985Ff541a608C4C01C222445a93B751).
- **Web3 Providers**: MetaMask, Coinbase Wallet (Smart Wallet preferred for gas sponsorship), WalletConnect, Farcaster via Wagmi connectors.

### Database
- **Neon Database**: Serverless PostgreSQL database.

### External APIs
- **iRacing API**: Planned for fetching racing performance data.
- **Farcaster Integration**: Mini app framework.
- **Coinbase Paymaster**: Used for gas sponsorship integration to enable gas-free transactions for Smart Wallet users.
- **WalletConnect**: Cloud service for cross-platform wallet connectivity.

### UI and Development Libraries
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **React Hook Form**: Form state management.
- **Date-fns**: Date manipulation utility.

### Infrastructure
- **Replit Platform**: Development and deployment environment.