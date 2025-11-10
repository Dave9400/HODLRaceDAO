import { parseEther, parseUnits, formatUnits, Address, encodeFunctionData } from 'viem';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { Actions, V4Planner } from '@uniswap/v4-sdk';
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk';
import { base } from 'wagmi/chains';
import { APEX_TOKEN } from './web3';

// WETH on Base
export const WETH_BASE = '0x4200000000000000000000000000000000000006' as const;

// Uniswap V3 Core Contracts on Base (more reliable than V4)
export const UNISWAP_V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a' as const;
export const UNISWAP_V3_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481' as const;
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;

// Create SDK Token instances
const BASE_CHAIN_ID = 8453;
export const WETH_TOKEN = new Token(BASE_CHAIN_ID, WETH_BASE, 18, 'WETH', 'Wrapped Ether');
export const APEX_SDK_TOKEN = new Token(BASE_CHAIN_ID, APEX_TOKEN.address, APEX_TOKEN.decimals, 'APEX', 'APEX');

// V3 Pool Configuration for APEX/WETH (using 0.3% fee tier)
export const APEX_WETH_POOL_CONFIG = {
  token0: WETH_BASE,  // WETH (sorted first)
  token1: APEX_TOKEN.address,  // APEX (sorted second) 
  fee: 3000,  // 0.3% fee tier
};

// Swap configuration interface
export interface SwapConfig {
  poolKey: typeof APEX_WETH_POOL_CONFIG;
  zeroForOne: boolean;
  amountIn: string;
  amountOutMinimum: string;
  hookData: string;
}

// V3 Quoter ABI - simpler and more reliable
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

// Universal Router ABI for V4 swaps
export const UNISWAP_V4_UNIVERSAL_ROUTER_ABI = [
  {
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
] as const;

// Prepare swap configuration for V4 SDK
export function createSwapConfig(
  fromToken: Address,
  toToken: Address,
  amountIn: string,
  amountOutMinimum: string = '0'
): SwapConfig {
  const zeroForOne = fromToken === APEX_WETH_POOL_CONFIG.currency0;
  
  return {
    poolKey: APEX_WETH_POOL_CONFIG,
    zeroForOne,
    amountIn,
    amountOutMinimum,
    hookData: '0x00'
  };
}

// Prepare quote parameters
export function prepareV4QuoteParams(
  fromToken: Address,
  toToken: Address,
  amountIn: bigint
) {
  const zeroForOne = fromToken === APEX_WETH_POOL_CONFIG.currency0;
  
  return {
    poolKey: APEX_WETH_POOL_CONFIG,
    zeroForOne,
    exactAmount: amountIn,
    sqrtPriceLimitX96: BigInt(0)
  };
}

// Create V4 swap transaction using the official SDK
export function createV4SwapTransaction(
  fromToken: Address,
  toToken: Address,
  amountIn: string,
  minAmountOut: string,
  recipient: Address
) {
  const swapConfig = createSwapConfig(fromToken, toToken, amountIn, minAmountOut);
  
  // Create V4 planner for the swap
  const v4Planner = new V4Planner();
  const routePlanner = new RoutePlanner();
  
  // Add swap action
  v4Planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [swapConfig]);
  
  // Add settlement actions
  v4Planner.addAction(Actions.SETTLE_ALL, [swapConfig.poolKey.currency0, swapConfig.amountIn]);
  v4Planner.addAction(Actions.TAKE_ALL, [swapConfig.poolKey.currency1, swapConfig.amountOutMinimum]);
  
  // Finalize the V4 actions
  const encodedActions = v4Planner.finalize();
  
  // Add V4 swap command to route planner
  routePlanner.addCommand(CommandType.V4_SWAP, [encodedActions]);
  
  // Set deadline (5 minutes from now)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
  
  // Encode the Universal Router call  
  const calldata = encodeFunctionData({
    abi: UNISWAP_V4_UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: [routePlanner.commands as `0x${string}`, [encodedActions as `0x${string}`], deadline]
  });
  
  return {
    to: UNISWAP_V4_UNIVERSAL_ROUTER,
    data: calldata as `0x${string}`,
    deadline,
    value: fromToken === WETH_BASE ? BigInt(amountIn) : BigInt(0)
  };
}

export function calculateMinAmountOut(
  amountOut: bigint,
  slippagePercent: number = 0.5
): bigint {
  const slippageAdjustment = BigInt(Math.floor((100 - slippagePercent) * 100));
  return (amountOut * slippageAdjustment) / BigInt(10000);
}

export function formatV4SwapTransaction(
  fromToken: Address,
  toToken: Address,
  amountIn: bigint,
  minAmountOut: bigint,
  recipient: Address
) {
  const amountInStr = amountIn.toString();
  const minAmountOutStr = minAmountOut.toString();
  
  const swapTx = createV4SwapTransaction(fromToken, toToken, amountInStr, minAmountOutStr, recipient);
  
  return {
    to: swapTx.to,
    data: swapTx.data,
    value: swapTx.value,
    gas: getSwapGasEstimate(fromToken, toToken)
  };
}

// Gas estimation for swaps
export const SWAP_GAS_ESTIMATE = {
  ETH_TO_TOKEN: BigInt(150000),
  TOKEN_TO_ETH: BigInt(180000),
  TOKEN_TO_TOKEN: BigInt(200000)
};

export function getSwapGasEstimate(fromToken: Address, toToken: Address): bigint {
  // V4 generally uses less gas than V3
  if (fromToken === WETH_BASE) {
    return BigInt(120000); // ETH_TO_TOKEN - reduced from V3
  } else if (toToken === WETH_BASE) {
    return BigInt(140000); // TOKEN_TO_ETH - reduced from V3
  } else {
    return BigInt(160000); // TOKEN_TO_TOKEN - reduced from V3
  }
}

// Extract output amount from V4 quote response
export function extractOutputAmount(quoteResponse: readonly [readonly [bigint, bigint], bigint, number]): bigint {
  const [deltaAmounts] = quoteResponse;
  const [inputDelta, outputDelta] = deltaAmounts;
  // For exact input swaps, output delta is negative, so we need to take its absolute value
  return outputDelta < 0 ? -outputDelta : outputDelta;
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