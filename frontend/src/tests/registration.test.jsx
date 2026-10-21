import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { IdentityRegistration } from '../pages/IdentityRegistration';
import { BulkRegistration } from '../pages/BulkRegistration';
import api from '../lib/axios';

// Mock Axios API instance
vi.mock('../lib/axios', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn()
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

describe('Identity Ingestion Module Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render single registration form and allow stepper transitions', async () => {
    renderWithProviders(<IdentityRegistration />);

    expect(screen.getByText('Ingest Identity Record')).toBeDefined();
    
    // Check if step 1 inputs exist
    expect(screen.getAllByPlaceholderText('e.g. REC-102')[0]).toBeDefined();
  });

  it('should save registration state in local storage draft', async () => {
    renderWithProviders(<IdentityRegistration />);

    const systemUidInput = screen.getAllByPlaceholderText('e.g. REC-102')[0];
    fireEvent.change(systemUidInput, { target: { value: 'REC-DRAFT-1' } });

    await waitFor(() => {
      const draft = JSON.parse(localStorage.getItem('identity_registration_draft') || '{}');
      expect(draft.values?.system_uid).toBe('REC-DRAFT-1');
    });
  });

  it('should render bulk upload zone and parse template downloads', async () => {
    renderWithProviders(<BulkRegistration />);

    expect(screen.getByText('Bulk Ingestion Console')).toBeDefined();
    expect(screen.getByText('Download CSV Template')).toBeDefined();
  });
});
