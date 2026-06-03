(function () {
  const ROLE_LABELS = {
    zh: { admin: '管理员', designer: '设计师', operator: '运营' },
    en: { admin: 'Admin', designer: 'Designer', operator: 'Operator' }
  };

  const I18N = {
    zh: {
      loginTitle: 'Visual Factory',
      loginSubtitle: '登录后进入素材库、静态 DIY 和动态 DIY 工作台。',
      email: '邮箱',
      password: '密码',
      signIn: '登录',
      signOut: '退出',
      workspace: '内部工具站',
      localPreviewHint: '本地预览模式仅用于检查界面，不会写入云端。',
      overview: '总览',
      library: '素材库',
      staticDiy: 'DIY 静态',
      dynamicDiy: 'DIY 动态',
      projects: '我的项目',
      systemCheck: '系统自检',
      admin: '管理员',
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
      displayName: '姓名',
      role: '角色',
      initialPassword: '初始密码'
    },
    en: {
      loginTitle: 'Visual Factory',
      loginSubtitle: 'Sign in to use Library, Static DIY, and Dynamic DIY.',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign in',
      signOut: 'Sign out',
      workspace: 'Workspace',
      localPreviewHint: 'Local preview only checks the UI and does not write to cloud.',
      overview: 'Overview',
      library: 'Library',
      staticDiy: 'Static DIY',
      dynamicDiy: 'Dynamic DIY',
      projects: 'My Projects',
      systemCheck: 'System Check',
      admin: 'Admin',
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
      displayName: 'Name',
      role: 'Role',
      initialPassword: 'Initial password'
    }
  };

  const ROUTES = [
    { id: 'overview', icon: '01', title: 'overview' },
    { id: 'library', icon: '02', title: 'library' },
    { id: 'static', icon: '03', title: 'staticDiy' },
    { id: 'dynamic', icon: '04', title: 'dynamicDiy' },
    { id: 'projects', icon: '05', title: 'projects' },
    { id: 'status', icon: '06', title: 'systemCheck', adminOnly: true },
    { id: 'admin', icon: '07', title: 'admin', adminOnly: true }
  ];

  const config = window.VF_CONFIG || {};
  const state = {
    lang: localStorage.getItem('vf_lang') || 'zh',
    supabase: null,
    session: null,
    profile: null,
    localPreview: false,
    route: 'overview',
    activeFrame: null
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
      navigate((location.hash || '#overview').slice(1));
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
    navigate((location.hash || '#overview').slice(1));
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
        button.innerHTML = `<span class="nav-icon">${route.icon}</span><span>${t(route.title)}</span>`;
        button.addEventListener('click', () => {
          location.hash = route.id;
          navigate(route.id);
        });
        els.navList.appendChild(button);
      });
  }

  function renderUserChip() {
    const profile = state.profile || {};
    els.userChip.textContent = `${profile.display_name || profile.email || 'User'} · ${roleLabel(profile.role)}`;
  }

  function navigate(routeId) {
    const allowed = ROUTES.some(route => route.id === routeId && (!route.adminOnly || currentRole() === 'admin'));
    state.route = allowed ? routeId : 'overview';
    renderNav();
    const route = ROUTES.find(item => item.id === state.route);
    els.routeKicker.textContent = state.localPreview ? 'Local Preview' : 'Visual Factory';
    els.routeTitle.textContent = t(route.title);
    els.saveProjectBtn.hidden = !['static', 'dynamic'].includes(state.route);
    if (state.route === 'overview') renderOverview();
    if (state.route === 'library') renderTool('library');
    if (state.route === 'static') renderTool('static');
    if (state.route === 'dynamic') renderTool('dynamic');
    if (state.route === 'projects') renderProjects();
    if (state.route === 'status') renderStatus();
    if (state.route === 'admin') renderAdmin();
  }

  function renderOverview() {
    state.activeFrame = null;
    els.content.innerHTML = `
      <div class="dashboard">
        <section>
          <h3 class="section-title">${state.lang === 'zh' ? 'V1 范围' : 'V1 Scope'}</h3>
          <div class="cards-grid">
            <article class="card">
              <h3>${t('library')}</h3>
              <p>${state.lang === 'zh' ? '保持现有素材库能力，后续逐步迁移到分类级权限模型。' : 'Keeps the existing library and prepares category-level permissions.'}</p>
            </article>
            <article class="card">
              <h3>${t('staticDiy')}</h3>
              <p>${state.lang === 'zh' ? '先嵌入旧海报编辑器，保留核心编辑和导出能力。' : 'Embeds the existing poster editor first to preserve core editing.'}</p>
            </article>
            <article class="card">
              <h3>${t('dynamicDiy')}</h3>
              <p>${state.lang === 'zh' ? '先嵌入旧动画弹窗工具，保存项目接口从外壳逐步接入。' : 'Embeds the existing motion popup editor with a shell-level save hook.'}</p>
            </article>
          </div>
        </section>
        <section class="panel card">
          <h3>${state.lang === 'zh' ? '稳定性策略' : 'Stability Strategy'}</h3>
          <p>${state.lang === 'zh' ? '旧工具只作为副本嵌入，原文件不被覆盖。登录、权限、项目保存和管理员后台先由新外壳接管。' : 'Legacy tools are embedded as copies. Auth, permissions, project save, and admin setup live in the new shell.'}</p>
        </section>
      </div>
    `;
  }

  function renderTool(type) {
    const legacyRole = currentRole() === 'operator' ? 'viewer' : currentRole();
    const map = {
      library: {
        src: `./tools/library/index.html?embedded=1&role=${encodeURIComponent(legacyRole)}`,
        noticeZh: '素材库当前使用旧工具副本嵌入；后续会把分类权限和中英切换迁入新外壳。',
        noticeEn: 'The library is embedded as a legacy copy; category permissions and i18n will be migrated into the shell.'
      },
      static: {
        src: './tools/static/frontend.html?embedded=1',
        noticeZh: '静态 DIY 核心功能保持原样。保存项目会先记录云端快照，完整恢复将在下一步细接。',
        noticeEn: 'Static DIY keeps its core behavior. Project save records a cloud snapshot first; full restore comes next.'
      },
      dynamic: {
        src: './tools/dynamic/animator.html?embedded=1',
        noticeZh: '动态 DIY 核心功能保持原样。序列帧项目较大，V1 会先保存结构快照。',
        noticeEn: 'Dynamic DIY keeps its core behavior. V1 saves structural snapshots for large sequence projects.'
      }
    };
    const item = map[type];
    els.content.innerHTML = `
      <div class="tool-layout">
        <div class="tool-notice">${state.lang === 'zh' ? item.noticeZh : item.noticeEn}</div>
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
        <section class="panel card">
          <h3>${t('createAccount')}</h3>
          <form id="create-user-form" class="toolbar">
            <label><span>${t('displayName')}</span><input name="display_name" required></label>
            <label><span>${t('email')}</span><input name="email" type="email" required></label>
            <label><span>${t('initialPassword')}</span><input name="password" type="password" minlength="8" required></label>
            <label><span>${t('role')}</span><select name="role"><option value="designer">${roleLabel('designer')}</option><option value="operator">${roleLabel('operator')}</option><option value="admin">${roleLabel('admin')}</option></select></label>
            <button class="primary-btn" type="submit">${t('createAccount')}</button>
          </form>
          <div id="create-user-message" class="message"></div>
        </section>
        <section class="panel card">
          <h3>${t('createCategory')}</h3>
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

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }
})();
