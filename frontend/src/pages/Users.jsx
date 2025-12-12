import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Edit2, X } from "lucide-react";
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
      setStatus(editingId ? "Usuário atualizado." : "Usuário criado.");
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
      <div className="p-6">
        <div className="text-red-500">Acesso restrito aos administradores globais.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Usuários</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie acessos e UFs permitidas.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus size={16} className="mr-2" />
          Novo usuário
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email"
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
        >
          <option value="">Todos os perfis</option>
          <option value="admin_global">Admin global</option>
          <option value="admin_regional">Admin regional</option>
          <option value="admin_estadual">Admin estadual</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Carregando...
        </div>
      ) : error ? (
        <div className="p-4 rounded-md bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {status && (
            <div className="px-4 py-3 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-b border-green-200 dark:border-green-800">
              {status}
            </div>
          )}
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">UFs</th>
                <th className="px-4 py-3 w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b dark:border-gray-800">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{(u.regions || []).join(", ") || "—"}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (u.role === "system_admin" && user?.role !== "system_admin") return;
                        openEdit(u);
                      }}
                      disabled={u.role === "system_admin" && user?.role !== "system_admin"}
                      className="p-1 rounded text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 disabled:hover:bg-transparent"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    {(u.role !== "system_admin" || user?.role === "system_admin") && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {editingId ? "Editar usuário" : "Novo usuário"}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
                <label className="text-xs text-gray-500">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Senha {editingId ? "(deixe em branco para não alterar)" : ""}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                  required={!editingId}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Perfil (role)</label>
                <select
                  value={form.role}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setForm({
                      ...form,
                      role: nextRole,
                      // Zera a seleção ao mudar de role para evitar inconsistências (ex: múltiplas UFs em admin estadual)
                      regions: [],
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                >
                  <option value="admin_global">Admin global</option>
                  <option value="admin_regional">Admin regional</option>
                  <option value="admin_estadual">Admin estadual</option>
                </select>
              </div>
              {form.role !== "admin_global" && form.role !== "system_admin" && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">UFs autorizadas</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-auto border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900">
                    {UF_LIST.map((uf) => {
                      const active = form.regions.includes(uf);
                      return (
                        <button
                          key={uf}
                          type="button"
                          onClick={() => {
                            if (active) {
                              // Desmarcar UF selecionada
                              setForm({ ...form, regions: form.regions.filter((r) => r !== uf) });
                            } else {
                              // Admin estadual: apenas UMA UF permitida (substitui seleção anterior)
                              if (form.role === "admin_estadual") {
                                setForm({ ...form, regions: [uf] });
                              } else {
                                // Admin regional: múltiplas UFs permitidas
                                setForm({ ...form, regions: [...form.regions, uf] });
                              }
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded border ${active ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"}`}
                        >
                          {uf}
                        </button>
                      );
                    })}
                  </div>
                  {form.regions.length === 0 && (
                    <p className="text-xs text-red-500">Selecione ao menos uma UF.</p>
                  )}
                </div>
              )}
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
                  disabled={
                    submitting ||
                    ((form.role !== "admin_global" && form.role !== "system_admin") && form.regions.length === 0)
                  }
                  className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
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

export default Users;
