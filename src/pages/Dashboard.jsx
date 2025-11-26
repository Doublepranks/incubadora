import React from 'react';
import { useApp } from '../context/AppContext';
import Chart from 'react-apexcharts';
import { Users, TrendingUp, BarChart2, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { filteredInfluencers, allInfluencers } = useApp();
    const navigate = useNavigate();

    // Calculate KPIs
    const totalInfluencers = filteredInfluencers.length;

    const totalFollowers = filteredInfluencers.reduce((acc, inf) => {
        return acc + Object.values(inf.platforms).reduce((sum, p) => sum + p.followers, 0);
    }, 0);

    const totalPosts = filteredInfluencers.reduce((acc, inf) => {
        return acc + Object.values(inf.platforms).reduce((sum, p) => sum + p.posts, 0);
    }, 0);

    // Calculate growth (mock calculation based on history)
    const totalGrowth = filteredInfluencers.reduce((acc, inf) => {
        let growth = 0;
        Object.values(inf.platforms).forEach(p => {
            if (p.history.length > 0) {
                const start = p.history[p.history.length - 1].followers;
                const end = p.followers;
                growth += (end - start);
            }
        });
        return acc + growth;
    }, 0);

    const growthPercentage = totalFollowers > 0 ? ((totalGrowth / (totalFollowers - totalGrowth)) * 100).toFixed(2) : 0;

    // Chart Data: Followers Evolution (Last 7 days aggregated)
    const dates = [...new Set(allInfluencers[0].platforms[Object.keys(allInfluencers[0].platforms)[0]].history.slice(-7).map(h => h.date))];

    const followersSeries = [{
        name: 'Total Seguidores',
        data: dates.map(date => {
            return filteredInfluencers.reduce((acc, inf) => {
                return acc + Object.values(inf.platforms).reduce((sum, p) => {
                    const historyItem = p.history.find(h => h.date === date);
                    return sum + (historyItem ? historyItem.followers : p.followers);
                }, 0);
            }, 0);
        })
    }];

    const lineChartOptions = {
        chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth' },
        xaxis: { categories: dates, labels: { style: { colors: '#9ca3af' } } },
        yaxis: { labels: { style: { colors: '#9ca3af' } } },
        grid: { borderColor: '#374151', strokeDashArray: 4 },
        theme: { mode: 'dark' },
        colors: ['#3b82f6']
    };

    // Chart Data: Top 5 Growth
    const topGrowth = [...filteredInfluencers].sort((a, b) => {
        const growthA = Object.values(a.platforms).reduce((sum, p) => sum + (p.followers - (p.history[0]?.followers || p.followers)), 0);
        const growthB = Object.values(b.platforms).reduce((sum, p) => sum + (p.followers - (p.history[0]?.followers || p.followers)), 0);
        return growthB - growthA;
    }).slice(0, 5);

    const barChartSeries = [{
        name: 'Crescimento',
        data: topGrowth.map(inf => Object.values(inf.platforms).reduce((sum, p) => sum + (p.followers - (p.history[0]?.followers || p.followers)), 0))
    }];

    const barChartOptions = {
        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { borderRadius: 4, horizontal: true } },
        dataLabels: { enabled: false },
        xaxis: { categories: topGrowth.map(inf => inf.name), labels: { style: { colors: '#9ca3af' } } },
        yaxis: { labels: { style: { colors: '#9ca3af' } } },
        grid: { borderColor: '#374151', strokeDashArray: 4 },
        colors: ['#10b981']
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Geral</h2>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Influenciadores</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalInfluencers}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                            <Users size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Seguidores Totais</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{(totalFollowers / 1000000).toFixed(2)}M</h3>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <Users size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Crescimento (Período)</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">+{growthPercentage}%</h3>
                        </div>
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Posts no Período</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalPosts}</h3>
                        </div>
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                            <Activity size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Evolução de Seguidores (7 dias)</h3>
                    <Chart options={lineChartOptions} series={followersSeries} type="area" height={300} />
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Top Crescimento</h3>
                    <Chart options={barChartOptions} series={barChartSeries} type="bar" height={300} />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Influenciadores</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Nome</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3">Município</th>
                                <th className="px-6 py-3">Seguidores</th>
                                <th className="px-6 py-3">Posts</th>
                                <th className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInfluencers.map((inf) => {
                                const totalInfFollowers = Object.values(inf.platforms).reduce((sum, p) => sum + p.followers, 0);
                                const totalInfPosts = Object.values(inf.platforms).reduce((sum, p) => sum + p.posts, 0);
                                return (
                                    <tr key={inf.id} className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{inf.name}</td>
                                        <td className="px-6 py-4">{inf.state}</td>
                                        <td className="px-6 py-4">{inf.municipality}</td>
                                        <td className="px-6 py-4">{totalInfFollowers.toLocaleString()}</td>
                                        <td className="px-6 py-4">{totalInfPosts}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => navigate(`/influencer/${inf.id}`)}
                                                className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                            >
                                                Ver detalhes
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
