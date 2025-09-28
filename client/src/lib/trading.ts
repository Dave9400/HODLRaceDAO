import { parseEther, parseUnits, formatUnits, Address, encodeFunctionData, keccak256, encodeAbiParameters } from 'viem';
import { base } from 'wagmi/chains';

// WETH on Base
export const WETH_BASE = '0x4200000000000000000000000000000000000006' as const;

// Uniswap V4 Core Contracts on Base
export const UNISWAP_V4_POOL_MANAGER = '0x498581ff718922c3f8e6a244956af099b2652b2b' as const;
export const UNISWAP_V4_QUOTER = '0x0d5e0f971ed27fbff6c2837bf31316121532048d' as const;
export const UNISWAP_V4_UNIVERSAL_ROUTER = '0x198EF79F1F515F02dFE9e3115eD9fC07183f02fC' as const;

// Known NASCORN V4 Pool ID from the provided link
export const NASCORN_WETH_POOL_ID = '0x9b350d0188b6a90655633e5bdfc07d0fc91507a994efa82bfcf544d5acdaff3f' as const;

// V4 Pool Key Structure
export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

// V4 Swap Parameters
export interface V4SwapParams {
  poolKey: PoolKey;
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: bigint;
}

// V4 Quote Parameters  
export interface V4QuoteParams {
  poolKey: PoolKey;
  zeroForOne: boolean;
  exactAmount: bigint;
  sqrtPriceLimitX96: bigint;
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

// V4 Command constants
const V4_SWAP_COMMAND = '0x10';

// Create NASCORN/WETH pool key with real parameters from the existing V4 pool
export function getNascornWethPoolKey(): PoolKey {
  // Addresses must be sorted (currency0 < currency1)
  const nascorn = '0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07';
  const currency0 = WETH_BASE < nascorn ? WETH_BASE : nascorn;
  const currency1 = WETH_BASE < nascorn ? nascorn : WETH_BASE;
  
  return {
    currency0,
    currency1,
    fee: 0, // Dynamic fee pools use 0
    tickSpacing: 1, // Dynamic fee pools typically use tick spacing 1
    hooks: '0x0000000000000000000000000000000000000000' // No hooks for this pool
  };
}

export function prepareV4SwapParams(
  fromToken: Address,
  toToken: Address,
  amountIn: bigint,
  sqrtPriceLimitX96: bigint = BigInt(0)
): V4SwapParams {
  const poolKey = getNascornWethPoolKey();
  const zeroForOne = fromToken === poolKey.currency0;
  
  return {
    poolKey,
    zeroForOne,
    amountSpecified: amountIn,
    sqrtPriceLimitX96
  };
}

export function prepareV4QuoteParams(
  fromToken: Address,
  toToken: Address,
  amountIn: bigint
): V4QuoteParams {
  const poolKey = getNascornWethPoolKey();
  const zeroForOne = fromToken === poolKey.currency0;
  
  return {
    poolKey,
    zeroForOne,
    exactAmount: amountIn,
    sqrtPriceLimitX96: BigInt(0)
  };
}

// Universal Router command for V4 swap
export function encodeV4SwapData(
  fromToken: Address,
  toToken: Address,
  amountIn: bigint,
  minAmountOut: bigint,
  recipient: Address
): `0x${string}` {
  const poolKey = getNascornWethPoolKey();
  const zeroForOne = fromToken === poolKey.currency0;
  
  // Encode pool key
  const poolKeyBytes = encodeAbiParameters(
    [
      { name: 'currency0', type: 'address' },
      { name: 'currency1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickSpacing', type: 'int24' },
      { name: 'hooks', type: 'address' }
    ],
    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  );
  
  // Encode V4 swap parameters
  const swapParams = encodeAbiParameters(
    [
      { name: 'poolKey', type: 'bytes' },
      { name: 'zeroForOne', type: 'bool' },
      { name: 'amountIn', type: 'int128' },
      { name: 'amountOutMinimum', type: 'uint128' },
      { name: 'hookData', type: 'bytes' }
    ],
    [poolKeyBytes, zeroForOne, amountIn, minAmountOut, '0x']
  );
  
  const commands = V4_SWAP_COMMAND; // Use 0x10 for V4 swaps
  const inputs = [swapParams];
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes
  
  return encodeFunctionData({
    abi: UNISWAP_V4_UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: [commands, inputs, deadline]
  });
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
  return {
    to: UNISWAP_V4_UNIVERSAL_ROUTER,
    data: encodeV4SwapData(fromToken, toToken, amountIn, minAmountOut, recipient),
    value: fromToken === WETH_BASE ? amountIn : BigInt(0),
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