import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LazyChart from '../components/LazyChart';
import { ArrowLeft, Instagram, Youtube, Video, Twitter, Loader2, User as UserIcon, Calendar, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/dateUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const platformIcons = {
    instagram: <Instagram size={20} />,
    youtube: <Youtube size={20} />,
    kwai: <Video size={20} />,
    x: <Twitter size={20} />,
    tiktok: <Video size={20} />,
};

const platformColors = {
    instagram: 'bg-[#E1306C]/10 text-[#E1306C] border-[#E1306C]/20 hover:bg-[#E1306C]/20',
    youtube: 'bg-[#FF0000]/10 text-[#FF0000] border-[#FF0000]/20 hover:bg-[#FF0000]/20',
    kwai: 'bg-[#FF8F00]/10 text-[#FF8F00] border-[#FF8F00]/20 hover:bg-[#FF8F00]/20',
    x: 'bg-white/5 text-white border-white/10 hover:bg-white/10',
    tiktok: 'bg-[#00F2EA]/10 text-[#00F2EA] border-[#00F2EA]/20 hover:bg-[#00F2EA]/20',
};

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

const InfluencerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { filters, setFilters } = useApp();

    const [influencer, setInfluencer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInfluencer = async () => {
            setLoading(true);
            setError('');
            try {
                const query = filters.periodDays === 'all' ? '?periodDays=all' : `?periodDays=${filters.periodDays}`;
                const res = await fetch(`${API_URL}/influencers/${id}${query}`, { credentials: 'include' });
                if (!res.ok) {
                    throw new Error('Erro ao carregar influenciador');
                }
                const json = await res.json();
                setInfluencer(json.data || null);
            } catch (err) {
                console.error('Erro ao carregar influenciador', err);
                setError('Não foi possível carregar o influenciador. Tente novamente mais tarde.');
            } finally {
                setLoading(false);
            }
        };

        fetchInfluencer();
    }, [id, filters.periodDays]);

    const kpis = useMemo(() => {
        if (!influencer) return { totalFollowers: 0, totalPosts: 0, growthAbsolute: 0, growthPercent: 0, avgPosts: 0 };
        let totalFollowers = 0;
        let totalPosts = 0;
        let growthAbsolute = 0;
        const daysCounted = new Set();

        influencer.socialProfiles.forEach((p) => {
            const metrics = p.metrics || [];
            if (metrics.length === 0) return;
            const start = metrics[0].followersCount;
            const end = metrics[metrics.length - 1].followersCount;
            totalFollowers += end;
            // Para posts, ignorar X (Twitter)
            if (p.platform !== 'x') {
                totalPosts += metrics.reduce((sum, m) => sum + m.postsCount, 0);
                metrics.forEach((m) => daysCounted.add(m.date.split('T')[0]));
            }
            growthAbsolute += end - start;
        });

        const startFollowers = totalFollowers - growthAbsolute;
        const growthPercent = startFollowers > 0 ? (growthAbsolute / startFollowers) * 100 : 0;
        const avgPosts = daysCounted.size > 0 ? totalPosts / daysCounted.size : 0;

        return { totalFollowers, totalPosts, growthAbsolute, growthPercent, avgPosts };
    }, [influencer]);

    const baseAxisColors = { labels: { style: { colors: '#a1a1aa', fontFamily: 'Inter' } }, axisBorder: { show: false }, axisTicks: { show: false } };
    const gridColor = '#27272a';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)] text-zinc-500">
                <Loader2 className="animate-spin mr-2" size={24} /> Carregando perfil...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-400 bg-red-900/20 rounded-xl border border-red-900/50">
                {error}
            </div>
        );
    }

    if (!influencer) {
        return <div className="text-center text-zinc-500 mt-10">Influenciador não encontrado.</div>;
    }

    const headerAvatar = influencer.avatarUrl ? (
        <img src={influencer.avatarUrl} alt={influencer.name} className="h-20 w-20 rounded-full object-cover ring-4 ring-white/5 bg-zinc-800" />
    ) : (
        <div className="h-20 w-20 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 ring-4 ring-white/5">
            <UserIcon size={32} />
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <button
                onClick={() => navigate('/')}
                className="flex items-center text-zinc-400 hover:text-white transition-colors text-sm font-medium hover:bg-white/5 py-2 px-3 rounded-lg w-fit"
            >
                <ArrowLeft size={18} className="mr-2" />
                Voltar para Dashboard
            </button>

            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        {headerAvatar}
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">{influencer.name}</h1>
                            <p className="text-zinc-400 text-lg">{influencer.city} - {influencer.state}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-4">
                        <div className="flex flex-wrap justify-end gap-2">
                            {influencer.socialProfiles.map((profile) => (
                                <a
                                    key={profile.id}
                                    href={profile.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-3 rounded-xl border transition-all ${platformColors[profile.platform] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                                    title={profile.handle}
                                >
                                    {platformIcons[profile.platform] || null}
                                </a>
                            ))}
                        </div>
                        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5">
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
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Seguidores Totais', value: kpis.totalFollowers.toLocaleString(), sub: null },
                    { label: 'Crescimento', value: formatSigned(kpis.growthAbsolute), sub: null },
                    { label: 'Crescimento %', value: formatSignedPercent(kpis.growthPercent, 2), sub: null },
                    { label: 'Posts no Período', value: kpis.totalPosts, sub: null },
                    { label: 'Média Posts/Dia', value: kpis.avgPosts.toFixed(1), sub: '(Exceto X)' },
                ].map((stat, idx) => (
                    <div key={idx} className="glass-card p-5 rounded-xl">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{stat.label}</p>
                        <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                        {stat.sub && <p className="text-[10px] text-zinc-600 mt-1">{stat.sub}</p>}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {influencer.socialProfiles.map((profile) => {
                    const historyDates = profile.metrics.map((m) => formatDate(m.date));
                    const historyFollowers = profile.metrics.map((m) => m.followersCount);
                    const totalPosts = profile.metrics.reduce((sum, m) => sum + m.postsCount, 0);
                    const postsCounts = profile.metrics.map((m) => m.postsCount);
                    const hasMetrics = profile.metrics.length > 0;
                    const formatInt = (val) => Math.round(Number(val) || 0);

                    const chartColor = profile.platform === 'instagram' ? '#db2777' :
                        profile.platform === 'youtube' ? '#dc2626' :
                            profile.platform === 'kwai' ? '#f97316' :
                                profile.platform === 'tiktok' ? '#8b5cf6' : '#3b82f6';

                    const chartOptions = {
                        chart: { type: 'area', toolbar: { show: false }, background: 'transparent', zoom: { enabled: false } },
                        dataLabels: { enabled: false },
                        stroke: { curve: 'smooth', width: 2 },
                        xaxis: { categories: historyDates, ...baseAxisColors, tooltip: { enabled: false } },
                        yaxis: { ...baseAxisColors, labels: { style: { colors: '#a1a1aa' }, formatter: (val) => formatInt(val) } },
                        grid: { borderColor: gridColor, strokeDashArray: 0, yaxis: { lines: { show: true } } },
                        colors: [chartColor],
                        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] } },
                        theme: { mode: 'dark' }
                    };

                    const chartSeries = [{ name: 'Seguidores', data: historyFollowers.map((v) => formatInt(v)) }];

                    const postsChartOptions = {
                        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
                        plotOptions: { bar: { borderRadius: 2, columnWidth: '60%' } },
                        dataLabels: { enabled: false },
                        xaxis: { categories: historyDates, ...baseAxisColors, labels: { show: false } },
                        yaxis: { ...baseAxisColors, labels: { style: { colors: '#a1a1aa' }, formatter: (val) => formatInt(val) } },
                        grid: { show: false },
                        colors: ['#6D28D9'], // violet-700
                        tooltip: { theme: 'dark', y: { formatter: (val) => formatInt(val).toLocaleString() } },
                    };
                    const postsChartSeries = [{ name: 'Posts', data: postsCounts.map((v) => formatInt(v)) }];

                    const lastUpdate = profile.metrics[profile.metrics.length - 1]?.date;

                    return (
                        <div key={profile.id} className="glass-panel p-6 rounded-2xl space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${platformColors[profile.platform]} bg-transparent border-0`}>
                                        {platformIcons[profile.platform]}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white capitalize">{profile.platform}</h3>
                                        <p className="text-xs text-zinc-500">@{profile.handle}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-white">{historyFollowers.length > 0 ? historyFollowers[historyFollowers.length - 1].toLocaleString() : 0}</div>
                                    <div className="text-xs text-zinc-500">Seguidores Atuais</div>
                                </div>
                            </div>

                            {hasMetrics ? (
                                <div className="space-y-6">
                                    <div className="h-[200px]">
                                        <LazyChart options={chartOptions} series={chartSeries} type="area" height="100%" />
                                    </div>
                                    <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-semibold text-zinc-300">Atividade de Posts</h4>
                                            <span className="text-xs text-zinc-500">{totalPosts} posts no período</span>
                                        </div>
                                        <LazyChart options={postsChartOptions} series={postsChartSeries} type="bar" height={100} />
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 text-center text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                                    Sem métricas no período selecionado.
                                </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-zinc-500 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    Última atualização: {formatDate(lastUpdate)}
                                </div>
                                {profile.externalId && <span>ID: {profile.externalId}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InfluencerDetail;
