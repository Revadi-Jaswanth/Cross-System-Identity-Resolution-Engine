import React, { Component } from 'react';
import { AlertOctagon } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 rounded-premium">
          <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-full mb-4">
            <AlertOctagon size={28} />
          </div>
          <h3 className="text-lg font-semibold text-rose-800 dark:text-rose-400 mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-rose-600/80 dark:text-rose-400/80 max-w-md mb-4">
            {this.state.error?.message || 'An unexpected runtime error crashed this component.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-premium transition-colors"
          >
            Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
