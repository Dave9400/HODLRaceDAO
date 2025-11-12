import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, ExternalLink, Sparkles, Circle, Hexagon } from "lucide-react";
import { useConnect, useAccount } from 'wagmi';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletIcon = ({ name }: { name: string }) => {
  switch (name) {
    case 'Farcaster':
    case 'Farcaster Wallet':
      return <Circle className="w-5 h-5 text-purple-600" />;
    case 'MetaMask':
      return <Hexagon className="w-5 h-5 text-orange-500" />;
    case 'Coinbase Wallet':
      return <Circle className="w-5 h-5 text-blue-600" />;
    case 'WalletConnect':
      return <Circle className="w-5 h-5 text-purple-500" />;
    default:
      return <Wallet className="w-5 h-5" />;
  }
};

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected } = useAccount();

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
          <Alert className="bg-primary/10 border-primary/20" data-testid="alert-coinbase-recommendation">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>New to crypto?</strong> Coinbase Smart Wallet lets you create a wallet instantly without downloads or seed phrases. Perfect for beginners!
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            {connectors.map((connector) => (
              <Button
                key={connector.id}
                variant="outline"
                className={`w-full justify-start gap-3 h-auto p-4 hover-elevate ${
                  connector.name === 'Coinbase Wallet' ? 'border-primary/50' : ''
                }`}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                data-testid={`button-wallet-${connector.name.toLowerCase().replace(' ', '-')}`}
              >
                <div className="flex-shrink-0">
                  <WalletIcon name={connector.name} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {connector.name}
                    {connector.name === 'Coinbase Wallet' && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(connector.name === 'Farcaster' || connector.name === 'Farcaster Wallet') && 'Connect with your Farcaster wallet'}
                    {connector.name === 'MetaMask' && 'Connect using MetaMask wallet'}
                    {connector.name === 'Coinbase Wallet' && 'No downloads needed - create wallet in seconds'}
                    {connector.name === 'WalletConnect' && 'Connect with WalletConnect protocol'}
                    {!['Farcaster', 'Farcaster Wallet', 'MetaMask', 'Coinbase Wallet', 'WalletConnect'].includes(connector.name) && 'Connect with this wallet'}
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