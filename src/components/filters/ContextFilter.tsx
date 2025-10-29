'use client';

import { useState } from 'react';

import { Layers } from 'lucide-react';

//import { setTaskContext } from '@/lib/actions';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContextFilterProps {
  contexts: string[];
  currentContext: string | null;
}

export default function ContextFilter({ contexts, currentContext }: ContextFilterProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleContextChange = async (value: string) => {
    setIsChanging(true);
    try {
      const contextToSet = value === 'none' ? undefined : value;
      //await setTaskContext({ context: contextToSet });
    } catch (error) {
      console.error('Failed to change context:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Layers className="w-4 h-4 text-muted-foreground" />
      <Select
        value={currentContext || 'none'}
        onValueChange={handleContextChange}
        disabled={isChanging}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select context" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Context</SelectItem>
          {contexts.map(context => (
            <SelectItem key={context} value={context}>
              {context}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isChanging && (
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
