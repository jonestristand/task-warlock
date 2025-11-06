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
import { themes } from '@/lib/themes';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  // Local form state - initialize with settings or defaults
  const [formData, setFormData] = useState({
    autoSync: settings?.autoSync ?? false,
    theme: settings?.theme ?? 'catppuccin-mocha',
    defaultPageSize: settings?.defaultPageSize ?? 20,
    urgencyAgeMax: settings?.urgencyAgeMax ?? 365,
    urgencyCoefficients: settings?.urgencyCoefficients ?? {
      next: 15.0,
      due: 12.0,
      priorityH: 6.0,
      priorityM: 3.9,
      priorityL: 1.8,
      age: 2.0,
      tags: 1.0,
      project: 1.0,
    },
  });

  // Update form data when settings load (only once when settings become available)
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        autoSync: settings.autoSync,
        theme: settings.theme,
        defaultPageSize: settings.defaultPageSize,
        urgencyAgeMax: settings.urgencyAgeMax,
        urgencyCoefficients: settings.urgencyCoefficients,
      }));
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
        urgencyAgeMax: settings.urgencyAgeMax,
        urgencyCoefficients: settings.urgencyCoefficients,
      });
    }
  };

  const hasChanges =
    settings &&
    (formData.autoSync !== settings.autoSync ||
      formData.theme !== settings.theme ||
      formData.defaultPageSize !== settings.defaultPageSize ||
      formData.urgencyAgeMax !== settings.urgencyAgeMax ||
      JSON.stringify(formData.urgencyCoefficients) !==
        JSON.stringify(settings.urgencyCoefficients));

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

        {/* Urgency Calculation Settings */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Urgency Calculation</h2>
            <p className="text-sm text-muted-foreground">
              Configure how task urgency is calculated
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency-age-max">Maximum Age (days)</Label>
            <Input
              id="urgency-age-max"
              type="number"
              min="1"
              max="3650"
              value={formData.urgencyAgeMax}
              onChange={e =>
                setFormData(prev => ({ ...prev, urgencyAgeMax: parseInt(e.target.value) || 365 }))
              }
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              Tasks older than this age (in days) will reach maximum age urgency. Default: 365
              days
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <div>
              <h3 className="text-base font-semibold mb-1">Urgency Coefficients</h3>
              <p className="text-sm text-muted-foreground">
                Adjust the weight of each factor in urgency calculation
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Next Tag */}
              <div className="space-y-2">
                <Label htmlFor="coeff-next">Next Tag</Label>
                <Input
                  id="coeff-next"
                  type="number"
                  step="0.1"
                  value={formData.urgencyCoefficients.next}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      urgencyCoefficients: {
                        ...prev.urgencyCoefficients,
                        next: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Boost for tasks tagged with &quot;next&quot; (default: 15.0)
                </p>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="coeff-due">Due Date</Label>
                <Input
                  id="coeff-due"
                  type="number"
                  step="0.1"
                  value={formData.urgencyCoefficients.due}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      urgencyCoefficients: {
                        ...prev.urgencyCoefficients,
                        due: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Weight for due date proximity (default: 12.0)
                </p>
              </div>

              {/* High Priority */}
              <div className="space-y-2">
                <Label htmlFor="coeff-priority-h">High Priority</Label>
                <Input
                  id="coeff-priority-h"
                  type="number"
                  step="0.1"
                  value={formData.urgencyCoefficients.priorityH}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      urgencyCoefficients: {
                        ...prev.urgencyCoefficients,
                        priorityH: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">Priority: High (default: 6.0)</p>
              </div>

              {/* Medium Priority */}
              <div className="space-y-2">
                <Label htmlFor="coeff-priority-m">Medium Priority</Label>
                <Input
                  id="coeff-priority-m"
                  type="number"
                  step="0.1"
                  value={formData.urgencyCoefficients.priorityM}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      urgencyCoefficients: {
                        ...prev.urgencyCoefficients,
                        priorityM: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">Priority: Medium (default: 3.9)</p>
              </div>

              {/* Low Priority */}
              <div className="space-y-2">
                <Label htmlFor="coeff-priority-l">Low Priority</Label>
                <Input
                  id="coeff-priority-l"
                  type="number"
                  step="0.1"
                  value={formData.urgencyCoefficients.priorityL}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      urgencyCoefficients: {
                        ...prev.urgencyCoefficients,
                        priorityL: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">Priority: Low (default: 1.8)</p>
              </div>

              {/* Age */}
              <div className="space-y-2">
                <Label htmlFor="coeff-age">Task Age</Label>
                <Input
                  id="coeff-age"
                  type="number"
                  step="0.1"
                  value={formData.urgencyCoefficients.age}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      urgencyCoefficients: {
                        ...prev.urgencyCoefficients,
                        age: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Weight for task age (default: 2.0)
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="coeff-tags">Tags</Label>
                <Input
                  id="coeff-tags"
                  type="number"
                  step="0.1"
                  value={formData.urgencyCoefficients.tags}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      urgencyCoefficients: {
                        ...prev.urgencyCoefficients,
                        tags: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Weight for having tags (default: 1.0)
                </p>
              </div>

              {/* Project */}
              <div className="space-y-2">
                <Label htmlFor="coeff-project">Project</Label>
                <Input
                  id="coeff-project"
                  type="number"
                  step="0.1"
                  value={formData.urgencyCoefficients.project}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      urgencyCoefficients: {
                        ...prev.urgencyCoefficients,
                        project: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Weight for having a project (default: 1.0)
                </p>
              </div>
            </div>
          </div>
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
