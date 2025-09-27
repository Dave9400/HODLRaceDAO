import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, ExternalLink } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletType: string) => void;
}

export default function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
  const wallets = [
    {
      name: "Farcaster Wallet",
      description: "Connect with your Farcaster account",
      icon: "💜",
      id: "farcaster"
    },
    {
      name: "MetaMask",
      description: "Connect using MetaMask wallet",
      icon: "🦊",
      id: "metamask"
    },
    {
      name: "Base Smart Wallet",
      description: "Use Base's smart wallet solution",
      icon: "🔵",
      id: "base"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="modal-wallet">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet size={20} />
            Connect Wallet
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Choose your preferred wallet to connect to HODL Racing DAO on Base network.
          </p>
          
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <Button
                key={wallet.id}
                variant="outline"
                className="w-full justify-start gap-3 h-auto p-4 hover-elevate"
                onClick={() => onConnect(wallet.id)}
                data-testid={`button-wallet-${wallet.id}`}
              >
                <span className="text-xl">{wallet.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{wallet.name}</div>
                  <div className="text-sm text-muted-foreground">{wallet.description}</div>
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