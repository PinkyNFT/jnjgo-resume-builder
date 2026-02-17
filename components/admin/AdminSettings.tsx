'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Save, Check, RotateCcw, Info } from 'lucide-react';

interface Setting {
    _id: string;
    key: string;
    value: unknown;
    label: string;
    description: string;
    category: 'ai' | 'app' | 'security' | 'limits';
    valueType: 'string' | 'number' | 'boolean' | 'select';
    options?: string[];
    updatedBy: string;
    updatedAt: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; description: string }> = {
    ai: { label: 'AI Configuration', color: 'border-purple-200 bg-purple-50', description: 'Control AI model behavior and parameters' },
    app: { label: 'Application', color: 'border-blue-200 bg-blue-50', description: 'General application settings' },
    security: { label: 'Security', color: 'border-red-200 bg-red-50', description: 'Authentication and access control' },
    limits: { label: 'Limits', color: 'border-amber-200 bg-amber-50', description: 'Usage limits and thresholds' },
};

export function AdminSettings() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});
    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [saved, setSaved] = useState<Record<string, boolean>>({});

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/settings');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setSettings(data.settings);
            setEditedValues({});
        } catch {
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSettings(); }, []);

    const handleSave = async (key: string) => {
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value: editedValues[key] })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }
            const data = await res.json();
            // Update local state
            setSettings(prev => prev.map(s => s.key === key ? { ...s, value: editedValues[key], updatedAt: new Date().toISOString() } : s));
            setEditedValues(prev => { const n = { ...prev }; delete n[key]; return n; });
            setSaved(prev => ({ ...prev, [key]: true }));
            setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000);
        } catch (err: any) {
            alert(err.message || 'Failed to save setting');
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleReset = (key: string) => {
        setEditedValues(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    const getValue = (setting: Setting) => {
        return editedValues.hasOwnProperty(setting.key) ? editedValues[setting.key] : setting.value;
    };

    const isChanged = (key: string) => editedValues.hasOwnProperty(key);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20 space-y-4">
                <p className="text-red-500">{error}</p>
                <button onClick={fetchSettings} className="text-indigo-600 hover:underline">Retry</button>
            </div>
        );
    }

    // Group settings by category
    const grouped = settings.reduce<Record<string, Setting[]>>((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
    }, {});

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-lg font-bold text-slate-900">Application Settings</h2>
                <p className="text-sm text-slate-600 mt-1">Configure AI models, limits, security, and app behavior. Changes take effect immediately.</p>
            </div>

            {Object.entries(grouped).map(([category, items]) => {
                const config = CATEGORY_CONFIG[category] || { label: category, color: 'border-slate-200 bg-slate-50', description: '' };
                return (
                    <div key={category} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className={`px-6 py-4 border-b ${config.color}`}>
                            <h3 className="text-sm font-semibold text-slate-900">{config.label}</h3>
                            <p className="text-xs text-slate-600 mt-0.5">{config.description}</p>
                        </div>
                        <div className="divide-y divide-slate-200">
                            {items.map(setting => (
                                <div key={setting.key} className="px-6 py-4 flex items-start gap-6">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-medium text-slate-900">{setting.label}</label>
                                            {isChanged(setting.key) && (
                                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Modified</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600 mt-0.5">{setting.description}</p>
                                        <p className="text-xs text-slate-500 mt-1">Key: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{setting.key}</code></p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {setting.valueType === 'boolean' && (
                                            <button
                                                onClick={() => setEditedValues(prev => ({ ...prev, [setting.key]: !getValue(setting) }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(getValue(setting) as boolean) ? 'bg-indigo-600' : 'bg-slate-400'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(getValue(setting) as boolean) ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        )}
                                        {setting.valueType === 'number' && (
                                            <input
                                                type="number"
                                                value={getValue(setting) as number}
                                                onChange={e => setEditedValues(prev => ({ ...prev, [setting.key]: parseFloat(e.target.value) || 0 }))}
                                                className="w-28 px-3 py-1.5 text-sm text-slate-800 border border-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                step={setting.key === 'ai_temperature' ? 0.1 : 1}
                                                min={setting.key === 'ai_temperature' ? 0 : 1}
                                                max={setting.key === 'ai_temperature' ? 2 : undefined}
                                            />
                                        )}
                                        {setting.valueType === 'string' && (
                                            <input
                                                type="text"
                                                value={(getValue(setting) as string) || ''}
                                                onChange={e => setEditedValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                                                className="w-56 px-3 py-1.5 text-sm text-slate-800 border border-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        )}
                                        {setting.valueType === 'select' && setting.options && (
                                            <select
                                                value={(getValue(setting) as string) || ''}
                                                onChange={e => setEditedValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                                                className="w-56 px-3 py-1.5 text-sm text-slate-800 border border-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                            >
                                                {setting.options.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        )}
                                        {isChanged(setting.key) && (
                                            <>
                                                <button
                                                    onClick={() => handleSave(setting.key)}
                                                    disabled={saving[setting.key]}
                                                    className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                    title="Save"
                                                >
                                                    {saving[setting.key] ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Save className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleReset(setting.key)}
                                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Reset"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        {saved[setting.key] && (
                                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                                <Check className="w-3.5 h-3.5" /> Saved
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
