'use client';

import * as React from 'react';

import { Check, ChevronsUpDown, X } from 'lucide-react';

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

interface TagSelectorProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  onOpenChange?: (open: boolean) => void;
}

export default function TagSelector({
  availableTags,
  selectedTags,
  onTagsChange,
  placeholder = 'Select tags...',
  onOpenChange,
}: TagSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleSelectTag = (tagValue: string) => {
    if (selectedTags.includes(tagValue)) {
      onTagsChange(selectedTags.filter(tag => tag !== tagValue));
    } else {
      onTagsChange([...selectedTags, tagValue]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleCreateTag = (newTag: string) => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag) && !availableTags.includes(trimmedTag)) {
      onTagsChange([...selectedTags, trimmedTag]);
      setInputValue('');
    }
  };

  const filteredTags = availableTags.filter(
    tag => tag.toLowerCase().includes(inputValue.toLowerCase()) && !selectedTags.includes(tag)
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Tag Selector Popover */}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between min-h-9 h-auto p-2 bg-transparent hover:bg-transparent"
          >
            <div className="flex flex-wrap gap-1 items-center flex-1 mr-2">
              {selectedTags.length > 0 ? (
                selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveTag(tag);
                        }
                      }}
                      onMouseDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveTag(tag);
                      }}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </span>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 self-center" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput
              placeholder="Search or create tags..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                {inputValue.trim() ? (
                  <div className="py-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        handleCreateTag(inputValue);
                        handleOpenChange(false);
                      }}
                    >
                      Create &ldquo;{inputValue.trim()}&rdquo;
                    </Button>
                  </div>
                ) : (
                  'No tags found.'
                )}
              </CommandEmpty>

              {filteredTags.length > 0 && (
                <CommandGroup heading="Available Tags">
                  {filteredTags.map(tag => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => {
                        handleSelectTag(tag);
                        setInputValue('');
                      }}
                    >
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
              )}

              {selectedTags.length > 0 && (
                <CommandGroup heading="Selected Tags">
                  {selectedTags.map(tag => (
                    <CommandItem
                      key={`selected-${tag}`}
                      value={tag}
                      onSelect={() => handleSelectTag(tag)}
                    >
                      <Check className="mr-2 h-4 w-4 opacity-100" />
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
