import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Target, Plus, Filter, TrendingUp, CheckCircle2, XCircle, Clock, Loader2, Search } from 'lucide-react';
import GoalCard from '../components/GoalCard';
import GoalModal from '../components/GoalModal';

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

    // Filters
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        influencerId: '',
    });

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
            const res = await fetch(`${API_URL}/influencers`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch influencers');

            const json = await res.json();
            setInfluencers(json.data || []);
        } catch (error) {
            console.error('Error fetching influencers:', error);
        }
    };

    const handleCreateGoal = async (goalData) => {
        try {
            const res = await fetch(`${API_URL}/goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(goalData),
            });

            if (!res.ok) throw new Error('Failed to create goal');

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

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    useEffect(() => {
        if (!authLoading && user) {
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
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />
                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                            <Target size={32} className="text-blue-400" />
                            Metas de Influenciadores
                        </h1>
                        <p className="text-zinc-400 mt-2 text-lg">
                            Acompanhe o crescimento e performance de produção da sua rede
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingGoal(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition font-medium shadow-lg hover:shadow-violet-500/25"
                    >
                        <Plus size={20} />
                        Nova Meta
                    </button>
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
                            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition font-medium shadow-lg shadow-violet-500/20"
                        >
                            <Plus size={20} />
                            Criar Primeira Meta
                        </button>
                    </div>
                ) : (
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
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
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
        </div>
    );
}
