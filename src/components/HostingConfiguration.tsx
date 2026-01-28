import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Server, CheckCircle, XCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

interface HostingConfig {
  id?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: 'ftp' | 'sftp';
  remote_path: string;
  last_upload_at?: string;
}

interface HostingConfigurationProps {
  onConfigChange?: (hasConfig: boolean) => void;
}

export default function HostingConfiguration({ onConfigChange }: HostingConfigurationProps) {
  const [config, setConfig] = useState<HostingConfig>({
    host: '',
    port: 21,
    username: '',
    password: '',
    protocol: 'ftp',
    remote_path: '/',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('hosting_configuration')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading configuration:', error);
        return;
      }

      if (data) {
        setConfig({
          id: data.id,
          host: data.host,
          port: data.port,
          username: data.username,
          password: '',
          protocol: data.protocol,
          remote_path: data.remote_path || '/',
          last_upload_at: data.last_upload_at,
        });
        onConfigChange?.(true);
      } else {
        onConfigChange?.(false);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProtocolChange = (protocol: 'ftp' | 'sftp') => {
    setConfig({
      ...config,
      protocol,
      port: protocol === 'ftp' ? 21 : 22,
    });
  };


  const testConnection = async () => {
    if (!config.host || !config.username || !config.password) {
      setTestResult({
        success: false,
        message: 'Please fill in host, username, and password fields',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // First save the configuration with the password
      const saveResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-hosting`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'save',
            configData: {
              host: config.host,
              port: config.port,
              username: config.username,
              password: config.password,
              protocol: config.protocol,
              remote_path: config.remote_path,
            },
          }),
        }
      );

      const saveResult = await saveResponse.json();
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save configuration');
      }

      // Now test the connection
      const testResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-hosting`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'test' }),
        }
      );

      const testResult = await testResponse.json();

      if (testResult.success) {
        setTestResult({
          success: true,
          message: 'Connection successful! Your credentials are working.',
        });
        setConfig({ ...config, id: saveResult.config.id });
      } else {
        setTestResult({
          success: false,
          message: testResult.error || 'Connection failed',
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfiguration = async () => {
    if (!config.host || !config.username || !config.password) {
      setSaveMessage({
        type: 'error',
        text: 'Please fill in all required fields',
      });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-hosting`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'save',
            configData: {
              host: config.host,
              port: config.port,
              username: config.username,
              password: config.password,
              protocol: config.protocol,
              remote_path: config.remote_path,
            },
          }),
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      setConfig({ ...config, id: result.config.id });
      setSaveMessage({
        type: 'success',
        text: 'Configuration saved successfully!',
      });
      onConfigChange?.(true);

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      setSaveMessage({
        type: 'error',
        text: error.message || 'Failed to save configuration',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Server className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Hosting Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure FTP or SFTP credentials to upload files to your web server
          </p>
        </div>
      </div>

      {config.last_upload_at && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            Last upload: {new Date(config.last_upload_at).toLocaleString()}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Protocol
          </label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="protocol"
                value="ftp"
                checked={config.protocol === 'ftp'}
                onChange={() => handleProtocolChange('ftp')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">FTP</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="protocol"
                value="sftp"
                checked={config.protocol === 'sftp'}
                onChange={() => handleProtocolChange('sftp')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">SFTP (Secure)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Host Address *
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="ftp.example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port *
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 21 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username *
          </label>
          <input
            type="text"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
            placeholder="username"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              placeholder={config.id ? 'Leave empty to keep current password' : 'password'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remote Directory Path
          </label>
          <input
            type="text"
            value={config.remote_path}
            onChange={(e) => setConfig({ ...config, remote_path: e.target.value })}
            placeholder="/public_html or /www"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            The directory where files will be uploaded. Use / for root directory.
          </p>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-md border ${
              testResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <p
                className={`text-sm ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {testResult.message}
              </p>
            </div>
          </div>
        )}

        {saveMessage && (
          <div
            className={`p-3 rounded-md border ${
              saveMessage.type === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <p
              className={`text-sm ${
                saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {saveMessage.text}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={testConnection}
            disabled={isTesting || !config.host || !config.username || !config.password}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>

          <button
            onClick={saveConfiguration}
            disabled={isSaving || !config.host || !config.username || !config.password}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
