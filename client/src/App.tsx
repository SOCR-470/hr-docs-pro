import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import Reports from "./pages/Reports";
import TimeclockImport from "./pages/TimeclockImport";
import Templates from "./pages/Templates";
import Analytics from "./pages/Analytics";
import DocumentShares from "./pages/DocumentShares";
import LgpdConsent from "./pages/LgpdConsent";

function Router() {
  return (
    <Switch>
      {/* Protected routes with dashboard layout */}
      <Route path="/">
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      <Route path="/employees">
        <DashboardLayout>
          <Employees />
        </DashboardLayout>
      </Route>
      <Route path="/employees/:id">
        {(params) => (
          <DashboardLayout>
            <EmployeeDetail id={parseInt(params.id)} />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/templates">
        <DashboardLayout>
          <Templates />
        </DashboardLayout>
      </Route>
      <Route path="/analytics">
        <DashboardLayout>
          <Analytics />
        </DashboardLayout>
      </Route>
      <Route path="/shares">
        <DashboardLayout>
          <DocumentShares />
        </DashboardLayout>
      </Route>
      <Route path="/lgpd">
        <DashboardLayout>
          <LgpdConsent />
        </DashboardLayout>
      </Route>
      <Route path="/reports">
        <DashboardLayout>
          <Reports />
        </DashboardLayout>
      </Route>
      <Route path="/timeclock">
        <DashboardLayout>
          <TimeclockImport />
        </DashboardLayout>
      </Route>
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
