import { Button } from "@/components/ui/button";
import { Wallet, Menu } from "lucide-react";
import { useState } from "react";
import WalletModal from "./WalletModal";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleWalletConnect = (walletType: string) => {
    console.log(`Connecting to ${walletType}`);
    setIsConnected(true);
    setShowWalletModal(false);
  };

  return (
    <>
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
            data-testid="button-menu"
          >
            <Menu />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">HR</span>
            </div>
            <span className="font-bold text-lg">HODL Racing DAO</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant={isConnected ? "secondary" : "default"}
            onClick={() => setShowWalletModal(true)}
            className="gap-2"
            data-testid="button-wallet"
          >
            <Wallet size={16} />
            {isConnected ? "0x1234...5678" : "Connect Wallet"}
          </Button>
        </div>
      </header>

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
      />
    </>
  );
}