import type { ApiErrorResponse } from '../types/errors';

class ApiError extends Error {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
  };

  constructor(message: string, response?: { data?: ApiErrorResponse; status?: number }) {
    super(message);
    this.name = 'ApiError';
    this.response = response;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { ...options.headers as Record<string, string> };
    
    // Only set Content-Type if there's a body
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' })) as ApiErrorResponse;
      throw new ApiError(
        errorData.error || `HTTP ${response.status}`,
        { data: errorData, status: response.status }
      );
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async uploadFile<T>(path: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' })) as ApiErrorResponse;
      throw new ApiError(
        errorData.error || `HTTP ${response.status}`,
        { data: errorData, status: response.status }
      );
    }

    return response.json();
  }
}

export const api = new ApiClient();

