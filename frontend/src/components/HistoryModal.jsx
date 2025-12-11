import React, { useEffect, useState, useRef, useCallback } from "react";
import { X, Save, Ban, Loader2, User } from "lucide-react";
import { useApp } from "../context/AppContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const ROLE_MAP = {
    admin_global: { label: "Admin Global", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800/50" },
    admin_regional: { label: "Admin Regional", bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/50" },
    admin_estadual: { label: "Admin Estadual", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/50" },
};

const DEFAULT_ROLE = { label: "Membro", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700" };

const HistoryModal = ({ open, onClose, influencer }) => {
    const { user } = useApp();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [newNote, setNewNote] = useState("");
    const [sending, setSending] = useState(false);

    const observer = useRef();

    const lastNoteElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchNotes(nextCursor);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, nextCursor]);

    const fetchNotes = async (cursor = null) => {
        if (!influencer?.id) return;
        setLoading(true);
        try {
            let url = `${API_URL}/influencers/${influencer.id}/notes`;
            if (cursor) url += `?cursor=${cursor}`;

            const res = await fetch(url, { credentials: "include" });
            const json = await res.json();

            if (json.data) {
                setNotes(prev => cursor ? [...prev, ...json.data] : json.data);
                setNextCursor(json.nextCursor);
                setHasMore(!!json.nextCursor);
            }
        } catch (err) {
            console.error("Failed to load notes", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && influencer?.id) {
            setNotes([]);
            setNextCursor(null);
            setHasMore(true);
            fetchNotes();
            setNewNote("");
        }
    }, [open, influencer]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setSending(true);
        try {
            const res = await fetch(`${API_URL}/influencers/${influencer.id}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ content: newNote }),
            });

            const json = await res.json();
            if (!json.error && json.data) {
                setNotes(prev => [json.data, ...prev]);
                setNewNote("");
            }
        } catch (err) {
            console.error("Failed to add note", err);
        } finally {
            setSending(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-2xl w-full max-w-5xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a]">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            Histórico de Notas
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {influencer?.name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-6 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-slate-900/50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-3 pl-2">Autor</div>
                    <div className="col-span-7">Nota</div>
                    <div className="col-span-2 text-right pr-2">Data</div>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto min-h-[300px] bg-white dark:bg-[#0f172a] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                    {notes.length === 0 && !loading && (
                        <div className="text-center text-gray-400 py-16 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
                                <User size={32} className="text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-sm font-medium">Nenhum registro encontrado ainda.</p>
                        </div>
                    )}

                    {notes.map((note, index) => {
                        const isLast = index === notes.length - 1;
                        const roleStyle = ROLE_MAP[note.user?.role] || DEFAULT_ROLE;

                        return (
                            <div
                                key={note.id}
                                ref={isLast ? lastNoteElementRef : null}
                                className="grid grid-cols-12 gap-6 px-6 py-5 border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-slate-900/30 transition-colors group"
                            >
                                {/* Author Column */}
                                <div className="col-span-3 flex items-start gap-3 pl-2">
                                    <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 flex items-center justify-center shrink-0 border border-gray-200 dark:border-slate-700">
                                        <User size={16} />
                                    </div>
                                    <div className="flex flex-col min-w-0 pt-0.5">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {note.user?.name || "Sistema"}
                                        </span>
                                        <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded border mt-1.5 w-fit ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                                            {roleStyle.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Content Column */}
                                <div className="col-span-7 pt-0.5">
                                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {note.content}
                                    </p>
                                </div>

                                {/* Date Column */}
                                <div className="col-span-2 text-right pt-0.5 pr-2">
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-medium text-gray-900 dark:text-gray-300 tabular-nums">
                                            {new Date(note.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="text-[10px] text-gray-400 tabular-nums">
                                            {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="flex justify-center p-8 bg-white dark:bg-[#0f172a]">
                            <Loader2 className="animate-spin text-blue-500" size={24} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-gray-50 dark:bg-[#0b1120] border-t border-gray-200 dark:border-gray-800">
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Adicionar nova nota</h4>
                        <div className="relative">
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Digite sua nota aqui para registrar no histórico..."
                                className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 text-sm md:text-base text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none min-h-[100px] shadow-sm transition-all hover:border-gray-300 dark:hover:border-gray-600"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setNewNote("")}
                                disabled={sending || !newNote.trim()}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <Ban size={18} /> Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={sending || !newNote.trim()}
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm hover:shadow-md hover:shadow-blue-500/10 flex items-center gap-2 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {sending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Salvar Nota
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
