'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { themes } from '@/lib/themes';

// Helper component to get CSS variable values from a specific theme id
function getThemeColors(themeId: string) {
  if (typeof window === 'undefined') {
    // Return empty object for SSR
    return {
      background: '',
      foreground: '',
      primary: '',
      secondary: '',
      red: '',
      green: '',
      yellow: '',
    };
  }

  // Create a temporary element with the theme class
  const tempEl = document.createElement('div');
  tempEl.className = `theme-${themeId}`;
  tempEl.style.display = 'none';
  document.body.appendChild(tempEl);

  const styles = window.getComputedStyle(tempEl);
  const colors = {
    background: styles.getPropertyValue('--background').trim(),
    foreground: styles.getPropertyValue('--foreground').trim(),
    primary: styles.getPropertyValue('--primary').trim(),
    secondary: styles.getPropertyValue('--secondary').trim(),
    red: styles.getPropertyValue('--color-danger').trim(),
    green: styles.getPropertyValue('--color-success').trim(),
    yellow: styles.getPropertyValue('--color-warning').trim(),
  };

  document.body.removeChild(tempEl);
  return colors;
}

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = themes.find(t => t.id === theme);

  // Sort themes: light themes first, then dark themes, alphabetically within each group
  const sortedThemes = [...themes].sort((a, b) => {
    // First sort by type (light before dark)
    if (a.type !== b.type) {
      return a.type === 'light' ? -1 : 1;
    }
    // Then sort alphabetically by name within the same type
    return a.name.localeCompare(b.name);
  });

  // Return a placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger>
        <SelectValue>
          <div className="flex items-center gap-2 min-w-0">
            {currentTheme?.icon ? (
              <Image
                src={`/theme-icons/${currentTheme.icon}`}
                alt={currentTheme.name}
                width={22}
                height={22}
                className="shrink-0"
              />
            ) : (
              <span className="shrink-0">{currentTheme?.emoji}</span>
            )}
            <span className="truncate">{currentTheme?.name}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortedThemes.map(themeOption => {
          const colors = getThemeColors(themeOption.id);
          
          return (
            <SelectItem 
              key={themeOption.id} 
              value={themeOption.id}
              hideIndicator
              className={theme === themeOption.id ? 'bg-primary/10 data-[state=checked]:bg-primary/10' : ''}
            >
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-2">
                  {themeOption.icon ? (
                    <Image
                      src={`/theme-icons/${themeOption.icon}`}
                      alt={themeOption.name}
                      width={24}
                      height={24}
                    />
                  ) : (
                    <span className="text-lg">{themeOption.emoji}</span>
                  )}
                  <span className="font-medium">{themeOption.name}</span>
                  <Badge
                    variant={themeOption.type === 'dark' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {themeOption.type}
                  </Badge>
                </div>
                <div
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md w-[175px] theme-${themeOption.id}`}
                  style={{ backgroundColor: colors.background || `var(--background)` }}
                >
                  <div
                    className="w-3 h-3 rounded-sm ring-1 ring-black/20"
                    style={{ backgroundColor: colors.foreground || `var(--foreground)` }}
                    title="Foreground"
                  />
                  <div
                    className="w-3 h-3 rounded-sm ring-1 ring-black/20"
                    style={{ backgroundColor: colors.primary || `var(--primary)` }}
                    title="Primary"
                  />
                  <div
                    className="w-3 h-3 rounded-sm ring-1 ring-black/20"
                    style={{ backgroundColor: colors.secondary || `var(--secondary)` }}
                    title="Secondary"
                  />
                  <div
                    className="w-3 h-3 rounded-sm ring-1 ring-black/20"
                    style={{ backgroundColor: colors.red || `var(--color-danger)` }}
                    title="Red"
                  />
                  <div
                    className="w-3 h-3 rounded-sm ring-1 ring-black/20"
                    style={{ backgroundColor: colors.green || `var(--color-success)` }}
                    title="Green"
                  />
                  <div
                    className="w-3 h-3 rounded-sm ring-1 ring-black/20"
                    style={{ backgroundColor: colors.yellow || `var(--color-warning)` }}
                    title="Yellow"
                  />
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
