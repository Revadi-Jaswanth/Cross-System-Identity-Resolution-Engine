import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import api from '../lib/axios';

// Mock Axios API instances
vi.mock('../lib/axios', () => {
  return {
    default: {
      get: vi.fn()
    }
  };
});

// Mock react-chartjs-2 to prevent canvas element rendering failures in JSDOM
vi.mock('react-chartjs-2', () => {
  return {
    Line: () => <div data-testid="line-chart">Line Chart</div>,
    Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
    Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
    Pie: () => <div data-testid="pie-chart">Pie Chart</div>
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

const renderDashboard = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all dashboard sections and charts successfully', async () => {
    const mockStatsPayload = {
      success: true,
      data: {
        total_active_clusters: 12,
        total_active_identities: 45,
        total_merges_completed: 4,
        engine_version: 'v1.0'
      }
    };

    const mockHealthPayload = {
      success: true,
      data: {
        status: 'UP',
        database: 'CONNECTED',
        version: '1.0.0'
      }
    };

    api.get.mockImplementation((url) => {
      if (url.includes('/system/stats')) {
        return Promise.resolve({ data: mockStatsPayload });
      }
      if (url.includes('/system/health')) {
        return Promise.resolve({ data: mockHealthPayload });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderDashboard();

    // Check header elements
    expect(screen.getAllByText('VeriSync Console')[0]).toBeDefined();

    // Wait for async stats load
    await waitFor(() => {
      expect(screen.getByText('total_active_identities' in mockStatsPayload.data ? '45' : '0')).toBeDefined();
    });

    // Check if Chart components render successfully
    expect(screen.getAllByTestId('line-chart').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('doughnut-chart').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('pie-chart').length).toBeGreaterThan(0);
  });

  it('should fallback gracefully on API stats error status', async () => {
    api.get.mockRejectedValueOnce(new Error('Internal database error'));

    renderDashboard();

    // Should still load base page layers and other indicators
    expect(screen.getAllByText('VeriSync Console')[0]).toBeDefined();
  });
});
