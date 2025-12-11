import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import Chart from 'react-apexcharts';
import { Loader2, Share2, Download, ListOrdered, ArrowUp, ArrowDown, Minus, MessageCircle, Copy } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatDate } from '../utils/dateUtils';

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
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportRank}
                        disabled={rankLoading}
                        className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {rankLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ListOrdered size={16} className="mr-2" />}
                        Exportar rank
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Download size={16} className="mr-2" />
                        Exportar relatório geral
                    </button>
                </div>
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

            {rankError && (
                <div className="p-3 rounded-md bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    {rankError}
                </div>
            )}

            <div className="absolute -left-[9999px] top-0">
                <div ref={rankRef} className="min-w-[900px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-lg font-semibold">Ranking - últimas 4 semanas</h3>
                            {selectedState && <p className="text-xs text-gray-500">Filtro: {selectedState}{selectedMunicipality ? ` / ${selectedMunicipality}` : ''}</p>}
                        </div>
                        <span className="text-xs text-gray-500">Gerado em {formatDate(new Date())}</span>
                    </div>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="p-2 border border-gray-200 dark:border-gray-700 text-left">Influenciador / UF</th>
                                <th className="p-2 border border-gray-200 dark:border-gray-700 text-right">Semana -3</th>
                                <th className="p-2 border border-gray-200 dark:border-gray-700 text-right">Semana -2</th>
                                <th className="p-2 border border-gray-200 dark:border-gray-700 text-right">Semana -1</th>
                                <th className="p-2 border border-gray-200 dark:border-gray-700 text-right">Semana atual</th>
                                <th className="p-2 border border-gray-200 dark:border-gray-700 text-right">Cresc. abs.</th>
                                <th className="p-2 border border-gray-200 dark:border-gray-700 text-right">Cresc. %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankData.map((row) => (
                                <tr key={row.id} className="odd:bg-gray-50 dark:odd:bg-gray-800/40">
                                    <td className="p-2 border border-gray-200 dark:border-gray-700">
                                        <div className="font-semibold">{row.name}</div>
                                        <div className="text-xs text-gray-500">{row.state}</div>
                                    </td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-right">{(row.weeks.w3 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-right">{(row.weeks.w2 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-right">{(row.weeks.w1 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-right">{(row.weeks.w0 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-right">{(row.growthAbs ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-right">{(row.growthPct ?? 0).toFixed(1)}%</td>
                                </tr>
                            ))}
                            {rankTotals && (
                                <tr className="bg-gray-200 dark:bg-gray-800 font-semibold">
                                    <td className="p-2 border border-gray-300 dark:border-gray-700">Total</td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-700 text-right">{(rankTotals.w3 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-700 text-right">{(rankTotals.w2 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-700 text-right">{(rankTotals.w1 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-700 text-right">{(rankTotals.w0 ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-700 text-right">{(rankTotals.growthAbs ?? 0).toLocaleString('pt-BR')}</td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-700 text-right">{(rankTotals.growthPct ?? 0).toFixed(1)}%</td>
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

    const generateImageBlob = async () => {
        if (!cardRef.current) return null;
        const generate = async (options = {}) => {
            return await toPng(cardRef.current, {
                pixelRatio: 2,
                cacheBust: false,
                backgroundColor: null,
                ...options,
                filter: (node) => !node?.dataset?.htmlToImageIgnore
            });
        };

        try {
            // Tentativa 1: CORS habilitado
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
            // Fallback download if generic share isn't supported
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
            // Mobile: Tenta share nativo direto (melhor experiência)
            await handleShare();
        } else {
            // Desktop: Apenas copia para o Clipboard (UX solicitada)
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
        <div className="flex flex-col">
            {/* Capture Area: arredondado em cima, reto embaixo */}
            <div
                ref={cardRef}
                className="aspect-square bg-white dark:bg-gray-900 rounded-t-xl rounded-b-none border border-gray-200 dark:border-gray-800 p-4 flex flex-col"
            >
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{card.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{card.city} - {card.state}</p>
                    </div>
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 flex items-center justify-center text-sm font-semibold border border-gray-100 dark:border-gray-700">
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

                <div className="flex-1">
                    <Chart options={chartOptions} series={series} type="line" height={220} />
                </div>

                <div className="mt-3 space-y-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Total seguidores: {card.totalFollowers?.toLocaleString()}</p>
                    <div className="flex flex-wrap gap-2">
                        {variationBadges.map((badge) => {
                            let colorClass = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                            let Icon = Minus;
                            let prefix = "";

                            if (badge.pct > 0) {
                                colorClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50";
                                Icon = ArrowUp;
                                prefix = "+";
                            } else if (badge.pct < 0) {
                                colorClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50";
                                Icon = ArrowDown;
                            }

                            return (
                                <span
                                    key={badge.platform}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${colorClass}`}
                                >
                                    <span className="uppercase tracking-wide text-[10px] opacity-75">{badge.platform}</span>
                                    <span className="flex items-center gap-0.5">
                                        <Icon size={12} strokeWidth={3} />
                                        {prefix}{badge.pct.toFixed(1)}%
                                    </span>
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer Area with Buttons (Excluded from capture) */}
            <div className="bg-gray-50 dark:bg-gray-800/50 border-t-0 border border-gray-200 dark:border-gray-800 rounded-b-xl p-3 flex items-center justify-end gap-2 relative">
                {copyFeedback && (
                    <span className="absolute left-3 text-xs text-green-600 font-medium animate-pulse">
                        {copyFeedback}
                    </span>
                )}
                <button
                    onClick={handleWhatsApp}
                    className="flex items-center justify-center p-2 rounded-md bg-green-600 text-white hover:bg-green-700 w-10 h-10 transition-colors"
                    title="Copiar imagem para WhatsApp"
                >
                    <Copy size={18} />
                </button>
                <button
                    onClick={handleShare}
                    className="flex items-center justify-center p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 w-10 h-10 transition-colors"
                    title="Compartilhar"
                >
                    <Share2 size={18} />
                </button>
            </div>
        </div>
    );
};

export default Reports;
