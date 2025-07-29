export interface Layout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  isResizable?: boolean;
}

export interface Widget {
  id: string;
  type: 'text' | 'chart' | 'kpi' | 'table';
  layout?: Layout; // Legacy grid layout (for backward compatibility)
  order?: number; // New order-based positioning
  config: Record<string, any>;
  data?: any;
  sql?: string | null;
  chatId?: string | null;
  isConfigured?: boolean;
  cacheKey?: string | null;
  lastDataFetch?: Date | null;
}

export interface DashboardState {
  widgets: Widget[];
}

export interface WidgetTypeConfig {
  type: Widget['type'];
  title: string;
  icon: React.ReactNode;
  defaultConfig: Record<string, any>;
}