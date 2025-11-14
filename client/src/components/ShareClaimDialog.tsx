import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SiX, SiFarcaster } from "react-icons/si";
import { Share2 } from "lucide-react";
import { formatEther } from "viem";

interface ShareClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    wins: number;
    top5s: number;
    starts: number;
  };
  rewardAmount: string; // in wei
}

export default function ShareClaimDialog({ open, onOpenChange, stats, rewardAmount }: ShareClaimDialogProps) {
  const formattedReward = formatEther(BigInt(rewardAmount));
  const rewardDisplay = parseFloat(formattedReward).toLocaleString(undefined, { maximumFractionDigits: 0 });
  
  const shareText = `I just claimed my $APEX from the HODL Racing DAO! 🏁

My iRacing stats:
🏆 ${stats.wins} wins
🎯 ${stats.top5s} top 5 finishes  
🏁 ${stats.starts} races

Earned: ${rewardDisplay} APEX tokens! 💰

Join the racing revolution at hodlracing.fun`;

  const shareUrl = "https://hodlracing.fun";
  
  // Farcaster share URL
  const farcasterShareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
  
  // X (Twitter) share URL
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=APEX,iRacing,Web3Gaming,RaceToEarn`;
  
  const handleShare = (platform: 'farcaster' | 'x') => {
    const url = platform === 'farcaster' ? farcasterShareUrl : xShareUrl;
    window.open(url, '_blank', 'width=600,height=700');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-share-claim">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Claim Successful! 🎉
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            You've earned <span className="font-bold text-primary">{rewardDisplay} APEX</span> tokens!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* Stats Display */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground">Your iRacing Performance</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-yellow-500">{stats.wins}</div>
                <div className="text-xs text-muted-foreground">Wins</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">{stats.top5s}</div>
                <div className="text-xs text-muted-foreground">Top 5s</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">{stats.starts}</div>
                <div className="text-xs text-muted-foreground">Starts</div>
              </div>
            </div>
          </div>
          
          {/* Encouragement Message */}
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-accent-foreground">
              Share and help grow the HODL Racing community! 🏎️💨
            </p>
          </div>
          
          {/* Share Buttons */}
          <div className="space-y-2">
            <Button
              onClick={() => handleShare('farcaster')}
              className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-share-farcaster"
            >
              <SiFarcaster className="w-4 h-4" />
              Share on Farcaster
            </Button>
            
            <Button
              onClick={() => handleShare('x')}
              className="w-full gap-2 bg-black hover:bg-gray-900 text-white"
              data-testid="button-share-x"
            >
              <SiX className="w-4 h-4" />
              Share on X (Twitter)
            </Button>
          </div>
          
          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full"
            data-testid="button-close-share"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
