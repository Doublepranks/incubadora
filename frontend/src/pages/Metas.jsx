import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Target, Plus, Filter, TrendingUp, CheckCircle2, XCircle, Clock, Loader2, Search, LayoutGrid, List, Ban, Trash2, Edit3 } from 'lucide-react';
import GoalCard from '../components/GoalCard';
import GoalListItem from '../components/GoalListItem';
import GoalModal from '../components/GoalModal';
import BatchEditModal from '../components/BatchEditModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const STATUS_FILTERS = [
    { value: '', label: 'Todos os Status' },
    { value: 'active', label: 'Ativas' },
    { value: 'achieved', label: 'Alcançadas' },
    { value: 'failed', label: 'Expiradas' },
    { value: 'cancelled', label: 'Canceladas' },
];

const TYPE_FILTERS = [
    { value: '', label: 'Todos os Tipos' },
    { value: 'followers', label: 'Seguidores' },
    { value: 'posts', label: 'Produção' },
];

export default function Metas() {
    const { user, authLoading } = useApp();

    const [goals, setGoals] = useState([]);
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);

    // View mode & selection
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [batchLoading, setBatchLoading] = useState(false);
    const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        influencerId: '',
    });

    // Derived state for batch actions
    const allSelectedCancelled = useMemo(() => {
        if (selectedIds.size === 0) return false;
        return [...selectedIds].every((id) => {
            const goal = goals.find((g) => g.id === id);
            return goal?.status === 'cancelled';
        });
    }, [selectedIds, goals]);

    const someSelectedActive = useMemo(() => {
        if (selectedIds.size === 0) return false;
        return [...selectedIds].some((id) => {
            const goal = goals.find((g) => g.id === id);
            return goal?.status === 'active';
        });
    }, [selectedIds, goals]);

    // Stats
    const stats = {
        total: goals.length,
        active: goals.filter((g) => g.status === 'active').length,
        achieved: goals.filter((g) => g.status === 'achieved').length,
        failed: goals.filter((g) => g.status === 'failed').length,
    };

    useEffect(() => {
        if (authLoading || !user) return;
        fetchGoals();
        fetchInfluencers();
    }, [authLoading, user]);

    const fetchGoals = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.type) params.append('type', filters.type);
            if (filters.influencerId) params.append('influencerId', filters.influencerId);

            const res = await fetch(`${API_URL}/goals?${params.toString()}`, {
                credentials: 'include',
            });

            if (!res.ok) throw new Error('Failed to fetch goals');

            const json = await res.json();
            setGoals(json.data || []);
        } catch (error) {
            console.error('Error fetching goals:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInfluencers = async () => {
        try {
            const res = await fetch(`${API_URL}/influencers/summary`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch influencers');

            const json = await res.json();
            setInfluencers(json.data || []);
        } catch (error) {
            console.error('Error fetching influencers:', error);
        }
    };

    const handleCreateGoal = async (goalData) => {
        try {
            const isSeries = goalData.mode === 'series';
            const url = isSeries ? `${API_URL}/goals/series` : `${API_URL}/goals`;
            const { mode: _mode, ...payload } = goalData;

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed to create goal');

            const result = await res.json();
            if (isSeries && result.message) {
                alert(result.message);
            }

            await fetchGoals();
        } catch (error) {
            console.error('Error creating goal:', error);
            alert('Erro ao criar meta. Tente novamente.');
        }
    };

    const handleUpdateGoal = async (goalData) => {
        try {
            const res = await fetch(`${API_URL}/goals/${editingGoal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(goalData),
            });

            if (!res.ok) throw new Error('Failed to update goal');

            await fetchGoals();
        } catch (error) {
            console.error('Error updating goal:', error);
            alert('Erro ao atualizar meta. Tente novamente.');
        }
    };

    const handleCancelGoal = async (goalId) => {
        if (!confirm('Tem certeza que deseja cancelar esta meta?')) return;

        try {
            const res = await fetch(`${API_URL}/goals/${goalId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!res.ok) throw new Error('Failed to cancel goal');

            await fetchGoals();
        } catch (error) {
            console.error('Error canceling goal:', error);
            alert('Erro ao cancelar meta. Tente novamente.');
        }
    };

    const handleDeleteGoal = async (goalId) => {
        if (!confirm('Tem certeza que deseja EXCLUIR permanentemente esta meta? Esta ação não pode ser desfeita.')) return;

        try {
            const res = await fetch(`${API_URL}/goals/${goalId}/permanent`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!res.ok) throw new Error('Failed to delete goal');

            await fetchGoals();
        } catch (error) {
            console.error('Error deleting goal:', error);
            alert('Erro ao excluir meta. Tente novamente.');
        }
    };

    // Batch handlers
    const handleToggleSelect = (goalId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(goalId)) {
                next.delete(goalId);
            } else {
                next.add(goalId);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === goals.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(goals.map((g) => g.id)));
        }
    };

    const handleBatchCancel = async () => {
        const activeIds = [...selectedIds].filter((id) => {
            const goal = goals.find((g) => g.id === id);
            return goal?.status === 'active';
        });

        if (activeIds.length === 0) {
            alert('Nenhuma meta ativa selecionada para cancelar.');
            return;
        }

        if (!confirm(`Cancelar ${activeIds.length} meta(s) ativa(s)?`)) return;

        try {
            setBatchLoading(true);
            const res = await fetch(`${API_URL}/goals/batch/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ids: activeIds }),
            });
            if (!res.ok) throw new Error('Failed');
            const result = await res.json();
            alert(`${result.data.cancelled} meta(s) cancelada(s).`);
            setSelectedIds(new Set());
            await fetchGoals();
        } catch (error) {
            console.error('Error batch cancelling:', error);
            alert('Erro ao cancelar metas em lote.');
        } finally {
            setBatchLoading(false);
        }
    };

    const handleBatchDelete = async () => {
        if (!confirm(`Excluir permanentemente ${selectedIds.size} meta(s) cancelada(s)? Esta ação não pode ser desfeita.`)) return;

        try {
            setBatchLoading(true);
            const res = await fetch(`${API_URL}/goals/batch/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ids: [...selectedIds] }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            const result = await res.json();
            alert(`${result.data.deleted} meta(s) excluída(s).`);
            setSelectedIds(new Set());
            await fetchGoals();
        } catch (error) {
            console.error('Error batch deleting:', error);
            alert(error.message || 'Erro ao excluir metas em lote.');
        } finally {
            setBatchLoading(false);
        }
    };

    const handleBatchUpdate = async (changes) => {
        try {
            setBatchLoading(true);
            const res = await fetch(`${API_URL}/goals/batch/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ids: [...selectedIds], changes }),
            });
            if (!res.ok) throw new Error('Failed');
            const result = await res.json();
            alert(`${result.data.updated} meta(s) atualizada(s).`);
            setSelectedIds(new Set());
            await fetchGoals();
        } catch (error) {
            console.error('Error batch updating:', error);
            alert('Erro ao atualizar metas em lote.');
        } finally {
            setBatchLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    useEffect(() => {
        if (!authLoading && user) {
            setSelectedIds(new Set());
            fetchGoals();
        }
    }, [filters]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in p-6">
            {/* Header Panel */}
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                            <Target size={32} className="text-amber-500" />
                            Metas de Influenciadores
                        </h1>
                        <p className="text-zinc-400 mt-2 text-lg">
                            Acompanhe o crescimento e performance de produção da sua rede
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View mode toggle */}
                        <div className="flex bg-zinc-900/50 rounded-lg p-1 border border-white/10">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                title="Vista em Cards"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                title="Vista em Lista"
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setEditingGoal(null);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition font-medium shadow-lg hover:shadow-amber-500/25"
                        >
                            <Plus size={20} />
                            Nova Meta
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total de Metas', value: stats.total, icon: Target, color: 'text-zinc-400', subColor: 'text-white' },
                    { label: 'Ativas', value: stats.active, icon: TrendingUp, color: 'text-blue-500', subColor: 'text-blue-400' },
                    { label: 'Alcançadas', value: stats.achieved, icon: CheckCircle2, color: 'text-emerald-500', subColor: 'text-emerald-400' },
                    { label: 'Expiradas', value: stats.failed, icon: Clock, color: 'text-red-500', subColor: 'text-red-400' }
                ].map((stat, idx) => (
                    <div key={idx} className="glass-card p-5 rounded-xl flex items-center justify-between group">
                        <div>
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{stat.label}</p>
                            <p className={`text-2xl font-bold tracking-tight ${stat.subColor}`}>{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl bg-white/5 border border-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-panel p-5 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-zinc-400" />
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Filtros</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium appearance-none cursor-pointer hover:bg-zinc-900/70"
                        >
                            {STATUS_FILTERS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            className="w-full px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium appearance-none cursor-pointer hover:bg-zinc-900/70"
                        >
                            {TYPE_FILTERS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={filters.influencerId}
                            onChange={(e) => handleFilterChange('influencerId', e.target.value)}
                            className="w-full px-4 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium appearance-none cursor-pointer hover:bg-zinc-900/70"
                        >
                            <option value="">Todos os Influenciadores</option>
                            {influencers.map((inf) => (
                                <option key={inf.id} value={inf.id}>
                                    {inf.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Batch Toolbar */}
            {selectedIds.size > 0 && (
                <div className="glass-panel p-4 rounded-xl flex items-center justify-between animate-fade-in sticky top-4 z-20 border border-amber-500/20 bg-zinc-900/95 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-white">
                            {selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-zinc-400 hover:text-white transition"
                        >
                            Limpar seleção
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {someSelectedActive && (
                            <button
                                onClick={handleBatchCancel}
                                disabled={batchLoading}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition border border-amber-500/20 disabled:opacity-50"
                            >
                                <Ban size={14} />
                                Cancelar
                            </button>
                        )}
                        {allSelectedCancelled && (
                            <button
                                onClick={handleBatchDelete}
                                disabled={batchLoading}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition border border-red-500/20 disabled:opacity-50"
                            >
                                <Trash2 size={14} />
                                Excluir
                            </button>
                        )}
                        <button
                            onClick={() => setIsBatchEditOpen(true)}
                            disabled={batchLoading}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition border border-blue-500/20 disabled:opacity-50"
                        >
                            <Edit3 size={14} />
                            Editar
                        </button>
                    </div>
                </div>
            )}

            {/* Goals List */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-blue-500" size={40} />
                        <p className="text-zinc-500 text-sm">Carregando metas...</p>
                    </div>
                ) : goals.length === 0 ? (
                    <div className="glass-panel p-16 rounded-2xl text-center border-dashed border-zinc-800">
                        <div className="mx-auto w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mb-6 ring-4 ring-zinc-900/30">
                            <Target size={32} className="text-zinc-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            Nenhuma meta encontrada
                        </h3>
                        <p className="text-zinc-400 mb-8 max-w-sm mx-auto">
                            Crie metas para acompanhar o progresso de seguidores e produção de conteúdo da sua rede.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition font-medium shadow-lg shadow-amber-500/20"
                        >
                            <Plus size={20} />
                            Criar Primeira Meta
                        </button>
                    </div>
                ) : viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {goals.map((goal) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                onEdit={(g) => {
                                    setEditingGoal(g);
                                    setIsModalOpen(true);
                                }}
                                onCancel={handleCancelGoal}
                                onDelete={handleDeleteGoal}
                            />
                        ))}
                    </div>
                ) : (
                    /* List View */
                    <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.03]">
                                    <th className="px-4 py-3 w-12">
                                        <input
                                            type="checkbox"
                                            checked={goals.length > 0 && selectedIds.size === goals.length}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-white/20 bg-zinc-900 text-amber-500 focus:ring-amber-500/30 focus:ring-offset-0 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Influenciador</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Plataforma</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Progresso</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Prazo</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {goals.map((goal) => (
                                    <GoalListItem
                                        key={goal.id}
                                        goal={goal}
                                        selected={selectedIds.has(goal.id)}
                                        onToggleSelect={handleToggleSelect}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Goal Modal */}
            <GoalModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingGoal(null);
                }}
                onSave={editingGoal ? handleUpdateGoal : handleCreateGoal}
                goal={editingGoal}
                influencers={influencers}
            />

            {/* Batch Edit Modal */}
            <BatchEditModal
                isOpen={isBatchEditOpen}
                onClose={() => setIsBatchEditOpen(false)}
                onSave={handleBatchUpdate}
                selectedCount={selectedIds.size}
            />
        </div>
    );
}
