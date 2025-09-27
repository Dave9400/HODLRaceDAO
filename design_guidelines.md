# HODL Racing DAO - Design Guidelines

## Design Approach
**Reference-Based Approach**: Inspired by Uniswap's clean trading interface and Gran Turismo's racing dashboard aesthetics, creating a performance-focused design that balances financial utility with racing excitement.

## Core Design Elements

### A. Color Palette
**Primary Colors:**
- Primary: 203 88% 53% (bright blue) - main actions, navigation highlights
- Secondary: 322 16% 44% (muted purple) - secondary elements, borders
- Background: 42 88% 71% (warm cream) - main background, card surfaces
- Text: 313 21% 27% (dark purple-grey) - primary text, headings
- Accent: 42 93% 56% (golden yellow) - CTAs, success states, highlights
- Success: 17 73% 45% (racing orange) - positive actions, wins, alerts

**Usage Strategy:**
- Bright blue for primary navigation and trading actions
- Golden yellow sparingly for key CTAs and racing achievements
- Racing orange for success states and leaderboard highlights
- Warm cream provides comfortable base while maintaining racing energy

### B. Typography
- **Primary Font**: Open Sans (web-safe, clean readability)
- **Monospace Font**: Menlo (code, addresses, numerical data)
- **Hierarchy**: Bold weights for headings, regular for body text
- **Scale**: Clear distinction between navigation (larger) and content text

### C. Layout System
**Tailwind Spacing**: Primary units of 2, 4, 6, and 8
- `p-4` for card padding
- `m-6` for section spacing  
- `gap-4` for grid layouts
- `h-8` for button heights
- Border radius: `rounded-lg` (1.3rem equivalent) for modern feel

### D. Component Library

**Navigation Hub**
- Card-based layout with clear visual hierarchy
- Primary navigation tiles with racing-inspired iconography
- Wallet connection status prominently displayed

**Trading Interface**
- Clean, Uniswap-inspired layout with token input/output fields
- Real-time price display with racing-themed visual elements
- Clear buy/sell action buttons with appropriate color coding

**Racing Dashboard**
- Performance-focused cards showing racing statistics
- Leaderboard tables with clear ranking visualization
- "Coming Soon" placeholder with racing anticipation styling

**Wallet Integration**
- Modal-based connection flow
- Support for Farcaster wallet and external wallets
- Clear connection status indicators

**Cards & Containers**
- Consistent card elevation and spacing
- Racing-inspired border treatments
- Clear content hierarchy within cards

### E. Mobile-First Responsive Design
- Navigation adapts to mobile with collapsible menu
- Trading interface scales for touch interactions
- Leaderboard tables optimize for small screens
- Wallet modals designed for mobile use patterns

## Visual Identity
**Racing Integration**: Subtle racing-inspired elements without overwhelming the financial interface - think clean dashboard aesthetics rather than flashy game graphics.

**Performance Focus**: Clear data presentation prioritizing speed and efficiency in trading and leaderboard viewing.

**Modern Web3**: Contemporary crypto application styling with racing personality, avoiding typical DeFi sterility while maintaining professional credibility.