import { createFormDataFromVariables } from '../src/createFormDataFromVariables.js';

describe('createFormDataFromVariables', () => {
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
