import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Web3Provider } from "@/lib/Web3Provider";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import NetworkSwitcher from "@/components/NetworkSwitcher";
import { Button } from "@/components/ui/button";
import { X, Home, TrendingUp, Trophy, Info, Users, Wallet } from "lucide-react";
import NavigationHub from "@/components/NavigationHub";
import TradingInterface from "@/components/TradingInterface";
import RaceToEarn from "@/components/RaceToEarn";
import AboutPage from "@/components/AboutPage";
import Leaderboard from "@/components/Leaderboard";
import DAOTreasury from "@/components/DAOTreasury";
import NotFound from "@/pages/not-found";
import { sdk } from "@farcaster/miniapp-sdk";

function Router() {
  const [currentPage, setCurrentPage] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "trade", label: "Trade APEX", icon: TrendingUp },
    { id: "race", label: "Race to Earn", icon: Trophy },
    { id: "leaderboard", label: "Leaderboard", icon: Users },
    { id: "dao", label: "DAO Treasury", icon: Wallet },
    { id: "about", label: "About DAO", icon: Info },
  ];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if ((token && success === 'true') || error) {
      setCurrentPage('race');
    }
  }, []);

  const handleNavigate = (pageId: string) => {
    setCurrentPage(pageId);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <NavigationHub onNavigate={setCurrentPage} />;
      case "trade":
        return <TradingInterface />;
      case "race":
        return <RaceToEarn />;
      case "about":
        return <AboutPage />;
      case "leaderboard":
        return <Leaderboard />;
      case "dao":
        return <DAOTreasury />;
      default:
        return <NavigationHub onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Switch>
      <Route path="/">
        <div className="min-h-screen bg-background">
          <Header onMenuClick={toggleMobileMenu} />
          
          {/* Network Switcher Alert */}
          <div className="p-4">
            <NetworkSwitcher />
          </div>
          
          {/* Mobile Navigation Overlay */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black/50" 
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Navigation Panel */}
              <div className="absolute left-0 top-0 h-full w-80 max-w-[80vw] bg-card border-r">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold">Navigation</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid="button-close-menu"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <nav className="p-4">
                  <div className="space-y-2">
                    {navigationItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <Button
                          key={item.id}
                          variant={currentPage === item.id ? "default" : "ghost"}
                          className="w-full justify-start gap-3 h-12 text-left"
                          onClick={() => handleNavigate(item.id)}
                          data-testid={`nav-${item.id}`}
                        >
                          <IconComponent className="w-5 h-5" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                </nav>
              </div>
            </div>
          )}
          <main className="flex-1">
            {renderPage()}
          </main>
          {currentPage !== "home" && (
            <div className="fixed bottom-4 left-4">
              <button
                onClick={() => setCurrentPage("home")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover-elevate"
                data-testid="button-back-home"
              >
                ← Back to Home
              </button>
            </div>
          )}
        </div>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Signal to Farcaster that the mini app is ready
    if (typeof window !== 'undefined' && sdk?.actions?.ready) {
      sdk.actions.ready();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </Web3Provider>
    </QueryClientProvider>
  );
}

export default App;
