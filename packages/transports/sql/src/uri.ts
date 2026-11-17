export interface ParsedSqlUri {
  dialect: 'postgres' | 'mysql' | 'sqlite';
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  ssl?: boolean;
  /** Absolute or relative file path for sqlite */
  filePath?: string;
  searchParams: Record<string, string>;
}

export function parseSqlUri(location: string): ParsedSqlUri {
  const searchParams: Record<string, string> = {};
  if (
    location.startsWith('file:') ||
    location.startsWith('sqlite:') ||
    (!location.includes('://') && !location.startsWith('mysql') && !location.startsWith('postgres'))
  ) {
    let filePath = location;
    if (filePath.startsWith('file:')) filePath = filePath.slice('file:'.length);
    else if (filePath.startsWith('sqlite:')) filePath = filePath.slice('sqlite:'.length);
    if (filePath.startsWith('//')) filePath = filePath.replace(/^\/\/+/, '/');
    return { dialect: 'sqlite', filePath, searchParams };
  }

  // URL parser needs a known scheme; mysqls:// is non-standard
  const normalized = location.replace(/^mysqls:/i, 'mysql:');
  const url = new URL(normalized);
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value;
  });
  const protocol = location.toLowerCase().startsWith('mysqls:')
    ? 'mysqls:'
    : url.protocol.toLowerCase();
  const database = url.pathname.replace(/^\//, '') || undefined;

  if (protocol.startsWith('postgres')) {
    return {
      dialect: 'postgres',
      user: decode(url.username) || undefined,
      password: decode(url.password) || undefined,
      host: url.hostname || 'localhost',
      port: url.port ? Number(url.port) : 5432,
      database,
      ssl: searchParams.ssl === 'true' || searchParams.sslmode === 'require',
      searchParams,
    };
  }
  if (protocol.startsWith('mysql')) {
    return {
      dialect: 'mysql',
      user: decode(url.username) || undefined,
      password: decode(url.password) || undefined,
      host: url.hostname || 'localhost',
      port: url.port ? Number(url.port) : 3306,
      database,
      ssl: protocol === 'mysqls:' || searchParams.ssl === 'true',
      searchParams,
    };
  }
  throw new Error(`Unsupported SQL connection URI: ${location}`);
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
