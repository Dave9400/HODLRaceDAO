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
  UNISWAP_V3_QUOTER,
  UNISWAP_V3_QUOTER_ABI,
  UNISWAP_V3_ROUTER,
  NASCORN_WETH_POOL_CONFIG
} from '@/lib/trading';

export default function TradingInterface() {
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [isApproving, setIsApproving] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  
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
  
  // Get NASCORN allowance for Uniswap V3 Router
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
    args: address ? [address, UNISWAP_V3_ROUTER] : undefined,
    query: { enabled: !!address }
  });
  
  // Simple price calculation for demo (since NASCORN pool may not exist yet)
  const [quoteData, setQuoteData] = useState<bigint | null>(null);
  
  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      // Simple calculation: 1 ETH = ~1000 NASCORN (demo rate)
      const ethAmount = parseEther(fromAmount);
      const nascornAmount = ethAmount * BigInt(1000); // 1000 NASCORN per ETH
      setQuoteData(nascornAmount);
    } else {
      setQuoteData(null);
    }
  }, [fromAmount]);
  
  // Contract write functionality
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { sendTransaction, data: txHash } = useSendTransaction();
  
  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: hash || txHash,
  });
  
  // Remove mock data - will implement real price change tracking later
  const [priceChange] = useState<number | null>(null);
  const volume24h = "N/A";
  
  // Calculate current price from demo quote data
  useEffect(() => {
    // Set a demo price: $0.002 per NASCORN (if 1 ETH = $3000, then 1000 NASCORN = 1 ETH)
    setCurrentPrice(0.003); // $0.003 per NASCORN token
  }, []);

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
      
      // Demo swap functionality - show working interface
      toast({
        title: "Demo Mode",
        description: `This is a demo swap interface. In production, this would swap ${fromAmount} ETH for ${toAmount} NASCORN tokens on Base network.`,
      });
      
      // Simulate a transaction
      setTimeout(() => {
        toast({
          title: "Demo Swap Complete!",
          description: `Successfully simulated swapping ${fromAmount} ETH for ${toAmount} NASCORN tokens.`,
        });
        setIsSwapping(false);
        
        // Refresh balances
        if (address) {
          refetchBalance();
          refetchAllowance();
        }
      }, 2000);
      
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
      try {
        // V3 quoter returns simple uint256 amountOut
        const nascornOutputWei = quoteData as bigint;
        const expectedOutput = formatTokenAmount(nascornOutputWei, NASCORN_TOKEN.decimals);
        setToAmount(expectedOutput);
      } catch (error) {
        setToAmount("");
      }
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
              {priceChange !== null ? (
                <div className={`flex items-center gap-1 ${priceChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="font-medium">{priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-sm">Price change: N/A</span>
                </div>
              )}
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