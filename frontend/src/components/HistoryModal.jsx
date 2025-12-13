import React, { useEffect, useState, useRef, useCallback } from "react";
import { formatDate } from "../utils/dateUtils";
import { X, Save, Ban, Loader2, User } from "lucide-react";
import { useApp } from "../context/AppContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const ROLE_MAP = {
    admin_global: { label: "Admin Global", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
    system_admin: { label: "System Admin", bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
    admin_regional: { label: "Admin Regional", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    admin_estadual: { label: "Admin Estadual", bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
};

const DEFAULT_ROLE = { label: "Membro", bg: "bg-zinc-800", text: "text-zinc-400", border: "border-zinc-700" };

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all animate-fade-in">
            <div className="bg-zinc-950 rounded-2xl shadow-2xl w-full max-w-5xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-zinc-900/50 backdrop-blur-md">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            Histórico de Notas
                        </h3>
                        <p className="text-sm text-zinc-400 mt-0.5">
                            {influencer?.name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-6 px-6 py-3 border-b border-white/5 bg-zinc-900/30 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    <div className="col-span-3 pl-2">Autor</div>
                    <div className="col-span-7">Nota</div>
                    <div className="col-span-2 text-right pr-2">Data</div>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto min-h-[300px] bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-800">
                    {notes.length === 0 && !loading && (
                        <div className="text-center text-zinc-500 py-20 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center border border-dashed border-zinc-800">
                                <User size={32} className="text-zinc-700" />
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
                                className="grid grid-cols-12 gap-6 px-6 py-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                            >
                                {/* Author Column */}
                                <div className="col-span-3 flex items-start gap-3 pl-2">
                                    <div className="h-9 w-9 rounded-full bg-zinc-900 text-zinc-500 flex items-center justify-center shrink-0 border border-white/5 ring-1 ring-white/5">
                                        <User size={16} />
                                    </div>
                                    <div className="flex flex-col min-w-0 pt-0.5">
                                        <span className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">
                                            {note.user?.name || "Sistema"}
                                        </span>
                                        <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded border mt-1.5 w-fit ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                                            {roleStyle.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Content Column */}
                                <div className="col-span-7 pt-0.5">
                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                        {note.content}
                                    </p>
                                </div>

                                {/* Date Column */}
                                <div className="col-span-2 text-right pt-0.5 pr-2">
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-medium text-zinc-300 tabular-nums">
                                            {formatDate(note.createdAt)}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 tabular-nums">
                                            {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin text-primary" size={24} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-zinc-900/30 border-t border-white/10 backdrop-blur-md">
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Adicionar nova nota</h4>
                        <div className="relative">
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Digite sua nota aqui para registrar no histórico..."
                                className="w-full p-4 rounded-xl border border-white/10 bg-zinc-950 text-sm md:text-base text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none resize-none min-h-[100px] transition-all hover:border-white/20"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setNewNote("")}
                                disabled={sending || !newNote.trim()}
                                className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <Ban size={18} /> Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={sending || !newNote.trim()}
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:shadow-none hover:scale-[1.02]"
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
