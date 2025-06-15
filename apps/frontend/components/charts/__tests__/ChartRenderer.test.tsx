import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/utils';
import { ChartRenderer } from '../ChartRenderer';
import { mockChartSpec } from '@/tests/utils';

describe('ChartRenderer', () => {
  it('renders bar chart correctly', () => {
    const spec = mockChartSpec({ chartType: 'bar' });
    
    render(<ChartRenderer spec={spec} />);
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders line chart correctly', () => {
    const spec = mockChartSpec({ chartType: 'line' });
    
    render(<ChartRenderer spec={spec} />);
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders pie chart correctly', () => {
    const spec = mockChartSpec({ chartType: 'pie' });
    
    render(<ChartRenderer spec={spec} />);
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('displays error state for invalid chart type', () => {
    const spec = mockChartSpec({ chartType: 'invalid' as any });
    
    render(<ChartRenderer spec={spec} />);
    
    expect(screen.getByText(/unsupported chart type/i)).toBeInTheDocument();
  });

  it('handles missing data gracefully', () => {
    const spec = mockChartSpec({ data: undefined });
    
    render(<ChartRenderer spec={spec} />);
    
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const spec = mockChartSpec();
    const customClass = 'custom-chart-class';
    
    const { container } = render(
      <ChartRenderer spec={spec} className={customClass} />
    );
    
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('renders with custom dimensions', () => {
    const spec = mockChartSpec();
    
    render(<ChartRenderer spec={spec} height={400} width={600} />);
    
    const container = screen.getByTestId('responsive-container');
    expect(container).toBeInTheDocument();
  });
});