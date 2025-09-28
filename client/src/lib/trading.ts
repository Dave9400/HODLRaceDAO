import { parseEther, parseUnits, formatUnits, Address, encodeFunctionData } from 'viem';
import { base } from 'wagmi/chains';

// Uniswap V3 Router on Base
export const UNISWAP_V3_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481' as const;

// WETH on Base
export const WETH_BASE = '0x4200000000000000000000000000000000000006' as const;

// Uniswap V3 Router ABI (minimal for swaps)
export const UNISWAP_V3_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint256' }
        ],
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' }
    ],
    name: 'quoteExactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

// Uniswap V3 Quoter on Base
export const UNISWAP_V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a' as const;

// Uniswap V3 Factory on Base for pool discovery
export const UNISWAP_V3_FACTORY = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD' as const;

// Fee tiers to check for pool existence (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
export const FEE_TIERS = [500, 3000, 10000] as const;

// Factory ABI for pool discovery
export const UNISWAP_V3_FACTORY_ABI = [
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' }
    ],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Quoter ABI for getting swap quotes
export const UNISWAP_V3_QUOTER_ABI = [
  {
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' }
    ],
    name: 'quoteExactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

export interface SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  fee: number; // Pool fee tier (500, 3000, 10000)
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: Address;
  deadline: number;
}

export interface QuoteParams {
  tokenIn: Address;
  tokenOut: Address;
  fee: number;
  amountIn: bigint;
}

export function prepareSwapParams(
  fromToken: Address,
  toToken: Address,
  amountIn: bigint,
  minAmountOut: bigint,
  recipient: Address,
  slippageTolerancePercent: number = 0.5,
  feeTier: number = 3000
): SwapParams {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
  
  // Apply slippage tolerance
  const slippageAdjustedMinOut = (minAmountOut * BigInt(Math.floor((100 - slippageTolerancePercent) * 100))) / BigInt(10000);
  
  return {
    tokenIn: fromToken,
    tokenOut: toToken,
    fee: feeTier, // Use provided fee tier
    amountIn,
    amountOutMinimum: slippageAdjustedMinOut,
    recipient,
    deadline
  };
}

export function encodeSwapData(params: SwapParams): `0x${string}` {
  return encodeFunctionData({
    abi: UNISWAP_V3_ROUTER_ABI,
    functionName: 'exactInputSingle',
    args: [{
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      recipient: params.recipient,
      deadline: BigInt(params.deadline),
      amountIn: params.amountIn,
      amountOutMinimum: params.amountOutMinimum,
      sqrtPriceLimitX96: BigInt(0) // No price limit
    }]
  });
}

export function calculateMinAmountOut(
  amountOut: bigint,
  slippagePercent: number = 0.5
): bigint {
  const slippageAdjustment = BigInt(Math.floor((100 - slippagePercent) * 100));
  return (amountOut * slippageAdjustment) / BigInt(10000);
}

export function formatSwapTransaction(params: SwapParams) {
  return {
    to: UNISWAP_V3_ROUTER,
    data: encodeSwapData(params),
    value: params.tokenIn === WETH_BASE ? params.amountIn : BigInt(0),
    gas: getSwapGasEstimate(params.tokenIn, params.tokenOut)
  };
}

// Gas estimation for swaps
export const SWAP_GAS_ESTIMATE = {
  ETH_TO_TOKEN: BigInt(150000),
  TOKEN_TO_ETH: BigInt(180000),
  TOKEN_TO_TOKEN: BigInt(200000)
};

export function getSwapGasEstimate(fromToken: Address, toToken: Address): bigint {
  if (fromToken === WETH_BASE) {
    return SWAP_GAS_ESTIMATE.ETH_TO_TOKEN;
  } else if (toToken === WETH_BASE) {
    return SWAP_GAS_ESTIMATE.TOKEN_TO_ETH;
  } else {
    return SWAP_GAS_ESTIMATE.TOKEN_TO_TOKEN;
  }
}

// ERC-20 approve function data encoding
export function encodeApproveData(spender: Address, amount: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ],
    functionName: 'approve',
    args: [spender, amount]
  });
}

// Check if approval is needed
export function needsApproval(currentAllowance: bigint, requiredAmount: bigint): boolean {
  return currentAllowance < requiredAmount;
}