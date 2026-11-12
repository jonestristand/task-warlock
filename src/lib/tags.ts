// Tag rules shared by the web UI, the server actions and the MCP tools.
//
// TaskWarrior's command-line parser only reads `+tag` / `-tag` as a tag when
// the tag doesn't start with a digit and doesn't contain : / - + (tested on
// 3.4.2; 3.5 also accepts -). Anything else silently becomes description
// text: on add it is prepended to the description, and on modify it REPLACES
// the whole description. Commas parse, but TaskWarrior lists tags
// comma-separated, so they would read back as two tags.

/** Why a tag can't be used, or null if it's fine. */
export function tagProblem(tag: string): string | null {
  if (!tag) return 'Tag is empty';
  if (/\s/.test(tag)) return `Tag "${tag}" can't contain spaces`;
  if (/^\d/.test(tag)) {
    return `Tag "${tag}" can't start with a digit; move the digits later (e.g. "print3d" instead of "3dprint")`;
  }
  const bad = /[:/+,-]/.exec(tag);
  if (bad) return `Tag "${tag}" can't contain "${bad[0]}"`;
  return null;
}

/** Throws with the first problem found in a list of tags. */
export function assertValidTags(tags: string[]): void {
  for (const tag of tags) {
    const problem = tagProblem(tag);
    if (problem) throw new Error(problem);
  }
}
