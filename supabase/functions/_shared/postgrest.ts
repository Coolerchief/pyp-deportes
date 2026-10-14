// A minimal PostgREST client with the service role key (it skips RLS, so it only runs inside the
// Edge Functions and never reaches the browser). Plain fetch: no supabase-js to load per request.

export class PostgrestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: string | null,
  ) {
    super(message);
    this.name = 'PostgrestError';
  }
}

type Options = {
  url: string;
  serviceRoleKey: string;
  fetch?: typeof fetch;
};

export type PostgrestClient = ReturnType<typeof createPostgrestClient>;

export function createPostgrestClient({ url, serviceRoleKey, fetch: doFetch = fetch }: Options) {
  const base = `${url.replace(/\/+$/, '')}/rest/v1`;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  async function fail(response: Response): Promise<never> {
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      details?: string | null;
    };
    throw new PostgrestError(
      response.status,
      body.code ?? String(response.status),
      body.message ?? response.statusText,
      body.details ?? null,
    );
  }

  return {
    /** POST /rpc/<fn> with a JSON body; returns the function's result. */
    async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
      const response = await doFetch(`${base}/rpc/${fn}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      if (!response.ok) return fail(response);
      return (await response.json()) as T;
    },

    /** Rows of a table or view; `query` is PostgREST syntax ("key=eq.x&select=value"). */
    async select<T>(table: string, query: string): Promise<T[]> {
      const response = await doFetch(`${base}/${table}?${query}`, { headers });
      if (!response.ok) return fail(response);
      return (await response.json()) as T[];
    },

    /** Exact count of the rows matching `query`, without reading them. */
    async count(table: string, query: string): Promise<number> {
      const response = await doFetch(`${base}/${table}?${query}`, {
        method: 'HEAD',
        headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
      });
      if (!response.ok) return fail(response);
      const total = response.headers.get('content-range')?.split('/')[1];
      const value = Number(total);
      if (total === undefined || !Number.isInteger(value)) {
        throw new PostgrestError(
          response.status,
          'no_count',
          'PostgREST no devolvió el total.',
          null,
        );
      }
      return value;
    },
  };
}
