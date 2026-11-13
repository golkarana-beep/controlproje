/**
 * لایه ذخیره‌سازی داده — LocalStorage
 * طراحی شده برای مهاجرت آسان به بک‌اند در نسخه‌های بعدی
 */

const DB = {
  STORAGE_KEY: 'pms_data_v1',
  data: null,

  // بارگذاری اولیه
  init() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.data = JSON.parse(stored);
        console.log('داده‌ها از LocalStorage بارگذاری شد');
      } catch (e) {
        console.error('خطا در خواندن داده:', e);
        this.loadSample();
      }
    } else {
      this.loadSample();
    }
    return this.data;
  },

  // بارگذاری داده‌های نمونه
  loadSample() {
    if (typeof SAMPLE_DATA === 'undefined') {
      console.error('فایل sample-data.js بارگذاری نشده');
      this.data = { projects: [], contracts: [], contractors: [], consultants: [], settings: {} };
      return;
    }
    this.data = Utils.deepClone(SAMPLE_DATA);
    this.save();
    console.log('داده‌های نمونه بارگذاری شد');
  },

  // ذخیره
  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      return true;
    } catch (e) {
      console.error('خطا در ذخیره:', e);
      Utils.showToast('خطا در ذخیره اطلاعات. فضای ذخیره‌سازی ممکن است پر باشد.', 'error');
      return false;
    }
  },

  // پاک کردن همه داده‌ها و بارگذاری مجدد نمونه
  resetToSample() {
    this.loadSample();
    Utils.showToast('داده‌های نمونه با موفقیت بارگذاری شد', 'success');
  },

  // پاک کردن کامل
  clearAll() {
    this.data = {
      projects: [],
      contracts: [],
      contractors: [],
      consultants: [],
      settings: { currency: 'ریال', theme: 'light', companyName: 'سامانه هوشمند مدیریت پروژه‌ها' }
    };
    this.save();
    Utils.showToast('تمام اطلاعات پاک شد', 'info');
  },

  // --- پروژه‌ها ---
  getProjects() {
    return this.data.projects || [];
  },

  getProjectById(id) {
    return this.getProjects().find(p => p.id === id) || null;
  },

  addProject(project) {
    if (!project.id) project.id = Utils.generateId('prj');
    if (!project.code) {
      const year = Utils.getTodayJalali().year;
      const count = this.getProjects().length + 1;
      project.code = `PRJ-${year}-${String(count).padStart(3, '0')}`;
    }
    project.lastUpdate = Utils.getTodayJalali().formatted;
    this.data.projects.push(project);
    this.save();
    return project;
  },

  updateProject(id, updates) {
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    updates.lastUpdate = Utils.getTodayJalali().formatted;
    this.data.projects[idx] = { ...this.data.projects[idx], ...updates };
    this.save();
    return this.data.projects[idx];
  },

  deleteProject(id) {
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.projects.splice(idx, 1);
    // حذف قراردادهای مرتبط
    this.data.contracts = (this.data.contracts || []).filter(c => c.projectId !== id);
    this.save();
    return true;
  },

  // --- قراردادها ---
  getContracts() {
    return this.data.contracts || [];
  },

  getContractById(id) {
    return this.getContracts().find(c => c.id === id) || null;
  },

  getContractsByProject(projectId) {
    return this.getContracts().filter(c => c.projectId === projectId);
  },

  addContract(contract) {
    if (!contract.id) contract.id = Utils.generateId('cnt');
    this.data.contracts = this.data.contracts || [];
    this.data.contracts.push(contract);
    this.save();
    return contract;
  },

  updateContract(id, updates) {
    const idx = this.data.contracts.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.contracts[idx] = { ...this.data.contracts[idx], ...updates };
    this.save();
    return this.data.contracts[idx];
  },

  deleteContract(id) {
    const idx = this.data.contracts.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.data.contracts.splice(idx, 1);
    this.save();
    return true;
  },

  // --- پیمانکاران ---
  getContractors() {
    return this.data.contractors || [];
  },

  getContractorById(id) {
    return this.getContractors().find(c => c.id === id) || null;
  },

  addContractor(contractor) {
    if (!contractor.id) contractor.id = Utils.generateId('ctr');
    this.data.contractors = this.data.contractors || [];
    this.data.contractors.push(contractor);
    this.save();
    return contractor;
  },

  updateContractor(id, updates) {
    const idx = this.data.contractors.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.contractors[idx] = { ...this.data.contractors[idx], ...updates };
    this.save();
    return this.data.contractors[idx];
  },

  deleteContractor(id) {
    const idx = this.data.contractors.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.data.contractors.splice(idx, 1);
    this.save();
    return true;
  },

  // --- مشاوران ---
  getConsultants() {
    return this.data.consultants || [];
  },

  getConsultantById(id) {
    return this.getConsultants().find(c => c.id === id) || null;
  },

  addConsultant(consultant) {
    if (!consultant.id) consultant.id = Utils.generateId('cns');
    this.data.consultants = this.data.consultants || [];
    this.data.consultants.push(consultant);
    this.save();
    return consultant;
  },

  updateConsultant(id, updates) {
    const idx = this.data.consultants.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.consultants[idx] = { ...this.data.consultants[idx], ...updates };
    this.save();
    return this.data.consultants[idx];
  },

  deleteConsultant(id) {
    const idx = this.data.consultants.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.data.consultants.splice(idx, 1);
    this.save();
    return true;
  },

  // --- تنظیمات ---
  getSettings() {
    return this.data.settings || {};
  },

  updateSettings(updates) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.data.settings;
  },

  // --- آمار داشبورد ---
  getDashboardStats() {
    const projects = this.getProjects();
    const total = projects.length;
    const active = projects.filter(p => p.status === 'فعال').length;
    const completed = projects.filter(p => p.status === 'خاتمه‌یافته').length;
    const stopped = projects.filter(p => p.status === 'متوقف‌شده').length;
    const delayed = projects.filter(p => p.status === 'دارای تأخیر').length;

    const totalBudget = projects.reduce((s, p) => s + (p.approvedBudget || 0), 0);
    const totalContract = projects.reduce((s, p) => s + (p.totalContractAmount || 0), 0);
    const totalPaid = projects.reduce((s, p) => s + (p.paidAmount || 0), 0);

    const avgPhysical = total > 0
      ? projects.reduce((s, p) => s + (p.physicalProgress || 0), 0) / total
      : 0;
    const avgFinancial = total > 0
      ? projects.reduce((s, p) => s + (p.financialProgress || 0), 0) / total
      : 0;

    return {
      total, active, completed, stopped, delayed,
      totalBudget, totalContract, totalPaid,
      avgPhysical: Math.round(avgPhysical * 10) / 10,
      avgFinancial: Math.round(avgFinancial * 10) / 10
    };
  },

  // پروژه‌های نیازمند توجه
  getAttentionProjects() {
    return this.getProjects()
      .filter(p => {
        const dev = Utils.calcDeviation(p.physicalProgress, p.plannedProgress);
        return p.status === 'دارای تأخیر' || p.status === 'متوقف‌شده' || dev <= -10;
      })
      .sort((a, b) => {
        const da = Utils.calcDeviation(a.physicalProgress, a.plannedProgress);
        const db = Utils.calcDeviation(b.physicalProgress, b.plannedProgress);
        return da - db;
      })
      .slice(0, 10);
  },

  // آمار بر اساس وضعیت
  getStatusDistribution() {
    const projects = this.getProjects();
    const map = {};
    projects.forEach(p => {
      map[p.status] = (map[p.status] || 0) + 1;
    });
    return map;
  },

  // آمار بر اساس نوع
  getTypeDistribution() {
    const projects = this.getProjects();
    const map = {};
    projects.forEach(p => {
      map[p.type] = (map[p.type] || 0) + 1;
    });
    return map;
  },

  // آمار بر اساس منطقه
  getRegionDistribution() {
    const projects = this.getProjects();
    const map = {};
    projects.forEach(p => {
      map[p.region] = (map[p.region] || 0) + 1;
    });
    return map;
  },

  // آمار بر اساس سازمان
  getOrgDistribution() {
    const projects = this.getProjects();
    const map = {};
    projects.forEach(p => {
      map[p.organization] = (map[p.organization] || 0) + 1;
    });
    return map;
  },

  // خروجی JSON
  exportJSON() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pms-backup-${Utils.getTodayJalali().formatted.replace(/\//g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  // ورود JSON
  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.projects) throw new Error('فرمت نامعتبر');
      this.data = parsed;
      this.save();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
};

window.DB = DB;
