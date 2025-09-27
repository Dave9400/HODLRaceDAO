import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import Header from "@/components/Header";
import NavigationHub from "@/components/NavigationHub";
import TradingInterface from "@/components/TradingInterface";
import RaceToEarn from "@/components/RaceToEarn";
import AboutPage from "@/components/AboutPage";
import Leaderboard from "@/components/Leaderboard";
import NotFound from "@/pages/not-found";

function Router() {
  const [currentPage, setCurrentPage] = useState("home");

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
      default:
        return <NavigationHub onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Switch>
      <Route path="/">
        <div className="min-h-screen bg-background">
          <Header onMenuClick={() => console.log("Menu clicked")} />
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
                ← Back to Hub
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
