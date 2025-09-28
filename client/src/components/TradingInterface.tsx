import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpDown, TrendingUp, TrendingDown, RefreshCw, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import { NASCORN_TOKEN, formatTokenAmount, ERC20_ABI } from '@/lib/web3';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink } from 'lucide-react';
import { 
  WETH_BASE, 
  UNISWAP_V4_POOL_MANAGER,
  UNISWAP_V4_QUOTER,
  UNISWAP_V4_QUOTER_ABI,
  UNISWAP_V4_UNIVERSAL_ROUTER,
  getNascornWethPoolKey,
  prepareV4QuoteParams,
  formatV4SwapTransaction, 
  calculateMinAmountOut,
  getSwapGasEstimate,
  needsApproval,
  encodeApproveData
} from '@/lib/trading';

export default function TradingInterface() {
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [isApproving, setIsApproving] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  
  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
  });
  
  // Get NASCORN token balance
  const { data: nascornBalance, refetch: refetchBalance } = useReadContract({
    address: NASCORN_TOKEN.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  
  // Get NASCORN allowance for Uniswap V4 Universal Router
  const { data: nascornAllowance, refetch: refetchAllowance } = useReadContract({
    address: NASCORN_TOKEN.address,
    abi: [
      {
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'allowance',
    args: address ? [address, UNISWAP_V4_UNIVERSAL_ROUTER] : undefined,
    query: { enabled: !!address }
  });
  
  // Get quote from Uniswap V4 quoter
  const { data: quoteData } = useReadContract({
    address: UNISWAP_V4_QUOTER,
    abi: UNISWAP_V4_QUOTER_ABI,
    functionName: 'quoteExactInputSingle',
    args: fromAmount && parseFloat(fromAmount) > 0 ? (() => {
      const poolKey = getNascornWethPoolKey();
      const quoteParams = prepareV4QuoteParams(WETH_BASE, NASCORN_TOKEN.address, parseEther(fromAmount));
      return [quoteParams.poolKey, quoteParams.zeroForOne, quoteParams.exactAmount, quoteParams.sqrtPriceLimitX96];
    })() : undefined,
    query: { 
      enabled: !!fromAmount && parseFloat(fromAmount) > 0,
      refetchInterval: 10000 // Refresh quote every 10 seconds
    }
  });
  
  // Contract write functionality
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { sendTransaction, data: txHash } = useSendTransaction();
  
  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: hash || txHash,
  });
  
  // Mock data for display
  const priceChange = 12.5;
  const volume24h = "1,234,567";
  
  // Calculate current price from V4 quote data
  useEffect(() => {
    if (quoteData && fromAmount && parseFloat(fromAmount) > 0) {
      // V4 quoter returns [deltaAmounts, sqrtPriceX96After, initializedTicksCrossed]
      // deltaAmounts is [inputDelta, outputDelta] where inputDelta is negative and outputDelta is positive
      const [deltaAmounts] = quoteData;
      const [inputDelta, outputDelta] = deltaAmounts;
      
      if (outputDelta > 0) {
        const ethAmountWei = parseEther(fromAmount);
        const nascornOutputWei = outputDelta;
        const pricePerToken = Number(ethAmountWei) / Number(nascornOutputWei);
        setCurrentPrice(pricePerToken);
        setQuoteError(null);
      } else {
        setQuoteError("Invalid quote received");
      }
    } else if (fromAmount && parseFloat(fromAmount) > 0) {
      setQuoteError("Unable to get quote from Uniswap");
    }
  }, [quoteData, fromAmount]);

  // Refresh balances and quotes
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh balances if wallet connected
      if (address) {
        await refetchBalance();
        await refetchAllowance();
      }
      
      toast({
        title: "Refreshed",
        description: "Balance and quote data updated."
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to update data.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSwap = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to trade tokens.",
        variant: "destructive"
      });
      return;
    }
    
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to swap.",
        variant: "destructive"
      });
      return;
    }
    
    const ethAmount = parseEther(fromAmount);
    const ethBalanceValue = ethBalance?.value || BigInt(0);
    
    if (ethAmount > ethBalanceValue) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough ETH for this swap.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSwapping(true);
      
      // Validate quote availability
      if (!quoteData) {
        toast({
          title: "Quote unavailable",
          description: "Unable to get price quote from Uniswap. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Swap initiated",
        description: `Preparing to swap ${fromAmount} ETH for ${toAmount} NASCORN tokens.`,
      });
      
      const ethAmount = parseEther(fromAmount);
      // Extract output amount from V4 quote data
      const [deltaAmounts] = quoteData;
      const [inputDelta, outputDelta] = deltaAmounts;
      const expectedNascornAmount = outputDelta;
      
      // Calculate minimum amount out with slippage protection
      const minAmountOut = calculateMinAmountOut(
        expectedNascornAmount,
        slippageTolerance
      );
      
      // Check if this is an ETH->NASCORN swap (no approval needed) or NASCORN->ETH (approval may be needed)
      const needsTokenApproval = false; // For ETH->NASCORN swaps, no approval needed
      
      // Format the transaction for Uniswap V4 Universal Router
      const swapTransaction = formatV4SwapTransaction(
        WETH_BASE,
        NASCORN_TOKEN.address,
        ethAmount,
        minAmountOut,
        address!
      );
      
      toast({
        title: "Transaction prepared",
        description: "Submitting swap transaction to Uniswap V4 on Base...",
      });
      
      // Execute the swap transaction
      await sendTransaction({
        to: UNISWAP_V4_UNIVERSAL_ROUTER,
        value: ethAmount,
        data: swapTransaction.data
      });
      
      toast({
        title: "Transaction submitted!",
        description: "Your swap has been submitted to the Base network. Waiting for confirmation...",
      });
      
    } catch (error) {
      console.error('Swap failed:', error);
      toast({
        title: "Swap failed",
        description: "There was an error processing your swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleAmountChange = (value: string, isFrom: boolean) => {
    if (isFrom) {
      setFromAmount(value);
      // Let the quote hook handle the toAmount calculation
    } else {
      setToAmount(value);
      // Reverse quotes would need additional implementation
      setFromAmount("");
    }
  };
  
  // Update toAmount when quote data changes
  useEffect(() => {
    if (quoteData && fromAmount && parseFloat(fromAmount) > 0) {
      // Extract output amount from V4 quote data
      const [deltaAmounts] = quoteData;
      const [inputDelta, outputDelta] = deltaAmounts;
      const expectedOutput = formatTokenAmount(outputDelta, NASCORN_TOKEN.decimals);
      setToAmount(expectedOutput);
    } else if (!fromAmount || parseFloat(fromAmount) === 0) {
      setToAmount("");
    }
  }, [quoteData, fromAmount]);

  return (
    <div className="container mx-auto p-6 max-w-md">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">Trade NASCORN</h1>
        <p className="text-muted-foreground">Swap ETH for NASCORN tokens on Base network</p>
      </div>

      {/* Price Info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">NASCORN Price</p>
              <p className="text-2xl font-bold">
                {currentPrice ? `$${currentPrice.toFixed(6)}` : "Getting price..."}
              </p>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1 ${priceChange > 0 ? 'text-destructive' : 'text-red-500'}`}>
                {priceChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-medium">+{priceChange}%</span>
              </div>
              <p className="text-sm text-muted-foreground">Live pricing from Uniswap V4</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Swap Tokens
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-testid="button-refresh"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Connection Warning */}
          {!isConnected && (
            <div className="p-4 bg-muted rounded-lg border border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet size={16} />
                <span className="text-sm">Connect your wallet to start trading</span>
              </div>
            </div>
          )}
          
          {/* From Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="from-amount">From</Label>
              {isConnected && ethBalance && (
                <span className="text-xs text-muted-foreground">
                  Balance: {Number(formatEther(ethBalance.value)).toFixed(4)} ETH
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="from-amount"
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => handleAmountChange(e.target.value, true)}
                  disabled={!isConnected}
                  data-testid="input-from-amount"
                />
              </div>
              <div className="flex items-center px-3 py-2 bg-muted rounded-lg min-w-16">
                <span className="font-medium text-sm">ETH</span>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-swap-direction">
              <ArrowUpDown size={16} />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="to-amount">To</Label>
              {isConnected && nascornBalance !== undefined && (
                <span className="text-xs text-muted-foreground">
                  Balance: {formatTokenAmount(nascornBalance, NASCORN_TOKEN.decimals)} NASCORN
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="to-amount"
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  onChange={(e) => handleAmountChange(e.target.value, false)}
                  disabled={!isConnected}
                  data-testid="input-to-amount"
                />
              </div>
              <div className="flex items-center px-3 py-2 bg-muted rounded-lg min-w-20">
                <span className="font-medium text-sm">NASCORN</span>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSwap}
            disabled={!isConnected || !fromAmount || isSwapping || isPending || isConfirming}
            data-testid="button-execute-swap"
          >
            {!isConnected ? "Connect Wallet" : 
             isSwapping || isPending ? "Swapping..." :
             isConfirming ? "Confirming..." : "Swap Tokens"}
          </Button>

          {/* Transaction Details */}
          <div className="pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span>
                {currentPrice ? `1 ETH = ${(1 / currentPrice).toFixed(0)} NASCORN` : "Getting rate..."}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fee</span>
              <span>~$2.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slippage</span>
              <span>{slippageTolerance}%</span>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              Trading powered by Uniswap V4 on Base network. Real swaps with slippage protection.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Contract:</span>
          <a 
            href="https://clanker.world/clanker/0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
            data-testid="link-contract"
          >
            0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}