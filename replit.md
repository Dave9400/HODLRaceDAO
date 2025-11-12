# HODL Racing DAO - Farcaster Mini App

## Overview

HODL Racing DAO is a Web3 racing community platform that combines decentralized finance with competitive racing. The application enables users to trade APEX tokens on the Base network while participating in a racing-focused DAO. The platform integrates with iRacing to reward real racing performance with token incentives, creating a unique intersection of motorsports and DeFi.

The application serves as a Farcaster Mini App, providing a streamlined mobile-first experience for the racing community. Users can connect their wallets, trade tokens, view racing statistics, and participate in DAO governance through an intuitive interface inspired by Uniswap's clean design and Gran Turismo's racing aesthetics.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 2025 - Gas Sponsorship Implementation
- **Coinbase Paymaster Integration**: Implemented gas-free claims for Coinbase Smart Wallet users
  - Frontend uses wagmi experimental hooks (`useWriteContracts`, `useCapabilities`, `useCallsStatus`)
  - Automatic detection of paymaster support via wallet capabilities
  - Graceful fallback to regular transaction if paymaster unavailable or fails
  - Comprehensive error handling for FAILED/PENDING/CONFIRMED states
  - User-facing toasts explain sponsorship status and fallback scenarios
- **Dual Transaction Path**:
  - Smart Wallet users: Gas-free claims via CDP paymaster (when configured)
  - Non-Smart Wallet users: Regular transactions (user pays gas)
  - Automatic fallback ensures all users can claim regardless of wallet type
- **Production Requirements**:
  - `CDP_PAYMASTER_URL` secret must be added to production deployment
  - Secret should point to Coinbase Developer Platform paymaster endpoint
  - Contract must be allowlisted in CDP dashboard
- **Status**: Frontend implementation complete, architect reviewed. Requires CDP_PAYMASTER_URL configuration in production.

### November 2025 - Claim Page UX Improvements
- **Removed Manual Race Entry**: Cleaned up claim interface by removing development-only manual race entry section
  - Removed manual entry card and modal from RaceToEarn.tsx
  - Cleaned up unused state variables and imports (showAddRace, raceForm, etc.)
- **Restructured IRacingAuth Component**: Improved information hierarchy and user flow
  - **Halving Progress**: Now displays BEFORE wallet/iRacing connection (top-level, gated on contractStats)
  - **Wallet Balance**: Shows immediately after wallet connection (doesn't wait for iRacing auth)
  - Both metrics visible to users earlier in the flow, improving transparency
- **Component Architecture**: Refactored to use wrapper div with conditional rendering:
  - Halving progress card (shows when contractStats available)
  - Wallet balance card (shows when wallet connected)
  - Auth-gated content (claim interface when iRacing authenticated, connection prompt otherwise)
- **Status**: Changes complete and tested via architect review, ready for deployment

### November 2025 - Contract Deployment Update
- **New Contract Addresses**: Deployed new token and claim contracts
  - Token: 0xF525b62868B03ecc00DeDbbd3A2B94f7faf259F8
  - Claim V2: 0x4Eba210B149b05f90548E51947c52586Cb6Af1A5
- **Known Issue**: npm package installation broken in Replit environment
  - Packages claim to install but don't appear in node_modules
  - Workaround: Run app with `npx tsx server/index.ts` instead of workflow
  - Contract addresses updated throughout codebase (contracts.ts, routes.ts, replit.md)

### November 2025 - Real Names on Leaderboard & Crypto Newbie UX
- **iRacing Profiles Database**: Created `iracing_profiles` table to store user names
  - Columns: iracing_id (PK), display_name, first_name, last_name, last_updated
  - Auto-populated when users authenticate with iRacing
  - Leaderboard now shows real names (e.g., "David McGrath") instead of "Racer 28904"
- **Coinbase Smart Wallet Recommendation**: Added prominent UI recommendation for crypto newbies
  - Alert banner in wallet modal explaining benefits
  - "Recommended" badge on Coinbase Wallet option
  - Updated copy: "No downloads needed - create wallet in seconds"
- **Gas Sponsorship Infrastructure**: Backend ready for Coinbase paymaster integration
  - Created `/api/paymaster` proxy endpoint for secure paymaster requests
  - Comprehensive setup guide in GAS_SPONSORSHIP_SETUP.md
  - Requires CDP_PAYMASTER_URL secret from Coinbase Developer Platform
  - $15,000 in free gas credits available through Base Gasless Campaign
- **Status**: Real names working, UI improved for beginners, gas sponsorship ready for user setup

### November 2025 - Leaderboard Event-Based Implementation
- **Account Information UI**: Removed license and iRating fields from display (lines 481-489 in IRacingAuth.tsx)
  - Now shows only iRacing ID in Account Information section
  - Cleaner, simpler user interface
- **Backend Leaderboard Endpoint** (server/routes.ts lines 80-207):
  - Created `/api/leaderboard` endpoint that fetches all Claim events from blockchain
  - Queries from contract deployment block (33479508) to avoid RPC 100k block limit
  - Aggregates claims by iRacing ID (not wallet address)
  - Fixed critical same-block claims bug - now properly accumulates all events even when multiple claims occur in same block
  - Implements block timestamp caching to avoid duplicate RPC calls
  - Returns both all-time and weekly leaderboard data
  - Weekly calculation properly filters claims from last 7 days using actual block timestamps
  - Fetches racing stats (wins, top 5s, starts) from contract for each iRacing ID
- **Frontend Leaderboard Component** (client/src/components/Leaderboard.tsx):
  - Complete rewrite to use backend API instead of non-existent contract view functions
  - Displays driver rankings sorted by total APEX claimed
  - Shows racing statistics (wins, top 5s, starts) for each driver
  - Implements "All Time" and "Weekly" tabs with proper data
  - Proper loading and error states with skeleton UI
  - Empty state shows "No claims have been made yet" when no data exists
- **Performance Optimizations**:
  - Block timestamp caching eliminates redundant RPC calls (O(n) → O(unique blocks))
  - Weekly calculation reuses cached event data from aggregation phase
  - No duplicate provider.getBlock() calls across aggregation and weekly filtering
  - Queries from deployment block instead of block 0 to avoid RPC range limits
- **Testing**: E2E tests passed - all UI components functional, tab switching works, empty states correct
- **Status**: Leaderboard fully functional, displaying real claim data from blockchain

### November 2025 - Security Audit & Contract V2
- **Critical Security Fixes**: Identified and fixed critical vulnerabilities in claim contract
  - ⛔ Fixed signature replay attack vulnerability by implementing EIP-712 domain separation
  - ⛔ Fixed signature malleability by adding v-range and s-value validation
  - ⛔ Fixed missing claim history persistence (deployed contract bytecode mismatch)
- **Contract V2 (APEXClaimV2.sol)**:
  - Added EIP-712 typed structured data signing with domain separator
  - Domain includes: contract name, version "2", chainId (84532), verifyingContract address
  - Enhanced signature validation: v ∈ {27,28}, s in lower half of curve, non-zero recovery
  - Added `NoDeltaToClaim` error for clearer zero-delta rejection
  - Added `getLastClaimedStats()` helper function
  - Added `EmergencyWithdrawal` event
- **Backend Updates**:
  - Updated signing code to use `wallet.signTypedData()` with EIP-712 format
  - Backend signs with domain-separated typed data matching contract structure
- **Documentation**:
  - Created comprehensive `CONTRACTREVIEW.md` analyzing all functions and vulnerabilities
  - Created `DEPLOYMENT_INSTRUCTIONS.md` with step-by-step Remix deployment guide
- **Status**: Contract V2 deployed at 0x647d4f06acAE3Cab64B738f1fB15CE8009b067AC

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite for fast development and optimal production builds
- **Routing**: Client-side routing implemented with Wouter for lightweight navigation
- **UI Framework**: Shadcn/ui component library with Radix UI primitives, providing accessible and customizable components
- **Styling**: Tailwind CSS with custom design system featuring racing-inspired color palette and typography
- **State Management**: React Query (TanStack Query) for server state management and caching

### Web3 Integration
- **Blockchain**: Base network (Ethereum L2) for low-cost transactions and better user experience
- **Wallet Connection**: Wagmi v2 with support for MetaMask, Coinbase Wallet, and WalletConnect
- **Token Standard**: ERC-20 APEX token for community governance and rewards
- **Smart Contract Interaction**: Direct contract calls for token trading and balance queries

### Backend Architecture
- **Server**: Express.js with TypeScript for API endpoints and middleware
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Connect-pg-simple for PostgreSQL-backed session storage
- **Development**: Hot module replacement and error overlay for improved developer experience

### Data Layer
- **ORM**: Drizzle ORM providing type-safe database queries and migrations
- **Schema**: Centralized schema definitions in `/shared` directory for consistency between frontend and backend
- **Validation**: Zod schemas for runtime type validation and form handling

### Design System
- **Color Palette**: Racing-inspired theme with bright blue primary, golden yellow accents, and warm cream backgrounds
- **Typography**: Open Sans for readability with Menlo for monospace data display
- **Component Structure**: Card-based layouts with consistent spacing using Tailwind's spacing scale
- **Racing Aesthetics**: Performance-focused dashboard components with Gran Turismo-inspired visual elements

### Development Tools
- **Build System**: Vite for fast builds with TypeScript support and module resolution
- **Code Quality**: ESLint and TypeScript for static analysis and type checking
- **Styling**: PostCSS with Tailwind CSS and Autoprefixer for cross-browser compatibility
- **Asset Management**: Optimized asset handling with proper aliasing for images and shared resources

## External Dependencies

### Blockchain Services
- **Base Network**: Ethereum Layer 2 network (Base Sepolia testnet) for low-cost token transactions
- **APEX Token Contract**: Custom ERC-20 token deployed on Base (address: 0xF525b62868B03ecc00DeDbbd3A2B94f7faf259F8)
- **Claim Contract V2**: Smart contract for distributing APEX rewards with EIP-712 signatures (address: 0x4Eba210B149b05f90548E51947c52586Cb6Af1A5)
- **Web3 Providers**: Integration with wallet providers through Wagmi connectors

### Smart Contract Features
- **Incremental Claims**: Users can claim rewards multiple times based on stat deltas since their last claim
- **Claim History Tracking**: Contract stores last claimed stats (wins, top5s, starts) for each iRacing ID
- **Halving Mechanics**: Rewards halve every 100M tokens claimed (500M total pool)
  - First 100M: 100% rewards
  - Second 100M: 50% rewards
  - Third 100M: 25% rewards
  - Fourth 100M: 12% rewards
  - Fifth 100M: 6% rewards
  - Remaining: 3% rewards
- **Security (V2)**: EIP-712 signature verification with domain separation
  - EIP-712 domain separator prevents cross-chain and cross-contract replay attacks
  - Domain includes: chainId, contract address, contract name, version
  - Backend signs with typed structured data (EIP-712 standard)
  - Signature validation: v-range check, s-malleability protection, non-zero address verification
  - Only stats verified from iRacing API are signed
  - Signature includes wallet address, iRacing ID, and current stats
  - Stats cannot decrease (prevents gaming the system)
- **Points System**:
  - 1000 points per win
  - 100 points per top 5 finish
  - 10 points per race start
  - Base: 1000 tokens per point (before halving multiplier)

### Database
- **Neon Database**: Serverless PostgreSQL database for user data and application state
- **Connection Pooling**: @neondatabase/serverless for optimized database connections

### External APIs
- **iRacing API**: Planned integration for fetching racing performance data and statistics
- **Farcaster Integration**: Mini app framework for seamless social integration
- **WalletConnect**: Cloud service for cross-platform wallet connectivity (requires project ID configuration)

### UI and Development Libraries
- **Radix UI**: Accessible component primitives for complex UI patterns
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Form state management with validation
- **Date-fns**: Date manipulation and formatting utilities

### Infrastructure
- **Replit Platform**: Development and deployment environment with integrated tooling
- **Vite Plugins**: Runtime error handling and development banner integration
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple