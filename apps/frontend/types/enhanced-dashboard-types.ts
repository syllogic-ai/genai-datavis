import { Layout } from "react-grid-layout";

export interface Widget {
  id: string;
  type: 'text' | 'chart' | 'kpi' | 'table';
  layout: Layout;
  config: Record<string, any>;
  data?: any;
}

export interface DashboardState {
  widgets: Widget[];
  layouts: { [key: string]: Layout[] };
}

export interface WidgetTypeConfig {
  type: Widget['type'];
  title: string;
  icon: React.ReactNode;
  defaultLayout: { w: number; h: number };
  defaultConfig: Record<string, any>;
}

export const GRID_PROPS = {
  className: "layout",
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
  rowHeight: 100,
  margin: [16, 16] as [number, number],
  containerPadding: [16, 16] as [number, number],
  compactType: "vertical" as const,
  preventCollision: false,
  isDraggable: true,
  isResizable: true,
  resizeHandles: ['se'] as Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>,
};