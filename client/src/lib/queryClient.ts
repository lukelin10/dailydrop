import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Safely extract error text from response
      let errorText = res.statusText || "Unknown Error";
      try {
        const text = await res.text();
        if (text && text.length > 0) {
          errorText = text;
        }
      } catch (e) {
        console.warn("Failed to read error response text:", e);
      }
      
      // Create error with detailed message
      throw new Error(`${res.status}: ${errorText}`);
    } catch (error) {
      // If anything fails in error handling, ensure we still throw an error
      console.error("Error processing response error:", error);
      throw error instanceof Error 
        ? error 
        : new Error(`Request failed with status ${res.status}`);
    }
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
  try {
    // Safety check for null or undefined URL
    if (!url) {
      console.error("API request received empty URL");
      throw new Error("Invalid URL for API request");
    }
    
    // Use absolute URLs to avoid routing issues in production
    // This prevents the API requests from being intercepted by SPA routing
    const baseUrl = window.location.origin;
    const apiUrl = url.startsWith('http') 
                 ? url 
                 : url.startsWith('/') 
                   ? `${baseUrl}${url}` 
                   : `${baseUrl}/${url}`;

    console.log("Making API request to:", apiUrl);

    // Safety check request body serialization
    let serializedBody: string | undefined = undefined;
    
    if (options.body) {
      try {
        serializedBody = JSON.stringify(options.body);
      } catch (bodyError) {
        console.error("Failed to serialize request body:", bodyError);
        // Fall back to a simple empty object rather than failing the request
        serializedBody = "{}";
      }
    }

    const res = await fetch(apiUrl, {
      method: options.method,
      headers: options.body ? { "Content-Type": "application/json" } : {},
      body: serializedBody,
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
      try {
        const data = await res.json();
        return data as T;
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError);
        return {} as T;
      }
    } else {
      console.warn(`Response is not JSON: ${contentType}`);
      return {} as T;
    }
  } catch (error) {
    console.error("API request error:", error);
    // Re-throw the error to be handled by the caller
    throw error instanceof Error ? error : new Error(String(error));
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

    try {
      // Add extra defensive checks for array operations - this is critical for production builds
      if (!queryKey) {
        throw new Error("Query key is missing");
      }

      // Defend against non-array queryKey (should never happen, but protect anyway)
      if (!Array.isArray(queryKey)) {
        console.error("Expected queryKey to be an array but got:", typeof queryKey);
        throw new Error("Invalid query key format");
      }

      // Make sure we have at least one element in the array
      if (queryKey.length === 0) {
        throw new Error("Query key array is empty");
      }

      // If the queryKey is an array with more than one element
      if (queryKey.length > 1) {
        // Ensure first element is a string and exists
        const baseUrl = typeof queryKey[0] === 'string' ? queryKey[0] : '';
        if (!baseUrl) {
          console.error("Invalid baseUrl in queryKey:", queryKey);
          throw new Error("Invalid base URL in query key");
        }

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
        const firstKey = queryKey[0];
        if (typeof firstKey !== 'string') {
          console.error("Expected first queryKey element to be string but got:", typeof firstKey);
          throw new Error("Invalid query key format: first element must be a string URL");
        }
        url = firstKey;
      }
    } catch (error) {
      console.error("Error processing queryKey:", error, "queryKey value:", queryKey);
      
      // Fallback to a safe default URL to prevent uncaught exceptions in production
      url = typeof queryKey === 'string' ? queryKey : 
            Array.isArray(queryKey) && typeof queryKey[0] === 'string' ? queryKey[0] : 
            "/api/fallback";
      
      console.warn("Using fallback URL:", url);
    }

    // Use absolute URLs to avoid routing issues in production
    // This prevents the API requests from being intercepted by SPA routing
    const baseUrl = window.location.origin;
    const apiUrl = url.startsWith('http') 
                 ? url 
                 : url.startsWith('/') 
                   ? `${baseUrl}${url}` 
                   : `${baseUrl}/${url}`;

    console.log("API Request URL:", apiUrl);

    const res = await fetch(apiUrl, {
      credentials: "include",
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
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
      try {
        const data = await res.json();
        return data as TData;
      } catch (jsonError) {
        console.error("Failed to parse JSON in query response:", jsonError);
        // Return empty object as fallback instead of throwing
        return {} as TData;
      }
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