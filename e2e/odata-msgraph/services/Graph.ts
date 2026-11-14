import { readFileSync } from 'fs';
import { createServer } from 'http';
import { join } from 'path';
import { Opts } from '@e2e/opts';

const metadata = readFileSync(join(process.cwd(), 'fixtures/metadata.xml'), 'utf8');

const me = {
  id: 'user-ada',
  displayName: 'Ada Lovelace',
  mail: 'ada@example.com',
  officeLocation: 'London',
  '@odata.type': '#microsoft.graph.user',
};

const messages = {
  value: [
    {
      id: 'msg-1',
      subject: 'Analytical Engine notes',
      isRead: false,
      from: {
        emailAddress: {
          name: 'Charles Babbage',
          address: 'charles@example.com',
        },
      },
    },
    {
      id: 'msg-2',
      subject: 'Punch card revisions',
      isRead: true,
      from: {
        emailAddress: {
          name: 'Mary Somerville',
          address: 'mary@example.com',
        },
      },
    },
    {
      id: 'msg-3',
      subject: 'Dinner next week?',
      isRead: true,
      from: {
        emailAddress: {
          name: 'Michael Faraday',
          address: 'michael@example.com',
        },
      },
    },
  ],
};

const groups = {
  value: [
    {
      id: 'group-1',
      displayName: 'Royal Society',
      description: 'Natural philosophers',
      '@odata.type': '#microsoft.graph.group',
    },
  ],
};

const groupMembers = {
  value: [
    {
      id: 'user-ada',
      displayName: 'Ada Lovelace',
      '@odata.type': '#microsoft.graph.user',
    },
    {
      id: 'user-charles',
      displayName: 'Charles Babbage',
      '@odata.type': '#microsoft.graph.user',
    },
  ],
};

const drives = {
  value: [
    {
      id: 'drive-1',
      quota: { used: 1024, remaining: 10_485_760 },
    },
  ],
};

const driveRoot = {
  id: 'root-1',
  name: 'root',
  size: 0,
  lastModifiedDateTime: '2024-01-01T00:00:00Z',
  webUrl: 'https://example.com/drive/root',
};

const driveChildren = {
  value: [
    {
      id: 'item-1',
      name: 'notes.txt',
      size: 42,
      lastModifiedDateTime: '2024-02-01T12:00:00Z',
      webUrl: 'https://example.com/drive/notes.txt',
    },
    {
      id: 'item-2',
      name: 'diagrams',
      size: 0,
      lastModifiedDateTime: '2024-02-02T12:00:00Z',
      webUrl: 'https://example.com/drive/diagrams',
    },
    {
      id: 'item-3',
      name: 'readme.md',
      size: 128,
      lastModifiedDateTime: '2024-02-03T12:00:00Z',
      webUrl: 'https://example.com/drive/readme.md',
    },
  ],
};

/** When Hive `$expand`s, return nested payloads so prefer-embedded can skip child HTTP. */
function meWithExpand(expand: string | null) {
  const body: Record<string, unknown> = { ...me };
  if (!expand) return body;
  const parts = expand.split(',').map(s => s.trim().split('(')[0]);
  if (parts.includes('messages')) body.messages = messages.value;
  if (parts.includes('drives')) {
    body.drives = drives.value.map(d => ({
      ...d,
      root: {
        ...driveRoot,
        children: driveChildren.value,
      },
    }));
  }
  return body;
}

function groupWithExpand(expand: string | null) {
  const group = groups.value[0];
  if (expand?.includes('members')) {
    return { ...group, members: groupMembers.value };
  }
  return group;
}

const port = Opts(process.argv).getServicePort('Graph');

function json(res: import('http').ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function requireBearer(req: import('http').IncomingMessage, res: import('http').ServerResponse) {
  const auth = req.headers.authorization || '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    json(res, 401, { error: { message: 'Unauthorized' } });
    return false;
  }
  return true;
}

createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const expand = url.searchParams.get('$expand');

  if (req.method === 'GET' && path.endsWith('/$metadata')) {
    res.writeHead(200, { 'content-type': 'application/xml' });
    res.end(metadata);
    return;
  }

  if (!requireBearer(req, res)) return;

  // Singleton /me (+ optional $expand=messages,drives)
  if (req.method === 'GET' && /\/me$/i.test(path)) {
    json(res, 200, meWithExpand(expand));
    return;
  }

  // /me/messages or /users/{id}/messages
  if (req.method === 'GET' && /\/(me|users\/[^/]+)\/messages$/i.test(path)) {
    json(res, 200, messages);
    return;
  }

  // /me/drives or /users/{id}/drives
  if (req.method === 'GET' && /\/(me|users\/[^/]+)\/drives$/i.test(path)) {
    json(res, 200, drives);
    return;
  }

  // /drives/{id}/root
  if (req.method === 'GET' && /\/drives\/[^/]+\/root$/i.test(path)) {
    json(res, 200, {
      ...driveRoot,
      ...(expand?.includes('children') ? { children: driveChildren.value } : {}),
    });
    return;
  }

  // /drives/{id}/root/children
  if (req.method === 'GET' && /\/drives\/[^/]+\/root\/children$/i.test(path)) {
    json(res, 200, driveChildren);
    return;
  }

  // /groups
  if (req.method === 'GET' && /\/groups$/i.test(path)) {
    if (expand?.includes('members')) {
      json(res, 200, { value: [groupWithExpand(expand)] });
      return;
    }
    json(res, 200, groups);
    return;
  }

  // /groups/{id}
  const groupMatch = path.match(/\/groups\/([^/]+)$/i);
  if (req.method === 'GET' && groupMatch) {
    json(res, 200, groupWithExpand(expand));
    return;
  }

  // /groups/{id}/members
  if (req.method === 'GET' && /\/groups\/[^/]+\/members$/i.test(path)) {
    json(res, 200, groupMembers);
    return;
  }

  const userMatch = path.match(/\/users\/([^/]+)$/i);
  if (req.method === 'GET' && userMatch) {
    const id = decodeURIComponent(userMatch[1]);
    json(res, 200, { ...meWithExpand(expand), id });
    return;
  }

  json(res, 404, { error: { message: `Not found: ${path}` } });
}).listen(port, () => {
  console.log(`MS Graph mock at http://127.0.0.1:${port}`);
});
