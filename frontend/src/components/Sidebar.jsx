import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Search, Moon, Sun, LayoutDashboard, Users } from 'lucide-react';

const Sidebar = () => {
    const {
        darkMode, toggleDarkMode,
        selectedState, setSelectedState,
        selectedMunicipality, setSelectedMunicipality,
        searchQuery, setSearchQuery,
        sidebarResults,
        states,
        cities
    } = useApp();

    const navigate = useNavigate();

    return (
        <div className="w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed left-0 top-0 transition-colors duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Incubadora</h1>
                <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Menu</h2>
                    <div className="space-y-1">
                        <Link to="/" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                            <LayoutDashboard size={18} className="mr-3" />
                            Dashboard Geral
                        </Link>
                        <Link to="/reports" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                            <LayoutDashboard size={18} className="mr-3" />
                            Relatórios
                        </Link>
                    </div>
                </div>

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
                                {cities.map(city => (
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
