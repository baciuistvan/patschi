import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, MapPin, Clock, CalendarDays, ChevronDown, ChevronUp, Loader2, X, Check, AlertTriangle, Star, Upload, Link, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EventListing {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  description: string;
  location: string;
  price: number | null;
  price_label: string;
  image_url: string;
  category: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['Party', 'Live Music', 'DJ Night', 'Spezialevent', 'Après-Ski', 'Konzert', 'Sonstiges'];

const emptyForm = {
  title: '',
  subtitle: '',
  date: '',
  start_time: '',
  end_time: '',
  description: '',
  location: '',
  price: '' as string | number,
  price_label: '',
  image_url: '',
  category: 'Party',
  is_active: true,
  is_featured: false,
  sort_order: 0,
};

type FormData = typeof emptyForm;

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    Party: 'bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300',
    'Live Music': 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300',
    'DJ Night': 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
    Spezialevent: 'bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300',
    'Après-Ski': 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300',
    Konzert: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    Sonstiges: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[category] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
      {category}
    </span>
  );
}

function EventFormModal({
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
  const [imageMode, setImageMode] = useState<'url' | 'upload'>(initial.image_url ? 'url' : 'upload');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>(initial.image_url ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormData, value: string | boolean | number) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadError('Nur Bilddateien erlaubt.'); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError('Maximale Dateigröße: 10 MB.'); return; }

    setUploading(true);
    setUploadError(null);

    const ext = file.name.split('.').pop();
    const path = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: false });
    if (error) { setUploadError(error.message); setUploading(false); return; }

    const { data } = supabase.storage.from('images').getPublicUrl(path);
    set('image_url', data.publicUrl);
    setPreview(data.publicUrl);
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const clearImage = () => {
    set('image_url', '');
    setPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-black/5 dark:border-white/8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {initial.id ? 'Event bearbeiten' : 'Neues Event erstellen'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Titel *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="z.B. Opening Night 2025"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Untertitel</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={e => set('subtitle', e.target.value)}
                placeholder="z.B. Die legendärste Party der Saison"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Datum *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Kategorie</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Beginn</label>
              <input
                type="time"
                value={form.start_time ?? ''}
                onChange={e => set('start_time', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Ende</label>
              <input
                type="time"
                value={form.end_time ?? ''}
                onChange={e => set('end_time', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Ort / Location</label>
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="z.B. Patschi Bar, Serfaus"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Preis (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price === null ? '' : String(form.price)}
                onChange={e => set('price', e.target.value)}
                placeholder="Leer = kein Preis"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Preis-Label</label>
              <input
                type="text"
                value={form.price_label}
                onChange={e => set('price_label', e.target.value)}
                placeholder="z.B. Eintritt frei  /  ab 15 EUR  /  VVK 12 EUR"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
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

          {/* Image section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bild</label>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${imageMode === 'upload' ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Hochladen
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${imageMode === 'url' ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Link className="w-3.5 h-3.5" />
                  URL
                </button>
              </div>
            </div>

            {imageMode === 'url' ? (
              <input
                type="url"
                value={form.image_url}
                onChange={e => { set('image_url', e.target.value); setPreview(e.target.value); }}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition"
              />
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => !uploading && fileRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed transition cursor-pointer ${
                  uploading
                    ? 'border-teal-400 dark:border-teal-500 bg-teal-50 dark:bg-teal-500/5'
                    : 'border-slate-200 dark:border-white/10 hover:border-teal-400 dark:hover:border-teal-500/50 bg-slate-50 dark:bg-white/3 hover:bg-teal-50/30 dark:hover:bg-teal-500/5'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
                <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                      <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">Wird hochgeladen…</p>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/8 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Bild hier ablegen oder klicken</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">JPG, PNG, WEBP — max. 10 MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {uploadError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {uploadError}
              </p>
            )}

            {preview && (
              <div className="mt-3 relative group rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                <img src={preview} alt="Vorschau" className="w-full h-44 object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                  title="Bild entfernen"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 inset-x-0 px-3 py-1.5 bg-black/40 text-white text-xs truncate">
                  Vorschau
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={5}
              placeholder="Beschreibe das Event, Programm, Highlights..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {form.is_active
                ? <ToggleRight className="w-6 h-6 text-teal-500" />
                : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              {form.is_active ? 'Event aktiv (sichtbar im Widget)' : 'Event inaktiv (verborgen)'}
            </button>

            <button
              type="button"
              onClick={() => set('is_featured', !form.is_featured)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {form.is_featured
                ? <ToggleRight className="w-6 h-6 text-amber-500" />
                : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              {form.is_featured ? 'Hervorgehoben' : 'Nicht hervorgehoben'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition">
            Abbrechen
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || uploading || !form.title.trim() || !form.date}
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function isPast(dateStr: string) {
  return new Date(dateStr + 'T23:59:59') < new Date();
}

export function EventListings() {
  const [events, setEvents] = useState<EventListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<(FormData & { id?: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventListing | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('date', { ascending: true });
    if (error) setError(error.message);
    else setEvents(data ?? []);
    setLoading(false);
  };

  const handleSave = async (form: FormData) => {
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      price: form.price === '' || form.price === null ? null : Number(form.price),
      start_time: (form.start_time as string) || null,
      end_time: (form.end_time as string) || null,
    };
    if (editingEvent?.id) {
      const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('events').insert([payload]);
      if (error) setError(error.message);
    }
    setSaving(false);
    setEditingEvent(null);
    loadEvents();
  };

  const handleToggleActive = async (event: EventListing) => {
    await supabase.from('events').update({ is_active: !event.is_active }).eq('id', event.id);
    loadEvents();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('events').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadEvents();
  };

  const filtered = events.filter(e => {
    if (filter === 'upcoming') return !isPast(e.date);
    if (filter === 'past') return isPast(e.date);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">Veranstaltungen</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Events verwalten und auf der Website einbetten</p>
        </div>
        <button
          onClick={() => setEditingEvent({ ...emptyForm })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-md shadow-teal-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          Neues Event
        </button>
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'upcoming', 'past'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === f
                ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/20'
                : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-teal-300 dark:hover:border-teal-500/30'
            }`}
          >
            {f === 'all' ? 'Alle' : f === 'upcoming' ? 'Kommende' : 'Vergangene'}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{filtered.length} Event{filtered.length !== 1 ? 's' : ''}</span>
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#111113] rounded-2xl border border-slate-100 dark:border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-7 h-7 text-teal-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Keine Events vorhanden</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">
            {filter !== 'all' ? 'Kein Event in dieser Kategorie.' : 'Erstelle das erste Event.'}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setEditingEvent({ ...emptyForm })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-md shadow-teal-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              Event erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(event => (
            <div
              key={event.id}
              className={`bg-white dark:bg-[#111113] rounded-2xl border transition-all duration-200 overflow-hidden ${
                event.is_active
                  ? 'border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md'
                  : 'border-slate-200/60 dark:border-white/3 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white text-base">{event.title}</span>
                    <CategoryBadge category={event.category} />
                    {event.is_featured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        <Star className="w-3 h-3" />
                        Featured
                      </span>
                    )}
                    {!event.is_active && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                        Inaktiv
                      </span>
                    )}
                    {isPast(event.date) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500">
                        Vergangen
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {formatDate(event.date)}
                    </span>
                    {event.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {event.start_time.slice(0, 5)}{event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ''}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </span>
                    )}
                    {event.price_label && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">{event.price_label}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(event)}
                    className="p-2 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition"
                    title={event.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {event.is_active
                      ? <ToggleRight className="w-5 h-5 text-teal-500" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setEditingEvent({ ...event, price: event.price ?? '', start_time: event.start_time ?? '', end_time: event.end_time ?? '' })}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
                    title="Bearbeiten"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(event)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                    title="Details"
                  >
                    {expandedId === event.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedId === event.id && (
                <div className="border-t border-slate-100 dark:border-white/5 px-5 py-4 grid sm:grid-cols-2 gap-5">
                  {event.subtitle && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Untertitel</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{event.subtitle}</p>
                    </div>
                  )}
                  {event.description && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Beschreibung</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">{event.description}</p>
                    </div>
                  )}
                  {event.image_url && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Bild</p>
                      <a href={event.image_url} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 dark:text-teal-400 hover:underline break-all">{event.image_url}</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingEvent && (
        <EventFormModal
          initial={editingEvent}
          onSave={handleSave}
          onClose={() => setEditingEvent(null)}
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
                <h3 className="font-bold text-slate-900 dark:text-white">Event löschen?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Event <strong>"{deleteTarget.title}"</strong> wird dauerhaft gelöscht.
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
