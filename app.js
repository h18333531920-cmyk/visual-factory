(function () {
  const ROLE_LABELS = {
    zh: { admin: '管理员', designer: '设计师', operator: '运营' },
    en: { admin: 'Admin', designer: 'Designer', operator: 'Operator' }
  };

  const I18N = {
    zh: {
      loginTitle: 'GCC Design',
      loginSubtitle: '把素材、海报和动效集中在一个安静的创意工作台。',
      email: '邮箱',
      password: '密码',
      signIn: '登录',
      signOut: '退出',
      workspace: 'Creative workspace',
      localPreviewHint: '本地预览模式仅用于检查界面，不会写入云端。',
      home: '创作首页',
      library: '素材库',
      staticDiy: 'DIY 静态',
      dynamicDiy: 'DIY 动态',
      requestFlow: '提需流程',
      admin: '团队管理',
      analytics: '数据看板',
      checkItem: '检查项',
      checkResult: '结果',
      checkDetail: '说明',
      ready: '已就绪',
      notReady: '未就绪',
      localOnly: '本地预览',
      saveProject: '保存项目',
      recentProjects: '近期项目',
      openProject: '打开项目',
      projectName: '项目名称',
      cancel: '取消',
      save: '保存',
      categoryNameZh: '中文分类名',
      categoryNameEn: '英文分类名',
      visibility: '可见范围',
      allVisible: '全部可见',
      designersOnly: '仅设计师可见',
      operatorsOnly: '仅运营可见',
      createCategory: '创建分类',
      createAccount: '创建账号',
      assetCount: '素材',
      sourceCount: '源文件',
      uploadAsset: '上传素材',
      allAssets: '全部素材',
      favoritesOnly: '仅收藏',
      displayName: '姓名',
      role: '角色',
      initialPassword: '初始密码'
    },
    en: {
      loginTitle: 'GCC Design',
      loginSubtitle: 'A calm creative workspace for assets, posters, and motion.',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign in',
      signOut: 'Sign out',
      workspace: 'Workspace',
      localPreviewHint: 'Local preview only checks the UI and does not write to cloud.',
      home: 'Create',
      library: 'Library',
      staticDiy: 'Static DIY',
      dynamicDiy: 'Dynamic DIY',
      requestFlow: 'Request Flow',
      admin: 'Team',
      analytics: 'Analytics',
      checkItem: 'Check',
      checkResult: 'Result',
      checkDetail: 'Detail',
      ready: 'Ready',
      notReady: 'Not ready',
      localOnly: 'Local only',
      saveProject: 'Save Project',
      recentProjects: 'Recent Projects',
      openProject: 'Open Project',
      projectName: 'Project Name',
      cancel: 'Cancel',
      save: 'Save',
      categoryNameZh: 'Chinese name',
      categoryNameEn: 'English name',
      visibility: 'Visibility',
      allVisible: 'Visible to all',
      designersOnly: 'Designers only',
      operatorsOnly: 'Operators only',
      createCategory: 'Create category',
      createAccount: 'Create account',
      assetCount: 'Assets',
      sourceCount: 'Sources',
      uploadAsset: 'Upload asset',
      allAssets: 'All assets',
      favoritesOnly: 'Favorites',
      displayName: 'Name',
      role: 'Role',
      initialPassword: 'Initial password'
    }
  };

  const ROUTES = [
    { id: 'home', icon: 'home', title: 'home' },
    { id: 'library', icon: 'library', title: 'library' },
    { id: 'static', icon: 'static', title: 'staticDiy' },
    { id: 'dynamic', icon: 'dynamic', title: 'dynamicDiy' },
    { id: 'request', icon: 'request', title: 'requestFlow', hidden: true },
    { id: 'admin', icon: 'admin', title: 'admin', adminOnly: true },
    { id: 'analytics', icon: 'analytics', title: 'analytics', adminOnly: true }
  ];

  const config = window.VF_CONFIG || {};
  const LIBRARY_BUCKET = 'vf-library';
  const TOOL_UI_VERSION = '20260805-export-cors-v79';
  const LIBRARY_SOURCE_PAGE_SIZE = 500;
  const LIBRARY_SOURCE_MAX_ROWS = 5000;
  const LIBRARY_RENDER_STEP = 80;
  const SUPABASE_IN_BATCH_SIZE = 200;
  const SIGNED_URL_BATCH_SIZE = 100;
  const SOURCE_EXTENSIONS = ['psd', 'psb', 'ai', 'pdf', 'zip', 'rar', '7z', 'gz', 'tar'];
  const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
  const PREVIEW_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_IMAGE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB
  const TEMPLATE_EXTENSIONS = ['json'];
  const LIBRARY_KIND_MARKERS = {
    gallery: 'vf:kind:gallery',
    source: 'vf:kind:source',
    template: 'vf:kind:template'
  };
  const LIBRARY_KIND_TABS = [
    { id: 'all', zh: '全部', en: 'All' },
    { id: 'source', zh: '案例库', en: 'Case Library' },
    { id: 'gallery', zh: '图库', en: 'Gallery' },
    { id: 'template', zh: '模板库', en: 'Templates' }
  ];
  const LIBRARY_TAGS = {
    gallery: {
      tag1: ['商家食物', '虚拟食物', 'LOGO素材', 'KIKI素材', '其他素材'],
      tag2ByTag1: {
        '商家食物': ['汉堡', '披萨', '阿拉伯菜', '三明治', '小吃', '健康餐', '烧烤', '甜品', '饮品', '炸物', '未分类'],
        '虚拟食物': ['汉堡', '披萨', '阿拉伯菜', '三明治', '小吃', '健康餐', '烧烤', '甜品', '饮品', '炸物', '未分类'],
        'LOGO素材': ['keeta logo', '商家logo', '未分类']
      }
    },
    source: {
      tag1: ['C端', 'B端', 'D端', 'M端'],
      tag2ByTag1: {
        'C端': ['开机海报', '弹窗', '头图', 'banner', '会场', '标签'],
        'B端': ['海报', '落地页'],
        'D端': ['骑手服装', '骑手装备'],
        'M端': ['社媒物料', 'OOH', 'OB']
      }
    },
    template: {
      tag1: ['模版', '组件'],
      tag2ByTag1: {
        '模版': ['社媒物料', 'C端物料'],
        '组件': ['标签', '背景', '品牌圆弧', 'LOGO', 'KIKI', '其他素材']
      }
    }
  };
  const state = {
    lang: localStorage.getItem('vf_lang') || 'zh',
    supabase: null,
    session: null,
    profile: null,
    localPreview: false,
    emergencyMode: false,
    route: 'home',
    activeFrame: null,
    toolFrames: {},
    libraryOptions: [],
    librarySources: [],
    libraryPreviews: [],
    libraryItems: [],
    libraryPreviewUrls: {},
    libraryFavorites: new Set(),
    librarySelectedPreviewId: '',
    libraryDataLoaded: false,
    libraryDataPromise: null,
    libraryRecoveryLabel: '',
    libraryVisibleLimit: LIBRARY_RENDER_STEP,
    libraryMultiSelect: false,
    librarySelectedIds: new Set(),
    recentProjects: [],
    libraryFilters: {
      query: '',
      kind: 'all',
      tag1: 'all',
      tag2: 'all',
      tag3: 'all',
      tag4: 'all',
      country: 'all',
      activity: 'all',
      category: 'all',
      uploadTag1: 'all',
      uploadTag2: 'all',
      uploadTag3: 'all',
      uploadTag4: 'all',
      uploadCountry: 'all',
      uploadActivity: 'all',
      favorites: false,
      selectedCountries: [],
      selectedActivities: [],
      selectedStrategies: [],
      selectedElements: [],
      selectedFormats: [],
      selectedQuantities: [],
      searchHistory: []
    }
  };

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function t(key) {
    return (I18N[state.lang] && I18N[state.lang][key]) || I18N.zh[key] || key;
  }

  function init() {
    cacheEls();
    bindEvents();
    refreshTranslations();
    initSupabase();
    restoreSession();
  }

  function cacheEls() {
    [
      'login-view', 'app-shell', 'login-form', 'login-email', 'login-password',
      'login-message', 'local-preview-actions', 'nav-list', 'lang-toggle',
      'sign-out-btn', 'route-kicker', 'route-title', 'content', 'user-chip',
      'save-project-btn', 'save-template-btn', 'project-modal', 'project-form', 'project-title-input',
      'project-save-note', 'project-modal-message', 'close-project-modal',
      'cancel-project-modal'
    ].forEach(id => {
      els[toCamel(id)] = document.getElementById(id);
    });
  }

  function toCamel(value) {
    return value.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  function bindEvents() {
    els.loginForm.addEventListener('submit', handleLogin);
    els.signOutBtn.addEventListener('click', signOut);
    els.langToggle.addEventListener('click', toggleLanguage);
    els.saveProjectBtn.addEventListener('click', openProjectModal);
    els.saveTemplateBtn.addEventListener('click', saveStaticTemplateToLibrary);
    els.projectForm.addEventListener('submit', saveProject);
    els.closeProjectModal.addEventListener('click', closeProjectModal);
    els.cancelProjectModal.addEventListener('click', closeProjectModal);
    els.localPreviewActions.addEventListener('click', event => {
      const btn = event.target.closest('button[data-role]');
      if (btn) startLocalPreview(btn.dataset.role);
    });
    window.addEventListener('hashchange', () => {
      navigate((location.hash || '#home').slice(1));
    });
    // 静态DIY模板同步消息监听
    window.addEventListener('message', handleToolMessage);
    // 全局拖拽上传：从桌面拖图片到页面任意位置，自动弹出上传弹窗
    var dropOverlay = document.createElement('div');
    dropOverlay.id = 'global-drop-overlay';
    dropOverlay.innerHTML = '<div class="global-drop-inner"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"><path d="M12 3v14"/><path d="M5 10l7-7 7 7"/><path d="M4 17h16v4H4z"/></svg><strong>' + (state.lang === 'zh' ? '释放以添加入库' : 'Drop to upload') + '</strong><span>' + (state.lang === 'zh' ? '支持 JPG / PNG / WEBP，大图自动压缩' : 'JPG / PNG / WEBP, auto-compress large images') + '</span></div>';
    dropOverlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);align-items:center;justify-content:center;flex-direction:column;pointer-events:none;';
    document.body.appendChild(dropOverlay);
    var dragCounter = 0;
    window.addEventListener('dragover', function(event) {
      event.preventDefault();
    }, { capture: true });
    window.addEventListener('dragenter', function(event) {
      event.preventDefault();
      dragCounter++;
      var files = Array.from(event.dataTransfer.files || []);
      var hasImage = files.some(function(f) { return (f.type || '').startsWith('image/'); });
      if (hasImage || !event.dataTransfer.types || event.dataTransfer.types.indexOf('Files') !== -1) {
        dropOverlay.style.display = 'flex';
      }
    }, { capture: true });
    document.addEventListener('dragleave', function(event) {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dropOverlay.style.display = 'none';
      }
    });
    window.addEventListener('drop', function(event) {
      event.preventDefault();
      dragCounter = 0;
      dropOverlay.style.display = 'none';
      var uploadModal = document.getElementById('library-upload-modal');
      if (uploadModal && !uploadModal.hidden) return;
      var el = event.target;
      if (el && el.closest && el.closest('.library-drop-zone')) return;
      var files = Array.from(event.dataTransfer.files || []);
      if (!files.length) return;
      var imageFiles = files.filter(function(f) { return (f.type || '').startsWith('image/'); });
      if (!imageFiles.length) return;
      if (state.route !== 'library') {
        navigate('library');
        setTimeout(function() {
          openLibraryUploadModal({ files: imageFiles });
        }, 500);
      } else {
        openLibraryUploadModal({ files: imageFiles });
      }
    }, { capture: true });
  }

  function toolFrameCache() {
    let cache = document.getElementById('tool-frame-cache');
    if (!cache) {
      cache = document.createElement('div');
      cache.id = 'tool-frame-cache';
      cache.hidden = true;
      document.body.appendChild(cache);
    }
    return cache;
  }

  function parkActiveToolFrame() {
    if (!state.activeFrame) return;
    if (state.activeFrame.parentElement) {
      toolFrameCache().appendChild(state.activeFrame);
    }
    state.activeFrame = null;
  }

  function initSupabase() {
    if (window.supabase && config.supabaseUrl && config.supabaseAnonKey) {
      state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      state.supabase.auth.onAuthStateChange((_event, session) => {
        if (!session && (state.emergencyMode || isEmergencyToken(localStorage.getItem('vf_access_token')))) return;
        state.session = session;
        syncAccessToken();
      });
    }
    const canLocalPreview = config.allowLocalPreviewLogin && ['localhost', '127.0.0.1', ''].includes(location.hostname);
    els.localPreviewActions.hidden = !canLocalPreview;
  }

  async function restoreSession() {
    const savedToken = localStorage.getItem('vf_access_token');
    if (isEmergencyToken(savedToken)) {
      const restored = await restoreEmergencySession(savedToken);
      if (restored) return;
    }
    if (!state.supabase) {
      showLoginMessage('Supabase config is missing or SDK failed to load.', true);
      return;
    }
    const { data } = await state.supabase.auth.getSession();
    state.session = data.session;
    syncAccessToken();
    if (!state.session) {
      showLogin();
      return;
    }
    await loadProfile();
    showApp();
    void logAssetEvent('login');
  }

  async function handleLogin(event) {
    event.preventDefault();
    showLoginMessage('');
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    if (!state.supabase) {
      await emergencyLogin(email, password, 'Supabase SDK is not ready.');
      return;
    }
    try {
      const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (isSupabaseNetworkError(error)) {
          await emergencyLogin(email, password, error.message);
          return;
        }
        showLoginMessage(error.message, true);
        return;
      }
      state.localPreview = false;
      state.emergencyMode = false;
      state.session = data.session;
      syncAccessToken();
      await loadProfile();
      showApp();
      void logAssetEvent('login');
    } catch (error) {
      if (isSupabaseNetworkError(error)) {
        await emergencyLogin(email, password, error.message);
        return;
      }
      showLoginMessage(error.message || '登录失败。', true);
    }
  }

  function isSupabaseNetworkError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('failed to fetch') ||
      message.includes('fetch failed') ||
      message.includes('network') ||
      message.includes('unreachable');
  }

  function isEmergencyToken(value) {
    return String(value || '').startsWith('vfem.');
  }

  async function emergencyLogin(email, password, reason = '') {
    showLoginMessage(state.lang === 'zh' ? '主登录服务暂不可用，正在启用应急登录...' : 'Primary login is unavailable. Trying emergency login...');
    try {
      const response = await fetch('/api/emergency-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || `HTTP ${response.status}`);
      startEmergencySession(data.profile, data.token);
    } catch (error) {
      const detail = error.message || reason || 'Emergency login failed.';
      showLoginMessage(state.lang === 'zh' ? `登录服务不可用：${detail}` : `Login unavailable: ${detail}`, true);
    }
  }

  async function restoreEmergencySession(token) {
    try {
      const response = await fetch('/api/emergency-session', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || `HTTP ${response.status}`);
      startEmergencySession(data.profile, token);
      return true;
    } catch (error) {
      localStorage.removeItem('vf_access_token');
      console.warn('Emergency session restore failed:', error);
      return false;
    }
  }

  async function loadProfile() {
    const user = state.session && state.session.user;
    if (!user || !state.supabase) return;
    const fallback = {
      id: user.id,
      email: user.email || '',
      display_name: user.user_metadata?.display_name || user.email || 'User',
      role: user.user_metadata?.role || 'operator'
    };
    const { data, error } = await state.supabase
      .from('vf_profiles')
      .select('id,email,display_name,role,status')
      .eq('id', user.id)
      .maybeSingle();
    state.profile = data || { ...fallback, setup_error: error ? error.message : '' };
  }

  function startLocalPreview(role) {
    state.localPreview = true;
    state.emergencyMode = false;
    state.profile = {
      id: `local_${role}`,
      email: `${role}@local.preview`,
      display_name: role === 'operator' ? 'Local Operator' : role === 'designer' ? 'Local Designer' : 'Local Admin',
      role
    };
    state.session = { access_token: 'local-preview-token', user: { id: state.profile.id } };
    syncAccessToken();
    showApp();
  }

  function startEmergencySession(profile, token) {
    state.localPreview = true;
    state.emergencyMode = true;
    state.profile = {
      id: profile.id,
      email: profile.email || '',
      display_name: profile.display_name || profile.email || 'Emergency User',
      role: profile.role || 'operator'
    };
    state.session = {
      access_token: token,
      user: {
        id: state.profile.id,
        email: state.profile.email
      }
    };
    syncAccessToken();
    showApp();
  }

  async function signOut() {
    localStorage.removeItem('vf_access_token');
    state.session = null;
    state.profile = null;
    state.localPreview = false;
    state.emergencyMode = false;
    if (state.supabase) await state.supabase.auth.signOut();
    showLogin();
  }

  function syncAccessToken() {
    if (state.session?.access_token) {
      localStorage.setItem('vf_access_token', state.session.access_token);
    } else {
      localStorage.removeItem('vf_access_token');
    }
  }

  function showLogin() {
    els.loginView.hidden = false;
    els.appShell.hidden = true;
  }

  function showApp() {
    els.loginView.hidden = true;
    els.appShell.hidden = false;
    renderNav();
    renderUserChip();
    navigate((location.hash || '#home').slice(1));
  }

  function renderNav() {
    els.navList.innerHTML = '';
    ROUTES
      .filter(route => !route.hidden && (!route.adminOnly || currentRole() === 'admin'))
      .forEach(route => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `nav-item ${state.route === route.id ? 'active' : ''}`;
        button.dataset.route = route.id;
        button.title = t(route.title);
        button.setAttribute('aria-label', t(route.title));
        button.innerHTML = `<span class="nav-icon" aria-hidden="true">${navIcon(route.icon)}</span><span>${t(route.title)}</span>`;
        button.addEventListener('click', () => {
          location.hash = route.id;
          navigate(route.id);
        });
        els.navList.appendChild(button);
      });
  }

  function renderUserChip() {
    const profile = state.profile || {};
    const name = profile.display_name || profile.email || 'User';
    els.userChip.innerHTML = `
      <span class="user-avatar">${escapeHtml((name || 'U').slice(0, 1).toUpperCase())}</span>
      <span>${escapeHtml(name)}</span>
      <span class="user-role">${escapeHtml(roleLabel(profile.role))}</span>
    `;
  }

  function navigate(routeId) {
    parkActiveToolFrame();
    const allowed = ROUTES.some(route => route.id === routeId && (!route.adminOnly || currentRole() === 'admin'));
    state.route = allowed ? routeId : 'home';
    els.appShell.dataset.route = state.route;
    if (els.projectModal) els.projectModal.hidden = true;
    renderNav();
    const route = ROUTES.find(item => item.id === state.route);
    els.routeKicker.textContent = state.emergencyMode ? 'Emergency Mode' : state.localPreview ? 'Local Preview' : 'gccdesign.app';
    els.routeTitle.textContent = t(route.title);
    els.saveProjectBtn.hidden = !['static', 'dynamic'].includes(state.route);
    els.saveTemplateBtn.hidden = state.route !== 'static';
    if (state.route === 'home') renderCreativeHome();
    if (state.route === 'library') { state.libraryDataLoaded = false; renderLibrary(); }
    if (state.route === 'static') renderTool('static');
    if (state.route === 'dynamic') renderTool('dynamic');
    if (state.route === 'request') renderRequestFlow();
    if (state.route === 'admin') renderAdmin();
    if (state.route === 'analytics') renderAnalyticsPage();
  }

  function navIcon(icon) {
    const icons = {
      home: '<svg viewBox="0 0 24 24"><path d="M4 11.4 12 4l8 7.4"/><path d="M6.7 10.5V20h10.6v-9.5"/><path d="M9.6 20v-5.5h4.8V20"/></svg>',
      library: '<svg viewBox="0 0 24 24"><path d="M5 6.3h14v11.4H5z"/><path d="M8 3.8h8M8 20.2h8"/><path d="m8.2 15.3 2.4-2.8 2.2 2.2 1.6-1.8 2.7 3.2"/></svg>',
      static: '<svg viewBox="0 0 24 24"><rect x="4" y="4.8" width="16" height="14.4" rx="3"/><path d="M8 8.2h5.5M8 11h8"/><path d="M8 15.5h3.6l1.8-2 1.8 2H18"/></svg>',
      dynamic: '<svg viewBox="0 0 24 24"><rect x="4.4" y="5" width="15.2" height="14" rx="3"/><path d="M10 9v6l5.2-3L10 9z"/><path d="M7.5 3.8h9"/></svg>',
      request: '<svg viewBox="0 0 24 24"><path d="M5 5.5h14v10H8.5L5 19V5.5Z"/><path d="M8.5 9h7M8.5 12h4.5"/></svg>',
      admin: '<svg viewBox="0 0 24 24"><path d="M12 13.4a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M5.5 20c.9-3.2 3.1-4.8 6.5-4.8s5.6 1.6 6.5 4.8"/></svg>',
      analytics: '<svg viewBox="0 0 24 24"><rect x="3" y="13" width="4" height="7" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>'
    };
    return icons[icon] || '';
  }

  function renderCreativeHome() {
    return renderLibrary({ homeMode: true });
  }

  function renderHomeInspirationCard(title, colorA, colorB, size, action) {
    return `
      <article class="inspiration-card ${size || ''}">
        <img src="${escapeAttr(localPreviewArtwork(title, colorA, colorB, '#111827'))}" alt="${escapeAttr(title)}">
        <div class="inspiration-overlay">
          <span>${escapeHtml(title)}</span>
          ${action ? `<button type="button">${escapeHtml(action)}</button>` : ''}
        </div>
      </article>
    `;
  }

  function wireCreativeHome() {
    document.querySelectorAll('.home-page-demo [data-route], .home-tool-card[data-route], .section-row button[data-route]').forEach(node => {
      node.addEventListener('click', () => {
        location.hash = node.dataset.route;
        navigate(node.dataset.route);
      });
    });
    document.querySelectorAll('.home-chips button[data-query]').forEach(button => {
      button.addEventListener('click', () => {
        state.libraryFilters.query = button.dataset.query || '';
        location.hash = 'library';
        navigate('library');
      });
    });
    document.querySelectorAll('.home-channel-row button[data-query], .home-tool-switches button[data-query]').forEach(button => {
      button.addEventListener('click', () => {
        state.libraryFilters.query = button.dataset.query || '';
        location.hash = 'library';
        navigate('library');
      });
    });
    document.querySelectorAll('.home-tool-switches button[data-route]').forEach(button => {
      button.addEventListener('click', () => {
        location.hash = button.dataset.route;
        navigate(button.dataset.route);
      });
    });
    document.querySelectorAll('[data-placeholder="request"]').forEach(node => {
      node.addEventListener('click', () => {
        location.hash = 'request';
        navigate('request');
      });
    });
    document.getElementById('home-search-form')?.addEventListener('submit', event => {
      event.preventDefault();
      state.libraryFilters.query = document.getElementById('home-search-input').value.trim();
      location.hash = 'library';
      navigate('library');
    });
  }

  async function loadHomeRecentProjects() {
    const mount = document.getElementById('home-recent-projects');
    if (!mount) return;
    try {
      state.recentProjects = await fetchRecentProjects(6);
      renderHomeRecentProjects();
    } catch (error) {
      console.warn('Recent projects failed:', error);
      mount.hidden = true;
    }
  }

  async function fetchRecentProjects(limit = 6) {
    if (state.localPreview || !state.supabase) {
      return JSON.parse(localStorage.getItem('vf_local_projects') || '[]').slice(0, limit);
    }
    const { data, error } = await state.supabase
      .from('vf_projects')
      .select('id,title,project_type,updated_at,snapshot_meta,data_path')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  function renderHomeRecentProjects() {
    const mount = document.getElementById('home-recent-projects');
    if (!mount) return;
    if (!state.recentProjects.length) {
      mount.hidden = true;
      mount.innerHTML = '';
      return;
    }
    mount.hidden = false;
    mount.innerHTML = `
      <div class="home-recent-head">
        <span>${t('recentProjects')}</span>
        <small>${state.recentProjects.length}</small>
      </div>
      <div class="home-recent-list">
        ${state.recentProjects.map(project => `
          <button class="home-project-chip" type="button" data-open-project="${project.id}">
            <span>${escapeHtml(project.title)}</span>
            <small>${projectTypeLabel(project.project_type)} · ${formatDate(project.updated_at)}</small>
          </button>
        `).join('')}
      </div>
    `;
    mount.querySelectorAll('[data-open-project]').forEach(button => {
      button.addEventListener('click', async () => {
        const original = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span>${state.lang === 'zh' ? '正在打开...' : 'Opening...'}</span>`;
        try {
          await openSavedProject(button.dataset.openProject);
        } catch (error) {
          alert(error.message || (state.lang === 'zh' ? '打开项目失败' : 'Open project failed'));
          button.disabled = false;
          button.innerHTML = original;
        }
      });
    });
  }

  function projectTypeLabel(type) {
    if (type === 'dynamic') return state.lang === 'zh' ? '动态' : 'Motion';
    return state.lang === 'zh' ? '静态' : 'Static';
  }

  async function openSavedProject(projectId) {
    const project = state.recentProjects.find(item => item.id === projectId);
    if (!project) throw new Error(state.lang === 'zh' ? '没有找到项目记录。' : 'Project record was not found.');
    const snapshot = await loadProjectSnapshot(project);
    if (!snapshot || snapshot.schema !== 'vf-project-snapshot/v1') {
      throw new Error(state.lang === 'zh' ? '这个项目缺少可恢复的编辑器快照。' : 'This project does not include a restorable editor snapshot.');
    }
    snapshot.title = project.title;
    const target = project.project_type === 'dynamic' ? 'dynamic' : 'static';
    location.hash = target;
    navigate(target);
    await waitForToolImporter();
    const result = await state.activeFrame.contentWindow.VF_IMPORT_PROJECT(snapshot);
    if (result && result.success === false) throw new Error(result.message || 'Import failed');
  }

  async function loadProjectSnapshot(project) {
    if (state.localPreview || !state.supabase) {
      return project.snapshot || project.snapshot_meta;
    }
    if (!project.data_path) throw new Error(state.lang === 'zh' ? '项目缺少快照路径。' : 'Project is missing its snapshot path.');
    const { data, error } = await state.supabase.storage.from('vf-projects').download(project.data_path);
    if (error) throw error;
    return JSON.parse(await data.text());
  }

  function waitForToolImporter(timeoutMs = 10000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try {
          if (state.activeFrame?.contentWindow && typeof state.activeFrame.contentWindow.VF_IMPORT_PROJECT === 'function') {
            resolve();
            return;
          }
        } catch (_error) {}
        if (Date.now() - start > timeoutMs) {
          reject(new Error(state.lang === 'zh' ? '编辑器还没有准备好，请稍后再试。' : 'The editor is not ready yet. Please try again.'));
          return;
        }
        setTimeout(tick, 120);
      };
      tick();
    });
  }

  function renderRequestFlow() {
    parkActiveToolFrame();
    els.content.innerHTML = `
      <div class="request-page">
        <section class="request-hero">
          <div class="request-visual" aria-hidden="true"></div>
          <div>
            <div class="kicker">REQUEST FLOW</div>
            <h3>${state.lang === 'zh' ? '提需流程' : 'Request Flow'}</h3>
            <p>${state.lang === 'zh' ? '需求提交、排期、交付归档会放在这里。' : 'Requests, scheduling, and delivery archive will live here.'}</p>
          </div>
        </section>
        <section class="request-steps">
          <article><span>01</span><strong>${state.lang === 'zh' ? '提交需求' : 'Submit'}</strong></article>
          <article><span>02</span><strong>${state.lang === 'zh' ? '确认排期' : 'Schedule'}</strong></article>
          <article><span>03</span><strong>${state.lang === 'zh' ? '交付归档' : 'Archive'}</strong></article>
        </section>
      </div>
    `;
  }

  async function renderLibrary({ homeMode = false } = {}) {
    parkActiveToolFrame();
    const canUpload = canUploadAssets();
    const activeKind = state.libraryFilters.kind || 'all';
    var kindCounts = { source: 0, gallery: 0, template: 0 };
    if (state.librarySources) {
      for (var i = 0; i < state.librarySources.length; i++) {
        var k = libraryKindOfSource(state.librarySources[i]);
        if (k === 'source' || k === 'gallery' || k === 'template') kindCounts[k]++;
      }
    }
    els.content.innerHTML = `
      <div class="library-page ${homeMode ? 'library-page-home' : ''}">
        <section class="library-hero">
          <div class="library-hero-panel">
            <div class="library-hero-badge">${state.lang === 'zh' ? 'GCC Creative 1.1 已上线 ↗' : 'GCC Creative 1.1 is live ↗'}</div>
            <div class="library-hero-title">
              <span>Hey</span>
              <img class="library-hero-kiki" src="./assets/kiki-home.png" alt="" aria-hidden="true">
              <strong>${state.lang === 'zh' ? '你的高效设计伙伴' : 'Your efficient design partner'}</strong>
            </div>
            <label class="library-hero-command" aria-label="${state.lang === 'zh' ? '搜索素材或发起创作' : 'Search or create'}">
              <input id="library-hero-search" placeholder="${state.lang === 'zh' ? '输入任务或搜索素材' : 'Enter a task or search assets'}" value="${escapeAttr(state.libraryFilters.query)}">
              <button type="button" data-route="library" aria-label="${state.lang === 'zh' ? '进入超级库' : 'Open library'}">↑</button>
            </label>
          </div>
          <div class="library-module-row">
            <button type="button" data-route="library"><strong>${state.lang === 'zh' ? '超级库' : 'Super Library'}</strong><span>›</span></button>
            <button type="button" data-route="static"><strong>${state.lang === 'zh' ? '静态设计师' : 'Static Designer'}</strong><span>›</span></button>
            <button type="button" data-route="dynamic"><strong>${state.lang === 'zh' ? '动态设计师' : 'Motion Designer'}</strong><span>›</span></button>
            <button type="button" data-route="request"><strong>${state.lang === 'zh' ? '提需流程' : 'Request Flow'}</strong><span>›</span></button>
          </div>
        </section>

        <section class="library-control-strip" style="margin-left:0!important;margin-inline:0!important;padding-left:0!important;padding-right:0!important;background:transparent!important;border:none!important;border-radius:0!important;width:100%!important;grid-template-columns:1fr auto auto!important">
          <div class="library-kind-tabs" role="tablist" style="position:relative;">
            <div class="kind-tab-indicator" style="position:absolute;bottom:0;height:3px;background:#111827;border-radius:999px;transition:left 0.3s ease,width 0.3s ease;pointer-events:none;z-index:1;"></div>
            ${LIBRARY_KIND_TABS.map(tab => `<button type="button" class="${activeKind === tab.id ? 'active' : ''}" data-library-kind="${tab.id}">${escapeHtml(state.lang === 'zh' ? tab.zh : tab.en)}<small> · ${kindCounts[tab.id] || 0}</small></button>`).join('')}
            <div class="search-wrap">
            <label class="library-search-pill" aria-label="${state.lang === 'zh' ? '搜索内容' : 'Search'}" style="margin-left:12px;">
              <input id="library-search" placeholder="" value="${escapeAttr(state.libraryFilters.query)}">
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg></span>
            </label>
            <div id="search-history-dropdown" class="search-history-dropdown" hidden>
              <div class="search-history-list" id="search-history-list"></div>
            </div>
            </div>
          </div>
          <div class="library-upload-area">
            ${canUpload ? `<button class="library-upload-pill" type="button" id="open-upload-modal">${state.lang === 'zh' ? '上传素材 +' : 'Upload +'}</button>` : ''}
          </div>
          <div class="filter-dropdown-wrap">
            <button class="ghost-btn" type="button" id="library-filter-btn">${state.lang === 'zh' ? '筛选 ▾' : 'Filter ▾'}</button>
            <div id="library-filter-panel" class="filter-dropdown" hidden>
              <div class="filter-section" data-filter-section="country">
                <h4>${state.lang === 'zh' ? '国家' : 'Country'}</h4>
                <div class="filter-capsules" data-filter-options="country"></div>
              </div>
              <div class="filter-section" data-filter-section="activity">
                <h4>${state.lang === 'zh' ? '活动类型' : 'Activity'}</h4>
                <div class="filter-capsules" data-filter-options="activity"></div>
              </div>
              <div class="filter-section" data-filter-section="strategy">
                <h4>${state.lang === 'zh' ? '业务策略' : 'Strategy'}</h4>
                <div class="filter-capsules" data-filter-options="strategy"></div>
              </div>
              <div class="filter-section" data-filter-section="element">
                <h4>${state.lang === 'zh' ? '元素' : 'Element'}</h4>
                <div class="filter-capsules" data-filter-options="element"></div>
              </div>
              <div class="filter-section" data-filter-section="format">
                <h4>${state.lang === 'zh' ? '格式' : 'Format'}</h4>
                <div class="filter-capsules" data-filter-options="format"></div>
              </div>
              <div class="filter-section" data-filter-section="quantity">
                <h4>${state.lang === 'zh' ? '数量' : 'Quantity'}</h4>
                <div class="filter-capsules" data-filter-options="quantity"></div>
              </div>
              <div class="filter-section">
                <h4>${state.lang === 'zh' ? '收藏' : 'Favorites'}</h4>
                <div class="filter-capsules">
                  <button type="button" id="filter-favorites-btn" class="filter-capsule${state.libraryFilters.favorites ? ' active' : ''}" data-value="toggle">${state.libraryFilters.favorites ? '★' : '☆'} ${state.lang === 'zh' ? '仅收藏' : 'Favorites only'}</button>
                </div>
              </div>
              <div class="filter-section" style="border-top:1px solid #e2e8f0;padding-top:10px;margin-top:4px;">
                <button type="button" id="delete-all-templates-btn" class="ghost-btn" style="color:#dc2626;font-size:12px;width:100%;">🗑 ${state.lang === 'zh' ? '删除全部模版' : 'Delete all templates'}</button>
              </div>
            </div>
          </div>
                  <div id="library-tag-rows" class="library-tag-rows">${renderLibraryTagRows(activeKind)}</div>
        </section>

        <section id="library-status" class="library-status">${state.lang === 'zh' ? '正在读取素材库...' : 'Loading library...'}</section>
        <section class="library-board" style="margin-left:0!important;margin-inline:0!important;padding-left:0!important;width:100%!important">
          <section id="library-grid" class="library-grid"></section>
          <aside id="library-inspector" class="library-inspector"></aside>
        </section>

        ${canUpload ? renderUploadModal() : ''}
        ${renderEditModal()}
        ${renderBatchEditModal()}
        ${renderLibraryDetailModal()}
        <div id="context-menu" role="menu" aria-label="${state.lang === 'zh' ? '操作菜单' : 'Context menu'}"></div>
        <div id="multi-select-bar">
          <span class="bar-count">${state.lang === 'zh' ? '已选 0 项' : '0 selected'}</span>
          <button class="bar-edit" data-bar-action="edit">${state.lang === 'zh' ? '批量编辑' : 'Batch edit'}</button>
          <button class="bar-download" data-bar-action="download">${state.lang === 'zh' ? '批量下载' : 'Download'}</button>
          <button class="bar-delete" data-bar-action="delete">${state.lang === 'zh' ? '批量删除' : 'Delete'}</button>
          <button class="bar-cancel" data-bar-action="cancel">${state.lang === 'zh' ? '取消' : 'Cancel'}</button>
        </div>
      </div>
    `;
    wireLibraryShell();
    await loadLibraryData();
    refreshKindTabCounts();
    if (state.libraryScrollToSource) {
      var targetId = state.libraryScrollToSource;
      state.libraryScrollToSource = null;
      var item = state.libraryItems.find(function(li) { return li.source.id === targetId; });
      if (item) {
        selectLibraryItem(item.preview.id);
        var card = document.querySelector('.library-card[data-preview-id="' + item.preview.id + '"]');
        if (card) {
          setTimeout(function() { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 200);
        }
      }
    }
  }

  function refreshKindTabCounts() {
    var counts = { source: 0, gallery: 0, template: 0 };
    if (state.librarySources) {
      for (var i = 0; i < state.librarySources.length; i++) {
        var k = libraryKindOfSource(state.librarySources[i]);
        if (counts[k] !== undefined) counts[k]++;
      }
    }
    document.querySelectorAll('[data-library-kind]').forEach(function(btn) {
      var kind = btn.dataset.libraryKind;
      if (kind !== 'all' && counts[kind] !== undefined) {
        var label = btn.textContent.replace(/ · .*$/, '');
        btn.innerHTML = label + '<small> · ' + counts[kind] + '</small>';
      }
    });
  }

  function renderUploadModal() {
    const defaultKind = 'source';
    return `
      <div id="library-upload-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal">
          <div class="modal-head">
          </div>
          <form id="library-upload-form" class="library-form">
            <input type="hidden" name="library_kind" id="library-upload-kind" value="${defaultKind}">
            <div class="library-upload-scroll">
              <div class="library-upload-section">
                <span>${state.lang === 'zh' ? '入库位置' : 'Library section'}</span>
                <div class="library-kind-card-grid" role="radiogroup" aria-label="${state.lang === 'zh' ? '入库位置' : 'Library section'}">
                  <button type="button" class="library-kind-card ${defaultKind === 'source' ? 'active' : ''}" data-upload-kind-card="source">
                    <strong>${state.lang === 'zh' ? '案例库' : 'Case Library'}</strong>
                  </button>
                  <button type="button" class="library-kind-card ${defaultKind === 'gallery' ? 'active' : ''}" data-upload-kind-card="gallery">
                    <strong>${state.lang === 'zh' ? '图库' : 'Gallery'}</strong>
                  </button>
                  <button type="button" class="library-kind-card ${defaultKind === 'template' ? 'active' : ''}" data-upload-kind-card="template">
                    <strong>${state.lang === 'zh' ? '模板库' : 'Templates'}</strong>
                  </button>
                </div>
              </div>
              <label><span>${state.lang === 'zh' ? '素材名称' : 'Asset title'}</span><input name="title" id="library-upload-title" maxlength="120" placeholder="${state.lang === 'zh' ? '选填，不填则不显示名称' : 'Optional'}"></label>
              <div id="library-upload-tag-controls" class="library-upload-tags">${renderUploadTagControls(defaultKind)}</div>
              <div class="library-form-grid two" id="upload-meta-row">
<div class="upload-tag-picker" data-upload-tag-picker="country" id="upload-country-field">
                  <span>${state.lang === 'zh' ? '国家' : 'Country'}</span>
                  <input type="hidden" name="country" value="all" data-upload-tag-input="country">
                  <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="country">
                    <strong>${state.lang === 'zh' ? '全部' : 'All'}</strong>
                  </button>
                  <div class="upload-tag-menu" role="menu" data-upload-meta-menu="country"></div>
                </div>
                <div class="upload-tag-picker" data-upload-tag-picker="activity" id="upload-activity-field">
                  <span>${state.lang === 'zh' ? '活动类型' : 'Activity'}</span>
                  <input type="hidden" name="activity" value="all" data-upload-tag-input="activity">
                  <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="activity">
                    <strong>${state.lang === 'zh' ? '全部' : 'All'}</strong>
                  </button>
                  <div class="upload-tag-menu" role="menu" data-upload-meta-menu="activity"></div>
                </div>
              </div>

              <div class="library-drop-zone" data-upload-mode="gallery" data-drop-input="library-gallery-input">
                <input name="gallery_files" id="library-gallery-input" type="file" accept="image/jpeg,image/png,image/webp" multiple>
                <span>${state.lang === 'zh' ? '图库图片' : 'Gallery images'}</span>
                <strong>${state.lang === 'zh' ? '拖拽 JPG / PNG / WEBP 到这里，可多选' : 'Drop JPG / PNG / WEBP here, multiple allowed'}</strong>
                <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No files selected'}</small>
                <div class="drop-thumb-strip" data-thumb-strip style="display:none;"></div>
              </div>
              <div class="library-form-grid two" data-upload-mode="source">
                <div class="library-drop-zone" data-drop-input="library-source-input">
                  <input name="source_file" id="library-source-input" type="file" accept=".psd,.psb,.ai,.pdf,.zip,.rar,.7z,.gz,.tar,application/pdf,application/zip,application/x-rar-compressed,application/x-7z-compressed,application/gzip,application/x-tar">
                  <span>${state.lang === 'zh' ? '源文件' : 'Source file'}</span>
                  <strong>${state.lang === 'zh' ? '拖拽 1 个 PSD / PSB / AI / PDF / ZIP 到这里' : 'Drop one PSD / PSB / AI / PDF / ZIP here'}</strong>
                  <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No file selected'}</small>
                </div>
                <div class="library-drop-zone" data-drop-input="library-preview-input">
                  <input name="preview_files" id="library-preview-input" type="file" accept="image/jpeg,image/png,image/webp" multiple>
                  <span>${state.lang === 'zh' ? '预览图' : 'Preview images'}</span>
                  <strong>${state.lang === 'zh' ? '拖拽 1-5 张 JPG / PNG / WEBP 到这里' : 'Drop 1-5 JPG / PNG / WEBP files here'}</strong>
                  <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No file selected'}</small>
                  <div class="drop-thumb-strip" data-thumb-strip style="display:none;"></div>
                </div>
              </div>
              <div class="library-drop-zone" data-upload-mode="template" data-drop-input="library-template-input">
                <input name="template_file" id="library-template-input" type="file" accept=".json">
                <span>${state.lang === 'zh' ? '模板文件' : 'Template file'}</span>
                <strong>${state.lang === 'zh' ? '拖拽 JSON 模板到这里' : 'Drop JSON template here'}</strong>
                <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No file selected'}</small>
              </div>
            </div>
            <div class="library-upload-footer">
              <div id="library-upload-message" class="message"></div>
              <div class="modal-actions">
                <button class="ghost-btn" id="cancel-library-upload" type="button">${t('cancel')}</button>
                <button class="primary-btn" type="submit">${state.lang === 'zh' ? '上传入库' : 'Upload'}</button>
              </div>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  function renderUploadTagControls(kind) {
    const emptyLabel = state.lang === 'zh' ? '未分类' : 'Unclassified';
    const rows = uploadLibraryTagRows(kind);
    return rows.map(row => {
      const isTag1 = row.key === 'tag1';
      const items = isTag1 ? row.values : ['all', ...row.values];
      var defVal = 'all';
      var candidate = state.libraryFilters['upload' + row.key.charAt(0).toUpperCase() + row.key.slice(1)];
      if (candidate && row.values.includes(candidate)) defVal = candidate;
      const defLabel = defVal === 'all' ? emptyLabel : defVal;
      return `
      <div class="upload-tag-picker" data-upload-tag-picker="${row.key}">
        <span>${escapeHtml(row.label)}</span>
        <input type="hidden" name="${row.key}" value="${defVal}" data-upload-tag-input="${row.key}">
        <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="${row.key}">
          <strong>${escapeHtml(defLabel)}</strong>
        </button>
        <div class="upload-tag-menu" role="menu">
          ${items.map(value => {
            const label = value === 'all' ? emptyLabel : value;
            const active = value === defVal;
            return `<button type="button" class="${active ? 'active' : ''}" data-upload-tag-option="${row.key}" data-upload-tag-value="${escapeAttr(value)}">${escapeHtml(label)}</button>`;
          }).join('')}
        </div>
      </div>
    `}).join('');
  }

  function uploadLibraryTagRows(kind) {
    const config = LIBRARY_TAGS[kind];
    if (!config) return [];
    const labels = state.lang === 'zh'
      ? { tag1: '标签一', tag2: '标签二', tag3: '标签三', tag4: '标签四' }
      : { tag1: 'Tag 1', tag2: 'Tag 2', tag3: 'Tag 3', tag4: 'Tag 4' };
    const rows = [];
    if (config.tag1) rows.push({ key: 'tag1', label: labels.tag1, values: config.tag1 });
    if (config.tag2) rows.push({ key: 'tag2', label: labels.tag2, values: config.tag2 });
    const tag1 = state.libraryFilters.uploadTag1;
    if (config.tag2ByTag1) {
      const vals = (tag1 !== 'all' && config.tag2ByTag1[tag1]) ? config.tag2ByTag1[tag1] : [...new Set(Object.values(config.tag2ByTag1).flat())];
      rows.push({ key: 'tag2', label: labels.tag2, values: vals });
    }
    const tag3Values = config.tag3 || Object.values(config.tag3ByTag2 || {}).flat();
    if (tag3Values?.length) rows.push({ key: 'tag3', label: labels.tag3, values: uniqueValues(tag3Values) });
    const tag4Values = Object.values(config.tag4ByTag3 || {}).flat();
    if (tag4Values.length) rows.push({ key: 'tag4', label: labels.tag4, values: uniqueValues(tag4Values) });
    return rows;
  }

  function uniqueValues(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function renderEditModal() {
    return `
      <div id="library-edit-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal" style="max-width:520px;">
          <div class="modal-head">
            <h3>${state.lang === 'zh' ? '编辑素材信息' : 'Edit Asset'}</h3>
            <button class="icon-btn modal-close-circle" id="close-library-edit" type="button" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
            </button>
          </div>
          <form id="library-edit-form" class="library-form">
            <input type="hidden" name="id">
            <input type="hidden" name="library_kind" id="library-edit-kind">
            <div class="library-upload-scroll">
              <label><span>${state.lang === 'zh' ? '素材名称' : 'Asset title'}</span><input name="title" maxlength="120"></label>
              <div class="upload-tag-picker" data-upload-tag-picker="kind" id="edit-kind-field">
                <span>${state.lang === 'zh' ? '所在库' : 'Library section'}</span>
                <input type="hidden" name="kind_value" id="library-edit-kind-value" value="">
                <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="kind">
                  <strong>${state.lang === 'zh' ? '案例库' : 'Case Library'}</strong>
                </button>
                <div class="upload-tag-menu" role="menu" id="edit-kind-menu"></div>
              </div>
              <div id="library-edit-tag-controls" class="library-upload-tags"></div>
              <div class="library-form-grid two" id="edit-meta-row">
                <div class="upload-tag-picker" data-upload-tag-picker="country" id="edit-country-field">
                  <span>${state.lang === 'zh' ? '国家' : 'Country'}</span>
                  <input type="hidden" name="country" value="all" data-upload-tag-input="country">
                  <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="country">
                    <strong>${state.lang === 'zh' ? '全部' : 'All'}</strong>
                  </button>
                  <div class="upload-tag-menu" role="menu" data-upload-meta-menu="country"></div>
                </div>
                <div class="upload-tag-picker" data-upload-tag-picker="activity" id="edit-activity-field">
                  <span>${state.lang === 'zh' ? '活动类型' : 'Activity'}</span>
                  <input type="hidden" name="activity" value="all" data-upload-tag-input="activity">
                  <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="activity">
                    <strong>${state.lang === 'zh' ? '全部' : 'All'}</strong>
                  </button>
                  <div class="upload-tag-menu" role="menu" data-upload-meta-menu="activity"></div>
                </div>
              </div>
            </div>
            <div id="library-edit-message" class="message"></div>
            <div class="modal-actions">
              <button class="ghost-btn" id="cancel-library-edit" type="button">${t('cancel')}</button>
              <button class="primary-btn" type="submit">${t('save')}</button>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  function renderBatchEditModal() {
    return `
      <div id="batch-edit-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal" style="max-width:520px;">
          <div class="modal-head">
            <h3>${state.lang === 'zh' ? '批量编辑' : 'Batch edit'}</h3>
            <button class="icon-btn modal-close-circle" id="close-batch-edit" type="button" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
            </button>
          </div>
          <form id="batch-edit-form" class="library-form">
            <div class="library-upload-scroll">
              <p style="margin:0 0 12px;font-size:13px;color:#667085;" id="batch-edit-count"></p>
              <label><span>${state.lang === 'zh' ? '素材名称前缀' : 'Title prefix'}</span><input name="title_prefix" maxlength="120" placeholder="${state.lang === 'zh' ? '选填，统一替换名称' : 'Optional, replace all titles'}"></label>
              <div class="library-form-grid two">
                <div class="upload-tag-picker" data-upload-tag-picker="country" id="batch-country-field">
                  <span>${state.lang === 'zh' ? '国家' : 'Country'}</span>
                  <input type="hidden" name="country" value="keep" data-upload-tag-input="country">
                  <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="country">
                    <strong>${state.lang === 'zh' ? '保持不变' : 'Keep'}</strong>
                  </button>
                  <div class="upload-tag-menu" role="menu" data-upload-meta-menu="country"></div>
                </div>
                <div class="upload-tag-picker" data-upload-tag-picker="activity" id="batch-activity-field">
                  <span>${state.lang === 'zh' ? '活动类型' : 'Activity'}</span>
                  <input type="hidden" name="activity" value="keep" data-upload-tag-input="activity">
                  <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="activity">
                    <strong>${state.lang === 'zh' ? '保持不变' : 'Keep'}</strong>
                  </button>
                  <div class="upload-tag-menu" role="menu" data-upload-meta-menu="activity"></div>
                </div>
              </div>
              <div id="batch-edit-tag-controls" class="library-upload-tags"></div>
            </div>
            <div id="batch-edit-message" class="message"></div>
            <div class="modal-actions">
              <button class="ghost-btn" id="cancel-batch-edit" type="button">${t('cancel')}</button>
              <button class="primary-btn" type="submit">${t('save')}</button>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  function wireLibraryShell() {
    document.querySelectorAll('.library-module-row button[data-route]').forEach(button => {
      button.addEventListener('click', () => {
        const route = button.dataset.route;
        location.hash = route;
        navigate(route);
      });
    });
    document.querySelectorAll('[data-library-kind]').forEach(button => {
      button.addEventListener('click', () => {
        state.libraryFilters.kind = button.dataset.libraryKind || 'all';
        state.libraryFilters.tag1 = 'all';
        state.libraryFilters.tag2 = 'all';
        state.libraryFilters.tag3 = 'all';
        state.libraryFilters.tag4 = 'all';
        state.libraryFilters.selectedCountries = [];
        state.libraryFilters.selectedActivities = [];
        state.libraryFilters.selectedStrategies = [];
        state.libraryFilters.selectedElements = [];
        state.libraryFilters.selectedFormats = [];
        state.libraryFilters.selectedQuantities = [];
        state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
        document.querySelectorAll('[data-library-kind]').forEach(item => item.classList.toggle('active', item.dataset.libraryKind === state.libraryFilters.kind));
        document.getElementById('library-tag-rows').innerHTML = renderLibraryTagRows(state.libraryFilters.kind || 'all');
        wireLibraryTagButtons();
        renderLibraryGrid();
        updateKindTabIndicator();
        alignTagRows();
      });
    });
    wireLibraryTagButtons();
    setTimeout(() => { updateKindTabIndicator(); alignTagRows(); }, 50);
    document.getElementById('open-upload-modal')?.addEventListener('click', openLibraryUploadModal);
    document.getElementById('delete-all-btn')?.addEventListener('click', deleteAllLibraryData);
    document.getElementById('close-library-upload')?.addEventListener('click', closeLibraryUploadModal);
    document.getElementById('cancel-library-upload')?.addEventListener('click', closeLibraryUploadModal);
    document.getElementById('library-upload-form')?.addEventListener('submit', uploadLibraryAsset);
    wireLibraryUploadDrops();
    wireLibraryUploadKindCards();
    wireUploadTagPickers();
    wireUploadTagHover();
    document.querySelectorAll('[data-upload-kind-card]').forEach(button => {
      button.addEventListener('click', () => {
        const kind = button.dataset.uploadKindCard;
        const input = document.getElementById('library-upload-kind');
        if (input) input.value = kind;
        state.libraryFilters.uploadTag1 = kind === 'source' ? 'C端' : 'all';
        state.libraryFilters.uploadTag2 = 'all';
        state.libraryFilters.uploadTag3 = 'all';
        state.libraryFilters.uploadTag4 = 'all';
        state.libraryFilters.uploadCountry = 'all';
        state.libraryFilters.uploadActivity = 'all';
        document.getElementById('library-upload-tag-controls').innerHTML = renderUploadTagControls(kind);
        updateLibraryUploadMode(kind);
        wireLibraryUploadKindCards();
        wireUploadTagPickers();
        wireUploadTagHover();
      });
    });
    document.getElementById('close-library-edit')?.addEventListener('click', closeLibraryEditModal);
    document.getElementById('cancel-library-edit')?.addEventListener('click', closeLibraryEditModal);
    document.getElementById('library-edit-form')?.addEventListener('submit', saveLibraryEdit);
    document.getElementById('close-library-detail')?.addEventListener('click', closeLibraryDetailModal);
    document.getElementById('library-detail-modal')?.addEventListener('click', event => {
      if (event.target === document.getElementById('library-detail-modal')) closeLibraryDetailModal();
    });
    const searchInput = document.getElementById('library-search');
    searchInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        state.libraryFilters.query = event.target.value.trim();
        if (state.libraryFilters.query && !state.libraryFilters.searchHistory.includes(state.libraryFilters.query)) {
          state.libraryFilters.searchHistory.unshift(state.libraryFilters.query);
          if (state.libraryFilters.searchHistory.length > 6) state.libraryFilters.searchHistory.pop();
        }
        state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
        filterLibraryCardsInPlace();
      }
    });
    searchInput?.addEventListener('focus', () => {
      const pill = searchInput.closest('.library-search-pill');
      if (pill) {
        const icon = pill.querySelector('span');
        if (icon) {
          icon.style.background = '#111827';
          const svg = icon.querySelector('svg');
          if (svg) svg.style.stroke = '#ffffff';
        }
      }
      const history = document.getElementById('search-history-dropdown');
      const list = document.getElementById('search-history-list');
      if (history && list && state.libraryFilters.searchHistory.length) {
        const label = state.lang === 'zh' ? '历史搜索' : 'History';
        list.innerHTML = '<div class="search-history-label">' + label + '</div><div class="search-history-items">' +
          state.libraryFilters.searchHistory.map(q => '<button type="button" class="search-history-item">' + escapeHtml(q) + '</button>').join('') +
          '</div>';
        list.querySelectorAll('.search-history-item').forEach(btn => {
          btn.addEventListener('click', () => {
            state.libraryFilters.query = btn.textContent;
            if (searchInput) searchInput.value = state.libraryFilters.query;
            history.hidden = true;
            state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
            renderLibraryGrid();
          });
        });
        history.hidden = false;
      }
    });
    searchInput?.addEventListener('blur', () => {
      const pill = searchInput.closest('.library-search-pill');
      if (pill) {
        const icon = pill.querySelector('span');
        if (icon) {
          icon.style.background = '';
          const svg = icon.querySelector('svg');
          if (svg) svg.style.stroke = '';
        }
      }
      setTimeout(() => {
        const history = document.getElementById('search-history-dropdown');
        if (history) history.hidden = true;
      }, 200);
    });
    document.getElementById('library-hero-search')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        state.libraryFilters.query = event.target.value.trim();
        const search = document.getElementById('library-search');
        if (search) search.value = state.libraryFilters.query;
        state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
        filterLibraryCardsInPlace();
      }
    });
    const filterBtn = document.getElementById('library-filter-btn');
    const filterPanel = document.getElementById('library-filter-panel');
    filterBtn?.addEventListener('click', () => {
      if (!filterPanel) return;
      filterPanel.hidden = !filterPanel.hidden;
      if (!filterPanel.hidden) populateFilterOptions();
    });
    // 收藏筛选
    document.getElementById('filter-favorites-btn')?.addEventListener('click', function() {
      state.libraryFilters.favorites = !state.libraryFilters.favorites;
      this.classList.toggle('active', state.libraryFilters.favorites);
      this.innerHTML = (state.libraryFilters.favorites ? '★' : '☆') + ' ' + (state.lang === 'zh' ? '仅收藏' : 'Favorites only');
      state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
      filterLibraryCardsInPlace();
    });
    document.getElementById('delete-all-templates-btn')?.addEventListener('click', async function() {
      if (!confirm(state.lang === 'zh' ? '确定删除全部模版库内容？此操作不可恢复。' : 'Delete ALL templates? This cannot be undone.')) return;
      this.disabled = true; this.textContent = state.lang === 'zh' ? '删除中...' : 'Deleting...';
      try {
        var { data: sources } = await state.supabase.from('vf_source_files').select('id, source_path').contains('tags', ['vf:kind:template']);
        if (sources && sources.length) {
          // 收集所有 storage 路径
          var paths = [];
          sources.forEach(function(s) {
            if (s.source_path) paths.push(s.source_path);
            // 预览文件在 {userId}/previews/{sourceId}/ 下，批量删除较复杂，跳过
          });
          if (paths.length) await state.supabase.storage.from(LIBRARY_BUCKET).remove(paths);
          var ids = sources.map(function(s) { return s.id; });
          await state.supabase.from('vf_source_files').delete().in('id', ids);
        }
        alert(state.lang === 'zh' ? '已删除 ' + (sources ? sources.length : 0) + ' 条模版记录。' : 'Deleted ' + (sources ? sources.length : 0) + ' templates.');
      } catch(e) { alert('Error: ' + e.message); }
      this.disabled = false; this.textContent = '🗑 ' + (state.lang === 'zh' ? '删除全部模版' : 'Delete all templates');
      renderLibrary();
    });
    document.addEventListener('click', event => {
      const wrap = document.querySelector('.filter-dropdown-wrap');
      if (filterPanel && wrap && !wrap.contains(event.target) && !filterPanel.hidden) {
        filterPanel.hidden = true;
      }
    });
    // 多选操作条按钮
    document.querySelectorAll('#multi-select-bar [data-bar-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.dataset.barAction;
        if (action === 'cancel') exitMultiSelect();
        if (action === 'delete') batchDeleteSelected();
        if (action === 'download') batchDownloadSelected();
        if (action === 'edit') openBatchEditModal();
      });
    });
    // 批量编辑弹窗事件
    document.getElementById('close-batch-edit')?.addEventListener('click', closeBatchEditModal);
    document.getElementById('cancel-batch-edit')?.addEventListener('click', closeBatchEditModal);
    document.getElementById('batch-edit-form')?.addEventListener('submit', saveBatchEdit);
    // Esc 退出多选模式
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && state.libraryMultiSelect) {
        exitMultiSelect();
      }
    });
    // 全局点击关闭右键菜单（点击菜单外部时）
    document.addEventListener('click', function(e) {
      var menu = document.getElementById('context-menu');
      if (menu && menu.classList.contains('show') && !menu.contains(e.target)) {
        hideContextMenu();
      }
    });
    document.addEventListener('contextmenu', function(e) {
      // 卡片右键有自己的处理，不要在这里关掉
      if (e.target.closest('.library-card')) return;
      var menu = document.getElementById('context-menu');
      if (menu && menu.classList.contains('show')) {
        hideContextMenu();
      }
    });

  }

  function wireLibraryTagButtons() {
    document.querySelectorAll('[data-library-tag-key]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.libraryTagKey;
        state.libraryFilters[key] = button.dataset.libraryTagValue || 'all';
        if (key === 'tag1') {
          state.libraryFilters.tag2 = 'all';
          state.libraryFilters.tag3 = 'all';
          state.libraryFilters.tag4 = 'all';
        }
        if (key === 'tag2') {
          state.libraryFilters.tag3 = 'all';
          state.libraryFilters.tag4 = 'all';
        }
        if (key === 'tag3') state.libraryFilters.tag4 = 'all';
        state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
        filterLibraryCardsInPlace();
        document.getElementById('library-tag-rows').innerHTML = renderLibraryTagRows(state.libraryFilters.kind || 'all');
        wireLibraryTagButtons();
      });
    });
  }

  function filterLibraryCardsInPlace() {
    var grid = document.getElementById('library-grid');
    if (!grid || !state.libraryItems) { renderLibraryGrid(); return; }
    var sourcesById = new Map(state.librarySources.map(function(s) { return [s.id, s]; }));
    var query = state.libraryFilters.query.toLowerCase();
    var kind = state.libraryFilters.kind || 'all';
    // 重新过滤
    state.libraryItems = state.libraryPreviews.map(function(preview) {
      var s = sourcesById.get(preview.source_file_id);
      var url = state.libraryPreviewUrls[preview.preview_path] || '';
      var tp = (s && s.source_path) ? s.source_path.replace(/\/[^/]+$/, '/_thumb.jpg') : '';
      return { preview: preview, source: s, url: url, thumbUrl: state.libraryPreviewUrls[tp] || '' };
    }).filter(function(item) {
      if (!item.source) return false;
      var itemKind = libraryKindOfSource(item.source);
      if (kind !== 'all' && kind !== itemKind) return false;
      if (query && !libraryItemMatchesQuery(item, query)) return false;
      var tags = visibleLibraryTags(item.source);
      if (state.libraryFilters.tag1 !== 'all' && !tags.includes(state.libraryFilters.tag1)) return false;
      if (state.libraryFilters.tag2 !== 'all' && !tags.includes(state.libraryFilters.tag2)) return false;
      if (state.libraryFilters.tag3 !== 'all' && !tags.includes(state.libraryFilters.tag3)) return false;
      if (state.libraryFilters.tag4 !== 'all' && !tags.includes(state.libraryFilters.tag4)) return false;
      // 国家筛选（匹配选项的显示名）
      if (state.libraryFilters.selectedCountries && state.libraryFilters.selectedCountries.length) {
        var countryLabel = libCountryLabel(item.source);
        if (!state.libraryFilters.selectedCountries.includes(countryLabel)) return false;
      }
      // 活动类型筛选（匹配选项的显示名）
      if (state.libraryFilters.selectedActivities && state.libraryFilters.selectedActivities.length) {
        var activityLabel = libActivityLabel(item.source);
        if (!state.libraryFilters.selectedActivities.includes(activityLabel)) return false;
      }
      // 业务策略 / 元素 / 格式 / 数量 筛选（匹配 visible tags）
      if (state.libraryFilters.selectedStrategies && state.libraryFilters.selectedStrategies.length && !state.libraryFilters.selectedStrategies.some(function(s) { return tags.includes(s); })) return false;
      if (state.libraryFilters.selectedElements && state.libraryFilters.selectedElements.length && !state.libraryFilters.selectedElements.some(function(e) { return tags.includes(e); })) return false;
      if (state.libraryFilters.selectedFormats && state.libraryFilters.selectedFormats.length && !state.libraryFilters.selectedFormats.some(function(f) { return tags.includes(f); })) return false;
      if (state.libraryFilters.selectedQuantities && state.libraryFilters.selectedQuantities.length && !state.libraryFilters.selectedQuantities.some(function(q) { return tags.includes(q); })) return false;
      if (state.libraryFilters.favorites && !state.libraryFavorites.has(item.preview.id)) return false;
      return true;
    });
    var visibleItems = state.libraryItems.slice(0, state.libraryVisibleLimit);
    var existingCards = grid.querySelectorAll('.library-card');
    var existingIds = new Set();
    existingCards.forEach(function(c) { existingIds.add(c.dataset.previewId); });
    var missingCount = 0;
    visibleItems.forEach(function(item) {
      if (!existingIds.has(item.preview.id)) missingCount++;
    });
    // 缺少太多卡片或完全没有卡片时，全量重建更可靠
    if (missingCount > visibleItems.length / 2 || (visibleItems.length > 0 && existingCards.length === 0)) {
      renderLibraryGrid();
      return;
    }
    // 控制卡片显隐
    var visibleIds = new Set(visibleItems.map(function(item) { return item.preview.id; }));
    var loadMore = document.getElementById('library-load-more');
    existingCards.forEach(function(card) {
      card.style.display = visibleIds.has(card.dataset.previewId) ? '' : 'none';
    });
    // 创建缺失的卡片
    if (missingCount > 0) {
      visibleItems.forEach(function(item) {
        if (!existingIds.has(item.preview.id)) {
          var html = renderLibraryCard(item);
          var temp = document.createElement('div');
          temp.innerHTML = html.trim();
          var newCard = temp.firstChild;
          if (loadMore && loadMore.parentNode === grid) {
            grid.insertBefore(newCard, loadMore);
          } else {
            grid.appendChild(newCard);
          }
        }
      });
      wireLibraryCards();
    }
    // 更新加载更多按钮
    var hasMore = state.libraryVisibleLimit < state.libraryItems.length;
    if (loadMore) {
      if (hasMore) {
        var remaining = Math.min(LIBRARY_RENDER_STEP, state.libraryItems.length - state.libraryVisibleLimit);
        loadMore.textContent = state.lang === 'zh' ? '加载更多 ' + remaining + ' 个' : 'Load ' + remaining + ' more';
        loadMore.style.display = '';
      } else {
        loadMore.style.display = 'none';
      }
    }
    // 刷新已显示卡片的图片 URL
    updateLibraryCardImages(visibleItems);
    void signVisibleLibraryUrls(visibleItems);
  }

  function libraryItemMatchesQuery(item, query) {
    if (!query) return true;
    var text = [item.source.title, item.source.source_filename || ''].join(' ').toLowerCase();
    // 也检查标签
    var tags = visibleLibraryTags(item.source);
    text += ' ' + tags.join(' ').toLowerCase();
    return text.includes(query);
  }


  var FILTER_SECTIONS_CONFIG = {
    country: { values: ['沙特阿拉伯','阿联酋','卡塔尔','科威特','巴林','阿曼'], matchBy: 'country' },
    activity: { values: ['premium','picks','一人食','聚餐','品牌合作','足球','夏日','新年','开斋节','宰牲节','国庆节'], matchBy: 'activity' },
    strategy: { values: ['新人专属','裂变','大促','闪购','买一送一','抽奖','免运'], matchBy: 'tags' },
    element: { values: ['银行卡','券','kiki','骑手','国旗','商家赠品（手机、耳机、PS5）'], matchBy: 'tags' },
    format: { values: ['仅jpg/png/pdf','含Psd文件','含Ai文件'], matchBy: 'tags' },
    quantity: { values: ['单素材','成套素材'], matchBy: 'tags' }
  };
  var FILTER_STATE_KEYS = { country: 'selectedCountries', activity: 'selectedActivities', strategy: 'selectedStrategies', element: 'selectedElements', format: 'selectedFormats', quantity: 'selectedQuantities' };

  function populateFilterOptions() {
    Object.keys(FILTER_SECTIONS_CONFIG).forEach(function(sectionId) {
      var container = document.querySelector('[data-filter-options="' + sectionId + '"]');
      if (!container) return;
      var config = FILTER_SECTIONS_CONFIG[sectionId];
      var stateKey = FILTER_STATE_KEYS[sectionId];
      var selected = state.libraryFilters[stateKey] || [];
      var selectedAll = !selected.length;
      var html = '<button type="button" class="filter-capsule' + (selectedAll ? ' active' : '') + '" data-value="all">' + (state.lang === 'zh' ? '全部' : 'All') + '</button>';
      config.values.forEach(function(val) {
        var sel = selected.includes(val);
        html += '<button type="button" class="filter-capsule' + (sel ? ' active' : '') + '" data-value="' + val + '">' + escapeHtml(val) + '</button>';
      });
      container.innerHTML = html;
      container.querySelectorAll('.filter-capsule').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (btn.dataset.value === 'all') {
            container.querySelectorAll('.filter-capsule').forEach(function(b) { b.classList.toggle('active', b === btn); });
          } else {
            var allBtn = container.querySelector('.filter-capsule[data-value="all"]');
            if (allBtn) allBtn.classList.remove('active');
            btn.classList.toggle('active');
          }
          var activeButtons = container.querySelectorAll('.filter-capsule.active:not([data-value="all"])');
          state.libraryFilters[stateKey] = Array.from(activeButtons).map(function(b) { return b.dataset.value; });
          state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
          filterLibraryCardsInPlace();
        });
      });
    });
    // 显示/隐藏：模版库不显示国家
    var countrySection = document.querySelector('[data-filter-section="country"]');
    if (countrySection) countrySection.style.display = state.libraryFilters.kind === 'template' ? 'none' : '';
  }

  function updateKindTabIndicator() {
    const tabs = document.querySelector('.library-kind-tabs');
    const indicator = tabs?.querySelector('.kind-tab-indicator');
    const active = tabs?.querySelector('[data-library-kind].active');
    if (!indicator || !active) {
      if (indicator) indicator.style.display = 'none';
      return;
    }
    const tabRect = active.getBoundingClientRect();
    const containerRect = tabs.getBoundingClientRect();
    indicator.style.display = 'block';
    indicator.style.left = (tabRect.left - containerRect.left) + 'px';
    indicator.style.width = tabRect.width + 'px';
  }

  function alignTagRows() {
    const tabs = document.querySelector('.library-kind-tabs');
    const tagRows = document.getElementById('library-tag-rows');
    if (!tabs || !tagRows) return;
    const tabRect = tabs.getBoundingClientRect();
    const tagRect = tagRows.getBoundingClientRect();
    const diff = Math.round(tabRect.left - tagRect.left);
    console.log('[align] tabLeft:', tabRect.left, 'tagLeft:', tagRect.left, 'diff:', diff);
    if (diff !== 0) {
      tagRows.style.paddingLeft = diff + 'px';
      console.log('[align] set paddingLeft to', diff);
    } else {
      tagRows.style.paddingLeft = '';
    }
  }

  function renderLibraryTagRows(kind) {
    if (!kind || kind === 'all') return '';
    var rows = libraryTagRows(kind);
    return rows.map(function(row, rowIdx) {
      // 计算父级已选标签（用于 tag2/tag3/tag4 计数过滤）
      var parentFilters = {};
      for (var pi = 0; pi < rowIdx; pi++) {
        var pkey = rows[pi].key;
        var pval = state.libraryFilters[pkey];
        if (pval && pval !== 'all') parentFilters[pkey] = pval;
      }
      return `
        <div class="library-tag-row">
          <div>
            ${['all', ...row.values].map(value => {
              const label = value === 'all' ? (state.lang === 'zh' ? '全部' : 'All') : value;
              const active = (state.libraryFilters[row.key] || 'all') === value;
              const count = value === 'all' ? countKindSources(kind, parentFilters) : countTagOccurrences(kind, value, parentFilters);
              return `<button type="button" class="${active ? 'active' : ''}" data-library-tag-key="${row.key}" data-library-tag-value="${escapeAttr(value)}">${escapeHtml(label)}<small> · ${count}</small></button>`;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function countKindSources(kind, parentFilters) {
    return state.librarySources.filter(function(source) {
      if (libraryKindOfSource(source) !== kind) return false;
      var tags = visibleLibraryTags(source);
      return Object.keys(parentFilters).every(function(k) {
        return !parentFilters[k] || parentFilters[k] === 'all' || tags.includes(parentFilters[k]);
      });
    }).length;
  }

  function countTagOccurrences(kind, tagValue, parentFilters) {
    return state.librarySources.filter(function(source) {
      if (libraryKindOfSource(source) !== kind) return false;
      var tags = visibleLibraryTags(source);
      if (!tags.includes(tagValue)) return false;
      return Object.keys(parentFilters).every(function(k) {
        return !parentFilters[k] || parentFilters[k] === 'all' || tags.includes(parentFilters[k]);
      });
    }).length;
  }

  function libraryTagRows(kind) {
    const config = LIBRARY_TAGS[kind];
    if (!config) return [];
    const labels = state.lang === 'zh'
      ? { tag1: '标签一', tag2: '标签二', tag3: '标签三', tag4: '标签四' }
      : { tag1: 'Tag 1', tag2: 'Tag 2', tag3: 'Tag 3', tag4: 'Tag 4' };
    const rows = [];
    if (config.tag1) rows.push({ key: 'tag1', label: labels.tag1, values: config.tag1 });
    if (config.tag2) rows.push({ key: 'tag2', label: labels.tag2, values: config.tag2 });
    if (config.tag3) rows.push({ key: 'tag3', label: labels.tag3, values: config.tag3 });
    const tag1 = state.libraryFilters.tag1;
    const tag2 = state.libraryFilters.tag2;
    const tag3 = state.libraryFilters.tag3;
    if (config.tag2ByTag1?.[tag1]) rows.push({ key: 'tag2', label: labels.tag2, values: config.tag2ByTag1[tag1] });
    if (config.tag3ByTag2?.[tag2]) rows.push({ key: 'tag3', label: labels.tag3, values: config.tag3ByTag2[tag2] });
    if (config.tag4ByTag3?.[tag3]) rows.push({ key: 'tag4', label: labels.tag4, values: config.tag4ByTag3[tag3] });
    return rows;
  }

  async function loadLibraryData() {
    const status = document.getElementById('library-status');
    if (!state.localPreview && state.libraryDataLoaded) {
      // 先快速渲染内存数据，后台静默刷新 Supabase
      renderLibrarySelects();
      renderLibraryGrid();
      refreshKindTabCounts();
      // 后台从 Supabase 拉最新数据合并（处理其他设备/用户的变更）
      setTimeout(async function() {
        try { state.libraryDataLoaded = false; await loadLibraryData(); } catch(e) {}
      }, 2000);
      return;
    }
    if (!state.localPreview && state.libraryDataPromise) {
      await state.libraryDataPromise;
      renderLibrarySelects();
      renderLibraryGrid();
      return;
    }
    try {
      if (state.localPreview || !state.supabase) {
        status.textContent = state.lang === 'zh' ? '正在读取旧平台恢复素材...' : 'Loading recovered platform assets...';
        const recovered = await loadRecoveredPlatformLibrary();
        if (!recovered) loadLocalLibraryDemo();
        return;
      }
      status.textContent = state.lang === 'zh' ? '正在读取分类和素材...' : 'Loading options and assets...';
      state.libraryDataPromise = (async () => {
        await seedActivityTypes();
        await loadLibraryOptions();
        await loadLibraryFavorites();
        await loadLibrarySources();
        await loadLibraryPreviews();
        state.libraryDataLoaded = true;
      })();
      await state.libraryDataPromise;
      renderLibrarySelects();
      renderLibraryGrid();
    } catch (error) {
      status.innerHTML = `
        <strong>${state.lang === 'zh' ? '素材库还未就绪' : 'Library is not ready'}</strong>
        <p>${escapeHtml(error.message)}</p>
        <p class="muted">${state.lang === 'zh' ? '如果这是第一次打开 V2，需要先运行 sql/002_library_v2.sql。' : 'If this is the first V2 run, execute sql/002_library_v2.sql first.'}</p>
      `;
      document.getElementById('library-grid').innerHTML = '';
    } finally {
      state.libraryDataPromise = null;
    }
  }

  async function reloadLibraryData() {
    state.libraryDataLoaded = false;
    state.libraryDataPromise = null;
    state.libraryPreviewUrls = {};
    state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
    await loadLibraryData();
    refreshKindTabCounts();
    renderLibraryGrid();
    // 刷新筛选标签计数
    var tagRows = document.getElementById('library-tag-rows');
    if (tagRows) tagRows.innerHTML = renderLibraryTagRows(state.libraryFilters.kind || 'all');
    wireLibraryTagButtons();
  }

  async function seedActivityTypes() {
    if (!state.supabase) return;
    const { data: existing } = await state.supabase
      .from('vf_library_options')
      .select('id,name_zh')
      .eq('option_type', 'activity');
    const targetMap = { '日常活动': true, 'S级活动': true, '系列活动': true };
    const hasAll = existing?.filter(o => targetMap[o.name_zh]).length === 3;
    if (existing?.length === 3 && hasAll) return;
    const toDelete = existing?.filter(o => !targetMap[o.name_zh]) || [];
    for (const old of toDelete) {
      await state.supabase.from('vf_source_files').update({ activity_id: null }).eq('activity_id', old.id);
    }
    if (toDelete.length) {
      await state.supabase.from('vf_library_options').delete().in('id', toDelete.map(o => o.id));
    }
    const existingNames = new Set((existing || []).map(o => o.name_zh));
    const toInsert = [];
    if (!existingNames.has('日常活动')) toInsert.push({ option_type: 'activity', name_en: 'Daily Activity', name_zh: '日常活动', sort_order: 10 });
    if (!existingNames.has('S级活动')) toInsert.push({ option_type: 'activity', name_en: 'S-Level', name_zh: 'S级活动', sort_order: 20 });
    if (!existingNames.has('系列活动')) toInsert.push({ option_type: 'activity', name_en: 'Series', name_zh: '系列活动', sort_order: 30 });
    for (const item of toInsert) {
      await state.supabase.from('vf_library_options').insert(item);
    }
  }

  async function loadLibraryOptions() {
    const { data, error } = await state.supabase
      .from('vf_library_options')
      .select('id,option_type,name_en,name_zh,sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    state.libraryOptions = data || [];
  }

  async function loadLibraryFavorites() {
    const { data, error } = await state.supabase
      .from('vf_asset_favorites')
      .select('preview_id');
    if (error) throw error;
    state.libraryFavorites = new Set((data || []).map(item => item.preview_id));
  }

  async function loadLibrarySources() {
    const sources = [];
    for (let from = 0; from < LIBRARY_SOURCE_MAX_ROWS; from += LIBRARY_SOURCE_PAGE_SIZE) {
      let query = state.supabase
        .from('vf_source_files')
        .select('id,title,country_id,activity_id,category_id,tags,visibility,source_path,source_filename,source_mime_type,source_size_bytes,source_ext,uploaded_by,created_at,updated_at')
        .order('updated_at', { ascending: false })
        .range(from, from + LIBRARY_SOURCE_PAGE_SIZE - 1);
      ['country', 'activity', 'category'].forEach(type => {
        const value = state.libraryFilters[type];
        if (value && value !== 'all') query = query.eq(`${type}_id`, value);
      });
      const { data, error } = await query;
      if (error) throw error;
      const batch = data || [];
      sources.push(...batch);
      if (batch.length < LIBRARY_SOURCE_PAGE_SIZE) break;
    }
    state.librarySources = sources;
  }

  async function loadLibraryPreviews() {
    if (state.librarySources.length === 0) {
      state.libraryPreviews = [];
      state.libraryItems = [];
      return;
    }
    const ids = state.librarySources.map(item => item.id);
    const previews = [];
    for (const idBatch of chunkArray(ids, SUPABASE_IN_BATCH_SIZE)) {
      const { data, error } = await state.supabase
        .from('vf_asset_previews')
        .select('id,source_file_id,preview_path,preview_filename,preview_mime_type,preview_size_bytes,width,height,sort_order,created_at')
        .in('source_file_id', idBatch)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      previews.push(...(data || []));
    }
    const sourceOrder = new Map(state.librarySources.map((source, index) => [source.id, index]));
    state.libraryPreviews = previews.sort((a, b) => {
      const sourceDiff = (sourceOrder.get(a.source_file_id) ?? 999999) - (sourceOrder.get(b.source_file_id) ?? 999999);
      if (sourceDiff) return sourceDiff;
      const sortDiff = (a.sort_order || 0) - (b.sort_order || 0);
      if (sortDiff) return sortDiff;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }

  async function signLibraryPreviewUrls(paths) {
    const targetPaths = Array.from(new Set((paths || state.libraryPreviews.map(item => item.preview_path)).filter(Boolean)))
      .filter(path => !state.libraryPreviewUrls[path]);
    if (targetPaths.length === 0) return;
    for (const pathBatch of chunkArray(targetPaths, SIGNED_URL_BATCH_SIZE)) {
      const { data, error } = await state.supabase.storage.from(LIBRARY_BUCKET).createSignedUrls(pathBatch, 60 * 60);
      if (error) throw error;
      (data || []).forEach(item => {
        if (item.path && item.signedUrl) state.libraryPreviewUrls[item.path] = item.signedUrl;
      });
    }
  }

  async function signVisibleLibraryUrls(items) {
    if (state.localPreview || !state.supabase) return;
    var paths = [];
    items.forEach(function(item) {
      var p = item.preview.preview_path;
      if (p && !state.libraryPreviewUrls[p]) paths.push(p);
      var src = (state.librarySources || []).find(function(s) { return s.id === item.preview.source_file_id; });
      if (src && src.source_path) {
        var thumbPath = src.source_path.replace(/\/[^/]+$/, '/_thumb.jpg');
        if (thumbPath && !state.libraryPreviewUrls[thumbPath]) paths.push(thumbPath);
      }
    });
    if (paths.length) {
      try {
        await signLibraryPreviewUrls(paths);
      } catch (error) {
        console.warn('Preview signing failed:', error);
      }
    }
    // 不管有没有新签名，都更新 DOM 里的图片 src，防止并发清缓存导致图片空白
    updateLibraryCardImages(items);
  }

  function updateLibraryCardImages(items) {
    var grid = document.getElementById('library-grid');
    if (!grid) return;
    var thumbCount = 0;
    items.forEach(function(item) {
      var card = grid.querySelector('.library-card[data-preview-id="' + item.preview.id + '"]');
      if (!card) return;
      var img = card.querySelector('.library-thumb img');
      if (!img) return;
      var fullUrl = state.libraryPreviewUrls[item.preview.preview_path] || '';
      var src = (state.librarySources || []).find(function(s) { return s.id === item.preview.source_file_id; });
      var thumbPath = (src && src.source_path) ? src.source_path.replace(/\/[^/]+$/, '/_thumb.jpg') : '';
      var thumbUrl = state.libraryPreviewUrls[thumbPath] || '';
      var newUrl = thumbUrl || fullUrl;
      if (newUrl && img.src !== newUrl) {
        img.classList.remove('loaded');
        var thumb = img.closest('.library-thumb');
        if (thumb) thumb.classList.remove('img-loaded');
        img.onload = function() { this.classList.add('loaded'); var t = this.closest('.library-thumb'); if (t) t.classList.add('img-loaded'); };
        img.onerror = function() { this.classList.add('loaded'); var t = this.closest('.library-thumb'); if (t) t.classList.add('img-loaded'); if (fullUrl && this.src !== fullUrl) { this.onerror = null; this.src = fullUrl; } };
        img.src = newUrl;
        if (thumbUrl && fullUrl) thumbCount++;
      }
    });
    console.log('[缩略图] ' + thumbCount + ' 张缩略图, ' + (items.length - thumbCount) + ' 张原图（无缩略图文件）');
    // 同步更新 state.libraryItems 里的 url，供详情弹窗等使用
    if (state.libraryItems) {
      state.libraryItems.forEach(function(libItem) {
        libItem.url = state.libraryPreviewUrls[libItem.preview.preview_path] || libItem.url;
        var s = (state.librarySources || []).find(function(s) { return s.id === libItem.preview.source_file_id; });
        var tp = (s && s.source_path) ? s.source_path.replace(/\/[^/]+$/, '/_thumb.jpg') : '';
        libItem.thumbUrl = state.libraryPreviewUrls[tp] || libItem.thumbUrl;
      });
    }
  }

  function renderLibrarySelects() {
    const filterMap = {
      country: document.getElementById('library-country-filter'),
      activity: document.getElementById('library-activity-filter'),
      category: document.getElementById('library-category-filter')
    };
    Object.entries(filterMap).forEach(([type, select]) => {
      if (!select) return;
      select.innerHTML = `<option value="all">${state.lang === 'zh' ? '全部' : 'All'}</option>${libraryOptions(type).map(option => `<option value="${option.id}">${escapeHtml(optionName(option))}</option>`).join('')}`;
      select.value = state.libraryFilters[type] || 'all';
    });
    ['upload'].forEach(prefix => {
      ['country', 'activity'].forEach(type => {
        const select = document.getElementById(`library-${prefix}-${type}`);
        if (!select) return;
        select.innerHTML = libraryOptions(type).map(option => `<option value="${option.id}">${escapeHtml(optionName(option))}</option>`).join('');
      });
    });
  }

  function renderLibraryGrid() {
    const status = document.getElementById('library-status');
    const grid = document.getElementById('library-grid');
    if (!grid || !status) return;
    const sourcesById = new Map(state.librarySources.map(source => [source.id, source]));
    const query = state.libraryFilters.query.toLowerCase();
    const filteredItems = state.libraryPreviews
      .map(function(preview) {
        var src = sourcesById.get(preview.source_file_id);
        var url = state.libraryPreviewUrls[preview.preview_path] || '';
        var thumbPath = (src && src.source_path) ? src.source_path.replace(/\/[^/]+$/, '/_thumb.jpg') : '';
        var thumbUrl = state.libraryPreviewUrls[thumbPath] || '';
        return { preview: preview, source: src, url: url, thumbUrl: thumbUrl };
      })
      .filter(item => item.source)
      .filter(item => {
        const kind = libraryKindOfSource(item.source);
        return state.libraryFilters.kind === 'all' || state.libraryFilters.kind === kind;
      })
      .filter(item => {
        return selectedLibraryTagValues().every(tag => visibleLibraryTags(item.source).includes(tag));
      })
      .filter(item => !state.libraryFilters.favorites || state.libraryFavorites.has(item.preview.id))
      .filter(item => !state.libraryFilters.selectedCountries || !state.libraryFilters.selectedCountries.length || state.libraryFilters.selectedCountries.includes(libCountryLabel(item.source)))
      .filter(item => !state.libraryFilters.selectedActivities || !state.libraryFilters.selectedActivities.length || state.libraryFilters.selectedActivities.includes(libActivityLabel(item.source)))
      .filter(item => !state.libraryFilters.selectedStrategies || !state.libraryFilters.selectedStrategies.length || state.libraryFilters.selectedStrategies.some(function(s) { return visibleLibraryTags(item.source).includes(s); }))
      .filter(item => !state.libraryFilters.selectedElements || !state.libraryFilters.selectedElements.length || state.libraryFilters.selectedElements.some(function(e) { return visibleLibraryTags(item.source).includes(e); }))
      .filter(item => !state.libraryFilters.selectedFormats || !state.libraryFilters.selectedFormats.length || state.libraryFilters.selectedFormats.some(function(f) { return visibleLibraryTags(item.source).includes(f); }))
      .filter(item => !state.libraryFilters.selectedQuantities || !state.libraryFilters.selectedQuantities.length || state.libraryFilters.selectedQuantities.some(function(q) { return visibleLibraryTags(item.source).includes(q); }))
      .filter(item => {
        if (!query) return true;
        const text = [
          item.source.title,
          item.source.source_filename,
          item.preview.preview_filename,
          libraryKindLabel(libraryKindOfSource(item.source)),
          optionNameById(item.source.country_id),
          optionNameById(item.source.activity_id),
          optionNameById(item.source.category_id),
          ...visibleLibraryTags(item.source)
        ].join(' ').toLowerCase();
        return text.includes(query);
      });
    state.libraryItems = filteredItems;
    var visibleItems = state.libraryItems.slice(0, state.libraryVisibleLimit);
    // 按宽高比交替排列，每4张一组，保持新图优先
    var GROUP = 4;
    var balanced = [];
    for (var g = 0; g < visibleItems.length; g += GROUP) {
      var group = visibleItems.slice(g, g + GROUP).map(function(item, idx) {
        var pw = item.preview.width, ph = item.preview.height;
        return { item: item, ratio: (pw && ph) ? pw / ph : 1 };
      });
      group.sort(function(a, b) { return a.ratio - b.ratio; });
      var l = 0, r = group.length - 1;
      while (l <= r) {
        balanced.push(group[r--].item);
        if (l <= r) balanced.push(group[l++].item);
      }
    }
    visibleItems = balanced;
    const hasMore = visibleItems.length < state.libraryItems.length;
    const counts = countLibraryKinds();
    const sourceBadge = state.libraryRecoveryLabel
      ? `<span class="library-stat recovery"><small>${state.lang === 'zh' ? '来源' : 'Source'}</small><strong>${escapeHtml(state.libraryRecoveryLabel)}</strong></span>`
      : '';
    status.innerHTML = `${sourceBadge}`;
    if (visibleItems.length === 0) {
      state.librarySelectedPreviewId = '';
      grid.innerHTML = `<div class="empty-card">
        <strong>${state.lang === 'zh' ? '还没有符合条件的素材' : 'No matching assets'}</strong>
        <span>${state.lang === 'zh' ? '可以先上传图库图片或案例文件。模板库素材从静态设计师保存进入。' : 'Upload gallery images or case files first. Templates come from Static Designer.'}</span>
      </div>`;
      renderLibraryInspector();
      return;
    }
    if (!visibleItems.some(item => item.preview.id === state.librarySelectedPreviewId)) {
      state.librarySelectedPreviewId = '';
    }
    // 重建前保存已加载的 img 节点，避免所有图片重新解码闪烁
    var oldImgs = {};
    grid.querySelectorAll('.library-card .library-thumb img').forEach(function(img) {
      var card = img.closest('.library-card');
      var pid = card ? card.dataset.previewId : null;
      if (pid && img.src && img.src.indexOf('data:') !== 0 && img.complete && img.naturalWidth > 0) {
        oldImgs[pid] = img;
      }
    });
    grid.innerHTML = `
      ${visibleItems.map(renderLibraryCard).join('')}
      ${hasMore ? `<button class="library-load-more" id="library-load-more" type="button">${state.lang === 'zh' ? `加载更多 ${Math.min(LIBRARY_RENDER_STEP, state.libraryItems.length - visibleItems.length)} 个` : `Load ${Math.min(LIBRARY_RENDER_STEP, state.libraryItems.length - visibleItems.length)} more`}</button>` : ''}
    `;
    // 把旧 img 节点插回新 DOM，保持已解码像素
    Object.keys(oldImgs).forEach(function(pid) {
      var newImg = grid.querySelector('.library-card[data-preview-id="' + pid + '"] .library-thumb img');
      var oldImg = oldImgs[pid];
      if (newImg && oldImg && newImg.parentNode) {
        newImg.parentNode.replaceChild(oldImg, newImg);
      }
    });
    wireLibraryCards();
    document.getElementById('library-load-more')?.addEventListener('click', () => {
      state.libraryVisibleLimit += LIBRARY_RENDER_STEP;
      renderLibraryGrid();
    });
    renderLibraryInspector();
    void signVisibleLibraryUrls(visibleItems);
  }

  async function loadRecoveredPlatformLibrary() {
    try {
      const response = await fetch(`recovered/platform/index.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Recovery index ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.sources) || !Array.isArray(data.previews) || data.sources.length === 0) {
        throw new Error('Recovery index is empty');
      }
      state.libraryOptions = Array.isArray(data.options) ? data.options : [];
      state.librarySources = data.sources;
      state.libraryPreviews = data.previews;
      state.libraryPreviewUrls = Object.fromEntries(
        Object.entries(data.previewUrls || {}).map(([key, value]) => {
          if (String(value).startsWith('data:')) return [key, value];
          return [key, new URL(value, location.href).toString()];
        })
      );
      state.libraryFavorites = new Set();
      state.libraryRecoveryLabel = state.lang === 'zh' ? `旧平台恢复 ${data.totalSources || data.sources.length}` : `Recovered ${data.totalSources || data.sources.length}`;
      state.libraryDataLoaded = true;
      renderLibrarySelects();
      renderLibraryGrid();
      return true;
    } catch (error) {
      console.warn('Recovered platform library unavailable:', error);
      state.libraryRecoveryLabel = '';
      return false;
    }
  }

  function loadLocalLibraryDemo() {
    const now = new Date().toISOString();
    state.libraryRecoveryLabel = state.lang === 'zh' ? '演示数据' : 'Demo';
    state.libraryOptions = [
      { id: 'local-uae', option_type: 'country', name_zh: '阿联酋', name_en: 'UAE', sort_order: 10 },
      { id: 'local-ksa', option_type: 'country', name_zh: '沙特', name_en: 'Saudi Arabia', sort_order: 20 },
      { id: 'local-qatar', option_type: 'country', name_zh: '卡塔尔', name_en: 'Qatar', sort_order: 30 },
      { id: 'local-ramadan', option_type: 'activity', name_zh: '斋月', name_en: 'Ramadan', sort_order: 10 },
      { id: 'local-weekly', option_type: 'activity', name_zh: '周报', name_en: 'Weekly', sort_order: 20 },
      { id: 'local-launch', option_type: 'activity', name_zh: '新品', name_en: 'Launch', sort_order: 30 },
      { id: 'local-food', option_type: 'category', name_zh: '餐饮', name_en: 'F&B', sort_order: 10 },
      { id: 'local-retail', option_type: 'category', name_zh: '零售', name_en: 'Retail', sort_order: 20 },
      { id: 'local-app', option_type: 'category', name_zh: 'App 运营', name_en: 'App Ops', sort_order: 30 }
    ];
    state.librarySources = [
      {
        id: 'local-source-1',
        title: 'Ramadan App Banner Set',
        country_id: 'local-uae',
        activity_id: 'local-ramadan',
        category_id: 'local-app',
        tags: ['App', 'Banner', 'Campaign'],
        visibility: 'all',
        source_filename: 'ramadan-banner-master.psd',
        source_size_bytes: 128 * 1024 * 1024,
        source_ext: 'psd',
        uploaded_by: state.session?.user?.id || 'local_admin',
        created_at: now,
        updated_at: now
      },
      {
        id: 'local-source-2',
        title: 'KSA Weekly Offer Poster',
        country_id: 'local-ksa',
        activity_id: 'local-weekly',
        category_id: 'local-food',
        tags: ['Offer', 'Poster'],
        visibility: 'all',
        source_filename: 'ksa-weekly-offer.ai',
        source_size_bytes: 74 * 1024 * 1024,
        source_ext: 'ai',
        uploaded_by: 'local_designer',
        created_at: now,
        updated_at: now
      },
      {
        id: 'local-source-3',
        title: 'Qatar New Store Launch',
        country_id: 'local-qatar',
        activity_id: 'local-launch',
        category_id: 'local-retail',
        tags: ['Launch', 'Storefront', 'Social'],
        visibility: 'all',
        source_filename: 'qatar-store-launch.pdf',
        source_size_bytes: 52 * 1024 * 1024,
        source_ext: 'pdf',
        uploaded_by: 'local_designer',
        created_at: now,
        updated_at: now
      }
    ];
    state.libraryPreviews = [
      { id: 'local-preview-1', source_file_id: 'local-source-1', preview_path: 'local-preview-1', preview_filename: 'ramadan-banner-01.jpg', width: 1600, height: 900, sort_order: 10, created_at: now },
      { id: 'local-preview-2', source_file_id: 'local-source-1', preview_path: 'local-preview-2', preview_filename: 'ramadan-banner-02.jpg', width: 1080, height: 1350, sort_order: 20, created_at: now },
      { id: 'local-preview-3', source_file_id: 'local-source-2', preview_path: 'local-preview-3', preview_filename: 'weekly-offer.jpg', width: 1200, height: 1500, sort_order: 10, created_at: now },
      { id: 'local-preview-4', source_file_id: 'local-source-3', preview_path: 'local-preview-4', preview_filename: 'launch-social.jpg', width: 1080, height: 1080, sort_order: 10, created_at: now }
    ];
    state.libraryPreviewUrls = {
      'local-preview-1': localPreviewArtwork('Ramadan', '#155eef', '#f59e0b', '#111827'),
      'local-preview-2': localPreviewArtwork('App Banner', '#0f766e', '#60a5fa', '#111827'),
      'local-preview-3': localPreviewArtwork('Weekly Offer', '#be123c', '#f97316', '#111827'),
      'local-preview-4': localPreviewArtwork('Store Launch', '#7c3aed', '#14b8a6', '#111827')
    };
    state.libraryFavorites = new Set(['local-preview-1']);
    state.libraryDataLoaded = true;
    renderLibrarySelects();
    renderLibraryGrid();
  }

  function localPreviewArtwork(title, colorA, colorB, ink) {
    const safeTitle = escapeHtml(title);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
        <rect width="1200" height="900" fill="#f8fafc"/>
        <rect x="80" y="80" width="1040" height="740" rx="36" fill="#ffffff" stroke="#d0d5dd" stroke-width="3"/>
        <rect x="130" y="130" width="420" height="56" rx="28" fill="${colorA}"/>
        <rect x="130" y="222" width="660" height="170" rx="26" fill="${ink}"/>
        <circle cx="930" cy="248" r="116" fill="${colorB}" opacity="0.92"/>
        <circle cx="1008" cy="332" r="74" fill="${colorA}" opacity="0.88"/>
        <rect x="130" y="462" width="890" height="44" rx="22" fill="#e4e7ec"/>
        <rect x="130" y="536" width="620" height="44" rx="22" fill="#e4e7ec"/>
        <rect x="130" y="656" width="260" height="72" rx="18" fill="${colorA}"/>
        <text x="164" y="328" fill="#ffffff" font-family="Inter, Arial" font-size="72" font-weight="800">${safeTitle}</text>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function renderLibraryCard(item) {
    const source = item.source;
    const preview = item.preview;
    const kind = libraryKindOfSource(source);
    const favorite = state.libraryFavorites.has(preview.id);
    const canManage = canManageSource(source);
    const canSource = canDownloadSource();
    const tags = visibleLibraryTags(source).slice(0, 4);
    const selected = state.librarySelectedPreviewId === preview.id;
    const ext = kind === 'template' ? 'TEMPLATE' : sourceFileLabel(source);
    const thumbStyle = previewAspectStyle(preview);
    const previewLabel = kind === 'gallery'
      ? (state.lang === 'zh' ? '原图' : 'Image')
      : (state.lang === 'zh' ? '预览图' : 'Preview');
    const sourceLabel = kind === 'template'
      ? (state.lang === 'zh' ? '模板文件' : 'Template')
      : (state.lang === 'zh' ? '源文件' : 'Source');
    const quickUse = kind === 'gallery'
      ? `<button type="button" data-action="use-static">${state.lang === 'zh' ? '静态' : 'Static'}</button><button type="button" data-action="use-dynamic">${state.lang === 'zh' ? '动态' : 'Motion'}</button>`
      : kind === 'template'
        ? `<button type="button" data-action="use-static">${state.lang === 'zh' ? '打开' : 'Open'}</button>`
        : '';
    return `
      <article class="library-card ${selected ? 'selected' : ''}" data-preview-id="${preview.id}" tabindex="0">
        <div class="library-thumb-wrap">
          <div class="multi-check"></div>
          <div class="library-thumb" style="${thumbStyle}"><img src="${escapeAttr(item.thumbUrl || item.url)}" alt="${escapeAttr(source.title)}" loading="lazy" class="lazy-img" onload="this.classList.add('loaded');var t=this.closest('.library-thumb');if(t)t.classList.add('img-loaded')" onerror="this.classList.add('loaded');var t=this.closest('.library-thumb');if(t)t.classList.add('img-loaded');${item.thumbUrl && item.url ? `this.onerror=null;this.src='${escapeAttr(item.url)}'` : ''}"></div>
          <div class="library-card-icons">
            <button class="favorite-btn ${favorite ? 'active' : ''}" type="button" data-action="favorite" title="${state.lang === 'zh' ? '收藏' : 'Favorite'}">${favorite ? '★' : '☆'}</button>
            <button class="card-download-btn" type="button" data-action="download-preview" title="${previewLabel}">↓</button>
          </div>
          <div class="library-card-overlay">
            <div>
              <h4>${escapeHtml(source.title)}</h4>
              <p>${escapeHtml([libraryKindLabel(kind), ...tags.slice(0, 2)].filter(Boolean).join(' / '))}</p>
            </div>
            <div class="library-card-actions">
              ${quickUse}
              <button type="button" data-action="download-preview">${previewLabel}</button>
              ${canSource && kind !== 'gallery' ? `<button type="button" data-action="download-source">${sourceLabel}</button>` : ''}
              ${canManage ? `<button type="button" data-action="edit">${state.lang === 'zh' ? '编辑' : 'Edit'}</button><button class="danger" type="button" data-action="delete">${state.lang === 'zh' ? '删除' : 'Delete'}</button>` : ''}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function wireLibraryCards() {
    document.querySelectorAll('.library-card').forEach(card => {
      // 双击模板 → 跳转静态DIY编辑
      card.addEventListener('dblclick', function(event) {
        if (event.target.closest('button')) return; // 忽略按钮上的双击
        var item = libraryItemByPreviewId(card.dataset.previewId);
        if (!item || !item.source) return;
        var kind = libraryKindOfSource(item.source);
        if (kind === 'template') {
          openLibraryTemplate(item).catch(function(e) { alert(e.message); });
        }
      });
      card.addEventListener('click', event => {
        // 多选模式下：点击卡片=勾选切换，点击按钮照常
        if (state.libraryMultiSelect) {
          if (event.target.closest('button[data-action]')) {
            const btn = event.target.closest('button[data-action]');
            const item = libraryItemByPreviewId(card.dataset.previewId);
            if (!item) return;
            handleLibraryCardAction(btn.dataset.action, item);
            return;
          }
          toggleMultiCard(card.dataset.previewId);
          return;
        }
        const button = event.target.closest('button[data-action]');
        if (!button) {
          var clickItem = libraryItemByPreviewId(card.dataset.previewId);
          if (clickItem && libraryKindOfSource(clickItem.source) === 'template') return; // 模版单击不弹窗，双击打开
          selectLibraryItem(card.dataset.previewId);
          return;
        }
        const item = libraryItemByPreviewId(card.dataset.previewId);
        if (!item) return;
        handleLibraryCardAction(button.dataset.action, item);
      });
      card.addEventListener('contextmenu', event => {
        event.preventDefault();
        const item = libraryItemByPreviewId(card.dataset.previewId);
        if (!item) return;
        showContextMenu(event, item);
      });
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (state.libraryMultiSelect) {
          toggleMultiCard(card.dataset.previewId);
          return;
        }
        selectLibraryItem(card.dataset.previewId);
      });
    });
    // 图片懒加载淡入
    var lazyImages = document.querySelectorAll('img.lazy-img:not(.observed)');
    if (lazyImages.length && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.isIntersecting) return;
          var img = entry.target;
          img.classList.add('observed');
          observer.unobserve(img);
          if (img.complete) {
            img.classList.add('loaded');
          } else {
            img.addEventListener('load', function() { img.classList.add('loaded'); });
            img.addEventListener('error', function() { img.classList.add('loaded'); });
          }
        });
      }, { rootMargin: '200px' });
      lazyImages.forEach(function(img) { observer.observe(img); });
    }
  }

  /* ── 右键菜单 ── */
  function showContextMenu(event, item) {
    var menu = document.getElementById('context-menu');
    if (!menu) return;
    var source = item.source, preview = item.preview;
    var kind = libraryKindOfSource(source);
    var canManage = canManageSource(source);
    var lang = state.lang;
    var items = [];
    items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5"/><circle cx="7" cy="7" r="2"/><line x1="10.5" y1="10.5" x2="15" y2="15"/></svg>', label: lang === 'zh' ? '查看详情' : 'View details', action: 'detail' });
    items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11.5V14h2.5L13 5.5 10.5 3 2 11.5z"/></svg>', label: lang === 'zh' ? '编辑信息' : 'Edit', action: 'edit' });
    items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="2" x2="8" y2="13"/><polyline points="4 9 8 13 12 9"/><line x1="3" y1="15" x2="13" y2="15"/></svg>', label: kind === 'gallery' ? (lang === 'zh' ? '下载原图' : 'Download image') : (lang === 'zh' ? '下载预览图' : 'Download preview'), action: 'download-preview' });
    if (kind !== 'gallery' && canDownloadSource()) {
      items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="2" x2="8" y2="13"/><polyline points="4 9 8 13 12 9"/><line x1="3" y1="15" x2="13" y2="15"/></svg>', label: kind === 'template' ? (lang === 'zh' ? '下载模板' : 'Download template') : (lang === 'zh' ? '下载源文件' : 'Download source'), action: 'download-source' });
    }
    if (kind === 'gallery') {
      items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="14" height="14" rx="2"/><line x1="5" y1="5" x2="11" y2="11"/><line x1="11" y1="5" x2="5" y2="11"/></svg>', label: lang === 'zh' ? '静态 DIY' : 'Static DIY', action: 'use-static' });
      items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 1 14 8 3 15 3 1"/></svg>', label: lang === 'zh' ? '动态 DIY' : 'Dynamic DIY', action: 'use-dynamic' });
    }
    if (kind === 'template') {
      items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="14" height="14" rx="2"/><line x1="5" y1="5" x2="11" y2="11"/><line x1="11" y1="5" x2="5" y2="11"/></svg>', label: lang === 'zh' ? '打开静态模板' : 'Open static template', action: 'use-static' });
    }
    items.push({ divider: true });
    if (canManage) {
      items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 4 14 4"/><path d="M5 4V2.5a1 1 0 011-1h4a1 1 0 011 1V4"/><rect x="3" y="4" width="10" height="10" rx="1"/></svg>', label: lang === 'zh' ? '删除' : 'Delete', action: 'delete', danger: true });
    }
    items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="14" height="14" rx="3"/><polyline points="4.5 8 7 10.5 11.5 5.5"/></svg>', label: lang === 'zh' ? '多选模式' : 'Multi-select', action: 'multi-select' });

    var html = '';
    items.forEach(function(it) {
      if (it.divider) { html += '<div class="ctx-divider"></div>'; return; }
      html += '<button type="button" class="' + (it.danger ? 'danger' : '') + '" data-ctx-action="' + it.action + '"><span class="ctx-icon">' + it.icon + '</span>' + escapeHtml(it.label) + '</button>';
    });
    menu.innerHTML = html;

    // 绑定菜单点击
    menu.querySelectorAll('[data-ctx-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.dataset.ctxAction;
        hideContextMenu();
        if (action === 'detail') { openLibraryDetailModal(preview.id); return; }
        if (action === 'multi-select') { enterMultiSelect(); return; }
        handleLibraryCardAction(action, item);
      });
    });

    // 定位菜单（防止溢出屏幕边缘）
    var x = event.clientX;
    var y = event.clientY;
    menu.classList.add('show');
    requestAnimationFrame(function() {
      var w = menu.offsetWidth;
      var h = menu.offsetHeight;
      if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8;
      if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
    });
  }

  function hideContextMenu() {
    var menu = document.getElementById('context-menu');
    if (menu) menu.classList.remove('show');
  }

  /* ── 多选模式 ── */
  function enterMultiSelect() {
    state.libraryMultiSelect = true;
    state.librarySelectedIds.clear();
    document.getElementById('library-grid').classList.add('multi-select-active');
    updateMultiSelectBar();
  }

  function exitMultiSelect() {
    state.libraryMultiSelect = false;
    state.librarySelectedIds.clear();
    document.getElementById('library-grid').classList.remove('multi-select-active');
    document.querySelectorAll('.library-card.multi-selected').forEach(function(c) { c.classList.remove('multi-selected'); });
    var bar = document.getElementById('multi-select-bar');
    if (bar) bar.style.display = 'none';
  }

  function toggleMultiCard(previewId) {
    if (state.librarySelectedIds.has(previewId)) {
      state.librarySelectedIds.delete(previewId);
    } else {
      state.librarySelectedIds.add(previewId);
    }
    var card = document.querySelector('.library-card[data-preview-id="' + previewId + '"]');
    if (card) card.classList.toggle('multi-selected', state.librarySelectedIds.has(previewId));
    updateMultiSelectBar();
  }

  function updateMultiSelectBar() {
    var bar = document.getElementById('multi-select-bar');
    if (!bar) return;
    var count = state.librarySelectedIds.size;
    var countEl = bar.querySelector('.bar-count');
    if (countEl) countEl.textContent = (state.lang === 'zh' ? '已选 ' : '') + count + (state.lang === 'zh' ? ' 项' : ' selected');
    bar.style.display = state.libraryMultiSelect ? 'flex' : 'none';
  }

  async function batchDeleteSelected() {
    var ids = Array.from(state.librarySelectedIds);
    if (!ids.length) return;
    if (!confirm((state.lang === 'zh' ? '确定删除已选的 ' : 'Delete ') + ids.length + (state.lang === 'zh' ? ' 项素材？此操作不可恢复。' : ' items? This cannot be undone.'))) return;
    var sourceIds = [];
    ids.forEach(function(pid) {
      var item = libraryItemByPreviewId(pid);
      if (item) sourceIds.push(item.source.id);
    });
    try {
      var { error } = await state.supabase.from('vf_source_files').delete().in('id', sourceIds);
      if (error) throw error;
    } catch(e) {
      alert(e.message);
    }
    exitMultiSelect();
    await reloadLibraryData();
    ids.forEach(function(pid) {
      var item = libraryItemByPreviewId(pid);
      if (item) void logAssetEvent('batch_delete', item);
    });
  }

  async function batchDownloadSelected() {
    var ids = Array.from(state.librarySelectedIds);
    if (!ids.length) return;
    showDownloadToast((state.lang === 'zh' ? '正在打包 ' : 'Packing ') + ids.length + (state.lang === 'zh' ? ' 张图片...' : ' images...'));
    // 并行拉取所有图片
    var tasks = ids.map(function(pid, i) {
      var item = libraryItemByPreviewId(pid);
      if (!item) return Promise.resolve(null);
      var filename = item.preview.preview_filename || ('image_' + (i + 1) + '.jpg');
      if (item.url) {
        return fetch(item.url).then(function(r) {
          if (!r.ok) throw new Error('bad');
          return r.blob().then(function(b) { return { name: filename, blob: b }; });
        }).catch(function() {
          return state.supabase.storage.from(LIBRARY_BUCKET).download(item.preview.preview_path).then(function(r) {
            return r.data ? { name: filename, blob: r.data } : null;
          });
        });
      }
      return state.supabase.storage.from(LIBRARY_BUCKET).download(item.preview.preview_path).then(function(r) {
        return r.data ? { name: filename, blob: r.data } : null;
      });
    });
    var results = await Promise.all(tasks);
    var zip = new JSZip();
    results.forEach(function(r) {
      if (r) zip.file(r.name, r.blob);
    });
    var zipBlob = await zip.generateAsync({ type: 'blob' });
    triggerBlobDownload(zipBlob, 'batch-download-' + ids.length + '.zip');
    ids.forEach(function(pid) {
      var item = libraryItemByPreviewId(pid);
      if (item) void logAssetEvent('batch_download', item);
    });
  }

  /* ── 批量编辑 ── */
  function openBatchEditModal() {
    var ids = Array.from(state.librarySelectedIds);
    if (!ids.length) return;
    document.getElementById('batch-edit-modal').hidden = false;
    var countEl = document.getElementById('batch-edit-count');
    if (countEl) countEl.textContent = (state.lang === 'zh' ? '将修改已选的 ' : 'Will update ') + ids.length + (state.lang === 'zh' ? ' 项素材。未改的字段保持原值。' : ' items. Unchanged fields stay as-is.');
    // 判断选中项的 kind 来决定显示/隐藏国家活动
    var kinds = new Set();
    ids.forEach(function(pid) {
      var item = libraryItemByPreviewId(pid);
      if (item) kinds.add(libraryKindOfSource(item.source));
    });
    var showCountry = kinds.has('gallery') || kinds.has('source');
    var showActivity = kinds.has('source') || kinds.has('template');
    var countryField = document.getElementById('batch-country-field');
    var activityField = document.getElementById('batch-activity-field');
    if (countryField) countryField.style.display = showCountry ? '' : 'none';
    if (activityField) activityField.style.display = showActivity ? '' : 'none';
    // 填充 picker 菜单（带"保持不变"选项）
    populateBatchMetaPickers();
    // 渲染 tag controls（以最常见 kind 为准）
    var primaryKind = kinds.has('source') ? 'source' : (kinds.has('gallery') ? 'gallery' : 'template');
    ['uploadTag1','uploadTag2','uploadTag3','uploadTag4'].forEach(function(key) { state.libraryFilters[key] = 'all'; });
    document.getElementById('batch-edit-tag-controls').innerHTML = renderUploadTagControls(primaryKind);
    wireEditTagPickers();
    wireEditTagHover();
    document.getElementById('batch-edit-message').textContent = '';
  }

  function closeBatchEditModal() {
    document.getElementById('batch-edit-modal').hidden = true;
  }

  function populateBatchMetaPickers() {
    ['country', 'activity'].forEach(function(type) {
      var menu = document.querySelector('#batch-edit-modal [data-upload-meta-menu="' + type + '"]');
      if (!menu) return;
      var keepLabel = state.lang === 'zh' ? '保持不变' : 'Keep';
      var html = '<button type="button" class="active" data-upload-tag-option="' + type + '" data-upload-tag-value="keep">' + keepLabel + '</button>';
      html += '<button type="button" data-upload-tag-option="' + type + '" data-upload-tag-value="all">' + (state.lang === 'zh' ? '清空' : 'Clear') + '</button>';
      var items = libraryOptions(type);
      html += items.map(function(item) {
        return '<button type="button" data-upload-tag-option="' + type + '" data-upload-tag-value="' + item.id + '">' + escapeHtml(optionName(item)) + '</button>';
      }).join('');
      menu.innerHTML = html;
    });
    wireEditTagPickers();
    wireEditTagHover();
  }

  async function saveBatchEdit(event) {
    event.preventDefault();
    var message = document.getElementById('batch-edit-message');
    setMessage(message, state.lang === 'zh' ? '正在保存...' : 'Saving...');
    try {
      var form = new FormData(event.currentTarget);
      var ids = Array.from(state.librarySelectedIds);
      var titlePrefix = form.get('title_prefix').trim();
      var rawCountry = form.get('country');
      var rawActivity = form.get('activity');
      // 确定 primary kind 给 libraryTagsForForm 用
      var kinds = new Set();
      ids.forEach(function(pid) {
        var item = libraryItemByPreviewId(pid);
        if (item) kinds.add(libraryKindOfSource(item.source));
      });
      var primaryKind = kinds.has('source') ? 'source' : (kinds.has('gallery') ? 'gallery' : 'template');
      var tags = libraryTagsForForm(form, primaryKind);
      var hasTagChange = tags.some(function(t) { return t !== 'all' && t !== 'keep'; });
      var sourceIds = [];
      ids.forEach(function(pid) {
        var item = libraryItemByPreviewId(pid);
        if (item) sourceIds.push(item.source.id);
      });
      // 分批更新
      for (var i = 0; i < sourceIds.length; i += 50) {
        var batch = sourceIds.slice(i, i + 50);
        var update = {};
        if (titlePrefix) update.title = titlePrefix;
        if (rawCountry && rawCountry !== 'keep') update.country_id = rawCountry === 'all' ? null : rawCountry;
        if (rawActivity && rawActivity !== 'keep') update.activity_id = rawActivity === 'all' ? null : rawActivity;
        if (hasTagChange) update.tags = tags;
        if (Object.keys(update).length > 0) {
          var { error } = await state.supabase.from('vf_source_files').update(update).in('id', batch);
          if (error) throw error;
        }
      }
      setMessage(message, state.lang === 'zh' ? '已保存。' : 'Saved.', false, true);
      setTimeout(closeBatchEditModal, 500);
      exitMultiSelect();
      await reloadLibraryData();
      ids.forEach(function(pid) {
        var item = libraryItemByPreviewId(pid);
        if (item) void logAssetEvent('batch_edit', item);
      });
    } catch(e) {
      setMessage(message, e.message, true);
    }
  }


  function selectLibraryItem(previewId) {
    state.librarySelectedPreviewId = previewId || '';
    document.querySelectorAll('.library-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.previewId === state.librarySelectedPreviewId);
    });
    renderLibraryInspector();
    if (previewId) openLibraryDetailModal(previewId);
  }

  function renderLibraryInspector() {
    const inspector = document.getElementById('library-inspector');
    if (!inspector) return;
    const item = libraryItemByPreviewId(state.librarySelectedPreviewId);
    if (!item) {
      inspector.innerHTML = `
        <div class="inspector-empty">
          <strong>${state.lang === 'zh' ? '选择一个素材' : 'Select an asset'}</strong>
          <span>${state.lang === 'zh' ? '右侧会显示预览、源文件信息和可执行操作。' : 'Preview, source details, and actions appear here.'}</span>
        </div>
      `;
      return;
    }
    const { source, preview } = item;
    const kind = libraryKindOfSource(source);
    const canManage = canManageSource(source);
    const canSource = canDownloadSource();
    const tags = visibleLibraryTags(source);
    const primaryActions = [
      kind === 'gallery' ? `<button class="primary-btn" type="button" data-preview-id="${preview.id}" data-action="use-static">${state.lang === 'zh' ? '静态 DIY' : 'Static DIY'}</button>` : '',
      kind === 'gallery' ? `<button class="secondary-btn" type="button" data-preview-id="${preview.id}" data-action="use-dynamic">${state.lang === 'zh' ? '动态 DIY' : 'Dynamic DIY'}</button>` : '',
      kind === 'template' ? `<button class="primary-btn" type="button" data-preview-id="${preview.id}" data-action="use-static">${state.lang === 'zh' ? '打开静态模板' : 'Open Static Template'}</button>` : ''
    ].filter(Boolean).join('');
    const previewLabel = kind === 'gallery'
      ? (state.lang === 'zh' ? '下载原图' : 'Download image')
      : (state.lang === 'zh' ? '下载预览图' : 'Download preview');
    const sourceLabel = kind === 'template'
      ? (state.lang === 'zh' ? '下载模板文件' : 'Download template')
      : (state.lang === 'zh' ? '下载源文件' : 'Download source');
    inspector.innerHTML = `
      <div class="inspector-sticky">
        <div class="inspector-preview">${item.url ? `<img src="${escapeAttr(item.url)}" alt="${escapeAttr(source.title)}">` : `<span>${state.lang === 'zh' ? '预览生成中' : 'Preview'}</span>`}</div>
        <div class="inspector-content">
          <div>
            <div class="kicker">${escapeHtml(libraryKindLabel(kind))} / ${escapeHtml(sourceFileLabel(source))}</div>
            <h3>${escapeHtml(source.title)}</h3>
            <p>${escapeHtml(source.source_filename)} · ${formatFileSize(source.source_size_bytes)}</p>
          </div>
          ${primaryActions ? `<div class="inspector-actions">${primaryActions}</div>` : `<div class="inspector-note">${state.lang === 'zh' ? '案例库用于团队下载与归档，暂不直接带入编辑器。' : 'Case assets are for team download and archive, not direct editor import.'}</div>`}
          <dl class="inspector-list">
            <div><dt>${state.lang === 'zh' ? '所在库' : 'Section'}</dt><dd>${escapeHtml(libraryKindLabel(kind))}</dd></div>
            <div><dt>${state.lang === 'zh' ? '标签' : 'Tags'}</dt><dd>${tags.length ? escapeHtml(tags.join(' / ')) : '-'}</dd></div>
            <div><dt>${state.lang === 'zh' ? '文件类型' : 'File type'}</dt><dd>${escapeHtml(sourceFileLabel(source))}</dd></div>
            <div><dt>${state.lang === 'zh' ? '预览尺寸' : 'Preview size'}</dt><dd>${escapeHtml(formatDimensions(preview) || '-')}</dd></div>
            <div><dt>${state.lang === 'zh' ? '更新时间' : 'Updated'}</dt><dd>${formatDate(source.updated_at || source.created_at)}</dd></div>
          </dl>
          ${tags.length ? `<div class="inspector-tags">${tags.map(tag => `<span class="badge">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
          <div class="inspector-secondary-actions">
            <button class="ghost-btn" type="button" data-preview-id="${preview.id}" data-action="download-preview">${previewLabel}</button>
            ${canSource && kind !== 'gallery' ? `<button class="ghost-btn" type="button" data-preview-id="${preview.id}" data-action="download-source">${sourceLabel}</button>` : ''}
            ${canManage ? `<button class="ghost-btn" type="button" data-preview-id="${preview.id}" data-action="edit">${state.lang === 'zh' ? '编辑信息' : 'Edit details'}</button><button class="ghost-btn danger" type="button" data-preview-id="${preview.id}" data-action="delete">${state.lang === 'zh' ? '删除整组' : 'Delete source'}</button>` : ''}
          </div>
        </div>
      </div>
    `;
    wireLibraryInspectorActions();
  }

  function wireLibraryInspectorActions() {
    document.querySelectorAll('#library-inspector button[data-action]').forEach(button => {
      button.addEventListener('click', () => {
        const item = libraryItemByPreviewId(button.dataset.previewId);
        if (!item) return;
        handleLibraryCardAction(button.dataset.action, item);
      });
    });
  }

  async function handleLibraryCardAction(action, item) {
    if (action === 'favorite') return toggleLibraryFavorite(item);
    if (action === 'download-preview') return downloadLibraryFile(item, 'preview');
    if (action === 'download-source') return downloadLibraryFile(item, 'source');
    if (action === 'use-static') return useLibraryAsset(item, 'static');
    if (action === 'use-dynamic') return useLibraryAsset(item, 'dynamic');
    if (action === 'edit') return openLibraryEditModal(item.source.id);
    if (action === 'delete') return deleteLibrarySource(item.source.id);
  }

  function renderLibraryDetailModal() {
    return `
      <div id="library-detail-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal" style="max-width:680px;padding:24px 28px 20px;">
          <div class="modal-head" style="margin-bottom:10px;">
            <h3 id="library-detail-title" style="font-size:18px;">${state.lang === 'zh' ? '素材详情' : 'Asset Details'}</h3>
            <button class="icon-btn modal-close-circle" id="close-library-detail" type="button" aria-label="Close"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg></button>
          </div>
          <div id="library-detail-preview" style="width:100%;aspect-ratio:16/10;max-height:55vh;overflow:auto;background:#f4f5f7;border-radius:14px;margin-bottom:14px;border:1px solid #e8ebf0;"></div>
          <div id="library-detail-meta" style="margin-bottom:14px;"></div>
          <div id="library-detail-actions" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;"></div>
        </section>
      </div>
    `;
  }

  function openLibraryDetailModal(previewId) {
    const item = libraryItemByPreviewId(previewId);
    if (!item) return;
    void logAssetEvent('view', item);
    const { source, preview } = item;
    const kind = libraryKindOfSource(source);
    const canManage = canManageSource(source);
    const canSource = canDownloadSource();
    const tags = visibleLibraryTags(source);
    const previewUrl = item.url || '';

    // Title
    const titleEl = document.getElementById('library-detail-title');
    if (titleEl) titleEl.textContent = source.title || (state.lang === 'zh' ? '素材详情' : 'Asset Details');

    // Preview image - clean, no buttons
    const previewEl = document.getElementById('library-detail-preview');
    if (previewEl) {
      previewEl.innerHTML = previewUrl
        ? `<img src="${escapeAttr(previewUrl)}" alt="${escapeAttr(source.title)}" style="width:100%;height:auto;display:block;">`
        : `<span style="color:#94a3b8;font-size:14px;">${state.lang === 'zh' ? '预览生成中' : 'Preview loading...'}</span>`;
		      previewEl.scrollTop = 0;
		      previewEl.onwheel = function(e) {
		        var atTop = previewEl.scrollTop <= 0;
		        var atBottom = previewEl.scrollTop + previewEl.clientHeight >= previewEl.scrollHeight - 1;
		        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
		          e.preventDefault();
		        }
		      };
    }

    // Meta info
    const metaEl = document.getElementById('library-detail-meta');
    if (metaEl) {
      metaEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px;">
          <div><span style="color:#667085;">${state.lang === 'zh' ? '类型' : 'Kind'}</span><span style="margin-left:8px;color:#0f172a;font-weight:650;">${escapeHtml(libraryKindLabel(kind))}</span></div>
          <div><span style="color:#667085;">${state.lang === 'zh' ? '文件' : 'File'}</span><span style="margin-left:8px;color:#0f172a;font-weight:650;">${escapeHtml(sourceFileLabel(source))}</span></div>
          <div><span style="color:#667085;">${state.lang === 'zh' ? '大小' : 'Size'}</span><span style="margin-left:8px;color:#0f172a;font-weight:650;">${escapeHtml(formatFileSize(source.source_size_bytes))}</span></div>
          <div><span style="color:#667085;">${state.lang === 'zh' ? '尺寸' : 'Dimensions'}</span><span style="margin-left:8px;color:#0f172a;font-weight:650;">${escapeHtml(formatDimensions(preview) || '-')}</span></div>
          <div><span style="color:#667085;">${state.lang === 'zh' ? '更新' : 'Updated'}</span><span style="margin-left:8px;color:#0f172a;font-weight:650;">${formatDate(source.updated_at || source.created_at)}</span></div>
        </div>
        ${tags.length ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">${tags.map(tag => `<span style="display:inline-block;padding:3px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;color:#334155;">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      `;
    }

    // Action buttons
    const actionsEl = document.getElementById('library-detail-actions');
    if (actionsEl) {
      const buttons = [];
      if (kind === 'gallery') {
        buttons.push(`<button class="primary-btn" type="button" data-action="use-static" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${state.lang === 'zh' ? '静态 DIY' : 'Static DIY'}</button>`);
        buttons.push(`<button class="secondary-btn" type="button" data-action="use-dynamic" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${state.lang === 'zh' ? '动态 DIY' : 'Dynamic DIY'}</button>`);
      } else if (kind === 'template') {
        buttons.push(`<button class="primary-btn" type="button" data-action="use-static" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${state.lang === 'zh' ? '打开静态模板' : 'Open Template'}</button>`);
      }
      buttons.push(`<button class="ghost-btn" type="button" data-action="download-preview" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${kind === 'gallery' ? (state.lang === 'zh' ? '下载原图' : 'Download') : (state.lang === 'zh' ? '下载预览图' : 'Download Preview')}</button>`);
      if (canSource && kind !== 'gallery') {
        buttons.push(`<button class="ghost-btn" type="button" data-action="download-source" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${kind === 'template' ? (state.lang === 'zh' ? '下载模板' : 'Download Template') : (state.lang === 'zh' ? '下载源文件' : 'Download Source')}</button>`);
      }
      if (canManage) {
        buttons.push(`<button class="ghost-btn" type="button" data-action="edit" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${state.lang === 'zh' ? '编辑信息' : 'Edit'}</button>`);
        buttons.push(`<button class="ghost-btn danger" type="button" data-action="delete" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${state.lang === 'zh' ? '删除' : 'Delete'}</button>`);
      }
      actionsEl.innerHTML = buttons.join('');
      // Wire action buttons
      actionsEl.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const it = libraryItemByPreviewId(btn.dataset.previewId);
          if (!it) return;
          handleLibraryCardAction(btn.dataset.action, it);
        });
      });
    }

    document.getElementById('library-detail-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLibraryDetailModal() {
    const modal = document.getElementById('library-detail-modal');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
  }

  function populateDropZoneWithFiles(kind, files) {
    var inputId;
    if (kind === 'gallery') {
      inputId = 'library-gallery-input';
    } else if (kind === 'source') {
      inputId = 'library-preview-input';
    } else {
      return; // template 不支持拖入图片
    }
    var input = document.getElementById(inputId);
    if (!input) return;
    var dt = new DataTransfer();
    var imageFiles = files.filter(function(f) { return (f.type || '').startsWith('image/'); });
    imageFiles.forEach(function(f) { dt.items.add(f); });
    input.files = dt.files;
    var zone = document.querySelector('[data-drop-input="' + inputId + '"]');
    if (zone) updateDropZoneSummary(zone, input.files);
    // 自动填名称
    var titleInput = document.getElementById('library-upload-title');
    if (titleInput && !titleInput.value.trim() && imageFiles.length) {
      titleInput.value = stripExtension(imageFiles[0].name);
    }
  }

  function openLibraryUploadModal(opts) {
    opts = opts || {};
    renderLibrarySelects();
    const form = document.getElementById('library-upload-form');
    if (!form) return;
    form.reset();
    // 确定入库类型：优先用传入的 kind，其次当前页面筛选的 kind，最后默认 gallery
    var defaultKind = opts.kind;
    if (!defaultKind) {
      var currentKind = state.libraryFilters.kind;
      defaultKind = (currentKind && currentKind !== 'all') ? currentKind : 'gallery';
    }
    const kindInput = document.getElementById('library-upload-kind');
    if (kindInput) kindInput.value = defaultKind;
    // 确定各层级 tag：优先用传入的，其次当前页面筛选的
    var pageTag1 = state.libraryFilters.tag1;
    var fallbackTag1 = (pageTag1 && pageTag1 !== 'all') ? pageTag1 : (defaultKind === 'source' ? 'C端' : 'all');
    state.libraryFilters.uploadTag1 = opts.tag1 || fallbackTag1;
    state.libraryFilters.uploadTag2 = opts.tag2 || ((state.libraryFilters.tag2 && state.libraryFilters.tag2 !== 'all') ? state.libraryFilters.tag2 : 'all');
    state.libraryFilters.uploadTag3 = opts.tag3 || ((state.libraryFilters.tag3 && state.libraryFilters.tag3 !== 'all') ? state.libraryFilters.tag3 : 'all');
    state.libraryFilters.uploadTag4 = opts.tag4 || ((state.libraryFilters.tag4 && state.libraryFilters.tag4 !== 'all') ? state.libraryFilters.tag4 : 'all');
    // 确定国家/活动：优先用传入的，其次用右上角筛选面板已选中的（单选取第一个）
    var pageCountries = state.libraryFilters.selectedCountries || [];
    var pageActivities = state.libraryFilters.selectedActivities || [];
    state.libraryFilters.uploadCountry = opts.country || (pageCountries.length === 1 ? pageCountries[0] : 'all');
    state.libraryFilters.uploadActivity = opts.activity || (pageActivities.length === 1 ? pageActivities[0] : 'all');
    const tagControls = document.getElementById('library-upload-tag-controls');
    if (tagControls) tagControls.innerHTML = renderUploadTagControls(defaultKind);
    document.getElementById('library-upload-title').value = opts.title || '';
    document.getElementById('library-upload-message').textContent = '';
    document.getElementById('library-upload-modal').hidden = false;
    setTimeout(function() { populateUploadMetaPickers(); }, 50);
    setTimeout(function() { prefillUploadMetaSelections(); }, 120);
    document.querySelector('.library-upload-scroll')?.scrollTo({ top: 0, behavior: 'auto' });
    updateLibraryUploadMode(defaultKind);
    wireLibraryUploadKindCards();
    wireUploadTagPickers();
    wireUploadTagHover();
    document.querySelectorAll('.library-drop-zone').forEach(zone => updateDropZoneSummary(zone, []));
    // 如有拖入的文件，填入对应的 drop zone
    if (opts.files && opts.files.length) {
      populateDropZoneWithFiles(defaultKind, opts.files);
    }
  }

  function prefillUploadMetaSelections() {
    ['country', 'activity'].forEach(function(type) {
      var key = 'upload' + type.charAt(0).toUpperCase() + type.slice(1);
      var val = state.libraryFilters[key];
      if (!val || val === 'all') return;
      var btn = document.querySelector('[data-upload-tag-option="' + type + '"][data-upload-tag-value="' + val + '"]');
      if (btn) btn.click();
    });
  }

  function closeLibraryUploadModal() {
    const modal = document.getElementById('library-upload-modal');
    if (modal) modal.hidden = true;
  }

  function updateLibraryUploadMode(kind) {
    document.querySelectorAll('[data-upload-mode]').forEach(node => {
      node.hidden = node.dataset.uploadMode !== kind;
    });
    document.querySelectorAll('[data-upload-kind-card]').forEach(button => {
      button.classList.toggle('active', button.dataset.uploadKindCard === kind);
      button.setAttribute('aria-checked', button.dataset.uploadKindCard === kind ? 'true' : 'false');
    });
    const countryField = document.getElementById('upload-country-field');
    const activityField = document.getElementById('upload-activity-field');
    if (countryField) countryField.style.display = (kind === 'gallery' || kind === 'source') ? '' : 'none';
    if (activityField) activityField.style.display = (kind === 'source' || kind === 'template') ? '' : 'none';
    setTimeout(function() { populateUploadMetaPickers(); }, 50);

  }

  function wireLibraryUploadKindCards() {
    const kind = document.getElementById('library-upload-kind')?.value || 'source';
    updateLibraryUploadMode(kind);
  }

  function wireUploadTagPickers() {
    document.querySelectorAll('#library-upload-modal [data-upload-tag-option]').forEach(button => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const key = button.dataset.uploadTagOption;
        const value = button.dataset.uploadTagValue || 'all';
        const picker = button.closest('[data-upload-tag-picker]');
        const input = document.querySelector(`#library-upload-modal [data-upload-tag-input="${key}"]`);
        if (input) input.value = value;
        if (picker) {
          picker.querySelectorAll('[data-upload-tag-option]').forEach(option => option.classList.toggle('active', option === button));
          var label;
          if (value === 'all') {
            label = state.lang === 'zh' ? '未分类' : 'Unclassified';
          } else if (key === 'country' || key === 'activity') {
            label = button.textContent.trim();
          } else {
            label = value;
          }
          const triggerLabel = picker.querySelector('[data-upload-tag-trigger] strong');
          if (triggerLabel) triggerLabel.textContent = label;
          picker.classList.remove('menu-open');
        }
        if (key === 'tag1') {
          const newVal = value === 'all' ? 'all' : value;
          if (newVal !== state.libraryFilters.uploadTag1) {
            state.libraryFilters.uploadTag1 = newVal;
            const kind = document.getElementById('library-upload-kind')?.value || 'gallery';
            document.getElementById('library-upload-tag-controls').innerHTML = renderUploadTagControls(kind);
            wireUploadTagPickers();
            wireUploadTagHover();
          }
        }
      });
    });
  }

  function wireUploadTagHover() {
    document.querySelectorAll('#library-upload-modal .upload-tag-picker').forEach(function(picker) {
      if (picker.dataset.hoverBound === 'true') return;
      picker.dataset.hoverBound = 'true';
      var menu = picker.querySelector('.upload-tag-menu');
      if (!menu) return;
      var hideTimer = null;

      function showMenu() {
        clearTimeout(hideTimer);
        picker.classList.add('menu-open');
      }
      function hideMenu() {
        hideTimer = setTimeout(function() {
          picker.classList.remove('menu-open');
        }, 150);
      }
      function hideNow() {
        clearTimeout(hideTimer);
        picker.classList.remove('menu-open');
      }

      picker.addEventListener('mouseenter', showMenu);
      picker.addEventListener('mouseleave', hideMenu);
      if (menu) {
        menu.addEventListener('mouseenter', showMenu);
        menu.addEventListener('mouseleave', hideNow);
      }
    });
  }

  function populateUploadMetaPickers() {
    ['country', 'activity'].forEach(function(type) {
      var menu = document.querySelector('#library-upload-modal [data-upload-meta-menu="' + type + '"]');
      if (!menu) return;
      var key = 'upload' + type.charAt(0).toUpperCase() + type.slice(1);
      var selectedVal = state.libraryFilters[key] || 'all';
      var items = libraryOptions(type);
      var emptyLabel = state.lang === 'zh' ? '全部' : 'All';
      var allActive = selectedVal === 'all';
      var html = '<button type="button" class="' + (allActive ? 'active' : '') + '" data-upload-tag-option="' + type + '" data-upload-tag-value="all">' + emptyLabel + '</button>';
      html += items.map(function(item) {
        var isActive = selectedVal === item.id;
        return '<button type="button" class="' + (isActive ? 'active' : '') + '" data-upload-tag-option="' + type + '" data-upload-tag-value="' + item.id + '">' + escapeHtml(optionName(item)) + '</button>';
      }).join('');
      menu.innerHTML = html;
      // 同步更新隐藏 input 和触发按钮的文字
      var input = document.querySelector('#library-upload-modal [data-upload-tag-input="' + type + '"]');
      if (input) input.value = selectedVal;
      var triggerLabel = document.querySelector('#library-upload-modal [data-upload-tag-trigger="' + type + '"] strong');
      if (triggerLabel) {
        if (selectedVal === 'all') {
          triggerLabel.textContent = state.lang === 'zh' ? '全部' : 'All';
        } else {
          var selItem = items.find(function(it) { return it.id === selectedVal; });
          triggerLabel.textContent = selItem ? optionName(selItem) : selectedVal;
        }
      }
    });
    wireUploadTagPickers();
    wireUploadTagHover();
  }

  function populateEditMetaPickers() {
    ['country', 'activity'].forEach(function(type) {
      var menu = document.querySelector('#library-edit-modal [data-upload-meta-menu="' + type + '"]');
      if (!menu) return;
      var items = libraryOptions(type);
      var emptyLabel = state.lang === 'zh' ? '全部' : 'All';
      var html = '<button type="button" class="active" data-upload-tag-option="' + type + '" data-upload-tag-value="all">' + emptyLabel + '</button>';
      html += items.map(function(item) {
        return '<button type="button" data-upload-tag-option="' + type + '" data-upload-tag-value="' + item.id + '">' + escapeHtml(optionName(item)) + '</button>';
      }).join('');
      menu.innerHTML = html;
    });
    wireEditTagPickers();
    wireEditTagHover();
  }

  function populateEditKindPicker(currentKind) {
    currentKind = currentKind || 'source';
    var menu = document.getElementById('edit-kind-menu');
    if (!menu) return;
    var kinds = [
      { id: 'source', zh: '案例库', en: 'Case Library' },
      { id: 'gallery', zh: '图库', en: 'Gallery' },
      { id: 'template', zh: '模板库', en: 'Templates' }
    ];
    var html = '';
    kinds.forEach(function(k) {
      var label = state.lang === 'zh' ? k.zh : k.en;
      var active = k.id === currentKind ? ' active' : '';
      html += '<button type="button" class="' + active + '" data-edit-kind-option="' + k.id + '">' + label + '</button>';
    });
    menu.innerHTML = html;
    // 更新 trigger 显示
    var found = kinds.find(function(k) { return k.id === currentKind; });
    var label = found ? (state.lang === 'zh' ? found.zh : found.en) : currentKind;
    var triggerLabel = document.querySelector('#edit-kind-field [data-upload-tag-trigger] strong');
    if (triggerLabel) triggerLabel.textContent = label;
    // 绑定 kind 选项点击
    menu.querySelectorAll('[data-edit-kind-option]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var newKind = btn.dataset.editKindOption;
        // 更新 hidden input
        document.getElementById('library-edit-kind').value = newKind;
        document.getElementById('library-edit-kind-value').value = newKind;
        // 更新 trigger 显示
        var kf = [{ id: 'source', zh: '案例库', en: 'Case Library' }, { id: 'gallery', zh: '图库', en: 'Gallery' }, { id: 'template', zh: '模板库', en: 'Templates' }].find(function(k) { return k.id === newKind; });
        var lbl = kf ? (state.lang === 'zh' ? kf.zh : kf.en) : newKind;
        var tl = document.querySelector('#edit-kind-field [data-upload-tag-trigger] strong');
        if (tl) tl.textContent = lbl;
        // 更新菜单选中态
        menu.querySelectorAll('[data-edit-kind-option]').forEach(function(b) { b.classList.toggle('active', b === btn); });
        // 关闭菜单
        document.getElementById('edit-kind-field').classList.remove('menu-open');
        // 重置 tag 值并重新渲染 tag controls
        ['uploadTag1','uploadTag2','uploadTag3','uploadTag4'].forEach(function(key) { state.libraryFilters[key] = 'all'; });
        document.getElementById('library-edit-tag-controls').innerHTML = renderUploadTagControls(newKind);
        wireUploadTagPickers();
        wireUploadTagHover();
        // 根据 kind 显示/隐藏国家和活动
        var cf = document.getElementById('edit-country-field');
        var af = document.getElementById('edit-activity-field');
        if (cf) cf.style.display = (newKind === 'gallery' || newKind === 'source') ? '' : 'none';
        if (af) af.style.display = (newKind === 'source' || newKind === 'template') ? '' : 'none';
      });
    });
  }

  function wireEditTagPickers(scope) {
    scope = scope || ':is(#library-edit-modal, #batch-edit-modal)';
    document.querySelectorAll(scope + ' [data-upload-tag-option]').forEach(function(button) {
      if (button.dataset.editBound === 'true') return;
      button.dataset.editBound = 'true';
      button.addEventListener('click', function() {
        var key = button.dataset.uploadTagOption;
        var value = button.dataset.uploadTagValue || 'all';
        var picker = button.closest('[data-upload-tag-picker]');
        var input = picker.querySelector('[data-upload-tag-input="' + key + '"]');
        if (input) input.value = value;
        if (picker) {
          picker.querySelectorAll('[data-upload-tag-option]').forEach(function(option) { option.classList.toggle('active', option === button); });
          var label = value === 'all' ? (state.lang === 'zh' ? '全部' : 'All') : button.textContent.trim();
          var triggerLabel = picker.querySelector('[data-upload-tag-trigger] strong');
          if (triggerLabel) triggerLabel.textContent = label;
          picker.classList.remove('menu-open');
        }
      });
    });
  }

  function wireEditTagHover(scope) {
    scope = scope || ':is(#library-edit-modal, #batch-edit-modal)';
    document.querySelectorAll(scope + ' .upload-tag-picker').forEach(function(picker) {
      if (picker.dataset.editHoverBound === 'true') return;
      picker.dataset.editHoverBound = 'true';
      var menu = picker.querySelector('.upload-tag-menu');
      if (!menu) return;
      var hideTimer = null;
      function showMenu() { clearTimeout(hideTimer); picker.classList.add('menu-open'); }
      function hideMenu() { hideTimer = setTimeout(function() { picker.classList.remove('menu-open'); }, 350); }
      function hideNow() { clearTimeout(hideTimer); picker.classList.remove('menu-open'); }
      function toggleMenu() { clearTimeout(hideTimer); picker.classList.toggle('menu-open'); }
      picker.addEventListener('mouseenter', showMenu);
      picker.addEventListener('mouseleave', hideMenu);
      if (menu) { menu.addEventListener('mouseenter', showMenu); menu.addEventListener('mouseleave', hideNow); }
      // 点击触发器也可以开关菜单（兜底）
      var trigger = picker.querySelector('[data-upload-tag-trigger]');
      if (trigger) { trigger.addEventListener('click', function(e) { e.stopPropagation(); toggleMenu(); }); }
    });
  }

  function filterOversizedFiles(input) {
    // 不再拦截大文件，上传时自动压缩
  }

  function wireLibraryUploadDrops() {
    document.querySelectorAll('.library-drop-zone').forEach(zone => {
      const input = document.getElementById(zone.dataset.dropInput);
      if (!input) return;
      input.addEventListener('change', () => {
        filterOversizedFiles(input);
        updateDropZoneSummary(zone, input.files);
        // 有文件时让隐形 input 不拦截点击，× 按钮才能被点到
        input.style.pointerEvents = (input.files && input.files.length) ? 'none' : '';
      });
      zone.addEventListener('dragenter', event => {
        event.preventDefault();
        zone.classList.add('dragging');
      });
      zone.addEventListener('dragover', event => {
        event.preventDefault();
        zone.classList.add('dragging');
      });
      zone.addEventListener('dragleave', event => {
        if (!zone.contains(event.relatedTarget)) zone.classList.remove('dragging');
      });
      zone.addEventListener('drop', event => {
        event.preventDefault();
        zone.classList.remove('dragging');
        const files = Array.from(event.dataTransfer?.files || []);
        if (!files.length) return;
        // 根据 input 的 accept 属性过滤文件
        const accept = (input.getAttribute('accept') || '').toLowerCase();
        let acceptedFiles = files;
        if (accept) {
          const allowedExts = accept.split(',').map(function(s) { return s.trim().replace('.', '').toLowerCase(); });
          acceptedFiles = files.filter(function(file) {
            var ext = (file.name.split('.').pop() || '').toLowerCase();
            var mime = (file.type || '').toLowerCase();
            return allowedExts.some(function(a) { return ext === a || mime.includes(a) || (a === 'pdf' && mime === 'application/pdf'); });
          });
        }
        if (!acceptedFiles.length) return;
        const dt = new DataTransfer();
        // 保留已有的文件（多选 input 追加而非替换）
        if (input.multiple) {
          Array.from(input.files || []).forEach(function(f) { dt.items.add(f); });
        }
        const maxFiles = input.multiple ? acceptedFiles.length : 1;
        acceptedFiles.slice(0, maxFiles).forEach(file => dt.items.add(file));
        input.files = dt.files;
        updateDropZoneSummary(zone, input.files);
        const titleInput = document.getElementById('library-upload-title');
        if (titleInput && !titleInput.value.trim() && input.id !== 'library-preview-input') {
          titleInput.value = stripExtension(acceptedFiles[0].name);
        }
      });
    });
  }

  function updateDropZoneSummary(zone, fileList) {
    const files = Array.from(fileList || []);
    const summary = zone.querySelector('[data-file-summary]');
    const thumbStrip = zone.querySelector('[data-thumb-strip]');
    if (!files.length) {
      if (summary) {
        summary.style.display = 'none';
      }
      if (thumbStrip) { thumbStrip.style.display = 'none'; thumbStrip.innerHTML = ''; }
      return;
    }
    const isImage = files.some(function(f) { return (f.type || '').startsWith('image/'); });
    if (isImage && thumbStrip) {
      if (summary) summary.style.display = 'none';
      thumbStrip.style.display = '';
      thumbStrip.innerHTML = files.map(function(file, i) {
        var url = URL.createObjectURL(file);
        return '<div class="drop-thumb">' +
          '<img src="' + url + '" alt="">' +
          '<button type="button" class="drop-thumb-del" data-file-index="' + i + '" data-drop-input="' + zone.dataset.dropInput + '">&times;</button>' +
          '<small>' + escapeHtml(file.name) + '</small>' +
          '</div>';
      }).join('');
      thumbStrip.querySelectorAll('.drop-thumb-del').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          removeDropFile(btn.dataset.dropInput, parseInt(btn.dataset.fileIndex));
        });
      });
    } else if (summary) {
      summary.style.display = '';
      if (thumbStrip) thumbStrip.style.display = 'none';
      var names = files.slice(0, 3).map(function(f) { return f.name; }).join(' / ');
      var text = files.length > 3 ? names + ' +' + (files.length - 3) : names;
      summary.innerHTML = '<span>' + escapeHtml(text) + '</span>' +
        ' <button type="button" class="drop-file-clear" data-drop-input="' + zone.dataset.dropInput + '" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:0;border-radius:999px;background:rgba(0,0,0,0.45);color:#fff;font-size:13px;line-height:1;cursor:pointer;padding:0;vertical-align:middle;">&times;</button>';
      summary.querySelector('.drop-file-clear').addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        removeDropFile(this.dataset.dropInput, 0);
      });
    }
  }

  function removeDropFile(inputId, index) {
    var input = document.getElementById(inputId);
    if (!input) return;
    var files = Array.from(input.files || []);
    files.splice(index, 1);
    var dt = new DataTransfer();
    files.forEach(function(f) { dt.items.add(f); });
    input.files = dt.files;
    var zone = document.querySelector('[data-drop-input="' + inputId + '"]');
    if (zone) updateDropZoneSummary(zone, input.files);
  }

  async function uploadLibraryAsset(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = event.submitter || form.querySelector('button[type="submit"]');
    const originalSubmitText = submitButton?.textContent || '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = state.lang === 'zh' ? '上传中...' : 'Uploading...';
    }
    const message = document.getElementById('library-upload-message');
    function setUploadProgress(pct) {
      message.innerHTML = '<div class="upload-progress-row"><div class="upload-progress-bar-wrap"><div class="upload-progress-bar-fill" style="width:' + pct + '%"></div></div><span class="upload-progress-text">' + pct + '%</span></div>';
    }
    setUploadProgress(0);
    const uploadedPaths = [];
    let sourceInserted = false;
    let sourceId = '';
    try {
      const formData = new FormData(form);
      const libraryKind = formData.get('library_kind') || 'gallery';
      if (libraryKind === 'gallery') {
        await uploadGalleryAssets(formData, setUploadProgress);
        setUploadProgress(100);
        setMessage(message, state.lang === 'zh' ? '图库素材已上传。' : 'Gallery assets uploaded.', false, true);
        setTimeout(closeLibraryUploadModal, 600);
        state.libraryFilters.kind = 'gallery';
        await reloadLibraryData();
        return;
      }
      if (libraryKind === 'template') {
        setUploadProgress(20);
        await uploadTemplateAsset(formData);
        setUploadProgress(100);
        setMessage(message, state.lang === 'zh' ? '模板已上传。' : 'Template uploaded.', false, true);
        setTimeout(closeLibraryUploadModal, 600);
        state.libraryFilters.kind = 'template';
        await reloadLibraryData();
        return;
      }
      const sourceFile = formData.get('source_file');
      const previewFiles = Array.from(formData.getAll('preview_files')).filter(file => file && file.size > 0);
      validateLibraryUpload(sourceFile, previewFiles);
      setUploadProgress(10);
      sourceId = crypto.randomUUID();
      const userId = state.session.user.id;
      const sourcePath = `${userId}/sources/${sourceId}/${safeStorageName(sourceFile.name)}`;
      const sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, sourceFile, { upsert: false, contentType: sourceFile.type || 'application/octet-stream' });
      if (sourceUpload.error) throw sourceUpload.error;
      setUploadProgress(30);
      uploadedPaths.push(sourcePath);
      const title = formData.get('title').trim();
      const countryId = formData.get('country');
      const activityId = formData.get('activity');
      const categoryId = formData.get('category');
      const sourceRow = {
        id: sourceId,
        title,
        country_id: (countryId && countryId !== 'all') ? countryId : null,
        activity_id: (activityId && activityId !== 'all') ? activityId : null,
        category_id: (categoryId && categoryId !== 'all') ? categoryId : null,
        tags: libraryTagsForForm(formData, 'source'),
        visibility: formData.get('visibility') || 'all',
        source_path: sourcePath,
        source_filename: sourceFile.name,
        source_mime_type: sourceFile.type || '',
        source_size_bytes: sourceFile.size,
        source_ext: fileExt(sourceFile.name),
        uploaded_by: userId
      };
      const sourceInsert = await state.supabase.from('vf_source_files').insert([sourceRow]);
      if (sourceInsert.error) throw sourceInsert.error;
      setUploadProgress(45);
      sourceInserted = true;
      const previewRows = [];
      const previewBasePct = 45;
      const previewPctEach = previewFiles.length ? Math.floor(50 / previewFiles.length) : 0;
      for (let index = 0; index < previewFiles.length; index += 1) {
        const file = previewFiles[index];
        const previewId = crypto.randomUUID();
        const previewPath = `${userId}/previews/${sourceId}/${previewId}-${safeStorageName(file.name)}`;
        const upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(previewPath, file, { upsert: false, contentType: file.type });
        if (upload.error) throw upload.error;
        uploadedPaths.push(previewPath);
        const dimensions = await readImageDimensions(file);
        previewRows.push({
          id: previewId,
          source_file_id: sourceId,
          preview_path: previewPath,
          preview_filename: file.name,
          preview_mime_type: file.type,
          preview_size_bytes: file.size,
          width: dimensions.width,
          height: dimensions.height,
          sort_order: (index + 1) * 10
        });
        setUploadProgress(previewBasePct + previewPctEach * (index + 1));
      }
      setUploadProgress(95);
      const previewInsert = await state.supabase.from('vf_asset_previews').insert(previewRows);
      if (previewInsert.error) throw previewInsert.error;
      setUploadProgress(100);
      setMessage(message, state.lang === 'zh' ? '上传成功，已入库。' : 'Uploaded.', false, true);
      setTimeout(closeLibraryUploadModal, 600);
      // 埋点：为每个预览图记录上传事件
      previewRows.forEach(function(pr) {
        void logAssetEvent('upload', { source: sourceRow, preview: { id: pr.id, preview_filename: pr.preview_filename, preview_path: pr.preview_path } });
      });
      await reloadLibraryData();
    } catch (error) {
      await cleanupFailedLibraryUpload(sourceId, sourceInserted, uploadedPaths);
      setMessage(message, error.message, true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitText;
      }
    }
  }

  function generateThumbnail(file, maxWidth) {
    maxWidth = maxWidth || 400;
    return new Promise(function(resolve, reject) {
      if (!file.type.startsWith('image/')) return resolve(null);
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var ratio = Math.min(1, maxWidth / img.width);
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) {
          // 如果压缩后反而更大就放弃
          resolve(blob && blob.size < file.size ? blob : null);
        }, 'image/jpeg', 0.7);
      };
      img.onerror = function() {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  function compressImageIfNeeded(file, maxSize) {
    maxSize = maxSize || 10 * 1024 * 1024; // 默认 10MB
    if (!file.type.startsWith('image/') || file.size <= maxSize) return Promise.resolve(file);
    return new Promise(function(resolve) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        // 逐级降低质量直到满足大小
        function tryQuality(q) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(function(blob) {
            if (!blob || blob.size <= maxSize || q <= 0.3) {
              resolve(blob && blob.size < file.size ? blob : file);
            } else {
              tryQuality(q - 0.1);
            }
          }, 'image/jpeg', q);
        }
        tryQuality(0.85);
      };
      img.onerror = function() { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function uploadGalleryAssets(formData, onProgress) {
    const files = Array.from(formData.getAll('gallery_files')).filter(file => file && file.size > 0);
    validateGalleryUpload(files);
    const userId = state.session.user.id;
    var baseTitle = formData.get('title').trim();
    const uploadedPaths = [];
    const insertedSourceIds = [];
    const pctEach = files.length ? Math.floor(90 / files.length) : 90;
    try {
      let fileIndex = 0;
      for (const file of files) {
        if (onProgress) onProgress(pctEach * fileIndex);
        // 压缩超大图片
        var uploadFile = file;
        if (file.size > 10 * 1024 * 1024) {
          uploadFile = await compressImageIfNeeded(file, 10 * 1024 * 1024);
        }
        const sourceId = crypto.randomUUID();
        const sourcePath = `${userId}/sources/${sourceId}/${safeStorageName(file.name)}`;
        const sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, uploadFile, { upsert: false, contentType: uploadFile.type || file.type });
        if (sourceUpload.error) throw sourceUpload.error;
        uploadedPaths.push(sourcePath);
        const dimensions = await readImageDimensions(uploadFile);
        var title = files.length === 1 ? baseTitle : (baseTitle ? baseTitle + ' · ' + stripExtension(file.name) : '');
        const countryId = formData.get('country');
        const activityId = formData.get('activity');
        const categoryId = formData.get('category');
        const sourceRow = {
          id: sourceId,
          title,
          country_id: (countryId && countryId !== 'all') ? countryId : null,
          activity_id: (activityId && activityId !== 'all') ? activityId : null,
          category_id: (categoryId && categoryId !== 'all') ? categoryId : null,
          tags: libraryTagsForForm(formData, 'gallery'),
          visibility: formData.get('visibility') || 'all',
          source_path: sourcePath,
          source_filename: file.name,
          source_mime_type: uploadFile.type || file.type || '',
          source_size_bytes: uploadFile.size,
          source_ext: fileExt(file.name),
          uploaded_by: userId
        };
        const sourceInsert = await state.supabase.from('vf_source_files').insert([sourceRow]);
        if (sourceInsert.error) throw sourceInsert.error;
        insertedSourceIds.push(sourceId);
        // 生成缩略图并上传
        var thumbPath = null;
        try {
          var thumbBlob = await generateThumbnail(uploadFile, 400);
          if (thumbBlob) {
            thumbPath = `${userId}/sources/${sourceId}/_thumb.jpg`;
            var thumbUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(thumbPath, thumbBlob, { upsert: true, contentType: 'image/jpeg' });
            if (thumbUpload.error) { console.warn('Thumbnail upload failed:', thumbUpload.error); thumbPath = null; }
            else { uploadedPaths.push(thumbPath); }
          }
        } catch (e) { console.warn('Thumbnail generation failed:', e); }
        var previewId = crypto.randomUUID();
        const previewInsert = await state.supabase.from('vf_asset_previews').insert([{
          id: previewId,
          source_file_id: sourceId,
          preview_path: sourcePath,
          preview_filename: file.name,
          preview_mime_type: uploadFile.type || file.type,
          preview_size_bytes: uploadFile.size,
          width: dimensions.width,
          height: dimensions.height,
          sort_order: 10
        }]);
        if (previewInsert.error) throw previewInsert.error;
        void logAssetEvent('upload', { source: sourceRow, preview: { id: previewId, preview_filename: file.name, preview_path: sourcePath } });
        fileIndex++;
        if (onProgress) onProgress(pctEach * fileIndex);
      }
      if (onProgress) onProgress(95);
    } catch (error) {
      await cleanupGalleryUpload(insertedSourceIds, uploadedPaths);
      throw error;
    }
  }

  async function cleanupGalleryUpload(sourceIds, uploadedPaths) {
    try {
      if (sourceIds.length) await state.supabase.from('vf_source_files').delete().in('id', sourceIds);
      if (uploadedPaths.length) await state.supabase.storage.from(LIBRARY_BUCKET).remove(uploadedPaths);
    } catch (error) {
      console.warn('Gallery upload cleanup failed:', error);
    }
  }

  async function cleanupFailedLibraryUpload(sourceId, sourceInserted, uploadedPaths) {
    if (state.localPreview || !state.supabase) return;
    try {
      if (sourceInserted && sourceId) {
        await state.supabase.from('vf_source_files').delete().eq('id', sourceId);
      }
      if (uploadedPaths.length) {
        await state.supabase.storage.from(LIBRARY_BUCKET).remove(uploadedPaths);
      }
    } catch (error) {
      console.warn('Library upload cleanup failed:', error);
    }
  }

  function validateLibraryUpload(sourceFile, previewFiles) {
    if (!sourceFile || !sourceFile.size) throw new Error(state.lang === 'zh' ? '请选择源文件。' : 'Choose a source file.');
    if (!SOURCE_EXTENSIONS.includes(fileExt(sourceFile.name))) throw new Error(state.lang === 'zh' ? '源文件仅支持 PSD / PSB / AI / PDF / 压缩包。' : 'Source must be PSD / PSB / AI / PDF / archive.');
    if (previewFiles.length === 0) throw new Error(state.lang === 'zh' ? '至少上传一张预览图。' : 'Upload at least one preview image.');
    if (previewFiles.length > 5) throw new Error(state.lang === 'zh' ? '一个源文件最多绑定 5 张预览图。' : 'A source file can have at most 5 previews.');
    previewFiles.forEach(file => {
      if (!PREVIEW_MIME_TYPES.includes(file.type)) throw new Error(state.lang === 'zh' ? '预览图仅支持 JPG / PNG / WEBP。' : 'Preview must be JPG / PNG / WEBP.');
    });
  }

  function validateGalleryUpload(files) {
    if (!files.length) throw new Error(state.lang === 'zh' ? '请选择至少一张图库图片。' : 'Choose at least one gallery image.');
    files.forEach(file => {
      if (!PREVIEW_MIME_TYPES.includes(file.type) || !IMAGE_EXTENSIONS.includes(fileExt(file.name))) {
        throw new Error(state.lang === 'zh' ? '图库仅支持 JPG / PNG / WEBP。' : 'Gallery only supports JPG / PNG / WEBP.');
      }
    });
  }

  function openLibraryEditModal(sourceId) {
    closeLibraryDetailModal();
    const source = state.librarySources.find(item => item.id === sourceId);
    if (!source) return;
    const kind = libraryKindOfSource(source);
    // 先显示弹窗才能 query DOM
    document.getElementById('library-edit-modal').hidden = false;
    const form = document.getElementById('library-edit-form');
    if (!form) return;
    form.elements.id.value = source.id;
    form.elements.library_kind.value = kind;
    document.getElementById('library-edit-kind-value').value = kind;
    form.elements.title.value = source.title || '';
    // 根据 kind 显示/隐藏国家和活动
    var countryField = document.getElementById('edit-country-field');
    var activityField = document.getElementById('edit-activity-field');
    if (countryField) countryField.style.display = (kind === 'gallery' || kind === 'source') ? '' : 'none';
    if (activityField) activityField.style.display = (kind === 'source' || kind === 'template') ? '' : 'none';
    // 填充所在库 picker 并选中当前值
    populateEditKindPicker(kind);
    // 预设 tag 值到 state，渲染 tag pickers
    var tags = visibleLibraryTags(source);
    var tagMap = {};
    tags.forEach(function(t) { tagMap[t] = true; });
    var tagKeys = ['tag1','tag2','tag3','tag4'];
    var config = LIBRARY_TAGS[kind] || {};
    tagKeys.forEach(function(key) {
      var vals = config[key];
      // tag2 可能以 tag2ByTag1 形式存在
      if (!vals && key === 'tag2' && config.tag2ByTag1) {
        vals = [...new Set(Object.values(config.tag2ByTag1).flat())];
      }
      if (vals && Array.isArray(vals)) {
        var found = vals.find(function(v) { return tagMap[v]; });
        state.libraryFilters['upload' + key.charAt(0).toUpperCase() + key.slice(1)] = found || 'all';
      } else {
        state.libraryFilters['upload' + key.charAt(0).toUpperCase() + key.slice(1)] = 'all';
      }
    });
    document.getElementById('library-edit-tag-controls').innerHTML = renderUploadTagControls(kind);
    // 填充 country/activity picker 菜单
    populateEditMetaPickers();
    // 绑定编辑弹窗自己的 picker 事件（包括 tag controls 新生成的按钮）
    wireEditTagPickers();
    wireEditTagHover();
    // 预设 country/activity 选中值
    setTimeout(function() {
      if (source.country_id) {
        var cbtn = document.querySelector('#library-edit-modal [data-upload-tag-option="country"][data-upload-tag-value="' + source.country_id + '"]');
        if (cbtn) cbtn.click();
      }
      if (source.activity_id) {
        var abtn = document.querySelector('#library-edit-modal [data-upload-tag-option="activity"][data-upload-tag-value="' + source.activity_id + '"]');
        if (abtn) abtn.click();
      }
    }, 80);
    document.getElementById('library-edit-message').textContent = '';
  }

  function closeLibraryEditModal() {
    const modal = document.getElementById('library-edit-modal');
    if (modal) modal.hidden = true;
  }

  async function saveLibraryEdit(event) {
    event.preventDefault();
    const message = document.getElementById('library-edit-message');
    setMessage(message, state.lang === 'zh' ? '正在保存...' : 'Saving...');
    try {
      const form = new FormData(event.currentTarget);
      const id = form.get('id');
      const source = state.librarySources.find(item => item.id === id);
      const oldKind = source ? libraryKindOfSource(source) : 'source';
      const newKind = form.get('library_kind') || oldKind;
      // 从 picker hidden inputs 读取 tag 值
      const tags = libraryTagsForForm(form, newKind);
      var rawCountry = form.get('country');
      var rawActivity = form.get('activity');
      const update = {
        title: form.get('title').trim(),
        country_id: (rawCountry && rawCountry !== 'all') ? rawCountry : null,
        activity_id: (rawActivity && rawActivity !== 'all') ? rawActivity : null,
        tags: tags
      };
      const { error } = await state.supabase.from('vf_source_files').update(update).eq('id', id);
      if (error) throw error;
      setMessage(message, state.lang === 'zh' ? '已保存。' : 'Saved.', false, true);
      setTimeout(closeLibraryEditModal, 500);
      await reloadLibraryData();
      var editItem = state.libraryItems.find(function(li) { return li.source.id === id; });
      if (editItem) void logAssetEvent('edit', editItem);
    } catch (error) {
      setMessage(message, error.message, true);
    }
  }

  async function deleteAllLibraryData() {
    if (!state.supabase || !state.session) {
      alert(state.lang === 'zh' ? '请先登录。' : 'Please log in first.');
      return;
    }
    var totalSources = state.librarySources.length;
    var totalPreviews = state.libraryPreviews.length;
    if (totalSources === 0) {
      alert(state.lang === 'zh' ? '没有可删除的数据。' : 'No data to delete.');
      return;
    }
    var ok = window.confirm(state.lang === 'zh'
      ? '确定删除全部 ' + totalSources + ' 个素材及其 ' + totalPreviews + ' 张预览图吗？\n\n此操作不可撤销！'
      : 'Delete all ' + totalSources + ' sources and ' + totalPreviews + ' previews?\n\nThis cannot be undone!');
    if (!ok) return;
    alert('共 ' + totalSources + ' 个素材，开始删除...');
    try {
      // 按外键依赖顺序：收藏 → 预览 → 源文件 → 存储文件
      var uId = state.session.user.id;
      var step = '';
      // 1. 收藏
      step = '收藏';
      var fRes = await state.supabase.from('vf_asset_favorites').delete().eq('user_id', uId).select();
      if (fRes.error) throw new Error(step + ': ' + fRes.error.message);
      alert(step + ' 已删 ' + (fRes.data || []).length + ' 条');
      // 2. 预览
      step = '预览';
      var pvIds = state.libraryPreviews.map(function(p) { return p.id; });
      var pRes = await state.supabase.from('vf_asset_previews').delete().in('id', pvIds).select();
      if (pRes.error) throw new Error(step + ': ' + pRes.error.message);
      alert(step + ' 已删 ' + (pRes.data || []).length + '/' + pvIds.length + ' 条');
      // 3. 源文件
      step = '源文件';
      var srcIds = state.librarySources.map(function(s) { return s.id; });
      var sRes = await state.supabase.from('vf_source_files').delete().in('id', srcIds).select();
      if (sRes.error) throw new Error(step + ': ' + sRes.error.message);
      alert(step + ' 已删 ' + (sRes.data || []).length + '/' + srcIds.length + ' 条');
      // 4. 存储文件
      step = '存储';
      var filePaths = [];
      state.librarySources.forEach(function(s) {
        if (s.source_path) filePaths.push(s.source_path);
        if (s.source_path) filePaths.push(s.source_path.replace(/\/[^/]+$/, '/_thumb.jpg'));
      });
      var unique = Array.from(new Set(filePaths.filter(Boolean)));
      if (unique.length) {
        var rRes = await state.supabase.storage.from(LIBRARY_BUCKET).remove(unique);
        if (rRes.error) alert(step + ' 警告: ' + rRes.error.message);
        else alert(step + ' 已请求删除 ' + unique.length + ' 个文件');
      }
      alert('完成！刷新页面看看。');
      state.libraryDataLoaded = false;
      state.libraryPreviewUrls = {};
      state.librarySources = [];
      state.libraryPreviews = [];
      window.location.reload();
    } catch (error) {
      alert('删除失败 [' + (step || '?') + ']: ' + (error.message || error));
    }
  }
  window.deleteAllLibraryData = deleteAllLibraryData;

  async function deleteLibrarySource(sourceId) {
    const source = state.librarySources.find(item => item.id === sourceId);
    if (!source) return;
    const relatedPreviews = state.libraryPreviews.filter(item => item.source_file_id === sourceId);
    const ok = window.confirm(state.lang === 'zh'
      ? `确定删除「${source.title}」吗？源文件和 ${relatedPreviews.length} 张预览图会一起删除。`
      : `Delete "${source.title}" and ${relatedPreviews.length} previews?`);
    if (!ok) return;
    const paths = [source.source_path, ...relatedPreviews.map(item => item.preview_path)].filter(Boolean);
    if (paths.length) {
      const remove = await state.supabase.storage.from(LIBRARY_BUCKET).remove(paths);
      if (remove.error) {
        alert(remove.error.message);
        return;
      }
    }
    const { error } = await state.supabase.from('vf_source_files').delete().eq('id', sourceId);
    if (error) {
      alert(error.message);
      return;
    }
    await reloadLibraryData();
    // 通知静态DIY iframe 同步删除
    notifyStaticIframe({ type: 'vf:template-deleted', sourceId: sourceId });
    void logAssetEvent('delete', item);
  }

  function notifyStaticIframe(msg) {
    try {
      var frame = state.toolFrames['static'];
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage(msg, location.origin);
      }
    } catch(e) {}
  }

  async function toggleLibraryFavorite(item) {
    const uid = state.session.user.id;
    const pid = item.preview.id;
    if (state.libraryFavorites.has(pid)) {
      const { error } = await state.supabase.from('vf_asset_favorites').delete().eq('user_id', uid).eq('preview_id', pid);
      if (error) { alert(error.message); return; }
    } else {
      const { error } = await state.supabase.from('vf_asset_favorites').upsert([{ user_id: uid, preview_id: pid }], { onConflict: 'user_id,preview_id' });
      if (error) { alert(error.message); return; }
      void logAssetEvent('favorite', item);
    }
    await loadLibraryFavorites();
    renderLibraryGrid();
  }

  async function downloadLibraryFile(item, kind) {
    if (kind === 'source' && !canDownloadSource()) return;
    var filename = kind === 'source' ? item.source.source_filename : item.preview.preview_filename || 'preview.svg';
    // 即时反馈：轻 toast
    showDownloadToast(filename);
    if (state.localPreview) {
      var recoveredUrl = kind === 'source' ? item.source.source_public_url : item.url;
      if (!recoveredUrl) {
        alert(state.lang === 'zh' ? '这个恢复记录缺少对应文件，暂时不能下载。' : 'This recovered record is missing its file.');
        return;
      }
      var blob = await fetch(new URL(recoveredUrl, location.href).toString()).then(function(r) { return r.blob(); });
      triggerBlobDownload(blob, filename);
      return;
    }
    // 优先走已缓存的签名 URL（预览图直接秒下）
    if (kind !== 'source' && item.url) {
      try {
        var directBlob = await fetch(item.url).then(function(r) {
          if (!r.ok) throw new Error('expired');
          return r.blob();
        });
        triggerBlobDownload(directBlob, filename);
        await logAssetEvent('download_preview', item);
        return;
      } catch(e) { /* 签名过期，走 Supabase SDK 兜底 */ }
    }
    // Supabase SDK 兜底
    var path = kind === 'source' ? item.source.source_path : item.preview.preview_path;
    var { data, error } = await state.supabase.storage.from(LIBRARY_BUCKET).download(path);
    if (error) { alert(error.message); return; }
    triggerBlobDownload(data, filename);
    await logAssetEvent(kind === 'source' ? 'download_source' : 'download_preview', item);
  }

  function showDownloadToast(filename) {
    var toast = document.getElementById('download-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'download-toast';
      toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:99999;background:#0f172a;color:#fff;padding:8px 18px;border-radius:10px;font-size:13px;pointer-events:none;opacity:0;transition:opacity 0.2s ease;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
      document.body.appendChild(toast);
    }
    toast.textContent = (state.lang === 'zh' ? '下载中: ' : 'Downloading: ') + filename;
    toast.style.opacity = '1';
    toast.style.transition = 'none';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() { toast.style.transition = 'opacity 0.4s ease'; toast.style.opacity = '0'; }, 2000);
  }

  async function useLibraryAsset(item, tool) {
    const kind = libraryKindOfSource(item.source);
    if (kind === 'source') {
      alert(state.lang === 'zh' ? '案例库素材用于下载归档，暂不直接带入编辑器。' : 'Case library assets are for download/archive and cannot be imported directly yet.');
      return;
    }
    if (kind === 'template') {
      return openLibraryTemplate(item);
    }
    if (!item.url) {
      await signLibraryPreviewUrls([item.preview.preview_path]);
      item.url = state.libraryPreviewUrls[item.preview.preview_path] || '';
    }
    if (!item.url) {
      alert(state.lang === 'zh' ? '预览图链接还没准备好，请稍后再试。' : 'The preview link is not ready. Try again shortly.');
      return;
    }
    const target = tool === 'dynamic' ? 'dynamic' : 'static';
    localStorage.setItem('vf_pending_library_asset', JSON.stringify({
      targetTool: target,
      previewId: item.preview.id,
      sourceFileId: item.source.id,
      title: item.source.title,
      filename: item.preview.preview_filename,
      url: item.url,
      storedAt: new Date().toISOString()
    }));
    await logAssetEvent(target === 'dynamic' ? 'use_dynamic' : 'use_static', item);
    location.hash = target;
    navigate(target);
  }

  async function openLibraryTemplate(item) {
    if (state.localPreview || !state.supabase) {
      alert(state.lang === 'zh' ? '本地预览不能打开云端模板。' : 'Local preview cannot open cloud templates.');
      return;
    }
    try {
      const snapshot = await loadLibraryTemplateSnapshot(item);
      location.hash = 'static';
      navigate('static');
      if (snapshot.schema === 'vf-project-snapshot/v1') {
        validateProjectSnapshot(snapshot, 'static');
        await waitForToolImporter();
        const result = await state.activeFrame.contentWindow.VF_IMPORT_PROJECT(snapshot);
        if (!result?.success) throw new Error(result?.message || (state.lang === 'zh' ? '模板打开失败。' : 'Failed to open template.'));
      } else {
        // 版式/套组/标签组/Logo → 发送数据到 iframe 应用
        await waitForToolImporter();
        notifyStaticIframe({ type: 'vf:apply-template', data: snapshot, sourceId: item.source.id });
      }
      await logAssetEvent('use_static', item);
    } catch (error) {
      alert(error.message);
    }
  }

  var _templateSnapshotCache = {};
  async function loadLibraryTemplateSnapshot(item) {
    var path = item.source.source_path;
    // 如果刚上传的，优先用缓存
    if (_templateSnapshotCache[path]) return _templateSnapshotCache[path];
    // 重试最多 3 次，处理 Storage 复制延迟
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        var { data, error } = await state.supabase.storage.from(LIBRARY_BUCKET).download(path);
        if (error) throw error;
        var json = JSON.parse(await data.text());
        _templateSnapshotCache[path] = json;
        return json;
      } catch (e) {
        if (attempt < 2) await new Promise(function(r) { setTimeout(r, 800); });
        else throw e;
      }
    }
  }

  async function logAssetEvent(eventType, item, extraMeta) {
    if (state.localPreview || !state.supabase) return;
    try {
      var row = {
        actor_id: state.session.user.id,
        actor_role: currentRole(),
        event_type: eventType,
        meta: {}
      };
      if (item && item.source) {
        row.source_file_id = item.source.id;
        row.preview_id = item.preview ? item.preview.id : null;
        row.meta.title = item.source.title;
        row.meta.filename = eventType === 'download_source'
          ? item.source.source_filename
          : (item.preview ? item.preview.preview_filename : (item.source.source_filename || ''));
      }
      if (extraMeta) Object.assign(row.meta, extraMeta);
      var insertResult = await state.supabase.from('vf_asset_events').insert([row]);
      if (insertResult.error) console.warn('Event insert error:', insertResult.error.message);
    } catch (error) {
      console.warn('Asset event log failed:', error);
    }
  }

  function libraryOptions(type) {
    return state.libraryOptions.filter(item => item.option_type === type);
  }

  function libraryKindOfSource(source) {
    const tags = source?.tags || [];
    if (tags.includes(LIBRARY_KIND_MARKERS.gallery)) return 'gallery';
    if (tags.includes(LIBRARY_KIND_MARKERS.template)) return 'template';
    if (tags.includes(LIBRARY_KIND_MARKERS.source)) return 'source';
    const ext = fileExt(source?.source_filename || source?.source_ext || '');
    if (IMAGE_EXTENSIONS.includes(ext)) return 'gallery';
    if (TEMPLATE_EXTENSIONS.includes(ext)) return 'template';
    return 'source';
  }

  function libraryKindLabel(kind) {
    const item = LIBRARY_KIND_TABS.find(tab => tab.id === kind);
    return item ? (state.lang === 'zh' ? item.zh : item.en) : kind;
  }

  function visibleLibraryTags(source) {
    return (source?.tags || [])
      .filter(tag => !String(tag).startsWith('vf:'))
      .filter(Boolean);
  }

  function selectedLibraryTagValues() {
    return ['tag1', 'tag2', 'tag3', 'tag4']
      .map(key => state.libraryFilters[key])
      .filter(value => value && value !== 'all');
  }

  function countLibraryKinds() {
    return state.librarySources.reduce((counts, source) => {
      const kind = libraryKindOfSource(source);
      counts[kind] = (counts[kind] || 0) + 1;
      return counts;
    }, { gallery: 0, source: 0, template: 0 });
  }

  
  async function uploadTemplateAsset(formData) {
    const templateFile = formData.get('template_file');
    if (!templateFile || !templateFile.size) throw new Error(state.lang === 'zh' ? '请选择模板文件。' : 'Choose a template file.');
    const title = formData.get('title').trim();
    const sourceId = crypto.randomUUID();
    const userId = state.session.user.id;
    const sourcePath = `${userId}/templates/${sourceId}/${safeStorageName(templateFile.name)}`;
    const upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, templateFile, { upsert: false, contentType: templateFile.type || 'application/json' });
    if (upload.error) throw upload.error;
    const tags = libraryTagsForForm(formData, 'template');
    tags.push('vf:kind:template');
    const { error } = await state.supabase.from('vf_source_files').insert([{
      id: sourceId, title, tags,
      source_path: sourcePath, source_filename: templateFile.name, source_mime_type: templateFile.type || 'application/json',
      source_size_bytes: templateFile.size, source_ext: 'json', uploaded_by: userId,
      visibility: formData.get('visibility') || 'all'
    }]);
    if (error) throw error;
    void logAssetEvent('upload', { source: { id: sourceId, title: title, source_filename: templateFile.name } });
  }

function libraryTagsForForm(formData, kind) {
    const tags = [];
    ['tag1', 'tag2', 'tag3', 'tag4'].forEach(key => {
      const raw = String(formData.get(key) || '').trim();
      if (raw && raw !== 'all') {
        raw.split(',').forEach(v => { const t = v.trim(); if (t) tags.push(t); });
      }
    });
    return normalizeLibraryTags(kind, tags);
  }

  function normalizeLibraryTags(kind, tags) {
    const marker = LIBRARY_KIND_MARKERS[kind] || LIBRARY_KIND_MARKERS.source;
    const cleaned = tags
      .map(tag => String(tag || '').trim())
      .filter(Boolean)
      .filter(tag => !String(tag).startsWith('vf:'));
    return [marker, ...Array.from(new Set(cleaned))].slice(0, 18);
  }

  function optionName(option) {
    if (!option) return '-';
    return state.lang === 'zh' ? (option.name_zh || option.name_en) : option.name_en;
  }

  function optionNameById(id) {
    return optionName(state.libraryOptions.find(item => item.id === id));
  }

  function libCountryLabel(source) {
    return optionNameById(source.country_id);
  }

  function libActivityLabel(source) {
    return optionNameById(source.activity_id);
  }

  function libraryItemByPreviewId(id) {
    return state.libraryItems.find(item => item.preview.id === id);
  }

  function canUploadAssets() {
    return !state.localPreview && !!state.session;
  }

  function canDownloadSource() {
    return !!state.session;
  }

  function canManageSource(_source) {
    return !state.localPreview && !!state.session;
  }

  function parseTags(value) {
    return String(value || '')
      .split(/[,，\n]/)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function fileExt(name) {
    const clean = String(name || '').split('?')[0];
    return clean.includes('.') ? clean.split('.').pop().toLowerCase() : '';
  }

  function stripExtension(name) {
    return String(name || '').replace(/\.[^/.]+$/, '');
  }

  function safeStorageName(name) {
    const ext = fileExt(name);
    const base = stripExtension(name)
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'file';
    return `${base}-${Date.now()}${ext ? `.${ext}` : ''}`;
  }

  function readImageDimensions(file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: null, height: null });
      };
      img.src = url;
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [header, body] = String(dataUrl || '').split(',');
    const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
    var bytes;
    if (header.includes(';base64')) {
      const binary = atob(body || '');
      bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    } else {
      // URI 编码的数据 URL（如 SVG），用 TextEncoder
      const decoded = decodeURIComponent(body || '');
      bytes = new TextEncoder().encode(decoded);
    }
    return new Blob([bytes], { type: mime });
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderTool(type) {
    const legacyRole = currentRole() === 'operator' ? 'viewer' : currentRole();
    const map = {
      library: {
        src: `./tools/library/index.html?embedded=1&role=${encodeURIComponent(legacyRole)}&v=${TOOL_UI_VERSION}`
      },
      static: {
        src: `./tools/static/frontend.html?embedded=1&v=${TOOL_UI_VERSION}`
      },
      dynamic: {
        src: `./tools/dynamic/animator.html?embedded=1&v=${TOOL_UI_VERSION}`
      }
    };
    const item = map[type];
    els.content.innerHTML = `
      <div class="tool-layout">
        <div id="tool-frame-mount" class="tool-frame-mount"></div>
      </div>
    `;
    const mount = document.getElementById('tool-frame-mount');
    let frame = state.toolFrames[type];
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = `tool-frame-${type}`;
      frame.className = 'tool-frame';
      frame.src = item.src;
      frame.title = type;
      frame.dataset.toolFrame = type;
      state.toolFrames[type] = frame;
    }
    mount.appendChild(frame);
    state.activeFrame = frame;
  }

  async function renderProjects() {
    parkActiveToolFrame();
    els.content.innerHTML = `
      <div class="panel-page">
        <div class="panel card">
          <h3>${t('projects')}</h3>
          <p>${state.lang === 'zh' ? '个人项目保存在 Supabase 云端。管理员可通过数据库查看全部项目。' : 'Personal projects are saved to Supabase cloud. Admins can inspect all projects from the database.'}</p>
        </div>
        <section class="panel">
          <table class="table">
            <thead><tr><th>${t('projectName')}</th><th>Type</th><th>Updated</th><th>Status</th></tr></thead>
            <tbody id="projects-table"><tr><td colspan="4">${state.lang === 'zh' ? '正在读取...' : 'Loading...'}</td></tr></tbody>
          </table>
        </section>
      </div>
    `;
    await loadProjects();
  }

  async function renderStatus() {
    parkActiveToolFrame();
    els.content.innerHTML = `
      <div class="panel-page">
        <section class="panel card">
          <h3>${t('systemCheck')}</h3>
          <p>${state.lang === 'zh' ? '这个页面会把上线前的关键状态翻译成能直接判断的结果。绿色代表可以继续，红色代表需要我补配置或处理。' : 'This page translates launch readiness into direct checks. Green means ready; red means I need to finish setup.'}</p>
        </section>
        <section class="panel">
          <table class="table">
            <thead><tr><th>${t('checkItem')}</th><th>${t('checkResult')}</th><th>${t('checkDetail')}</th></tr></thead>
            <tbody id="status-table"><tr><td colspan="3">${state.lang === 'zh' ? '正在检查...' : 'Checking...'}</td></tr></tbody>
          </table>
        </section>
      </div>
    `;
    const checks = await runSystemChecks();
    const table = document.getElementById('status-table');
    table.innerHTML = checks.map(item => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td><span class="badge ${item.ok ? 'ok' : item.local ? 'warn' : 'bad'}">${item.local ? t('localOnly') : item.ok ? t('ready') : t('notReady')}</span></td>
        <td>${escapeHtml(item.detail)}</td>
      </tr>
    `).join('');
  }

  async function runSystemChecks() {
    const checks = [];
    checks.push({
      name: state.lang === 'zh' ? 'Supabase 前端配置' : 'Supabase frontend config',
      ok: !!(config.supabaseUrl && config.supabaseAnonKey && state.supabase),
      detail: config.supabaseUrl ? config.supabaseUrl : (state.lang === 'zh' ? '缺少 Supabase 地址或公开 key。' : 'Missing Supabase URL or anon key.')
    });
    checks.push({
      name: state.lang === 'zh' ? '当前登录状态' : 'Current login',
      ok: !!state.session,
      local: state.localPreview,
      detail: state.localPreview
        ? (state.lang === 'zh' ? '当前是本地预览角色，适合检查界面。' : 'Using local preview role for UI checks.')
        : (state.profile ? `${state.profile.display_name || state.profile.email} · ${roleLabel(state.profile.role)}` : (state.lang === 'zh' ? '尚未登录。' : 'Not signed in.'))
    });

    if (state.localPreview || !state.supabase) {
      checks.push({
        name: state.lang === 'zh' ? '云端数据库表' : 'Cloud database tables',
        ok: false,
        local: true,
        detail: state.lang === 'zh' ? '本地预览不检查云端表。真实登录后会自动检查。' : 'Local preview does not check cloud tables.'
      });
    } else {
      checks.push(await checkTable('vf_profiles', state.lang === 'zh' ? '账号资料表' : 'Profiles table'));
      checks.push(await checkTable('vf_categories', state.lang === 'zh' ? '分类权限表' : 'Categories table'));
      checks.push(await checkTable('vf_projects', state.lang === 'zh' ? '项目保存表' : 'Projects table'));
      checks.push(await checkTable('vf_library_options', state.lang === 'zh' ? 'V2 素材分类选项' : 'V2 library options'));
      checks.push(await checkTable('vf_source_files', state.lang === 'zh' ? 'V2 源文件表' : 'V2 source files'));
      checks.push(await checkTable('vf_asset_previews', state.lang === 'zh' ? 'V2 预览图表' : 'V2 previews'));
      checks.push(await checkTable('vf_asset_events', state.lang === 'zh' ? 'V2 下载/使用日志' : 'V2 events'));
    }

    checks.push(await checkApiHealth());
    checks.push(await checkLegacyTool('tools/library/index.html', state.lang === 'zh' ? '素材库入口' : 'Library entry'));
    checks.push(await checkLegacyTool('tools/static/frontend.html', state.lang === 'zh' ? '静态 DIY 入口' : 'Static DIY entry'));
    checks.push(await checkLegacyTool('tools/dynamic/animator.html', state.lang === 'zh' ? '动态 DIY 入口' : 'Dynamic DIY entry'));
    return checks;
  }

  async function checkTable(tableName, label) {
    try {
      const { error } = await state.supabase.from(tableName).select('id').limit(1);
      if (error) throw error;
      return {
        name: label,
        ok: true,
        detail: state.lang === 'zh' ? '能正常读取，说明 SQL 基础结构已存在。' : 'Readable, so the SQL foundation exists.'
      };
    } catch (error) {
      return {
        name: label,
        ok: false,
        detail: error.message || (state.lang === 'zh' ? '读取失败。' : 'Read failed.')
      };
    }
  }

  async function checkApiHealth() {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const missing = (data.missingEnv || []).join(', ');
      return {
        name: state.lang === 'zh' ? '上线 API 配置' : 'Deploy API config',
        ok: data.ready,
        detail: data.ready
          ? (state.lang === 'zh' ? '创建账号 API 的环境变量已配置。' : 'Account API env vars are configured.')
          : `${state.lang === 'zh' ? '缺少' : 'Missing'}: ${missing || 'unknown'}`
      };
    } catch (_error) {
      return {
        name: state.lang === 'zh' ? '上线 API 配置' : 'Deploy API config',
        ok: false,
        local: true,
        detail: state.lang === 'zh' ? '本地静态预览不运行 Serverless API；部署到 Vercel 后会检查。' : 'Local static preview does not run Serverless API; Vercel will.'
      };
    }
  }

  async function checkLegacyTool(path, label) {
    try {
      const response = await fetch(`/${path}`, { method: 'GET' });
      return {
        name: label,
        ok: response.ok,
        detail: response.ok
          ? (state.lang === 'zh' ? '入口文件存在。' : 'Entry file exists.')
          : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        name: label,
        ok: false,
        detail: error.message
      };
    }
  }

  async function loadProjects() {
    const table = document.getElementById('projects-table');
    if (!table) return;
    if (state.localPreview || !state.supabase) {
      const localItems = JSON.parse(localStorage.getItem('vf_local_projects') || '[]');
      if (localItems.length === 0) {
        table.innerHTML = `<tr><td colspan="4">${state.lang === 'zh' ? '本地预览模式还没有项目记录。' : 'No local preview projects yet.'}</td></tr>`;
        return;
      }
      table.innerHTML = localItems.map(project => `
        <tr>
          <td>${escapeHtml(project.title)}</td>
          <td><span class="badge">${escapeHtml(project.project_type)}</span></td>
          <td>${formatDate(project.updated_at)}</td>
          <td>${project.snapshot_meta?.exportError ? escapeHtml(project.snapshot_meta.exportError) : 'Local'}</td>
        </tr>
      `).join('');
      return;
    }
    const { data, error } = await state.supabase
      .from('vf_projects')
      .select('id,title,project_type,updated_at,snapshot_meta')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) {
      table.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
      return;
    }
    if (!data || data.length === 0) {
      table.innerHTML = `<tr><td colspan="4">${state.lang === 'zh' ? '还没有项目。进入 DIY 工具后点击“保存项目”。' : 'No projects yet. Open a DIY tool and click Save Project.'}</td></tr>`;
      return;
    }
    table.innerHTML = data.map(project => `
      <tr>
        <td>${escapeHtml(project.title)}</td>
        <td><span class="badge">${escapeHtml(project.project_type)}</span></td>
        <td>${formatDate(project.updated_at)}</td>
        <td>${project.snapshot_meta?.exportError ? escapeHtml(project.snapshot_meta.exportError) : 'OK'}</td>
      </tr>
    `).join('');
  }

  // ── 数据看板：数据查询辅助 ──
  async function fetchAnalyticsData(rangeDays) {
    if (!state.supabase) return null;
    var startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - rangeDays + 1);
    var startISO = startDate.toISOString();

    try {
      // 并行查询：事件数据 + 源文件数据
      var [eventsRes, sourcesRes] = await Promise.all([
        state.supabase.from('vf_asset_events')
          .select('id,actor_id,actor_role,event_type,source_file_id,preview_id,meta,created_at')
          .gte('created_at', startISO)
          .order('created_at', { ascending: false })
          .limit(5000),
        state.supabase.from('vf_source_files')
          .select('id,title,source_filename,source_ext,tags,source_path,country_id,activity_id,created_at')
          .order('created_at', { ascending: true })
      ]);

      var events = eventsRes.data || [];
      var sources = sourcesRes.data || [];
      if (eventsRes.error) console.warn('Analytics events query error:', eventsRes.error);
      if (sourcesRes.error) console.warn('Analytics sources query error:', sourcesRes.error);

      // 通过 tags 判断素材类型（复用 libraryKindOfSource 逻辑）
      function sourceKind(s) {
        var tags = s.tags || [];
        if (tags.indexOf('vf:kind:gallery') !== -1) return 'gallery';
        if (tags.indexOf('vf:kind:template') !== -1) return 'template';
        if (tags.indexOf('vf:kind:source') !== -1) return 'source';
        var ext = (s.source_ext || '').toLowerCase();
        var imgExts = ['jpg','jpeg','png','gif','webp','bmp','svg','tiff','psd','ai','eps','heic','heif'];
        if (imgExts.indexOf(ext) !== -1) return 'gallery';
        if (ext === 'json') return 'template';
        return 'source';
      }

      // 计算素材累计增长（按日期 + 类型）
      var sourceCountByDate = {};
      var sourceTypes = { source: 0, gallery: 0, template: 0 };
      sources.forEach(function(s) {
        var kind = sourceKind(s);
        if (!sourceCountByDate[kind]) sourceCountByDate[kind] = {};
        var d = s.created_at ? s.created_at.split('T')[0] : '';
        if (d) {
          sourceCountByDate[kind][d] = (sourceCountByDate[kind][d] || 0) + 1;
          sourceCountByDate.all = sourceCountByDate.all || {};
          sourceCountByDate.all[d] = (sourceCountByDate.all[d] || 0) + 1;
        }
        sourceTypes[kind] = (sourceTypes[kind] || 0) + 1;
      });

      // 按日期排序并计算累计值
      var allDates = Object.keys(sourceCountByDate.all || {}).sort();
      var assetGrowth = { labels: allDates, total: [], source: [], gallery: [], template: [] };
      var cumTotal = 0, cumSource = 0, cumGallery = 0, cumTemplate = 0;
      // 计算起始值（range 之外的累计）
      var rangeStartStr = startDate.toISOString().split('T')[0];
      allDates.forEach(function(d) {
        cumTotal += (sourceCountByDate.all && sourceCountByDate.all[d]) || 0;
        cumSource += (sourceCountByDate.source && sourceCountByDate.source[d]) || 0;
        cumGallery += (sourceCountByDate.gallery && sourceCountByDate.gallery[d]) || 0;
        cumTemplate += (sourceCountByDate.template && sourceCountByDate.template[d]) || 0;
        if (d >= rangeStartStr) {
          assetGrowth.total.push(cumTotal);
          assetGrowth.source.push(cumSource);
          assetGrowth.gallery.push(cumGallery);
          assetGrowth.template.push(cumTemplate);
        }
      });
      // labels 也只保留 range 内的
      assetGrowth.labels = allDates.filter(function(d) { return d >= rangeStartStr; });

      return { events: events, sources: sources, assetGrowth: assetGrowth, sourceTypes: sourceTypes, startISO: startISO };
    } catch (e) {
      console.warn('Analytics data fetch failed:', e);
      return null;
    }
  }

  // ── 数据看板：页面渲染 ──
  async function renderAnalyticsPage() {
    parkActiveToolFrame();
    var zh = state.lang === 'zh';

    // ===== HTML + Scoped CSS =====
    els.content.innerHTML = '\
      <div class="panel-page" id="analytics-page">\
        <style>\
          #analytics-page { --ana-primary: #0d9488; --ana-primary-light: #ccfbf1; --ana-bg-card: #ffffff; --ana-text: #1e293b; --ana-muted: #64748b; --ana-label: #94a3b8; --ana-border: #e2e8f0; --ana-shadow: 0 4px 20px rgba(0,0,0,0.04); --ana-radius: 20px; --ana-radius-sm: 12px; }\
          #analytics-page { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: transparent; color: var(--ana-text); }\
          #analytics-page .ana-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }\
          #analytics-page .ana-panel-title { font-size: 22px; font-weight: 700; color: var(--ana-text); }\
          #analytics-page .ana-filter-group { display: flex; gap: 6px; background: #e8eaed; padding: 3px; border-radius: 100px; }\
          #analytics-page .ana-filter-btn { padding: 7px 18px; border: none; border-radius: 100px; font-size: 13px; font-weight: 500; color: var(--ana-muted); background: transparent; cursor: pointer; transition: all 0.2s; font-family: inherit; }\
          #analytics-page .ana-filter-btn:hover { color: var(--ana-text); }\
          #analytics-page .ana-filter-btn.active { background: #fff; color: var(--ana-text); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }\
          #analytics-page .ana-card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 22px; }\
          #analytics-page .ana-card { background: var(--ana-bg-card); border-radius: var(--ana-radius); padding: 22px 24px; box-shadow: var(--ana-shadow); border: 1px solid var(--ana-border); }\
          #analytics-page .ana-card-icon { width: 40px; height: 40px; border-radius: var(--ana-radius-sm); display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }\
          #analytics-page .ana-card-icon.teal { background: var(--ana-primary-light); color: var(--ana-primary); }\
          #analytics-page .ana-card-icon.blue { background: #dbeafe; color: #2563eb; }\
          #analytics-page .ana-card-icon.violet { background: #ede9fe; color: #7c3aed; }\
          #analytics-page .ana-card-icon.rose { background: #ffe4e6; color: #e11d48; }\
          #analytics-page .ana-card-icon svg { width: 20px; height: 20px; }\
          #analytics-page .ana-card-value { font-size: 30px; font-weight: 700; color: var(--ana-text); line-height: 1.2; margin-bottom: 4px; }\
          #analytics-page .ana-card-label { font-size: 13px; color: var(--ana-muted); font-weight: 500; }\
          #analytics-page .ana-charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 22px; }\
          #analytics-page .ana-chart-card { background: var(--ana-bg-card); border-radius: var(--ana-radius); padding: 22px 24px; box-shadow: var(--ana-shadow); border: 1px solid var(--ana-border); }\
          #analytics-page .ana-chart-card.full { margin-bottom: 22px; }\
          #analytics-page .ana-chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }\
          #analytics-page .ana-chart-title { font-size: 15px; font-weight: 600; color: var(--ana-text); }\
          #analytics-page .ana-chart-sub { font-size: 18px; font-weight: 700; color: var(--ana-text); }\
          #analytics-page .ana-chart-sub-label { font-size: 12px; color: var(--ana-muted); margin-left: 4px; }\
          #analytics-page .ana-chart-sub-sep { font-size: 14px; color: var(--ana-border); margin: 0 8px; }\
          #analytics-page .ana-chart-wrap { position: relative; height: 250px; }\
          #analytics-page .ana-chart-wrap-sm { position: relative; height: 200px; }\
          #analytics-page .ana-table-card { background: var(--ana-bg-card); border-radius: var(--ana-radius); padding: 22px 24px; box-shadow: var(--ana-shadow); border: 1px solid var(--ana-border); margin-bottom: 22px; }\
          #analytics-page .ana-table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }\
          #analytics-page .ana-table-title { font-size: 15px; font-weight: 600; }\
          #analytics-page .ana-cat-tabs { display: flex; gap: 3px; background: #f1f5f9; padding: 3px; border-radius: 100px; }\
          #analytics-page .ana-cat-tab { padding: 5px 14px; border: none; border-radius: 100px; font-size: 12px; font-weight: 500; color: var(--ana-muted); background: transparent; cursor: pointer; font-family: inherit; }\
          #analytics-page .ana-cat-tab.active { background: #fff; color: var(--ana-text); font-weight: 600; }\
          #analytics-page .ana-table { width: 100%; border-collapse: collapse; }\
          #analytics-page .ana-table th { text-align: left; font-size: 11px; font-weight: 600; color: var(--ana-label); text-transform: uppercase; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }\
          #analytics-page .ana-table td { padding: 12px; font-size: 13px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }\
          #analytics-page .ana-table tr:last-child td { border-bottom: none; }\
          #analytics-page .ana-rank { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; font-size: 12px; font-weight: 700; background: #f1f5f9; color: var(--ana-muted); }\
          #analytics-page .ana-rank.top { background: var(--ana-primary-light); color: var(--ana-primary); }\
          #analytics-page .ana-thumb-cell { display: flex; align-items: center; gap: 10px; }\
          #analytics-page .ana-thumb-img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; background: #f1f5f9; }\
          #analytics-page .ana-thumb-name { font-size: 13px; font-weight: 500; }\
          #analytics-page .ana-thumb-file { font-size: 11px; color: var(--ana-muted); }\
          #analytics-page .ana-stat { font-size: 13px; font-weight: 600; color: var(--ana-text); }\
          #analytics-page .ana-view-more { text-align: center; padding: 10px 0 2px; }\
          #analytics-page .ana-view-btn { background: transparent; border: none; color: var(--ana-primary); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 14px; border-radius: 8px; font-family: inherit; }\
          #analytics-page .ana-view-btn:hover { background: rgba(13,148,136,0.06); }\
          #analytics-page .ana-activity-card { background: var(--ana-bg-card); border-radius: var(--ana-radius); padding: 22px 24px; box-shadow: var(--ana-shadow); border: 1px solid var(--ana-border); margin-bottom: 22px; }\
          #analytics-page .ana-activity-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: scroll; padding-right: 4px; }\
          #analytics-page .ana-activity-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; background: #f8fafc; }\
          #analytics-page .ana-activity-avatar { width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; }\
          #analytics-page .ana-activity-body { flex: 1; min-width: 0; }\
          #analytics-page .ana-activity-text { font-size: 13px; line-height: 1.4; }\
          #analytics-page .ana-activity-text .u { font-weight: 600; }\
          #analytics-page .ana-activity-text .a { font-weight: 500; }\
          #analytics-page .ana-activity-text .m { font-weight: 500; color: var(--ana-primary); }\
          #analytics-page .ana-activity-time { font-size: 11px; color: var(--ana-muted); white-space: nowrap; flex-shrink: 0; }\
          #analytics-page .ana-controls { display: flex; align-items: center; justify-content: space-between; background: var(--ana-bg-card); border-radius: var(--ana-radius); padding: 16px 24px; box-shadow: var(--ana-shadow); border: 1px solid var(--ana-border); }\
          #analytics-page .ana-controls-left { display: flex; align-items: center; gap: 14px; }\
          #analytics-page .ana-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }\
          #analytics-page .ana-toggle-sw { width: 38px; height: 20px; background: var(--ana-border); border-radius: 10px; position: relative; transition: background 0.25s; }\
          #analytics-page .ana-toggle-sw::after { content: ""; position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: transform 0.25s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }\
          #analytics-page .ana-toggle.active .ana-toggle-sw { background: var(--ana-primary); }\
          #analytics-page .ana-toggle.active .ana-toggle-sw::after { transform: translateX(18px); }\
          #analytics-page .ana-toggle-label { font-size: 13px; font-weight: 500; }\
          #analytics-page .ana-btn-clear { font-size: 12px; font-weight: 500; color: #ef4444; background: transparent; border: none; cursor: pointer; padding: 5px 10px; border-radius: 6px; font-family: inherit; }\
          #analytics-page .ana-btn-clear:hover { background: #fef2f2; }\
          #analytics-page .ana-empty { padding: 40px 0; text-align: center; color: var(--ana-muted); font-size: 14px; }\
          #analytics-page .ana-scroll { overflow-y: scroll; }\
          @media (max-width: 980px) {\
            #analytics-page .ana-card-grid { grid-template-columns: 1fr; }\
            #analytics-page .ana-charts-row { grid-template-columns: 1fr; }\
          }\
        </style>\
        <div>\
          <div class="ana-panel-header">\
            <div class="ana-filter-group" id="ana-range-btns">\
              <button class="ana-filter-btn" data-range="1">' + (zh ? '今日' : 'Today') + '</button>\
              <button class="ana-filter-btn active" data-range="7">' + (zh ? '近7天' : '7 Days') + '</button>\
              <button class="ana-filter-btn" data-range="30">' + (zh ? '近30天' : '30 Days') + '</button>\
              <button class="ana-filter-btn" data-range="90">' + (zh ? '本季度' : 'Quarter') + '</button>\
            </div>\
          </div>\
          <div class="ana-card-grid">\
            <div class="ana-card"><div class="ana-card-icon teal"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/></svg></div><div class="ana-card-value" id="ana-total-ops">-</div><div class="ana-card-label">' + (zh ? '总操作次数' : 'Total Ops') + '</div></div>\
            <div class="ana-card"><div class="ana-card-icon blue"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg></div><div class="ana-card-value" id="ana-active-users">-</div><div class="ana-card-label">' + (zh ? '活跃用户数' : 'Active Users') + '</div></div>\
            <div class="ana-card"><div class="ana-card-icon violet"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg></div><div class="ana-card-value" id="ana-upload-count">-</div><div class="ana-card-label">' + (zh ? '上传次数' : 'Uploads') + '</div></div>\
            <div class="ana-card"><div class="ana-card-icon rose"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg></div><div class="ana-card-value" id="ana-download-count">-</div><div class="ana-card-label">' + (zh ? '下载次数' : 'Downloads') + '</div></div>\
          </div>\
          <div class="ana-charts-row">\
            <div class="ana-chart-card"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '事件类型分布' : 'Event Distribution') + '</span></div><div class="ana-chart-wrap" style="height:280px;"><canvas id="ana-doughnut"></canvas></div></div>\
            <div class="ana-chart-card"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '上传 vs 下载趋势' : 'Upload vs Download') + '</span></div><div class="ana-chart-wrap"><canvas id="ana-upload-download"></canvas></div></div>\
          </div>\
          <div class="ana-chart-card full"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '用户活跃度趋势' : 'User Activity Trend') + '</span><span><span class="ana-chart-sub" id="ana-today-active">-</span><span class="ana-chart-sub-label">' + (zh ? '今日活跃' : 'today active') + '</span></span></div><div class="ana-chart-wrap-sm"><canvas id="ana-line"></canvas></div></div>\
          <div class="ana-charts-row">\
            <div class="ana-chart-card full"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '素材总量趋势' : 'Asset Growth') + '</span><span><span class="ana-chart-sub">' + (zh ? '总量' : 'Total') + ' </span><span class="ana-chart-sub" id="ana-asset-total">-</span><span class="ana-chart-sub-sep"> | </span><span class="ana-chart-sub">' + (zh ? '案例库' : 'Case') + ' </span><span class="ana-chart-sub" id="ana-asset-source" style="color:#3b82f6">-</span><span class="ana-chart-sub-sep"> | </span><span class="ana-chart-sub">' + (zh ? '图库' : 'Gallery') + ' </span><span class="ana-chart-sub" id="ana-asset-gallery" style="color:#f59e0b">-</span><span class="ana-chart-sub-sep"> | </span><span class="ana-chart-sub">' + (zh ? '模版库' : 'Template') + ' </span><span class="ana-chart-sub" id="ana-asset-template" style="color:#8b5cf6">-</span></span></div><div class="ana-chart-wrap-sm"><canvas id="ana-asset-growth"></canvas></div></div>\
            <div class="ana-chart-card full"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '操作时段分布' : 'Peak Hours') + '</span><span><span class="ana-chart-sub" id="ana-peak-hour">-</span><span class="ana-chart-sub-label">' + (zh ? '峰值时段' : 'peak') + '</span></span></div><div class="ana-chart-wrap-sm"><canvas id="ana-peak-hours"></canvas></div></div>\
          </div>\
          <div class="ana-table-card">\
            <div class="ana-table-header"><span class="ana-table-title">' + (zh ? '热门素材 Top 10' : 'Hot Content Top 10') + '</span><div class="ana-cat-tabs" id="ana-cat-tabs"><button class="ana-cat-tab active" data-cat="all">' + (zh ? '全部' : 'All') + '</button><button class="ana-cat-tab" data-cat="source">' + (zh ? '案例库' : 'Case') + '</button><button class="ana-cat-tab" data-cat="gallery">' + (zh ? '图库' : 'Gallery') + '</button><button class="ana-cat-tab" data-cat="template">' + (zh ? '模版库' : 'Template') + '</button></div></div>\
            <div class="ana-scroll" style="max-height:420px;"><table class="ana-table"><thead><tr><th style="width:60px;">#</th><th>' + (zh ? '素材' : 'Asset') + '</th><th style="width:90px;">' + (zh ? '下载' : 'DL') + '</th><th style="width:90px;">' + (zh ? '查看' : 'Views') + '</th><th style="width:90px;">' + (zh ? '使用' : 'Uses') + '</th></tr></thead><tbody id="ana-top10-body"><tr><td colspan="5" class="ana-empty">' + (zh ? '暂无数据' : 'No data yet') + '</td></tr></tbody></table></div>\
          </div>\
          <div class="ana-activity-card"><div class="ana-table-header"><span class="ana-table-title">' + (zh ? '最近操作动态' : 'Recent Activity') + '</span></div><div class="ana-activity-list" id="ana-activity-list"><div class="ana-empty">' + (zh ? '暂无操作记录' : 'No activity yet') + '</div></div></div>\
          <div class="ana-controls"><div class="ana-controls-left"><div class="ana-toggle" id="ana-toggle-admin"><div class="ana-toggle-sw"></div><span class="ana-toggle-label">' + (zh ? '排除管理员操作' : 'Exclude Admin Ops') + '</span></div></div><button class="ana-btn-clear" id="ana-btn-clear">' + (zh ? '清除我的测试数据' : 'Clear My Test Data') + '</button></div>\
        </div>\
      </div>';

    // ===== 状态 =====
    var currentRange = 7;
    var excludeAdmin = false;
    var fetchedData = null;
    var charts = {};
    var top10Cat = 'all';
    // ===== 图表颜色 =====
    var CHART_COLORS = ['#0d9488','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#10b981','#06b6d4','#64748b','#ec4899','#84cc16'];

    // ===== 事件类型归类 =====
    function eventCategory(et) {
      if (et === 'upload') return 'upload';
      if (et === 'view') return 'view';
      if (et === 'favorite') return 'favorite';
      if (et === 'edit' || et === 'batch_edit') return 'edit';
      if (et === 'delete' || et === 'batch_delete') return 'delete';
      if (et === 'login') return 'login';
      if (et === 'batch_download' || et === 'download_preview' || et === 'download_source') return 'download';
      if (et === 'use_static' || et === 'use_dynamic' || et === 'use_template') return 'diy';
      return 'other';
    }

    var CAT_LABELS_ZH = { upload: '上传素材', download: '下载素材', view: '查看详情', favorite: '收藏', edit: '编辑素材', delete: '删除素材', diy: '使用DIY', login: '登录' };
    var CAT_LABELS_EN = { upload: 'Upload', download: 'Download', view: 'View', favorite: 'Favorite', edit: 'Edit', delete: 'Delete', diy: 'DIY Use', login: 'Login' };
    var CAT_ORDER = ['upload','download','view','favorite','edit','delete','diy','login'];

    // ===== 销毁旧图表 =====
    function destroyCharts() {
      Object.values(charts).forEach(function(c) { try { c.destroy(); } catch(e) {} });
      charts = {};
    }

    // ===== 生成日期标签 =====
    function dateLabels(days) {
      var labels = [];
      var d = new Date();
      for (var i = days - 1; i >= 0; i--) {
        var dt = new Date(d);
        dt.setDate(dt.getDate() - i);
        labels.push((dt.getMonth() + 1) + '/' + dt.getDate());
      }
      return labels;
    }

    // ===== 相对时间 =====
    function relativeTime(iso) {
      if (!iso) return '';
      var diff = (Date.now() - new Date(iso).getTime()) / 1000;
      if (diff < 60) return zh ? '刚刚' : 'just now';
      if (diff < 3600) return Math.floor(diff / 60) + (zh ? '分钟前' : 'm ago');
      if (diff < 86400) return Math.floor(diff / 3600) + (zh ? '小时前' : 'h ago');
      return Math.floor(diff / 86400) + (zh ? '天前' : 'd ago');
    }

    // ===== 渲染全部内容 =====
    async function renderAll() {
      fetchedData = await fetchAnalyticsData(currentRange);
      var data = fetchedData;
      var events = (data && data.events) ? data.events : [];
      var effectiveEvents = excludeAdmin ? events.filter(function(e) { return e.actor_role !== 'admin'; }) : events;
      var todayStr = new Date().toISOString().split('T')[0];

      // --- KPI 卡片 ---
      var uniqueUsers = new Set(effectiveEvents.map(function(e) { return e.actor_id; }));
      var uploadCount = 0, downloadCount = 0;
      effectiveEvents.forEach(function(e) {
        if (eventCategory(e.event_type) === 'upload') uploadCount++;
        if (eventCategory(e.event_type) === 'download') downloadCount++;
      });
      document.getElementById('ana-total-ops').textContent = effectiveEvents.length;
      document.getElementById('ana-active-users').textContent = uniqueUsers.size;
      document.getElementById('ana-upload-count').textContent = uploadCount;
      document.getElementById('ana-download-count').textContent = downloadCount;
      document.getElementById('ana-today-active').textContent = effectiveEvents.length ? new Set(effectiveEvents.filter(function(e) { return (e.created_at || '').split('T')[0] === todayStr; }).map(function(e) { return e.actor_id; })).size : '0';
      var st = (data && data.sourceTypes) ? data.sourceTypes : { source: 0, gallery: 0, template: 0 };
      document.getElementById('ana-asset-total').textContent = (st.source + st.gallery + st.template) || '0';
      document.getElementById('ana-asset-source').textContent = st.source || '0';
      document.getElementById('ana-asset-gallery').textContent = st.gallery || '0';
      document.getElementById('ana-asset-template').textContent = st.template || '0';

      // --- 环形图：事件类型分布 ---
      var catCounts = {};
      effectiveEvents.forEach(function(e) {
        var cat = eventCategory(e.event_type);
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });
      var catLabels = CAT_ORDER.filter(function(c) { return catCounts[c]; });
      var catValues = catLabels.map(function(c) { return catCounts[c]; });
      var catDisplayLabels = catLabels.map(function(c) { return zh ? CAT_LABELS_ZH[c] : CAT_LABELS_EN[c]; });
      var totalCat = catValues.reduce(function(a, b) { return a + b; }, 0);

      if (charts.doughnut) charts.doughnut.destroy();
      var dCtx = document.getElementById('ana-doughnut');
      if (dCtx) {
        charts.doughnut = new Chart(dCtx.getContext('2d'), {
          type: 'doughnut',
          data: { labels: catDisplayLabels, datasets: [{ data: catValues, backgroundColor: CHART_COLORS.slice(0, catValues.length), borderWidth: 0, hoverOffset: 8 }] },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '68%',
            layout: { padding: { bottom: 10 } },
            plugins: {
              legend: { position: 'right', onClick: function(e, legendItem, legend) { if (legendItem.index !== undefined) { legend.chart.toggleDataVisibility(legendItem.index); legend.chart.update(); } }, labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 14, font: { size: 11 }, color: '#64748b' } },
              tooltip: { callbacks: { label: function(ctx) { var pct = ((ctx.raw / totalCat) * 100).toFixed(1); return ' ' + ctx.label + ': ' + ctx.raw + ' (' + pct + '%)'; } } }
            }
          },
          plugins: [{
            id: 'centerText', afterDraw: function(chart) {
              var meta = chart.getDatasetMeta(0); if (!meta.data.length) return;
              // 只统计未隐藏的项，点击图例屏蔽后中间数字同步变化
              var visibleTotal = 0;
              var ds = chart.data.datasets[0];
              for (var i = 0; i < ds.data.length; i++) {
                if (chart.getDataVisibility(i)) visibleTotal += ds.data[i];
              }
              var ctx = chart.ctx, c = meta.data[0], x = c.x, y = c.y;
              ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.font = "bold 24px -apple-system, sans-serif"; ctx.fillStyle = '#1e293b'; ctx.fillText(visibleTotal, x, y - 6);
              ctx.font = "11px -apple-system, sans-serif"; ctx.fillStyle = '#64748b'; ctx.fillText(zh ? '总操作' : 'Total', x, y + 14);
              ctx.restore();
            }
          }]
        });
      }

      // --- 每日趋势数据 ---
      var labels = dateLabels(currentRange);
      var dailyUploads = new Array(currentRange).fill(0);
      var dailyDownloads = new Array(currentRange).fill(0);
      var dailyUsers = new Array(currentRange).fill(0);
      var dailyUserSets = new Array(currentRange).fill(null).map(function() { return new Set(); });
      var todayActive = 0;

      var d = new Date();
      var rangeStartDate = new Date(d);
      rangeStartDate.setHours(0,0,0,0);
      rangeStartDate.setDate(rangeStartDate.getDate() - currentRange + 1);

      effectiveEvents.forEach(function(e) {
        var ed = e.created_at ? e.created_at.split('T')[0] : '';
        if (!ed) return;
        var idx = Math.floor((new Date(ed).getTime() - rangeStartDate.getTime()) / 86400000);
        if (idx < 0 || idx >= currentRange) return;
        var cat = eventCategory(e.event_type);
        if (cat === 'upload') dailyUploads[idx]++;
        if (cat === 'download') dailyDownloads[idx]++;
        if (dailyUserSets[idx]) dailyUserSets[idx].add(e.actor_id);
        if (ed === todayStr) todayActive++;
      });
      var dailyUserCounts = dailyUserSets.map(function(s) { return s ? s.size : 0; });

      // --- 上传 vs 下载趋势 ---
      if (charts.uploadDownload) charts.uploadDownload.destroy();
      var udCtx = document.getElementById('ana-upload-download');
      if (udCtx) {
        charts.uploadDownload = new Chart(udCtx.getContext('2d'), {
          type: 'line', data: { labels: labels, datasets: [
            { label: zh ? '上传' : 'Uploads', data: dailyUploads, borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,0.08)', fill: true, tension: 0, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#0d9488' },
            { label: zh ? '下载' : 'Downloads', data: dailyDownloads, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: 0, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#3b82f6' }
          ]},
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 }, color: '#64748b' } } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' } } }
          }
        });
      }

      // --- 用户活跃度趋势 ---
      if (charts.line) charts.line.destroy();
      var lCtx = document.getElementById('ana-line');
      if (lCtx) {
        charts.line = new Chart(lCtx.getContext('2d'), {
          type: 'line', data: { labels: labels, datasets: [{ data: dailyUserCounts, borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,0.1)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#0d9488' }] },
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' } } }
          }
        });
      }

      // --- 素材总量趋势 ---
      if (charts.assetGrowth) charts.assetGrowth.destroy();
      var agCtx = document.getElementById('ana-asset-growth');
      if (agCtx && data && data.assetGrowth && data.assetGrowth.labels.length) {
        var ag = data.assetGrowth;
        charts.assetGrowth = new Chart(agCtx.getContext('2d'), {
          type: 'line', data: { labels: ag.labels, datasets: [
            { label: zh ? '案例库' : 'Case', data: ag.source, borderColor: '#3b82f6', borderDash: [5,3], fill: false, tension: 0, borderWidth: 2, pointRadius: 2 },
            { label: zh ? '图库' : 'Gallery', data: ag.gallery, borderColor: '#f59e0b', borderDash: [5,3], fill: false, tension: 0, borderWidth: 2, pointRadius: 2 },
            { label: zh ? '模版库' : 'Template', data: ag.template, borderColor: '#8b5cf6', borderDash: [5,3], fill: false, tension: 0, borderWidth: 2, pointRadius: 2 },
            { label: zh ? '总量' : 'Total', data: ag.total, borderColor: '#0d9488', fill: false, tension: 0, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#0d9488' }
          ]},
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 12, padding: 18, font: { size: 11 }, color: '#64748b' } } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' } } }
          }
        });
      }

      // --- 操作时段分布 ---
      var hourCounts = new Array(8).fill(0);
      var hourLabels = ['0-3', '3-6', '6-9', '9-12', '12-15', '15-18', '18-21', '21-24'];
      effectiveEvents.forEach(function(e) {
        var h = e.created_at ? new Date(e.created_at).getHours() : -1;
        if (h >= 0) { var slot = Math.floor(h / 3); if (slot < 8) hourCounts[slot]++; }
      });
      var maxHourIdx = hourCounts.indexOf(Math.max.apply(null, hourCounts));
      document.getElementById('ana-peak-hour').textContent = hourLabels[maxHourIdx] + (zh ? '时' : '');

      if (charts.peakHours) charts.peakHours.destroy();
      var phCtx = document.getElementById('ana-peak-hours');
      if (phCtx) {
        charts.peakHours = new Chart(phCtx.getContext('2d'), {
          type: 'bar', data: { labels: hourLabels, datasets: [{ data: hourCounts, backgroundColor: 'rgba(13,148,136,0.25)', borderColor: '#0d9488', borderWidth: 1, borderRadius: 6 }] },
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' } } }
          }
        });
      }

      // --- Top 10 表格（异步：需要签名缩略图）---
      await renderTop10Table();

      // --- 最近操作动态 ---
      renderActivityFeed();
    }

    // ===== 热门素材 Top 10 =====
    async function renderTop10Table() {
      var tbody = document.getElementById('ana-top10-body');
      if (!tbody) return;
      // 确保 library options 已加载（用于显示国家/活动标签）
      if (!state.libraryOptions || !state.libraryOptions.length) {
        try { await loadLibraryOptions(); } catch(e) { /* 静默 */ }
      }
      var data = fetchedData;
      var events = (data && data.events) ? data.events : [];
      var effectiveEvents = excludeAdmin ? events.filter(function(e) { return e.actor_role !== 'admin'; }) : events;

      // 按素材聚合
      var assetMap = {};
      effectiveEvents.forEach(function(e) {
        var sid = e.source_file_id;
        if (!sid) return;
        if (!assetMap[sid]) assetMap[sid] = { downloads: 0, views: 0, uses: 0 };
        var cat = eventCategory(e.event_type);
        if (cat === 'download') assetMap[sid].downloads++;
        if (cat === 'view') assetMap[sid].views++;
        if (cat === 'diy') assetMap[sid].uses++;
      });

      // 关联源文件信息
      var sources = data && data.sources ? data.sources : [];
      var sourceMap = {};
      sources.forEach(function(s) { sourceMap[s.id] = s; });

      // 素材类型判断
      function itemKind(src) {
        var tags = src.tags || [];
        if (tags.indexOf('vf:kind:gallery') !== -1) return 'gallery';
        if (tags.indexOf('vf:kind:template') !== -1) return 'template';
        if (tags.indexOf('vf:kind:source') !== -1) return 'source';
        var ext = (src.source_ext || '').toLowerCase();
        var imgExts = ['jpg','jpeg','png','gif','webp','bmp','svg','tiff','psd','ai','eps','heic','heif'];
        if (imgExts.indexOf(ext) !== -1) return 'gallery';
        if (ext === 'json') return 'template';
        return 'source';
      }

      var list = [];
      Object.keys(assetMap).forEach(function(sid) {
        var src = sourceMap[sid] || {};
        var kind = itemKind(src);
        var tags = src.tags || [];
        var kindMarkers = ['vf:kind:gallery', 'vf:kind:template', 'vf:kind:source'];
        var displayTags = tags.filter(function(t) { return kindMarkers.indexOf(t) === -1; });
        var countryName = optionNameById(src.country_id);
        var activityName = optionNameById(src.activity_id);
        if (countryName && countryName !== '-') displayTags.push(countryName);
        if (activityName && activityName !== '-') displayTags.push(activityName);
        list.push({
          id: sid, title: src.title || '', filename: src.source_filename || '',
          kind: kind, sourcePath: src.source_path || '',
          downloads: assetMap[sid].downloads, views: assetMap[sid].views, uses: assetMap[sid].uses,
          score: assetMap[sid].downloads + assetMap[sid].uses,
          tags: displayTags
        });
      });

      var filtered = top10Cat === 'all' ? list : list.filter(function(item) { return item.kind === top10Cat; });
      filtered.sort(function(a, b) { return b.score - a.score; });

      // 签名缩略图 URL
      var thumbUrls = {};
      if (state.supabase && filtered.length) {
        var thumbPaths = [];
        filtered.forEach(function(item) {
          if (item.sourcePath) {
            var tp = item.sourcePath.replace(/\/[^/]+$/, '/_thumb.jpg');
            thumbPaths.push(tp);
          }
        });
        if (thumbPaths.length) {
          try {
            var signed = await state.supabase.storage.from(LIBRARY_BUCKET).createSignedUrls(thumbPaths, 3600);
            if (signed.data) {
              signed.data.forEach(function(su) {
                if (su.path) thumbUrls[su.path] = su.signedUrl;
              });
            }
          } catch(e) { console.warn('Thumb signing failed:', e); }
        }
      }

      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="ana-empty">' + (zh ? '暂无数据' : 'No data yet') + '</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(function(item, i) {
        var rankCls = i < 3 ? 'ana-rank top' : 'ana-rank';
        var name = item.title || ('<span style="color:#94a3b8">' + (item.filename || '?') + '</span>');
        var tp = item.sourcePath ? item.sourcePath.replace(/\/[^/]+$/, '/_thumb.jpg') : '';
        var signedUrl = thumbUrls[tp] || '';
        var thumbHtml = signedUrl
          ? '<img class="ana-thumb-img" src="' + signedUrl + '" alt="" loading="lazy">'
          : '<div class="ana-thumb-img" style="background:#e2e8f0;"></div>';
        var subText = item.tags.length ? item.tags.join(' · ') : '';
        return '<tr style="cursor:pointer" data-source-id="' + item.id + '">' +
          '<td><span class="' + rankCls + '">' + (i + 1) + '</span></td>' +
          '<td><div class="ana-thumb-cell">' + thumbHtml + '<div><div class="ana-thumb-name">' + name + '</div>' + (subText ? '<div class="ana-thumb-file">' + subText + '</div>' : '') + '</div></div></td>' +
          '<td><span class="ana-stat">' + item.downloads + '</span></td>' +
          '<td><span class="ana-stat">' + item.views + '</span></td>' +
          '<td><span class="ana-stat">' + item.uses + '</span></td>' +
          '</tr>';
      }).join('');
    }

    // ===== 最近操作动态 =====
    function renderActivityFeed() {
      var list = document.getElementById('ana-activity-list');
      if (!list) return;
      var data = fetchedData;
      var events = (data && data.events) ? data.events : [];
      var effectiveEvents = excludeAdmin ? events.filter(function(e) { return e.actor_role !== 'admin'; }) : events;

      var recent = effectiveEvents.slice(0, 100);
      if (!recent.length) {
        list.innerHTML = '<div class="ana-empty">' + (zh ? '暂无操作记录' : 'No activity yet') + '</div>';
        return;
      }

      var sources = data && data.sources ? data.sources : [];
      var sourceMap = {};
      sources.forEach(function(s) { sourceMap[s.id] = s; });

      var actionLabels = {
        upload: zh ? '上传了' : 'uploaded',
        download_preview: zh ? '下载了' : 'downloaded', download_source: zh ? '下载了' : 'downloaded', batch_download: zh ? '批量下载了' : 'batch-downloaded',
        view: zh ? '查看了' : 'viewed',
        favorite: zh ? '收藏了' : 'favorited',
        edit: zh ? '编辑了' : 'edited', batch_edit: zh ? '批量编辑了' : 'batch-edited',
        delete: zh ? '删除了' : 'deleted', batch_delete: zh ? '批量删除了' : 'batch-deleted',
        use_static: zh ? '使用了' : 'used', use_dynamic: zh ? '使用了' : 'used', use_template: zh ? '使用了' : 'used',
        login: zh ? '登录了' : 'logged in'
      };
      var actionColors = { upload: '#10b981', download_preview: '#3b82f6', download_source: '#3b82f6', batch_download: '#3b82f6', view: '#8b5cf6', favorite: '#f59e0b', edit: '#06b6d4', batch_edit: '#06b6d4', delete: '#ef4444', batch_delete: '#ef4444', use_static: '#0d9488', use_dynamic: '#0d9488', use_template: '#0d9488', login: '#64748b' };

      list.innerHTML = recent.map(function(e) {
        var src = (e.source_file_id && sourceMap[e.source_file_id]) ? sourceMap[e.source_file_id] : null;
        var assetName = src ? (src.title || src.source_filename || '?') : '';
        var action = actionLabels[e.event_type] || e.event_type;
        var color = actionColors[e.event_type] || '#64748b';
        var initial = (e.actor_id || '?').charAt(0).toUpperCase();
        return '<div class="ana-activity-item">' +
          '<div class="ana-activity-avatar">' + initial + '</div>' +
          '<div class="ana-activity-body"><div class="ana-activity-text"><span class="u">' + initial + '</span> <span class="a" style="color:' + color + '">' + action + '</span>' + (assetName ? ' <span class="m">' + assetName + '</span>' : '') + '</div></div>' +
          '<div class="ana-activity-time">' + relativeTime(e.created_at) + '</div>' +
          '</div>';
      }).join('');
    }

    // ===== 事件绑定 =====
    function bindEvents() {
      // 时间范围切换
      document.querySelectorAll('#ana-range-btns .ana-filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          document.querySelectorAll('#ana-range-btns .ana-filter-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          currentRange = parseInt(btn.dataset.range) || 7;
          destroyCharts();
          renderAll();
        });
      });

      // 管理员开关
      var toggle = document.getElementById('ana-toggle-admin');
      if (toggle) {
        toggle.addEventListener('click', function() {
          toggle.classList.toggle('active');
          excludeAdmin = toggle.classList.contains('active');
          destroyCharts();
          renderAll();
        });
      }

      // 热门素材分类 tab
      document.querySelectorAll('#ana-cat-tabs .ana-cat-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          document.querySelectorAll('#ana-cat-tabs .ana-cat-tab').forEach(function(t) { t.classList.remove('active'); });
          tab.classList.add('active');
          top10Cat = tab.dataset.cat || 'all';
          renderTop10Table();
        });
      });

      // 热门素材点击跳转
      var top10Body = document.getElementById('ana-top10-body');
      if (top10Body) {
        top10Body.addEventListener('click', function(e) {
          var row = e.target.closest('tr[data-source-id]');
          if (!row) return;
          state.libraryScrollToSource = row.dataset.sourceId;
          navigate('library');
        });
      }

      // 清除测试数据
      var clearBtn = document.getElementById('ana-btn-clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', async function() {
          if (!confirm(zh ? '确定删除当前时间范围内你的所有操作记录？此操作不可恢复。' : 'Delete all your event records in this date range? This cannot be undone.')) return;
          if (!state.supabase) return;
          var startDate = new Date();
          startDate.setHours(0,0,0,0);
          startDate.setDate(startDate.getDate() - currentRange + 1);
          try {
            var { error } = await state.supabase.from('vf_asset_events')
              .delete()
              .eq('actor_id', state.session.user.id)
              .gte('created_at', startDate.toISOString());
            if (error) throw error;
            destroyCharts();
            await renderAll();
          } catch(e) {
            alert(e.message || 'Clear failed');
          }
        });
      }
    }

    // ===== 初始化 =====
    destroyCharts();
    await renderAll();
    bindEvents();
  }

  async function renderAdmin() {
    parkActiveToolFrame();
    els.content.innerHTML = `
      <div class="panel-page">
        <section class="admin-section">
          <div>
            <div class="kicker">${state.lang === 'zh' ? 'TEAM ACCESS' : 'TEAM ACCESS'}</div>
            <h3>${t('createAccount')}</h3>
          </div>
          <form id="create-user-form" class="toolbar">
            <label><span>${t('displayName')}</span><input name="display_name" required></label>
            <label><span>${t('email')}</span><input name="email" type="email" required></label>
            <label><span>${t('initialPassword')}</span><input name="password" type="password" minlength="8" required></label>
            <label><span>${t('role')}</span><select name="role"><option value="designer">${roleLabel('designer')}</option><option value="operator">${roleLabel('operator')}</option><option value="admin">${roleLabel('admin')}</option></select></label>
            <button class="primary-btn" type="submit">${t('createAccount')}</button>
          </form>
          <div id="create-user-message" class="message"></div>
        </section>
        <section class="admin-section">
          <div>
            <div class="kicker">${state.lang === 'zh' ? 'CLASSIFICATION' : 'CLASSIFICATION'}</div>
            <h3>${t('createCategory')}</h3>
          </div>
          <form id="category-form" class="toolbar">
            <label><span>${t('categoryNameZh')}</span><input name="name_zh" required></label>
            <label><span>${t('categoryNameEn')}</span><input name="name_en"></label>
            <label><span>${t('visibility')}</span><select name="visibility"><option value="all">${t('allVisible')}</option><option value="designers">${t('designersOnly')}</option><option value="operators">${t('operatorsOnly')}</option></select></label>
            <button class="primary-btn" type="submit">${t('createCategory')}</button>
          </form>
          <div id="category-message" class="message"></div>
        </section>
        <section class="panel">
          <table class="table">
            <thead><tr><th>${t('categoryNameZh')}</th><th>${t('categoryNameEn')}</th><th>${t('visibility')}</th></tr></thead>
            <tbody id="categories-table"><tr><td colspan="3">${state.lang === 'zh' ? '正在读取...' : 'Loading...'}</td></tr></tbody>
          </table>
        </section>
      </div>
    `;
    document.getElementById('create-user-form').addEventListener('submit', createUser);
    document.getElementById('category-form').addEventListener('submit', createCategory);
    await loadCategories();
  }

  async function createUser(event) {
    event.preventDefault();
    const message = document.getElementById('create-user-message');
    message.className = 'message';
    message.textContent = '';
    if (state.localPreview) {
      setMessage(message, state.lang === 'zh' ? '本地预览模式不会创建真实账号。部署后由 Serverless API 创建。' : 'Local preview does not create real accounts.', true);
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.session.access_token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Create user failed');
      setMessage(message, state.lang === 'zh' ? '账号已创建。' : 'Account created.', false, true);
      event.currentTarget.reset();
    } catch (error) {
      setMessage(message, error.message, true);
    }
  }

  async function createCategory(event) {
    event.preventDefault();
    const message = document.getElementById('category-message');
    message.className = 'message';
    message.textContent = '';
    if (state.localPreview || !state.supabase) {
      setMessage(message, state.lang === 'zh' ? '本地预览模式不会写入云端分类。' : 'Local preview does not write cloud categories.', true);
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const { error } = await state.supabase.from('vf_categories').insert([payload]);
    if (error) {
      setMessage(message, error.message, true);
      return;
    }
    setMessage(message, state.lang === 'zh' ? '分类已创建。' : 'Category created.', false, true);
    event.currentTarget.reset();
    await loadCategories();
  }

  async function loadCategories() {
    const table = document.getElementById('categories-table');
    if (!table) return;
    if (state.localPreview || !state.supabase) {
      table.innerHTML = `<tr><td colspan="3">${state.lang === 'zh' ? '本地预览模式不读取云端分类。' : 'Local preview does not read cloud categories.'}</td></tr>`;
      return;
    }
    const { data, error } = await state.supabase
      .from('vf_categories')
      .select('id,name_zh,name_en,visibility')
      .order('sort_order', { ascending: true });
    if (error) {
      table.innerHTML = `<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`;
      return;
    }
    if (!data || data.length === 0) {
      table.innerHTML = `<tr><td colspan="3">${state.lang === 'zh' ? '还没有分类。' : 'No categories yet.'}</td></tr>`;
      return;
    }
    table.innerHTML = data.map(item => `
      <tr><td>${escapeHtml(item.name_zh)}</td><td>${escapeHtml(item.name_en || '')}</td><td><span class="badge">${visibilityLabel(item.visibility)}</span></td></tr>
    `).join('');
  }

  function openProjectModal() {
    const typeName = state.route === 'dynamic' ? t('dynamicDiy') : t('staticDiy');
    els.projectTitleInput.value = `${typeName} ${new Date().toLocaleString()}`;
    els.projectSaveNote.textContent = state.lang === 'zh'
      ? 'V1 会保存项目元数据和编辑器快照。静态工具可记录更多图层信息，动态序列帧会先记录结构信息。'
      : 'V1 saves project metadata and an editor snapshot. Static snapshots include more layer data; dynamic sequences start with structural data.';
    els.projectModalMessage.textContent = '';
    els.projectModalMessage.className = 'message';
    els.projectModal.hidden = false;
    els.projectTitleInput.focus();
  }

  function closeProjectModal() {
    els.projectModal.hidden = true;
  }

  async function saveStaticTemplateToLibrary() {
    if (state.route !== 'static') return;
    if (state.localPreview || !state.supabase || !state.session) {
      alert(state.lang === 'zh' ? '模板库保存需要登录云端账号。' : 'Saving templates requires a cloud login.');
      return;
    }
    const title = window.prompt(state.lang === 'zh' ? '模板名称' : 'Template name', `${state.lang === 'zh' ? '静态模板' : 'Static Template'} ${new Date().toLocaleString()}`);
    if (!title || !title.trim()) return;
    const button = els.saveTemplateBtn;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = state.lang === 'zh' ? '保存中...' : 'Saving...';
    const sourceId = crypto.randomUUID();
    const uploadedPaths = [];
    let sourceInserted = false;
    try {
      await waitForToolTemplateExporter();
      const exported = await state.activeFrame.contentWindow.VF_EXPORT_TEMPLATE_ASSET({ title: title.trim() });
      const snapshot = exported?.snapshot;
      validateProjectSnapshot(snapshot, 'static');
      if (!exported?.previewDataUrl) throw new Error(state.lang === 'zh' ? '没有生成模板预览图。' : 'Template preview was not generated.');
      const userId = state.session.user.id;
      const templateBlob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const previewBlob = dataUrlToBlob(exported.previewDataUrl);
      const sourcePath = `${userId}/sources/${sourceId}/${safeStorageName(`${title.trim()}.json`)}`;
      const previewPath = `${userId}/previews/${sourceId}/${safeStorageName(`${title.trim()}-preview.png`)}`;
      const sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, templateBlob, {
        upsert: false,
        contentType: 'application/json'
      });
      if (sourceUpload.error) throw sourceUpload.error;
      uploadedPaths.push(sourcePath);
      const previewUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(previewPath, previewBlob, {
        upsert: false,
        contentType: previewBlob.type || 'image/png'
      });
      if (previewUpload.error) throw previewUpload.error;
      uploadedPaths.push(previewPath);
      const dimensions = await readImageDimensions(new File([previewBlob], 'template-preview.png', { type: previewBlob.type || 'image/png' }));
      const sourceInsert = await state.supabase.from('vf_source_files').insert([{
        id: sourceId,
        title: title.trim(),
        country_id: null,
        activity_id: null,
        category_id: null,
        tags: normalizeLibraryTags('template', ['模版', '社媒物料']),
        visibility: 'all',
        source_path: sourcePath,
        source_filename: `${title.trim()}.json`,
        source_mime_type: 'application/json',
        source_size_bytes: templateBlob.size,
        source_ext: 'json',
        uploaded_by: userId
      }]);
      if (sourceInsert.error) throw sourceInsert.error;
      sourceInserted = true;
      const previewInsert = await state.supabase.from('vf_asset_previews').insert([{
        id: crypto.randomUUID(),
        source_file_id: sourceId,
        preview_path: previewPath,
        preview_filename: `${title.trim()}-preview.png`,
        preview_mime_type: previewBlob.type || 'image/png',
        preview_size_bytes: previewBlob.size,
        width: dimensions.width,
        height: dimensions.height,
        sort_order: 10
      }]);
      if (previewInsert.error) throw previewInsert.error;
      alert(state.lang === 'zh' ? '已保存到模板库。' : 'Saved to Template Library.');
    } catch (error) {
      await cleanupFailedLibraryUpload(sourceId, sourceInserted, uploadedPaths);
      alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  // ===== 顶部同步进度条 =====
  var _syncQueue = [];
  function showGlobalProgress(text) {
    var bar = document.getElementById('sync-progress-bar');
    var fill = document.getElementById('sync-progress-fill');
    var toast = document.getElementById('sync-progress-toast');
    if (bar) bar.style.display = 'block';
    if (fill) fill.style.width = '30%';
    if (toast) { toast.style.display = 'block'; toast.textContent = text || '正在同步...'; }
  }
  function updateGlobalProgress(percent, text) {
    var fill = document.getElementById('sync-progress-fill');
    var toast = document.getElementById('sync-progress-toast');
    if (fill) fill.style.width = (percent || 50) + '%';
    if (toast && text) toast.textContent = text;
  }
  function hideGlobalProgress(doneText) {
    var bar = document.getElementById('sync-progress-bar');
    var fill = document.getElementById('sync-progress-fill');
    var toast = document.getElementById('sync-progress-toast');
    if (fill) fill.style.width = '100%';
    if (toast) { toast.textContent = doneText || '✅ 同步完成'; toast.style.background = '#0d9488'; }
    setTimeout(function() {
      if (bar) bar.style.display = 'none';
      if (fill) fill.style.width = '0%';
      if (toast) { toast.style.display = 'none'; toast.style.background = '#0f172a'; }
    }, 2000);
  }
  // ===== 静态DIY模板 ↔ 素材库同步 =====
  async function handleToolMessage(event) {
    var msg = event.data;
    if (!msg || !msg.type) return;
    // 只接受来自静态DIY iframe 的消息
    if (!msg.type.startsWith('vf:')) return;
    var sourceWindow = event.source;
    switch (msg.type) {
      case 'vf:save-template':
        await handleSaveTemplate(msg, sourceWindow);
        refreshLibraryIfOpen();
        break;
      case 'vf:delete-template':
        await handleDeleteTemplate(msg, sourceWindow);
        refreshLibraryIfOpen();
        break;
      case 'vf:request-templates':
        handleFetchTemplates(sourceWindow);
        break;
      case 'vf:save-shared-assets':
        handleSaveSharedAssets(msg, sourceWindow);
        break;
    }
  }

  async function handleSaveTemplate(msg, sourceWindow) {
    if (state.localPreview || !state.supabase || !state.session) {
      replySyncProgress(sourceWindow, 'error', null, 'Not logged in');
      return;
    }
    showGlobalProgress('⏳ 正在保存「' + (msg.name || '模板') + '」到素材库...');
    replySyncProgress(sourceWindow, 'uploading');
    var sourceId = crypto.randomUUID();
    var uploadedPaths = [];
    var sourceInserted = false;
    try {
      var userId = state.session.user.id;
      // 重名检测：如已有同名模板 → 名称加数字后缀
      var finalName = msg.name || '未命名模板';
      var { data: existing } = await state.supabase.from('vf_source_files')
        .select('title').ilike('title', finalName + '%').limit(20);
      if (existing && existing.length > 0) {
        var existingNames = existing.map(function(r) { return r.title; });
        var suffix = 2;
        var candidate = finalName + ' (' + suffix + ')';
        while (existingNames.indexOf(candidate) !== -1) {
          suffix++;
          candidate = finalName + ' (' + suffix + ')';
        }
        finalName = candidate;
      }
      // 构建 JSON 数据
      var schemaMap = { pack: 'vf-template-pack/v1', layout: 'vf-layout-preset/v1', tagcombo: 'vf-tag-combo/v1', logo: 'vf-logo-asset/v1' };
      var schemaName = schemaMap[msg.templateType] || 'vf-layout-preset/v1';
      var jsonData = { schema: schemaName, name: finalName, exportedAt: new Date().toISOString() };
      if (msg.templateType === 'pack') {
        jsonData.artboards = msg.data.artboards;
      } else if (msg.templateType === 'tagcombo') {
        jsonData.elements = msg.data.elements || [];
      } else if (msg.templateType === 'logo') {
        jsonData.src = msg.data.src || '';
      } else {
        jsonData.size = msg.data.size || '';
        jsonData.canvasW = msg.data.canvasW || 0;
        jsonData.canvasH = msg.data.canvasH || 0;
        jsonData.elements = msg.data.elements || [];
      }
      var jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      // 预览图处理
      var previewBlob = msg.previewDataUrl ? dataUrlToBlob(msg.previewDataUrl) : null;
      if (previewBlob && previewBlob.size > 2 * 1024 * 1024) {
        previewBlob = await compressImageBlob(previewBlob, 2 * 1024 * 1024);
      }
      // 上传到 Supabase Storage
      var sourcePath = userId + '/sources/' + sourceId + '/' + safeStorageName(finalName + '.json');
      var sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, jsonBlob, { upsert: false, contentType: 'application/json' });
      if (sourceUpload.error) throw sourceUpload.error;
      uploadedPaths.push(sourcePath);
      var previewPath = '', dimensions = { width: 0, height: 0 };
      if (previewBlob) {
        previewPath = userId + '/previews/' + sourceId + '/' + safeStorageName(finalName + '-preview.png');
        var previewUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(previewPath, previewBlob, { upsert: false, contentType: previewBlob.type || 'image/png' });
        if (previewUpload.error) throw previewUpload.error;
        uploadedPaths.push(previewPath);
        dimensions = await readImageDimensions(new File([previewBlob], 'preview.png', { type: previewBlob.type || 'image/png' }));
      }
      // 插入数据库
      // 按新标签结构分配 tag1/tag2
      var tagMap = {
        layout: ['模版', msg.subTag || '社媒物料'],
        pack: ['模版', msg.subTag || '社媒物料'],
        full: ['模版', msg.subTag || '社媒物料'],
        tagcombo: ['组件', msg.subTag || '标签'],
        logo: ['组件', msg.subTag || 'LOGO']
      };
      var tagsToUse = tagMap[msg.templateType] || ['模版', '社媒物料'];
      var sourceInsert = await state.supabase.from('vf_source_files').insert([{
        id: sourceId,
        title: finalName,
        country_id: null, activity_id: null, category_id: null,
        tags: normalizeLibraryTags('template', tagsToUse),
        visibility: 'all',
        source_path: sourcePath,
        source_filename: finalName + '.json',
        source_mime_type: 'application/json',
        source_size_bytes: jsonBlob.size,
        source_ext: 'json',
        uploaded_by: userId
      }]);
      if (sourceInsert.error) throw sourceInsert.error;
      sourceInserted = true;
      if (previewBlob) {
        var previewInsert = await state.supabase.from('vf_asset_previews').insert([{
          id: crypto.randomUUID(),
          source_file_id: sourceId,
          preview_path: previewPath,
          preview_filename: finalName + '-preview.png',
          preview_mime_type: previewBlob.type || 'image/png',
          preview_size_bytes: previewBlob.size,
          width: dimensions.width, height: dimensions.height,
          sort_order: 10
        }]);
        if (previewInsert.error) throw previewInsert.error;
      }
      // 立即更新内存中的 library 数据，切换时无需等 Supabase 复制
      state.librarySources.push({
        id: sourceId, title: finalName, tags: normalizeLibraryTags('template', tagsToUse),
        country_id: null, activity_id: null, category_id: null,
        source_path: sourcePath, source_filename: finalName + '.json',
        source_mime_type: 'application/json', source_size_bytes: jsonBlob.size,
        source_ext: 'json', uploaded_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      });
      if (previewBlob) {
        state.libraryPreviews.push({
          id: crypto.randomUUID(), source_file_id: sourceId,
          preview_path: previewPath, preview_filename: finalName + '-preview.png',
          preview_mime_type: previewBlob.type || 'image/png', preview_size_bytes: previewBlob.size,
          width: dimensions.width, height: dimensions.height, sort_order: 10
        });
        state.libraryPreviewUrls[previewPath] = msg.previewDataUrl || '';
      }
      state.libraryDataLoaded = true;
      _templateSnapshotCache[sourcePath] = jsonData;
      updateGlobalProgress(80, '正在保存「' + finalName + '」...');
      replySyncProgress(sourceWindow, 'done', sourceId, null, finalName, msg.name, msg.tempId);
      hideGlobalProgress('✅「' + finalName + '」已保存');
    } catch (error) {
      await cleanupFailedLibraryUpload(sourceId, sourceInserted, uploadedPaths);
      replySyncProgress(sourceWindow, 'error', null, error.message, msg.name, msg.tempId);
      hideGlobalProgress('❌ 保存失败');
    }
  }

  function replySyncProgress(sourceWindow, status, sourceId, error, finalName, originalName, tempId) {
    try {
      sourceWindow.postMessage({ type: 'vf:sync-progress', status: status, sourceId: sourceId || '', error: error || '', finalName: finalName || '', originalName: originalName || '', tempId: tempId || '' }, location.origin);
    } catch (e) { /* 忽略发送失败 */ }
  }

  async function handleDeleteTemplate(msg, sourceWindow) {
    if (!msg.sourceId || state.localPreview || !state.supabase) return;
    try {
      var { data: src } = await state.supabase.from('vf_source_files').select('source_path').eq('id', msg.sourceId).single();
      if (src && src.source_path) {
        var userId = state.session ? state.session.user.id : '';
        var previewsPath = userId + '/previews/' + msg.sourceId + '/';
        var { data: previews } = await state.supabase.storage.from(LIBRARY_BUCKET).list(previewsPath, { limit: 10 });
        var pathsToDelete = [src.source_path];
        if (previews && previews.length > 0) {
          previews.forEach(function(p) { pathsToDelete.push(previewsPath + p.name); });
        }
        await state.supabase.storage.from(LIBRARY_BUCKET).remove(pathsToDelete);
      }
      await state.supabase.from('vf_source_files').delete().eq('id', msg.sourceId);
      // 立即从内存移除，无需等 Supabase 复制
      state.librarySources = state.librarySources.filter(function(s) { return s.id !== msg.sourceId; });
      state.libraryPreviews = state.libraryPreviews.filter(function(p) { return p.source_file_id !== msg.sourceId; });
    } catch (error) {
      console.warn('Template delete failed:', error);
    }
  }

  async function handleFetchTemplates(sourceWindow) {
    if (state.localPreview || !state.supabase) {
      try { sourceWindow.postMessage({ type: 'vf:templates-loaded', templates: [] }, location.origin); } catch (e) {}
      return;
    }
    try {
      var { data: sources, error } = await state.supabase.from('vf_source_files')
        .select('id, title, tags, source_path')
        .contains('tags', ['vf:kind:template'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      // 查询所有预览图
      var sourceIds = (sources || []).map(function(s) { return s.id; });
      var previewMap = {};
      if (sourceIds.length > 0) {
        var { data: previews } = await state.supabase.from('vf_asset_previews')
          .select('source_file_id, preview_path, width, height')
          .in('source_file_id', sourceIds)
          .order('sort_order', { ascending: true })
          .limit(sourceIds.length || 50);
        var previewDims = {}; // { sourceId: { w, h } }
        if (previews) {
          // 每个 source 取第一个预览图
          var seen = {};
          previews.forEach(function(p) {
            if (!seen[p.source_file_id] && p.preview_path) {
              seen[p.source_file_id] = true;
              previewMap[p.source_file_id] = p.preview_path;
              if (p.width && p.height) previewDims[p.source_file_id] = { w: p.width, h: p.height };
            }
          });
        }
      }
      // 先发元数据（不包含预览 URL），再后台下载预览图 + JSON
      var templates = [];
      for (var i = 0; i < (sources || []).length; i++) {
        var s = sources[i];
        var t = s.tags || [];
        var templateType = 'layout';
        if ((t.includes('标签') && t.includes('组件')) || t.includes('标签组')) templateType = 'tagcombo';
        else if (t.includes('LOGO') || t.includes('Logo') || t.includes('背景') || t.includes('KIKI') || t.includes('其他素材') || t.includes('品牌圆弧')) templateType = 'logo';
        else if (t.includes('社媒物料') || t.includes('C端物料') || t.includes('模版') || t.includes('版式') || t.includes('套组') || t.includes('静态模板')) templateType = 'layout';
        var dims = previewDims[s.id] || {};
        templates.push({ id: s.id, name: s.title, templateType: templateType, tags: t, previewW: dims.w || 0, previewH: dims.h || 0 });
      }
      sourceWindow.postMessage({ type: 'vf:templates-loaded', templates: templates }, location.origin);
      // 后台逐个下载预览图（转 data URL）+ JSON 并推送
      for (var j = 0; j < (sources || []).length; j++) {
        var src = sources[j];
        // 下载预览图
        var previewPath = previewMap[src.id];
        var previewDataUrl = '';
        if (previewPath) {
          if (state.libraryPreviewUrls && state.libraryPreviewUrls[previewPath]) {
            previewDataUrl = state.libraryPreviewUrls[previewPath];
          } else {
            try {
              var { data: pBlob } = await state.supabase.storage.from(LIBRARY_BUCKET).download(previewPath);
              if (pBlob) {
                previewDataUrl = await new Promise(function(resolve) {
                  var reader = new FileReader();
                  reader.onload = function() { resolve(reader.result); };
                  reader.onerror = function() { resolve(''); };
                  reader.readAsDataURL(pBlob);
                });
              }
            } catch(e) {}
          }
        }
        if (previewDataUrl) {
          sourceWindow.postMessage({ type: 'vf:template-preview', id: src.id, previewUrl: previewDataUrl }, location.origin);
        }
        // 下载 JSON 数据
        try {
          var { data: blob } = await state.supabase.storage.from(LIBRARY_BUCKET).download(src.source_path);
          if (!blob) continue;
          var json = JSON.parse(await blob.text());
          sourceWindow.postMessage({ type: 'vf:template-data', id: src.id, data: json }, location.origin);
        } catch (e) {}
      }
    } catch (error) {
      try { sourceWindow.postMessage({ type: 'vf:templates-loaded', templates: [], error: error.message }, location.origin); } catch (e) {}
    }
  }

  async function handleSaveSharedAssets(msg, sourceWindow) {
    if (!state.supabase) {
      try { sourceWindow.postMessage({ type: 'vf:shared-assets-saved', success: false, message: 'Supabase 未初始化' }, location.origin); } catch (e) {}
      return;
    }
    try {
      var payload = msg.payload || {};
      var jsonStr = JSON.stringify(payload, null, 2);
      var jsonBlob = new Blob([jsonStr], { type: 'application/json' });
      var file = new File([jsonBlob], 'shared-assets.json', { type: 'application/json' });
      var upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload('static/shared-assets.json', file, { upsert: true, contentType: 'application/json' });
      if (upload.error) throw upload.error;
      try { sourceWindow.postMessage({ type: 'vf:shared-assets-saved', success: true }, location.origin); } catch (e) {}
    } catch (error) {
      try { sourceWindow.postMessage({ type: 'vf:shared-assets-saved', success: false, message: error.message || '保存失败' }, location.origin); } catch (e) {}
    }
  }

  // 如果当前在素材库页面，自动刷新数据
  async function refreshLibraryIfOpen() {
    if (state.route === 'library') {
      try {
        await loadLibraryData();
        refreshKindTabCounts();
        renderLibraryGrid();
      } catch(e) { /* 静默 */ }
    }
  }

  // 图片 Blob 压缩到目标大小以下
  function compressImageBlob(blob, maxBytes) {
    return new Promise(function(resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function() {
        URL.revokeObjectURL(url);
        var canvas = document.createElement('canvas');
        var w = img.width, h = img.height;
        // 逐步缩小直到满足大小
        var quality = 0.9;
        var attempt = 0;
        function tryCompress() {
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(function(compressed) {
            if (!compressed) { resolve(blob); return; }
            if (compressed.size <= maxBytes || attempt > 5) { resolve(compressed); return; }
            // 缩小尺寸并降低质量
            w = Math.floor(w * 0.7); h = Math.floor(h * 0.7);
            quality = Math.max(0.3, quality - 0.1);
            attempt++;
            tryCompress();
          }, 'image/jpeg', quality);
        }
        tryCompress();
      };
      img.onerror = function() { URL.revokeObjectURL(url); resolve(blob); };
      img.src = url;
    });
  }
  // ===== 模板同步结束 =====

  async function saveProject(event) {
    event.preventDefault();
    const submitButton = event.submitter || els.projectForm.querySelector('button[type="submit"]');
    const originalSubmitText = submitButton?.textContent || '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = state.lang === 'zh' ? '保存中...' : 'Saving...';
    }
    const title = els.projectTitleInput.value.trim();
    const projectType = state.route === 'dynamic' ? 'dynamic' : 'static';
    setMessage(els.projectModalMessage, state.lang === 'zh' ? '正在保存...' : 'Saving...');
    let dataPath = '';
    let uploadedProjectFile = false;
    try {
      const snapshot = await captureProjectSnapshot(projectType);
      validateProjectSnapshot(snapshot, projectType);
      if (state.localPreview || !state.supabase) {
        saveLocalProject(title, projectType, snapshot);
        setMessage(els.projectModalMessage, state.lang === 'zh' ? '已保存到本地预览记录。' : 'Saved to local preview.', false, true);
        setTimeout(closeProjectModal, 700);
        return;
      }
      const id = crypto.randomUUID();
      dataPath = `${state.session.user.id}/${id}.json`;
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const upload = await state.supabase.storage.from('vf-projects').upload(dataPath, blob, {
        contentType: 'application/json',
        upsert: true
      });
      if (upload.error) throw upload.error;
      uploadedProjectFile = true;
      const meta = {
        schema: snapshot.schema,
        toolType: snapshot.toolType,
        exportedAt: snapshot.exportedAt,
        exportError: snapshot.exportError || null,
        layerCount: snapshot.layerCount || snapshot.editorState?.layers?.length || 0
      };
      const insert = await state.supabase.from('vf_projects').insert([{
        id,
        title,
        project_type: projectType,
        data_path: dataPath,
        snapshot_meta: meta
      }]);
      if (insert.error) throw insert.error;
      setMessage(els.projectModalMessage, state.lang === 'zh' ? '项目已保存到云端。' : 'Project saved to cloud.', false, true);
      setTimeout(closeProjectModal, 700);
    } catch (error) {
      if (uploadedProjectFile && dataPath && state.supabase) {
        try {
          await state.supabase.storage.from('vf-projects').remove([dataPath]);
        } catch (cleanupError) {
          console.warn('Project upload cleanup failed:', cleanupError);
        }
      }
      setMessage(els.projectModalMessage, error.message, true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitText;
      }
    }
  }

  async function captureProjectSnapshot(projectType) {
    const frame = state.activeFrame;
    const base = {
      schema: 'vf-project-snapshot/v1',
      toolType: projectType,
      exportedAt: new Date().toISOString(),
      capturedBy: state.profile?.id || 'unknown'
    };
    if (!frame || !frame.contentWindow) {
      return { ...base, exportError: 'Tool frame is not available.' };
    }
    try {
      await waitForToolExporter();
      if (typeof frame.contentWindow.VF_EXPORT_PROJECT === 'function') {
        return await frame.contentWindow.VF_EXPORT_PROJECT();
      }
    } catch (error) {
      return { ...base, exportError: error.message };
    }
    return { ...base, exportError: 'Tool bridge is not ready yet.' };
  }

  function waitForToolExporter(timeoutMs = 10000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try {
          if (state.activeFrame?.contentWindow && typeof state.activeFrame.contentWindow.VF_EXPORT_PROJECT === 'function') {
            resolve();
            return;
          }
        } catch (_error) {}
        if (Date.now() - start > timeoutMs) {
          reject(new Error(state.lang === 'zh' ? '编辑器保存桥接还没有准备好，请稍后再试。' : 'The editor save bridge is not ready yet. Please try again.'));
          return;
        }
        setTimeout(tick, 120);
      };
      tick();
    });
  }

  function waitForToolTemplateExporter(timeoutMs = 10000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try {
          if (state.activeFrame?.contentWindow && typeof state.activeFrame.contentWindow.VF_EXPORT_TEMPLATE_ASSET === 'function') {
            resolve();
            return;
          }
        } catch (_error) {}
        if (Date.now() - start > timeoutMs) {
          reject(new Error(state.lang === 'zh' ? '静态设计师模板导出还没有准备好，请稍后再试。' : 'The Static Designer template exporter is not ready yet.'));
          return;
        }
        setTimeout(tick, 120);
      };
      tick();
    });
  }

  function validateProjectSnapshot(snapshot, projectType) {
    if (!snapshot || snapshot.schema !== 'vf-project-snapshot/v1') {
      throw new Error(state.lang === 'zh' ? '没有拿到可保存的项目快照。' : 'No valid project snapshot was captured.');
    }
    if (snapshot.toolType && snapshot.toolType !== projectType) {
      throw new Error(state.lang === 'zh' ? '当前编辑器类型和项目类型不一致，请刷新后再保存。' : 'The editor type does not match this project type. Refresh and save again.');
    }
    if (snapshot.exportError) {
      throw new Error(`${state.lang === 'zh' ? '项目快照未保存成功' : 'Project snapshot was not saved'}: ${snapshot.exportError}`);
    }
    if (!snapshot.editorState) {
      throw new Error(state.lang === 'zh' ? '项目缺少编辑器状态，已阻止保存。' : 'The project is missing editor state, so save was blocked.');
    }
  }

  function saveLocalProject(title, projectType, snapshot) {
    const key = 'vf_local_projects';
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    items.unshift({
      id: crypto.randomUUID(),
      title,
      project_type: projectType,
      updated_at: new Date().toISOString(),
      snapshot,
      snapshot_meta: {
        schema: snapshot.schema,
        toolType: snapshot.toolType,
        exportedAt: snapshot.exportedAt,
        exportError: snapshot.exportError || null,
        layerCount: snapshot.layerCount || snapshot.editorState?.layers?.length || 0
      }
    });
    localStorage.setItem(key, JSON.stringify(items.slice(0, 20)));
  }

  function toggleLanguage() {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('vf_lang', state.lang);
    refreshTranslations();
    renderUserChip();
    navigate(state.route);
  }

  function refreshTranslations() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n);
    });
    els.langToggle.textContent = state.lang === 'zh' ? 'EN' : '中文';
  }

  function currentRole() {
    return state.profile?.role || 'operator';
  }

  function roleLabel(role) {
    return ROLE_LABELS[state.lang][role] || role;
  }

  function visibilityLabel(value) {
    if (value === 'designers') return t('designersOnly');
    if (value === 'operators') return t('operatorsOnly');
    return t('allVisible');
  }

  function sourceFileLabel(source) {
    return (source?.source_ext || fileExt(source?.source_filename) || 'file').toUpperCase();
  }

  function formatDimensions(preview) {
    if (!preview?.width || !preview?.height) return '';
    return `${preview.width} x ${preview.height}`;
  }

  function previewAspectStyle(preview) {
    if (!preview?.width || !preview?.height) return '';
    const ratio = preview.width / preview.height;
    return `aspect-ratio: ${ratio.toFixed(3)};`;
  }

  function showLoginMessage(message, isError) {
    setMessage(els.loginMessage, message, isError);
  }

  function setMessage(element, message, isError, isSuccess) {
    element.textContent = message || '';
    element.className = `message${isError ? ' error' : ''}${isSuccess ? ' success' : ''}`;
  }

  function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString(state.lang === 'zh' ? 'zh-CN' : 'en-US');
  }

  function formatFileSize(value) {
    const size = Number(value || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

})();
