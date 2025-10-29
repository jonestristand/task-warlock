'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';

import AddTaskForm from '@/components/add-task/AddTaskForm';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTagsQuery } from '@/lib/task-queries';

export default function AddTaskAccordion() {
  const [value, setValue] = useState<string>('');
  const { data: tags } = useTagsQuery();

  const handleTaskAdded = () => {
    setValue(''); // Close accordion after successful task creation
  };

  return (
    <Accordion type="single" collapsible value={value} onValueChange={setValue}>
      <AccordionItem value="add-task" className="border rounded-lg">
        <AccordionTrigger className="px-6 py-4 hover:no-underline">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Add New Task</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="overflow-visible px-6 pb-6">
          <AddTaskForm tags={tags || []} onSuccess={handleTaskAdded} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
