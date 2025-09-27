import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Wallet, ExternalLink } from "lucide-react";
import { useConnect, useAccount } from 'wagmi';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected } = useAccount();

  const walletIcons: Record<string, string> = {
    'MetaMask': '🦊',
    'Coinbase Wallet': '🔵', 
    'WalletConnect': '💜'
  };

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector });
      onClose();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="modal-wallet">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet size={20} />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Choose your preferred wallet to connect to HODL Racing DAO on Base network.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          
          <div className="space-y-2">
            {connectors.map((connector) => (
              <Button
                key={connector.id}
                variant="outline"
                className="w-full justify-start gap-3 h-auto p-4 hover-elevate"
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                data-testid={`button-wallet-${connector.name.toLowerCase().replace(' ', '-')}`}
              >
                <span className="text-xl">{walletIcons[connector.name] || '💳'}</span>
                <div className="text-left">
                  <div className="font-medium">{connector.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {connector.name === 'MetaMask' && 'Connect using MetaMask wallet'}
                    {connector.name === 'Coinbase Wallet' && 'Use Coinbase\'s smart wallet solution'}
                    {connector.name === 'WalletConnect' && 'Connect with WalletConnect protocol'}
                    {!['MetaMask', 'Coinbase Wallet', 'WalletConnect'].includes(connector.name) && 'Connect with this wallet'}
                  </div>
                </div>
                <ExternalLink size={16} className="ml-auto opacity-50" />
              </Button>
            ))}
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              By connecting a wallet, you agree to the HODL Racing DAO terms of service and privacy policy.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}