import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Edit2, X, Users as UsersIcon, Shield, Search, MapPin } from "lucide-react";
import { useApp } from "../context/AppContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "admin_regional",
  regions: [],
};

const roleBadges = {
  admin_global: { label: "Admin Global", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  system_admin: { label: "System Admin", bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
  admin_regional: { label: "Admin Regional", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  admin_estadual: { label: "Admin Estadual", bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
};

const Users = () => {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        search.length === 0 ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.name.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter ? u.role === roleFilter : true;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`${API_URL}/users`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar usuários");
      const json = await res.json();
      setUsers(json.data || []);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role || "admin_regional",
      regions: u.regions || [],
    });
    setEditingId(u.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setStatus("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const url = editingId ? `${API_URL}/users/${editingId}` : `${API_URL}/users`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Erro ao salvar usuário");
      }
      await loadUsers();
      setStatus(editingId ? "Usuário atualizado com sucesso." : "Usuário criado com sucesso.");
      closeModal();
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar usuário.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const target = users.find((u) => u.id === id);
    if (target?.role === "system_admin" && user?.role !== "system_admin") {
      alert("Apenas system_admin pode remover outro system_admin.");
      return;
    }
    if (!window.confirm("Remover este usuário?")) return;
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      await loadUsers();
      setStatus("Usuário removido.");
    } catch (err) {
      console.error(err);
      alert("Erro ao remover usuário.");
    }
  };

  if (!["admin_global", "system_admin"].includes(user?.role)) {
    return (
      <div className="flex items-center justify-center p-20 text-red-400 bg-red-900/10 rounded-xl border border-red-900/20">
        <Shield className="mr-2" /> Acesso restrito aos administradores globais.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 glass-panel rounded-2xl">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <UsersIcon className="text-primary" /> Usuários
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Gerencie acessos e UFs permitidas.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all hover:scale-[1.02]"
        >
          <Plus size={18} className="mr-2" />
          Novo usuário
        </button>
      </div>

      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email"
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-900/50 border border-white/5 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-zinc-600 transition-all hover:bg-zinc-800/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-900/50 border border-white/5 rounded-lg text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer hover:bg-zinc-800/50"
        >
          <option value="">Todos os perfis</option>
          <option value="admin_global">Admin global</option>
          <option value="admin_regional">Admin regional</option>
          <option value="admin_estadual">Admin estadual</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20 text-zinc-500">
          <Loader2 className="animate-spin mr-3" size={24} /> Carregando gestão de usuários...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-900/20 text-red-400 border border-red-900/50 text-center font-medium">{error}</div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
          {status && (
            <div className="px-6 py-3 bg-emerald-900/20 text-emerald-400 border-b border-emerald-900/30 font-medium text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {status}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left align-middle">
              <thead className="text-xs uppercase bg-zinc-900/50 text-zinc-500 font-bold border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Perfil</th>
                  <th className="px-6 py-4">UFs</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {filtered.map((u) => {
                  const badge = roleBadges[u.role] || roleBadges.admin_regional;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 font-medium text-white">{u.name}</td>
                      <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(u.regions || []).length > 0 ? (
                            u.regions.map(uf => (
                              <span key={uf} className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded border border-zinc-700">{uf}</span>
                            ))
                          ) : (
                            <span className="text-zinc-600 text-xs italic">Todas</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              if (u.role === "system_admin" && user?.role !== "system_admin") return;
                              openEdit(u);
                            }}
                            disabled={u.role === "system_admin" && user?.role !== "system_admin"}
                            className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          {(u.role !== "system_admin" || user?.role === "system_admin") && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                              title="Remover"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center">
                        <UsersIcon size={48} className="mb-4 opacity-20" />
                        Nenhum usuário encontrado
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-zinc-950 rounded-2xl shadow-2xl w-full max-w-lg border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-zinc-900/50 backdrop-blur">
              <h3 className="text-lg font-bold text-white">
                {editingId ? "Editar Usuário" : "Novo Usuário"}
              </h3>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold ml-1">Nome</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600 focus:border-primary/50"
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold ml-1">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600 focus:border-primary/50"
                  placeholder="usuario@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold ml-1">Senha {editingId ? <span className="text-[10px] font-normal text-zinc-500 lowercase">(deixe em branco para manter)</span> : ""}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600 focus:border-primary/50"
                  required={!editingId}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold ml-1">Perfil (Role)</label>
                <select
                  value={form.role}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setForm({
                      ...form,
                      role: nextRole,
                      regions: [],
                    });
                  }}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer focus:border-primary/50"
                >
                  <option value="admin_global">Admin Global</option>
                  <option value="admin_regional">Admin Regional</option>
                  <option value="admin_estadual">Admin Estadual</option>
                </select>
              </div>
              {form.role !== "admin_global" && form.role !== "system_admin" && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold ml-1 flex items-center gap-1"><MapPin size={12} /> UFs Autorizadas</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-auto border border-white/10 rounded-xl p-3 bg-zinc-900/30">
                    {UF_LIST.map((uf) => {
                      const active = form.regions.includes(uf);
                      return (
                        <button
                          key={uf}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setForm({ ...form, regions: form.regions.filter((r) => r !== uf) });
                            } else {
                              if (form.role === "admin_estadual") {
                                setForm({ ...form, regions: [uf] });
                              } else {
                                setForm({ ...form, regions: [...form.regions, uf] });
                              }
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${active ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" : "border-white/10 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:border-white/20"}`}
                        >
                          {uf}
                        </button>
                      );
                    })}
                  </div>
                  {form.regions.length === 0 && (
                    <p className="text-xs text-red-400 pl-1 font-medium">Selecione ao menos uma UF.</p>
                  )}
                </div>
              )}
              {error && (
                <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/50 p-3 rounded-xl text-center font-medium">{error}</div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    ((form.role !== "admin_global" && form.role !== "system_admin") && form.regions.length === 0)
                  }
                  className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all disabled:opacity-50 disabled:shadow-none hover:scale-[1.02]"
                >
                  {submitting ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
