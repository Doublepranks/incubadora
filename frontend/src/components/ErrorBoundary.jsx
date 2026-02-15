import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);

        // Report to backend for sysadmin visibility
        try {
            fetch(`${API_URL}/admin/client-error`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: error?.message || String(error),
                    stack: error?.stack || null,
                    componentStack: errorInfo?.componentStack || null,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                }),
            }).catch(() => {
                // Silently fail — logging should never break the app further
            });
        } catch {
            // Ignore
        }
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-[60vh] p-6">
                    <div className="glass-panel rounded-2xl p-10 max-w-md w-full text-center border border-white/10 space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <AlertTriangle size={32} className="text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Algo deu errado</h2>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                Ocorreu um erro inesperado nesta página. O time técnico foi notificado automaticamente.
                            </p>
                        </div>
                        {this.state.error?.message && (
                            <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-3 text-left">
                                <p className="text-xs text-zinc-500 font-mono break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}
                        <button
                            onClick={this.handleReload}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition font-medium shadow-lg hover:shadow-amber-500/25"
                        >
                            <RefreshCw size={18} />
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
