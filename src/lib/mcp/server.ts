// MCP server exposing TaskWarrior to agents. Served by src/app/api/mcp/route.ts,
// which handles authentication; nothing here is a server action.
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import { getSettings } from '@/lib/settings';
import { assertUuid, exportRawTasks, fetchProjects, fetchTags, task } from '@/lib/taskwarrior';

// TaskWarrior dates look like 20261201T153000Z; agents get ISO 8601 instead
const TW_DATE = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;

function isoDates(value: unknown): unknown {
  if (typeof value === 'string') {
    const m = TW_DATE.exec(value);
    return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : value;
  }
  if (Array.isArray(value)) return value.map(isoDates);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, isoDates(v)]));
  }
  return value;
}

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
}

// Values are always passed as a single `name:value` argument, so they can't be
// read as TaskWarrior commands; disallowing whitespace keeps them to one token
const token = (what: string) =>
  z.string().min(1).regex(/^\S+$/, `${what} must not contain whitespace`);

// Tags are passed as `+tag` / `-tag`, so they must not start with either sign
const tagName = z
  .string()
  .min(1)
  .regex(/^[^\s+-]\S*$/, 'tag must not contain whitespace or start with + or -');

// '' clears the attribute
const clearable = (what: string) => z.union([z.literal(''), token(what)]);

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const WRITE = { readOnlyHint: false, openWorldHint: false };

async function getRawTask(uuid: string): Promise<Record<string, unknown>> {
  const [found] = await exportRawTasks([uuid]);
  if (!found) throw new Error(`No task with UUID ${uuid}`);
  return found;
}

// Same behavior as the web UI: honour the app's auto-sync setting after writes
async function autoSyncIfEnabled(): Promise<void> {
  try {
    if ((await getSettings()).autoSync) await task(['sync']);
  } catch (error) {
    console.error('MCP auto-sync failed:', error);
  }
}

// Exact project match plus sub-projects; `project:home` alone also hits 'homework'
const projectFilter = (project: string) => [
  '(',
  `project.is:${project}`,
  'or',
  `project:${project}.`,
  ')',
];

interface BulkResult {
  changed: { uuid: string; description: unknown; before: unknown; after: unknown }[];
  failed: { uuid: string; description: unknown; error: string }[];
}

// Bulk edits run one validated UUID at a time: TaskWarrior's bulk prompt never
// triggers, and the result lists exactly which tasks changed
async function editEach(
  tasks: Record<string, unknown>[],
  edit: (t: Record<string, unknown>) => { args: string[]; before: unknown; after: unknown }
): Promise<BulkResult> {
  const result: BulkResult = { changed: [], failed: [] };
  for (const t of tasks) {
    const uuid = String(t.uuid);
    const { args, before, after } = edit(t);
    try {
      assertUuid(uuid);
      await task([uuid, 'modify', ...args]);
      result.changed.push({ uuid, description: t.description, before, after });
    } catch (error) {
      result.failed.push({
        uuid,
        description: t.description,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (result.changed.length) await autoSyncIfEnabled();
  return result;
}

export function buildMcpServer(): McpServer {
  const server = new McpServer({ name: 'taskwarlock', version: '1.0.0' });

  server.registerTool(
    'list_tasks',
    {
      title: 'List tasks',
      description:
        'List TaskWarrior tasks. Pending tasks are sorted by urgency (highest first), completed ' +
        'tasks by completion date (newest first). All filters are combined with AND.',
      inputSchema: z.object({
        status: z
          .enum(['pending', 'completed', 'all'])
          .default('pending')
          .describe("'all' means pending, completed and waiting; deleted tasks are never listed"),
        project: token('project')
          .optional()
          .describe("Project name; also matches sub-projects ('home' matches 'home.garden')"),
        tags: z.array(tagName).optional().describe('Only tasks that have ALL of these tags'),
        exclude_tags: z.array(tagName).optional().describe('Skip tasks with any of these tags'),
        due_before: token('due_before')
          .optional()
          .describe("TaskWarrior date: ISO date, or e.g. 'today', 'tomorrow', 'eow', 'eom', '3d'"),
        due_after: token('due_after').optional().describe('TaskWarrior date, as for due_before'),
        search: z.string().min(1).optional().describe('Text the description must contain'),
        limit: z.number().int().min(1).max(500).default(100),
      }),
      annotations: READ_ONLY,
    },
    async args => {
      try {
        const filter: string[] = [];
        if (args.status === 'all') filter.push('status.not:deleted');
        else filter.push(`status:${args.status}`);
        if (args.project) filter.push(...projectFilter(args.project));
        for (const tag of args.tags ?? []) filter.push(`+${tag}`);
        for (const tag of args.exclude_tags ?? []) filter.push(`-${tag}`);
        if (args.due_before) filter.push(`due.before:${args.due_before}`);
        if (args.due_after) filter.push(`due.after:${args.due_after}`);
        if (args.search) filter.push(`description.contains:${args.search}`);

        const tasks = await exportRawTasks(filter);
        if (args.status === 'completed') {
          tasks.sort((a, b) => String(b.end ?? '').localeCompare(String(a.end ?? '')));
        } else {
          tasks.sort((a, b) => Number(b.urgency ?? 0) - Number(a.urgency ?? 0));
        }
        return json({
          total: tasks.length,
          returned: Math.min(tasks.length, args.limit),
          tasks: isoDates(tasks.slice(0, args.limit)),
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'add_task',
    {
      title: 'Add task',
      description:
        'Create a task. New projects and tags are created simply by using them here. ' +
        'Returns the created task.',
      inputSchema: z.object({
        description: z.string().min(1).describe('Task description (stored literally)'),
        project: token('project').optional().describe("e.g. 'home' or a sub-project 'home.garden'"),
        priority: token('priority').optional().describe("Usually 'H', 'M' or 'L'"),
        tags: z.array(tagName).optional().describe('Tags without the leading +'),
        due: token('due')
          .optional()
          .describe("TaskWarrior date: ISO date/time, or e.g. 'today', 'tomorrow', 'eow', 'friday'"),
      }),
      annotations: { ...WRITE, destructiveHint: false, idempotentHint: false },
    },
    async args => {
      try {
        // new-uuid makes TaskWarrior print the UUID instead of a working-set ID
        const cmd = ['rc.verbose=new-uuid', 'add'];
        if (args.project) cmd.push(`project:${args.project}`);
        if (args.priority) cmd.push(`priority:${args.priority}`);
        if (args.due) cmd.push(`due:${args.due}`);
        for (const tag of args.tags ?? []) cmd.push(`+${tag}`);
        // `--` keeps a description like "+urgent" or "due:soon" literal
        cmd.push('--', args.description);

        const { stdout } = await task(cmd);
        const uuid = /Created task ([0-9a-f-]{36})/i.exec(stdout)?.[1];
        if (!uuid) throw new Error(`Unexpected TaskWarrior output: ${stdout}`);
        await autoSyncIfEnabled();
        return json(isoDates(await getRawTask(uuid)));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'modify_task',
    {
      title: 'Modify task',
      description:
        "Change one task's attributes. Pass '' for project, priority or due to clear it. " +
        'Returns the updated task.',
      inputSchema: z.object({
        uuid: z.string().describe('The task UUID'),
        description: z.string().min(1).optional(),
        project: clearable('project').optional(),
        priority: clearable('priority').optional(),
        due: clearable('due').optional().describe("TaskWarrior date, or '' to remove the due date"),
        add_tags: z.array(tagName).optional(),
        remove_tags: z.array(tagName).optional(),
      }),
      annotations: { ...WRITE, destructiveHint: true, idempotentHint: true },
    },
    async ({ uuid, ...changes }) => {
      try {
        assertUuid(uuid);
        const cmd: string[] = [];
        if (changes.description !== undefined) cmd.push(`description:${changes.description}`);
        if (changes.project !== undefined) cmd.push(`project:${changes.project}`);
        if (changes.priority !== undefined) cmd.push(`priority:${changes.priority}`);
        if (changes.due !== undefined) cmd.push(`due:${changes.due}`);
        for (const tag of changes.add_tags ?? []) cmd.push(`+${tag}`);
        for (const tag of changes.remove_tags ?? []) cmd.push(`-${tag}`);
        if (!cmd.length) throw new Error('No changes given');

        await getRawTask(uuid); // clear error for an unknown UUID
        await task([uuid, 'modify', ...cmd]);
        await autoSyncIfEnabled();
        return json(isoDates(await getRawTask(uuid)));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'complete_task',
    {
      title: 'Complete task',
      description: 'Mark a task as done. Can be undone with restore_task.',
      inputSchema: z.object({ uuid: z.string().describe('The task UUID') }),
      annotations: { ...WRITE, destructiveHint: false, idempotentHint: true },
    },
    async ({ uuid }) => {
      try {
        assertUuid(uuid);
        await getRawTask(uuid);
        await task([uuid, 'done']);
        const after = await getRawTask(uuid);
        if (after.status !== 'completed') {
          throw new Error(`Task is ${after.status}, not completed`);
        }
        await autoSyncIfEnabled();
        return json(isoDates(after));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'restore_task',
    {
      title: 'Restore task',
      description: 'Set a completed or deleted task back to pending.',
      inputSchema: z.object({ uuid: z.string().describe('The task UUID') }),
      annotations: { ...WRITE, destructiveHint: false, idempotentHint: true },
    },
    async ({ uuid }) => {
      try {
        assertUuid(uuid);
        await getRawTask(uuid);
        await task([uuid, 'modify', 'status:pending']);
        const after = await getRawTask(uuid);
        if (after.status !== 'pending') throw new Error(`Task is still ${after.status}`);
        await autoSyncIfEnabled();
        return json(isoDates(after));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'delete_task',
    {
      title: 'Delete task',
      description:
        'Delete one task. Deleted tasks are hidden from list_tasks but can be brought back ' +
        'with restore_task.',
      inputSchema: z.object({ uuid: z.string().describe('The task UUID') }),
      annotations: { ...WRITE, destructiveHint: true, idempotentHint: true },
    },
    async ({ uuid }) => {
      try {
        assertUuid(uuid);
        await getRawTask(uuid);
        // TaskWarrior asks to confirm every delete; the prompt would be answered
        // "no" (stdin is closed), so turn it off for this single validated UUID
        await task(['rc.confirmation=off', uuid, 'delete']);
        const after = await getRawTask(uuid);
        if (after.status !== 'deleted') throw new Error(`Task is still ${after.status}`);
        await autoSyncIfEnabled();
        return json(isoDates(after));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'annotate_task',
    {
      title: 'Annotate task',
      description: 'Add a timestamped note to a task.',
      inputSchema: z.object({
        uuid: z.string().describe('The task UUID'),
        text: z.string().min(1).describe('The note (stored literally)'),
      }),
      annotations: { ...WRITE, destructiveHint: false, idempotentHint: false },
    },
    async ({ uuid, text }) => {
      try {
        assertUuid(uuid);
        await getRawTask(uuid);
        await task([uuid, 'annotate', '--', text]);
        await autoSyncIfEnabled();
        return json(isoDates(await getRawTask(uuid)));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'rename_project',
    {
      title: 'Rename project',
      description:
        "Rename a project on every pending, waiting and completed task, keeping sub-projects " +
        "('home' -> 'house' turns 'home.garden' into 'house.garden'). Can also move a project " +
        "under another ('home' -> 'personal.home'). Returns every changed task.",
      inputSchema: z.object({ from: token('from'), to: token('to') }),
      annotations: { ...WRITE, destructiveHint: true, idempotentHint: true },
    },
    async ({ from, to }) => {
      try {
        const tasks = await exportRawTasks(['status.not:deleted', ...projectFilter(from)]);
        if (!tasks.length) throw new Error(`No tasks in project '${from}'`);
        const result = await editEach(tasks, t => {
          const before = String(t.project);
          const after = to + before.slice(from.length);
          return { args: [`project:${after}`], before, after };
        });
        return json(result);
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'rename_tag',
    {
      title: 'Rename tag',
      description:
        'Replace a tag with another on every pending, waiting and completed task that has it. ' +
        'Returns every changed task.',
      inputSchema: z.object({ from: tagName, to: tagName }),
      annotations: { ...WRITE, destructiveHint: true, idempotentHint: true },
    },
    async ({ from, to }) => {
      try {
        const tasks = await exportRawTasks(['status.not:deleted', `+${from}`]);
        if (!tasks.length) throw new Error(`No tasks tagged '${from}'`);
        return json(
          await editEach(tasks, () => ({ args: [`+${to}`, `-${from}`], before: from, after: to }))
        );
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'remove_tag',
    {
      title: 'Remove tag',
      description:
        'Remove a tag from every pending, waiting and completed task that has it. ' +
        'Returns every changed task.',
      inputSchema: z.object({ tag: tagName }),
      annotations: { ...WRITE, destructiveHint: true, idempotentHint: true },
    },
    async ({ tag }) => {
      try {
        const tasks = await exportRawTasks(['status.not:deleted', `+${tag}`]);
        if (!tasks.length) throw new Error(`No tasks tagged '${tag}'`);
        return json(await editEach(tasks, () => ({ args: [`-${tag}`], before: tag, after: null })));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'sync',
    {
      title: 'Sync',
      description: 'Run `task sync` against the configured TaskWarrior sync server.',
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async () => {
      try {
        const { stdout, stderr } = await task(['sync']);
        return { content: [{ type: 'text' as const, text: (stdout || stderr || 'Sync complete').trim() }] };
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'get_task',
    {
      title: 'Get task',
      description: 'Get one task by UUID, including its annotations.',
      inputSchema: z.object({ uuid: z.string().describe('The task UUID') }),
      annotations: READ_ONLY,
    },
    async ({ uuid }) => {
      try {
        assertUuid(uuid);
        const [found] = await exportRawTasks([uuid]);
        if (!found) return toolError(new Error(`No task with UUID ${uuid}`));
        return json(isoDates(found));
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description:
        'List project names in use. Projects exist only as an attribute of tasks, so a new ' +
        'project is created simply by adding or modifying a task with it.',
      annotations: READ_ONLY,
    },
    async () => {
      try {
        return json(await fetchProjects());
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'list_tags',
    {
      title: 'List tags',
      description:
        'List tags in use. Tags exist only on tasks, so a new tag is created simply by adding ' +
        'or modifying a task with it.',
      annotations: READ_ONLY,
    },
    async () => {
      try {
        return json(await fetchTags());
      } catch (error) {
        return toolError(error);
      }
    }
  );

  return server;
}
