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
      admin: '团队管理',
      checkItem: '检查项',
      checkResult: '结果',
      checkDetail: '说明',
      ready: '已就绪',
      notReady: '未就绪',
      localOnly: '本地预览',
      saveProject: '保存项目',
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
      admin: 'Team',
      checkItem: 'Check',
      checkResult: 'Result',
      checkDetail: 'Detail',
      ready: 'Ready',
      notReady: 'Not ready',
      localOnly: 'Local only',
      saveProject: 'Save Project',
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
    { id: 'admin', icon: 'admin', title: 'admin', adminOnly: true }
  ];

  const config = window.VF_CONFIG || {};
  const LIBRARY_BUCKET = 'vf-library';
  const TOOL_UI_VERSION = '20260604-ui2';
  const SOURCE_EXTENSIONS = ['psd', 'ai', 'pdf'];
  const PREVIEW_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const state = {
    lang: localStorage.getItem('vf_lang') || 'zh',
    supabase: null,
    session: null,
    profile: null,
    localPreview: false,
    route: 'home',
    activeFrame: null,
    libraryOptions: [],
    librarySources: [],
    libraryPreviews: [],
    libraryItems: [],
    libraryPreviewUrls: {},
    libraryFavorites: new Set(),
    librarySelectedPreviewId: '',
    libraryFilters: {
      query: '',
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
      'save-project-btn', 'project-modal', 'project-form', 'project-title-input',
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

  function initSupabase() {
    if (window.supabase && config.supabaseUrl && config.supabaseAnonKey) {
      state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      state.supabase.auth.onAuthStateChange((_event, session) => {
        state.session = session;
        syncAccessToken();
      });
    }
    const canLocalPreview = config.allowLocalPreviewLogin && ['localhost', '127.0.0.1', ''].includes(location.hostname);
    els.localPreviewActions.hidden = !canLocalPreview;
  }

  async function restoreSession() {
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
    if (!state.supabase) {
      showLoginMessage('Supabase is not ready. Check config.js and network.', true);
      return;
    }
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showLoginMessage(error.message, true);
      return;
    }
    state.session = data.session;
    syncAccessToken();
    await loadProfile();
    showApp();
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

  async function signOut() {
    localStorage.removeItem('vf_access_token');
    state.session = null;
    state.profile = null;
    state.localPreview = false;
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
      .filter(route => !route.adminOnly || currentRole() === 'admin')
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
    const allowed = ROUTES.some(route => route.id === routeId && (!route.adminOnly || currentRole() === 'admin'));
    state.route = allowed ? routeId : 'home';
    els.appShell.dataset.route = state.route;
    renderNav();
    const route = ROUTES.find(item => item.id === state.route);
    els.routeKicker.textContent = state.localPreview ? 'Local Preview' : 'gccdesign.app';
    els.routeTitle.textContent = t(route.title);
    els.saveProjectBtn.hidden = !['static', 'dynamic'].includes(state.route);
    if (state.route === 'home') renderCreativeHome();
    if (state.route === 'library') renderLibrary();
    if (state.route === 'static') renderTool('static');
    if (state.route === 'dynamic') renderTool('dynamic');
    if (state.route === 'admin') renderAdmin();
  }

  function navIcon(icon) {
    const icons = {
      home: '<svg viewBox="0 0 24 24"><path d="M4 11.4 12 4l8 7.4"/><path d="M6.7 10.5V20h10.6v-9.5"/><path d="M9.6 20v-5.5h4.8V20"/></svg>',
      library: '<svg viewBox="0 0 24 24"><path d="M5 6.3h14v11.4H5z"/><path d="M8 3.8h8M8 20.2h8"/><path d="m8.2 15.3 2.4-2.8 2.2 2.2 1.6-1.8 2.7 3.2"/></svg>',
      static: '<svg viewBox="0 0 24 24"><rect x="4" y="4.8" width="16" height="14.4" rx="3"/><path d="M8 8.2h5.5M8 11h8"/><path d="M8 15.5h3.6l1.8-2 1.8 2H18"/></svg>',
      dynamic: '<svg viewBox="0 0 24 24"><rect x="4.4" y="5" width="15.2" height="14" rx="3"/><path d="M10 9v6l5.2-3L10 9z"/><path d="M7.5 3.8h9"/></svg>',
      admin: '<svg viewBox="0 0 24 24"><path d="M12 13.4a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M5.5 20c.9-3.2 3.1-4.8 6.5-4.8s5.6 1.6 6.5 4.8"/></svg>'
    };
    return icons[icon] || '';
  }

  function renderCreativeHome() {
    state.activeFrame = null;
    els.content.innerHTML = `
      <div class="home-page">
        <section class="home-composer">
          <a class="home-announcement" href="#library">
            <span>${state.lang === 'zh' ? 'GCC Creative Beta 已开放团队体验' : 'GCC Creative Beta is open for teams'}</span>
            <strong>↗</strong>
          </a>
          <div class="home-title-row">
            <span>Hey</span>
            <span class="home-aurora-mark" aria-hidden="true"></span>
            <h3>${state.lang === 'zh' ? '你的创意工作台已就绪' : 'Your creative workspace is ready'}</h3>
          </div>
          <form id="home-search-form" class="home-search">
            <textarea id="home-search-input" rows="3" placeholder="${state.lang === 'zh' ? '可以问我找素材、做海报、做动效，也可以输入国家、活动、品类' : 'Ask for assets, posters, motion, countries, campaigns, or categories'}"></textarea>
            <div class="home-search-tools">
              <div class="home-tool-switches">
                <button type="button" data-route="library">${navIcon('library')}<span>${state.lang === 'zh' ? '超级库' : 'Super Library'}</span></button>
                <button type="button" data-route="static">${navIcon('static')}<span>${state.lang === 'zh' ? '静态设计师' : 'Static Designer'}</span></button>
                <button type="button" data-route="dynamic">${navIcon('dynamic')}<span>${state.lang === 'zh' ? '动态设计师' : 'Motion Designer'}</span></button>
                <button type="button" data-placeholder="request">${state.lang === 'zh' ? '提需流程' : 'Request Flow'}</button>
              </div>
              <button class="home-submit-btn" type="submit" aria-label="${state.lang === 'zh' ? '开始' : 'Start'}">↑</button>
            </div>
          </form>
          <section class="home-tool-row">
            <article class="home-tool-card library-card-visual" data-route="library">
              <span>${state.lang === 'zh' ? '超级库' : 'Super Library'}</span>
              <strong>›</strong>
            </article>
            <article class="home-tool-card static-card-visual" data-route="static">
              <span>${state.lang === 'zh' ? '静态设计师' : 'Static Designer'}</span>
              <strong>›</strong>
            </article>
            <article class="home-tool-card dynamic-card-visual" data-route="dynamic">
              <span>${state.lang === 'zh' ? '动态设计师' : 'Motion Designer'}</span>
              <strong>›</strong>
            </article>
            <article class="home-tool-card request-card-visual" data-placeholder="request">
              <span>${state.lang === 'zh' ? '提需流程' : 'Request Flow'}</span>
              <strong>›</strong>
            </article>
          </section>
        </section>

        <section class="home-discovery">
          <div class="home-tabs">
            <button class="active" type="button">${state.lang === 'zh' ? '精选' : 'Featured'}</button>
            <button type="button">${state.lang === 'zh' ? '营销专辑' : 'Marketing'}</button>
            <button type="button">${state.lang === 'zh' ? '商业海报' : 'Posters'}</button>
            <button type="button">${state.lang === 'zh' ? '视频特效' : 'Video FX'}</button>
            <button type="button">${state.lang === 'zh' ? '大赛活动' : 'Events'}</button>
            <label class="home-mini-search">
              <input placeholder="${state.lang === 'zh' ? '搜索内容' : 'Search'}">
              <span>${navIcon('library')}</span>
            </label>
          </div>
          <div class="home-channel-row">
            <button type="button" data-query="">${state.lang === 'zh' ? '全部' : 'All'}</button>
            <button type="button" data-query="${state.lang === 'zh' ? '电商' : 'Commerce'}">${state.lang === 'zh' ? '电商营销' : 'Commerce'}</button>
            <button type="button" data-query="${state.lang === 'zh' ? '创意' : 'Creative'}">${state.lang === 'zh' ? '创意建筑' : 'Creative'}</button>
            <button type="button" data-query="${state.lang === 'zh' ? '节日' : 'Festival'}">${state.lang === 'zh' ? '热点节日' : 'Festival'}</button>
            <button type="button" data-query="${state.lang === 'zh' ? '视频' : 'Video'}">${state.lang === 'zh' ? '视频生成' : 'Video'}</button>
            <button type="button" data-query="ICON">ICON&LOGO</button>
            <button type="button" data-query="${state.lang === 'zh' ? '字体' : 'Type'}">${state.lang === 'zh' ? '字体设计' : 'Typography'}</button>
            <button type="button" data-query="${state.lang === 'zh' ? 'IP' : 'IP'}">IP${state.lang === 'zh' ? '设计' : ' Design'}</button>
            <button type="button" data-query="${state.lang === 'zh' ? '餐饮' : 'Food'}">${state.lang === 'zh' ? '餐饮营销' : 'Food'}</button>
          </div>
          <div class="home-filter-actions">
            <button type="button">${state.lang === 'zh' ? '推荐' : 'Recommended'}⌄</button>
            <button type="button">${state.lang === 'zh' ? '筛选' : 'Filter'}⌄</button>
          </div>
          <div class="home-gallery">
            ${renderHomeInspirationCard('斋月餐饮活动海报', '#031716', '#08b978', 'tall', '查看素材')}
            ${renderHomeInspirationCard('你的 AI 设计部来了', '#111111', '#9ef01a', 'short', '查看更多')}
            ${renderHomeInspirationCard('夏日清凉饮品海报', '#7dd3fc', '#facc15', 'tall', '立即创作')}
            ${renderHomeInspirationCard('青蛙 IP 系列视觉', '#d9f99d', '#84cc16', 'portrait', '查看灵感')}
            ${renderHomeInspirationCard('Travel Vlog 视觉封面', '#164e63', '#fb923c', 'short', '')}
            ${renderHomeInspirationCard('芒种节气活动主视觉', '#fef3c7', '#22c55e', 'portrait', '')}
            ${renderHomeInspirationCard('毕业季人物海报', '#166534', '#f9a8d4', 'tall', '')}
            ${renderHomeInspirationCard('门店开业宣传图', '#78350f', '#fcd34d', 'short', '')}
            ${renderHomeInspirationCard('App 弹窗动效分镜', '#1d4ed8', '#67e8f9', 'portrait', '')}
            ${renderHomeInspirationCard('周末促销社媒图', '#be123c', '#fb7185', 'tall', '')}
            ${renderHomeInspirationCard('ICON&LOGO 灵感板', '#0f172a', '#a78bfa', 'short', '')}
            ${renderHomeInspirationCard('中东新品上市图', '#0f766e', '#f97316', 'portrait', '')}
            ${renderHomeInspirationCard('品牌视觉手册封面', '#312e81', '#facc15', 'tall', '')}
            ${renderHomeInspirationCard('视频特效封面模板', '#020617', '#22d3ee', 'short', '')}
          </div>
        </section>
      </div>
    `;
    wireCreativeHome();
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
    document.querySelectorAll('.home-tool-card[data-route], .section-row button[data-route]').forEach(node => {
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
        alert(state.lang === 'zh' ? '提需流程模块已预留，后续会接入需求提交和审批。' : 'Request Flow is reserved for requirement submission and approval.');
      });
    });
    document.getElementById('home-search-form')?.addEventListener('submit', event => {
      event.preventDefault();
      state.libraryFilters.query = document.getElementById('home-search-input').value.trim();
      location.hash = 'library';
      navigate('library');
    });
  }

  async function renderLibrary() {
    state.activeFrame = null;
    const canUpload = canUploadAssets();
    els.content.innerHTML = `
      <div class="library-page">
        <section class="library-head">
          <div>
            <div class="kicker">GCC DESIGN LIBRARY</div>
            <h3>${t('library')}</h3>
            <p>${state.lang === 'zh' ? '设计师上传源文件与预览图，运营直接下载预览或带入 DIY。' : 'Designers upload sources and previews; operators use previews in DIY.'}</p>
          </div>
          <div class="library-actions">
            <span class="role-pill">${escapeHtml(roleLabel(currentRole()))}</span>
            ${canUpload ? `<button class="primary-btn" type="button" id="open-upload-modal">${t('uploadAsset')}</button>` : ''}
          </div>
        </section>

        <section class="library-filterbar panel">
          <label class="library-search-field"><span>${state.lang === 'zh' ? '搜索' : 'Search'}</span><input id="library-search" placeholder="${state.lang === 'zh' ? '搜索名称、文件名、标签' : 'Search title, filename, tags'}" value="${escapeAttr(state.libraryFilters.query)}"></label>
          <label><span>${state.lang === 'zh' ? '国家' : 'Country'}</span><select id="library-country-filter"></select></label>
          <label><span>${state.lang === 'zh' ? '活动类型' : 'Activity'}</span><select id="library-activity-filter"></select></label>
          <label><span>${state.lang === 'zh' ? '品类' : 'Category'}</span><select id="library-category-filter"></select></label>
          <button class="ghost-btn" type="button" id="library-favorite-filter">${state.libraryFilters.favorites ? t('favoritesOnly') : t('allAssets')}</button>
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
    return `
      <div id="library-upload-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal">
          <div class="modal-head">
            <h3>${state.lang === 'zh' ? '上传源文件与预览图' : 'Upload Source and Previews'}</h3>
            <button class="icon-btn" id="close-library-upload" type="button" aria-label="Close">x</button>
          </div>
          <form id="library-upload-form" class="library-form">
            <label><span>${state.lang === 'zh' ? '素材名称' : 'Asset title'}</span><input name="title" id="library-upload-title" maxlength="120" required></label>
            <div class="library-form-grid">
              <label><span>${state.lang === 'zh' ? '国家' : 'Country'}</span><select name="country_id" id="library-upload-country" required></select></label>
              <label><span>${state.lang === 'zh' ? '活动类型' : 'Activity'}</span><select name="activity_id" id="library-upload-activity" required></select></label>
              <label><span>${state.lang === 'zh' ? '品类' : 'Category'}</span><select name="category_id" id="library-upload-category" required></select></label>
            </div>
            <div class="library-form-grid two">
              <label><span>${t('visibility')}</span><select name="visibility"><option value="all">${t('allVisible')}</option><option value="designers">${t('designersOnly')}</option><option value="operators">${t('operatorsOnly')}</option></select></label>
              <label><span>${state.lang === 'zh' ? '标签' : 'Tags'}</span><input name="tags" placeholder="${state.lang === 'zh' ? '用逗号分隔，可选' : 'Comma separated, optional'}"></label>
            </div>
            <label><span>${state.lang === 'zh' ? '源文件 PSD / AI / PDF' : 'Source file PSD / AI / PDF'}</span><input name="source_file" id="library-source-input" type="file" accept=".psd,.ai,.pdf,application/pdf" required></label>
            <label><span>${state.lang === 'zh' ? '预览图 JPG / PNG / WEBP，可多选' : 'Preview images JPG / PNG / WEBP, multiple allowed'}</span><input name="preview_files" id="library-preview-input" type="file" accept="image/jpeg,image/png,image/webp" multiple required></label>
            <div id="library-upload-message" class="message"></div>
            <div class="modal-actions">
              <button class="ghost-btn" id="cancel-library-upload" type="button">${t('cancel')}</button>
              <button class="primary-btn" type="submit">${state.lang === 'zh' ? '上传入库' : 'Upload'}</button>
            </div>
          </form>
        </section>
      </div>
    `;
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
            <label><span>${state.lang === 'zh' ? '素材名称' : 'Asset title'}</span><input name="title" maxlength="120" required></label>
            <div class="library-form-grid">
              <label><span>${state.lang === 'zh' ? '国家' : 'Country'}</span><select name="country_id" id="library-edit-country" required></select></label>
              <label><span>${state.lang === 'zh' ? '活动类型' : 'Activity'}</span><select name="activity_id" id="library-edit-activity" required></select></label>
              <label><span>${state.lang === 'zh' ? '品类' : 'Category'}</span><select name="category_id" id="library-edit-category" required></select></label>
            </div>
            <div class="library-form-grid two">
              <label><span>${t('visibility')}</span><select name="visibility"><option value="all">${t('allVisible')}</option><option value="designers">${t('designersOnly')}</option><option value="operators">${t('operatorsOnly')}</option></select></label>
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
    document.getElementById('open-upload-modal')?.addEventListener('click', openLibraryUploadModal);
    document.getElementById('close-library-upload')?.addEventListener('click', closeLibraryUploadModal);
    document.getElementById('cancel-library-upload')?.addEventListener('click', closeLibraryUploadModal);
    document.getElementById('library-upload-form')?.addEventListener('submit', uploadLibraryAsset);
    document.getElementById('close-library-edit')?.addEventListener('click', closeLibraryEditModal);
    document.getElementById('cancel-library-edit')?.addEventListener('click', closeLibraryEditModal);
    document.getElementById('library-edit-form')?.addEventListener('submit', saveLibraryEdit);
    document.getElementById('library-search')?.addEventListener('input', event => {
      state.libraryFilters.query = event.target.value.trim();
      renderLibraryGrid();
    });
    document.getElementById('library-favorite-filter')?.addEventListener('click', () => {
      state.libraryFilters.favorites = !state.libraryFilters.favorites;
      renderLibrary();
    });
    ['country', 'activity', 'category'].forEach(type => {
      document.getElementById(`library-${type}-filter`)?.addEventListener('change', event => {
        state.libraryFilters[type] = event.target.value;
        loadLibraryData();
      });
    });
  }

  async function loadLibraryData() {
    const status = document.getElementById('library-status');
    try {
      if (state.localPreview || !state.supabase) {
        loadLocalLibraryDemo();
        return;
      }
      status.textContent = state.lang === 'zh' ? '正在读取分类和素材...' : 'Loading options and assets...';
      await loadLibraryOptions();
      renderLibrarySelects();
      await loadLibraryFavorites();
      await loadLibrarySources();
      await loadLibraryPreviews();
      await signLibraryPreviewUrls();
      renderLibraryGrid();
    } catch (error) {
      status.innerHTML = `
        <strong>${state.lang === 'zh' ? '素材库还未就绪' : 'Library is not ready'}</strong>
        <p>${escapeHtml(error.message)}</p>
        <p class="muted">${state.lang === 'zh' ? '如果这是第一次打开 V2，需要先运行 sql/002_library_v2.sql。' : 'If this is the first V2 run, execute sql/002_library_v2.sql first.'}</p>
      `;
      document.getElementById('library-grid').innerHTML = '';
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
    let query = state.supabase
      .from('vf_source_files')
      .select('id,title,country_id,activity_id,category_id,tags,visibility,source_path,source_filename,source_mime_type,source_size_bytes,source_ext,uploaded_by,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(200);
    ['country', 'activity', 'category'].forEach(type => {
      const value = state.libraryFilters[type];
      if (value && value !== 'all') query = query.eq(`${type}_id`, value);
    });
    const { data, error } = await query;
    if (error) throw error;
    state.librarySources = data || [];
  }

  async function loadLibraryPreviews() {
    if (state.librarySources.length === 0) {
      state.libraryPreviews = [];
      state.libraryItems = [];
      return;
    }
    const ids = state.librarySources.map(item => item.id);
    const { data, error } = await state.supabase
      .from('vf_asset_previews')
      .select('id,source_file_id,preview_path,preview_filename,preview_mime_type,preview_size_bytes,width,height,sort_order,created_at')
      .in('source_file_id', ids)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    state.libraryPreviews = data || [];
  }

  async function signLibraryPreviewUrls() {
    state.libraryPreviewUrls = {};
    const paths = state.libraryPreviews.map(item => item.preview_path).filter(Boolean);
    if (paths.length === 0) return;
    const { data, error } = await state.supabase.storage.from(LIBRARY_BUCKET).createSignedUrls(paths, 60 * 60);
    if (error) throw error;
    (data || []).forEach(item => {
      if (item.path && item.signedUrl) state.libraryPreviewUrls[item.path] = item.signedUrl;
    });
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
    state.libraryItems = state.libraryPreviews
      .map(preview => ({ preview, source: sourcesById.get(preview.source_file_id), url: state.libraryPreviewUrls[preview.preview_path] || '' }))
      .filter(item => item.source)
      .filter(item => {
        return ['country', 'activity', 'category'].every(type => {
          const value = state.libraryFilters[type];
          return !value || value === 'all' || item.source[`${type}_id`] === value;
        });
      })
      .filter(item => !state.libraryFilters.favorites || state.libraryFavorites.has(item.preview.id))
      .filter(item => {
        if (!query) return true;
        const text = [
          item.source.title,
          item.source.source_filename,
          item.preview.preview_filename,
          ...(item.source.tags || [])
        ].join(' ').toLowerCase();
        return text.includes(query);
      });
    status.innerHTML = `
      <span class="library-stat"><small>${state.lang === 'zh' ? '预览图' : 'Previews'}</small><strong>${state.libraryItems.length}</strong></span>
      <span class="library-stat"><small>${state.lang === 'zh' ? '源文件' : 'Sources'}</small><strong>${state.librarySources.length}</strong></span>
      <span class="library-stat"><small>${state.lang === 'zh' ? '收藏' : 'Favorites'}</small><strong>${state.libraryFavorites.size}</strong></span>
    `;
    if (state.libraryItems.length === 0) {
      state.librarySelectedPreviewId = '';
      grid.innerHTML = `<div class="empty-card">
        <strong>${state.lang === 'zh' ? '还没有符合条件的素材' : 'No matching assets'}</strong>
        <span>${state.lang === 'zh' ? '设计师可以先上传一组源文件和预览图。' : 'Designers can upload a source file and previews first.'}</span>
      </div>`;
      renderLibraryInspector();
      return;
    }
    if (!state.libraryItems.some(item => item.preview.id === state.librarySelectedPreviewId)) {
      state.librarySelectedPreviewId = state.libraryItems[0].preview.id;
    }
    grid.innerHTML = state.libraryItems.map(renderLibraryCard).join('');
    wireLibraryCards();
    renderLibraryInspector();
  }

  function loadLocalLibraryDemo() {
    const now = new Date().toISOString();
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
    const favorite = state.libraryFavorites.has(preview.id);
    const canManage = canManageSource(source);
    const canSource = canDownloadSource();
    const tags = (source.tags || []).slice(0, 4);
    const selected = state.librarySelectedPreviewId === preview.id;
    const dimensions = formatDimensions(preview);
    const ext = sourceFileLabel(source);
    const thumbStyle = previewAspectStyle(preview);
    return `
      <article class="library-card ${selected ? 'selected' : ''}" data-preview-id="${preview.id}" tabindex="0">
        <div class="library-thumb-wrap">
          <span class="file-pill">${escapeHtml(ext)}</span>
          <button class="favorite-btn ${favorite ? 'active' : ''}" type="button" data-action="favorite" title="${state.lang === 'zh' ? '收藏' : 'Favorite'}">${favorite ? '★' : '☆'}</button>
          <div class="library-thumb" style="${thumbStyle}">${item.url ? `<img src="${escapeAttr(item.url)}" alt="${escapeAttr(source.title)}">` : `<span>${state.lang === 'zh' ? '预览生成中' : 'Preview'}</span>`}</div>
        </div>
        <div class="library-card-body">
          <div>
            <h4>${escapeHtml(source.title)}</h4>
            <div class="library-subline">${escapeHtml(preview.preview_filename)}${dimensions ? ` · ${escapeHtml(dimensions)}` : ''}</div>
          </div>
          <div class="library-meta">
            <span>${escapeHtml(optionNameById(source.country_id))}</span>
            <span>${escapeHtml(optionNameById(source.activity_id))}</span>
            <span>${escapeHtml(optionNameById(source.category_id))}</span>
          </div>
          <div class="library-tags">
            <span class="badge">${visibilityLabel(source.visibility)}</span>
            ${tags.map(tag => `<span class="badge">${escapeHtml(tag)}</span>`).join('')}
          </div>
          <div class="library-fileline">${escapeHtml(source.source_filename)} · ${formatFileSize(source.source_size_bytes)}</div>
          <div class="library-card-actions">
            <button class="secondary-btn" type="button" data-action="use-static">${state.lang === 'zh' ? '静态' : 'Static'}</button>
            <button class="secondary-btn" type="button" data-action="use-dynamic">${state.lang === 'zh' ? '动态' : 'Motion'}</button>
            <button class="ghost-btn" type="button" data-action="download-preview">${state.lang === 'zh' ? '预览图' : 'Preview'}</button>
            ${canSource ? `<button class="ghost-btn" type="button" data-action="download-source">${state.lang === 'zh' ? '源文件' : 'Source'}</button>` : ''}
            ${canManage ? `<button class="ghost-btn" type="button" data-action="edit">${state.lang === 'zh' ? '编辑' : 'Edit'}</button><button class="ghost-btn danger" type="button" data-action="delete">${state.lang === 'zh' ? '删除' : 'Delete'}</button>` : ''}
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
    const canManage = canManageSource(source);
    const canSource = canDownloadSource();
    const tags = source.tags || [];
    inspector.innerHTML = `
      <div class="inspector-sticky">
        <div class="inspector-preview">${item.url ? `<img src="${escapeAttr(item.url)}" alt="${escapeAttr(source.title)}">` : `<span>${state.lang === 'zh' ? '预览生成中' : 'Preview'}</span>`}</div>
        <div class="inspector-content">
          <div>
            <div class="kicker">${escapeHtml(sourceFileLabel(source))} SOURCE</div>
            <h3>${escapeHtml(source.title)}</h3>
            <p>${escapeHtml(source.source_filename)} · ${formatFileSize(source.source_size_bytes)}</p>
          </div>
          <div class="inspector-actions">
            <button class="primary-btn" type="button" data-preview-id="${preview.id}" data-action="use-static">${state.lang === 'zh' ? '带入静态 DIY' : 'Use in Static'}</button>
            <button class="secondary-btn" type="button" data-preview-id="${preview.id}" data-action="use-dynamic">${state.lang === 'zh' ? '带入动态 DIY' : 'Use in Motion'}</button>
          </div>
          <dl class="inspector-list">
            <div><dt>${state.lang === 'zh' ? '国家' : 'Country'}</dt><dd>${escapeHtml(optionNameById(source.country_id))}</dd></div>
            <div><dt>${state.lang === 'zh' ? '活动' : 'Activity'}</dt><dd>${escapeHtml(optionNameById(source.activity_id))}</dd></div>
            <div><dt>${state.lang === 'zh' ? '品类' : 'Category'}</dt><dd>${escapeHtml(optionNameById(source.category_id))}</dd></div>
            <div><dt>${state.lang === 'zh' ? '可见范围' : 'Visibility'}</dt><dd>${visibilityLabel(source.visibility)}</dd></div>
            <div><dt>${state.lang === 'zh' ? '预览尺寸' : 'Preview size'}</dt><dd>${escapeHtml(formatDimensions(preview) || '-')}</dd></div>
            <div><dt>${state.lang === 'zh' ? '更新时间' : 'Updated'}</dt><dd>${formatDate(source.updated_at || source.created_at)}</dd></div>
          </dl>
          ${tags.length ? `<div class="inspector-tags">${tags.map(tag => `<span class="badge">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
          <div class="inspector-secondary-actions">
            <button class="ghost-btn" type="button" data-preview-id="${preview.id}" data-action="download-preview">${state.lang === 'zh' ? '下载预览图' : 'Download preview'}</button>
            ${canSource ? `<button class="ghost-btn" type="button" data-preview-id="${preview.id}" data-action="download-source">${state.lang === 'zh' ? '下载源文件' : 'Download source'}</button>` : ''}
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
    document.getElementById('library-upload-title').value = '';
    document.getElementById('library-upload-message').textContent = '';
    document.getElementById('library-upload-modal').hidden = false;
  }

  function closeLibraryUploadModal() {
    const modal = document.getElementById('library-upload-modal');
    if (modal) modal.hidden = true;
  }

  async function uploadLibraryAsset(event) {
    event.preventDefault();
    const message = document.getElementById('library-upload-message');
    setMessage(message, state.lang === 'zh' ? '正在上传，请不要关闭页面...' : 'Uploading, please keep this page open...');
    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const sourceFile = formData.get('source_file');
      const previewFiles = Array.from(formData.getAll('preview_files')).filter(file => file && file.size > 0);
      validateLibraryUpload(sourceFile, previewFiles);
      const sourceId = crypto.randomUUID();
      const userId = state.session.user.id;
      const sourcePath = `${userId}/sources/${sourceId}/${safeStorageName(sourceFile.name)}`;
      const sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, sourceFile, { upsert: false, contentType: sourceFile.type || 'application/octet-stream' });
      if (sourceUpload.error) throw sourceUpload.error;
      const title = formData.get('title').trim() || stripExtension(sourceFile.name);
      const sourceRow = {
        id: sourceId,
        title,
        country_id: formData.get('country_id'),
        activity_id: formData.get('activity_id'),
        category_id: formData.get('category_id'),
        tags: parseTags(formData.get('tags')),
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
      const previewRows = [];
      for (let index = 0; index < previewFiles.length; index += 1) {
        const file = previewFiles[index];
        const previewId = crypto.randomUUID();
        const previewPath = `${userId}/previews/${sourceId}/${previewId}-${safeStorageName(file.name)}`;
        const upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(previewPath, file, { upsert: false, contentType: file.type });
        if (upload.error) throw upload.error;
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
      await loadLibraryData();
    } catch (error) {
      setMessage(message, error.message, true);
    }
  }

  function validateLibraryUpload(sourceFile, previewFiles) {
    if (!sourceFile || !sourceFile.size) throw new Error(state.lang === 'zh' ? '请选择源文件。' : 'Choose a source file.');
    if (!SOURCE_EXTENSIONS.includes(fileExt(sourceFile.name))) throw new Error(state.lang === 'zh' ? '源文件仅支持 PSD / AI / PDF。' : 'Source must be PSD / AI / PDF.');
    if (previewFiles.length === 0) throw new Error(state.lang === 'zh' ? '至少上传一张预览图。' : 'Upload at least one preview image.');
    previewFiles.forEach(file => {
      if (!PREVIEW_MIME_TYPES.includes(file.type)) throw new Error(state.lang === 'zh' ? '预览图仅支持 JPG / PNG / WEBP。' : 'Preview must be JPG / PNG / WEBP.');
    });
  }

  function openLibraryEditModal(sourceId) {
    const source = state.librarySources.find(item => item.id === sourceId);
    if (!source) return;
    renderLibrarySelects();
    const form = document.getElementById('library-edit-form');
    form.elements.id.value = source.id;
    form.elements.title.value = source.title || '';
    form.elements.country_id.value = source.country_id || '';
    form.elements.activity_id.value = source.activity_id || '';
    form.elements.category_id.value = source.category_id || '';
    form.elements.visibility.value = source.visibility || 'all';
    form.elements.tags.value = (source.tags || []).join(', ');
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
      const update = {
        title: form.get('title').trim(),
        country_id: form.get('country_id'),
        activity_id: form.get('activity_id'),
        category_id: form.get('category_id'),
        visibility: form.get('visibility') || 'all',
        tags: parseTags(form.get('tags'))
      };
      const { error } = await state.supabase.from('vf_source_files').update(update).eq('id', id);
      if (error) throw error;
      setMessage(message, state.lang === 'zh' ? '已保存。' : 'Saved.', false, true);
      setTimeout(closeLibraryEditModal, 500);
      await loadLibraryData();
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
    const { error } = await state.supabase.from('vf_source_files').delete().eq('id', sourceId);
    if (error) {
      alert(error.message);
      return;
    }
    const paths = [source.source_path, ...relatedPreviews.map(item => item.preview_path)].filter(Boolean);
    if (paths.length) await state.supabase.storage.from(LIBRARY_BUCKET).remove(paths);
    await loadLibraryData();
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
      if (kind === 'preview' && item.url) {
        const response = await fetch(item.url);
        const blob = await response.blob();
        triggerBlobDownload(blob, item.preview.preview_filename || 'preview.svg');
        return;
      }
      alert(state.lang === 'zh' ? '本地预览不下载真实源文件。' : 'Local preview does not download real source files.');
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
    return !state.localPreview && ['admin', 'designer'].includes(currentRole());
  }

  function canDownloadSource() {
    return ['admin', 'designer'].includes(currentRole());
  }

  function canManageSource(source) {
    return currentRole() === 'admin' || source.uploaded_by === state.session?.user?.id;
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
        <iframe id="tool-frame" class="tool-frame" src="${item.src}" title="${type}"></iframe>
      </div>
    `;
    state.activeFrame = document.getElementById('tool-frame');
  }

  async function renderProjects() {
    state.activeFrame = null;
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
    state.activeFrame = null;
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
    state.activeFrame = null;
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

  async function saveProject(event) {
    event.preventDefault();
    const title = els.projectTitleInput.value.trim();
    const projectType = state.route === 'dynamic' ? 'dynamic' : 'static';
    setMessage(els.projectModalMessage, state.lang === 'zh' ? '正在保存...' : 'Saving...');
    try {
      const snapshot = await captureProjectSnapshot(projectType);
      if (state.localPreview || !state.supabase) {
        saveLocalProject(title, projectType, snapshot);
        setMessage(els.projectModalMessage, state.lang === 'zh' ? '已保存到本地预览记录。' : 'Saved to local preview.', false, true);
        return;
      }
      const id = crypto.randomUUID();
      const dataPath = `${state.session.user.id}/${id}.json`;
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const upload = await state.supabase.storage.from('vf-projects').upload(dataPath, blob, {
        contentType: 'application/json',
        upsert: true
      });
      if (upload.error) throw upload.error;
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
      setMessage(els.projectModalMessage, error.message, true);
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
      if (typeof frame.contentWindow.VF_EXPORT_PROJECT === 'function') {
        return await frame.contentWindow.VF_EXPORT_PROJECT();
      }
    } catch (error) {
      return { ...base, exportError: error.message };
    }
    return { ...base, exportError: 'Tool bridge is not ready yet.' };
  }

  function saveLocalProject(title, projectType, snapshot) {
    const key = 'vf_local_projects';
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    items.unshift({ id: crypto.randomUUID(), title, project_type: projectType, updated_at: new Date().toISOString(), snapshot_meta: snapshot });
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
