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
  } = { method: "GET" }
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
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
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

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

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
