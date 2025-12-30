import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../../App';
import * as authHooks from '../../hooks/useAuthState';

// Mock UI Components to simplify
vi.mock('../../components/auth/LoginPage', () => ({
    LoginPage: ({ onLoginSuccess }: any) => (
        <button data-testid="login-btn" onClick={onLoginSuccess}>Login</button>
    )
}));

vi.mock('./setup', () => ({
    render: (ui: any) => render(ui)
}));

describe('Flicker-Free Login Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock reload
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { reload: vi.fn(), search: '' },
            writable: true
        });
    });

    it('should transition smoothly without window.location.reload when login succeeds', async () => {
        const mockUseAuthState = vi.spyOn(authHooks, 'useAuthState');

        // 1. Initial State: Not logged in
        mockUseAuthState.mockReturnValue({
            user: null,
            loading: false,
            error: null,
            role: null,
            isOfflineMode: false,
            isFirebaseConnected: false
        } as any);

        const { rerender } = render(<App />);

        const loginBtn = screen.getByTestId('login-btn');
        expect(loginBtn).toBeDefined();

        // 2. Simulate Login Click
        act(() => {
            loginBtn.click();
        });

        // 3. Verify window.location.reload WAS NOT called
        expect(window.location.reload).not.toHaveBeenCalled();

        // 4. Simulate State change (the actual user coming back from Firebase)
        mockUseAuthState.mockReturnValue({
            user: { uid: 'user-123', email: 'test@hospital.cl' },
            loading: false,
            error: null,
            role: 'admin',
            isOfflineMode: false,
            isFirebaseConnected: true
        } as any);

        rerender(<App />);

        // 5. Verify it moved past LoginPage (assuming AppInner or AppContent shows something else)
        expect(screen.queryByTestId('login-btn')).toBeNull();
    });
});
