// API Types for DueSpark Frontend

export interface User {
  id: number;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
  is_verified: boolean;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  timezone?: string;
  send_reminders: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  client?: Client;
  amount: number;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  description?: string;
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
  stripe_payment_intent_id?: string;
  payment_url?: string;
}

export interface Reminder {
  id: number;
  invoice_id: number;
  invoice?: Invoice;
  days_before: number;
  template_id?: number;
  message?: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

export interface Template {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: 'reminder' | 'invoice';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Form types
export interface ClientFormData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  timezone?: string;
  send_reminders: boolean;
}

export interface InvoiceFormData {
  client_id: number;
  amount: number;
  due_date: string;
  description?: string;
  items: InvoiceItem[];
}

export interface ReminderFormData {
  invoice_id: number;
  days_before: number;
  template_id?: number;
  message?: string;
}

// Analytics types
export interface DashboardStats {
  total_invoices: number;
  total_amount: number;
  overdue_count: number;
  overdue_amount: number;
  paid_this_month: number;
  pending_amount: number;
}

// Filter types
export interface InvoiceFilters {
  status?: string;
  client_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface ClientFilters {
  search?: string;
  timezone?: string;
}