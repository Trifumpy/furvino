// common error type
export class HttpServiceError extends Error {
  public status?: number;
  public originalError?: unknown;

  constructor(message: string, status?: number, originalError?: unknown) {
    super(message);
    this.name = 'HttpServiceError';
    this.status = status;
    this.originalError = originalError;
  }
}

interface RequestOptions<TBody = unknown> {
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number | boolean | undefined>;
  cache?: RequestInit['cache'];
  body?: TBody;
  next?: NextFetchRequestConfig;
}

export abstract class HttpService {
  protected baseUrl: string;
  protected prefix: string;

  constructor(baseUrl: string, prefix: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // strip trailing slash
    this.prefix = prefix.replace(/^\/+/, '');  // strip leading slash
  }

  private buildUrl(path: string, queryParams?: RequestOptions['queryParams']): string {
    let url = `${this.baseUrl}/${this.prefix}${path.startsWith('/') ? path : '/' + path}`;

    if (queryParams) {
      const query = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, String(value));
        }
      });
      const queryString = query.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  private async request<TResult = void, TBody = undefined>(
    method: string,
    path: string,
    options: RequestOptions<TBody> = {}
  ): Promise<TResult> {
    const url = this.buildUrl(path, options.queryParams);

    const fetchOptions: RequestInit = {
      method,
      next: options.next,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    if (options.body !== undefined) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, fetchOptions);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        const errorMessage = `HTTP ${res.status} ${res.statusText}: ${errorText}`;
        console.error(`[HttpService] Error response for ${method} ${url}:`, errorMessage);
        throw new HttpServiceError(errorMessage, res.status);
      }

      // Try to parse JSON response, but allow empty body
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await res.json()) as TResult;
      } else {
        // If not JSON, just return null
        return null as unknown as TResult;
      }
    } catch (err) {
      if (err instanceof HttpServiceError) throw err;

      console.error(`[HttpService] Network or unexpected error for ${method} ${url}:`, err);
      throw new HttpServiceError(String(err), undefined, err);
    }
  }

  public get<T>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  public post<TResult, TBody>(path: string, body?: TBody, options?: Omit<RequestOptions, 'body'>): Promise<TResult> {
    return this.request<TResult, TBody>('POST', path, { ...options, body });
  }

  public put<TResult, TBody>(path: string, body?: TBody, options?: Omit<RequestOptions, 'body'>): Promise<TResult> {
    return this.request<TResult, TBody>('PUT', path, { ...options, body });
  }

  public patch<TResult, TBody>(path: string, body?: TBody, options?: Omit<RequestOptions, 'body'>): Promise<TResult> {
    return this.request<TResult, TBody>('PATCH', path, { ...options, body });
  }

  public delete<T>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }
}
