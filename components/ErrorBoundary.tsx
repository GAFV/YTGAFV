import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  // FIX: Replaced the constructor with a class property initializer for state.
  // This resolves the type errors where `this.state` and `this.props` were not being found.
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center bg-gray-800 p-8 rounded-lg shadow-lg border border-red-700">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                <h1 className="mt-4 text-2xl font-bold text-red-300">¡Oops! Algo salió mal.</h1>
                <p className="mt-2 text-gray-400">
                    Se ha producido un error inesperado en la aplicación. Por favor, intenta recargar la página.
                </p>
                <button
                    onClick={this.handleReload}
                    className="mt-6 inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    <RefreshCw className="mr-2" size={18} />
                    Recargar Página
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
