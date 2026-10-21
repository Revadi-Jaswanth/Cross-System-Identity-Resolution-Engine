import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Verification } from '../pages/Verification';
import { VerificationDetails } from '../pages/VerificationDetails';
import { AuditLogs } from '../pages/AuditLogs';
import { VerificationWizard } from '../components/verification/VerificationWizard';
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

describe('Verification & Audit Operations UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render verification desk lists requests', async () => {
    renderWithProviders(<Verification />);
    expect(screen.getByText('Verification Desk')).toBeDefined();
  });

  it('should step through verification wizard decisions flow', async () => {
    renderWithProviders(<VerificationWizard onClose={vi.fn()} />);

    expect(screen.getByText('7-Step Verification Workflow')).toBeDefined();
    
    // Step forward
    const nextBtn = screen.getByText('Next Step');
    fireEvent.click(nextBtn);
    
    // Check if next step details show candidate comparison
    expect(screen.getByText('Candidate Attributes Mappings')).toBeDefined();
  });

  it('should render system audit trails log data tables', async () => {
    renderWithProviders(<AuditLogs />);
    expect(screen.getByText('System Audit Trails')).toBeDefined();
  });
});
