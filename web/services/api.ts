import { API_BASE_URL } from '../constants';
import { ApiResponse, LoginResponse, SubmitPayload, TaskData, SubmissionItem } from '../types';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `HTTP Error ${response.status}`);
      }
      
      if (data.code && data.code !== 200) {
        throw new Error(data.msg || 'Unknown API Error');
      }

      return data.data || data;
    } catch (error: any) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await this.request<LoginResponse | { code: number, token: string, contribution: number, is_admin: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return res as LoginResponse;
  }

  async checkSystemStatus(): Promise<{ initialized: boolean }> {
    const res = await fetch(`${API_BASE_URL}/auth/status`);
    const data = await res.json();
    return data;
  }

  async initSystem(username: string, password: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || '初始化失败');
    }
  }

  async createUser(username: string, password: string): Promise<void> {
    await this.request('/admin/users/create', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  async deleteUser(username: string): Promise<void> {
    await this.request(`/admin/users/${username}`, { method: 'DELETE' });
  }

  async updateUserPassword(username: string, newPassword: string): Promise<void> {
    await this.request('/admin/users/password', {
      method: 'POST',
      body: JSON.stringify({ username, new_password: newPassword })
    });
  }

  async getAvailableProjects(): Promise<{ project_id: string; available_count: number }[]> {
    return this.request('/task/projects', { method: 'GET' });
  }

  async getLeaderboard(limit: number = 10): Promise<{ username: string; contribution: number }[]> {
    return this.request(`/task/leaderboard?limit=${limit}`, { method: 'GET' });
  }

  async fetchTask(projectId?: string): Promise<ApiResponse<TaskData>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    let url = `${API_BASE_URL}/task/fetch`;
    if (projectId) {
      url += `?project_id=${encodeURIComponent(projectId)}`;
    }
    
    const res = await fetch(url, {
      method: 'GET',
      headers
    });
    
    if (res.status === 404) {
      throw new Error('NO_TASK_AVAILABLE');
    }
    
    const data = await res.json();
    
    if (!res.ok) {
       throw new Error(data.detail || 'Failed to fetch task');
    }

    return data;
  }

  async submitTask(payload: SubmitPayload): Promise<ApiResponse> {
    return this.request<ApiResponse>('/task/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async skipTask(taskToken: string): Promise<void> {
    await this.request('/task/skip', {
      method: 'POST',
      body: JSON.stringify({ task_token: taskToken }),
    });
  }

  async getSuggestions(field: string, query: string): Promise<string[]> {
    if (!query) return [];
    const queryString = new URLSearchParams({ field, q: query, limit: '10' }).toString();
    try {
      return await this.request<string[]>(`/autocomplete/suggest?${queryString}`, {
        method: 'GET',
      });
    } catch (e) {
      console.warn('Autocomplete failed', e);
      return [];
    }
  }

  async getSubmissions(): Promise<SubmissionItem[]> {
    return this.request<SubmissionItem[]>('/submission/list', { method: 'GET' });
  }

  async getSubmission(id: number): Promise<SubmissionItem> {
    const res = await this.request<{ data: SubmissionItem }>(`/submission/${id}`, { method: 'GET' });
    return (res as any).data || res;
  }

  async updateSubmission(submissionId: number, rows: any[]): Promise<void> {
    await this.request('/submission/update', {
      method: 'POST',
      body: JSON.stringify({ submission_id: submissionId, rows })
    });
  }

  async adminRequest(endpoint: string, method: string = 'GET'): Promise<any> {
    return this.request(endpoint, { method });
  }
}

export const api = new ApiService();
