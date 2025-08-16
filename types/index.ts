/**
 * Centralized type definitions for the frontend application
 * 
 * This file consolidates all type definitions to ensure consistency
 * and reduce duplication across the codebase.
 */

// Import for internal usage
import type { Widget } from '@/db/schema';
import type { ChartSpec } from '@/types/chart-types';

// Re-export database schema types
export type {
  User,
  Chat,
  File,
  LLMUsage,
  Dashboard,
  Widget,
} from '@/db/schema';

// Re-export chart and visualization types
export type {
  ChartSpec,
  ChartType,
  DataItem,
  ChangeDirection
} from './chart-types';

// Re-export dashboard types
export type {
  Widget as DashboardWidget,
  GridLayout,
  DashboardSettings,
  Dashboard as DashboardType
} from './dashboard-types';

// Legacy types from enhanced-dashboard-types (for backward compatibility)
export type { Widget as LegacyWidget } from './enhanced-dashboard-types';

// Common UI and interaction types
export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Chat and messaging types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'chart';
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ChatState extends LoadingState {
  messages: ChatMessage[];
  chatId: string | null;
  isTyping: boolean;
}

// Form types
export interface FormField<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  required?: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

// Theme and styling types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  fontFamily: string;
}

// File upload types
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// Dashboard specific types
export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  layout: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardContextType {
  dashboard: DashboardConfig | null;
  widgets: Widget[];
  isLoading: boolean;
  error: string | null;
  updateDashboard: (config: Partial<DashboardConfig>) => void;
  addWidget: (widget: any) => Promise<void>;
  updateWidget: (widgetId: string, updates: Partial<Widget>) => Promise<void>;
  deleteWidget: (widgetId: string) => Promise<void>;
}

// Component prop types
export interface WidgetComponentProps {
  widget: Widget;
  isEditing?: boolean;
  onUpdate?: (updates: Partial<Widget>) => void;
  onDelete?: () => void;
  onConfigure?: () => void;
}

export interface ChartComponentProps {
  spec: ChartSpec;
  className?: string;
  height?: number;
  width?: number;
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

// Event handler types
export type EventHandler<T = void> = (event?: React.SyntheticEvent) => T;
export type AsyncEventHandler<T = void> = (event?: React.SyntheticEvent) => Promise<T>;

// Validation types
export type ValidationRule<T> = (value: T) => string | undefined;
export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};