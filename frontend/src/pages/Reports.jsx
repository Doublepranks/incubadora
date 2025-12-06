import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import Chart from 'react-apexcharts';
import { Loader2, Share2, Download } from 'lucide-react';
import { toPng } from 'html-to-image';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const PAGE_SIZE = 12;

const platformColors = {
    instagram: '#db2777',
    youtube: '#dc2626',
    kwai: '#f97316',
    x: '#3b82f6',
    tiktok: '#0f172a'
};

const Reports = () => {
    const { selectedState, selectedMunicipality } = useApp();
    const [search, setSearch] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [error, setError] = useState('');

    const filteredCards = useMemo(() => {
        return cards.filter(card => {
            const matchesSearch = card.name.toLowerCase().includes(search.toLowerCase());
            const matchesState = selectedState ? card.state === selectedState : true;
            const matchesCity = selectedMunicipality ? card.city === selectedMunicipality : true;
            return matchesSearch && matchesState && matchesCity;
        });
    }, [cards, search, selectedState, selectedMunicipality]);

    const paginatedCards = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredCards.slice(start, start + PAGE_SIZE);
    }, [filteredCards, page]);

    const totalPages = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE));

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams();
                if (selectedState) params.append('state', selectedState);
                if (selectedMunicipality) params.append('city', selectedMunicipality);
                const res = await fetch(`${API_URL}/reports?${params.toString()}`, { credentials: 'include' });
                if (!res.ok) {
                    throw new Error('Erro ao carregar relatórios');
                }
                const json = await res.json();
                setCards(json.data || []);
            } catch (err) {
                console.error('Erro ao carregar relatórios', err);
                setError('Não foi possível carregar os relatórios. Tente novamente mais tarde.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedState, selectedMunicipality]);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedState) params.append('state', selectedState);
            if (selectedMunicipality) params.append('city', selectedMunicipality);
            const res = await fetch(`${API_URL}/reports/general/export?format=xlsx&${params.toString()}`, {
                credentials: 'include'
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'relatorio.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erro ao exportar', err);
        }
    };

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Relatórios</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cards 1:1 das últimas 4 semanas</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                    <Download size={16} className="mr-2" />
                    Exportar relatório geral
                </button>
            </div>

            <div className="flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Buscar influenciador..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCards.map((card) => (
                    <ReportCard key={card.id} card={card} />
                ))}
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Anterior
                </button>
                <span>Página {page} de {totalPages}</span>
                <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Próxima
                </button>
            </div>
        </div>
    );
};

const ReportCard = ({ card }) => {
    const cardRef = useRef(null);

    const weeks = useMemo(() => {
        const unique = Array.from(new Set(card.weekly.map((w) => w.weekStart)));
        return unique.sort();
    }, [card.weekly]);

    const series = useMemo(() => {
        const grouped = new Map();
        card.weekly.forEach((w) => {
            if (!grouped.has(w.platform)) grouped.set(w.platform, []);
        });
        weeks.forEach((week) => {
            grouped.forEach((arr, platform) => {
                const match = card.weekly.find((w) => w.platform === platform && w.weekStart === week);
                arr.push(match ? match.followers : 0);
            });
        });
        return Array.from(grouped.entries()).map(([platform, data]) => ({
            name: platform,
            data,
            color: platformColors[platform] || '#3b82f6'
        }));
    }, [card.weekly, weeks]);

    const chartOptions = useMemo(() => ({
        chart: { type: 'line', toolbar: { show: false }, animations: { enabled: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth' },
        xaxis: { categories: weeks.map((w, idx) => `Semana ${idx + 1}`) },
        legend: { show: false },
        grid: { strokeDashArray: 4 },
    }), [weeks]);

    const variationBadges = useMemo(() => {
        const badges = [];
        const grouped = new Map();
        card.weekly.forEach((w) => {
            if (!grouped.has(w.platform)) grouped.set(w.platform, []);
            grouped.get(w.platform).push(w);
        });
        grouped.forEach((arr, platform) => {
            const sorted = arr.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
            const last = sorted[sorted.length - 1];
            const prev = sorted[sorted.length - 2];
            if (!last || !prev) return;
            const diff = last.followers - prev.followers;
            const pct = prev.followers > 0 ? (diff / prev.followers) * 100 : 0;
            badges.push({ platform, pct });
        });
        return badges;
    }, [card.weekly]);

    const handleShare = async () => {
        if (!cardRef.current) return;
        try {
            const blob = await toPng(cardRef.current, {
                pixelRatio: 2,
                cacheBust: true,
                useCORS: false,
                filter: (node) => !node?.dataset?.htmlToImageIgnore
            });
            const res = await fetch(blob);
            const pngBlob = await res.blob();
            const file = new File([pngBlob], `${card.name}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: card.name,
                    text: 'Desempenho das últimas 4 semanas'
                });
            } else {
                const url = URL.createObjectURL(pngBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${card.name}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Erro ao compartilhar', err);
        }
    };

    return (
        <div ref={cardRef} className="aspect-square bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{card.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{card.city} - {card.state}</p>
                </div>
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 flex items-center justify-center text-sm font-semibold">
                    <span className="z-0">{card.name?.[0] ?? '?'}</span>
                </div>
            </div>

            <div className="flex-1">
                <Chart options={chartOptions} series={series} type="line" height={220} />
            </div>

            <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Total seguidores: {card.totalFollowers?.toLocaleString()}</p>
                <div className="flex flex-wrap gap-2">
                    {variationBadges.map((badge) => (
                        <span key={badge.platform} className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                            {badge.platform}: {badge.pct.toFixed(1)}%
                        </span>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleShare}
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                    <Share2 size={16} className="mr-2" />
                    Compartilhar
                </button>
            </div>
        </div>
    );
};

export default Reports;
