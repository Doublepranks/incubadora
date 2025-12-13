import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import LazyChart from '../components/LazyChart';
import { Users, TrendingUp, Activity, Loader2, Filter, Calendar } from 'lucide-react';
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

    const baseAxisColors = { labels: { style: { colors: '#a1a1aa', fontFamily: 'Inter' } }, axisBorder: { show: false }, axisTicks: { show: false } };
    const gridColor = '#27272a'; // zinc-800
    const formatNumber = (val) => Number(val || 0).toLocaleString('pt-BR');

    const lineChartOptions = useMemo(() => ({
        chart: { type: 'area', toolbar: { show: false }, background: 'transparent', zoom: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { categories: timeline.map(t => formatDate(t.date)), ...baseAxisColors, tooltip: { enabled: false } },
        yaxis: { ...baseAxisColors },
        grid: { borderColor: gridColor, strokeDashArray: 0, yaxis: { lines: { show: true } } },
        colors: ['#8b5cf6'], // violet-500
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
        theme: { mode: 'dark' }
    }), [timeline]);

    const barChartOptions = useMemo(() => ({
        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '60%' } },
        dataLabels: { enabled: false },
        xaxis: { categories: topGrowth.map(inf => inf.name || ''), labels: { ...baseAxisColors.labels, formatter: (val) => formatNumber(val) } },
        yaxis: { ...baseAxisColors },
        grid: { borderColor: gridColor, strokeDashArray: 4 },
        colors: ['#10b981'], // emerald-500
        tooltip: { theme: 'dark', y: { formatter: (val) => formatNumber(val) } },
    }), [topGrowth]);

    const platformChartOptions = useMemo(() => {
        const colorMap = {
            instagram: '#db2777',
            x: '#3b82f6',
            youtube: '#c32324',
            kwai: '#be5a15',
            tiktok: '#7d54dc'
        };

        return {
            chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
            labels: platformDistribution.map((p) => p.platform),
            legend: { position: 'bottom', labels: { colors: '#a1a1aa' } },
            stroke: { show: false },
            plotOptions: { pie: { donut: { size: '70%', labels: { show: true, name: { color: '#a1a1aa' }, value: { color: '#ffffff' } } } } },
            colors: platformDistribution.map(p => colorMap[p.platform] || '#71717a'),
            tooltip: { theme: 'dark' }
        };
    }, [platformDistribution]);

    const platformChartSeries = platformDistribution.map((p) => p.count);

    const stateChartOptions = useMemo(() => ({
        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { horizontal: true, borderRadius: 2, barHeight: '50%' } },
        xaxis: { categories: stateDistribution.map((s) => s.state), ...baseAxisColors, labels: { show: false } },
        yaxis: { ...baseAxisColors },
        dataLabels: { enabled: false },
        grid: { show: false },
        colors: ['#6366f1'],
        tooltip: { theme: 'dark' }
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

    const formatSignedPercent = (value, fractionDigits = 2) => {
        const formatted = Math.abs(value).toFixed(fractionDigits);
        if (value > 0) return `+${formatted}%`;
        if (value < 0) return `-${formatted}%`;
        return `0%`;
    };

    if (error) {
        return (
            <div className="p-6 text-red-400 bg-red-900/20 rounded-xl border border-red-900/50">
                {error}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)] text-zinc-500">
                <Loader2 className="animate-spin mr-2" size={24} /> Carregando Dashboard...
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header / Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-panel rounded-2xl">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard Geral</h2>
                    <p className="text-sm text-zinc-400">Visão geral e métricas de desempenho</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-zinc-900/50 rounded-lg p-1 border border-white/5">
                        <div className="px-2 py-1 text-xs text-zinc-500 font-medium">Período</div>
                        {[7, 30, 90].map(days => (
                            <button
                                key={days}
                                onClick={() => setFilters((prev) => ({ ...prev, periodDays: days }))}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filters.periodDays === days ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                            >
                                {days}d
                            </button>
                        ))}
                        <button
                            onClick={() => setFilters((prev) => ({ ...prev, periodDays: 'all' }))}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filters.periodDays === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Tudo
                        </button>
                    </div>

                    <div className="relative group">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <select
                            value={filters.platform}
                            onChange={(e) => setFilters((prev) => ({ ...prev, platform: e.target.value }))}
                            className="pl-9 pr-4 py-1.5 h-[34px] border border-white/5 rounded-lg text-xs bg-zinc-900/50 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-zinc-800/50 transition-colors"
                        >
                            <option value="">Todas Plataformas</option>
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
                {[
                    { label: 'Influenciadores', value: overview.totalInfluencers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Seguidores Totais', value: overview.totalFollowers.toLocaleString(), icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                    { label: 'Crescimento', value: formatSignedPercent(overview.growthPercent || 0, 2), icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-400/10' },
                    { label: 'Posts no Período', value: overview.totalPosts, icon: Activity, color: 'text-orange-400', bg: 'bg-orange-400/10', sub: '(Exceto X)' }
                ].map((kpi, idx) => (
                    <div key={idx} className="glass-card p-6 rounded-2xl flex items-start justify-between group">
                        <div>
                            <p className="text-sm font-medium text-zinc-400 mb-1">{kpi.label}</p>
                            <h3 className="text-3xl font-bold text-white tracking-tight">{kpi.value}</h3>
                            {kpi.sub && <p className="text-[10px] text-zinc-500 mt-1">{kpi.sub}</p>}
                        </div>
                        <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-110 transition-transform duration-300`}>
                            <kpi.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Evolução de Seguidores</h3>
                        <div className="p-2 bg-zinc-800/50 rounded-lg text-zinc-400">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <LazyChart options={lineChartOptions} series={followersSeries} type="area" height={320} />
                </div>

                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Top Crescimento</h3>
                        <div className="p-2 bg-zinc-800/50 rounded-lg text-zinc-400">
                            <Activity size={16} />
                        </div>
                    </div>
                    {topGrowth.length > 0 ? (
                        <LazyChart options={barChartOptions} series={barChartSeries} type="bar" height={320} />
                    ) : (
                        <div className="flex items-center justify-center h-[320px] text-zinc-500">
                            Sem dados de crescimento
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Distribuição por Plataforma</h3>
                    <div className="flex items-center justify-center">
                        <LazyChart options={platformChartOptions} series={platformChartSeries} type="donut" height={320} />
                    </div>
                </div>

                {user?.role !== 'admin_estadual' && (
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-6">Distribuição por UF</h3>
                        <div className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                            {stateDistribution.map((s) => (
                                <div key={s.state} className="group flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors">
                                    <div className="w-8 text-xs font-bold text-zinc-400 text-center">{s.state}</div>
                                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-violet-500 rounded-full"
                                            style={{ width: `${(s.count / maxStateCount) * 100}%` }}
                                        />
                                    </div>
                                    <div className="w-12 text-xs text-right font-medium text-white">{s.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Influenciadores Recentes</h3>
                    <button onClick={() => navigate('/influencers')} className="text-xs text-primary hover:text-primary/80 transition-colors">Ver todos</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50">
                            <tr>
                                <th className="px-6 py-4 font-medium">Nome</th>
                                <th className="px-6 py-4 font-medium">Local</th>
                                <th className="px-6 py-4 font-medium">Seguidores</th>
                                <th className="px-6 py-4 font-medium">Posts</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {tableData.map((inf) => (
                                <tr key={inf.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-white">
                                        {inf.name}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400">
                                        {inf.city} - {inf.state}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-300">
                                        {inf.totalFollowers?.toLocaleString() ?? 0}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-300">
                                        {inf.totalPosts ?? 0}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => navigate(`/influencer/${inf.id}`)}
                                            className="text-xs font-medium text-primary hover:text-primary/80 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
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
