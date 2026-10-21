import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { SystemSettings } from '../pages/SystemSettings';
import { Monitoring } from '../pages/Monitoring';
import { FeatureFlags } from '../pages/FeatureFlags';
import { LogsViewer } from '../pages/LogsViewer';
import api from '../lib/axios';

// Mock Axios API instance
vi.mock('../lib/axios', () => {
  return {
    default: {
      get: vi.fn(),
      put: vi.fn()
    }
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

const renderWithProviders = (ui) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('System Administration UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render system settings configurations controls', async () => {
    const mockSettings = [
      { setting_key: 'threshold', setting_value: '80', description: 'similarity threshold', version: 1 }
    ];

    api.get.mockResolvedValue({ data: { success: true, data: mockSettings } });

    renderWithProviders(<SystemSettings />);
    await waitFor(() => {
      expect(screen.getByText('Console configurations')).toBeDefined();
    });
  });

  it('should render system telemetry monitoring timelines', async () => {
    renderWithProviders(<Monitoring />);
    expect(screen.getByText('System Telemetry Monitor')).toBeDefined();
  });

  it('should render feature flags lists togglers', async () => {
    renderWithProviders(<FeatureFlags />);
    expect(screen.getByText('Feature Flags Console')).toBeDefined();
  });

  it('should render logs viewer grid lines', async () => {
    renderWithProviders(<LogsViewer />);
    expect(screen.getByText('System Traces Viewer')).toBeDefined();
  });
});
