import { useState, useEffect } from 'react';
import { supabase, Room } from '../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export function RoomSettings() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name');

    if (!error && data) {
      setRooms(data);
    }
  };

  const handleAddRoom = async (roomData: Partial<Room>) => {
    const { error } = await supabase.from('rooms').insert([roomData]);

    if (!error) {
      loadRooms();
      setShowAddRoom(false);
    }
  };

  const handleUpdateRoom = async (roomId: string, updates: Partial<Room>) => {
    const { error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', roomId);

    if (!error) {
      loadRooms();
      setEditingRoom(null);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure? This will delete all tables in this room.')) return;

    const { error } = await supabase.from('rooms').delete().eq('id', roomId);

    if (!error) {
      loadRooms();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{t('room.manage_rooms')}</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddRoom(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>{t('room.add_room')}</span>
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">{room.name}</h3>
                <p className="text-sm text-slate-400">{room.description}</p>
              </div>
              {isAdmin && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingRoom(room)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  room.is_active
                    ? 'bg-green-900/20 text-green-400'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {room.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showAddRoom && (
        <RoomFormModal
          onClose={() => setShowAddRoom(false)}
          onSave={handleAddRoom}
          title={t('room.add_room')}
        />
      )}

      {editingRoom && (
        <RoomFormModal
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSave={(data) => handleUpdateRoom(editingRoom.id, data)}
          title="Edit Room"
        />
      )}
    </div>
  );
}

function RoomFormModal({
  room,
  onClose,
  onSave,
  title,
}: {
  room?: Room;
  onClose: () => void;
  onSave: (data: Partial<Room>) => void;
  title: string;
}) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: room?.name || '',
    description: room?.description || '',
    is_active: room?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('room.room_name')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              placeholder="e.g., Main Hall, Terrace, VIP Lounge"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('room.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              placeholder="Brief description of the room"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-600 rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-slate-300">
              Active (available for reservations)
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
