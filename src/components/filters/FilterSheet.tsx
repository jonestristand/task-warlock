'use client';

import { useState } from 'react';

import { Filter } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import ProjectFilter from './ProjectFilter';
import TagFilter from './TagFilter';

interface FilterSheetProps {
  projects: string[];
  tags: string[];
  selectedProject: string | null;
  selectedTags: string[];
  showCompleted: boolean;
  onProjectChange: (project: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  onShowCompletedChange: (show: boolean) => void;
}

export default function FilterSheet({
  projects,
  tags,
  selectedProject,
  selectedTags,
  showCompleted,
  onProjectChange,
  onTagsChange,
  onShowCompletedChange,
}: FilterSheetProps) {
  const [open, setOpen] = useState(false);

  // Calculate active filter count
  const activeFilterCount = (selectedProject ? 1 : 0) + selectedTags.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="px-6 pb-12comm">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Filter tasks by project, tags, and completion status
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Show Completed Toggle */}
          <div>
            <h3 className="text-sm font-medium mb-3">Status</h3>
            <Button
              variant={showCompleted ? 'default' : 'outline'}
              size="sm"
              onClick={() => onShowCompletedChange(!showCompleted)}
              className="w-full"
            >
              {showCompleted ? 'Show Pending' : 'Show Completed'}
            </Button>
          </div>

          {/* Project Filter */}
          <div>
            <h3 className="text-sm font-medium mb-3">Project</h3>
            <ProjectFilter
              projects={projects}
              selectedProject={selectedProject}
              onProjectChange={onProjectChange}
            />
          </div>

          {/* Tag Filter */}
          <div>
            <h3 className="text-sm font-medium mb-3">Tags</h3>
            <TagFilter tags={tags} selectedTags={selectedTags} onTagsChange={onTagsChange} />
          </div>

          {/* Clear All Button */}
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onProjectChange(null);
                onTagsChange([]);
              }}
              className="w-full"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
