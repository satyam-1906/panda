/**
 * auth.js — runs on index.html (extension popup landing page)
 *
 * On DOMContentLoaded:
 *   1. Reads the JWT token from chrome.storage.local (saved after login/register).
 *   2. Sends it as a Bearer header to GET /auto-login to verify the session.
 *   3. If valid → redirect to popup.html.
 *   4. On any failure → hide spinner and reveal Login / Register buttons.
 *
 * Login / Register buttons open log_n_reg.html in a new Chrome tab.
 */

const BACKEND = 'https://confident-refinish-amid.ngrok-free.dev';

document.addEventListener('DOMContentLoaded', () => {
    const checkingEl  = document.getElementById('checking');
    const authButtons = document.getElementById('auth-buttons');

    // ── Auto-login attempt ────────────────────────────────────────────────────
    chrome.storage.local.get(['auth_token'], async ({ auth_token }) => {
        if (auth_token) {
            try {
                const res = await fetch(`${BACKEND}/auto-login`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${auth_token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.logged_in) {
                        localStorage.setItem('email', data.user);
                        chrome.storage.local.set({ email: data.user }, () => {
                            // Valid session → go straight to main popup
                            window.location.href = 'popup.html';
                        });
                        return;
                    }
                }

                // Token was rejected or expired — clear it
                chrome.storage.local.remove('auth_token');
            } catch (_) {
                // Network error or backend not running — fall through to show auth UI
            }
        }

        // ── Show auth buttons ─────────────────────────────────────────────────
        checkingEl.classList.add('hidden');
        authButtons.classList.remove('hidden');
    });

    // Open log_n_reg.html in a new tab, passing ?mode= so that page can
    // pre-select the correct tab (login vs register).
    document.getElementById('btn-login').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('log_n_reg.html?mode=login') });
    });

    document.getElementById('btn-register').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('log_n_reg.html?mode=register') });
    });
});
