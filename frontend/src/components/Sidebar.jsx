import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Search, LayoutDashboard, Users, Shield, LogOut, FileBarChart, ServerCog, ChevronRight } from 'lucide-react';

const Sidebar = () => {
    const {
        selectedState, setSelectedState,
        selectedMunicipality, setSelectedMunicipality,
        searchQuery, setSearchQuery,
        sidebarResults,
        states,
        cityOptions,
        user,
        logout
    } = useApp();

    const navigate = useNavigate();
    const location = useLocation();
    const canAccessInfluencers = ['admin_global', 'system_admin', 'admin_regional', 'admin_estadual'].includes(user?.role);

    const isActive = (path) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const LinkItem = ({ to, icon: Icon, label }) => {
        const active = isActive(to);
        return (
            <Link
                to={to}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden ${active
                    ? "bg-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
            >
                <Icon size={18} className={`mr-3 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="relative z-10">{label}</span>
                {active && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />}
            </Link>
        );
    };

    return (
        <div className="fixed left-4 top-4 bottom-4 w-72 glass-panel rounded-3xl flex flex-col z-50 overflow-hidden border border-white/5 bg-zinc-950/80 backdrop-blur-xl">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="font-bold text-white">I</span>
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                        Incubadora
                    </h1>
                </div>
            </div>

            {/* Scrollable Content */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                {/* Menu Section */}
                <div className="space-y-1">
                    <h2 className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono">Menu Principal</h2>
                    <LinkItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    {canAccessInfluencers && <LinkItem to="/influencers" icon={Users} label="Influenciadores" />}
                    <LinkItem to="/reports" icon={FileBarChart} label="Relatórios" />
                </div>

                {/* Admin Section - MOVED HERE */}
                {(user?.role === 'system_admin' || user?.role === 'admin_global') && (
                    <div className="space-y-1">
                        <h2 className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono">Admin</h2>
                        {user?.role === 'system_admin' && <LinkItem to="/sysadmin" icon={ServerCog} label="Sistema" />}
                        <LinkItem to="/users" icon={Shield} label="Usuários" />
                    </div>
                )}

                {/* Filters / Explore Section */}
                <div className="space-y-4">
                    <h2 className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono">Explorar</h2>

                    <div className="px-1 space-y-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-900/50 border border-white/5 rounded-xl text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 placeholder:text-zinc-600 transition-all font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-500 ml-1">Estado</label>
                                <select
                                    value={selectedState}
                                    onChange={(e) => {
                                        setSelectedState(e.target.value);
                                        setSelectedMunicipality('');
                                    }}
                                    className="w-full px-3 py-2 text-sm bg-zinc-900/50 border border-white/5 rounded-xl text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                >
                                    <option value="">Todos os Estados</option>
                                    {states.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-500 ml-1">Município</label>
                                <select
                                    value={selectedMunicipality}
                                    onChange={(e) => setSelectedMunicipality(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-zinc-900/50 border border-white/5 rounded-xl text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                >
                                    <option value="">Todos os Municípios</option>
                                    {cityOptions.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Results List */}
                {sidebarResults.length > 0 && (
                    <div className="space-y-2 animate-fade-in">
                        <h2 className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono flex items-center justify-between">
                            Resultados <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[9px]">{sidebarResults.length}</span>
                        </h2>
                        <div className="space-y-1 px-1">
                            {sidebarResults.map(inf => (
                                <button
                                    key={inf.id}
                                    onClick={() => navigate(`/influencer/${inf.id}`)}
                                    className="w-full flex items-center p-2 rounded-lg hover:bg-white/5 group transition-colors text-left border border-transparent hover:border-white/5"
                                >

                                    <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center mr-3 shrink-0 ring-1 ring-white/10">
                                        <Users size={14} className="text-zinc-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{inf.name}</div>
                                        <div className="text-[10px] text-zinc-500 truncate">{inf.city} - {inf.state}</div>
                                    </div>
                                    <ChevronRight size={14} className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity -ml-2" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* User Profile Footer */}
            {user && (
                <div className="p-4 border-t border-white/5 bg-zinc-900/30">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-white/10 flex items-center justify-center">
                            <span className="font-semibold text-white/80 text-xs">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-white truncate">{user.name}</div>
                            <div className="text-[10px] text-zinc-400 truncate">{user.email}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => logout().then(() => navigate("/login"))}
                        className="w-full flex items-center justify-center py-2 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 hover:text-red-400 text-zinc-400 text-xs font-medium transition-all border border-white/5"
                    >
                        <LogOut size={14} className="mr-2" /> Encerrar Sessão
                    </button>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
