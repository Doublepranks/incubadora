import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const [darkMode, setDarkMode] = useState(prefersDark);
    const [selectedState, setSelectedState] = useState('');
    const [selectedMunicipality, setSelectedMunicipality] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [sidebarPool, setSidebarPool] = useState([]);
    const sidebarResults = useMemo(() => {
        if (!selectedMunicipality) return sidebarPool;
        return sidebarPool.filter((inf) => inf.city === selectedMunicipality);
    }, [sidebarPool, selectedMunicipality]);
    const cityOptions = useMemo(() => {
        const list = sidebarPool
            .filter((inf) => !selectedState || inf.state === selectedState)
            .map((inf) => inf.city)
            .filter(Boolean);
        return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [sidebarPool, selectedState]);
    const [filters, setFilters] = useState({
        periodDays: 30,
        platform: '',
    });

    const login = async (email, password) => {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                return false;
            }

            const data = await res.json();
            setUser(data.user);
            return true;
        } catch (err) {
            console.error('Login error', err);
            return false;
        }
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error('Logout error', err);
        } finally {
            setUser(null);
        }
    };

    const fetchMe = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch (err) {
            console.error('Fetch me error', err);
        } finally {
            setAuthLoading(false);
        }
    }, []);



    useEffect(() => {
        fetchMe();
    }, [fetchMe]);

    // Geo: states and cities
    useEffect(() => {
        if (authLoading || !user) return;
        fetch(`${API_URL}/geo/states`, { credentials: 'include' })
            .then(res => res.json())
            .then(json => {
                if (user?.regions && user.regions.length > 0) {
                    setStates(json.data?.filter((uf) => user.regions.includes(uf)) || []);
                    // For non-global admins, default state to first allowed
                    if (!user.regions.includes(selectedState)) {
                        setSelectedState(user.regions[0] || '');
                    }
                } else {
                    setStates(json.data || []);
                }
            })
            .catch(err => console.error('Failed to load states', err));
    }, [authLoading, user]);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        }
    }, [darkMode]);

    useEffect(() => {
        if (authLoading || !user) return;
        if (!selectedState) {
            setCities([]);
            return;
        }
        fetch(`${API_URL}/geo/cities?state=${encodeURIComponent(selectedState)}`, { credentials: 'include' })
            .then(res => res.json())
            .then(json => setCities(json.data || []))
            .catch(err => console.error('Failed to load cities', err));
    }, [authLoading, user, selectedState]);

    useEffect(() => {
        if (authLoading || !user) return;
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (selectedState) params.append('state', selectedState);
        if (filters.periodDays !== '') {
            params.append('periodDays', filters.periodDays);
        }
        const url = `${API_URL}/influencers?${params.toString()}`;
        fetch(url, { credentials: 'include' })
            .then(res => res.json())
            .then(json => setSidebarPool(json.data || []))
            .catch(err => console.error('Failed to load influencers', err));
    }, [authLoading, user, searchQuery, selectedState, filters.periodDays]);

    return (
        <AppContext.Provider value={{
            darkMode,
            selectedState,
            setSelectedState,
            selectedMunicipality,
            setSelectedMunicipality,
            searchQuery,
            setSearchQuery,
            isAuthenticated: !!user,
            authLoading,
            login,
            logout,
            user,
            states,
            cities,
            sidebarResults,
            cityOptions,
            filters,
            setFilters
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
