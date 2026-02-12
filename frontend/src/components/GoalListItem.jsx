import { Target, Calendar, TrendingUp, CheckCircle2, XCircle, Clock, Ban, Instagram, Youtube, Video, Twitter } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_CONFIG = {
    active: { label: 'Ativa', icon: TrendingUp, bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', borderColor: 'border-blue-500/20' },
    achieved: { label: 'Alcançada', icon: CheckCircle2, bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
    failed: { label: 'Expirada', icon: XCircle, bgColor: 'bg-red-500/10', textColor: 'text-red-400', borderColor: 'border-red-500/20' },
    cancelled: { label: 'Cancelada', icon: Ban, bgColor: 'bg-zinc-500/10', textColor: 'text-zinc-400', borderColor: 'border-zinc-500/20' },
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
 * GoalListItem — Linha compacta de meta para vista em lista
 */
export default function GoalListItem({ goal, selected, onToggleSelect }) {
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

    return (
        <tr
            className={clsx(
                'border-b border-white/5 transition-colors cursor-pointer',
                selected
                    ? 'bg-violet-500/10 hover:bg-violet-500/15'
                    : 'hover:bg-white/[0.03]'
            )}
            onClick={() => onToggleSelect(goal.id)}
        >
            {/* Checkbox */}
            <td className="px-4 py-3 w-12">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(goal.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-white/20 bg-zinc-900 text-violet-500 focus:ring-violet-500/30 focus:ring-offset-0 cursor-pointer"
                />
            </td>

            {/* Influenciador */}
            <td className="px-4 py-3">
                <span className="text-sm font-medium text-white truncate block max-w-[180px]">
                    {goal.influencer?.name || '—'}
                </span>
            </td>

            {/* Plataforma */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <PlatformIcon size={14} className={platformColor} />
                    <span className="text-xs text-zinc-400">{PLATFORM_LABELS[goal.platform] || '—'}</span>
                </div>
            </td>

            {/* Tipo */}
            <td className="px-4 py-3">
                <span className="text-xs text-zinc-400">
                    {goal.type === 'followers' ? 'Seguidores' : 'Produção'}
                </span>
            </td>

            {/* Progresso */}
            <td className="px-4 py-3 min-w-[180px]">
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={clsx(
                                'h-full transition-all duration-500',
                                goal.status === 'achieved' ? 'bg-emerald-500' :
                                    goal.status === 'failed' ? 'bg-red-500' :
                                        goal.status === 'cancelled' ? 'bg-zinc-600' :
                                            'bg-gradient-to-r from-blue-600 to-violet-600'
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs text-zinc-400 font-mono w-12 text-right">
                        {Math.round(progress)}%
                    </span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                    <span>+{delta.toLocaleString()}</span>
                    <span>+{deltaTarget.toLocaleString()}</span>
                </div>
            </td>

            {/* Prazo */}
            <td className="px-4 py-3">
                <div className={clsx(
                    'flex items-center gap-1.5 text-xs font-medium',
                    goal.status === 'active' && daysRemaining >= 0 && daysRemaining <= 7 ? 'text-red-400' :
                        goal.status === 'active' && daysRemaining <= 30 ? 'text-amber-400' :
                            'text-zinc-500'
                )}>
                    <Calendar size={12} />
                    <span>{new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>
                </div>
            </td>

            {/* Status */}
            <td className="px-4 py-3">
                <div className={clsx(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                    statusConfig.bgColor,
                    statusConfig.textColor,
                    statusConfig.borderColor
                )}>
                    <StatusIcon size={10} />
                    {statusConfig.label}
                </div>
            </td>
        </tr>
    );
}
