import React, { createContext, useState, useContext, useEffect } from 'react';
import { influencers } from '../data/mockData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(true);
    const [selectedState, setSelectedState] = useState('Todos');
    const [selectedMunicipality, setSelectedMunicipality] = useState('Todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredInfluencers, setFilteredInfluencers] = useState(influencers);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    const login = (email, password) => {
        if (email === 'admin' && password === 'admin') {
            setIsAuthenticated(true);
            setUser({ name: 'Admin User', email: 'admin@mbl.org.br' });
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
    };

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    useEffect(() => {
        let result = influencers;

        if (selectedState !== 'Todos') {
            result = result.filter(inf => inf.state === selectedState);
        }

        if (selectedMunicipality !== 'Todos') {
            result = result.filter(inf => inf.municipality === selectedMunicipality);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(inf => inf.name.toLowerCase().includes(query));
        }

        setFilteredInfluencers(result);
    }, [selectedState, selectedMunicipality, searchQuery]);

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
            filteredInfluencers,
            allInfluencers: influencers,
            isAuthenticated,
            login,
            logout,
            user
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
