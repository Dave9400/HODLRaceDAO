import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpDown, TrendingUp, TrendingDown, RefreshCw, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { NASCORN_TOKEN, formatTokenAmount, ERC20_ABI } from '@/lib/web3';
import { useToast } from '@/hooks/use-toast';

export default function TradingInterface() {
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [tokenPrice, setTokenPrice] = useState(0.0042);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
  
  // Contract write functionality
  const { writeContract, data: hash, isPending } = useWriteContract();
  
  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });
  
  // Mock data for display
  const priceChange = 12.5;
  const volume24h = "1,234,567";
  
  // Refresh price and balances
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simulate price fetch with slight variation
      const variation = (Math.random() - 0.5) * 0.0002;
      setTokenPrice(prev => Math.max(0.001, prev + variation));
      
      // Refresh balances if wallet connected
      if (address) {
        await refetchBalance();
      }
      
      toast({
        title: "Refreshed",
        description: "Price and balance data updated."
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to update price data.",
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
      
      toast({
        title: "Demo swap initiated",
        description: `Simulating swap of ${fromAmount} ETH for ${toAmount} NASCORN tokens.`,
      });
      
      // In a production app, this would:
      // 1. Check token allowances
      // 2. Call approve() if needed
      // 3. Call a DEX router contract (like Uniswap V3)
      // 4. Handle slippage and routing
      
      // For now, demonstrate the transaction flow without actual DEX calls
      // This would be replaced with actual writeContract calls
      const mockTransactionHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      toast({
        title: "Demo transaction",
        description: `Mock transaction hash: ${mockTransactionHash.slice(0, 10)}...`,
      });
      
      // Simulate network confirmation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Demo swap completed!",
        description: "Simulated token swap finished. In production, real tokens would be exchanged.",
      });
      
      // Reset form and refresh balances
      setFromAmount("");
      setToAmount("");
      if (address) {
        await refetchBalance();
      }
      
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
      setToAmount((parseFloat(value || "0") * tokenPrice).toFixed(6));
    } else {
      setToAmount(value);
      setFromAmount((parseFloat(value || "0") / tokenPrice).toFixed(6));
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-md">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">Trade NASCORN</h1>
        <p className="text-muted-foreground">Demo trading interface for Base network</p>
      </div>

      {/* Price Info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">NASCORN Price</p>
              <p className="text-2xl font-bold">${tokenPrice}</p>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1 ${priceChange > 0 ? 'text-destructive' : 'text-red-500'}`}>
                {priceChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-medium">+{priceChange}%</span>
              </div>
              <p className="text-sm text-muted-foreground">24h Volume: ${volume24h}</p>
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
                <span className="text-sm">Connect your wallet to explore demo trading</span>
              </div>
            </div>
          )}
          
          {isConnected && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <span className="text-sm font-medium">Demo Mode:</span>
                <span className="text-sm">This simulates trading - no real transactions occur</span>
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
             isSwapping || isPending ? "Simulating Swap..." :
             isConfirming ? "Confirming..." : "Demo Swap"}
          </Button>

          {/* Transaction Details */}
          <div className="pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span>1 ETH = {(1 / tokenPrice).toFixed(0)} NASCORN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fee</span>
              <span>~$2.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slippage</span>
              <span>0.5%</span>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              <strong>Demo Interface:</strong> Real trading would require DEX integration (Uniswap V3, etc.), token approvals, and on-chain price feeds.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Contract: 0x9a5F9cafE10C107C95a7CaE8b85Fbea2dCc8cb07
        </p>
      </div>
    </div>
  );
}