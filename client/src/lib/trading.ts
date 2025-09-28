import { parseEther, parseUnits, formatUnits, Address, encodeFunctionData } from 'viem';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { Actions, V4Planner } from '@uniswap/v4-sdk';
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk';
import { base } from 'wagmi/chains';
import { NASCORN_TOKEN } from './web3';

// WETH on Base
export const WETH_BASE = '0x4200000000000000000000000000000000000006' as const;

// Uniswap V4 Core Contracts on Base
export const UNISWAP_V4_POOL_MANAGER = '0x498581ff718922c3f8e6a244956af099b2652b2b' as const;
export const UNISWAP_V4_QUOTER = '0x0d5e0f971ed27fbff6c2837bf31316121532048d' as const;
export const UNISWAP_V4_UNIVERSAL_ROUTER = '0x198EF79F1F515F02dFE9e3115eD9fC07183f02fC' as const;
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;

// Create SDK Token instances
const BASE_CHAIN_ID = 8453;
export const WETH_TOKEN = new Token(BASE_CHAIN_ID, WETH_BASE, 18, 'WETH', 'Wrapped Ether');
export const NASCORN_SDK_TOKEN = new Token(BASE_CHAIN_ID, NASCORN_TOKEN.address, NASCORN_TOKEN.decimals, 'NASCORN', 'NASCORN');

// V4 Pool Configuration for NASCORN/WETH
export const NASCORN_WETH_POOL_CONFIG = {
  currency0: WETH_BASE,  // WETH (sorted first)
  currency1: NASCORN_TOKEN.address,  // NASCORN (sorted second)
  fee: 0,  // Dynamic fee
  tickSpacing: 1,  // Standard for dynamic fee pools
  hooks: '0x0000000000000000000000000000000000000000' as Address  // No hooks
};

// Swap configuration interface
export interface SwapConfig {
  poolKey: typeof NASCORN_WETH_POOL_CONFIG;
  zeroForOne: boolean;
  amountIn: string;
  amountOutMinimum: string;
  hookData: string;
}

// V4 Quoter ABI
export const UNISWAP_V4_QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' }
        ],
        name: 'poolKey',
        type: 'tuple'
      },
      { name: 'zeroForOne', type: 'bool' },
      { name: 'exactAmount', type: 'int128' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' }
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { name: 'deltaAmounts', type: 'int128[2]' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' }
    ],
    stateMutability: 'view',
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
  const zeroForOne = fromToken === NASCORN_WETH_POOL_CONFIG.currency0;
  
  return {
    poolKey: NASCORN_WETH_POOL_CONFIG,
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
  const zeroForOne = fromToken === NASCORN_WETH_POOL_CONFIG.currency0;
  
  return {
    poolKey: NASCORN_WETH_POOL_CONFIG,
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