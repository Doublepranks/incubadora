import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, User, ArrowRight, Sparkles, TrendingUp, Users, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const { login, isAuthenticated } = useApp();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate a small delay for the animation feeling
        await new Promise(r => setTimeout(r, 600));

        const ok = await login(email, password);
        if (ok) {
            setError('');
            navigate('/');
        } else {
            setError('Credenciais inválidas.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-background text-foreground overflow-hidden">
            {/* Left Side - Hero / Brand */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,0,255,0.1),rgba(0,0,0,0))]" />
                <div className="absolute inset-0 bg-hero-glow opacity-30 animate-pulse" style={{ animationDuration: '4s' }} />

                <div className="relative z-10 p-12 max-w-lg text-center">
                    <div className="inline-flex items-center justify-center p-3 mb-6 bg-primary/10 rounded-2xl ring-1 ring-primary/20 backdrop-blur-3xl">
                        <Sparkles className="text-primary w-8 h-8" />
                    </div>
                    <h1 className="text-5xl font-bold tracking-tight mb-4 text-white">
                        Incubadora
                    </h1>
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        Plataforma avançada de inteligência e gestão de influenciadores.
                        Dados em tempo real, métricas profundas e insights poderosos.
                    </p>

                    {/* Decorative Elements - Mini Dashboard Mockup */}
                    <div className="mt-16 relative w-full max-w-sm mx-auto h-64">
                        {/* Card 1: Growth Trend */}
                        <div className="absolute top-0 right-0 w-48 p-4 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl transform rotate-3 z-10 hover:rotate-0 hover:scale-105 transition-all duration-500">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-zinc-400">Engajamento</span>
                                <TrendingUp size={14} className="text-emerald-400" />
                            </div>
                            <div className="text-2xl font-bold text-white mb-2">+24.5%</div>
                            <div className="h-10 flex items-end gap-1">
                                {[4, 7, 5, 8, 6, 9, 10].map((h, i) => (
                                    <div key={i} className="flex-1 bg-gradient-to-t from-primary/50 to-primary rounded-t-sm" style={{ height: `${h * 10}%` }}></div>
                                ))}
                            </div>
                        </div>

                        {/* Card 2: Profile Stats */}
                        <div className="absolute bottom-4 left-0 w-52 p-4 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl transform -rotate-3 z-20 hover:rotate-0 hover:scale-105 transition-all duration-500">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
                                    <User size={20} className="text-white" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">Top Influencer</div>
                                    <div className="text-[10px] text-zinc-400">@usuario_top</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-800/50 rounded-lg p-2">
                                <div className="text-center">
                                    <div className="text-[10px] text-zinc-500 uppercase">Seguidores</div>
                                    <div className="text-sm font-bold text-white">1.2M</div>
                                </div>
                                <div className="h-6 w-px bg-white/10"></div>
                                <div className="text-center">
                                    <div className="text-[10px] text-zinc-500 uppercase">Score</div>
                                    <div className="text-sm font-bold text-emerald-400">98.5</div>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Floating Activity Icon */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-zinc-800/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center z-0 animate-pulse">
                            <Activity className="text-primary w-8 h-8" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                <div className="w-full max-w-md animate-fade-in relative z-10">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold tracking-tight mb-2">Bem-vindo de volta</h2>
                        <p className="text-muted-foreground">Entre com suas credenciais para acessar o painel.</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div className="group relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-10 py-4 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-zinc-600 text-zinc-100"
                                    placeholder="Usuário"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="group relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-10 py-4 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-zinc-600 text-zinc-100"
                                    placeholder="Senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center animate-slide-up">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]"
                        >
                            {isLoading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-muted-foreground">
                            &copy; 2025 Incubadora Inc. Todos os direitos reservados. Desenvolvido por <a href="https://x.com/sampantojapa" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Sam Pantoja</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
