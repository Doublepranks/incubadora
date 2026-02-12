import { useState, useEffect } from 'react';
import { X, Target } from 'lucide-react';
import { clsx } from 'clsx';

const PLATFORMS = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'x', label: 'X (Twitter)' },
    { value: 'kwai', label: 'Kwai' },
];

const GOAL_TYPES = [
    { value: 'followers', label: 'Seguidores' },
    { value: 'posts', label: 'Produção de Conteúdo' },
];

const SERIES_OPTIONS = [
    { value: 'Elite', label: 'Elite' },
    { value: 'A2', label: 'A2' },
    { value: 'A3', label: 'A3' },
    { value: 'Institucional', label: 'Institucional' },
    { value: 'Cortes', label: 'Cortes' },
    { value: 'Noticias', label: 'Notícias' },
];

/**
 * GoalModal - Modal para criar e editar metas de influenciadores
 */
export default function GoalModal({ isOpen, onClose, onSave, goal = null, influencers = [] }) {
    const isEditing = !!goal;
    const [mode, setMode] = useState('individual'); // 'individual' | 'series'

    const [formData, setFormData] = useState({
        influencerId: goal?.influencerId || '',
        series: '',
        type: goal?.type || 'followers',
        platform: goal?.platform || '',
        targetValue: goal?.targetValue || '',
        deadline: goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
        description: goal?.description || '',
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (goal) {
            setMode('individual');
            setFormData({
                influencerId: goal.influencerId || '',
                series: '',
                type: goal.type || 'followers',
                platform: goal.platform || '',
                targetValue: goal.targetValue || '',
                deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
                description: goal.description || '',
            });
        }
    }, [goal]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const newErrors = {};

        if (mode === 'individual' && !formData.influencerId) newErrors.influencerId = 'Selecione um influenciador';
        if (mode === 'series' && !formData.series) newErrors.series = 'Selecione uma série';
        if (!formData.targetValue || formData.targetValue <= 0) {
            newErrors.targetValue = 'Valor alvo deve ser maior que zero';
        }
        if (!formData.platform) newErrors.platform = 'Selecione uma plataforma';
        if (!formData.deadline) newErrors.deadline = 'Selecione uma data';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;

        onSave({
            ...formData,
            mode,
            targetValue: Number(formData.targetValue),
        });
        handleClose();
    };

    const handleClose = () => {
        setMode('individual');
        setFormData({
            influencerId: '',
            series: '',
            type: 'followers',
            platform: '',
            targetValue: '',
            deadline: '',
            description: '',
        });
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            <div className="relative glass-panel rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up border border-white/10 bg-zinc-900/95">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isEditing ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            <Target size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {isEditing ? 'Editar Meta' : 'Nova Meta'}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Mode Toggle */}
                        {!isEditing && (
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                    Modo de Criação
                                </label>
                                <div className="flex bg-zinc-900/50 rounded-xl p-1 border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setMode('individual')}
                                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'individual'
                                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                                            : 'text-zinc-400 hover:text-white'
                                            }`}
                                    >
                                        Individual
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode('series')}
                                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'series'
                                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                                            : 'text-zinc-400 hover:text-white'
                                            }`}
                                    >
                                        Por Série
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Influenciador (Individual mode) */}
                        {mode === 'individual' && (
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                    Influenciador <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={formData.influencerId}
                                    onChange={(e) => handleChange('influencerId', e.target.value)}
                                    disabled={isEditing}
                                    className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                                >
                                    <option value="">Selecione um influenciador...</option>
                                    {influencers.map((inf) => (
                                        <option key={inf.id} value={inf.id}>
                                            {inf.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.influencerId && (
                                    <p className="text-red-400 text-xs mt-1.5">{errors.influencerId}</p>
                                )}
                            </div>
                        )}

                        {/* Série (Series mode) */}
                        {mode === 'series' && (
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                    Série <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={formData.series}
                                    onChange={(e) => handleChange('series', e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none"
                                >
                                    <option value="">Selecione uma série...</option>
                                    {SERIES_OPTIONS.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.series && (
                                    <p className="text-red-400 text-xs mt-1.5">{errors.series}</p>
                                )}
                                <p className="text-zinc-500 text-xs mt-1.5">
                                    A meta será criada para todos os influenciadores desta série.
                                </p>
                            </div>
                        )}

                        {/* Plataforma */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                Plataforma <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={formData.platform}
                                onChange={(e) => handleChange('platform', e.target.value)}
                                disabled={isEditing}
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                            >
                                <option value="">Selecione...</option>
                                {PLATFORMS.map((platform) => (
                                    <option key={platform.value} value={platform.value}>
                                        {platform.label}
                                    </option>
                                ))}
                            </select>
                            {errors.platform && (
                                <p className="text-red-400 text-xs mt-1.5">{errors.platform}</p>
                            )}
                        </div>

                        {/* Tipo de Meta */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                Tipo de Meta <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => handleChange('type', e.target.value)}
                                disabled={isEditing}
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                            >
                                {GOAL_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Valor Alvo */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                Crescimento Desejado <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.targetValue}
                                onChange={(e) => handleChange('targetValue', e.target.value)}
                                placeholder="Ex: 200"
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                            />
                            <p className="text-zinc-600 text-[10px] mt-1">
                                {formData.type === 'followers'
                                    ? 'Quantos seguidores a mais o influenciador deve ganhar'
                                    : 'Quantos posts a mais o influenciador deve produzir'}
                            </p>
                            {errors.targetValue && (
                                <p className="text-red-400 text-xs mt-1.5">{errors.targetValue}</p>
                            )}
                        </div>

                        {/* Prazo */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                Prazo Final <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => handleChange('deadline', e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all [color-scheme:dark]"
                            />
                            {errors.deadline && (
                                <p className="text-red-400 text-xs mt-1.5">{errors.deadline}</p>
                            )}
                        </div>

                        {/* Descrição */}
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                Descrição (opcional)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                rows={3}
                                placeholder="Adicione notas ou contexto adicional sobre esta meta..."
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4 border-t border-white/5 mt-8">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition font-semibold border border-white/5"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={clsx(
                                "flex-1 px-6 py-3 rounded-xl transition font-semibold shadow-lg text-white",
                                isEditing
                                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                                    : "bg-violet-600 hover:bg-violet-500 shadow-violet-500/20"
                            )}
                        >
                            {isEditing ? 'Salvar Alterações' : 'Criar Meta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
