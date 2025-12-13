import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  PlayCircle,
  RotateCcw,
  RefreshCcw,
  Activity as ActivityIcon,
  ServerCrash,
  AlertTriangle,
  Loader2,
  Search,
  Clock3,
  Terminal
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const levelStyles = {
  info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  warn: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  error: 'bg-red-500/10 text-red-400 border border-red-500/20',
  debug: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const levelLabels = {
  info: 'Info',
  warn: 'Atenção',
  error: 'Erro',
  debug: 'Debug',
};

const tabs = [
  { key: 'system', label: 'Logs do sistema', icon: ServerCrash },
  { key: 'activity', label: 'Logs de usuários', icon: ActivityIcon },
];

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

const LogItem = ({ log }) => {
  const [open, setOpen] = useState(false);
  const level = log.level?.toLowerCase?.() || 'info';
  const badgeClass = levelStyles[level] || levelStyles.info;

  return (
    <div className="group border-b border-white/5 last:border-0 p-4 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
              {levelLabels[level] || level}
            </span>
            <span className="text-xs text-zinc-500 font-mono">{formatDate(log.createdAt)}</span>
            {log.user && (
              <span className="text-xs text-zinc-400 flex items-center gap-1 bg-zinc-900/50 px-2 py-0.5 rounded border border-white/5">
                {log.user.name} <span className="text-zinc-600">({log.user.email})</span>
              </span>
            )}
          </div>
          <div className="text-sm text-zinc-300 font-medium break-words leading-relaxed">{log.message}</div>
        </div>
        {log.meta && (
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
          >
            {open ? 'Ocultar detalhes' : 'Ver detalhes'}
          </button>
        )}
      </div>
      {open && log.meta && (
        <div className="mt-3 relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-800 rounded-full"></div>
          <pre className="ml-3 text-xs bg-zinc-950/50 text-zinc-400 rounded-lg p-3 overflow-x-auto border border-white/5 font-mono shadow-inner">
            {JSON.stringify(log.meta, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const SysAdmin = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('system');
  const [levelFilter, setLevelFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [logs, setLogs] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [running, setRunning] = useState({ sync: false, retry: false });

  const searchPlaceholder = useMemo(
    () => (activeTab === 'system' ? 'Buscar em mensagens do sistema' : 'Buscar em atividades de usuários'),
    [activeTab]
  );

  useEffect(() => {
    if (user && user.role !== 'system_admin') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const fetchLogs = useCallback(
    async ({ mode = 'replace', cursor } = {}) => {
      if (mode === 'append') {
        setLoadingMore(true);
      } else {
        setLogsLoading(true);
      }
      setActionError('');
      try {
        const params = new URLSearchParams();
        params.set('type', activeTab === 'system' ? 'system' : 'activity');
        if (levelFilter) params.set('level', levelFilter);
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (mode === 'append' && cursor) params.set('cursor', cursor.toString());
        params.set('limit', '50');

        const res = await fetch(`${API_URL}/admin/logs?${params.toString()}`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json?.message || 'Falha ao carregar logs');
        }

        const items = json.data || [];
        setNextCursor(json.nextCursor ?? null);
        if (mode === 'append') {
          setLogs((prev) => [...prev, ...items]);
        } else {
          setLogs(items);
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Erro ao carregar logs');
      } finally {
        setLogsLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, levelFilter, debouncedSearch]
  );

  useEffect(() => {
    setNextCursor(null);
    fetchLogs({ mode: 'replace' });
  }, [activeTab, levelFilter, debouncedSearch, fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      fetchLogs({ mode: 'replace' });
    }, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchLogs]);

  const runAction = async (type) => {
    setActionMessage('');
    setActionError('');
    setRunning((prev) => ({ ...prev, [type]: true }));
    const endpoint = type === 'sync' ? 'sync/run' : 'sync/retry';
    try {
      const res = await fetch(`${API_URL}/admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json?.message || 'Falha ao disparar ação');
      }
      const summary = `${json.success ?? 0} sucesso(s), ${json.failed ?? 0} falha(s)${json.total ? ` de ${json.total}` : ''}`;
      setActionMessage(
        type === 'sync'
          ? `Coleta disparada: ${summary}`
          : `Retry disparado: ${summary}`
      );
      fetchLogs({ mode: 'replace' });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao disparar ação');
    } finally {
      setRunning((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 glass-panel rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="text-primary" /> Sysadmin
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Painel de controle técnico e monitoramento de logs do sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => runAction('retry')}
            disabled={running.retry}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-zinc-800 text-zinc-300 border border-white/5 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {running.retry ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Rodar Retry (Falhas)
          </button>
          <button
            onClick={() => runAction('sync')}
            disabled={running.sync}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
          >
            {running.sync ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Nova Coleta (Manual)
          </button>
        </div>
      </div>

      {(actionMessage || actionError) && (
        <div
          className={`rounded-xl p-4 text-sm font-medium border flex items-center gap-3 ${actionError
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
        >
          {actionError ? <AlertTriangle size={18} /> : <RefreshCcw size={18} />}
          {actionError || actionMessage}
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden shadow-xl min-h-[600px] flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/5 bg-zinc-900/30 flex flex-col lg:flex-row items-center gap-4 justify-between backdrop-blur-sm">
          <div className="bg-zinc-950 p-1 rounded-lg border border-white/5 flex items-center shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${active
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 w-full lg:w-auto items-center gap-3">
            <div className="relative flex-1 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-950/50 border border-white/5 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-zinc-600 transition-all hover:bg-zinc-950/80"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-zinc-950/50 border border-white/5 rounded-lg text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-zinc-950/80"
            >
              <option value="">Nível: Todos</option>
              <option value="info">Info</option>
              <option value="warn">Atenção</option>
              <option value="error">Erro</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          <div className="flex items-center gap-3 border-l border-white/5 pl-4 ml-2">
            <label className="text-xs text-zinc-500 flex items-center gap-2 cursor-pointer hover:text-zinc-300 select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary/50"
              />
              Auto-refresh
            </label>
            <button
              onClick={() => fetchLogs({ mode: 'replace' })}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
              title="Atualizar lista"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto bg-zinc-900/20">
          {logsLoading && (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
              <span className="text-sm font-medium">Carregando logs do sistema...</span>
            </div>
          )}

          {!logsLoading && !actionError && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
              <Terminal size={48} className="mb-4 opacity-20" />
              <p className="text-sm">Nenhum log encontrado para o filtro atual.</p>
            </div>
          )}

          <div className="flex flex-col">
            {!logsLoading && logs.map((log) => <LogItem key={log.id} log={log} />)}
          </div>

          {nextCursor && !logsLoading && (
            <div className="flex justify-center py-6 border-t border-white/5 bg-zinc-900/30">
              <button
                disabled={loadingMore}
                onClick={() => fetchLogs({ mode: 'append', cursor: nextCursor })}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-white/5 transition-all disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Carregar mais registros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SysAdmin;
