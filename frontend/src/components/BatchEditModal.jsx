import { useState } from 'react';
import { X, Edit3 } from 'lucide-react';

/**
 * BatchEditModal — Modal para edição em lote de metas (deadline e targetValue)
 */
export default function BatchEditModal({ isOpen, onClose, onSave, selectedCount }) {
    const [formData, setFormData] = useState({
        deadline: '',
        targetValue: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        const changes = {};
        if (formData.deadline) changes.deadline = formData.deadline;
        if (formData.targetValue) changes.targetValue = Number(formData.targetValue);

        if (Object.keys(changes).length === 0) {
            alert('Preencha pelo menos um campo para atualizar.');
            return;
        }

        onSave(changes);
        handleClose();
    };

    const handleClose = () => {
        setFormData({ deadline: '', targetValue: '' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            <div className="relative glass-panel rounded-2xl shadow-2xl w-full max-w-md border border-white/10 bg-zinc-900/95 animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                            <Edit3 size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">
                                Editar em Lote
                            </h2>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                {selectedCount} meta{selectedCount !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <p className="text-sm text-zinc-400">
                        Preencha apenas os campos que deseja alterar. Os campos em branco serão mantidos como estão.
                    </p>

                    {/* Novo Prazo */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Novo Prazo Final
                        </label>
                        <input
                            type="date"
                            value={formData.deadline}
                            onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
                            className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all [color-scheme:dark]"
                        />
                    </div>

                    {/* Novo Valor Alvo */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Novo Valor Alvo
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.targetValue}
                            onChange={(e) => setFormData((prev) => ({ ...prev, targetValue: e.target.value }))}
                            placeholder="Ex: 100000"
                            className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-3 border-t border-white/5">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition font-semibold border border-white/5"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition font-semibold shadow-lg shadow-amber-500/20"
                        >
                            Aplicar a {selectedCount} meta{selectedCount !== 1 ? 's' : ''}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
