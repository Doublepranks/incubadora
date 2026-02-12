import { Target, Calendar, TrendingUp, CheckCircle2, XCircle, Clock, Ban, Instagram, Youtube, Video, Twitter } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_CONFIG = {
    active: {
        label: 'Ativa',
        icon: TrendingUp,
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/20',
    },
    achieved: {
        label: 'Alcançada',
        icon: CheckCircle2,
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/20',
    },
    failed: {
        label: 'Expirada',
        icon: XCircle,
        bgColor: 'bg-red-500/10',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/20',
    },
    cancelled: {
        label: 'Cancelada',
        icon: Ban,
        bgColor: 'bg-zinc-500/10',
        textColor: 'text-zinc-400',
        borderColor: 'border-zinc-500/20',
    },
};

const PLATFORM_ICONS = {
    instagram: Instagram,
    tiktok: Video,
    youtube: Youtube,
    x: Twitter,
    kwai: Video,
};

const PLATFORM_COLORS = {
    instagram: 'text-[#E1306C]',
    youtube: 'text-[#FF0000]',
    kwai: 'text-[#FF8F00]',
    x: 'text-white',
    tiktok: 'text-[#00F2EA]',
};

const PLATFORM_LABELS = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    x: 'X',
    kwai: 'Kwai',
};

/**
 * GoalCard - Exibe uma meta de influenciador com progresso visual
 */
export default function GoalCard({ goal, onEdit, onCancel, onDelete, compact = false }) {
    const statusConfig = STATUS_CONFIG[goal.status] || STATUS_CONFIG.active;
    const StatusIcon = statusConfig.icon;
    const PlatformIcon = PLATFORM_ICONS[goal.platform] || Target;
    const platformColor = PLATFORM_COLORS[goal.platform] || 'text-zinc-400';

    const initial = goal.initialValue || 0;
    const current = goal.currentValue || 0;
    const target = goal.targetValue || 0;
    const delta = current - initial;
    const deltaTarget = target - initial;

    const progress = deltaTarget > 0
        ? Math.min(100, (delta / deltaTarget) * 100)
        : 0;

    const daysRemaining = Math.ceil(
        (new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)
    );

    const isUrgent = daysRemaining >= 0 && daysRemaining <= 7 && goal.status === 'active';
    const isExpiringSoon = daysRemaining > 7 && daysRemaining <= 30 && goal.status === 'active';

    // Compact version for InfluencerDetail sidebar/grid
    if (compact) {
        return (
            <div className="glass-card rounded-xl p-4 group">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={clsx("p-1.5 rounded-lg bg-white/5 border border-white/5", platformColor)}>
                            <PlatformIcon size={14} />
                        </div>
                        <span className="text-sm font-medium text-zinc-200">
                            {goal.type === 'followers' ? 'Seguidores' : 'Posts'}
                        </span>
                    </div>
                    <div className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                        statusConfig.bgColor,
                        statusConfig.textColor,
                        statusConfig.borderColor
                    )}>
                        {statusConfig.label}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                    <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-medium">
                        <span>+{delta.toLocaleString()} <span className="text-zinc-600">/</span> +{deltaTarget.toLocaleString()}</span>
                        <span className={goal.status === 'achieved' ? 'text-emerald-400' : 'text-zinc-300'}>
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={clsx(
                                'h-full transition-all duration-500 ease-out',
                                goal.status === 'achieved' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                    goal.status === 'failed' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                                        goal.status === 'cancelled' ? 'bg-zinc-600' :
                                            'bg-gradient-to-r from-blue-600 to-violet-600'
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Deadline */}
                {goal.status === 'active' && (
                    <div className={clsx(
                        'flex items-center gap-1.5 text-xs font-medium',
                        isUrgent ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-zinc-500'
                    )}>
                        <Clock size={12} />
                        <span>
                            {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Vence hoje'}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // Full version for /metas page
    return (
        <div className="glass-card p-6 rounded-2xl group hover:border-white/10 transition-all duration-300">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex gap-4">
                    <div className={clsx("p-3 rounded-xl bg-white/5 border border-white/5 h-fit", platformColor)}>
                        <PlatformIcon size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight leading-short mb-1">
                            {goal.influencer?.name || 'Comparação'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <span className="capitalize">{goal.type === 'followers' ? 'Seguidores' : 'Produção'}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span>{PLATFORM_LABELS[goal.platform]}</span>
                        </div>
                    </div>
                </div>

                <div className={clsx(
                    'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border',
                    statusConfig.bgColor,
                    statusConfig.textColor,
                    statusConfig.borderColor
                )}>
                    <StatusIcon size={14} />
                    {statusConfig.label}
                </div>
            </div>

            {/* Description */}
            {goal.description && (
                <div className="mb-6 p-3 rounded-lg bg-zinc-900/40 border border-white/5 text-sm text-zinc-400 italic">
                    "{goal.description}"
                </div>
            )}

            {/* Progress */}
            <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-medium text-zinc-400">Progresso Atual</span>
                    <div className="text-right">
                        <span className="text-xl font-bold text-white">+{delta.toLocaleString()}</span>
                        <span className="text-sm text-zinc-500 font-medium mx-1.5">/</span>
                        <span className="text-sm text-zinc-400 font-medium">+{deltaTarget.toLocaleString()}</span>
                    </div>
                </div>

                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden mb-2 ring-1 ring-white/5">
                    <div
                        className={clsx(
                            'h-full transition-all duration-700 ease-out relative overflow-hidden',
                            goal.status === 'achieved' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                goal.status === 'failed' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                                    goal.status === 'cancelled' ? 'bg-zinc-600' :
                                        'bg-gradient-to-r from-blue-600 to-violet-600'
                        )}
                        style={{ width: `${progress}%` }}
                    >
                        {/* Shimmer effect */}
                        {goal.status === 'active' && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                        )}
                    </div>
                </div>

                <div className="text-right text-xs font-bold tracking-wide text-zinc-500">
                    {Math.round(progress)}% COMPLETO
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className={clsx(
                    'flex items-center gap-2 text-sm font-medium',
                    goal.status === 'active' && isUrgent ? 'text-red-400' :
                        goal.status === 'active' && isExpiringSoon ? 'text-amber-400' :
                            'text-zinc-500'
                )}>
                    <Calendar size={16} />
                    <span>
                        {goal.status === 'achieved'
                            ? `Alcançada em ${new Date(goal.achievedAt).toLocaleDateString()}`
                            : goal.status === 'active' && daysRemaining >= 0
                                ? `${daysRemaining} dias restantes`
                                : goal.status === 'active'
                                    ? 'Expirada'
                                    : `Prazo: ${new Date(goal.deadline).toLocaleDateString()}`
                        }
                    </span>
                </div>

                {goal.status === 'active' && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(goal)}
                            className="px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition border border-white/5 hover:border-white/10"
                        >
                            Editar
                        </button>
                        <button
                            onClick={() => onCancel(goal.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition border border-red-500/20"
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                {goal.status === 'cancelled' && onDelete && (
                    <button
                        onClick={() => onDelete(goal.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition border border-red-500/20"
                    >
                        Excluir
                    </button>
                )}
            </div>
        </div>
    );
}
