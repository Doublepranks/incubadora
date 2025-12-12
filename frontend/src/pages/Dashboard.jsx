import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import LazyChart from '../components/LazyChart';
import { Users, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const Dashboard = () => {
    const { user, authLoading, selectedState, selectedMunicipality, filters, setFilters } = useApp();
    const navigate = useNavigate();

    const [overview, setOverview] = useState({ totalInfluencers: 0, totalFollowers: 0, totalPosts: 0, growthPercent: 0 });
    const [timeline, setTimeline] = useState([]);
    const [topGrowth, setTopGrowth] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [platformDistribution, setPlatformDistribution] = useState([]);
    const [stateDistribution, setStateDistribution] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const params = useMemo(() => {
        const p = new URLSearchParams();
        if (selectedState) p.append('state', selectedState);
        if (selectedMunicipality) p.append('city', selectedMunicipality);
        if (filters.platform) p.append('platform', filters.platform);
        p.append('periodDays', filters.periodDays);
        return p;
    }, [selectedState, selectedMunicipality, filters]);

    useEffect(() => {
        if (authLoading || !user) return;
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                const [overviewRes, timelineRes, topGrowthRes, tableRes] = await Promise.all([
                    fetch(`${API_URL}/metrics/overview?${params.toString()}`, { credentials: 'include' }),
                    fetch(`${API_URL}/metrics/timeline?${params.toString()}`, { credentials: 'include' }),
                    fetch(`${API_URL}/metrics/top-growth?limit=5&${params.toString()}`, { credentials: 'include' }),
                    fetch(`${API_URL}/influencers?${params.toString()}`, { credentials: 'include' }),
                ]);

                const [platformRes, stateRes] = await Promise.all([
                    fetch(`${API_URL}/metrics/platform-distribution`, { credentials: 'include' }),
                    fetch(`${API_URL}/metrics/state-distribution?${params.toString()}`, { credentials: 'include' }),
                ]);

                if (!overviewRes.ok || !timelineRes.ok || !topGrowthRes.ok || !tableRes.ok || !platformRes.ok || !stateRes.ok) {
                    throw new Error('Erro ao carregar dados do dashboard');
                }

                const overviewJson = await overviewRes.json();
                const timelineJson = await timelineRes.json();
                const topGrowthJson = await topGrowthRes.json();
                const tableJson = await tableRes.json();
                const platformJson = await platformRes.json();
                const stateJson = await stateRes.json();

                setOverview(overviewJson.data || { totalInfluencers: 0, totalFollowers: 0, totalPosts: 0, growthPercent: 0 });
                setTimeline(timelineJson.data || []);
                setTopGrowth(topGrowthJson.data || []);
                setTableData(tableJson.data || []);
                setPlatformDistribution(platformJson.data || []);
                setStateDistribution(stateJson.data || []);
            } catch (err) {
                console.error('Erro ao carregar dashboard', err);
                setError('Não foi possível carregar o dashboard. Tente novamente mais tarde.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [params, authLoading]);

    const baseAxisColors = { labels: { style: { colors: '#6b7280' } } };
    const gridColor = '#e5e7eb';
    const formatNumber = (val) => Number(val || 0).toLocaleString('pt-BR');

    const lineChartOptions = useMemo(() => ({
        chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth' },
        xaxis: { categories: timeline.map(t => formatDate(t.date)), ...baseAxisColors },
        yaxis: { ...baseAxisColors },
        grid: { borderColor: gridColor, strokeDashArray: 4 },
        colors: ['#3b82f6']
    }), [timeline]);

    const barChartOptions = useMemo(() => ({
        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { borderRadius: 4, horizontal: true } },
        dataLabels: { enabled: false },
        xaxis: { categories: topGrowth.map(inf => inf.name || ''), labels: { ...baseAxisColors.labels, formatter: (val) => formatNumber(val) } },
        yaxis: { ...baseAxisColors },
        grid: { borderColor: gridColor, strokeDashArray: 4 },
        colors: ['#10b981'],
        tooltip: { y: { formatter: (val) => formatNumber(val) } },
    }), [topGrowth]);

    const platformChartOptions = useMemo(() => ({
        chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
        labels: platformDistribution.map((p) => p.platform),
        legend: { position: 'bottom' },
    }), [platformDistribution]);

    const platformChartSeries = platformDistribution.map((p) => p.count);

    const stateChartOptions = useMemo(() => ({
        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
        xaxis: { categories: stateDistribution.map((s) => s.state), ...baseAxisColors },
        yaxis: { ...baseAxisColors },
        dataLabels: { enabled: false },
        grid: { borderColor: gridColor, strokeDashArray: 4 },
        colors: ['#6366f1'],
    }), [stateDistribution]);

    const stateChartSeries = [{
        name: 'Influenciadores',
        data: stateDistribution.map((s) => s.count),
    }];

    const followersSeries = [{
        name: 'Total Seguidores',
        data: timeline.map(t => t.followers),
    }];

    const barChartSeries = [{
        name: 'Crescimento',
        data: topGrowth.map(inf => Number(inf?.growthAbsolute ?? 0)),
    }];

    const maxStateCount = stateDistribution.reduce((max, s) => Math.max(max, s.count), 0) || 1;

    const formatSigned = (value) => {
        if (value > 0) return `+${value.toLocaleString()}`;
        if (value < 0) return `-${Math.abs(value).toLocaleString()}`;
        return '0';
    };

    const formatSignedPercent = (value, fractionDigits = 2) => {
        const formatted = Math.abs(value).toFixed(fractionDigits);
        if (value > 0) return `+${formatted}%`;
        if (value < 0) return `-${formatted}%`;
        return `0%`;
    };

    if (error) {
        return (
            <div className="p-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
                {error}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <Loader2 className="animate-spin mr-2" size={20} /> Carregando...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Geral</h2>
                <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                        <span>Período:</span>
                        {[7, 30, 90].map(days => (
                            <button
                                key={days}
                                onClick={() => setFilters((prev) => ({ ...prev, periodDays: days }))}
                                className={`px-3 py-1 rounded-full border text-xs ${filters.periodDays === days ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                {days}d
                            </button>
                        ))}
                        <button
                            onClick={() => setFilters((prev) => ({ ...prev, periodDays: 'all' }))}
                            className={`px-3 py-1 rounded-full border text-xs ${filters.periodDays === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                        >
                            Todo período
                        </button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span>Plataforma:</span>
                        <select
                            value={filters.platform}
                            onChange={(e) => setFilters((prev) => ({ ...prev, platform: e.target.value }))}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                        >
                            <option value="">Todas</option>
                            <option value="instagram">Instagram</option>
                            <option value="x">X</option>
                            <option value="youtube">YouTube</option>
                            <option value="kwai">Kwai</option>
                            <option value="tiktok">TikTok</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Influenciadores</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalInfluencers}</h3>
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
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalFollowers.toLocaleString()}</h3>
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
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{formatSignedPercent(overview.growthPercent || 0, 2)}</h3>
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
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalPosts}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">(X não entra na soma de posts do período)</p>
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
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Evolução de Seguidores</h3>
                    <LazyChart options={lineChartOptions} series={followersSeries} type="area" height={300} />
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Top Crescimento</h3>
                    {topGrowth.length > 0 ? (
                        <LazyChart options={barChartOptions} series={barChartSeries} type="bar" height={300} />
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                            Sem dados de crescimento no período selecionado
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Distribuição por Plataforma</h3>
                    <LazyChart options={platformChartOptions} series={platformChartSeries} type="donut" height={300} />
                </div>
                {user?.role !== 'admin_estadual' && (
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Distribuição por UF</h3>
                        <LazyChart options={stateChartOptions} series={stateChartSeries} type="bar" height={300} />
                        <div className="mt-4 space-y-2">
                            {stateDistribution.map((s) => (
                                <div key={s.state} className="flex items-center space-x-3">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-10">{s.state}</span>
                                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500"
                                            style={{ width: `${(s.count / maxStateCount) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
                            {tableData.map((inf) => (
                                <tr key={inf.id} className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{inf.name}</td>
                                    <td className="px-6 py-4">{inf.state}</td>
                                    <td className="px-6 py-4">{inf.city}</td>
                                    <td className="px-6 py-4">{inf.totalFollowers?.toLocaleString() ?? 0}</td>
                                    <td className="px-6 py-4">{inf.totalPosts ?? 0}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => navigate(`/influencer/${inf.id}`)}
                                            className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                        >
                                            Ver detalhes
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
