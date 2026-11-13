/**
 * DBFacade — لایه سازگاری با API قدیمی DB (همگام برای حفظ سازگاری)
 * mutations روی cache اعمال و persist در پس‌زمینه انجام می‌شود.
 */
const DB = {
  init() {
    return DataStore.getState();
  },

  // --- Projects ---
  getProjects() { return DataStore.getAll('projects'); },
  getProjectById(id) { return DataStore.getById('projects', id); },

  addProject(project) {
    if (!project.id) project.id = Utils.generateId('prj');
    if (!project.code) {
      const year = Utils.getTodayJalali().year;
      const count = this.getProjects().length + 1;
      project.code = `PRJ-${year}-${String(count).padStart(3, '0')}`;
    }
    project.lastUpdate = Utils.getTodayJalali().formatted;
    project.companyId = project.companyId || DataStore.getCompanyId();
    // sync-style via internal
    const state = DataStore.getState();
    if (!state.projects) state.projects = [];
    state.projects.push(project);
    DataStore._persist();
    DataStore._log('create', 'projects', project.id, null, project);
    return project;
  },

  updateProject(id, updates) {
    const state = DataStore.getState();
    const idx = (state.projects || []).findIndex(p => p.id === id);
    if (idx === -1) return null;
    const before = { ...state.projects[idx] };
    updates.lastUpdate = Utils.getTodayJalali().formatted;
    updates.updatedAt = updates.lastUpdate;
    state.projects[idx] = { ...state.projects[idx], ...updates, id };
    DataStore._persist();
    DataStore._log('update', 'projects', id, before, state.projects[idx]);
    return state.projects[idx];
  },

  deleteProject(id) {
    const state = DataStore.getState();
    const before = (state.projects || []).find(p => p.id === id);
    state.projects = (state.projects || []).filter(p => p.id !== id);
    DataStore._persist();
    if (before) DataStore._log('delete', 'projects', id, before, null);
    return !!before;
  },

  // --- Contracts ---
  getContracts() { return DataStore.getAll('contracts'); },
  getContractById(id) { return DataStore.getById('contracts', id); },

  addContract(c) {
    if (!c.id) c.id = Utils.generateId('cnt');
    c.companyId = c.companyId || DataStore.getCompanyId();
    const state = DataStore.getState();
    if (!state.contracts) state.contracts = [];
    state.contracts.push(c);
    DataStore._persist();
    DataStore._log('create', 'contracts', c.id, null, c);
    return c;
  },

  updateContract(id, u) {
    const state = DataStore.getState();
    const idx = (state.contracts || []).findIndex(c => c.id === id);
    if (idx === -1) return null;
    const before = { ...state.contracts[idx] };
    state.contracts[idx] = { ...state.contracts[idx], ...u, id };
    DataStore._persist();
    DataStore._log('update', 'contracts', id, before, state.contracts[idx]);
    return state.contracts[idx];
  },

  deleteContract(id) {
    const state = DataStore.getState();
    const before = (state.contracts || []).find(c => c.id === id);
    state.contracts = (state.contracts || []).filter(c => c.id !== id);
    DataStore._persist();
    if (before) DataStore._log('delete', 'contracts', id, before, null);
    return !!before;
  },

  // --- Contractors ---
  getContractors() { return DataStore.getAll('contractors'); },
  getContractorById(id) { return DataStore.getById('contractors', id); },

  addContractor(c) {
    if (!c.id) c.id = Utils.generateId('ctr');
    c.companyId = c.companyId || DataStore.getCompanyId();
    const state = DataStore.getState();
    if (!state.contractors) state.contractors = [];
    state.contractors.push(c);
    DataStore._persist();
    return c;
  },

  updateContractor(id, u) {
    const state = DataStore.getState();
    const idx = (state.contractors || []).findIndex(c => c.id === id);
    if (idx === -1) return null;
    state.contractors[idx] = { ...state.contractors[idx], ...u, id };
    DataStore._persist();
    return state.contractors[idx];
  },

  deleteContractor(id) {
    const state = DataStore.getState();
    state.contractors = (state.contractors || []).filter(c => c.id !== id);
    DataStore._persist();
    return true;
  },

  // --- Consultants ---
  getConsultants() { return DataStore.getAll('consultants'); },
  getConsultantById(id) { return DataStore.getById('consultants', id); },

  addConsultant(c) {
    if (!c.id) c.id = Utils.generateId('cns');
    c.companyId = c.companyId || DataStore.getCompanyId();
    const state = DataStore.getState();
    if (!state.consultants) state.consultants = [];
    state.consultants.push(c);
    DataStore._persist();
    return c;
  },

  updateConsultant(id, u) {
    const state = DataStore.getState();
    const idx = (state.consultants || []).findIndex(c => c.id === id);
    if (idx === -1) return null;
    state.consultants[idx] = { ...state.consultants[idx], ...u, id };
    DataStore._persist();
    return state.consultants[idx];
  },

  deleteConsultant(id) {
    const state = DataStore.getState();
    state.consultants = (state.consultants || []).filter(c => c.id !== id);
    DataStore._persist();
    return true;
  },

  // --- Users ---
  getUsers() { return DataStore.getAll('users'); },
  getUserById(id) { return DataStore.getById('users', id); },
  getUserByUsername(username) {
    return DataStore.getAll('users').find(u => u.username === username) || null;
  },

  addUser(u) {
    if (!u.id) u.id = Utils.generateId('usr');
    u.companyId = u.companyId || DataStore.getCompanyId();
    u.createdAt = Utils.getTodayJalali().formatted;
    const state = DataStore.getState();
    if (!state.users) state.users = [];
    state.users.push(u);
    DataStore._persist();
    DataStore._log('create', 'users', u.id, null, { ...u, password: '***' });
    return u;
  },

  updateUser(id, updates) {
    const state = DataStore.getState();
    const idx = (state.users || []).findIndex(u => u.id === id);
    if (idx === -1) return null;
    state.users[idx] = { ...state.users[idx], ...updates, id };
    DataStore._persist();
    return state.users[idx];
  },

  deleteUser(id) {
    if (id === 'usr-admin') return false;
    const state = DataStore.getState();
    state.users = (state.users || []).filter(u => u.id !== id);
    DataStore._persist();
    return true;
  },

  // --- Settings ---
  getSettings() { return DataStore.getSettings(); },
  updateSettings(u) {
    const state = DataStore.getState();
    state.settings = { ...state.settings, ...u };
    DataStore._persist();
    return state.settings;
  },

  // --- Stats ---
  getDashboardStats() {
    const projects = this.getProjects();
    const contracts = this.getContracts();
    const total = projects.length;
    const active = projects.filter(p => p.status === 'فعال').length;
    const completed = projects.filter(p => p.status === 'خاتمه‌یافته').length;
    const stopped = projects.filter(p => p.status === 'متوقف‌شده').length;
    const delayed = projects.filter(p => p.status === 'دارای تأخیر').length;
    const totalBudget = projects.reduce((s, p) => s + (Number(p.budget) || 0), 0);
    const totalContract = contracts.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const totalPaid = contracts.reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);
    const phys = projects.filter(p => p.physicalProgress != null);
    const fin = projects.filter(p => p.financialProgress != null);
    const avgPhysical = phys.length ? phys.reduce((s, p) => s + p.physicalProgress, 0) / phys.length : 0;
    const avgFinancial = fin.length ? fin.reduce((s, p) => s + p.financialProgress, 0) / fin.length : 0;
    return { total, active, completed, stopped, delayed, totalBudget, totalContract, totalPaid, avgPhysical, avgFinancial };
  },

  getAttentionProjects() {
    return this.getProjects()
      .filter(p => {
        const dev = Utils.calcDeviation(p.physicalProgress, p.plannedProgress);
        return p.status === 'دارای تأخیر' || p.status === 'متوقف‌شده' || dev <= -10;
      })
      .sort((a, b) => Utils.calcDeviation(a.physicalProgress, a.plannedProgress) - Utils.calcDeviation(b.physicalProgress, b.plannedProgress))
      .slice(0, 10);
  },

  getStatusDistribution() {
    const map = {};
    this.getProjects().forEach(p => { map[p.status] = (map[p.status] || 0) + 1; });
    return map;
  },

  getTypeDistribution() {
    const map = {};
    this.getProjects().forEach(p => { map[p.type] = (map[p.type] || 0) + 1; });
    return map;
  },

  getRegionDistribution() {
    const map = {};
    this.getProjects().forEach(p => { map[p.region] = (map[p.region] || 0) + 1; });
    return map;
  },

  getOrgDistribution() {
    const map = {};
    this.getProjects().forEach(p => { map[p.organization] = (map[p.organization] || 0) + 1; });
    return map;
  },

  // --- Backup ---
  exportJSON() { DataStore.exportJSON(); },
  importJSON(str) { return DataStore.importJSON(str); },
  resetToSample() {
    DataStore.resetToSample();
    Utils.showToast('داده‌های نمونه با موفقیت بارگذاری شد', 'success');
  },
  clearAll() {
    DataStore.clearAll();
    Utils.showToast('تمام اطلاعات پاک شد', 'info');
  },

  ensureUsers() {},
  getDefaultUsers() { return DataStore._defaultUsers(DataStore.getCompanyId()); }
};

window.DB = DB;
