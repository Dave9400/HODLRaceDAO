import { Button } from "@/components/ui/button";
import { Wallet, Menu, LogOut } from "lucide-react";
import { useState } from "react";
import WalletModal from "./WalletModal";
import logoUrl from "@assets/b2adcc9d-c081-49ed-96cc-a20f18ef5071_1759009768831.png";

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

  const handleWalletDisconnect = () => {
    console.log("Disconnecting wallet");
    setIsConnected(false);
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
          <div className="flex items-center gap-3">
            <img 
              src={logoUrl} 
              alt="HODL Racing DAO" 
              className="w-10 h-10 object-contain"
            />
            <span className="font-bold text-lg">HODL Racing DAO</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowWalletModal(true)}
                className="gap-2"
                data-testid="button-wallet-connected"
              >
                <Wallet size={16} />
                0x1234...5678
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleWalletDisconnect}
                data-testid="button-disconnect"
                title="Disconnect Wallet"
              >
                <LogOut size={16} />
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              onClick={() => setShowWalletModal(true)}
              className="gap-2"
              data-testid="button-wallet"
            >
              <Wallet size={16} />
              Connect Wallet
            </Button>
          )}
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