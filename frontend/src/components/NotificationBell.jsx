import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, ExternalLink, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `há ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `há ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'ontem';
    if (diffD < 7) return `há ${diffD} dias`;
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

const NotificationBell = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const popoverRef = useRef(null);
    const bellRef = useRef(null);

    const fetchUnread = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/notifications/unread`, { credentials: 'include' });
            if (res.ok) {
                const json = await res.json();
                setUnreadCount(json.data?.count ?? 0);
            }
        } catch (err) {
            // Silently fail — notifications are non-critical
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/notifications`, { credentials: 'include' });
            if (res.ok) {
                const json = await res.json();
                setNotifications(json.data ?? []);
            }
        } catch (err) {
            console.warn('Failed to fetch notifications', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const markRead = useCallback(async () => {
        try {
            await fetch(`${API_URL}/notifications/read`, {
                method: 'POST',
                credentials: 'include',
            });
            setUnreadCount(0);
        } catch (err) {
            // Non-critical
        }
    }, []);

    // Poll unread count every 60s
    useEffect(() => {
        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);
        return () => clearInterval(interval);
    }, [fetchUnread]);

    // Close popover on outside click
    useEffect(() => {
        const handler = (e) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target) &&
                bellRef.current &&
                !bellRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleToggle = () => {
        if (!open) {
            fetchNotifications();
            if (unreadCount > 0) markRead();
        }
        setOpen((prev) => !prev);
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                ref={bellRef}
                onClick={handleToggle}
                className="relative p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all group"
                title="Notificações"
            >
                <Bell size={18} className="transition-transform group-hover:scale-110" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1 shadow-lg shadow-red-500/30 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Popover */}
            {open && (
                <div
                    ref={popoverRef}
                    className="absolute left-0 top-full mt-2 w-80 max-h-[420px] rounded-2xl border border-white/10 shadow-2xl shadow-black/50 z-[100] overflow-hidden flex flex-col animate-fade-in bg-zinc-950/95 backdrop-blur-3xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-zinc-900/50">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Bell size={14} className="text-primary" />
                            Notificações
                        </h3>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
                                Carregando...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                                <Bell size={32} className="mb-3 opacity-20" />
                                <p className="text-sm">Nenhuma notificação</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => {
                                            setSelectedNotification(n);
                                            setOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className="text-sm font-semibold text-white leading-tight">
                                                {n.title}
                                            </h4>
                                        </div>
                                        <div
                                            className="text-xs text-zinc-400 leading-relaxed line-clamp-3 notification-body"
                                            dangerouslySetInnerHTML={{ __html: n.body }}
                                        />
                                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-600">
                                            <Clock size={10} />
                                            {timeAgo(n.createdAt)}
                                            {n.creator && (
                                                <span className="ml-1">· {n.creator.name}</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Full Text Modal */}
            {selectedNotification && createPortal(
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-zinc-950 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/10 max-h-[90vh] flex flex-col relative overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-zinc-900/50">
                            <h3 className="text-xl font-bold text-white pr-4">
                                {selectedNotification.title}
                            </h3>
                            <button onClick={() => setSelectedNotification(null)} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 shrink-0">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-[150px]">
                            <div 
                                className="text-base text-zinc-300 leading-relaxed notification-body"
                                dangerouslySetInnerHTML={{ __html: selectedNotification.body }}
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-white/10 flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/30">
                            <Clock size={12} />
                            {timeAgo(selectedNotification.createdAt)}
                            {selectedNotification.creator && <span>· Publicado por {selectedNotification.creator.name}</span>}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default NotificationBell;
