# HODL Racing DAO - Farcaster Mini App

## Overview

HODL Racing DAO is a Web3 racing community platform that integrates decentralized finance with competitive racing. Users can trade APEX tokens on the Base network and participate in a racing-focused DAO. The platform rewards real racing performance (via iRacing integration) with token incentives, merging motorsports with DeFi. It functions as a Farcaster Mini App, offering a mobile-first experience for token trading, race statistics, and DAO governance, inspired by Uniswap's design and Gran Turismo's aesthetics.

**Token Economics:** 50 billion APEX token pool with 10-cycle halving schedule designed for 20-30 year contract lifespan. Rewards start at 100 tokens per point with first-claim bonus, halving every 5 billion tokens claimed across 9 halving events.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 15, 2025 - Farcaster Profile Integration
- **Farcaster Profile Pictures & Usernames**: Integrated Neynar API to display Farcaster profiles on leaderboard
  - **Automatic FID Linking**: Captures Farcaster FID from Mini App SDK context during iRacing OAuth
  - **Profile Display**: Shows Farcaster profile pictures and @usernames on leaderboard
  - **Graceful Fallback**: Falls back to initials avatar and iRacing ID when no Farcaster profile linked
  - **Stable Mapping**: Maps by iRacing ID (not wallet) so profiles persist across wallet changes
  - **Database Schema**: Created `farcaster_profiles` table (iRacing ID, FID, username, display name, PFP URL, bio, follower count)
  - **Neynar Integration**: Using @neynar/nodejs-sdk v2 with Configuration API
  - **Backend Endpoints**: 
    - `POST /api/farcaster/link` - Saves FID mapping and fetches profile from Neynar
    - `GET /api/leaderboard` - Enriched with Farcaster profile data
  - **24h Profile Cache**: Reduces Neynar API calls with timestamp-based cache
  - **Batch Lookups**: Efficiently fetches up to 100 profiles per request
  - **Mobile & Desktop UI**: Both layouts display Farcaster avatars and @username badges
  - **Latest Match Logic**: Updates FID mapping if user logs in with different Farcaster account

### November 15, 2025 - DAO Treasury Page
- **DAO Treasury Feature**: Added new page to view treasury balance and governance (coming soon)
  - Live APEX balance display for DAO treasury address (0xb3f2be71995f178c0988737d9482eb8a6392776d)
  - Shows percentage of total supply held in treasury
  - Treasury address display with link to block explorer
  - Initial allocation info: 20B APEX (20% of 100B total supply)
  - Placeholder sections for future governance features (OpenZeppelin Governor)
  - Added "DAO Treasury" navigation button with Wallet icon
  - Accessible from home page navigation hub and mobile menu

### November 14, 2025 - Leaderboard RPC Fix
- **Block Range Pagination**: Fixed leaderboard blank issue caused by RPC limits
  - Queries now fetch events in 99,999 block chunks to avoid 100k limit
  - Retry logic with exponential backoff (3 attempts: 1s, 2s, 4s delays)
  - Type-safe event filtering using type guards
  - Error propagation prevents showing incomplete leaderboard data
  - Leaderboard successfully displays all historical claims
  - Error: "query exceeds max block range 100000" resolved

### November 13, 2025 - Database Fix, Farcaster Assets & Mobile UX
- **Database Connection Fix**: Resolved Neon serverless WebSocket errors preventing profile saves
  - Configured `neonConfig.webSocketConstructor = ws` in `server/db.ts`
  - iRacing profile data (firstName, lastName, displayName) now saves properly
  - Leaderboard displays real names instead of "Racer [ID]" after authentication
- **Farcaster Mini App Assets**: Complete branding setup
  - Icon: `/icon.png` - Golden HODL Racing DAO shield badge
  - Preview: `/image.png` - Leaderboard screenshot for app shares
  - Splash: `/splash.png` - Logo splash screen for app loading
  - All assets served via Express routes and configured in manifest
- **Mobile Leaderboard UX**: Redesigned responsive layout to prevent text overlap
  - Separate mobile and desktop layouts with proper stacking
  - 4-row mobile structure: rank+driver, stats, racing performance, wallet+date
  - Proper text truncation and spacing prevents overlapping content
  - Smaller icons and optimized font sizes for mobile screens
- **Social Share Features**: Two sharing mechanisms for community growth
  - **Post-Claim Dialog**: Automatic share prompt after successful claim
    - Shows delta stats (new wins, top 5s, starts since last claim)
    - Message: "I just claimed my $APEX from the HODL Racing DAO!"
    - Displays claim amount and racing performance
  - **Career Share Buttons**: Permanent buttons on Race to Earn page
    - Visible for users who have already claimed (hasPreviousClaim === true)
    - Shows career total stats (all-time wins, top 5s, starts)
    - Message: "Check out my career earnings from the HODL Racing DAO!"
    - Displays total APEX balance held in wallet
  - Both use Warpcast compose URL for Farcaster and X intent URL with hashtags
  - Hashtags: #APEX, #iRacing, #Web3Gaming, #RaceToEarn

### November 2025 - Updated Contract Economics & Transaction UI Fixes
- **Contract V2 Economics Update**: Upgraded to 50B token pool with 10-cycle halving
  - Total pool: 50 billion APEX tokens (was 500 million)
  - Halving interval: 5 billion tokens per cycle (was 100 million)
  - 10 cycles total with 9 halving events (was 5 cycles)
  - Base reward: 100 tokens per point (was 1000) for 20-30 year lifespan
  - First-claim bonus: 1000 points to reward early adopters
  - Multiplier range: 512x → 1x across all cycles
- **Transaction UI Fixes**: Resolved stuck "claiming" button issues
  - Smart restoration: Only shows "claiming" if transaction is actually pending
  - Auto-clear on completion: Detects CONFIRMED/FAILED and clears UI state
  - Safety checks: Monitors hasClaimed status to prevent stuck states
  - Balance updates: Automatic APEX balance refresh after successful claims
  - LocalStorage cleanup: 10-minute expiration with wallet address validation

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
- **Smart Contract Features**: Incremental claims based on stat deltas, claim history tracking, 10-cycle halving mechanics for rewards (50B total pool, halving every 5B claimed, 100 tokens per point with 1000-point first-claim bonus), and a points system (1000 points/win, 100/top 5, 10/start).
- **Development Tools**: Vite for fast builds, ESLint and TypeScript for code quality, PostCSS with Tailwind CSS, and optimized asset handling.

## External Dependencies

### Blockchain Services
- **Base Network**: Ethereum Layer 2 network supporting both Base Mainnet (8453) and Base Sepolia (84532) testnet.
  - Development defaults to Base Sepolia (84532)
  - Production requires `VITE_ACTIVE_CHAIN_ID=8453` and `DEPLOYMENT_BLOCK_MAINNET` environment variables
- **APEX Token Contract**: Custom ERC-20 token on Base
  - Base Sepolia: 0x2aC8d74e75520A2A82Edada99E20291b7EC779aD (50B supply)
  - Base Mainnet: 0xF525b62868B03ecc00DeDbbd3A2B94f7faf259F8 (old token, needs redeployment)
- **Claim Contract V2**: Smart contract for APEX rewards with EIP-712 signatures and 50B token economics
  - Base Sepolia: 0xDC4ba89f4AE8f0F348aBCE95a59f70b7a06dB953 (deployed block 33612762, funded with 50B tokens)
  - Base Mainnet: 0xf9BAE7532985Ff541a608C4C01C222445a93B751 (old contract, needs redeployment with new economics)
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