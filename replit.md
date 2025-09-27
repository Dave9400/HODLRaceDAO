# HODL Racing DAO - Farcaster Mini App

## Overview

HODL Racing DAO is a Web3 racing community platform that combines decentralized finance with competitive racing. The application enables users to trade NASCORN tokens on the Base network while participating in a racing-focused DAO. The platform integrates with iRacing to reward real racing performance with token incentives, creating a unique intersection of motorsports and DeFi.

The application serves as a Farcaster Mini App, providing a streamlined mobile-first experience for the racing community. Users can connect their wallets, trade tokens, view racing statistics, and participate in DAO governance through an intuitive interface inspired by Uniswap's clean design and Gran Turismo's racing aesthetics.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Token Standard**: ERC-20 NASCORN token for community governance and rewards
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
- **Base Network**: Ethereum Layer 2 network for low-cost token transactions
- **NASCORN Token Contract**: Custom ERC-20 token deployed on Base (address: 0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07)
- **Web3 Providers**: Integration with wallet providers through Wagmi connectors

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