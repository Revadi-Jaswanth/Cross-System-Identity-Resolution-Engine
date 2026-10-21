import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ClaimCredentials } from '../pages/ClaimCredentials';

const renderClaimCredentials = () => {
  return render(
    <BrowserRouter>
      <ClaimCredentials />
    </BrowserRouter>
  );
};

describe('Citizen Credential Claim Portal Tests', () => {
  beforeEach(() => {
    // Clear state
  });

  it('should render all 4 credential stages and header banner correctly', () => {
    renderClaimCredentials();

    expect(screen.getByText('Claim Your Digital Credentials')).toBeDefined();
    expect(screen.getByText('Aadhaar Credential')).toBeDefined();
    expect(screen.getByText('ABHA Health Account')).toBeDefined();
    expect(screen.getByText('DigiLocker Credentials')).toBeDefined();
    expect(screen.getByText('Unified Golden Profile')).toBeDefined();
  });

  it('should keep Golden Profile disabled until prerequisites are met', () => {
    renderClaimCredentials();

    const goldenBtns = screen.getAllByText('GENERATE GOLDEN PROFILE');
    expect(goldenBtns.length).toBeGreaterThan(0);
    const goldenButton = goldenBtns[0].closest('button');
    expect(goldenButton.disabled).toBe(true);
  });

  it('should open Aadhaar claim modal on clicking button', () => {
    renderClaimCredentials();

    const claimButtons = screen.getAllByText('CLAIM CREDENTIALS');
    fireEvent.click(claimButtons[0]);

    expect(screen.getByText('Claim Aadhaar Credential')).toBeDefined();
    expect(screen.getByText('Verify & Claim')).toBeDefined();
  });
});
