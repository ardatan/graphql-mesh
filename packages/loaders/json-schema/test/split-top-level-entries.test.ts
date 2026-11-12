import {
  dropUnmappedArgEntries,
  splitTopLevelEntries,
} from '../src/addExecutionLogicToComposer.js';

describe('splitTopLevelEntries', () => {
  it('keeps commas inside nested method calls', () => {
    expect(splitTopLevelEntries('a: $args.a->joinNotNull(","), b: $this.id')).toEqual([
      'a: $args.a->joinNotNull(",")',
      'b: $this.id',
    ]);
  });

  it('splits newline-separated entries', () => {
    expect(splitTopLevelEntries('a: $args.a\nb: $this.id\nc: $("x")')).toEqual([
      'a: $args.a',
      'b: $this.id',
      'c: $("x")',
    ]);
  });

  it('keeps commas inside quoted strings', () => {
    expect(splitTopLevelEntries('tag: $("a,b"), id: $this.id')).toEqual([
      'tag: $("a,b")',
      'id: $this.id',
    ]);
  });
});

describe('dropUnmappedArgEntries', () => {
  it('keeps rewritten entries and joinNotNull commas when dropping leftover $args', () => {
    expect(
      dropUnmappedArgEntries(`{
  tags: $this.tags->joinNotNull(",")
  limit: $args.limit
  owner: $this.owner
}`),
    ).toBe(`{
  tags: $this.tags->joinNotNull(",")
  owner: $this.owner
}`);
  });
});
