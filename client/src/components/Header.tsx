import { Button } from "@/components/ui/button";
import { Wallet, Menu, LogOut } from "lucide-react";
import { useState } from "react";
import WalletModal from "./WalletModal";
import { useAccount, useDisconnect } from 'wagmi';
import { shortenAddress } from '@/lib/web3';
import logoUrl from "@assets/b2adcc9d-c081-49ed-96cc-a20f18ef5071_1759009768831.png";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const handleWalletDisconnect = () => {
    disconnect();
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
              className="w-16 h-16 object-contain brightness-75 saturate-50"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected && address ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowWalletModal(true)}
                className="gap-2"
                data-testid="button-wallet-connected"
              >
                <Wallet size={16} />
                {shortenAddress(address)}
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
      />
    </>
  );
}