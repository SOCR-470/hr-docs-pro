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
import LegalDashboard from "./pages/LegalDashboard";
import Lawsuits from "./pages/Lawsuits";
import Hearings from "./pages/Hearings";
import Lawyers from "./pages/Lawyers";
import CourtCommunications from "./pages/CourtCommunications";
import DocumentModels from "./pages/DocumentModels";
import SendDocuments from "./pages/SendDocuments";
import SignDocument from "./pages/SignDocument";

function Router() {
  return (
    <Switch>
      {/* Public route - Document signing (no auth required) */}
      <Route path="/sign/:token">
        {(params) => <SignDocument token={params.token} />}
      </Route>
      
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
      
      {/* Document Models Routes */}
      <Route path="/document-models">
        <DashboardLayout>
          <DocumentModels />
        </DashboardLayout>
      </Route>
      <Route path="/send-documents">
        <DashboardLayout>
          <SendDocuments />
        </DashboardLayout>
      </Route>
      
      {/* Legal Module Routes */}
      <Route path="/legal">
        <DashboardLayout>
          <LegalDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/lawsuits">
        <DashboardLayout>
          <Lawsuits />
        </DashboardLayout>
      </Route>
      <Route path="/hearings">
        <DashboardLayout>
          <Hearings />
        </DashboardLayout>
      </Route>
      <Route path="/lawyers">
        <DashboardLayout>
          <Lawyers />
        </DashboardLayout>
      </Route>
      <Route path="/communications">
        <DashboardLayout>
          <CourtCommunications />
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
