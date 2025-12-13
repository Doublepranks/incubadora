import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Edit2, FileText, Loader2, Plus, Trash2, X, Users, CheckCircle2, AlertCircle, Search, Filter, Eye } from "lucide-react";
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
  instagram: "bg-[#E1306C]/20 text-[#E1306C] border-[#E1306C]/30",
  x: "bg-white/10 text-white border-white/20",
  youtube: "bg-[#FF0000]/20 text-[#FF0000] border-[#FF0000]/30",
  kwai: "bg-[#FF8F00]/20 text-[#FF8F00] border-[#FF8F00]/30",
  tiktok: "bg-[#00F2EA]/20 text-[#00F2EA] border-[#00F2EA]/30",
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
    if (!res.ok) throw new Error("Erro ao carregar influenciador");
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
      const res = await fetch(`${API_URL}/influencers/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        let message = "Erro ao remover influenciador";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch { } // ignore
        throw new Error(message);
      }
      await loadInfluencers();
      setStatus("Influenciador removido.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao remover influenciador.");
    }
  };

  const openHistory = (row) => setHistoryModal({ open: true, influencer: row });
  const openMetric = (row) => {
    const firstPlatform = row.platforms?.[0] || PLATFORMS[0].value;
    setMetricModal({ open: true, influencer: row, platform: firstPlatform });
    setMetricForm({ date: new Date().toISOString().split("T")[0], followersCount: "", postsCount: "" });
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

      const platformLabel = PLATFORMS.find(p => p.value === metricModal.platform)?.label || metricModal.platform;
      setMetricNotification({ show: true, type: "success", message: "Métrica salva com sucesso!", platform: platformLabel });
      setMetricForm({ date: new Date().toISOString().split("T")[0], followersCount: "", postsCount: "" });

      setTimeout(() => setMetricNotification({ show: false, type: "", message: "", platform: "" }), 3000);
      await loadInfluencers();
    } catch (err) {
      console.error(err);
      const platformLabel = PLATFORMS.find(p => p.value === metricModal.platform)?.label || metricModal.platform;
      setMetricNotification({ show: true, type: "error", message: err.message || "Erro ao registrar métrica.", platform: platformLabel });
      setTimeout(() => setMetricNotification({ show: false, type: "", message: "", platform: "" }), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return <div className="p-6 text-red-400">Acesso restrito a administradores.</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-panel rounded-2xl">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Influenciadores</h2>
          <p className="text-sm text-zinc-400">Listagem, filtros e ações rápidas.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
        >
          <Plus size={18} className="mr-2" />
          Novo influenciador
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-3 items-center">
        <div className="relative group min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou cidade"
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-900/50 border border-white/5 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-zinc-600 transition-all"
          />
        </div>

        <select
          value={selectedState}
          onChange={(e) => { setSelectedState(e.target.value); setSelectedMunicipality(""); }}
          className="px-3 py-2 text-sm bg-zinc-900/50 border border-white/5 rounded-lg text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-zinc-800/50"
        >
          <option value="">Todos os estados</option>
          {states.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>

        <select
          value={selectedMunicipality}
          onChange={(e) => setSelectedMunicipality(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-900/50 border border-white/5 rounded-lg text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-zinc-800/50 min-w-[150px]"
        >
          <option value="">Todos os municípios</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-900/50 border border-white/5 rounded-lg text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-zinc-800/50"
        >
          <option value="">Todas as plataformas</option>
          {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-900/50 border border-white/5 rounded-lg text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-zinc-800/50"
        >
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="all">Todo o período</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <Loader2 className="animate-spin mr-3" size={24} /> Carregando influenciadores...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-900/20 text-red-400 border border-red-900/50 text-center">{error}</div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
          {status && (
            <div className="px-6 py-3 bg-emerald-900/20 text-emerald-400 border-b border-emerald-900/30 flex items-center gap-2">
              <CheckCircle2 size={16} /> {status}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-zinc-900/80 text-zinc-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">UF</th>
                  <th className="px-6 py-4">Município</th>
                  <th className="px-6 py-4">Plataformas</th>
                  <th className="px-6 py-4">Seguidores</th>
                  <th className="px-6 py-4">Posts</th>
                  <th className="px-6 py-4">Crescimento</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {influencers.map((inf) => (
                  <tr key={inf.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-400 ring-2 ring-white/5">
                          {inf.avatarUrl ? (
                            <img src={inf.avatarUrl} alt={inf.name} className="h-full w-full object-cover" />
                          ) : (
                            <Users size={18} />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{inf.name}</div>
                          <div className="text-xs text-zinc-500">{inf.city || "-"} - {inf.state}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{inf.state}</td>
                    <td className="px-6 py-4 text-zinc-400">{inf.city || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {inf.platforms?.map((p) => (
                          <span
                            key={p}
                            className={`px-2 py-0.5 text-[10px] rounded-full font-semibold border ${platformBadgeClasses[p] || "bg-zinc-800 text-zinc-300 border-zinc-700"}`}
                          >
                            {p === "x" ? "X" : p.charAt(0).toUpperCase() + p.slice(1)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-mono text-xs">{formatNumber(inf.totalFollowers)}</td>
                    <td className="px-6 py-4 text-zinc-300 font-mono text-xs">{formatNumber(inf.totalPosts)}</td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${inf.growthPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {inf.growthPercent ? `${inf.growthPercent.toFixed(1)}%` : "0%"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(inf)} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors" title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => openHistory(inf)} className="p-1.5 rounded-lg hover:bg-zinc-500/20 text-zinc-400 hover:text-zinc-300 transition-colors" title="Notas">
                          <FileText size={16} />
                        </button>
                        <button onClick={() => openMetric(inf)} className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors" title="Métrica">
                          <Activity size={16} />
                        </button>
                        <button onClick={() => handleDelete(inf.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors" title="Remover">
                          <Trash2 size={16} />
                        </button>
                        <button onClick={() => navigate(`/influencer/${inf.id}`)} className="p-1.5 rounded-lg hover:bg-violet-500/20 text-violet-400 hover:text-violet-300 transition-colors" title="Detalhes">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {influencers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p>Nenhum influenciador encontrado com os filtros atuais.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 rounded-2xl shadow-2xl w-full max-w-4xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white">
                {editingId ? "Editar influenciador" : "Novo influenciador"}
              </h3>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Nome</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Avatar URL</label>
                  <input
                    value={form.avatarUrl}
                    onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Estado (UF)</label>
                  <select
                    required
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  >
                    <option value="">Selecione</option>
                    {allowedStates.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Município</label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    disabled={!form.state || cityLoading}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all disabled:opacity-50"
                  >
                    <option value="">{form.state ? "Selecione um município" : "Selecione a UF primeiro"}</option>
                    {formCities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/20">
                <div className="px-4 py-3 border-b border-white/10 bg-zinc-900/50 text-sm font-bold text-zinc-300">
                  Perfis Sociais
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {PLATFORMS.map((p) => (
                    <div key={p.value} className="space-y-3 p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="font-semibold text-white/90 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${platformBadgeClasses[p.value].split(' ')[0].replace('/20', '')}`} />
                        {p.label}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase">Handle</label>
                        <input
                          value={form.profiles[p.value]?.handle || ""}
                          onChange={(e) => setForm({ ...form, profiles: { ...form.profiles, [p.value]: { ...form.profiles[p.value], handle: e.target.value } } })}
                          placeholder="@usuario"
                          className="w-full px-3 py-2 bg-zinc-950 border border-white/5 rounded-lg text-sm text-zinc-300 focus:border-primary/50 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase">URL Perfil</label>
                        <input
                          value={form.profiles[p.value]?.url || ""}
                          onChange={(e) => setForm({ ...form, profiles: { ...form.profiles, [p.value]: { ...form.profiles[p.value], url: e.target.value } } })}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-zinc-950 border border-white/5 rounded-lg text-sm text-zinc-300 focus:border-primary/50 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase">ID Externo</label>
                        <input
                          value={form.profiles[p.value]?.externalId || ""}
                          onChange={(e) => setForm({ ...form, profiles: { ...form.profiles, [p.value]: { ...form.profiles[p.value], externalId: e.target.value } } })}
                          placeholder="Opcional"
                          className="w-full px-3 py-2 bg-zinc-950 border border-white/5 rounded-lg text-sm text-zinc-300 focus:border-primary/50 outline-none transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm text-center font-medium">
                  {error}
                </div>
              )}

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {saving ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                  Salvar Influenciador
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

      {/* Metric Modal */}
      {metricModal.open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 rounded-2xl shadow-2xl w-full max-w-md border border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Nova Métrica</h3>
              <button onClick={() => setMetricModal({ open: false, influencer: null, platform: "" })} className="text-zinc-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitMetric} className="p-6 space-y-5">
              {metricNotification.show && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${metricNotification.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {metricNotification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{metricNotification.message}</span>
                </div>
              )}

              <div className="text-center pb-2">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Influenciador</div>
                <div className="text-lg font-semibold text-white">{metricModal.influencer?.name}</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Plataforma</label>
                <select
                  value={metricModal.platform}
                  onChange={(e) => setMetricModal({ ...metricModal, platform: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all"
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
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Data da Coleta</label>
                <input
                  type="date"
                  required
                  value={metricForm.date}
                  onChange={(e) => setMetricForm({ ...metricForm, date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Seguidores</label>
                  <input
                    type="number"
                    required
                    value={metricForm.followersCount}
                    onChange={(e) => setMetricForm({ ...metricForm, followersCount: e.target.value })}
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Posts</label>
                  <input
                    type="number"
                    required
                    value={metricForm.postsCount}
                    onChange={(e) => setMetricForm({ ...metricForm, postsCount: e.target.value })}
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Registrar Métrica
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
