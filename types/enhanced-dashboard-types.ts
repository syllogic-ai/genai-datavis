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
  defaultLayout?: { w: number; h: number };
  defaultConfig: Record<string, any>;
}

export const GRID_PROPS = {
  rowHeight: 60,
  margin: [12, 12] as [number, number],
  cols: 12,
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  colsForBreakpoints: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
};