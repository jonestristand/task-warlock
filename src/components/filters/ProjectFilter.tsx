'use client';

import { FolderOpen } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectFilterProps {
  projects: string[];
  selectedProject: string | null;
  onProjectChange: (project: string | null) => void;
}

export default function ProjectFilter({
  projects,
  selectedProject,
  onProjectChange,
}: ProjectFilterProps) {
  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onProjectChange(null);
    } else {
      onProjectChange(value);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <FolderOpen className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedProject || 'all'} onValueChange={handleValueChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          <SelectItem value="no-project">No Project</SelectItem>
          {projects.length > 0 && (
            <div className="border-t border-border my-1" />
          )}
          {projects.map(project => (
            <SelectItem key={project} value={project}>
              {project}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
