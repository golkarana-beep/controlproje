/**
 * توابع کمکی سامانه هوشمند مدیریت پروژه‌ها
 */

const Utils = {
  // تبدیل عدد به فارسی
  toPersianDigits(num) {
    if (num === null || num === undefined) return '';
    const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/\d/g, d => persian[d]);
  },

  // تبدیل عدد فارسی به انگلیسی
  toEnglishDigits(str) {
    if (!str) return '';
    const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(str)
      .replace(/[۰-۹]/g, d => persian.indexOf(d))
      .replace(/[٠-٩]/g, d => arabic.indexOf(d));
  },

  // فرمت مبلغ با جداکننده هزارگان
  formatMoney(amount, showUnit = true) {
    if (amount === null || amount === undefined || isNaN(amount)) return '—';
    const num = Math.round(Number(amount));
    const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '،');
    const persian = this.toPersianDigits(formatted);
    return showUnit ? persian + ' ریال' : persian;
  },

  // فرمت مبلغ کوتاه (میلیارد / میلیون)
  formatMoneyShort(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '—';
    const num = Number(amount);
    if (num >= 1e12) {
      return this.toPersianDigits((num / 1e12).toFixed(1)) + ' هزار میلیارد';
    }
    if (num >= 1e9) {
      return this.toPersianDigits((num / 1e9).toFixed(1)) + ' میلیارد';
    }
    if (num >= 1e6) {
      return this.toPersianDigits((num / 1e6).toFixed(0)) + ' میلیون';
    }
    return this.formatMoney(num, false);
  },

  // فرمت درصد
  formatPercent(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return this.toPersianDigits(Math.round(Number(value))) + '٪';
  },

  // تولید شناسه یکتا
  generateId(prefix = 'id') {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // تاریخ شمسی امروز
  getTodayJalali() {
    const now = new Date();
    return this.gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  },

  // تبدیل میلادی به شمسی
  gregorianToJalali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
      Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }
    const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return {
      year: jy,
      month: jm,
      day: jd,
      formatted: this.toPersianDigits(jy) + '/' +
        this.toPersianDigits(String(jm).padStart(2, '0')) + '/' +
        this.toPersianDigits(String(jd).padStart(2, '0'))
    };
  },

  // تبدیل شمسی به میلادی
  jalaliToGregorian(jy, jm, jd) {
    const gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    let days = (365 * jy) + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + 78 + jd +
      ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30 + 186));
    let gy2 = gy + 400 * Math.floor(days / 146097);
    days %= 146097;
    if (days > 36524) {
      gy2 += 100 * Math.floor(--days / 36524);
      days %= 36524;
      if (days >= 365) days++;
    }
    gy2 += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
      gy2 += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }
    const gd = days + 1;
    const sal_a = [0, 31, ((gy2 % 4 === 0 && gy2 % 100 !== 0) || (gy2 % 400 === 0)) ? 29 : 28,
      31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 0;
    let v = 0;
    for (gm = 0; gm < 13 && gd > (v = sal_a[gm]); gm++) {}
    return { year: gy2, month: gm, day: gd - v };
  },

  // پارس تاریخ شمسی از رشته
  parseJalali(str) {
    if (!str) return null;
    const parts = this.toEnglishDigits(str).split(/[\/\-\.]/);
    if (parts.length !== 3) return null;
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10)
    };
  },

  // فرمت تاریخ شمسی
  formatJalali(year, month, day) {
    return this.toPersianDigits(year) + '/' +
      this.toPersianDigits(String(month).padStart(2, '0')) + '/' +
      this.toPersianDigits(String(day).padStart(2, '0'));
  },

  // نام ماه شمسی
  getMonthName(month) {
    const names = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    return names[month - 1] || '';
  },

  // نام روز هفته
  getWeekdayName(date) {
    const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    return days[date.getDay()];
  },

  // محاسبه انحراف پیشرفت
  calcDeviation(actual, planned) {
    return (actual || 0) - (planned || 0);
  },

  // وضعیت بر اساس انحراف
  getDeviationStatus(deviation) {
    if (deviation <= -20) return { label: 'بحرانی', class: 'status-critical' };
    if (deviation <= -10) return { label: 'هشدار', class: 'status-warning' };
    if (deviation < 0) return { label: 'عقب‌افتاده', class: 'status-delay' };
    if (deviation >= 10) return { label: 'جلوتر از برنامه', class: 'status-ahead' };
    return { label: 'مطابق برنامه', class: 'status-ok' };
  },

  // کلاس وضعیت پروژه
  getStatusClass(status) {
    const map = {
      'فعال': 'status-active',
      'خاتمه‌یافته': 'status-completed',
      'متوقف‌شده': 'status-stopped',
      'دارای تأخیر': 'status-delay',
      'در حال برنامه‌ریزی': 'status-planning'
    };
    return map[status] || 'status-default';
  },

  // رنگ اولویت
  getPriorityClass(priority) {
    const map = {
      'بالا': 'priority-high',
      'متوسط': 'priority-medium',
      'پایین': 'priority-low'
    };
    return map[priority] || '';
  },

  // نمایش پیام
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // تأیید عملیات
  confirmAction(message) {
    return new Promise(resolve => {
      const modal = document.getElementById('confirm-modal');
      const msgEl = document.getElementById('confirm-message');
      const okBtn = document.getElementById('confirm-ok');
      const cancelBtn = document.getElementById('confirm-cancel');
      if (!modal) {
        resolve(window.confirm(message));
        return;
      }
      msgEl.textContent = message;
      modal.classList.add('active');
      const cleanup = () => {
        modal.classList.remove('active');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
      };
      okBtn.onclick = () => { cleanup(); resolve(true); };
      cancelBtn.onclick = () => { cleanup(); resolve(false); };
    });
  },

  // دیبانس
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // کپی عمیق
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // بررسی خالی بودن
  isEmpty(val) {
    return val === null || val === undefined || val === '' ||
      (Array.isArray(val) && val.length === 0);
  },

  // مرتب‌سازی آرایه اشیاء
  sortBy(arr, key, asc = true) {
    return [...arr].sort((a, b) => {
      let va = a[key], vb = b[key];
      if (typeof va === 'string') va = va.localeCompare(vb, 'fa');
      else if (va < vb) return asc ? -1 : 1;
      else if (va > vb) return asc ? 1 : -1;
      return 0;
    });
  },

  // فیلتر جستجو
  searchFilter(items, query, fields) {
    if (!query || !query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter(item =>
      fields.some(f => {
        const val = item[f];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  },

  // خروجی CSV
  exportCSV(data, filename, headers) {
    const bom = '\uFEFF';
    const rows = [headers.map(h => h.label).join(',')];
    data.forEach(item => {
      const row = headers.map(h => {
        let val = item[h.key];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      });
      rows.push(row.join(','));
    });
    const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  },

  // چاپ
  printElement(elementId, title) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${title || 'گزارش'}</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; direction: rtl; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 12px; }
          th { background: #1a365d; color: white; }
          h1 { color: #1a365d; font-size: 18px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 15px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${title || 'گزارش'}</h1>
        <div class="meta">تاریخ تهیه: ${this.getTodayJalali().formatted}</div>
        ${el.innerHTML}
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  },

  // اعتبارسنجی فرم
  validateForm(formData, rules) {
    const errors = {};
    for (const [field, rule] of Object.entries(rules)) {
      const val = formData[field];
      if (rule.required && this.isEmpty(val)) {
        errors[field] = rule.message || 'این فیلد الزامی است';
      } else if (rule.min !== undefined && Number(val) < rule.min) {
        errors[field] = `حداقل مقدار ${rule.min} است`;
      } else if (rule.max !== undefined && Number(val) > rule.max) {
        errors[field] = `حداکثر مقدار ${rule.max} است`;
      } else if (rule.pattern && !rule.pattern.test(String(val))) {
        errors[field] = rule.message || 'فرمت نامعتبر';
      }
    }
    return errors;
  }
};

// در دسترس قرار دادن سراسری
window.Utils = Utils;
