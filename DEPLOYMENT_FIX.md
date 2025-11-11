# Deployment Fix Guide

## Problem

The deployment fails because build tools (vite, esbuild, @vitejs/plugin-react) are in `devDependencies` but Replit's deployment process doesn't install devDependencies. The build script requires these tools, causing the deployment to fail.

## Solution

Move the following packages from `devDependencies` to `dependencies`:

1. **vite** - Build tool for bundling the frontend
2. **esbuild** - Build tool for bundling the backend  
3. **@vitejs/plugin-react** - Vite plugin for React support
4. **tsx** - TypeScript execution runtime
5. **typescript** - TypeScript compiler

## Steps to Fix (After Rollback)

After rolling back to restore your working environment:

### Option 1: Using Packager Tool (Recommended)
```bash
# Use Replit's packager tool to install these as regular dependencies:
- vite
- esbuild  
- @vitejs/plugin-react
- tsx
- typescript
```

This will move them from devDependencies to dependencies automatically.

### Option 2: Manual Fix (if packager tool doesn't work)
Contact Replit support or manually edit package.json to move these packages.

## Why This Matters

**Development** works fine with devDependencies because Replit installs them.  
**Deployment** fails because production builds skip devDependencies to reduce bundle size.

Since your build script (`npm run build`) needs vite and esbuild, they must be in dependencies for deployment to work.

## Testing After Fix

1. Verify packages moved: Check that vite, esbuild, etc. appear under `dependencies` in package.json
2. Test locally: Run `npm run dev` to ensure app still works  
3. Test build: Run `npm run build` to verify the build succeeds
4. Deploy: Push to production and verify deployment completes successfully

## Current Status

- ✅ Contract addresses updated to new deployments
- ✅ Gas sponsorship infrastructure in place  
- ❌ Development environment corrupted during dependency fix attempt
- ⚠️ **Rollback Required** - Use the "View Checkpoints" button to restore working state

## After Rollback

1. Click "View Checkpoints" button above
2. Select checkpoint before dependency changes
3. Apply the deployment fix using packager tool
4. Your new contract addresses (0xF525b62868B03ecc00DeDbbd3A2B94f7faf259F8 for token, 0x4Eba210B149b05f90548E51947c52586Cb6Af1A5 for claim) are already in the code
5. Fund the claim contract with APEX tokens
6. Test gasless claiming with Coinbase Smart Wallet
7. Deploy!

## Notes

- The peer dependency warnings about ethers v5 vs v6 are expected and won't prevent deployment
- The @wagmi/core version must stay at 2.21.2 to match @wagmi/connectors requirements
- Gas sponsorship will work once claim contract is funded with APEX tokens
