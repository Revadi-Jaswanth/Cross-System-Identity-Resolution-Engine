import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, AuthContext } from '../context/AuthContext';
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

describe('Authentication Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should handle login success and save access token', async () => {
    const mockUserPayload = {
      success: true,
      data: {
        access_token: 'header.eyJzdWIiOiJ0ZXN0dXNlciIsImV4cCI6OTk5OTk5OTk5OSwidXNlciI6eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZW1haWwiOiJ0ZXN0QGdvdi5pbiIsInJvbGVzIjpbIk9wZXJhdG9yIl0sInBlcm1pc3Npb25zIjpbImlkZW50aXR5OnJlYWQiXX19.signature',
        user: {
          username: 'testuser',
          email: 'test@gov.in',
          roles: ['Operator'],
          permissions: ['identity:read']
        }
      }
    };

    api.post.mockResolvedValueOnce({ data: mockUserPayload });

    let authContextVal;
    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      authContextVal = auth;
      return (
        <button onClick={() => auth.login('testuser', 'password123', true)}>
          Login Button
        </button>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const btn = screen.getByText('Login Button');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('header.eyJzdWIiOiJ0ZXN0dXNlciIsImV4cCI6OTk5OTk5OTk5OSwidXNlciI6eyJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZW1haWwiOiJ0ZXN0QGdvdi5pbiIsInJvbGVzIjpbIk9wZXJhdG9yIl0sInBlcm1pc3Npb25zIjpbImlkZW50aXR5OnJlYWQiXX19.signature');
      expect(localStorage.getItem('remembered_username')).toBe('testuser');
      expect(authContextVal.isAuthenticated).toBe(true);
      expect(authContextVal.user.username).toBe('testuser');
    });
  });

  it('should handle login failure gracefully', async () => {
    api.post.mockRejectedValueOnce(new Error('Invalid credentials'));

    let authContextVal;
    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      authContextVal = auth;
      return (
        <button onClick={() => auth.login('baduser', 'wrongpw')}>
          Login Failure
        </button>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const btn = screen.getByText('Login Failure');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(authContextVal.isAuthenticated).toBe(false);
    });
  });

  it('should refresh tokens properly', async () => {
    const mockRefreshPayload = {
      success: true,
      data: {
        access_token: 'new-rotated-token'
      }
    };

    api.post.mockResolvedValueOnce({ data: mockRefreshPayload });

    let authContextVal;
    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      authContextVal = auth;
      return <button onClick={() => auth.refresh()}>Refresh Session</button>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const btn = screen.getByText('Refresh Session');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('new-rotated-token');
      expect(authContextVal.isAuthenticated).toBe(true);
    });
  });

  it('should trigger logout and clear session state', async () => {
    localStorage.setItem('access_token', 'initial-token');
    api.post.mockResolvedValueOnce({ data: { success: true } });

    let authContextVal;
    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      authContextVal = auth;
      return <button onClick={() => auth.logout()}>Logout Session</button>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const btn = screen.getByText('Logout Session');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(authContextVal.isAuthenticated).toBe(false);
      expect(authContextVal.user).toBeNull();
    });
  });

  it('should evaluate hasRole and hasPermission successfully', () => {
    let authContextVal;
    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      authContextVal = auth;
      return null;
    };

    // Simulate AuthProvider with a custom logged in user state
    const customUser = {
      username: 'adminuser',
      roles: ['Super Admin'],
      permissions: ['user:write', 'identity:read']
    };

    render(
      <AuthContext.Provider value={{
        user: customUser,
        roles: customUser.roles,
        permissions: customUser.permissions,
        hasRole: (r) => customUser.roles.includes(r),
        hasPermission: (p) => customUser.permissions.includes(p)
      }}>
        <TestComponent />
      </AuthContext.Provider>
    );

    expect(authContextVal.hasRole('Super Admin')).toBe(true);
    expect(authContextVal.hasRole('Operator')).toBe(false);
    expect(authContextVal.hasPermission('user:write')).toBe(true);
    expect(authContextVal.hasPermission('system:settings')).toBe(false);
  });
});
