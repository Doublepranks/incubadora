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
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const levelStyles = {
  info: 'bg-blue-50 text-blue-700 border border-blue-100',
  warn: 'bg-amber-50 text-amber-700 border border-amber-100',
  error: 'bg-red-50 text-red-700 border border-red-100',
  debug: 'bg-gray-100 text-gray-700 border border-gray-200',
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
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-1 rounded ${badgeClass}`}>
              {levelLabels[level] || level}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(log.createdAt)}</span>
            {log.user && (
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {log.user.name} ({log.user.email})
              </span>
            )}
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{log.message}</div>
        </div>
        {log.meta && (
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-300"
          >
            {open ? 'Ocultar meta' : 'Ver meta'}
          </button>
        )}
      </div>
      {open && log.meta && (
        <pre className="mt-3 text-xs bg-gray-900 text-gray-100 rounded-md p-3 overflow-x-auto max-h-64">
{JSON.stringify(log.meta, null, 2)}
        </pre>
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
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Administração</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sysadmin</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Dispare coleta manual, retry e acompanhe logs em tempo real.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => runAction('retry')}
            disabled={running.retry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running.retry ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Rodar retry agora
          </button>
          <button
            onClick={() => runAction('sync')}
            disabled={running.sync}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running.sync ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Rodar coleta de dados agora
          </button>
        </div>
      </div>

      {(actionMessage || actionError) && (
        <div
          className={`rounded-md p-3 text-sm ${
            actionError
              ? 'bg-red-50 text-red-800 border border-red-100'
              : 'bg-green-50 text-green-800 border border-green-100'
          }`}
        >
          {actionError || actionMessage}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md border ${
                    active
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-gray-500 flex items-center gap-2">
              <Clock3 className="w-4 h-4" />
              Auto-refresh
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="ml-2"
              />
            </label>
            <button
              onClick={() => fetchLogs({ mode: 'replace' })}
              className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <RefreshCcw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Nível: todos</option>
            <option value="info">Info</option>
            <option value="warn">Atenção</option>
            <option value="error">Erro</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className="p-4 space-y-3 min-h-[320px]">
          {logsLoading && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando logs...
            </div>
          )}

          {!logsLoading && actionError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
              <AlertTriangle className="w-4 h-4" />
              {actionError}
            </div>
          )}

          {!logsLoading && !actionError && logs.length === 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-300 text-center py-8">
              Nenhum log encontrado para o filtro atual.
            </div>
          )}

          {!logsLoading && logs.map((log) => <LogItem key={log.id} log={log} />)}

          {nextCursor && !logsLoading && (
            <div className="flex justify-center pt-2">
              <button
                disabled={loadingMore}
                onClick={() => fetchLogs({ mode: 'append', cursor: nextCursor })}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-50 disabled:opacity-60"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Carregar mais
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SysAdmin;
