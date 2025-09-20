import axios, { AxiosInstance } from 'axios';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Client,
  ClientFormData,
  Invoice,
  InvoiceFormData,
  Reminder,
  ReminderFormData,
  Template,
  DashboardStats,
  InvoiceFilters,
  ClientFilters
} from '@/types/api';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }
    );

    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login', data);
    const authData = response.data;
    this.setToken(authData.access_token);
    return authData;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post('/auth/register', data);
    const authData = response.data;
    this.setToken(authData.access_token);
    return authData;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async logout() {
    this.clearToken();
  }

  // Client endpoints
  async getClients(filters?: ClientFilters): Promise<Client[]> {
    const response = await this.client.get('/clients', { params: filters });
    return response.data;
  }

  async getClient(id: number): Promise<Client> {
    const response = await this.client.get(`/clients/${id}`);
    return response.data;
  }

  async createClient(data: ClientFormData): Promise<Client> {
    const response = await this.client.post('/clients', data);
    return response.data;
  }

  async updateClient(id: number, data: Partial<ClientFormData>): Promise<Client> {
    const response = await this.client.put(`/clients/${id}`, data);
    return response.data;
  }

  async deleteClient(id: number): Promise<void> {
    await this.client.delete(`/clients/${id}`);
  }

  // Invoice endpoints
  async getInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
    const response = await this.client.get('/invoices', { params: filters });
    return response.data;
  }

  async getInvoice(id: number): Promise<Invoice> {
    const response = await this.client.get(`/invoices/${id}`);
    return response.data;
  }

  async createInvoice(data: InvoiceFormData): Promise<Invoice> {
    const response = await this.client.post('/invoices', data);
    return response.data;
  }

  async updateInvoice(id: number, data: Partial<InvoiceFormData>): Promise<Invoice> {
    const response = await this.client.put(`/invoices/${id}`, data);
    return response.data;
  }

  async deleteInvoice(id: number): Promise<void> {
    await this.client.delete(`/invoices/${id}`);
  }

  // Reminder endpoints
  async getReminders(): Promise<Reminder[]> {
    const response = await this.client.get('/reminders');
    return response.data;
  }

  async createReminder(data: ReminderFormData): Promise<Reminder> {
    const response = await this.client.post('/reminders', data);
    return response.data;
  }

  async updateReminder(id: number, data: Partial<ReminderFormData>): Promise<Reminder> {
    const response = await this.client.put(`/reminders/${id}`, data);
    return response.data;
  }

  async deleteReminder(id: number): Promise<void> {
    await this.client.delete(`/reminders/${id}`);
  }

  // Template endpoints
  async getTemplates(): Promise<Template[]> {
    const response = await this.client.get('/templates');
    return response.data;
  }

  async createTemplate(data: Partial<Template>): Promise<Template> {
    const response = await this.client.post('/templates', data);
    return response.data;
  }

  // Analytics endpoints
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get('/analytics/dashboard');
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;