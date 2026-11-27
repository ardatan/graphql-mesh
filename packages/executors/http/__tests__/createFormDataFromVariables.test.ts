import { File, FormData } from '@whatwg-node/fetch';
import { createFormDataFromVariables } from '../src/createFormDataFromVariables.js';

const opts = { File, FormData };

function formMap(form: unknown) {
  expect(form).toBeInstanceOf(FormData);
  return JSON.parse((form as FormData).get('map') as string);
}

describe('createFormDataFromVariables', () => {
  it('sends JSON when no variable has a file', () => {
    const body = {
      query: '{ a }',
      variables: {
        representations: Array.from({ length: 50 }, (_, i) => ({
          __typename: 'User',
          id: String(i),
          tags: ['a', 'b'],
          nested: { deep: [{ n: i, ok: true, none: null }] },
        })),
        id: '1',
      },
    };
    expect(createFormDataFromVariables(body, opts)).toBe(JSON.stringify(body));
  });

  it('finds files nested in lists and plain objects', async () => {
    const file = new File(['x'], 'a.txt');
    const form = await createFormDataFromVariables(
      {
        query: 'mutation($input: Input) { upload(input: $input) }',
        variables: {
          input: { name: 'n', files: [{ file }, { file: null }] },
        },
      },
      opts,
    );
    expect(formMap(form)).toEqual({ 0: ['variables.input.files.0.file'] });
  });

  it('does not look into class instances, like extract-files', () => {
    class Holder {
      file = new File(['x'], 'a.txt');
    }
    const body = { query: '{ a }', variables: { holder: new Holder() } };
    expect(createFormDataFromVariables(body, opts)).toBe(JSON.stringify(body));
  });

  it('keeps ordinary input objects with truthy then/promise fields in JSON', async () => {
    const result = createFormDataFromVariables(
      {
        query: 'mutation ($input: Input!) { create(input: $input) }',
        variables: {
          input: {
            then: 'not-a-function',
            promise: 'also-not-thenable',
            name: 'ordinary',
          },
        },
      },
      {},
    );
    expect(typeof result).toBe('string');
    const parsed = JSON.parse(result as string);
    expect(parsed.variables.input.name).toBe('ordinary');
    expect(parsed.variables.input.then).toBe('not-a-function');
  });

  it('extracts direct GraphQL upload wrappers', async () => {
    const chunks = [Buffer.from('AB'), Buffer.from('CD')];
    async function* stream() {
      for (const chunk of chunks) {
        yield chunk;
      }
    }
    const upload = {
      filename: 'test.txt',
      mimetype: 'text/plain',
      createReadStream: () => stream(),
    };
    const form = await createFormDataFromVariables(
      {
        query: 'mutation ($file: Upload!) { upload(file: $file) }',
        variables: { file: upload },
      },
      {},
    );
    expect(form && typeof (form as any).get === 'function').toBe(true);
    const file = (form as FormData).get('0') as File;
    expect(file).toBeTruthy();
    const bytes = Buffer.from(await file.arrayBuffer());
    expect(bytes.toString('utf8')).toBe('ABCD');
  });

  it('preserves bytes from each upload chunk for async iterables', async () => {
    async function* stream() {
      yield Buffer.from('AB');
      yield Buffer.from('CD');
    }
    const form = await createFormDataFromVariables(
      {
        query: 'mutation ($file: Upload!) { upload(file: $file) }',
        variables: { file: stream() },
      },
      {},
    );
    const file = (form as FormData).get('0') as File;
    const bytes = Buffer.from(await file.arrayBuffer());
    expect(bytes.toString('utf8')).toBe('ABCD');
  });
});
