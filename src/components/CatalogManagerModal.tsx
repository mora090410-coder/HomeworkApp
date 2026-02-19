import React, { useState } from 'react';
import { X, Pencil, Trash2, Check, AlertTriangle } from 'lucide-react';
import { ChoreCatalogItem } from '@/types';
import { Button } from '@/components/ui/Button';

interface CatalogManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: ChoreCatalogItem[];
    onUpdate: (itemId: string, name: string, baselineMinutes: number) => void;
    onDelete: (itemId: string) => void;
}

interface RowState {
    name: string;
    baselineMinutes: number;
    isEditing: boolean;
    confirmingDelete: boolean;
}

/**
 * Admin modal for managing the household chore catalog.
 *
 * Each catalog item can be inline-edited (name + baseline minutes) or
 * permanently deleted. Changes are committed individually per row.
 */
const CatalogManagerModal: React.FC<CatalogManagerModalProps> = ({
    isOpen,
    onClose,
    items,
    onUpdate,
    onDelete,
}) => {
    const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

    // Initialise or reset a row's local state from the source item.
    const getRowState = (item: ChoreCatalogItem): RowState =>
        rowStates[item.id] ?? {
            name: item.name,
            baselineMinutes: item.baselineMinutes,
            isEditing: false,
            confirmingDelete: false,
        };

    const setRow = (itemId: string, patch: Partial<RowState>) => {
        setRowStates((prev) => ({
            ...prev,
            [itemId]: { ...getRowState({ id: itemId } as ChoreCatalogItem), ...patch },
        }));
    };

    const handleEdit = (item: ChoreCatalogItem) => {
        setRow(item.id, {
            name: item.name,
            baselineMinutes: item.baselineMinutes,
            isEditing: true,
            confirmingDelete: false,
        });
    };

    const handleSave = (item: ChoreCatalogItem) => {
        const row = getRowState(item);
        const trimmedName = row.name.trim();
        if (!trimmedName || row.baselineMinutes <= 0) return;
        onUpdate(item.id, trimmedName, row.baselineMinutes);
        setRow(item.id, { isEditing: false });
    };

    const handleCancelEdit = (item: ChoreCatalogItem) => {
        setRow(item.id, {
            name: item.name,
            baselineMinutes: item.baselineMinutes,
            isEditing: false,
        });
    };

    const handleDeleteRequest = (itemId: string) => {
        setRow(itemId, { confirmingDelete: true, isEditing: false });
    };

    const handleDeleteConfirm = (itemId: string) => {
        onDelete(itemId);
        setRowStates((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
    };

    const handleDeleteCancel = (itemId: string) => {
        setRow(itemId, { confirmingDelete: false });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <div
                className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-[600px] bg-white rounded-none shadow-2xl flex flex-col max-h-[85vh] border border-neutral-200 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-200 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold font-heading text-neutral-black">Chore Catalog</h2>
                        <p className="text-sm text-neutral-500 mt-0.5">
                            {items.length} {items.length === 1 ? 'item' : 'items'} — click the pencil to edit
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
                        aria-label="Close catalog manager"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 divide-y divide-neutral-100">
                    {items.length === 0 ? (
                        <div className="py-16 text-center text-neutral-400 text-sm">
                            No catalog items yet. Save a task to the catalog when assigning.
                        </div>
                    ) : (
                        items.map((item) => {
                            const row = getRowState(item);

                            if (row.confirmingDelete) {
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3 px-8 py-4 bg-red-50 animate-in fade-in duration-150"
                                    >
                                        <AlertTriangle className="w-4 h-4 text-semantic-destructive shrink-0" />
                                        <span className="text-sm font-medium text-neutral-black flex-1">
                                            Delete <strong>{item.name}</strong>? This cannot be undone.
                                        </span>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteConfirm(item.id)}
                                        >
                                            Delete
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteCancel(item.id)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                );
                            }

                            if (row.isEditing) {
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3 px-8 py-3 bg-neutral-50 animate-in fade-in duration-150"
                                    >
                                        <input
                                            type="text"
                                            value={row.name}
                                            onChange={(e) => setRow(item.id, { name: e.target.value })}
                                            className="flex-1 px-3 py-2 border border-primary-gold/70 rounded-none text-sm font-medium text-neutral-black bg-white outline-none focus:ring-2 focus:ring-primary-gold/20"
                                            autoFocus
                                            aria-label="Edit catalog item name"
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(item); if (e.key === 'Escape') handleCancelEdit(item); }}
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                            <input
                                                type="number"
                                                min="1"
                                                max="240"
                                                value={row.baselineMinutes}
                                                onChange={(e) => setRow(item.id, { baselineMinutes: Number.parseInt(e.target.value, 10) || 0 })}
                                                className="w-16 px-2 py-2 border border-primary-gold/70 rounded-none text-sm text-center text-neutral-black bg-white outline-none focus:ring-2 focus:ring-primary-gold/20"
                                                aria-label="Edit baseline minutes"
                                            />
                                            <span className="text-xs text-neutral-500 ml-1">min</span>
                                        </div>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleSave(item)}
                                            disabled={!row.name.trim() || row.baselineMinutes <= 0}
                                            aria-label="Save catalog item changes"
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCancelEdit(item)}
                                            aria-label="Cancel edit"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 px-8 py-3.5 hover:bg-neutral-50 transition-colors group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-semibold text-neutral-black truncate block">
                                            {item.name}
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium text-neutral-500 shrink-0 bg-neutral-100 px-2 py-0.5 rounded-none">
                                        {item.baselineMinutes} min
                                    </span>
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-1.5 rounded-none text-neutral-400 hover:text-primary-cardinal hover:bg-neutral-100 transition-colors opacity-0 group-hover:opacity-100"
                                        aria-label={`Edit ${item.name}`}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRequest(item.id)}
                                        className="p-1.5 rounded-none text-neutral-400 hover:text-semantic-destructive hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                        aria-label={`Delete ${item.name}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-neutral-200 shrink-0">
                    <Button variant="secondary" onClick={onClose} className="w-full">
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CatalogManagerModal;
