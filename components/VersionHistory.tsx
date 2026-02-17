'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ResumeVersion, ResumeData, EvaluationResult, VersionTrigger } from '../types';
import { getVersions, createVersion, deleteVersion, updateVersionLabel } from '../services/storageService';
import {
    History,
    RotateCcw,
    Save,
    Trash2,
    ChevronDown,
    ChevronUp,
    Clock,
    Tag,
    Zap,
    BarChart3,
    CheckCircle2,
    Shield,
    Pencil,
    Check,
    X,
    AlertTriangle,
    Loader2,
} from 'lucide-react';

interface VersionHistoryProps {
    projectId: string;
    currentData: ResumeData;
    currentEvaluation?: EvaluationResult;
    onRestore: (data: ResumeData, evaluation?: EvaluationResult) => void;
}

const TRIGGER_CONFIG: Record<VersionTrigger, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
    manual: { icon: Save, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
    auto_generated: { icon: Zap, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
    auto_evaluated: { icon: BarChart3, color: 'text-violet-600', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
    auto_saved: { icon: CheckCircle2, color: 'text-sky-600', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
    auto_pre_restore: { icon: Shield, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
};

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
    projectId,
    currentData,
    currentEvaluation,
    onRestore,
}) => {
    const t = useTranslations('Versions');
    const [versions, setVersions] = useState<ResumeVersion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [editLabelValue, setEditLabelValue] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    const loadVersions = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getVersions(projectId);
            setVersions(result);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (isOpen && versions.length === 0) {
            loadVersions();
        }
    }, [isOpen, loadVersions, versions.length]);

    const handleSaveVersion = async () => {
        setIsSaving(true);
        try {
            const label = `${t('manualSave')} — ${formatFullDateTime(Date.now())}`;
            const version = await createVersion(projectId, label, 'manual', currentData, currentEvaluation);
            if (version) {
                setVersions(prev => [version, ...prev]);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2000);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestore = async (version: ResumeVersion) => {
        // Create a safety snapshot before restoring
        await createVersion(
            projectId,
            `${t('preRestoreBackup')} — ${formatFullDateTime(Date.now())}`,
            'auto_pre_restore',
            currentData,
            currentEvaluation
        );
        onRestore(version.data, version.evaluation);
        setRestoreConfirmId(null);
        // Refresh the list
        await loadVersions();
    };

    const handleDelete = async (versionId: string) => {
        try {
            await deleteVersion(projectId, versionId);
            setVersions(prev => prev.filter(v => v.id !== versionId));
        } catch {
            // Error handled in storageService
        }
        setDeleteConfirmId(null);
    };

    const handleUpdateLabel = async (versionId: string) => {
        if (!editLabelValue.trim()) return;
        const updated = await updateVersionLabel(projectId, versionId, editLabelValue.trim());
        if (updated) {
            setVersions(prev => prev.map(v => (v.id === versionId ? { ...v, label: updated.label } : v)));
        }
        setEditingLabelId(null);
        setEditLabelValue('');
    };

    const startEditLabel = (version: ResumeVersion) => {
        setEditingLabelId(version.id);
        setEditLabelValue(version.label);
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            {/* Header / Toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                        <History className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-bold text-slate-900">{t('title')}</div>
                        <div className="text-[10px] text-slate-500">
                            {versions.length > 0 ? t('versionCount', { count: versions.length }) : t('noVersions')}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {versions.length > 0 && (
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {versions.length}
                        </span>
                    )}
                    {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {isOpen && (
                <div className="border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Save Version Button */}
                    <div className="p-4 border-b border-slate-50">
                        <button
                            onClick={handleSaveVersion}
                            disabled={isSaving}
                            className={`w-full py-2.5 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 ${
                                saveSuccess
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
                            }`}
                        >
                            {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : saveSuccess ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            {isSaving ? t('saving') : saveSuccess ? t('versionSaved') : t('saveVersion')}
                        </button>
                    </div>

                    {/* Version List */}
                    <div className="max-h-100 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                            </div>
                        ) : versions.length === 0 ? (
                            <div className="text-center py-8 px-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <History className="w-6 h-6 text-slate-300" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">{t('emptyTitle')}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{t('emptyDesc')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {versions.map((version, index) => {
                                    const config = TRIGGER_CONFIG[version.trigger];
                                    const Icon = config.icon;
                                    const isRestoreConfirm = restoreConfirmId === version.id;
                                    const isDeleteConfirm = deleteConfirmId === version.id;
                                    const isEditing = editingLabelId === version.id;

                                    return (
                                        <div
                                            key={version.id}
                                            className={`group px-4 py-3 hover:bg-slate-50/50 transition-colors relative ${
                                                index === 0 ? 'bg-slate-50/30' : ''
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Timeline dot */}
                                                <div className="flex flex-col items-center pt-0.5">
                                                    <div className={`p-1.5 rounded-lg ${config.bgColor} ${config.color}`}>
                                                        <Icon className="w-3 h-3" />
                                                    </div>
                                                    {index < versions.length - 1 && (
                                                        <div className="w-px h-full bg-slate-100 mt-1 min-h-4" />
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <input
                                                                className="flex-1 text-xs font-semibold text-slate-800 border border-indigo-200 bg-indigo-50/50 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                                                value={editLabelValue}
                                                                onChange={(e) => setEditLabelValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleUpdateLabel(version.id);
                                                                    if (e.key === 'Escape') setEditingLabelId(null);
                                                                }}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => handleUpdateLabel(version.id)}
                                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingLabelId(null)}
                                                                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className="text-xs font-semibold text-slate-800 truncate">
                                                                {version.label}
                                                            </span>
                                                            <button
                                                                onClick={() => startEditLabel(version)}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-indigo-600 rounded"
                                                                title={t('editLabel')}
                                                            >
                                                                <Pencil className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        <span title={formatFullDateTime(version.createdAt)}>
                                                            {formatRelativeTime(version.createdAt)}
                                                        </span>
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${config.bgColor} ${config.color} ${config.borderColor}`}>
                                                            <Tag className="w-2 h-2" />
                                                            {t(`trigger_${version.trigger}`)}
                                                        </span>
                                                    </div>

                                                    {/* Evaluation score badge */}
                                                    {version.evaluation && (
                                                        <div className="mt-1.5 flex items-center gap-1">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                                                version.evaluation.isPassing
                                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                                {t('score')}: {version.evaluation.totalScore}/100
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    {isRestoreConfirm ? (
                                                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in duration-150">
                                                            <p className="text-[10px] font-medium text-amber-800 mb-2 flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {t('restoreConfirm')}
                                                            </p>
                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    onClick={() => handleRestore(version)}
                                                                    className="flex-1 py-1.5 text-[10px] font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                                                                >
                                                                    {t('confirmRestore')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setRestoreConfirmId(null)}
                                                                    className="px-3 py-1.5 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                                                >
                                                                    {t('cancel')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : isDeleteConfirm ? (
                                                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg animate-in fade-in duration-150">
                                                            <p className="text-[10px] font-medium text-red-800 mb-2 flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {t('deleteConfirm')}
                                                            </p>
                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    onClick={() => handleDelete(version.id)}
                                                                    className="flex-1 py-1.5 text-[10px] font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                                >
                                                                    {t('confirmDelete')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteConfirmId(null)}
                                                                    className="px-3 py-1.5 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                                                >
                                                                    {t('cancel')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => setRestoreConfirmId(version.id)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                                                            >
                                                                <RotateCcw className="w-2.5 h-2.5" />
                                                                {t('restore')}
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirmId(version.id)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
