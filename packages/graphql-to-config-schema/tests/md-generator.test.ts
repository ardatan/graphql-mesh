import { buildSchema } from 'graphql';
import { generatedMarkdown, transformTypeToMdFormat } from '../src/md-generator';

describe('transformTypeToMdFormat recursion', () => {
  it('emits a finite reference for direct recursive object types', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @md on OBJECT
      type Tree @md {
        child: Tree
      }
    `);
    const tree = schema.getType('Tree')!;
    const md = transformTypeToMdFormat(tree as any);
    expect(md).toContain('Object (`Tree`)');
    expect(md).not.toMatch(/(Object \(`Tree`\).*){5}/s);
  });

  it('does not stack-overflow on recursive unions (Tree → TreeOrLeaf → Tree)', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @md on OBJECT
      union TreeOrLeaf = Tree | Leaf
      type Leaf {
        name: String
      }
      type Tree @md {
        child: TreeOrLeaf
      }
    `);

    const tree = schema.getType('Tree')!;
    expect(() => transformTypeToMdFormat(tree as any)).not.toThrow();
    const md = transformTypeToMdFormat(tree as any);
    expect(md).toContain('Object (`Tree`)');
    expect(md).toContain('String');

    // generatedMarkdown entry point must also stay finite.
    const files = generatedMarkdown(schema);
    expect(files).toHaveLength(1);
    expect(files[0].content).toContain('Object (`Tree`)');
  });
});
