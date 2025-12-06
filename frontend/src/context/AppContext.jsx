import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(true);
    const [selectedState, setSelectedState] = useState('');
    const [selectedMunicipality, setSelectedMunicipality] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [sidebarResults, setSidebarResults] = useState([]);
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
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    useEffect(() => {
        fetchMe();
    }, [fetchMe]);

    // Geo: states and cities
    useEffect(() => {
        fetch(`${API_URL}/geo/states`, { credentials: 'include' })
            .then(res => res.json())
            .then(json => setStates(json.data || []))
            .catch(err => console.error('Failed to load states', err));
    }, []);

    useEffect(() => {
        if (!selectedState) {
            setCities([]);
            return;
        }
        fetch(`${API_URL}/geo/cities?state=${encodeURIComponent(selectedState)}`, { credentials: 'include' })
            .then(res => res.json())
            .then(json => setCities(json.data || []))
            .catch(err => console.error('Failed to load cities', err));
    }, [selectedState]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (selectedState) params.append('state', selectedState);
        if (selectedMunicipality) params.append('city', selectedMunicipality);
        if (filters.periodDays !== '') {
            params.append('periodDays', filters.periodDays);
        }
        const url = `${API_URL}/influencers?${params.toString()}`;
        fetch(url, { credentials: 'include' })
            .then(res => res.json())
            .then(json => setSidebarResults(json.data || []))
            .catch(err => console.error('Failed to load influencers', err));
    }, [searchQuery, selectedState, selectedMunicipality, filters.periodDays]);

    const toggleDarkMode = () => setDarkMode(!darkMode);

    return (
        <AppContext.Provider value={{
            darkMode,
            toggleDarkMode,
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
            filters,
            setFilters
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
