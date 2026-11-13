/**
 * Auth — مدیریت نشست و نقش‌ها (سمت مرورگر)
 * توجه: این احراز هویت صرفاً دمو/کنترل دسترسی UI است و امنیت تجاری ندارد.
 * در اتصال به ASP.NET Core باید با JWT / Cookie واقعی جایگزین شود.
 */
const Auth = (() => {
  const SESSION_KEY = 'pms_session_v2';

  const ROLES = {
    admin: {
      label: 'مدیر سیستم',
      level: 3,
      pages: ['*']
    },
    manager: {
      label: 'مدیر پروژه',
      level: 2,
      pages: ['dashboard', 'projects', 'contracts', 'contractors', 'consultants', 'finance', 'progress', 'schedule', 'documents', 'analytics', 'reports']
    },
    viewer: {
      label: 'مشاهده‌گر',
      level: 1,
      pages: ['dashboard', 'projects', 'contracts', 'analytics', 'reports']
    }
  };

  let currentUser = null;

  return {
    ROLES,

    getCurrentUser() { return currentUser; },

    isLoggedIn() { return !!currentUser; },

    isAdmin() { return currentUser && currentUser.role === 'admin'; },

    canAccess(page) {
      if (!currentUser) return false;
      const role = ROLES[currentUser.role];
      if (!role) return false;
      if (role.pages.includes('*')) return true;
      return role.pages.includes(page);
    },

    getRoleLabel(role) {
      return ROLES[role]?.label || role;
    },

    /** بازیابی نشست از localStorage */
    restore() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        const dbUser = DataStore.getById('users', session.id);
        if (!dbUser || !dbUser.active) {
          this.clear();
          return null;
        }
        currentUser = {
          id: dbUser.id,
          username: dbUser.username,
          name: dbUser.name,
          role: dbUser.role,
          companyId: dbUser.companyId
        };
        return currentUser;
      } catch {
        return null;
      }
    },

    /**
     * ورود — مقایسه ساده رمز (دمو)
     * در نسخه سرور باید هش و توکن استفاده شود.
     */
    login(username, password) {
      const users = DataStore.getAll('users');
      const user = users.find(u => u.username === username);
      if (!user) return { ok: false, error: 'نام کاربری یا رمز عبور اشتباه است' };
      if (user.password !== password) return { ok: false, error: 'نام کاربری یا رمز عبور اشتباه است' };
      if (!user.active) return { ok: false, error: 'این حساب غیرفعال شده است' };

      currentUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      }));
      return { ok: true, user: currentUser };
    },

    logout() {
      this.clear();
      location.reload();
    },

    clear() {
      localStorage.removeItem(SESSION_KEY);
      currentUser = null;
    }
  };
})();

window.Auth = Auth;
