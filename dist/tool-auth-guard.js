(function () {
  const config = window.VF_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const isEmbedded = params.get('embedded') === '1' && window.top !== window.self;
  const route = detectRoute();
  const token = sessionStorage.getItem('vf_account_isolated') === '1' ? sessionStorage.getItem('vf_isolated_access_token') : localStorage.getItem('vf_access_token');

  document.documentElement.classList.add('vf-tool-auth-pending');
  const style = document.createElement('style');
  style.textContent = '.vf-tool-auth-pending body{visibility:hidden}';
  document.head.appendChild(style);

  let parentAccess;
  try { parentAccess = window.parent !== window ? window.parent.VFAccountAccess : null; } catch (_) {}
  if (parentAccess?.enabled) {
    window.VF_GET_ACCESS_TOKEN = () => parentAccess.getToken();
    window.VF_ISOLATED_ACCOUNT_ID = sessionStorage.getItem('vf_account_isolated') === '1' ? sessionStorage.getItem('vf_isolated_user') || '' : '';
    // The shell and APIs validate the account. Keep the tool hidden until its
    // entitlement is known; a URL mode parameter does not grant access.
    window.fetch = function(input, init) { return parentAccess.fetch(typeof input === 'string' ? new URL(input, location.href).href : input, init); };
    parentAccess.refresh().then(() => {
      if (parentAccess.can(route)) revealTool();
      else window.top.location.replace('/#' + parentAccess.firstRoute());
    }).catch(() => redirectToLogin());
    return;
  }

  if (!isEmbedded) {
    redirectToShell(route);
    return;
  }

  if (isLocalPreviewToken(token)) {
    revealTool();
    return;
  }

  if (isEmergencyToken(token)) {
    revealTool();
    validateEmergencyToken(token);
    return;
  }

  if (!token || !config.supabaseUrl || !config.supabaseAnonKey) {
    redirectToLogin();
    return;
  }

  // v830：把 auth/v1 直连改道到同源中继，避免内网封锁 supabase.co 导致工具页被误判为会话失效。
  fetch('/api/auth-relay?path=' + encodeURIComponent('/auth/v1/user'), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(response => {
      if (!response.ok) throw new Error('Invalid session');
      revealTool();
    })
    .catch(() => {
      if (sessionStorage.getItem('vf_account_isolated') === '1') sessionStorage.removeItem('vf_isolated_access_token'); else localStorage.removeItem('vf_access_token');
      redirectToLogin();
    });

  function isLocalPreviewToken(value) {
    return config.allowLocalPreviewLogin &&
      ['localhost', '127.0.0.1', ''].includes(location.hostname) &&
      value === 'local-preview-token';
  }

  function isEmergencyToken(value) {
    return String(value || '').startsWith('vfem.');
  }

  function validateEmergencyToken(value) {
    fetch('/api/emergency-session', {
      headers: { Authorization: `Bearer ${value}` }
    })
      .then(response => {
        if (!response.ok) throw new Error('Invalid emergency session');
        revealTool();
      })
      .catch(() => {
        console.warn('Emergency session validation failed.');
      });
  }

  function revealTool() {
    document.documentElement.classList.remove('vf-tool-auth-pending');
  }

  function redirectToShell(hash) {
    location.replace(`/${hash ? `#${hash}` : ''}`);
  }

  function redirectToLogin() {
    try {
      window.top.location.replace('/');
    } catch (_error) {
      location.replace('/');
    }
  }

  function detectRoute() {
    const path = location.pathname;
    if (path.includes('/tools/library/')) return 'library';
    if (path.includes('/tools/icons/')) return 'icons';
    if (path.includes('/tools/static/')) return 'static';
    if (path.includes('/tools/dynamic/')) return 'dynamic';
    return '';
  }
})();
