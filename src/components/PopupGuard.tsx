'use client';

import { useEffect, useState } from 'react';

/**
 * PopupGuard
 *
 * During a Firebase signInWithPopup flow, the OAuth popup window navigates to
 * your domain's /__/auth/handler path. Firebase's own JS handles closing the
 * popup after the handshake. However, if the popup ever lands on a "real" page
 * of your app (e.g., via a misconfigured redirect_uri or a full page reload
 * inside the popup), your entire React tree renders inside it — and the user
 * sees your landing page with the login button again.
 *
 * This component detects that scenario via `window.opener !== null` and renders
 * a blank screen + attempts to close the popup window. This prevents any app UI
 * from showing inside the popup and stops accidental re-triggers of authentication.
 *
 * It is intentionally placed ABOVE AuthProvider in the layout so it fires before
 * any auth context mounts.
 */
export default function PopupGuard({ children }: { children: React.ReactNode }) {
    const [isPopup, setIsPopup] = useState(false);

    useEffect(() => {
        // Only run on the client
        if (typeof window === 'undefined') return;

        // `window.opener` is non-null when this tab/window was opened programmatically
        // (e.g., by signInWithPopup). Firebase's auth handler normally closes the popup
        // by itself, but if our app renders we must suppress the UI and close manually.
        const opener = window.opener;
        if (opener && opener !== window) {
            // Bypass for specific public routes that users often open in new tabs
            const path = window.location.pathname;
            if (path.startsWith('/pass') || path.startsWith('/scoreboard') || path.startsWith('/register')) {
                return;
            }

            setIsPopup(true);

            // Give Firebase's JS a moment to complete its handshake and close the popup.
            // If it doesn't close within 2 s we force-close it so the user isn't stranded.
            const timer = setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    // Browser may block window.close() for windows not opened by script.
                    // Nothing we can do in that case — at least the UI is blank.
                }
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, []);

    if (isPopup) {
        // Render a blank screen — no auth context, no login buttons, nothing.
        // Firebase will close this window when it's done.
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: '#050505',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '14px',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                Completing sign-in… this window will close automatically.
            </div>
        );
    }

    return <>{children}</>;
}
