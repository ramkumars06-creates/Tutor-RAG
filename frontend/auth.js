// ═══════════════════════════════════════════════════
//  PR's Tutor RAG — Google Sign-In (auth.js)
//  Handles GSI initialization, sign-in, sign-out
//  and provides getIdToken() for API calls.
// ═══════════════════════════════════════════════════

'use strict';

// ── Config ───────────────────────────────────────────
// IMPORTANT: Replace with your actual Google OAuth Client ID
// Get it from: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = '84636028939-57rblnai4d1otk2c0hn2mif0pea4pi0m.apps.googleusercontent.com';

// Backend URL — update this after deploying to Render.com
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : 'https://prs-tutor-rag-backend.onrender.com/'; // ← replace after deploying

// ── Auth State ────────────────────────────────────────
window.AUTH = {
  user: null,
  idToken: null,
  tokenExpiry: null,
  backendUrl: BACKEND_URL,
};

// ── Token Helpers ─────────────────────────────────────
function isTokenValid() {
  return window.AUTH.idToken && window.AUTH.tokenExpiry && Date.now() < window.AUTH.tokenExpiry;
}

async function getIdToken() {
  if (!window.AUTH.idToken) throw new Error('Not signed in');
  // Google ID tokens expire in 1 hour — if near expiry, prompt re-sign
  if (!isTokenValid()) {
    showToast('Session expired. Please sign in again.', 'warning');
    handleSignOut();
    throw new Error('Token expired');
  }
  return window.AUTH.idToken;
}
window.getIdToken = getIdToken;

// ── GSI Initialization ────────────────────────────────
function initGoogleSignIn() {
  if (typeof google === 'undefined' || !google?.accounts?.id) {
    console.warn('GSI library not loaded. Showing fallback.');
    document.getElementById('signinFallback').hidden = false;
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: false,
    use_fedcm_for_prompt: true,
  });

  // Render the Google Sign-In button
  google.accounts.id.renderButton(
    document.getElementById('googleSignInBtn'),
    {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'left',
      width: 280,
    }
  );

  // Try One Tap prompt (optional, may be blocked by browser settings)
  google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed()) {
      console.log('One Tap not displayed:', notification.getNotDisplayedReason());
    }
  });
}

// ── Handle Sign-In Response ───────────────────────────
async function handleCredentialResponse(response) {
  if (!response?.credential) {
    showToast('Sign-in failed. Please try again.', 'error');
    return;
  }

  try {
    // Decode the JWT payload (not verification — backend does that)
    const parts = response.credential.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    window.AUTH.idToken = response.credential;
    // Google ID tokens expire in 1 hour; set expiry 5 min early for safety
    window.AUTH.tokenExpiry = (payload.exp * 1000) - (5 * 60 * 1000);
    window.AUTH.user = {
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };

    onSignedIn(window.AUTH.user);

  } catch (err) {
    console.error('Sign-in error:', err);
    showToast('Sign-in error. Please try again.', 'error');
  }
}

// ── UI: Transition to App ─────────────────────────────
async function onSignedIn(user) {
  // Update header profile
  const avatar = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');

  if (user.picture) {
    avatar.src = user.picture;
    avatar.alt = user.name;
  } else {
    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=7c6aff&color=fff&size=36`;
  }
  nameEl.textContent = user.name.split(' ')[0]; // First name only
  emailEl.textContent = user.email;

  // Animate transition
  const loginScreen = document.getElementById('loginScreen');
  const appWrapper  = document.getElementById('appWrapper');

  loginScreen.style.opacity = '0';
  loginScreen.style.transform = 'scale(0.95)';
  loginScreen.style.transition = 'all 0.4s ease';

  setTimeout(() => {
    loginScreen.hidden = true;
    appWrapper.hidden = false;
    appWrapper.style.opacity = '0';
    appWrapper.style.transition = 'opacity 0.4s ease';
    requestAnimationFrame(() => { appWrapper.style.opacity = '1'; });
  }, 400);

  showToast(`Welcome back, ${user.name.split(' ')[0]}! 🎉`, 'success', 3500);
}

// ── Sign Out ──────────────────────────────────────────
function handleSignOut() {
  window.AUTH.idToken = null;
  window.AUTH.tokenExpiry = null;
  window.AUTH.user = null;

  if (typeof google !== 'undefined') {
    google.accounts.id.disableAutoSelect();
  }

  const appWrapper  = document.getElementById('appWrapper');
  const loginScreen = document.getElementById('loginScreen');

  appWrapper.style.opacity = '0';
  appWrapper.style.transition = 'opacity 0.3s ease';
  setTimeout(() => {
    appWrapper.hidden = true;
    loginScreen.hidden = false;
    loginScreen.style.opacity = '0';
    loginScreen.style.transform = 'scale(0.95)';
    loginScreen.style.transition = 'all 0.4s ease';
    requestAnimationFrame(() => {
      loginScreen.style.opacity = '1';
      loginScreen.style.transform = 'scale(1)';
    });
  }, 300);
}

document.getElementById('signOutBtn').addEventListener('click', () => {
  handleSignOut();
  showToast('Signed out successfully', 'info');
});

// ── Manual Sign-In fallback ───────────────────────────
document.getElementById('manualSignInBtn')?.addEventListener('click', () => {
  if (typeof google !== 'undefined') {
    google.accounts.id.prompt();
  } else {
    showToast('Google Sign-In is unavailable. Check your internet connection.', 'error');
  }
});

// ── Init on DOM ready ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Wait a moment for the GSI script to load
  setTimeout(initGoogleSignIn, 500);
});

// If GSI loads after DOM, initialize it via callback
window.onGoogleScriptLoad = initGoogleSignIn;
