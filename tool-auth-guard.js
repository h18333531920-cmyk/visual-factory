(function () {
  const config = window.VF_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const isEmbedded = params.get('embedded') === '1' && window.top !== window.self;
  const route = detectRoute();
  const token = localStorage.getItem('vf_access_token');

  document.documentElement.classList.add('vf-tool-auth-pending');
  const style = document.createElement('style');
  style.textContent = '.vf-tool-auth-pending body{visibility:hidden}';
  document.head.appendChild(style);

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

  fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }
  })
    .then(response => {
      if (!response.ok) throw new Error('Invalid session');
      revealTool();
    })
    .catch(() => {
      localStorage.removeItem('vf_access_token');
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
    if (path.includes('/tools/static/')) return 'static';
    if (path.includes('/tools/dynamic/')) return 'dynamic';
    return '';
  }
})();
