/**
 * DataStore — لایه مستقل ذخیره‌سازی
 * معماری Adapter: فعلاً LocalStorage، آماده IndexedDB / API / SQL Server
 * تمام ماژول‌ها فقط از این لایه به داده دسترسی دارند.
 */
const DataStore = (() => {
  const STORAGE_KEY = 'pms_data_v2';
  const SCHEMA_VERSION = 2;

  /** Adapter پایه — LocalStorage */
  const LocalStorageAdapter = {
    async load() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); }
      catch (e) { console.error('[DataStore] parse error', e); return null; }
    },
    async save(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('[DataStore] save error', e);
        if (typeof Utils !== 'undefined') {
          Utils.showToast('خطا در ذخیره. فضای ذخیره‌سازی ممکن است پر باشد.', 'error');
        }
        return false;
      }
    },
    async clear() {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // در آینده: IndexedDBAdapter / ApiAdapter اینجا اضافه می‌شود
  let adapter = LocalStorageAdapter;
  let cache = null;
  let companyId = 'cmp-default';

  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      companyId,
      projects: [],
      contracts: [],
      contractors: [],
      consultants: [],
      users: [],
      activityLog: [],
      settings: {
        currency: 'ریال',
        theme: 'light',
        companyName: 'سامانه هوشمند مدیریت پروژه‌ها',
        companyId
      }
    };
  }

  function ensureCompanyId(data) {
    if (!data.companyId) data.companyId = companyId;
    if (!data.settings) data.settings = {};
    if (!data.settings.companyId) data.settings.companyId = data.companyId;
    // تزریق companyId به موجودیت‌ها در صورت نبود
    ['projects', 'contracts', 'contractors', 'consultants', 'users'].forEach(col => {
      if (Array.isArray(data[col])) {
        data[col].forEach(item => {
          if (item && !item.companyId) item.companyId = data.companyId;
        });
      }
    });
    if (!Array.isArray(data.activityLog)) data.activityLog = [];
    return data;
  }

  return {
    /** مقداردهی اولیه — بارگذاری یا ساخت state خالی */
    async init() {
      let data = await adapter.load();
      if (!data) {
        if (typeof SAMPLE_DATA !== 'undefined') {
          data = Utils.deepClone(SAMPLE_DATA);
          data.schemaVersion = SCHEMA_VERSION;
        } else {
          data = emptyState();
        }
      }
      data = ensureCompanyId(data);
      // مهاجرت ساده از v1
      if (!data.users || data.users.length === 0) {
        data.users = this._defaultUsers(data.companyId);
      }
      cache = data;
      companyId = data.companyId || 'cmp-default';
      await this._persist();
      return cache;
    },

    getCompanyId() { return companyId; },

    /** دسترسی خام به cache (فقط خواندنی توصیه می‌شود) */
    getState() { return cache; },

    async _persist() {
      if (!cache) return false;
      cache.schemaVersion = SCHEMA_VERSION;
      return adapter.save(cache);
    },

    // ---------- Collection helpers ----------
    _col(name) {
      if (!cache) throw new Error('DataStore not initialized');
      if (!Array.isArray(cache[name])) cache[name] = [];
      return cache[name];
    },

    getAll(collection) {
      return [...this._col(collection)];
    },

    getById(collection, id) {
      return this._col(collection).find(x => x.id === id) || null;
    },

    async add(collection, item) {
      if (!item.id) item.id = (typeof Utils !== 'undefined' ? Utils.generateId(collection.slice(0, 3)) : `${collection}-${Date.now()}`);
      item.companyId = item.companyId || companyId;
      item.createdAt = item.createdAt || (typeof Utils !== 'undefined' ? Utils.getTodayJalali().formatted : new Date().toISOString());
      item.updatedAt = item.createdAt;
      this._col(collection).push(item);
      await this._persist();
      this._log('create', collection, item.id, null, item);
      return item;
    },

    async update(collection, id, updates) {
      const list = this._col(collection);
      const idx = list.findIndex(x => x.id === id);
      if (idx === -1) return null;
      const before = { ...list[idx] };
      list[idx] = {
        ...list[idx],
        ...updates,
        id,
        companyId: list[idx].companyId || companyId,
        updatedAt: typeof Utils !== 'undefined' ? Utils.getTodayJalali().formatted : new Date().toISOString()
      };
      await this._persist();
      this._log('update', collection, id, before, list[idx]);
      return list[idx];
    },

    async remove(collection, id) {
      const list = this._col(collection);
      const before = list.find(x => x.id === id);
      cache[collection] = list.filter(x => x.id !== id);
      await this._persist();
      if (before) this._log('delete', collection, id, before, null);
      return !!before;
    },

    // ---------- Settings ----------
    getSettings() {
      return { ...(cache?.settings || {}) };
    },

    async updateSettings(updates) {
      cache.settings = { ...cache.settings, ...updates, companyId };
      await this._persist();
      return cache.settings;
    },

    // ---------- Activity Log (آماده توسعه آینده) ----------
    _log(action, entity, entityId, before, after) {
      try {
        if (!cache.activityLog) cache.activityLog = [];
        const entry = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          companyId,
          action,
          entity,
          entityId,
          userId: (typeof App !== 'undefined' && App.currentUser) ? App.currentUser.id : null,
          username: (typeof App !== 'undefined' && App.currentUser) ? App.currentUser.username : null,
          timestamp: new Date().toISOString(),
          jalaliDate: typeof Utils !== 'undefined' ? Utils.getTodayJalali().formatted : null,
          // خلاصه تغییرات — بدون داده حجیم
          summary: action === 'update' && before && after
            ? Object.keys(after).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k])).slice(0, 8)
            : null
        };
        cache.activityLog.unshift(entry);
        // نگه‌داشت حداکثر ۵۰۰ رکورد در LocalStorage
        if (cache.activityLog.length > 500) cache.activityLog = cache.activityLog.slice(0, 500);
        // persist بدون لاگ مجدد
        adapter.save(cache);
      } catch (e) { /* silent */ }
    },

    getActivityLog(limit = 50) {
      return (cache?.activityLog || []).slice(0, limit);
    },

    // ---------- Backup / Restore ----------
    exportJSON() {
      const blob = new Blob([JSON.stringify(cache, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const date = typeof Utils !== 'undefined' ? Utils.getTodayJalali().formatted.replace(/\//g, '-') : 'backup';
      link.href = URL.createObjectURL(blob);
      link.download = `pms-backup-${date}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    },

    async importJSON(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed.projects && !parsed.contracts) throw new Error('فرمت نامعتبر');
        cache = ensureCompanyId(parsed);
        cache.schemaVersion = SCHEMA_VERSION;
        await this._persist();
        return true;
      } catch (e) {
        console.error('[DataStore] import error', e);
        return false;
      }
    },

    async resetToSample() {
      if (typeof SAMPLE_DATA === 'undefined') return false;
      cache = ensureCompanyId(Utils.deepClone(SAMPLE_DATA));
      cache.schemaVersion = SCHEMA_VERSION;
      if (!cache.users || !cache.users.length) cache.users = this._defaultUsers(cache.companyId);
      await this._persist();
      return true;
    },

    async clearAll() {
      cache = emptyState();
      cache.users = this._defaultUsers(companyId);
      await this._persist();
    },

    // ---------- Users defaults (رمزها فقط برای دمو؛ در محصول واقعی هش شوند) ----------
    _defaultUsers(cid) {
      return [
        { id: 'usr-admin', companyId: cid, username: 'admin', password: 'admin123', name: 'مدیر سیستم', role: 'admin', active: true, createdAt: '1403/01/01' },
        { id: 'usr-manager', companyId: cid, username: 'manager', password: 'manager123', name: 'مدیر پروژه', role: 'manager', active: true, createdAt: '1403/01/01' },
        { id: 'usr-viewer', companyId: cid, username: 'viewer', password: 'viewer123', name: 'کاربر مشاهده‌گر', role: 'viewer', active: true, createdAt: '1403/01/01' }
      ];
    },

    /** تعویض Adapter برای توسعه آینده */
    setAdapter(newAdapter) {
      adapter = newAdapter;
    }
  };
})();

window.DataStore = DataStore;
