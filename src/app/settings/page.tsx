'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import {
  getSettingsAction,
  getSettingsFilePathAction,
  updateSettingsAction,
} from '@/lib/settings-actions';
import { useUrgencyConfigQuery } from '@/lib/task-queries';
import { themes } from '@/lib/themes';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Theme } from '@/components/providers/ThemeProvider';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettingsAction,
  });

  // Fetch settings file path
  const { data: settingsFilePath } = useQuery({
    queryKey: ['settings-file-path'],
    queryFn: getSettingsFilePathAction,
  });

  // Urgency is configured in TaskWarrior (.taskrc); shown read-only here
  const { data: urgencyConfig, isError: urgencyError } = useUrgencyConfigQuery();

  // Local form state - initialize with settings or defaults
  const [formData, setFormData] = useState({
    autoSync: settings?.autoSync ?? false,
    theme: settings?.theme ?? 'catppuccin-mocha',
    defaultPageSize: settings?.defaultPageSize ?? 20,
  });

  // Update form data when settings load (only once when settings become available)
  useEffect(() => {
    if (settings) {
      setFormData({
        autoSync: settings.autoSync,
        theme: settings.theme,
        defaultPageSize: settings.defaultPageSize,
      });
    }
  }, [settings]);

  // Mutation to update settings
  const updateMutation = useMutation({
    mutationFn: updateSettingsAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleReset = () => {
    if (settings) {
      setFormData({
        autoSync: settings.autoSync,
        theme: settings.theme,
        defaultPageSize: settings.defaultPageSize,
      });
    }
  };

  const hasChanges =
    settings &&
    (formData.autoSync !== settings.autoSync ||
      formData.theme !== settings.theme ||
      formData.defaultPageSize !== settings.defaultPageSize);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure TaskWarlock application settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* TaskWarrior Sync Settings */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">TaskWarrior Sync</h2>
            <p className="text-sm text-muted-foreground">
              Control when TaskWarrior synchronizes with remote server
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="auto-sync" className="text-base cursor-pointer">
                Auto-sync after modifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically run <code className="text-xs">task sync</code> after adding,
                modifying, or completing tasks
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={formData.autoSync}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, autoSync: checked }))}
            />
          </div>
        </div>

        {/* Theme Settings */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Appearance</h2>
            <p className="text-sm text-muted-foreground">Customize the default look and feel</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Default Theme</Label>
            <Select value={formData.theme} onValueChange={value => setFormData(prev => ({ ...prev, theme: value as Theme }))}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select a theme..." />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Light Themes
                </div>
                {themes
                  .filter(t => t.type === 'light')
                  .map(theme => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.emoji} {theme.name}
                    </SelectItem>
                  ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                  Dark Themes
                </div>
                {themes
                  .filter(t => t.type === 'dark')
                  .map(theme => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.emoji} {theme.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Default theme for new sessions. Current theme is saved in your browser. Use the theme
              selector in the header to change it.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-size">Default Page Size</Label>
            <Select 
              value={formData.defaultPageSize.toString()} 
              onValueChange={value => setFormData(prev => ({ ...prev, defaultPageSize: parseInt(value) }))}
            >
              <SelectTrigger id="page-size" className="max-w-xs">
                <SelectValue placeholder="Select page size..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 items per page</SelectItem>
                <SelectItem value="20">20 items per page</SelectItem>
                <SelectItem value="50">50 items per page</SelectItem>
                <SelectItem value="100">100 items per page</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Number of tasks to display per page in the task table.
            </p>
          </div>
        </div>

        {/* Urgency (read-only, from TaskWarrior) */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Urgency Calculation</h2>
            <p className="text-sm text-muted-foreground">
              Urgency is calculated by TaskWarrior. To change these values, set the{' '}
              <code className="text-xs">urgency.*</code> options in your{' '}
              <code className="text-xs">.taskrc</code>.
            </p>
          </div>

          {urgencyError ? (
            <p className="text-sm text-destructive">Could not read urgency settings from TaskWarrior.</p>
          ) : !urgencyConfig ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {[
                ['Next tag', 'urgency.user.tag.next.coefficient', urgencyConfig.coefficients.next],
                ['Due date', 'urgency.due.coefficient', urgencyConfig.coefficients.due],
                ['High priority', 'urgency.uda.priority.H.coefficient', urgencyConfig.coefficients.priorityH],
                ['Medium priority', 'urgency.uda.priority.M.coefficient', urgencyConfig.coefficients.priorityM],
                ['Low priority', 'urgency.uda.priority.L.coefficient', urgencyConfig.coefficients.priorityL],
                ['Task age', 'urgency.age.coefficient', urgencyConfig.coefficients.age],
                ['Maximum age (days)', 'urgency.age.max', urgencyConfig.ageMax],
                ['Tags', 'urgency.tags.coefficient', urgencyConfig.coefficients.tags],
                ['Project', 'urgency.project.coefficient', urgencyConfig.coefficients.project],
              ].map(([label, key, value]) => (
                <div key={key} className="flex items-baseline justify-between gap-4 border-b py-1.5">
                  <dt>
                    {label}
                    <span className="block text-xs text-muted-foreground font-mono">{key}</span>
                  </dt>
                  <dd className="font-mono tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4">
          <Button type="submit" disabled={!hasChanges || updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || updateMutation.isPending}
          >
            Reset
          </Button>
          {updateMutation.isSuccess && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Settings saved successfully!
            </span>
          )}
          {updateMutation.isError && (
            <span className="text-sm text-red-600 dark:text-red-400">
              Error saving settings. Please try again.
            </span>
          )}
        </div>
      </form>

      {/* Debug Info - only show in development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-12 pt-6 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Debug Information</h3>
          <p className="text-xs text-muted-foreground font-mono">
            Settings file: {settingsFilePath || 'Loading...'}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Environment: {process.env.NODE_ENV}
          </p>
        </div>
      )}
    </div>
  );
}
