import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Template {
  id: string;
  name: string;
  design_data: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    fontFamily: string;
    borderStyle: string;
  };
  preview_image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export function GiftCardTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    accentColor: '#059669',
    fontFamily: 'Arial, sans-serif',
    borderStyle: 'rounded'
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('gift_card_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const templateData = {
        name: formData.name,
        design_data: {
          backgroundColor: formData.backgroundColor,
          textColor: formData.textColor,
          accentColor: formData.accentColor,
          fontFamily: formData.fontFamily,
          borderStyle: formData.borderStyle
        },
        is_active: true
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('gift_card_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gift_card_templates')
          .insert([templateData]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingTemplate(null);
      setFormData({
        name: '',
        backgroundColor: '#10b981',
        textColor: '#ffffff',
        accentColor: '#059669',
        fontFamily: 'Arial, sans-serif',
        borderStyle: 'rounded'
      });
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      backgroundColor: template.design_data.backgroundColor,
      textColor: template.design_data.textColor,
      accentColor: template.design_data.accentColor,
      fontFamily: template.design_data.fontFamily,
      borderStyle: template.design_data.borderStyle
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('gift_card_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('gift_card_templates')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading templates...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Gift Card Templates</h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Manage custom gift card designs</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingTemplate(null);
            setFormData({
              name: '',
              backgroundColor: '#10b981',
              textColor: '#ffffff',
              accentColor: '#059669',
              fontFamily: 'Arial, sans-serif',
              borderStyle: 'rounded'
            });
          }}
          className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center space-x-2 text-sm sm:text-base"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-600 focus:border-green-500 dark:bg-slate-700 dark:text-white transition"
                    placeholder="e.g., Holiday Special, Classic, Modern"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Background Color
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      className="w-full sm:w-16 h-10 rounded border-2 border-slate-200 dark:border-slate-600"
                    />
                    <input
                      type="text"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Text Color
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="color"
                      value={formData.textColor}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      className="w-full sm:w-16 h-10 rounded border-2 border-slate-200 dark:border-slate-600"
                    />
                    <input
                      type="text"
                      value={formData.textColor}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Accent Color
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="color"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                      className="w-full sm:w-16 h-10 rounded border-2 border-slate-200 dark:border-slate-600"
                    />
                    <input
                      type="text"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Font Family
                  </label>
                  <select
                    value={formData.fontFamily}
                    onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Border Style
                  </label>
                  <select
                    value={formData.borderStyle}
                    onChange={(e) => setFormData({ ...formData, borderStyle: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="circle">Circular</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
                    Preview
                  </label>
                  <div
                    className={`p-4 sm:p-8 ${formData.borderStyle === 'rounded' ? 'rounded-2xl' : formData.borderStyle === 'circle' ? 'rounded-full aspect-square flex items-center justify-center' : ''}`}
                    style={{
                      backgroundColor: formData.backgroundColor,
                      color: formData.textColor,
                      fontFamily: formData.fontFamily,
                      border: `3px solid ${formData.accentColor}`
                    }}
                  >
                    <div className="text-center">
                      <h3 className="text-lg sm:text-2xl font-bold mb-2">Gift Card</h3>
                      <p className="text-2xl sm:text-4xl font-bold my-2 sm:my-4">€100.00</p>
                      <p className="text-xs sm:text-sm opacity-80">GC-SAMPLE-CODE</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 px-4">
          <p className="text-slate-600 dark:text-slate-400 mb-4">No templates created yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border-2 border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div
                className="p-8 text-center"
                style={{
                  backgroundColor: template.design_data.backgroundColor,
                  color: template.design_data.textColor,
                  fontFamily: template.design_data.fontFamily
                }}
              >
                <h3 className="text-xl font-bold mb-2">Gift Card</h3>
                <p className="text-3xl font-bold my-3">€100.00</p>
                <p className="text-sm opacity-80">SAMPLE-CODE</p>
              </div>

              <div className="p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">{template.name}</h4>
                  <button
                    onClick={() => toggleActive(template.id, template.is_active)}
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                      template.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {template.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition flex items-center justify-center space-x-1 text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center justify-center space-x-1 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
