import React from 'react';
import Sidebar from './Sidebar';
import { useApp } from '../context/AppContext';

const Layout = ({ children }) => {
    const { isSidebarCollapsed } = useApp();

    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            <Sidebar />
            <main className={`${isSidebarCollapsed ? 'pl-[100px]' : 'pl-[272px] xl:pl-[320px]'} pr-6 xl:pr-8 py-6 xl:py-8 min-h-screen transition-all duration-300 ease-in-out`}>
                <div className="max-w-7xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
