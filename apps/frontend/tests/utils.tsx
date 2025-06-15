import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';

// Custom render function with providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Mock data factories
export const mockWidget = (overrides = {}) => ({
  id: 'test-widget-1',
  userId: 'test-user-id',
  chatId: null,
  type: 'chart' as const,
  subtype: 'bar' as const,
  title: 'Test Widget',
  chartSpecs: null,
  sql: null,
  data: null,
  config: {
    title: 'Test Widget',
    chartType: 'bar',
  },
  isConfigured: true,
  cacheKey: null,
  lastDataFetch: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  layout: {
    lg: { x: 0, y: 0, w: 4, h: 2 },
    md: { x: 0, y: 0, w: 4, h: 2 },
    sm: { x: 0, y: 0, w: 2, h: 2 },
    xs: { x: 0, y: 0, w: 2, h: 2 },
  },
  sizeClass: 'chart-s' as const,
  ...overrides,
});

export const mockDashboard = (overrides = {}) => ({
  id: 'test-dashboard-1',
  userId: 'test-user-id',
  name: 'Test Dashboard',
  description: 'A test dashboard',
  metadata: {},
  layout: {},
  isPublic: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const mockChartSpec = (overrides = {}) => ({
  chartType: 'bar' as const,
  title: 'Test Chart',
  description: 'A test chart',
  data: [
    { category: 'A', value: 100 },
    { category: 'B', value: 200 },
    { category: 'C', value: 150 },
  ],
  ...overrides,
});

export const mockChatMessage = (overrides = {}) => ({
  role: 'user' as const,
  content: 'Test message',
  timestamp: new Date().toISOString(),
  ...overrides,
});

// Test utilities
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

export const mockFetch = (response: any, ok = true) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
};

export const mockFailedFetch = (error = 'Network error') => {
  global.fetch = vi.fn().mockRejectedValue(new Error(error));
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };