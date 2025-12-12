import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Search, LayoutDashboard, Users, Shield, LogOut, FileBarChart, ServerCog } from 'lucide-react';

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

    const linkBaseClass = "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors";
    const activeClass = "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
    const inactiveClass = "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800";

    return (
        <div className="w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed left-0 top-0 transition-colors duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Incubadora</h1>
            </div>
            {user && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                    <div className="text-sm font-semibold text-gray-800 dark:text-white truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {user.role || "sem perfil"}
                        </span>
                        <button
                            onClick={() => logout().then(() => navigate("/login"))}
                            className="flex items-center text-xs text-red-500 hover:text-red-600"
                        >
                            <LogOut size={14} className="mr-1" /> Sair
                        </button>
                    </div>
                </div>
            )}

            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Menu</h2>
                    <div className="space-y-1">
                        <Link
                            to="/"
                            className={`${linkBaseClass} ${isActive('/') ? activeClass : inactiveClass}`}
                        >
                            <LayoutDashboard size={18} className="mr-3" />
                            Dashboard Geral
                        </Link>
                        {canAccessInfluencers && (
                            <Link
                                to="/influencers"
                                className={`${linkBaseClass} ${isActive('/influencers') ? activeClass : inactiveClass}`}
                            >
                                <Users size={18} className="mr-3" />
                                Influenciadores
                            </Link>
                        )}
                        <Link
                            to="/reports"
                            className={`${linkBaseClass} ${isActive('/reports') ? activeClass : inactiveClass}`}
                        >
                            <FileBarChart size={18} className="mr-3" />
                            Relatórios
                        </Link>
                    </div>
                </div>

                {(user?.role === 'system_admin' || user?.role === 'admin_global') && (
                    <div>
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Administração</h2>
                        <div className="space-y-1">
                            {user?.role === 'system_admin' && (
                                <Link
                                    to="/sysadmin"
                                    className={`${linkBaseClass} ${isActive('/sysadmin') ? activeClass : inactiveClass}`}
                                >
                                    <ServerCog size={18} className="mr-3" />
                                    Sysadmin
                                </Link>
                            )}
                            {(user?.role === 'admin_global' || user?.role === 'system_admin') && (
                                <Link
                                    to="/users"
                                    className={`${linkBaseClass} ${isActive('/users') ? activeClass : inactiveClass}`}
                                >
                                    <Shield size={18} className="mr-3" />
                                    Usuários
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Explorar</h2>

                    <div className="space-y-4 mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar influenciador..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-500">Estado</label>
                            <select
                                value={selectedState}
                                onChange={(e) => {
                                    setSelectedState(e.target.value);
                                    setSelectedMunicipality('');
                                }}
                                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">Todos</option>
                                {states.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-500">Município</label>
                            <select
                                value={selectedMunicipality}
                                onChange={(e) => setSelectedMunicipality(e.target.value)}
                                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">Todos</option>
                                {cityOptions.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-xs font-semibold text-gray-500 mb-2">Resultados ({sidebarResults.length})</h3>
                        {sidebarResults.map(inf => (
                            <button
                                key={inf.id}
                                onClick={() => navigate(`/influencer/${inf.id}`)}
                                className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                            >
                                <Users size={16} className="mr-3 text-gray-400" />
                                <div className="truncate">
                                    <div className="truncate">{inf.name}</div>
                                    <div className="text-xs text-gray-500 truncate">{inf.city} - {inf.state}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
