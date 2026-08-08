/**
 * log_n_reg.js — logic for log_n_reg.html (login / register page in a new tab)
 *
 * - Reads ?mode=login|register from the URL to pre-select the correct tab.
 * - Handles form submissions for both login and registration.
 * - On success: saves the JWT token to chrome.storage.local, then closes
 *   this tab. The next time the user opens the extension, auth.js will pick
 *   up the stored token and skip the login screen automatically.
 */

const BACKEND = 'http://127.0.0.1:8001';

// ── Tab switching ─────────────────────────────────────────────────────────────
const tabLogin    = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const panelLogin  = document.getElementById('panel-login');
const panelReg    = document.getElementById('panel-register');

function buildSwitchHint(isLogin) {
    const hint = document.getElementById('switch-hint');
    if (isLogin) {
        hint.innerHTML = `Don't have an account? <span id="switch-link">Register</span>`;
    } else {
        hint.innerHTML = `Already have an account? <span id="switch-link">Sign In</span>`;
    }
    document.getElementById('switch-link').addEventListener('click', () => {
        if (isLogin) showRegister(); else showLogin();
    });
}

function showLogin() {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    panelLogin.classList.remove('hidden');
    panelReg.classList.add('hidden');
    buildSwitchHint(true);
}

function showRegister() {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    panelReg.classList.remove('hidden');
    panelLogin.classList.add('hidden');
    buildSwitchHint(false);
}

tabLogin.addEventListener('click', showLogin);
tabRegister.addEventListener('click', showRegister);

// Pre-select tab based on ?mode= query param
const mode = new URLSearchParams(window.location.search).get('mode');
if (mode === 'register') showRegister();
else showLogin();


// ── Helpers ───────────────────────────────────────────────────────────────────
function showMsg(el, text, type) {
    el.textContent = text;
    el.className = `msg show ${type}`;
}

function setLoading(btn, loading) {
    let loaderEl = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (loading) {
        if (!loaderEl) {
            loaderEl = document.createElement('span');
            loaderEl.className = 'btn-loader';
            btn.appendChild(loaderEl);
        }
        loaderEl.style.display = 'inline-block';
    } else if (loaderEl) {
        loaderEl.style.display = 'none';
    }
}

function saveTokenAndClose(token, email) {
    // Store email in both localStorage and chrome.storage.local
    localStorage.setItem('email', email);
    chrome.storage.local.set({ auth_token: token, email: email }, () => {
        setTimeout(() => window.close(), 1800);
    });
}


// ── Login ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-do-login').addEventListener('click', async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const msgEl    = document.getElementById('login-msg');
    const btn      = document.getElementById('btn-do-login');

    if (!email || !password) {
        showMsg(msgEl, 'Please fill in all fields.', 'error');
        return;
    }

    setLoading(btn, true);
    msgEl.className = 'msg';

    try {
        const res = await fetch(`${BACKEND}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showMsg(msgEl, '✓ Signed in! You can close this tab.', 'success');
            if (data.token) saveTokenAndClose(data.token, email);
            else setTimeout(() => window.close(), 1800);
        } else {
            showMsg(msgEl, data.detail || 'Invalid credentials. Please try again.', 'error');
        }
    } catch (err) {
        showMsg(msgEl, 'Could not connect to the backend. Is it running?', 'error');
    } finally {
        setLoading(btn, false);
    }
});


// ── Register ──────────────────────────────────────────────────────────────────
document.getElementById('btn-do-register').addEventListener('click', async () => {
    const full_name = document.getElementById('reg-name').value.trim();
    const email     = document.getElementById('reg-email').value.trim();
    const username  = document.getElementById('reg-username').value.trim();
    const mobile_no = document.getElementById('reg-mobile').value.trim();
    const password  = document.getElementById('reg-password').value;
    const msgEl     = document.getElementById('register-msg');
    const btn       = document.getElementById('btn-do-register');

    if (!full_name || !email || !username || !mobile_no || !password) {
        showMsg(msgEl, 'Please fill in all fields.', 'error');
        return;
    }

    setLoading(btn, true);
    msgEl.className = 'msg';

    try {
        const res = await fetch(`${BACKEND}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, username, mobile_no, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showMsg(msgEl, '✓ Account created! You can close this tab.', 'success');
            if (data.token) saveTokenAndClose(data.token, email);
            else setTimeout(() => window.close(), 1800);
        } else {
            const detail = data.detail || 'Registration failed. Please try again.';
            showMsg(msgEl, detail, 'error');
        }
    } catch (err) {
        showMsg(msgEl, 'Could not connect to the backend. Is it running?', 'error');
    } finally {
        setLoading(btn, false);
    }
});
