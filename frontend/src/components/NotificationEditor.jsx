import React, { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold, Italic, List, ListOrdered,
    Link as LinkIcon, Undo, Redo, X, Save
} from 'lucide-react';

const MenuBar = ({ editor }) => {
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    if (!editor) return null;

    const setLink = () => {
        if (linkUrl) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl, target: '_blank' }).run();
        }
        setLinkUrl('');
        setShowLinkInput(false);
    };

    const ToolBtn = ({ onClick, active, children, title }) => (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded-md transition-colors ${active
                ? 'bg-primary/20 text-primary'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
        >
            {children}
        </button>
    );

    return (
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-white/5 bg-zinc-900/30">
            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito">
                <Bold size={14} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico">
                <Italic size={14} />
            </ToolBtn>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
                <List size={14} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
                <ListOrdered size={14} />
            </ToolBtn>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <ToolBtn
                onClick={() => {
                    if (editor.isActive('link')) {
                        editor.chain().focus().unsetLink().run();
                    } else {
                        setShowLinkInput(true);
                    }
                }}
                active={editor.isActive('link')}
                title="Link"
            >
                <LinkIcon size={14} />
            </ToolBtn>
            {showLinkInput && (
                <div className="flex items-center gap-1 ml-1">
                    <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setLink()}
                        placeholder="https://..."
                        className="px-2 py-1 text-xs bg-zinc-950 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-primary/50 w-48"
                        autoFocus
                    />
                    <button onClick={setLink} className="text-primary text-xs font-medium px-1.5 py-1 hover:bg-primary/10 rounded">OK</button>
                    <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); }} className="text-zinc-500 text-xs px-1">
                        <X size={12} />
                    </button>
                </div>
            )}
            <div className="flex-1" />
            <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
                <Undo size={14} />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer">
                <Redo size={14} />
            </ToolBtn>
        </div>
    );
};

const NotificationEditor = ({ notification, onSave, onCancel, saving }) => {
    const [title, setTitle] = useState(notification?.title || '');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer', class: 'text-primary underline' },
            }),
            Placeholder.configure({ placeholder: 'Escreva o conteúdo da notificação...' }),
        ],
        content: notification?.body || '',
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3 text-sm text-zinc-200',
            },
        },
    });

    const handleSave = useCallback(() => {
        if (!editor || !title.trim()) return;
        const body = editor.getHTML();
        onSave({ title: title.trim(), body, id: notification?.id });
    }, [editor, title, notification, onSave]);

    return (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
            {/* Title */}
            <div className="p-4 border-b border-white/5">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título da notificação"
                    maxLength={120}
                    className="w-full text-lg font-bold bg-transparent text-white focus:outline-none placeholder:text-zinc-600"
                />
                <div className="text-[10px] text-zinc-600 mt-1">{title.length}/120</div>
            </div>

            {/* Toolbar */}
            <MenuBar editor={editor} />

            {/* Editor */}
            <div className="min-h-[150px] max-h-[300px] overflow-y-auto custom-scrollbar">
                <EditorContent editor={editor} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 p-3 border-t border-white/5 bg-zinc-900/30">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || !title.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-black hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save size={14} />
                    {saving ? 'Salvando...' : notification?.id ? 'Atualizar' : 'Publicar'}
                </button>
            </div>
        </div>
    );
};

export default NotificationEditor;
