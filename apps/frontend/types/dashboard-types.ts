export interface Widget {
  id: string;
  type: 'text' | 'chart' | 'kpi' | 'table';
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
  data?: any;
}

export interface GridLayout {
  columns: number;
  rows: number;
  gap: number;
}

export interface DashboardSettings {
  theme: 'light' | 'dark' | 'auto';
  gridSnap: boolean;
  autoSave: boolean;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
  layout: GridLayout;
  settings: DashboardSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface DraggedWidget {
  type: Widget['type'];
  id?: string;
  isNew: boolean;
}

export interface DropZone {
  x: number;
  y: number;
  width: number;
  height: number;
  isValid: boolean;
}

export type WidgetSize = '1x1' | '1x2' | '2x1' | '2x2' | '4x1' | '4x2';

export interface WidgetDimensions {
  width: number;
  height: number;
}

export const WIDGET_SIZES: Record<WidgetSize, WidgetDimensions> = {
  '1x1': { width: 1, height: 1 },
  '1x2': { width: 1, height: 2 },
  '2x1': { width: 2, height: 1 },
  '2x2': { width: 2, height: 2 },
  '4x1': { width: 4, height: 1 },
  '4x2': { width: 4, height: 2 },
};

export interface WidgetLibraryItem {
  type: Widget['type'];
  name: string;
  description: string;
  icon: string;
  defaultSize: WidgetSize;
  defaultConfig: Record<string, any>;
}

export const WIDGET_LIBRARY: WidgetLibraryItem[] = [
  {
    type: 'text',
    name: 'Text Block',
    description: 'Rich text editor widget',
    icon: 'FileText',
    defaultSize: '2x1',
    defaultConfig: {
      content: '',
      fontSize: 'medium',
      alignment: 'left',
    },
  },
  {
    type: 'chart',
    name: 'Chart',
    description: 'Data visualization charts',
    icon: 'BarChart3',
    defaultSize: '2x2',
    defaultConfig: {
      chartType: 'bar',
      title: 'New Chart',
      description: '',
    },
  },
  {
    type: 'kpi',
    name: 'KPI Card',
    description: 'Key performance indicator display',
    icon: 'TrendingUp',
    defaultSize: '1x1',
    defaultConfig: {
      title: 'KPI',
      value: 0,
      change: 0,
      changeDirection: 'flat',
    },
  },
  {
    type: 'table',
    name: 'Table',
    description: 'Data table with sorting/filtering',
    icon: 'Table',
    defaultSize: '4x2',
    defaultConfig: {
      title: 'Data Table',
      showHeader: true,
      sortable: true,
      filterable: true,
    },
  },
];