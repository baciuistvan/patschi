import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, MapPin, Clock, Briefcase, ChevronDown, ChevronUp, Loader2, X, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface JobListing {
  id: string;
  title: string;
  department: string;
  location: string;
  job_type: string;
  description: string;
  requirements: string;
  apply_email: string;
  apply_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const JOB_TYPES = ['Vollzeit', 'Teilzeit', 'Minijob', 'Aushilfe', 'Praktikum', 'Ausbildung'];

const DEPARTMENT_SUGGESTIONS = ['Service', 'Küche', 'Bar', 'Management', 'Administration', 'Lieferung'];

const emptyForm = {
  title: '',
  department: '',
  location: '',
  job_type: 'Vollzeit',
  description: '',
  requirements: '',
  apply_email: '',
  apply_url: '',
  is_active: true,
  sort_order: 0,
};

type FormData = typeof emptyForm;

function JobTypebadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Vollzeit: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300',
    Teilzeit: 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300',
    Minijob: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
    Aushilfe: 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300',
    Praktikum: 'bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300',
    Ausbildung: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[type] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
      {type}
    </span>
  );
}

function JobFormModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: FormData & { id?: string };
  onSave: (data: FormData) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>({ ...initial });

  const set = (key: keyof FormData, value: string | boolean | number) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-black/5 dark:border-white/8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {initial.id ? 'Stelle bearbeiten' : 'Neue Stelle erstellen'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Stellentitel *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="z.B. Servicekraft (m/w/d)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Abteilung</label>
              <input
                type="text"
                value={form.department}
                onChange={e => set('department', e.target.value)}
                list="dept-suggestions"
                placeholder="z.B. Service"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
              <datalist id="dept-suggestions">
                {DEPARTMENT_SUGGESTIONS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Standort</label>
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="z.B. Wien"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Beschäftigungsart</label>
              <select
                value={form.job_type}
                onChange={e => set('job_type', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              >
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Reihenfolge</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Stellenbeschreibung *</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={5}
              placeholder="Beschreibe die Aufgaben und Verantwortlichkeiten dieser Stelle..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Anforderungen</label>
            <textarea
              value={form.requirements}
              onChange={e => set('requirements', e.target.value)}
              rows={4}
              placeholder="Qualifikationen, Erfahrungen und Eigenschaften, die wir uns wünschen..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition resize-none"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Bewerbungs-E-Mail</label>
              <input
                type="email"
                value={form.apply_email}
                onChange={e => set('apply_email', e.target.value)}
                placeholder="jobs@beispiel.at"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Bewerbungs-URL</label>
              <input
                type="url"
                value={form.apply_url}
                onChange={e => set('apply_url', e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {form.is_active
                ? <ToggleRight className="w-6 h-6 text-teal-500" />
                : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              {form.is_active ? 'Stelle aktiv (sichtbar im Widget)' : 'Stelle inaktiv (verborgen)'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition">
            Abbrechen
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.title.trim()}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition flex items-center gap-2 shadow-md shadow-teal-500/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

export function JobListings() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingJob, setEditingJob] = useState<(FormData & { id?: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobListing | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('job_listings')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setJobs(data ?? []);
    setLoading(false);
  };

  const handleSave = async (form: FormData) => {
    setSaving(true);
    setError(null);
    if (editingJob?.id) {
      const { error } = await supabase
        .from('job_listings')
        .update({ ...form })
        .eq('id', editingJob.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase
        .from('job_listings')
        .insert([{ ...form }]);
      if (error) setError(error.message);
    }
    setSaving(false);
    setEditingJob(null);
    loadJobs();
  };

  const handleToggleActive = async (job: JobListing) => {
    await supabase.from('job_listings').update({ is_active: !job.is_active }).eq('id', job.id);
    loadJobs();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('job_listings').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadJobs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">Offene Stellen</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Stellenanzeigen verwalten und auf der Website einbetten</p>
        </div>
        <button
          onClick={() => setEditingJob({ ...emptyForm })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-md shadow-teal-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          Neue Stelle
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-teal-500" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#111113] rounded-2xl border border-slate-100 dark:border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-7 h-7 text-teal-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Keine Stellen vorhanden</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">Erstelle die erste Stellenanzeige.</p>
          <button
            onClick={() => setEditingJob({ ...emptyForm })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-md shadow-teal-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Stelle erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div
              key={job.id}
              className={`bg-white dark:bg-[#111113] rounded-2xl border transition-all duration-200 overflow-hidden ${
                job.is_active
                  ? 'border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md'
                  : 'border-slate-200/60 dark:border-white/3 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white text-base">{job.title}</span>
                    <JobTypebadge type={job.job_type} />
                    {!job.is_active && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                        Inaktiv
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-500 flex-wrap">
                    {job.department && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        {job.department}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(job.created_at).toLocaleDateString('de-AT')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(job)}
                    className="p-2 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition"
                    title={job.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {job.is_active
                      ? <ToggleRight className="w-5 h-5 text-teal-500" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setEditingJob({ ...job })}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
                    title="Bearbeiten"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(job)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                    title="Details"
                  >
                    {expandedId === job.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedId === job.id && (
                <div className="border-t border-slate-100 dark:border-white/5 px-5 py-4 grid sm:grid-cols-2 gap-5">
                  {job.description && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Beschreibung</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">{job.description}</p>
                    </div>
                  )}
                  {job.requirements && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Anforderungen</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">{job.requirements}</p>
                    </div>
                  )}
                  {(job.apply_email || job.apply_url) && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Bewerbung</p>
                      <div className="flex flex-wrap gap-3">
                        {job.apply_email && (
                          <a href={`mailto:${job.apply_email}`} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">{job.apply_email}</a>
                        )}
                        {job.apply_url && (
                          <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 dark:text-teal-400 hover:underline">{job.apply_url}</a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingJob && (
        <JobFormModal
          initial={editingJob}
          onSave={handleSave}
          onClose={() => setEditingJob(null)}
          saving={saving}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-md p-6 border border-black/5 dark:border-white/8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Stelle löschen?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Stelle <strong>"{deleteTarget.title}"</strong> wird dauerhaft gelöscht.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition">
                Abbrechen
              </button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition shadow-md shadow-red-500/20">
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
