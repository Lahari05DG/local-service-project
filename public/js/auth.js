/* ============================================
   Auth Page Logic (login + register)
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to dashboard
  if (isLoggedIn()) {
    const user = getUser();
    window.location.href = user.role === 'owner' ? '/owner_dashboard.html' : '/worker_dashboard.html';
    return;
  }

  // ── Password visibility toggles ──
  setupPasswordToggle('toggle-password', 'login-password');
  setupPasswordToggle('toggle-reg-password', 'reg-password');

  // ── Login Form ──
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('login-btn');
      const phone = document.getElementById('login-phone').value.trim();
      const password = document.getElementById('login-password').value;

      if (!phone || !password) {
        showToast('Please fill in all fields', 'warning');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Signing in…';

      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });

      if (data) {
        saveAuth(data.token, data.user);
        showToast('Welcome back!', 'success');
        setTimeout(() => {
          window.location.href = data.user.role === 'owner'
            ? '/owner_dashboard.html'
            : '/worker_dashboard.html';
        }, 600);
      } else {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  // ── Register Form ──
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('register-btn');
      const name = document.getElementById('reg-name').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;
      const location = document.getElementById('reg-location').value.trim();
      const role = document.querySelector('input[name="role"]:checked').value;

      if (!name || !phone || !password || !location) {
        showToast('Please fill in all fields', 'warning');
        return;
      }
      if (password.length < 4) {
        showToast('Password must be at least 4 characters', 'warning');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Creating account…';

      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, phone, password, role, location }),
      });

      if (data) {
        saveAuth(data.token, data.user);
        showToast('Account created successfully!', 'success');
        setTimeout(() => {
          window.location.href = data.user.role === 'owner'
            ? '/owner_dashboard.html'
            : '/worker_dashboard.html';
        }, 600);
      } else {
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }
});

// ── Password Toggle Helper ──
function setupPasswordToggle(toggleId, inputId) {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!toggle || !input) return;
  toggle.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggle.querySelector('.material-icons-outlined').textContent = isPassword ? 'visibility_off' : 'visibility';
  });
}
