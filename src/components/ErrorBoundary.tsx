import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';
import { RotateCcw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-red-50 flex items-center justify-center p-6 text-red-900 font-sans">
                    <div className="max-w-3xl w-full bg-white border border-red-200 shadow-xl rounded-none p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-3xl">💥</span>
                            Application Crash
                        </h1>
                        <p className="mb-6 text-neutral-600">
                            Something went wrong. Please copy the error details below and send them to support.
                        </p>

                        <div className="bg-neutral-900 text-red-100 p-4 rounded-none overflow-auto max-h-[400px] text-xs font-mono mb-6 border border-neutral-800 shadow-inner">
                            <p className="text-red-400 font-bold mb-2">{this.state.error?.toString()}</p>
                            <pre className="whitespace-pre-wrap opacity-70">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reload Application
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
