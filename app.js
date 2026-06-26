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
    { id: 'admin', icon: 'admin', title: 'admin', adminOnly: true }
  ];

  const config = window.VF_CONFIG || {};
  const LIBRARY_BUCKET = 'vf-library';
  const TOOL_UI_VERSION = '20260626-home-kiki3';
  const LIBRARY_SOURCE_PAGE_SIZE = 500;
  const LIBRARY_SOURCE_MAX_ROWS = 5000;
  const LIBRARY_RENDER_STEP = 80;
  const SUPABASE_IN_BATCH_SIZE = 200;
  const SIGNED_URL_BATCH_SIZE = 100;
  const SOURCE_EXTENSIONS = ['psd', 'ai', 'pdf'];
  const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
  const PREVIEW_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const TEMPLATE_EXTENSIONS = ['json'];
  const LIBRARY_KIND_MARKERS = {
    gallery: 'vf:kind:gallery',
    source: 'vf:kind:source',
    template: 'vf:kind:template'
  };
  const LIBRARY_KIND_TABS = [
    { id: 'all', zh: '全部', en: 'All' },
    { id: 'source', zh: '源文件库', en: 'Source Files' },
    { id: 'gallery', zh: '图库', en: 'Gallery' },
    { id: 'template', zh: '模板库', en: 'Templates' }
  ];
  const LIBRARY_TAGS = {
    gallery: {
      tag1: ['未分类', '沙特阿拉伯', '阿联酋', '卡塔尔', '科威特', '巴林', '阿曼'],
      tag2: ['未分类', '虚拟食物', '商家食物', 'Logo素材', 'kiki素材', '其他素材'],
      tag3ByTag2: {
        '虚拟食物': ['未分类', '汉堡', '披萨', '阿拉伯菜', '三明治', '小吃', '健康餐', '烧烤', '甜品', '饮品'],
        '商家食物': ['未分类', '汉堡', '披萨', '阿拉伯菜', '三明治', '小吃', '健康餐', '烧烤', '甜品', '饮品']
      }
    },
    source: {
      tag1: ['未分类', '沙特阿拉伯', '阿联酋', '卡塔尔', '科威特', '巴林', '阿曼'],
      tag2: ['未分类', '日常运营', '大促营销', '异业合作', '品牌规范'],
      tag3: ['未分类', 'C端', 'B端', 'D端', 'M端'],
      tag4ByTag3: {
        'C端': ['头图', 'banner', '弹窗', '其他'],
        'M端': ['OB', 'OOH', '社媒物料', '其他']
      }
    },
    template: {
      tag1: ['未分类', '沙特阿拉伯', '阿联酋', '卡塔尔', '科威特', '巴林', '阿曼'],
      tag2: ['未分类', '静态模板', '动态模板'],
      tag3ByTag2: {
        '静态模板': ['头图', 'banner', '弹窗', '社媒物料', '其他'],
        '动态模板': ['弹窗', '社媒物料', '其他']
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
      favorites: false
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
    if (state.route === 'library') renderLibrary();
    if (state.route === 'static') renderTool('static');
    if (state.route === 'dynamic') renderTool('dynamic');
    if (state.route === 'request') renderRequestFlow();
    if (state.route === 'admin') renderAdmin();
  }

  function navIcon(icon) {
    const icons = {
      home: '<svg viewBox="0 0 24 24"><path d="M4 11.4 12 4l8 7.4"/><path d="M6.7 10.5V20h10.6v-9.5"/><path d="M9.6 20v-5.5h4.8V20"/></svg>',
      library: '<svg viewBox="0 0 24 24"><path d="M5 6.3h14v11.4H5z"/><path d="M8 3.8h8M8 20.2h8"/><path d="m8.2 15.3 2.4-2.8 2.2 2.2 1.6-1.8 2.7 3.2"/></svg>',
      static: '<svg viewBox="0 0 24 24"><rect x="4" y="4.8" width="16" height="14.4" rx="3"/><path d="M8 8.2h5.5M8 11h8"/><path d="M8 15.5h3.6l1.8-2 1.8 2H18"/></svg>',
      dynamic: '<svg viewBox="0 0 24 24"><rect x="4.4" y="5" width="15.2" height="14" rx="3"/><path d="M10 9v6l5.2-3L10 9z"/><path d="M7.5 3.8h9"/></svg>',
      request: '<svg viewBox="0 0 24 24"><path d="M5 5.5h14v10H8.5L5 19V5.5Z"/><path d="M8.5 9h7M8.5 12h4.5"/></svg>',
      admin: '<svg viewBox="0 0 24 24"><path d="M12 13.4a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M5.5 20c.9-3.2 3.1-4.8 6.5-4.8s5.6 1.6 6.5 4.8"/></svg>'
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

        <section class="library-control-strip">
          <div class="library-kind-tabs" role="tablist">
            ${LIBRARY_KIND_TABS.map(tab => `<button type="button" class="${activeKind === tab.id ? 'active' : ''}" data-library-kind="${tab.id}">${escapeHtml(state.lang === 'zh' ? tab.zh : tab.en)}</button>`).join('')}
          </div>
          <div class="library-upload-area">
            ${canUpload ? `<button class="library-upload-pill" type="button" id="open-upload-modal">${state.lang === 'zh' ? '上传素材 +' : 'Upload +'}</button>` : ''}
          </div>
          <button class="ghost-btn" type="button" id="library-favorite-filter">${state.libraryFilters.favorites ? t('favoritesOnly') : t('allAssets')}</button>
          <div id="library-tag-rows" class="library-tag-rows">${renderLibraryTagRows(activeKind)}</div>
          <label class="library-search-pill" aria-label="${state.lang === 'zh' ? '搜索内容' : 'Search'}">
            <input id="library-search" placeholder="${state.lang === 'zh' ? '搜索内容' : 'Search content'}" value="${escapeAttr(state.libraryFilters.query)}">
            <span>⌕</span>
          </label>
        </section>

        <section id="library-status" class="library-status">${state.lang === 'zh' ? '正在读取素材库...' : 'Loading library...'}</section>
        <section class="library-board">
          <section id="library-grid" class="library-grid"></section>
          <aside id="library-inspector" class="library-inspector"></aside>
        </section>

        ${canUpload ? renderUploadModal() : ''}
        ${renderEditModal()}
      </div>
    `;
    wireLibraryShell();
    await loadLibraryData();
  }

  function renderUploadModal() {
    const defaultKind = state.libraryFilters.kind === 'source' ? 'source' : 'gallery';
    return `
      <div id="library-upload-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal">
          <div class="modal-head">
            <h3>${state.lang === 'zh' ? '上传素材' : 'Upload Asset'}</h3>
            <button class="icon-btn" id="close-library-upload" type="button" aria-label="Close">x</button>
          </div>
          <form id="library-upload-form" class="library-form">
            <input type="hidden" name="library_kind" id="library-upload-kind" value="${defaultKind}">
            <div class="library-upload-scroll">
              <div class="library-upload-section">
                <span>${state.lang === 'zh' ? '入库位置' : 'Library section'}</span>
                <div class="library-kind-card-grid" role="radiogroup" aria-label="${state.lang === 'zh' ? '入库位置' : 'Library section'}">
                  <button type="button" class="library-kind-card ${defaultKind === 'gallery' ? 'active' : ''}" data-upload-kind-card="gallery">
                    <strong>${state.lang === 'zh' ? '图库' : 'Gallery'}</strong>
                    <small>${state.lang === 'zh' ? 'JPG / PNG / WEBP，可多选' : 'JPG / PNG / WEBP, multiple allowed'}</small>
                  </button>
                  <button type="button" class="library-kind-card ${defaultKind === 'source' ? 'active' : ''}" data-upload-kind-card="source">
                    <strong>${state.lang === 'zh' ? '源文件库' : 'Source Files'}</strong>
                    <small>${state.lang === 'zh' ? 'PSD / AI / PDF + 预览图' : 'PSD / AI / PDF + previews'}</small>
                  </button>
                </div>
              </div>
              <label><span>${state.lang === 'zh' ? '素材名称' : 'Asset title'}</span><input name="title" id="library-upload-title" maxlength="120" required></label>
              <div id="library-upload-tag-controls" class="library-upload-tags">${renderUploadTagControls(defaultKind)}</div>
              <div class="library-form-grid two">
                <label><span>${t('visibility')}</span><select name="visibility"><option value="all">${t('allVisible')}</option></select></label>
                <label><span>${state.lang === 'zh' ? '标签' : 'Tags'}</span><input name="tags" placeholder="${state.lang === 'zh' ? '用逗号分隔，可选' : 'Comma separated, optional'}"></label>
              </div>
              <label class="library-drop-zone" data-upload-mode="gallery" data-drop-input="library-gallery-input">
                <input name="gallery_files" id="library-gallery-input" type="file" accept="image/jpeg,image/png,image/webp" multiple>
                <span>${state.lang === 'zh' ? '图库图片' : 'Gallery images'}</span>
                <strong>${state.lang === 'zh' ? '拖拽 JPG / PNG / WEBP 到这里，可多选' : 'Drop JPG / PNG / WEBP here, multiple allowed'}</strong>
                <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No files selected'}</small>
              </label>
              <label class="library-drop-zone" data-upload-mode="source" data-drop-input="library-source-input">
                <input name="source_file" id="library-source-input" type="file" accept=".psd,.ai,.pdf,application/pdf">
                <span>${state.lang === 'zh' ? '源文件' : 'Source file'}</span>
                <strong>${state.lang === 'zh' ? '拖拽 1 个 PSD / AI / PDF 到这里' : 'Drop one PSD / AI / PDF here'}</strong>
                <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No file selected'}</small>
              </label>
              <label class="library-drop-zone" data-upload-mode="source" data-drop-input="library-preview-input">
                <input name="preview_files" id="library-preview-input" type="file" accept="image/jpeg,image/png,image/webp" multiple>
                <span>${state.lang === 'zh' ? '预览图' : 'Preview images'}</span>
                <strong>${state.lang === 'zh' ? '拖拽 1-5 张 JPG / PNG / WEBP 到这里' : 'Drop 1-5 JPG / PNG / WEBP files here'}</strong>
                <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No files selected'}</small>
              </label>
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
    return uploadLibraryTagRows(kind).map(row => `
      <div class="upload-tag-picker" data-upload-tag-picker="${row.key}">
        <span>${escapeHtml(row.label)}</span>
        <input type="hidden" name="${row.key}" value="all" data-upload-tag-input="${row.key}">
        <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="${row.key}">
          <strong>${escapeHtml(emptyLabel)}</strong>
          <small>${state.lang === 'zh' ? '悬浮选择' : 'Hover to choose'}</small>
        </button>
        <div class="upload-tag-menu" role="menu">
          ${['all', ...row.values].map(value => {
            const label = value === 'all' ? emptyLabel : value;
            return `<button type="button" class="${value === 'all' ? 'active' : ''}" data-upload-tag-option="${row.key}" data-upload-tag-value="${escapeAttr(value)}">${escapeHtml(label)}</button>`;
          }).join('')}
        </div>
      </div>
    `).join('');
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
        <section class="modal library-modal">
          <div class="modal-head">
            <h3>${state.lang === 'zh' ? '编辑素材信息' : 'Edit Asset'}</h3>
            <button class="icon-btn" id="close-library-edit" type="button" aria-label="Close">x</button>
          </div>
          <form id="library-edit-form" class="library-form">
            <input type="hidden" name="id">
            <input type="hidden" name="library_kind">
            <label><span>${state.lang === 'zh' ? '素材名称' : 'Asset title'}</span><input name="title" maxlength="120" required></label>
            <div class="library-form-grid two">
              <label><span>${state.lang === 'zh' ? '所在库' : 'Library section'}</span><input name="kind_label" readonly></label>
              <label><span>${t('visibility')}</span><select name="visibility"><option value="all">${t('allVisible')}</option></select></label>
            </div>
            <div class="library-form-grid">
              <label><span>${state.lang === 'zh' ? '标签' : 'Tags'}</span><input name="tags" placeholder="${state.lang === 'zh' ? '用逗号分隔' : 'Comma separated'}"></label>
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
        state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
        document.querySelectorAll('[data-library-kind]').forEach(item => item.classList.toggle('active', item.dataset.libraryKind === state.libraryFilters.kind));
        document.getElementById('library-tag-rows').innerHTML = renderLibraryTagRows(state.libraryFilters.kind || 'all');
        wireLibraryTagButtons();
        renderLibraryGrid();
      });
    });
    wireLibraryTagButtons();
    document.getElementById('open-upload-modal')?.addEventListener('click', openLibraryUploadModal);
    document.getElementById('close-library-upload')?.addEventListener('click', closeLibraryUploadModal);
    document.getElementById('cancel-library-upload')?.addEventListener('click', closeLibraryUploadModal);
    document.getElementById('library-upload-form')?.addEventListener('submit', uploadLibraryAsset);
    wireLibraryUploadDrops();
    wireLibraryUploadKindCards();
    wireUploadTagPickers();
    document.querySelectorAll('[data-upload-kind-card]').forEach(button => {
      button.addEventListener('click', () => {
        const kind = button.dataset.uploadKindCard === 'gallery' ? 'gallery' : 'source';
        const input = document.getElementById('library-upload-kind');
        if (input) input.value = kind;
        document.getElementById('library-upload-tag-controls').innerHTML = renderUploadTagControls(kind);
        updateLibraryUploadMode(kind);
        wireLibraryUploadKindCards();
        wireUploadTagPickers();
      });
    });
    document.getElementById('close-library-edit')?.addEventListener('click', closeLibraryEditModal);
    document.getElementById('cancel-library-edit')?.addEventListener('click', closeLibraryEditModal);
    document.getElementById('library-edit-form')?.addEventListener('submit', saveLibraryEdit);
    document.getElementById('library-search')?.addEventListener('input', event => {
      state.libraryFilters.query = event.target.value.trim();
      state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
      renderLibraryGrid();
    });
    document.getElementById('library-hero-search')?.addEventListener('input', event => {
      state.libraryFilters.query = event.target.value.trim();
      const search = document.getElementById('library-search');
      if (search) search.value = state.libraryFilters.query;
      state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
      renderLibraryGrid();
    });
    document.getElementById('library-favorite-filter')?.addEventListener('click', () => {
      state.libraryFilters.favorites = !state.libraryFilters.favorites;
      state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
      const button = document.getElementById('library-favorite-filter');
      if (button) button.textContent = state.libraryFilters.favorites ? t('favoritesOnly') : t('allAssets');
      renderLibraryGrid();
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
        renderLibraryGrid();
        document.getElementById('library-tag-rows').innerHTML = renderLibraryTagRows(state.libraryFilters.kind || 'all');
        wireLibraryTagButtons();
      });
    });
  }

  function renderLibraryTagRows(kind) {
    if (!kind || kind === 'all') return '';
    const rows = libraryTagRows(kind);
    return rows.map(row => `
      <div class="library-tag-row">
        <span>${escapeHtml(row.label)}</span>
        <div>
          ${['all', ...row.values].map(value => {
            const label = value === 'all' ? (state.lang === 'zh' ? '全部' : 'All') : value;
            const active = (state.libraryFilters[row.key] || 'all') === value;
            return `<button type="button" class="${active ? 'active' : ''}" data-library-tag-key="${row.key}" data-library-tag-value="${escapeAttr(value)}">${escapeHtml(label)}</button>`;
          }).join('')}
        </div>
      </div>
    `).join('');
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
    const tag2 = state.libraryFilters.tag2;
    const tag3 = state.libraryFilters.tag3;
    if (config.tag3ByTag2?.[tag2]) rows.push({ key: 'tag3', label: labels.tag3, values: config.tag3ByTag2[tag2] });
    if (config.tag4ByTag3?.[tag3]) rows.push({ key: 'tag4', label: labels.tag4, values: config.tag4ByTag3[tag3] });
    return rows;
  }

  async function loadLibraryData() {
    const status = document.getElementById('library-status');
    if (!state.localPreview && state.libraryDataLoaded) {
      renderLibrarySelects();
      renderLibraryGrid();
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
    const paths = items.map(item => item.preview.preview_path).filter(path => path && !state.libraryPreviewUrls[path]);
    if (!paths.length) return;
    try {
      await signLibraryPreviewUrls(paths);
      if (document.getElementById('library-grid')) renderLibraryGrid();
    } catch (error) {
      console.warn('Preview signing failed:', error);
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
    ['upload', 'edit'].forEach(prefix => {
      ['country', 'activity', 'category'].forEach(type => {
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
      .map(preview => ({ preview, source: sourcesById.get(preview.source_file_id), url: state.libraryPreviewUrls[preview.preview_path] || '' }))
      .filter(item => item.source)
      .filter(item => {
        const kind = libraryKindOfSource(item.source);
        return state.libraryFilters.kind === 'all' || state.libraryFilters.kind === kind;
      })
      .filter(item => {
        return selectedLibraryTagValues().every(tag => visibleLibraryTags(item.source).includes(tag));
      })
      .filter(item => !state.libraryFilters.favorites || state.libraryFavorites.has(item.preview.id))
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
    const visibleItems = state.libraryItems.slice(0, state.libraryVisibleLimit);
    const hasMore = visibleItems.length < state.libraryItems.length;
    const counts = countLibraryKinds();
    const sourceBadge = state.libraryRecoveryLabel
      ? `<span class="library-stat recovery"><small>${state.lang === 'zh' ? '来源' : 'Source'}</small><strong>${escapeHtml(state.libraryRecoveryLabel)}</strong></span>`
      : '';
    status.innerHTML = `
      ${sourceBadge}
      <span class="library-stat"><small>${state.lang === 'zh' ? '当前展示' : 'Showing'}</small><strong>${visibleItems.length}/${state.libraryItems.length}</strong></span>
      <span class="library-stat"><small>${state.lang === 'zh' ? '图库' : 'Gallery'}</small><strong>${counts.gallery}</strong></span>
      <span class="library-stat"><small>${state.lang === 'zh' ? '源文件库' : 'Sources'}</small><strong>${counts.source}</strong></span>
      <span class="library-stat"><small>${state.lang === 'zh' ? '模板库' : 'Templates'}</small><strong>${counts.template}</strong></span>
    `;
    if (visibleItems.length === 0) {
      state.librarySelectedPreviewId = '';
      grid.innerHTML = `<div class="empty-card">
        <strong>${state.lang === 'zh' ? '还没有符合条件的素材' : 'No matching assets'}</strong>
        <span>${state.lang === 'zh' ? '可以先上传图库图片或源文件素材。模板库素材从静态设计师保存进入。' : 'Upload gallery images or source assets first. Templates come from Static Designer.'}</span>
      </div>`;
      renderLibraryInspector();
      return;
    }
    if (!visibleItems.some(item => item.preview.id === state.librarySelectedPreviewId)) {
      state.librarySelectedPreviewId = visibleItems[0].preview.id;
    }
    grid.innerHTML = `
      ${visibleItems.map(renderLibraryCard).join('')}
      ${hasMore ? `<button class="library-load-more" id="library-load-more" type="button">${state.lang === 'zh' ? `加载更多 ${Math.min(LIBRARY_RENDER_STEP, state.libraryItems.length - visibleItems.length)} 个` : `Load ${Math.min(LIBRARY_RENDER_STEP, state.libraryItems.length - visibleItems.length)} more`}</button>` : ''}
    `;
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
          <span class="file-pill">${escapeHtml(ext)}</span>
          <button class="favorite-btn ${favorite ? 'active' : ''}" type="button" data-action="favorite" title="${state.lang === 'zh' ? '收藏' : 'Favorite'}">${favorite ? '★' : '☆'}</button>
          <div class="library-thumb" style="${thumbStyle}">${item.url ? `<img src="${escapeAttr(item.url)}" alt="${escapeAttr(source.title)}">` : `<span>${state.lang === 'zh' ? '预览生成中' : 'Preview'}</span>`}</div>
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
      card.addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        if (!button) {
          selectLibraryItem(card.dataset.previewId);
          return;
        }
        const item = libraryItemByPreviewId(card.dataset.previewId);
        if (!item) return;
        handleLibraryCardAction(button.dataset.action, item);
      });
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectLibraryItem(card.dataset.previewId);
      });
    });
  }

  function selectLibraryItem(previewId) {
    state.librarySelectedPreviewId = previewId || '';
    document.querySelectorAll('.library-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.previewId === state.librarySelectedPreviewId);
    });
    renderLibraryInspector();
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
      kind === 'gallery' ? `<button class="primary-btn" type="button" data-preview-id="${preview.id}" data-action="use-static">${state.lang === 'zh' ? '带入静态 DIY' : 'Use in Static'}</button>` : '',
      kind === 'gallery' ? `<button class="secondary-btn" type="button" data-preview-id="${preview.id}" data-action="use-dynamic">${state.lang === 'zh' ? '带入动态 DIY' : 'Use in Motion'}</button>` : '',
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
          ${primaryActions ? `<div class="inspector-actions">${primaryActions}</div>` : `<div class="inspector-note">${state.lang === 'zh' ? '源文件库用于团队下载与归档，暂不直接带入编辑器。' : 'Source assets are for team download and archive, not direct editor import.'}</div>`}
          <dl class="inspector-list">
            <div><dt>${state.lang === 'zh' ? '所在库' : 'Section'}</dt><dd>${escapeHtml(libraryKindLabel(kind))}</dd></div>
            <div><dt>${state.lang === 'zh' ? '标签' : 'Tags'}</dt><dd>${tags.length ? escapeHtml(tags.join(' / ')) : '-'}</dd></div>
            <div><dt>${state.lang === 'zh' ? '文件类型' : 'File type'}</dt><dd>${escapeHtml(sourceFileLabel(source))}</dd></div>
            <div><dt>${state.lang === 'zh' ? '可见范围' : 'Visibility'}</dt><dd>${visibilityLabel(source.visibility)}</dd></div>
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

  function openLibraryUploadModal() {
    renderLibrarySelects();
    const form = document.getElementById('library-upload-form');
    form.reset();
    const defaultKind = state.libraryFilters.kind === 'source' ? 'source' : 'gallery';
    const kindInput = document.getElementById('library-upload-kind');
    if (kindInput) kindInput.value = defaultKind;
    const tagControls = document.getElementById('library-upload-tag-controls');
    if (tagControls) tagControls.innerHTML = renderUploadTagControls(defaultKind);
    document.getElementById('library-upload-title').value = '';
    document.getElementById('library-upload-message').textContent = '';
    document.getElementById('library-upload-modal').hidden = false;
    document.querySelector('.library-upload-scroll')?.scrollTo({ top: 0, behavior: 'auto' });
    updateLibraryUploadMode(defaultKind);
    wireLibraryUploadKindCards();
    wireUploadTagPickers();
    document.querySelectorAll('.library-drop-zone').forEach(zone => updateDropZoneSummary(zone, []));
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
  }

  function wireLibraryUploadKindCards() {
    const kind = document.getElementById('library-upload-kind')?.value || 'source';
    updateLibraryUploadMode(kind);
  }

  function wireUploadTagPickers() {
    document.querySelectorAll('[data-upload-tag-option]').forEach(button => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const key = button.dataset.uploadTagOption;
        const value = button.dataset.uploadTagValue || 'all';
        const picker = button.closest('[data-upload-tag-picker]');
        const input = document.querySelector(`[data-upload-tag-input="${key}"]`);
        if (input) input.value = value;
        if (picker) {
          picker.querySelectorAll('[data-upload-tag-option]').forEach(option => option.classList.toggle('active', option === button));
          const label = value === 'all' ? (state.lang === 'zh' ? '未分类' : 'Unclassified') : value;
          const triggerLabel = picker.querySelector('[data-upload-tag-trigger] strong');
          if (triggerLabel) triggerLabel.textContent = label;
        }
      });
    });
  }

  function wireLibraryUploadDrops() {
    document.querySelectorAll('.library-drop-zone').forEach(zone => {
      const input = document.getElementById(zone.dataset.dropInput);
      if (!input) return;
      input.addEventListener('change', () => updateDropZoneSummary(zone, input.files));
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
        const dt = new DataTransfer();
        const maxFiles = input.multiple ? files.length : 1;
        files.slice(0, maxFiles).forEach(file => dt.items.add(file));
        input.files = dt.files;
        updateDropZoneSummary(zone, input.files);
        const titleInput = document.getElementById('library-upload-title');
        if (titleInput && !titleInput.value.trim() && input.id !== 'library-preview-input') {
          titleInput.value = stripExtension(files[0].name);
        }
      });
    });
  }

  function updateDropZoneSummary(zone, fileList) {
    const files = Array.from(fileList || []);
    const summary = zone.querySelector('[data-file-summary]');
    if (!summary) return;
    if (!files.length) {
      summary.textContent = state.lang === 'zh' ? '未选择文件' : 'No files selected';
      return;
    }
    const names = files.slice(0, 3).map(file => file.name).join(' / ');
    summary.textContent = files.length > 3 ? `${names} +${files.length - 3}` : names;
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
    setMessage(message, state.lang === 'zh' ? '正在上传，请不要关闭页面...' : 'Uploading, please keep this page open...');
    const uploadedPaths = [];
    let sourceInserted = false;
    let sourceId = '';
    try {
      const formData = new FormData(form);
      const libraryKind = formData.get('library_kind') === 'gallery' ? 'gallery' : 'source';
      if (libraryKind === 'gallery') {
        await uploadGalleryAssets(formData);
        setMessage(message, state.lang === 'zh' ? '图库素材已上传。' : 'Gallery assets uploaded.', false, true);
        setTimeout(closeLibraryUploadModal, 600);
        state.libraryFilters.kind = 'gallery';
        await reloadLibraryData();
        return;
      }
      const sourceFile = formData.get('source_file');
      const previewFiles = Array.from(formData.getAll('preview_files')).filter(file => file && file.size > 0);
      validateLibraryUpload(sourceFile, previewFiles);
      sourceId = crypto.randomUUID();
      const userId = state.session.user.id;
      const sourcePath = `${userId}/sources/${sourceId}/${safeStorageName(sourceFile.name)}`;
      const sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, sourceFile, { upsert: false, contentType: sourceFile.type || 'application/octet-stream' });
      if (sourceUpload.error) throw sourceUpload.error;
      uploadedPaths.push(sourcePath);
      const title = formData.get('title').trim() || stripExtension(sourceFile.name);
      const sourceRow = {
        id: sourceId,
        title,
        country_id: null,
        activity_id: null,
        category_id: null,
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
      sourceInserted = true;
      const previewRows = [];
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
      }
      const previewInsert = await state.supabase.from('vf_asset_previews').insert(previewRows);
      if (previewInsert.error) throw previewInsert.error;
      setMessage(message, state.lang === 'zh' ? '上传成功，已入库。' : 'Uploaded.', false, true);
      setTimeout(closeLibraryUploadModal, 600);
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

  async function uploadGalleryAssets(formData) {
    const files = Array.from(formData.getAll('gallery_files')).filter(file => file && file.size > 0);
    validateGalleryUpload(files);
    const userId = state.session.user.id;
    const baseTitle = formData.get('title').trim();
    const uploadedPaths = [];
    const insertedSourceIds = [];
    try {
      for (const file of files) {
        const sourceId = crypto.randomUUID();
        const sourcePath = `${userId}/sources/${sourceId}/${safeStorageName(file.name)}`;
        const sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, file, { upsert: false, contentType: file.type });
        if (sourceUpload.error) throw sourceUpload.error;
        uploadedPaths.push(sourcePath);
        const dimensions = await readImageDimensions(file);
        const title = files.length === 1 ? (baseTitle || stripExtension(file.name)) : `${baseTitle || stripExtension(file.name)} · ${stripExtension(file.name)}`;
        const sourceRow = {
          id: sourceId,
          title,
          country_id: null,
          activity_id: null,
          category_id: null,
          tags: libraryTagsForForm(formData, 'gallery'),
          visibility: formData.get('visibility') || 'all',
          source_path: sourcePath,
          source_filename: file.name,
          source_mime_type: file.type || '',
          source_size_bytes: file.size,
          source_ext: fileExt(file.name),
          uploaded_by: userId
        };
        const sourceInsert = await state.supabase.from('vf_source_files').insert([sourceRow]);
        if (sourceInsert.error) throw sourceInsert.error;
        insertedSourceIds.push(sourceId);
        const previewInsert = await state.supabase.from('vf_asset_previews').insert([{
          id: crypto.randomUUID(),
          source_file_id: sourceId,
          preview_path: sourcePath,
          preview_filename: file.name,
          preview_mime_type: file.type,
          preview_size_bytes: file.size,
          width: dimensions.width,
          height: dimensions.height,
          sort_order: 10
        }]);
        if (previewInsert.error) throw previewInsert.error;
      }
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
    if (!SOURCE_EXTENSIONS.includes(fileExt(sourceFile.name))) throw new Error(state.lang === 'zh' ? '源文件仅支持 PSD / AI / PDF。' : 'Source must be PSD / AI / PDF.');
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
    const source = state.librarySources.find(item => item.id === sourceId);
    if (!source) return;
    renderLibrarySelects();
    const form = document.getElementById('library-edit-form');
    const kind = libraryKindOfSource(source);
    form.elements.id.value = source.id;
    form.elements.library_kind.value = kind;
    form.elements.kind_label.value = libraryKindLabel(kind);
    form.elements.title.value = source.title || '';
    form.elements.visibility.value = source.visibility || 'all';
    form.elements.tags.value = visibleLibraryTags(source).join(', ');
    document.getElementById('library-edit-message').textContent = '';
    document.getElementById('library-edit-modal').hidden = false;
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
      const kind = source ? libraryKindOfSource(source) : (form.get('library_kind') || 'source');
      const update = {
        title: form.get('title').trim(),
        country_id: null,
        activity_id: null,
        category_id: null,
        visibility: form.get('visibility') || 'all',
        tags: normalizeLibraryTags(kind, parseTags(form.get('tags')))
      };
      const { error } = await state.supabase.from('vf_source_files').update(update).eq('id', id);
      if (error) throw error;
      setMessage(message, state.lang === 'zh' ? '已保存。' : 'Saved.', false, true);
      setTimeout(closeLibraryEditModal, 500);
      await reloadLibraryData();
    } catch (error) {
      setMessage(message, error.message, true);
    }
  }

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
  }

  async function toggleLibraryFavorite(item) {
    const payload = { user_id: state.session.user.id, preview_id: item.preview.id };
    if (state.libraryFavorites.has(item.preview.id)) {
      const { error } = await state.supabase.from('vf_asset_favorites').delete().eq('preview_id', item.preview.id);
      if (error) alert(error.message);
    } else {
      const { error } = await state.supabase.from('vf_asset_favorites').insert([payload]);
      if (error) alert(error.message);
    }
    await loadLibraryFavorites();
    renderLibraryGrid();
  }

  async function downloadLibraryFile(item, kind) {
    if (kind === 'source' && !canDownloadSource()) return;
    if (state.localPreview) {
      const recoveredUrl = kind === 'source'
        ? item.source.source_public_url
        : item.url;
      if (!recoveredUrl) {
        alert(state.lang === 'zh' ? '这个恢复记录缺少对应文件，暂时不能下载。' : 'This recovered record is missing its file.');
        return;
      }
      const response = await fetch(new URL(recoveredUrl, location.href).toString());
      const blob = await response.blob();
      triggerBlobDownload(blob, kind === 'source' ? item.source.source_filename : item.preview.preview_filename || 'preview.svg');
      return;
    }
    const path = kind === 'source' ? item.source.source_path : item.preview.preview_path;
    const filename = kind === 'source' ? item.source.source_filename : item.preview.preview_filename;
    const { data, error } = await state.supabase.storage.from(LIBRARY_BUCKET).download(path);
    if (error) {
      alert(error.message);
      return;
    }
    triggerBlobDownload(data, filename);
    await logAssetEvent(kind === 'source' ? 'download_source' : 'download_preview', item);
  }

  async function useLibraryAsset(item, tool) {
    const kind = libraryKindOfSource(item.source);
    if (kind === 'source') {
      alert(state.lang === 'zh' ? '源文件库素材用于下载归档，暂不直接带入编辑器。' : 'Source library assets are for download/archive and cannot be imported directly yet.');
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
      validateProjectSnapshot(snapshot, 'static');
      location.hash = 'static';
      navigate('static');
      await waitForToolImporter();
      const result = await state.activeFrame.contentWindow.VF_IMPORT_PROJECT(snapshot);
      if (!result?.success) throw new Error(result?.message || (state.lang === 'zh' ? '模板打开失败。' : 'Failed to open template.'));
      await logAssetEvent('use_template', item);
    } catch (error) {
      alert(error.message);
    }
  }

  async function loadLibraryTemplateSnapshot(item) {
    const { data, error } = await state.supabase.storage.from(LIBRARY_BUCKET).download(item.source.source_path);
    if (error) throw error;
    return JSON.parse(await data.text());
  }

  async function logAssetEvent(eventType, item) {
    if (state.localPreview || !state.supabase) return;
    try {
      await state.supabase.from('vf_asset_events').insert([{
        actor_id: state.session.user.id,
        actor_role: currentRole(),
        event_type: eventType,
        source_file_id: item.source.id,
        preview_id: item.preview.id,
        meta: {
          title: item.source.title,
          filename: eventType === 'download_source' ? item.source.source_filename : item.preview.preview_filename
        }
      }]);
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

  function libraryTagsForForm(formData, kind) {
    const tags = [];
    ['tag1', 'tag2', 'tag3', 'tag4'].forEach(key => {
      const value = String(formData.get(key) || '').trim();
      if (value && value !== 'all') tags.push(value);
    });
    tags.push(...parseTags(formData.get('tags')));
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
    const binary = atob(body || '');
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
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
        tags: normalizeLibraryTags('template', ['未分类', '静态模板']),
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
    const ratio = Math.min(1.7, Math.max(0.72, preview.width / preview.height));
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
