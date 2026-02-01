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
import RecurringDocs from "./pages/RecurringDocs";
import Alerts from "./pages/Alerts";
import ExternalRequests from "./pages/ExternalRequests";
import ExternalUpload from "./pages/ExternalUpload";

function Router() {
  return (
    <Switch>
      {/* Public route for external uploads */}
      <Route path="/external/upload/:token" component={ExternalUpload} />
      
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
      <Route path="/recurring">
        <DashboardLayout>
          <RecurringDocs />
        </DashboardLayout>
      </Route>
      <Route path="/alerts">
        <DashboardLayout>
          <Alerts />
        </DashboardLayout>
      </Route>
      <Route path="/external">
        <DashboardLayout>
          <ExternalRequests />
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
