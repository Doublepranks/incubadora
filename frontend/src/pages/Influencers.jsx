import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Edit2, FileText, Loader2, Plus, Trash2, X, Users } from "lucide-react";
import { useApp } from "../context/AppContext";
import HistoryModal from "../components/HistoryModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X (Twitter)" },
  { value: "youtube", label: "YouTube" },
  { value: "kwai", label: "Kwai" },
  { value: "tiktok", label: "TikTok" },
];

const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const platformBadgeClasses = {
  instagram: "bg-pink-100 text-pink-800 border border-pink-300 dark:bg-pink-600/20 dark:text-pink-200 dark:border-pink-500/40",
  x: "bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-600/30 dark:text-slate-200 dark:border-slate-500/50",
  youtube: "bg-red-100 text-red-800 border border-red-300 dark:bg-red-600/20 dark:text-red-200 dark:border-red-500/40",
  kwai: "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-400/50",
  tiktok: "bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-100 dark:border-purple-400/50",
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return "0";
  return Number(value).toLocaleString("pt-BR");
};

const emptyForm = {
  name: "",
  state: "",
  city: "",
  avatarUrl: "",
  // notes: "", // Legacy
  profiles: {
    instagram: { handle: "", url: "", externalId: "" },
    x: { handle: "", url: "", externalId: "" },
    youtube: { handle: "", url: "", externalId: "" },
    kwai: { handle: "", url: "", externalId: "" },
    tiktok: { handle: "", url: "", externalId: "" },
  },
};

const Influencers = () => {
  const {
    user,
    selectedState,
    setSelectedState,
    selectedMunicipality,
    setSelectedMunicipality,
    states,
    cities,
  } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [influencers, setInfluencers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formCities, setFormCities] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);

  const [metricModal, setMetricModal] = useState({ open: false, influencer: null, platform: "" });
  const [metricForm, setMetricForm] = useState({
    date: new Date().toISOString().split("T")[0],
    followersCount: "",
    postsCount: "",
  });
  const [metricNotification, setMetricNotification] = useState({
    show: false,
    type: "",
    message: "",
    platform: ""
  });

  const [historyModal, setHistoryModal] = useState({ open: false, influencer: null });

  const allowedStates = useMemo(() => {
    if (["admin_global", "system_admin"].includes(user?.role)) return UF_LIST;
    if (user?.regions?.length) return user.regions;
    return states;
  }, [user, states]);

  const canManage = ["admin_global", "system_admin", "admin_regional", "admin_estadual"].includes(user?.role);

  const loadInfluencers = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedState) params.append("state", selectedState);
      if (selectedMunicipality) params.append("city", selectedMunicipality);
      if (platformFilter) params.append("platform", platformFilter);
      if (periodFilter) params.append("periodDays", periodFilter);

      const res = await fetch(`${API_URL}/influencers?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Erro ao carregar influenciadores");
      }
      const json = await res.json();
      setInfluencers(json.data || []);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar a lista. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      loadInfluencers();
    }
  }, [search, selectedState, selectedMunicipality, platformFilter, periodFilter, canManage]);

  const loadFormCities = async (uf) => {
    if (!uf) {
      setFormCities([]);
      setForm((prev) => ({ ...prev, city: "" }));
      return;
    }
    try {
      setCityLoading(true);
      const res = await fetch(`${API_URL}/geo/cities?state=${encodeURIComponent(uf)}`, { credentials: "include" });
      const json = await res.json();
      setFormCities(json.data || []);
      // Se cidade atual não estiver mais na lista, limpa
      if (form.city && !(json.data || []).includes(form.city)) {
        setForm((prev) => ({ ...prev, city: "" }));
      }
    } catch (err) {
      console.error("Erro ao carregar cidades", err);
      setFormCities([]);
    } finally {
      setCityLoading(false);
    }
  };

  const openCreate = () => {
    const defaultState = allowedStates.length === 1 ? allowedStates[0] : "";
    setForm({ ...emptyForm, state: defaultState });
    setEditingId(null);
    setModalOpen(true);
    setStatus("");
    setError("");
  };

  const fetchDetail = async (id) => {
    const res = await fetch(`${API_URL}/influencers/${id}?periodDays=${periodFilter}`, { credentials: "include" });
    if (!res.ok) {
      throw new Error("Erro ao carregar influenciador");
    }
    const json = await res.json();
    return json.data;
  };

  const openEdit = async (row) => {
    try {
      setSaving(true);
      const detail = await fetchDetail(row.id);
      const nextForm = {
        name: detail.name || "",
        state: detail.state || "",
        city: detail.city || "",
        avatarUrl: detail.avatarUrl || "",
        // notes: detail.notes || "",
        profiles: { ...emptyForm.profiles },
      };
      detail.socialProfiles?.forEach((p) => {
        nextForm.profiles[p.platform] = {
          handle: p.handle || "",
          url: p.url || "",
          externalId: p.externalId || "",
        };
      });
      setForm(nextForm);
      setEditingId(row.id);
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar dados para edição.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    loadFormCities(form.state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, form.state]);

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setStatus("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    setError("");

    try {
      const profiles = PLATFORMS.map((p) => {
        const entry = form.profiles[p.value];
        if (!entry?.handle) return null;
        return {
          platform: p.value,
          handle: entry.handle,
          url: entry.url || null,
          externalId: entry.externalId || null,
        };
      }).filter(Boolean);

      const payload = {
        name: form.name,
        state: form.state,
        city: form.city,
        avatarUrl: form.avatarUrl || null,
        // notes: form.notes || null,
        profiles,
      };

      const url = editingId ? `${API_URL}/influencers/${editingId}` : `${API_URL}/influencers`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao salvar influenciador");
      }

      await loadInfluencers();
      setStatus(editingId ? "Influenciador atualizado." : "Influenciador criado.");
      closeModal();
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao salvar influenciador.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remover este influenciador?")) return;
    try {
      const res = await fetch(`${API_URL}/influencers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        let message = "Erro ao remover influenciador";
        try {
          const data = await res.json();
          if (data?.message) {
            message = data.message;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }
      await loadInfluencers();
      setStatus("Influenciador removido.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao remover influenciador.");
    }
  };

  const openHistory = (row) => {
    setHistoryModal({ open: true, influencer: row });
  };

  const openMetric = (row) => {
    const firstPlatform = row.platforms?.[0] || PLATFORMS[0].value;
    setMetricModal({ open: true, influencer: row, platform: firstPlatform });
    setMetricForm({
      date: new Date().toISOString().split("T")[0],
      followersCount: "",
      postsCount: "",
    });
  };

  const submitMetric = async (e) => {
    e.preventDefault();
    if (!metricModal.influencer || !metricModal.platform) return;
    setSaving(true);
    setMetricNotification({ show: false, type: "", message: "", platform: "" });
    try {
      const payload = {
        influencerId: metricModal.influencer.id,
        platform: metricModal.platform,
        date: metricForm.date,
        followersCount: Number(metricForm.followersCount),
        postsCount: Number(metricForm.postsCount),
      };
      const res = await fetch(`${API_URL}/metrics/manual`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao registrar métrica");
      }

      // Show success notification
      const platformLabel = PLATFORMS.find(p => p.value === metricModal.platform)?.label || metricModal.platform;
      setMetricNotification({
        show: true,
        type: "success",
        message: "Métrica salva com sucesso!",
        platform: platformLabel
      });

      // Reset form but keep influencer and modal open
      setMetricForm({
        date: new Date().toISOString().split("T")[0],
        followersCount: "",
        postsCount: "",
      });

      // Auto-hide notification after 3 seconds
      setTimeout(() => {
        setMetricNotification({ show: false, type: "", message: "", platform: "" });
      }, 3000);

      await loadInfluencers();
    } catch (err) {
      console.error(err);
      const platformLabel = PLATFORMS.find(p => p.value === metricModal.platform)?.label || metricModal.platform;
      setMetricNotification({
        show: true,
        type: "error",
        message: err.message || "Erro ao registrar métrica.",
        platform: platformLabel
      });

      // Auto-hide error notification after 3 seconds
      setTimeout(() => {
        setMetricNotification({ show: false, type: "", message: "", platform: "" });
      }, 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="text-red-500">Acesso restrito a administradores.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Influenciadores</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Listagem, filtros e ações rápidas.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus size={16} className="mr-2" />
          Novo influenciador
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou cidade"
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 min-w-[200px]"
          />
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedMunicipality("");
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 min-w-[160px]"
          >
            <option value="">Todos os estados</option>
            {states.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          <select
            value={selectedMunicipality}
            onChange={(e) => setSelectedMunicipality(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 min-w-[200px]"
          >
            <option value="">Todos os municípios</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 min-w-[160px]"
          >
            <option value="">Todas as plataformas</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 min-w-[180px]"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="all">Todo o período</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Carregando...
        </div>
      ) : error ? (
        <div className="p-4 rounded-md bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      ) : (
        <div className="bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-lg">
          {status && (
            <div className="px-4 py-3 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-b border-green-200 dark:border-green-800">
              {status}
            </div>
          )}
          <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400">
            <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-900/80 text-gray-600 dark:text-gray-500">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">UF</th>
                <th className="px-6 py-3">Município</th>
                <th className="px-6 py-3">Plataformas</th>
                <th className="px-6 py-3">Seguidores</th>
                <th className="px-6 py-3">Posts</th>
                <th className="px-6 py-3">Crescimento</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {influencers.map((inf) => (
                <tr key={inf.id} className="border-b border-gray-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  <td className="px-6 py-4 text-gray-800 dark:text-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center text-gray-400">
                        {inf.avatarUrl ? (
                          <img src={inf.avatarUrl} alt={inf.name} className="h-full w-full object-cover" />
                        ) : (
                          <Users size={18} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">{inf.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{inf.city || "-"} - {inf.state}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{inf.state}</td>
                  <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{inf.city || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {inf.platforms?.map((p) => (
                        <span
                          key={p}
                          className={`px-2 py-1 text-xs rounded-full font-semibold ${platformBadgeClasses[p] || "bg-gray-700 text-gray-200 border border-gray-600"}`}
                        >
                          {p === "x" ? "X" : p.charAt(0).toUpperCase() + p.slice(1)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-800 dark:text-gray-100 font-semibold">{formatNumber(inf.totalFollowers)}</td>
                  <td className="px-6 py-4 text-gray-800 dark:text-gray-100">{formatNumber(inf.totalPosts)}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${inf.growthPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {inf.growthPercent ? `${inf.growthPercent.toFixed(1)}%` : "0%"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      <button
                        onClick={() => openEdit(inf)}
                        className="px-3 py-1 text-xs rounded-md border border-blue-500/60 text-blue-700 dark:text-blue-100 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                        title="Editar"
                      >
                        <div className="flex items-center gap-1"><Edit2 size={14} /> Editar</div>
                      </button>
                      <button
                        onClick={() => openHistory(inf)}
                        className="px-3 py-1 text-xs rounded-md border border-gray-500/60 text-gray-700 dark:text-gray-100 bg-gray-50 dark:bg-gray-500/10 hover:bg-gray-100 dark:hover:bg-gray-500/20"
                        title="Histórico de Notas"
                      >
                        <div className="flex items-center gap-1"><FileText size={14} /> Notas</div>
                      </button>
                      <button
                        onClick={() => openMetric(inf)}
                        className="px-3 py-1 text-xs rounded-md border border-amber-500/70 text-amber-700 dark:text-amber-100 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                        title="Adicionar métrica manual"
                      >
                        <div className="flex items-center gap-1"><Activity size={14} /> Métrica</div>
                      </button>
                      <button
                        onClick={() => navigate(`/influencer/${inf.id}`)}
                        className="px-3 py-1 text-xs rounded-md border border-indigo-500/70 text-indigo-700 dark:text-indigo-100 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                      >
                        Detalhe
                      </button>
                      <button
                        onClick={() => handleDelete(inf.id)}
                        className="px-3 py-1 text-xs rounded-md border border-red-500/70 text-red-700 dark:text-red-100 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20"
                        title="Remover"
                      >
                        <div className="flex items-center gap-1"><Trash2 size={14} /> Remover</div>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {influencers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-6 text-center text-gray-500">
                    Nenhum influenciador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {editingId ? "Editar influenciador" : "Novo influenciador"}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Nome</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Estado (UF)</label>
                  <select
                    required
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <option value="">Selecione</option>
                    {allowedStates.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Município</label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    disabled={!form.state || cityLoading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
                  >
                    <option value="">{form.state ? "Selecione um município" : "Selecione a UF primeiro"}</option>
                    {formCities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  {cityLoading && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Loader2 size={14} className="animate-spin" /> Carregando municípios...
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Avatar URL</label>
                  <input
                    value={form.avatarUrl}
                    onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                  />
                </div>
              </div>

              {/* Notes field removed in favor of History System */}

              <div className="border border-gray-200 dark:border-gray-800 rounded-lg">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Perfis por plataforma
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
                  {PLATFORMS.map((p) => (
                    <div key={p.value} className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                      <div className="font-semibold text-gray-800 dark:text-white">{p.label}</div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Handle</label>
                        <input
                          value={form.profiles[p.value]?.handle || ""}
                          onChange={(e) => setForm({
                            ...form,
                            profiles: {
                              ...form.profiles,
                              [p.value]: { ...form.profiles[p.value], handle: e.target.value },
                            },
                          })}
                          placeholder="usuario"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">URL</label>
                        <input
                          value={form.profiles[p.value]?.url || ""}
                          onChange={(e) => setForm({
                            ...form,
                            profiles: {
                              ...form.profiles,
                              [p.value]: { ...form.profiles[p.value], url: e.target.value },
                            },
                          })}
                          placeholder="https://"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">ID externo (opcional)</label>
                        <input
                          value={form.profiles[p.value]?.externalId || ""}
                          onChange={(e) => setForm({
                            ...form,
                            profiles: {
                              ...form.profiles,
                              [p.value]: { ...form.profiles[p.value], externalId: e.target.value },
                            },
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <HistoryModal
        open={historyModal.open}
        onClose={() => setHistoryModal({ open: false, influencer: null })}
        influencer={historyModal.influencer}
      />

      {metricModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Métrica manual</h3>
              <button onClick={() => setMetricModal({ open: false, influencer: null, platform: "" })} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitMetric} className="p-4 space-y-4">
              {metricNotification.show && (
                <div className={`px-4 py-3 rounded-lg border ${metricNotification.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
                    : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{metricNotification.platform}:</span>
                    <span>{metricNotification.message}</span>
                  </div>
                </div>
              )}
              <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                {metricModal.influencer?.name}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Plataforma</label>
                <select
                  value={metricModal.platform}
                  onChange={(e) => setMetricModal({ ...metricModal, platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                >
                  {(metricModal.influencer?.platforms?.length
                    ? metricModal.influencer.platforms
                    : PLATFORMS.map((p) => p.value)
                  ).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Data</label>
                <input
                  type="date"
                  required
                  value={metricForm.date}
                  onChange={(e) => setMetricForm({ ...metricForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Seguidores</label>
                  <input
                    type="number"
                    required
                    value={metricForm.followersCount}
                    onChange={(e) => setMetricForm({ ...metricForm, followersCount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Posts</label>
                  <input
                    type="number"
                    required
                    value={metricForm.postsCount}
                    onChange={(e) => setMetricForm({ ...metricForm, postsCount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Dica: use a data da coleta manual para manter a série temporal correta.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMetricModal({ open: false, influencer: null, platform: "" })}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !metricModal.platform}
                  className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default Influencers;
