import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';
import { ArrowLeft, Instagram, Youtube, Video, Twitter, Loader2, User as UserIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const platformIcons = {
    instagram: <Instagram size={20} />,
    youtube: <Youtube size={20} />,
    kwai: <Video size={20} />,
    x: <Twitter size={20} />,
    tiktok: <Video size={20} />,
};

const platformColors = {
    instagram: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400',
    youtube: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    kwai: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
    x: 'text-blue-400 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    tiktok: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
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
            totalPosts += metrics.reduce((sum, m) => sum + m.postsCount, 0);
            growthAbsolute += end - start;
            metrics.forEach((m) => daysCounted.add(m.date.split('T')[0]));
        });

        const startFollowers = totalFollowers - growthAbsolute;
        const growthPercent = startFollowers > 0 ? (growthAbsolute / startFollowers) * 100 : 0;
        const avgPosts = daysCounted.size > 0 ? totalPosts / daysCounted.size : 0;

        return { totalFollowers, totalPosts, growthAbsolute, growthPercent, avgPosts };
    }, [influencer]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <Loader2 className="animate-spin mr-2" size={20} /> Carregando...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
                {error}
            </div>
        );
    }

    if (!influencer) {
        return <div className="text-center text-gray-500 dark:text-gray-400 mt-10">Influenciador não encontrado.</div>;
    }

    const headerAvatar = influencer.avatarUrl ? (
        <img src={influencer.avatarUrl} alt={influencer.name} className="h-16 w-16 rounded-full object-cover" />
    ) : (
        <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500">
            <UserIcon size={28} />
        </div>
    );

    return (
        <div className="space-y-6">
            <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft size={20} className="mr-2" />
                Voltar para Dashboard
            </button>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {headerAvatar}
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{influencer.name}</h1>
                            <p className="text-gray-500 dark:text-gray-400">{influencer.city} - {influencer.state}</p>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        {influencer.socialProfiles.map((profile) => (
                            <a
                                key={profile.id}
                                href={profile.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-3 rounded-full ${platformColors[profile.platform] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'} hover:opacity-80 transition-opacity`}
                                title={profile.handle}
                            >
                                {platformIcons[profile.platform] || null}
                            </a>
                        ))}
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                    {[7, 30, 90].map(days => (
                        <button
                            key={days}
                            onClick={() => setFilters((prev) => ({ ...prev, periodDays: days }))}
                            className={`px-3 py-1 rounded-full border ${filters.periodDays === days ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                        >
                            {days} dias
                        </button>
                    ))}
                    <button
                        onClick={() => setFilters((prev) => ({ ...prev, periodDays: 'all' }))}
                        className={`px-3 py-1 rounded-full border ${filters.periodDays === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                        Todo período
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Seguidores totais</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.totalFollowers.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Crescimento</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatSigned(kpis.growthAbsolute)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Crescimento %</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatSignedPercent(kpis.growthPercent, 2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Posts no período</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.totalPosts}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Média de posts/dia</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.avgPosts.toFixed(1)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {influencer.socialProfiles.map((profile) => {
                    const historyDates = profile.metrics.map((m) => m.date.split('T')[0]);
                    const historyFollowers = profile.metrics.map((m) => m.followersCount);
                    const totalPosts = profile.metrics.reduce((sum, m) => sum + m.postsCount, 0);
                    const postsCounts = profile.metrics.map((m) => m.postsCount);
                    const hasMetrics = profile.metrics.length > 0;
                    const chartOptions = {
                        chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
                        dataLabels: { enabled: false },
                        stroke: { curve: 'smooth' },
                        xaxis: { categories: historyDates, labels: { style: { colors: '#9ca3af' } } },
                        yaxis: { labels: { style: { colors: '#9ca3af' } } },
                        grid: { borderColor: '#374151', strokeDashArray: 4 },
                        theme: { mode: 'dark' },
                        colors: [profile.platform === 'instagram'
                            ? '#db2777'
                            : profile.platform === 'youtube'
                                ? '#dc2626'
                                : profile.platform === 'kwai'
                                    ? '#f97316'
                                    : profile.platform === 'tiktok'
                                        ? '#8b5cf6'
                                        : '#3b82f6'],
                    };

                    const chartSeries = [{ name: 'Seguidores', data: historyFollowers }];

                    const postsChartOptions = {
                        chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
                        plotOptions: { bar: { borderRadius: 4 } },
                        dataLabels: { enabled: false },
                        xaxis: { categories: historyDates, labels: { style: { colors: '#9ca3af' } } },
                        yaxis: { labels: { style: { colors: '#9ca3af' } } },
                        grid: { borderColor: '#374151', strokeDashArray: 4 },
                        theme: { mode: 'dark' },
                        colors: ['#f59e0b'],
                    };
                    const postsChartSeries = [{ name: 'Posts', data: postsCounts }];

                    const lastUpdate = profile.metrics[profile.metrics.length - 1]?.date;

                    return (
                        <div key={profile.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white capitalize">{profile.platform}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total posts no período: {totalPosts}</p>
                                </div>
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {historyFollowers.length > 0 ? historyFollowers[historyFollowers.length - 1].toLocaleString() : 0} seguidores
                                </span>
                            </div>
                            {hasMetrics ? (
                                <>
                                    <Chart options={chartOptions} series={chartSeries} type="area" height={200} />
                                    <Chart options={postsChartOptions} series={postsChartSeries} type="bar" height={200} />
                                </>
                            ) : (
                                <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                    Sem métricas no período selecionado.
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Posts no período</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{totalPosts}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Última atualização</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{lastUpdate ? new Date(lastUpdate).toLocaleDateString() : '-'}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InfluencerDetail;
