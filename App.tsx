import React, { Component, ReactNode, useState } from 'react';
import { StoreProvider } from './store';
import { Layout } from './components/Layout';
import { HomeScreen } from './screens/Home';
import { InvestmentsScreen } from './screens/Investments';
import { HealthScreen } from './screens/Health';
import { MoneyScreen } from './screens/Money';
import { SettingsScreen } from './screens/Settings';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary for stability
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center bg-red-50">
          <div>
            <h1 className="text-xl font-bold text-red-800 mb-2">Something went wrong.</h1>
            <p className="text-red-600 mb-4">Please restart the app.</p>
            <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-4 py-2 rounded-lg">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'home' && <HomeScreen setTab={setActiveTab} />}
      {activeTab === 'investments' && <InvestmentsScreen />}
      {activeTab === 'health' && <HealthScreen />}
      {activeTab === 'money' && <MoneyScreen />}
      {activeTab === 'settings' && <SettingsScreen />}
    </Layout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ErrorBoundary>
  );
}