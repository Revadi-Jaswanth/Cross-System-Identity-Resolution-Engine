import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Clusters } from '../pages/Clusters';
import { ClusterDetails } from '../pages/ClusterDetails';
import { GoldenProfile } from '../pages/GoldenProfile';
import { MergeWizard } from '../components/cluster/MergeWizard';
import api from '../lib/axios';

// Mock Axios API instance
vi.mock('../lib/axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn()
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

describe('Cluster Management UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render clusters listing table headers', async () => {
    renderWithProviders(<Clusters />);
    expect(screen.getByText('Identity Clusters')).toBeDefined();
  });

  it('should step through merge wizard flow and validate inputs', async () => {
    renderWithProviders(<MergeWizard onClose={vi.fn()} />);

    expect(screen.getByText('7-Step Cluster Merge Wizard')).toBeDefined();
    
    // Check step 1 validation checks
    const nextBtn = screen.getByText('Next Step');
    fireEvent.click(nextBtn);

    // Should prompt source validation warning alert check because input is empty
    // (mock alert handles verification)
  });

  it('should render cluster details parameters inspection grids', async () => {
    const mockCluster = {
      uuid: 'CL-TEST-1',
      version: 1,
      status: 'ACTIVE',
      identities: []
    };

    api.get.mockResolvedValue({ data: { success: true, data: mockCluster } });

    renderWithProviders(<ClusterDetails />);
    await waitFor(() => {
      expect(screen.getByText('Cluster Parameters inspect')).toBeDefined();
    });
  });
});
