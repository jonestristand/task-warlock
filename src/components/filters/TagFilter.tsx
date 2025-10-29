'use client';

import * as React from 'react';

import { Check, ChevronsUpDown, Tag, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TagFilterProps {
  tags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function TagFilter({
  tags,
  selectedTags,
  onTagsChange,
}: TagFilterProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelectTag = (tagValue: string) => {
    if (selectedTags.includes(tagValue)) {
      onTagsChange(selectedTags.filter(tag => tag !== tagValue));
    } else {
      onTagsChange([...selectedTags, tagValue]);
    }
  };

  const handleRemoveTag = (tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange([]);
  };

  return (
    <div className="flex items-center gap-2">
      <Tag className="w-4 h-4 text-muted-foreground" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-[200px] justify-between h-9 p-2"
          >
            <div className="flex flex-wrap gap-1 items-center flex-1 mr-2 min-w-0">
              {selectedTags.length === 0 ? (
                <span className="text-muted-foreground text-sm">Filter by tags...</span>
              ) : (
                selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <span
                      onClick={(e) => handleRemoveTag(tag, e)}
                      className="ml-1 hover:text-destructive cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {tags.map(tag => (
                  <CommandItem key={tag} value={tag} onSelect={() => handleSelectTag(tag)}>
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedTags.includes(tag) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {tag}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
