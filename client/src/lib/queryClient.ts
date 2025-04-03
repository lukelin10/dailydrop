import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T>(
  url: string,
  options: {
    method: string;
    body?: unknown;
    expectJson?: boolean;
  } = { method: "GET", expectJson: true }
): Promise<T> {
  // Ensure the URL is relative to the current domain in production
  // This prevents issues with absolute paths in deployed environments
  const apiUrl = url.startsWith('http') ? url : url.startsWith('/') ? url : `/${url}`;

  console.log("Making API request to:", apiUrl);

  const res = await fetch(apiUrl, {
    method: options.method,
    headers: options.body ? { "Content-Type": "application/json" } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  // Log response status to help with debugging
  console.log(`API response status: ${res.status} ${res.statusText}`);

  await throwIfResNotOk(res);

  // For endpoints that return empty responses or non-JSON responses
  const expectJson = options.expectJson !== false;

  if (!expectJson) {
    // Return an empty object if we don't expect JSON
    return {} as T;
  }

  // Check if there's actually content to parse
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  } else {
    console.warn(`Response is not JSON: ${contentType}`);
    return {} as T;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export function getQueryFn<TData>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<TData> {
  const { on401 } = options;

  return async ({ queryKey }) => {
    // Handle query keys that include an ID parameter
    let url: string;

    // If the queryKey is an array with more than one element
    if (Array.isArray(queryKey) && queryKey.length > 1) {
      const baseUrl = queryKey[0] as string;
      const id = queryKey[1];

      if (id !== null && id !== undefined) {
        // Ensure we have a clean URL without double slashes
        url = baseUrl.endsWith('/') 
          ? `${baseUrl}${id}` 
          : `${baseUrl}/${id}`;
      } else {
        url = baseUrl;
      }
    } else {
      // Simple case - just a string URL
      url = queryKey[0] as string;
    }

    // Ensure the URL is relative to the current domain in production
    // This prevents issues with absolute paths in deployed environments
    const apiUrl = url.startsWith('http') ? url : url.startsWith('/') ? url : `/${url}`;

    console.log("API Request URL:", apiUrl);

    const res = await fetch(apiUrl, {
      credentials: "include",
    });

    // Log response status to help with debugging
    console.log(`Query response status: ${res.status} ${res.statusText}`);

    if (on401 === "returnNull" && res.status === 401) {
      return null as unknown as TData;
    }

    await throwIfResNotOk(res);

    // Check if there's actually content to parse
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      return data as TData;
    } else {
      console.warn(`Query response is not JSON: ${contentType}`);
      // Return empty object of type T for non-JSON responses
      return {} as TData;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});