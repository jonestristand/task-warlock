// MCP server exposing TaskWarrior to agents. Served by src/app/api/mcp/route.ts,
// which handles authentication; nothing here is a server action.
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import { assertUuid, exportRawTasks, fetchProjects, fetchTags } from '@/lib/taskwarrior';

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

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

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
        tags: z.array(token('tag')).optional().describe('Only tasks that have ALL of these tags'),
        exclude_tags: z.array(token('tag')).optional().describe('Skip tasks with any of these tags'),
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
        // `project:home` is a plain prefix match that would also hit 'homework';
        // this matches 'home' exactly plus its sub-projects ('home.garden')
        if (args.project) {
          filter.push('(', `project.is:${args.project}`, 'or', `project:${args.project}.`, ')');
        }
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
