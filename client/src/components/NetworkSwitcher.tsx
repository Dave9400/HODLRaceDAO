import { useAccount, useSwitchChain, useChainId } from 'wagmi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { getActiveChainId, CHAIN_CONFIGS } from '@shared/chain';

export default function NetworkSwitcher() {
  const { isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  
  // Get the expected chain ID from configuration
  const expectedChainId = getActiveChainId();
  
  // Only show if connected and on wrong network
  if (!isConnected || currentChainId === expectedChainId) {
    return null;
  }
  
  const expectedChain = CHAIN_CONFIGS[expectedChainId];
  const currentChain = CHAIN_CONFIGS[currentChainId];
  
  const handleSwitchNetwork = () => {
    switchChain({ chainId: expectedChainId });
  };
  
  return (
    <Alert variant="destructive" className="border-destructive" data-testid="alert-wrong-network">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div>
          <strong>Wrong Network!</strong>
          <p className="text-sm mt-1">
            You're connected to <strong>{currentChain?.name || `Chain ${currentChainId}`}</strong>, 
            but this app requires <strong>{expectedChain.name}</strong>.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleSwitchNetwork}
          disabled={isPending}
          data-testid="button-switch-network"
        >
          {isPending ? 'Switching...' : `Switch to ${expectedChain.name}`}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
