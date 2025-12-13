import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import LazyChart from '../components/LazyChart';
import { Loader2, Share2, Download, ListOrdered, ArrowUp, ArrowDown, Minus, MessageCircle, Copy, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatDate } from '../utils/dateUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const PAGE_SIZE = 12;

const platformColors = {
    instagram: '#db2777',
    youtube: '#dc2626',
    kwai: '#f97316',
    x: '#3b82f6',
    tiktok: '#7d54dc'
};

const Reports = () => {
    const { selectedState, selectedMunicipality } = useApp();
    const [search, setSearch] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [error, setError] = useState('');
    const [rankLoading, setRankLoading] = useState(false);
    const [rankError, setRankError] = useState('');
    const [rankData, setRankData] = useState([]);
    const [rankTotals, setRankTotals] = useState(null);
    const rankRef = useRef(null);

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

    const handleExportRank = async () => {
        setRankError('');
        setRankLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedState) params.append('state', selectedState);
            if (selectedMunicipality) params.append('city', selectedMunicipality);
            if (search) params.append('search', search);
            const res = await fetch(`${API_URL}/reports/rank?${params.toString()}`, { credentials: 'include' });
            if (!res.ok) {
                throw new Error('Erro ao carregar ranking');
            }
            const json = await res.json();
            setRankData(json.data || []);
            setRankTotals(json.totals || null);
            // aguarda render
            await new Promise((resolve) => setTimeout(resolve, 50));
            if (rankRef.current) {
                const dataUrl = await toPng(rankRef.current, { pixelRatio: 2, cacheBust: true });
                const link = document.createElement('a');
                const today = new Date().toISOString().split('T')[0];
                link.href = dataUrl;
                link.download = `rank-${today}.png`;
                link.click();
            }
        } catch (err) {
            console.error(err);
            setRankError('Não foi possível gerar o rank. Tente novamente.');
        } finally {
            setRankLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)] text-zinc-500">
                <Loader2 className="animate-spin mr-2" size={24} /> Carregando relatórios...
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

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Relatórios</h2>
                    <p className="text-sm text-zinc-400">Cards 1:1 das últimas 4 semanas para redes sociais</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleExportRank}
                        disabled={rankLoading}
                        className="flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 border border-white/5 disabled:opacity-50 transition-colors"
                    >
                        {rankLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ListOrdered size={16} className="mr-2" />}
                        Exportar Ranking
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all"
                    >
                        <Download size={16} className="mr-2" />
                        Exportar Geral (.xlsx)
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-zinc-600"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCards.map((card) => (
                    <ReportCard key={card.id} card={card} />
                ))}
            </div>

            {paginatedCards.length === 0 && (
                <div className="text-center py-20 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                    Nenhum relatório encontrado para os filtros selecionados.
                </div>
            )}

            <div className="flex items-center justify-center space-x-2 text-sm text-zinc-400 mt-6">
                <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="font-medium px-4">Página {page} de {totalPages}</span>
                <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {rankError && (
                <div className="p-4 rounded-xl bg-red-900/20 text-red-400 border border-red-900/50">
                    {rankError}
                </div>
            )}

            <div className="absolute -left-[9999px] top-0">
                <div ref={rankRef} className="min-w-[900px] bg-zinc-950 text-white rounded-xl shadow-2xl p-6 border border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-bold">Ranking de Engajamento</h3>
                            <p className="text-sm text-zinc-400">Últimas 4 semanas • {selectedState || 'Brasil'}{selectedMunicipality ? ` / ${selectedMunicipality}` : ''}</p>
                        </div>
                        <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">Gerado em {formatDate(new Date())}</span>
                    </div>
                    <table className="w-full text-sm border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-zinc-900/50 text-zinc-400">
                                <th className="p-3 text-left border-y border-zinc-800 rounded-l-lg font-medium">Influenciador</th>
                                <th className="p-3 text-right border-y border-zinc-800 font-medium">Semana -3</th>
                                <th className="p-3 text-right border-y border-zinc-800 font-medium">Semana -2</th>
                                <th className="p-3 text-right border-y border-zinc-800 font-medium">Semana -1</th>
                                <th className="p-3 text-right border-y border-zinc-800 font-medium">Atual</th>
                                <th className="p-3 text-right border-y border-zinc-800 font-medium">Cresc.</th>
                                <th className="p-3 text-right border-y border-zinc-800 rounded-r-lg font-medium">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankData.map((row) => (
                                <tr key={row.id}>
                                    <td className="p-3 border-b border-zinc-800/50">
                                        <div className="font-bold text-white">{row.name}</div>
                                        <div className="text-xs text-zinc-500">{row.state}</div>
                                    </td>
                                    <td className="p-3 text-right border-b border-zinc-800/50 text-zinc-300">{(row.weeks.w3 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 text-right border-b border-zinc-800/50 text-zinc-300">{(row.weeks.w2 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 text-right border-b border-zinc-800/50 text-zinc-300">{(row.weeks.w1 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 text-right border-b border-zinc-800/50 font-medium text-white">{(row.weeks.w0 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 text-right border-b border-zinc-800/50 text-emerald-400">{(row.growthAbs ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 text-right border-b border-zinc-800/50 text-emerald-400 font-bold">{(row.growthPct ?? 0).toFixed(1)}%</td>
                                </tr>
                            ))}
                            {rankTotals && (
                                <tr className="bg-zinc-900/80 font-bold">
                                    <td className="p-3 rounded-l-lg text-zinc-300">Total</td>
                                    <td className="p-3 text-right text-zinc-300">{(rankTotals.w3 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 text-right text-zinc-300">{(rankTotals.w2 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 text-right text-zinc-300">{(rankTotals.w1 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 text-right text-white">{(rankTotals.w0 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 text-right text-emerald-400">{(rankTotals.growthAbs ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-3 text-right text-emerald-400 rounded-r-lg">{(rankTotals.growthPct ?? 0).toFixed(1)}%</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ReportCard = ({ card }) => {
    const cardRef = useRef(null);
    const [copyFeedback, setCopyFeedback] = useState('');

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
        chart: { type: 'line', toolbar: { show: false }, animations: { enabled: false }, background: 'transparent' },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: {
            categories: weeks.map((w, idx) => `S${idx + 1}`),
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { style: { colors: '#71717a' } }
        },
        yaxis: {
            labels: { style: { colors: '#71717a' }, formatter: (val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val }
        },
        legend: { show: false },
        grid: { borderColor: '#27272a', strokeDashArray: 4 },
        theme: { mode: 'dark' }
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

    const generateImageBlob = async () => {
        if (!cardRef.current) return null;
        const generate = async (options = {}) => {
            return await toPng(cardRef.current, {
                pixelRatio: 2,
                cacheBust: false,
                backgroundColor: '#09090b', // zinc-950 explicitly for capture
                ...options,
                filter: (node) => !node?.dataset?.htmlToImageIgnore
            });
        };

        try {
            // Attempt 1: CORS enabled
            const blobUrl = await generate({ useCORS: true });
            const res = await fetch(blobUrl);
            return await res.blob();
        } catch (err) {
            console.warn("Retrying without avatar...", err);
            // Fallback Logic
            const avatarImg = cardRef.current.querySelector('img');
            const avatarInitials = cardRef.current.querySelector('span.z-0');
            let originalDisplay = '';

            if (avatarImg) {
                originalDisplay = avatarImg.style.display;
                avatarImg.style.display = 'none';
                avatarImg.dataset.htmlToImageIgnore = 'true';
                if (avatarInitials) avatarInitials.classList.remove('hidden');
            }

            try {
                const blobUrl = await generate({ useCORS: false });
                const res = await fetch(blobUrl);
                return await res.blob();
            } finally {
                if (avatarImg) {
                    avatarImg.style.display = originalDisplay;
                    delete avatarImg.dataset.htmlToImageIgnore;
                    if (avatarInitials) avatarInitials.classList.add('hidden');
                }
            }
        }
        return null;
    };

    const handleShare = async () => {
        const pngBlob = await generateImageBlob();
        if (!pngBlob) return;

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
    };

    const handleWhatsApp = async () => {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isMobile) {
            await handleShare();
        } else {
            const pngBlob = await generateImageBlob();
            if (!pngBlob) return;

            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': pngBlob })
                ]);

                setCopyFeedback('Copiado! Cole no WhatsApp (Ctrl+V)');
                setTimeout(() => setCopyFeedback(''), 4000);

            } catch (err) {
                console.error('Clipboard failed', err);
                alert('Não foi possível copiar a imagem automaticamente. O download será feito.');
                const url = URL.createObjectURL(pngBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${card.name}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }
        }
    };

    return (
        <div className="flex flex-col group">
            {/* Capture Area: arredondado em cima, reto embaixo */}
            <div
                ref={cardRef}
                className="glass-card rounded-t-2xl rounded-b-none p-5 flex flex-col border-b-0"
                style={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.05)' }} // Inline style for robust image capture
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="overflow-hidden">
                        <h3 className="text-lg font-bold text-white truncate leading-tight">{card.name}</h3>
                        <p className="text-xs text-zinc-400">{card.city} - {card.state}</p>
                    </div>
                    <div className="flex-shrink-0 relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 text-zinc-500 flex items-center justify-center text-sm font-semibold border border-white/5 ring-2 ring-white/5">
                        {card.avatarUrl ? (
                            <img
                                src={card.avatarUrl}
                                crossOrigin="anonymous"
                                alt={card.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.classList.remove('hidden');
                                }}
                            />
                        ) : null}
                        <span className={`${card.avatarUrl ? 'hidden' : ''} z-0`}>{card.name?.[0] ?? '?'}</span>
                    </div>
                </div>

                <div className="flex-1 -mx-2">
                    <LazyChart options={chartOptions} series={series} type="line" height={180} />
                </div>

                <div className="mt-4 space-y-3">
                    <div className="flex items-baseline justify-between">
                        <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Total</span>
                        <span className="text-xl font-bold text-white">{card.totalFollowers?.toLocaleString()}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {variationBadges.map((badge) => {
                            let colorClass = "bg-zinc-800 text-zinc-400 border border-zinc-700";
                            let Icon = Minus;
                            let prefix = "";

                            if (badge.pct > 0) {
                                colorClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                                Icon = ArrowUp;
                                prefix = "+";
                            } else if (badge.pct < 0) {
                                colorClass = "bg-red-500/10 text-red-400 border border-red-500/20";
                                Icon = ArrowDown;
                            }

                            return (
                                <span
                                    key={badge.platform}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 ${colorClass}`}
                                >
                                    <span className="uppercase opacity-80">{badge.platform}</span>
                                    <span className="flex items-center">
                                        <Icon size={10} strokeWidth={3} className="mr-0.5" />
                                        {prefix}{badge.pct.toFixed(0)}%
                                    </span>
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer Area with Buttons */}
            <div className="bg-zinc-900/50 backdrop-blur-md border border-t-0 border-white/5 rounded-b-2xl p-3 flex items-center justify-between gap-2 relative">
                <span className="text-[10px] text-zinc-600 pl-2">Dados das últimas 4 semanas</span>
                <div className="flex items-center gap-2">
                    {copyFeedback && (
                        <span className="text-[10px] text-emerald-400 font-medium animate-fade-in mr-2">
                            {copyFeedback}
                        </span>
                    )}
                    <button
                        onClick={handleWhatsApp}
                        className="flex items-center justify-center p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-600/30 transition-all w-9 h-9"
                        title="Copiar imagem para WhatsApp"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-600/30 transition-all w-9 h-9"
                        title="Compartilhar"
                    >
                        <Share2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Reports;
