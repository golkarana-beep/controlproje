/**
 * سامانه هوشمند مدیریت پروژه‌ها - اپلیکیشن اصلی
 */
const App = {
  currentPage: 'dashboard',
  charts: {},
  filters: { projects: {}, contracts: {} },
  pagination: { projects: 1, perPage: 10 },
  pricesCache: null,
  pricesTimer: null,

  init() {
    DB.init();
    this.bindEvents();
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 60000);
    this.applyTheme();
    this.navigate('dashboard');
    if (typeof lucide !== 'undefined') lucide.createIcons();
    console.log('سامانه آماده است');
  },


  bindEvents() {
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.page));
    });
    document.getElementById('btn-collapse-sidebar')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });
    document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('mobile-open');
      document.getElementById('sidebar-overlay')?.classList.toggle('active');
    });
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('mobile-open');
      document.getElementById('sidebar-overlay')?.classList.remove('active');
    });
    document.getElementById('btn-theme')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) this.closeModal();
    });
    document.getElementById('global-search')?.addEventListener('input', Utils.debounce(e => {
      this.globalSearch(e.target.value);
    }, 400));
  },

  updateDateTime() {
    const today = Utils.getTodayJalali();
    const now = new Date();
    const weekday = Utils.getWeekdayName(now);
    const time = Utils.toPersianDigits(
      String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    );
    const el = document.getElementById('today-date');
    if (el) el.textContent = `${weekday} ${today.formatted} — ${time}`;
  },

  applyTheme() {
    const theme = DB.getSettings().theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('#btn-theme i');
    if (icon) {
      icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  },

  toggleTheme() {
    const current = DB.getSettings().theme || 'light';
    DB.updateSettings({ theme: current === 'dark' ? 'light' : 'dark' });
    this.applyTheme();
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.nav-item[data-page]').forEach(b => {
      b.classList.toggle('active', b.dataset.page === page);
    });
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');

    const titles = {
      dashboard: 'داشبورد مدیریتی', projects: 'مدیریت پروژه‌ها', contracts: 'مدیریت قراردادها',
      contractors: 'مدیریت پیمانکاران', consultants: 'مدیریت مشاوران', finance: 'مدیریت مالی',
      progress: 'مدیریت پیشرفت فیزیکی', schedule: 'مدیریت زمان‌بندی', documents: 'مدیریت اسناد و مدارک',
      analytics: 'تحلیل هوشمند', reports: 'گزارش‌های مدیریتی', settings: 'تنظیمات سامانه'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[page] || page;

    Object.values(this.charts).forEach(c => { try { c.destroy(); } catch(e){} });
    this.charts = {};
    if (this.pricesTimer && page !== 'dashboard') {
      clearInterval(this.pricesTimer);
      this.pricesTimer = null;
    }

    const content = document.getElementById('page-content');
    if (!content) return;
    content.innerHTML = '';

    const map = {
      dashboard: () => this.renderDashboard(),
      projects: () => this.renderProjects(),
      contracts: () => this.renderContracts(),
      contractors: () => this.renderContractors(),
      consultants: () => this.renderConsultants(),
      finance: () => this.renderFinance(),
      progress: () => this.renderProgress(),
      schedule: () => this.renderSchedule(),
      documents: () => this.renderDocuments(),
      analytics: () => this.renderAnalytics(),
      reports: () => this.renderReports(),
      settings: () => this.renderSettings()
    };
    if (map[page]) map[page]();
    else content.innerHTML = '<div class="empty-state"><h3>صفحه در حال توسعه</h3></div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderDashboard() {
    const stats = DB.getDashboardStats();
    const attention = DB.getAttentionProjects();
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <!-- بخش قیمت‌های روز بازار ایران -->
      <div class="prices-section" id="prices-section">
        <div class="prices-header">
          <h3><i data-lucide="trending-up" style="width:18px;height:18px"></i> قیمت‌های روز بازار ایران</h3>
          <span class="live-badge" id="prices-live-badge">در حال بارگذاری...</span>
        </div>
        <div class="prices-grid" id="prices-grid">
          ${['دلار آزاد','یورو','طلای ۱۸ عیار','سکه امامی','تتر','انس طلا'].map((label,i) => `
            <div class="price-card loading" data-idx="${i}">
              <div class="price-label">${label}</div>
              <div class="price-value"></div>
              <div class="price-unit">تومان</div>
            </div>`).join('')}
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon"><i data-lucide="folder-kanban"></i></div>
          <div class="stat-value">${Utils.toPersianDigits(stats.total)}</div><div class="stat-label">کل پروژه‌ها</div></div>
        <div class="stat-card success"><div class="stat-icon"><i data-lucide="play-circle"></i></div>
          <div class="stat-value">${Utils.toPersianDigits(stats.active)}</div><div class="stat-label">پروژه‌های فعال</div></div>
        <div class="stat-card info"><div class="stat-icon"><i data-lucide="check-circle"></i></div>
          <div class="stat-value">${Utils.toPersianDigits(stats.completed)}</div><div class="stat-label">خاتمه‌یافته</div></div>
        <div class="stat-card warning"><div class="stat-icon"><i data-lucide="alert-triangle"></i></div>
          <div class="stat-value">${Utils.toPersianDigits(stats.delayed)}</div><div class="stat-label">دارای تأخیر</div></div>
        <div class="stat-card danger"><div class="stat-icon"><i data-lucide="pause-circle"></i></div>
          <div class="stat-value">${Utils.toPersianDigits(stats.stopped)}</div><div class="stat-label">متوقف‌شده</div></div>
      </div>
      <div class="stats-grid stats-grid-finance" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-icon"><i data-lucide="landmark"></i></div>
          <div class="stat-value" style="font-size:18px">${Utils.formatMoneyShort(stats.totalBudget)}</div><div class="stat-label">بودجه مصوب کل</div></div>
        <div class="stat-card"><div class="stat-icon"><i data-lucide="file-signature"></i></div>
          <div class="stat-value" style="font-size:18px">${Utils.formatMoneyShort(stats.totalContract)}</div><div class="stat-label">مجموع قراردادها</div></div>
        <div class="stat-card"><div class="stat-icon"><i data-lucide="banknote"></i></div>
          <div class="stat-value" style="font-size:18px">${Utils.formatMoneyShort(stats.totalPaid)}</div><div class="stat-label">مجموع پرداخت‌ها</div></div>
        <div class="stat-card success"><div class="stat-icon"><i data-lucide="activity"></i></div>
          <div class="stat-value">${Utils.formatPercent(stats.avgPhysical)}</div><div class="stat-label">میانگین پیشرفت فیزیکی</div></div>
        <div class="stat-card info"><div class="stat-icon"><i data-lucide="coins"></i></div>
          <div class="stat-value">${Utils.formatPercent(stats.avgFinancial)}</div><div class="stat-label">میانگین پیشرفت مالی</div></div>
      </div>
      <div class="charts-grid">
        <div class="chart-card"><h3>وضعیت پروژه‌ها <small style="font-weight:400;color:var(--text-muted);font-size:11px">(کلیک برای جزئیات)</small></h3><div class="chart-container"><canvas id="chart-status"></canvas></div></div>
        <div class="chart-card"><h3>توزیع بر اساس نوع پروژه <small style="font-weight:400;color:var(--text-muted);font-size:11px">(کلیک برای جزئیات)</small></h3><div class="chart-container"><canvas id="chart-type"></canvas></div></div>
        <div class="chart-card"><h3>مقایسه پیشرفت فیزیکی و مالی</h3><div class="chart-container"><canvas id="chart-progress"></canvas></div></div>
        <div class="chart-card"><h3>توزیع بر اساس منطقه <small style="font-weight:400;color:var(--text-muted);font-size:11px">(کلیک برای جزئیات)</small></h3><div class="chart-container"><canvas id="chart-region"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3><i data-lucide="alert-circle" style="width:18px;height:18px"></i> پروژه‌های نیازمند توجه</h3></div>
        <div class="card-body" style="padding:0"><div class="table-wrapper"><table>
          <thead><tr><th>کد</th><th>عنوان</th><th>سازمان</th><th>پیشرفت فیزیکی</th><th>پیشرفت مالی</th><th>تاریخ پایان</th><th>انحراف</th><th>وضعیت</th></tr></thead>
          <tbody>
            ${attention.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">موردی نیست</td></tr>' :
              attention.map(p => {
                const dev = Utils.calcDeviation(p.physicalProgress, p.plannedProgress);
                const ds = Utils.getDeviationStatus(dev);
                const pc = p.physicalProgress >= 70 ? 'green' : p.physicalProgress >= 40 ? 'yellow' : 'red';
                return `<tr onclick="App.showProjectDetail('${p.id}')" style="cursor:pointer">
                  <td><strong>${Utils.toPersianDigits(p.code)}</strong></td>
                  <td>${p.title}</td><td>${p.organization}</td>
                  <td><div class="progress-text">${Utils.formatPercent(p.physicalProgress)}</div>
                    <div class="progress-bar"><div class="fill ${pc}" style="width:${p.physicalProgress}%"></div></div></td>
                  <td>${Utils.formatPercent(p.financialProgress)}</td>
                  <td>${Utils.toPersianDigits(p.plannedEndDate || '—')}</td>
                  <td><span class="badge ${ds.class}">${Utils.toPersianDigits(dev)}٪</span></td>
                  <td><span class="badge ${Utils.getStatusClass(p.status)}">${p.status}</span></td>
                </tr>`;
              }).join('')}
          </tbody>
        </table></div></div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    this.renderDashboardCharts();
    this.loadMarketPrices();
  },

  async loadMarketPrices() {
    const grid = document.getElementById('prices-grid');
    const badge = document.getElementById('prices-live-badge');
    if (!grid) return;

    const symbols = [
      { key: 'usd', label: 'دلار آزاد', unit: 'تومان', icon: 'dollar-sign' },
      { key: 'euro', label: 'یورو', unit: 'تومان', icon: 'euro' },
      { key: 'gold-18k', label: 'طلای ۱۸ عیار', unit: 'تومان / گرم', icon: 'gem' },
      { key: 'coin-emami', label: 'سکه امامی', unit: 'تومان', icon: 'coins' },
      { key: 'tether', label: 'تتر (USDT)', unit: 'تومان', icon: 'circle-dollar-sign' },
      { key: 'gold-ounce', label: 'انس طلا', unit: 'دلار', icon: 'trophy' }
    ];

    const formatPrice = (val, isUsd = false) => {
      if (val == null || isNaN(val)) return '—';
      // قیمت‌ها معمولاً به ریال هستند؛ تبدیل به تومان
      let num = Number(val);
      if (!isUsd && num > 100000) num = Math.round(num / 10); // ریال → تومان
      return Utils.toPersianDigits(num.toLocaleString('en-US'));
    };

    try {
      const results = await Promise.allSettled(
        symbols.map(s => fetch(`https://api.priceto.day/v1/latest/irr/${s.key}`).then(r => r.json()))
      );

      let html = '';
      let okCount = 0;
      results.forEach((res, i) => {
        const sym = symbols[i];
        let price = null, changeClass = 'neutral', changeText = '—';
        if (res.status === 'fulfilled' && res.value && res.value.success) {
          price = res.value.price;
          okCount++;
          if (res.value.high && res.value.low && price) {
            const mid = (res.value.high + res.value.low) / 2;
            if (price > mid * 1.002) { changeClass = 'up'; changeText = '▲'; }
            else if (price < mid * 0.998) { changeClass = 'down'; changeText = '▼'; }
            else { changeText = '●'; }
          }
        }
        const isUsdUnit = sym.key === 'gold-ounce';
        html += `
          <div class="price-card" data-key="${sym.key}">
            <span class="price-change ${changeClass}">${changeText}</span>
            <div class="price-label"><i data-lucide="${sym.icon}" style="width:14px;height:14px"></i> ${sym.label}</div>
            <div class="price-value">${formatPrice(price, isUsdUnit)}</div>
            <div class="price-unit">${sym.unit}</div>
          </div>`;
      });

      grid.innerHTML = html;
      if (badge) {
        badge.textContent = okCount > 0 ? `زنده · ${Utils.toPersianDigits(okCount)} مورد` : 'آفلاین';
        badge.style.color = okCount > 0 ? '' : 'var(--warning)';
        badge.style.background = okCount > 0 ? '' : 'var(--warning-soft)';
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();

      // به‌روزرسانی هر ۵ دقیقه
      if (this.pricesTimer) clearInterval(this.pricesTimer);
      this.pricesTimer = setInterval(() => {
        if (this.currentPage === 'dashboard') this.loadMarketPrices();
      }, 5 * 60 * 1000);

    } catch (e) {
      console.warn('خطا در دریافت قیمت‌ها:', e);
      // fallback نمونه
      const fallback = [
        { label: 'دلار آزاد', value: '۲۶۶٬۹۰۰', unit: 'تومان' },
        { label: 'یورو', value: '۲۸۹٬۵۰۰', unit: 'تومان' },
        { label: 'طلای ۱۸ عیار', value: '۱۴٬۸۵۰٬۰۰۰', unit: 'تومان / گرم' },
        { label: 'سکه امامی', value: '۲۸۵٬۰۰۰٬۰۰۰', unit: 'تومان' },
        { label: 'تتر', value: '۲۶۷٬۲۰۰', unit: 'تومان' },
        { label: 'انس طلا', value: '۲٬۶۵۰', unit: 'دلار' }
      ];
      grid.innerHTML = fallback.map(f => `
        <div class="price-card">
          <div class="price-label">${f.label}</div>
          <div class="price-value">${f.value}</div>
          <div class="price-unit">${f.unit}</div>
        </div>`).join('');
      if (badge) {
        badge.textContent = 'نمونه (آفلاین)';
        badge.style.color = 'var(--warning)';
        badge.style.background = 'var(--warning-soft)';
      }
    }
  },

  showChartProjects(filterType, filterValue) {
    let projects = DB.getProjects();
    let title = '';
    if (filterType === 'status') {
      projects = projects.filter(p => p.status === filterValue);
      title = `پروژه‌های با وضعیت «${filterValue}»`;
    } else if (filterType === 'type') {
      projects = projects.filter(p => p.type === filterValue);
      title = `پروژه‌های نوع «${filterValue}»`;
    } else if (filterType === 'region') {
      projects = projects.filter(p => p.region === filterValue);
      title = `پروژه‌های منطقه «${filterValue}»`;
    }

    const body = projects.length === 0
      ? '<p style="text-align:center;padding:30px;color:var(--text-muted)">موردی یافت نشد</p>'
      : `<div class="chart-detail-list">${projects.map(p => `
          <div class="chart-detail-item" onclick="App.closeModal();App.showProjectDetail('${p.id}')">
            <div class="item-main">
              <div class="item-title">${p.title}</div>
              <div class="item-meta">${Utils.toPersianDigits(p.code)} · ${p.organization} · ${p.status}</div>
            </div>
            <div>
              <span class="badge ${Utils.getStatusClass(p.status)}">${Utils.formatPercent(p.physicalProgress)}</span>
            </div>
          </div>`).join('')}</div>`;

    this.openModal(title + ` (${Utils.toPersianDigits(projects.length)} مورد)`, body,
      `<button class="btn btn-secondary" onclick="App.closeModal()">بستن</button>`, '');
  },

  renderDashboardCharts() {
    if (typeof Chart === 'undefined') return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    Chart.defaults.font.family = 'Vazirmatn';
    Chart.defaults.color = textColor;

    const animOpts = {
      duration: 1400,
      easing: 'easeOutQuart'
    };

    const statusData = DB.getStatusDistribution();
    const statusLabels = Object.keys(statusData);
    const statusColors = { 'فعال': '#059669', 'خاتمه‌یافته': '#2563eb', 'متوقف‌شده': '#dc2626', 'دارای تأخیر': '#d97706', 'در حال برنامه‌ریزی': '#64748b' };
    const el1 = document.getElementById('chart-status');
    if (el1) {
      this.charts.status = new Chart(el1, {
        type: 'doughnut',
        data: {
          labels: statusLabels,
          datasets: [{
            data: Object.values(statusData),
            backgroundColor: statusLabels.map(k => statusColors[k] || '#94a3b8'),
            borderWidth: 0,
            hoverOffset: 12
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: animOpts,
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 12 } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${Utils.toPersianDigits(ctx.raw)}` } }
          },
          onClick: (evt, elements) => {
            if (elements.length > 0) {
              const idx = elements[0].index;
              App.showChartProjects('status', statusLabels[idx]);
            }
          }
        }
      });
    }

    const typeData = DB.getTypeDistribution();
    const typeLabels = Object.keys(typeData);
    const el2 = document.getElementById('chart-type');
    if (el2) {
      this.charts.type = new Chart(el2, {
        type: 'bar',
        data: {
          labels: typeLabels,
          datasets: [{
            label: 'تعداد',
            data: Object.values(typeData),
            backgroundColor: '#0d9488',
            borderRadius: 6,
            barThickness: 28,
            hoverBackgroundColor: '#0f766e'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: animOpts,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${Utils.toPersianDigits(ctx.raw)}` } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: gridColor }, ticks: { stepSize: 1, callback: v => Utils.toPersianDigits(v) } }
          },
          onClick: (evt, elements) => {
            if (elements.length > 0) {
              const idx = elements[0].index;
              App.showChartProjects('type', typeLabels[idx]);
            }
          }
        }
      });
    }

    const projects = DB.getProjects().slice(0, 10);
    const el3 = document.getElementById('chart-progress');
    if (el3) {
      this.charts.progress = new Chart(el3, {
        type: 'bar',
        data: {
          labels: projects.map(p => p.code.replace('PRJ-', '')),
          datasets: [
            { label: 'فیزیکی', data: projects.map(p => p.physicalProgress), backgroundColor: '#0d9488', borderRadius: 4, barThickness: 14 },
            { label: 'مالی', data: projects.map(p => p.financialProgress), backgroundColor: '#2563eb', borderRadius: 4, barThickness: 14 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: animOpts,
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${Utils.toPersianDigits(ctx.raw)}٪` } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { max: 100, grid: { color: gridColor }, ticks: { callback: v => Utils.toPersianDigits(v) + '٪' } }
          }
        }
      });
    }

    const regionData = DB.getRegionDistribution();
    const regionLabels = Object.keys(regionData);
    const el4 = document.getElementById('chart-region');
    if (el4) {
      this.charts.region = new Chart(el4, {
        type: 'polarArea',
        data: {
          labels: regionLabels,
          datasets: [{
            data: Object.values(regionData),
            backgroundColor: ['rgba(13,148,136,0.75)','rgba(37,99,235,0.75)','rgba(217,119,6,0.75)','rgba(220,38,38,0.75)','rgba(5,150,105,0.75)','rgba(139,92,246,0.75)','rgba(236,72,153,0.75)','rgba(14,165,233,0.75)','rgba(245,158,11,0.75)','rgba(99,102,241,0.75)'],
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: animOpts,
          plugins: {
            legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${Utils.toPersianDigits(ctx.raw)}` } }
          },
          scales: { r: { grid: { color: gridColor }, ticks: { display: false } } },
          onClick: (evt, elements) => {
            if (elements.length > 0) {
              const idx = elements[0].index;
              App.showChartProjects('region', regionLabels[idx]);
            }
          }
        }
      });
    }
  },

  renderProjects() {
    let projects = DB.getProjects();
    const f = this.filters.projects;
    if (f.status) projects = projects.filter(p => p.status === f.status);
    if (f.type) projects = projects.filter(p => p.type === f.type);
    if (f.region) projects = projects.filter(p => p.region === f.region);
    if (f.search) projects = Utils.searchFilter(projects, f.search, ['title', 'code', 'organization', 'manager']);

    const total = projects.length;
    const perPage = this.pagination.perPage;
    const page = this.pagination.projects;
    const pages = Math.ceil(total / perPage) || 1;
    const start = (page - 1) * perPage;
    const pageItems = projects.slice(start, start + perPage);
    const statuses = [...new Set(DB.getProjects().map(p => p.status))];
    const types = [...new Set(DB.getProjects().map(p => p.type))];
    const regions = [...new Set(DB.getProjects().map(p => p.region))];
    const content = document.getElementById('page-content');

    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-right">
          <input type="text" class="form-control" style="width:220px" placeholder="جست‌وجو..." value="${f.search || ''}" id="proj-search">
          <select class="filter-select" id="proj-filter-status"><option value="">همه وضعیت‌ها</option>${statuses.map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <select class="filter-select" id="proj-filter-type"><option value="">همه انواع</option>${types.map(t => `<option value="${t}" ${f.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
          <select class="filter-select" id="proj-filter-region"><option value="">همه مناطق</option>${regions.map(r => `<option value="${r}" ${f.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
        </div>
        <div class="toolbar-left">
          <button class="btn btn-secondary btn-sm" onclick="App.exportProjectsCSV()"><i data-lucide="download" style="width:14px;height:14px"></i> خروجی Excel</button>
          <button class="btn btn-primary btn-sm" onclick="App.showProjectForm()"><i data-lucide="plus" style="width:14px;height:14px"></i> پروژه جدید</button>
        </div>
      </div>
      <div class="card"><div class="card-body" style="padding:0"><div class="table-wrapper"><table>
        <thead><tr><th>کد</th><th>عنوان</th><th>نوع</th><th>منطقه</th><th>پیشرفت فیزیکی</th><th>پیشرفت مالی</th><th>بودجه</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>
          ${pageItems.length === 0 ? '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">پروژه‌ای یافت نشد</td></tr>' :
            pageItems.map(p => {
              const pc = p.physicalProgress >= 70 ? 'green' : p.physicalProgress >= 40 ? 'yellow' : 'red';
              return `<tr>
                <td><strong>${Utils.toPersianDigits(p.code)}</strong></td>
                <td style="max-width:200px">${p.title}</td><td>${p.type}</td><td>${p.region}</td>
                <td><div class="progress-text">${Utils.formatPercent(p.physicalProgress)}</div>
                  <div class="progress-bar"><div class="fill ${pc}" style="width:${p.physicalProgress}%"></div></div></td>
                <td>${Utils.formatPercent(p.financialProgress)}</td>
                <td>${Utils.formatMoneyShort(p.approvedBudget)}</td>
                <td><span class="badge ${Utils.getStatusClass(p.status)}">${p.status}</span></td>
                <td>
                  <button class="btn-icon" onclick="event.stopPropagation();App.showProjectDetail('${p.id}')" title="جزئیات"><i data-lucide="eye" style="width:16px;height:16px"></i></button>
                  <button class="btn-icon" onclick="event.stopPropagation();App.showProjectForm('${p.id}')" title="ویرایش"><i data-lucide="pencil" style="width:16px;height:16px"></i></button>
                  <button class="btn-icon" onclick="event.stopPropagation();App.deleteProject('${p.id}')" title="حذف"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
                </td>
              </tr>`;
            }).join('')}
        </tbody>
      </table></div></div></div>
      <div class="pagination">${this.buildPagination(page, pages, 'App.goProjectPage')}</div>
      <div style="text-align:center;margin-top:8px;font-size:12px;color:var(--text-muted)">نمایش ${Utils.toPersianDigits(start + 1)} تا ${Utils.toPersianDigits(Math.min(start + perPage, total))} از ${Utils.toPersianDigits(total)}</div>`;

    document.getElementById('proj-search')?.addEventListener('input', Utils.debounce(e => { this.filters.projects.search = e.target.value; this.pagination.projects = 1; this.renderProjects(); }, 300));
    document.getElementById('proj-filter-status')?.addEventListener('change', e => { this.filters.projects.status = e.target.value; this.pagination.projects = 1; this.renderProjects(); });
    document.getElementById('proj-filter-type')?.addEventListener('change', e => { this.filters.projects.type = e.target.value; this.pagination.projects = 1; this.renderProjects(); });
    document.getElementById('proj-filter-region')?.addEventListener('change', e => { this.filters.projects.region = e.target.value; this.pagination.projects = 1; this.renderProjects(); });
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  goProjectPage(p) { this.pagination.projects = p; this.renderProjects(); },

  buildPagination(current, total, fnName) {
    if (total <= 1) return '';
    let html = `<button ${current <= 1 ? 'disabled' : ''} onclick="${fnName}(${current - 1})">‹</button>`;
    for (let i = 1; i <= total; i++) {
      if (total > 7 && Math.abs(i - current) > 2 && i !== 1 && i !== total) {
        if (i === 2 || i === total - 1) html += '<span style="padding:0 4px">…</span>';
        continue;
      }
      html += `<button class="${i === current ? 'active' : ''}" onclick="${fnName}(${i})">${Utils.toPersianDigits(i)}</button>`;
    }
    html += `<button ${current >= total ? 'disabled' : ''} onclick="${fnName}(${current + 1})">›</button>`;
    return html;
  },

  showProjectDetail(id) {
    const p = DB.getProjectById(id);
    if (!p) return;
    const contractor = DB.getContractorById(p.contractorId);
    const consultant = DB.getConsultantById(p.consultantId);
    const contracts = DB.getContractsByProject(id);
    const dev = Utils.calcDeviation(p.physicalProgress, p.plannedProgress);
    const ds = Utils.getDeviationStatus(dev);

    this.openModal('جزئیات پروژه — ' + p.title, `
      <div class="tabs">
        <button class="tab-btn active" data-tab="info">مشخصات</button>
        <button class="tab-btn" data-tab="finance">مالی</button>
        <button class="tab-btn" data-tab="progress">پیشرفت</button>
        <button class="tab-btn" data-tab="parties">ذینفعان</button>
        <button class="tab-btn" data-tab="contracts">قراردادها</button>
      </div>
      <div class="tab-pane active" id="tab-info">
        <div class="detail-grid">
          <div class="detail-item"><div class="label">کد</div><div class="value">${Utils.toPersianDigits(p.code)}</div></div>
          <div class="detail-item"><div class="label">عنوان</div><div class="value">${p.title}</div></div>
          <div class="detail-item"><div class="label">نوع</div><div class="value">${p.type}</div></div>
          <div class="detail-item"><div class="label">سازمان</div><div class="value">${p.organization}</div></div>
          <div class="detail-item"><div class="label">منطقه</div><div class="value">${p.region}</div></div>
          <div class="detail-item"><div class="label">مدیر پروژه</div><div class="value">${p.manager || '—'}</div></div>
          <div class="detail-item"><div class="label">شروع</div><div class="value">${Utils.toPersianDigits(p.startDate)}</div></div>
          <div class="detail-item"><div class="label">پایان برنامه‌ای</div><div class="value">${Utils.toPersianDigits(p.plannedEndDate)}</div></div>
          <div class="detail-item"><div class="label">وضعیت</div><div class="value"><span class="badge ${Utils.getStatusClass(p.status)}">${p.status}</span></div></div>
          <div class="detail-item"><div class="label">اولویت</div><div class="value">${p.priority}</div></div>
        </div>
        ${p.description ? `<p style="margin-top:12px;font-size:13px;line-height:1.8">${p.description}</p>` : ''}
        ${p.notes ? `<div style="margin-top:12px;padding:12px;background:var(--warning-soft);border-radius:8px;font-size:12px"><strong>یادداشت:</strong> ${p.notes}</div>` : ''}
      </div>
      <div class="tab-pane" id="tab-finance">
        <div class="detail-grid">
          <div class="detail-item"><div class="label">بودجه مصوب</div><div class="value">${Utils.formatMoney(p.approvedBudget)}</div></div>
          <div class="detail-item"><div class="label">قرارداد اولیه</div><div class="value">${Utils.formatMoney(p.initialContractAmount)}</div></div>
          <div class="detail-item"><div class="label">الحاقیه</div><div class="value">${Utils.formatMoney(p.additionalContracts)}</div></div>
          <div class="detail-item"><div class="label">کل قرارداد</div><div class="value">${Utils.formatMoney(p.totalContractAmount)}</div></div>
          <div class="detail-item"><div class="label">پرداخت‌شده</div><div class="value">${Utils.formatMoney(p.paidAmount)}</div></div>
          <div class="detail-item"><div class="label">مانده</div><div class="value">${Utils.formatMoney(p.remainingCommitment)}</div></div>
        </div>
      </div>
      <div class="tab-pane" id="tab-progress">
        <div class="detail-grid">
          <div class="detail-item"><div class="label">فیزیکی</div><div class="value">${Utils.formatPercent(p.physicalProgress)}</div></div>
          <div class="detail-item"><div class="label">مالی</div><div class="value">${Utils.formatPercent(p.financialProgress)}</div></div>
          <div class="detail-item"><div class="label">برنامه‌ای</div><div class="value">${Utils.formatPercent(p.plannedProgress)}</div></div>
          <div class="detail-item"><div class="label">انحراف</div><div class="value"><span class="badge ${ds.class}">${Utils.toPersianDigits(dev)}٪ — ${ds.label}</span></div></div>
        </div>
      </div>
      <div class="tab-pane" id="tab-parties">
        <div class="detail-grid">
          <div class="detail-item"><div class="label">پیمانکار</div><div class="value">${contractor ? contractor.name : '—'}</div></div>
          <div class="detail-item"><div class="label">رابط پیمانکار</div><div class="value">${contractor ? contractor.contactPerson : '—'}</div></div>
          <div class="detail-item"><div class="label">مشاور</div><div class="value">${consultant ? consultant.name : '—'}</div></div>
          <div class="detail-item"><div class="label">رابط مشاور</div><div class="value">${consultant ? consultant.contactPerson : '—'}</div></div>
        </div>
      </div>
      <div class="tab-pane" id="tab-contracts">
        ${contracts.length === 0 ? '<p style="text-align:center;color:var(--text-muted);padding:20px">قراردادی ثبت نشده</p>' :
          contracts.map(c => `<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px">
            <strong>${Utils.toPersianDigits(c.number)}</strong> — ${Utils.formatMoney(c.finalAmount)}
            <span class="badge ${Utils.getStatusClass(c.status)}" style="margin-right:8px">${c.status}</span>
          </div>`).join('')}
      </div>
    `, `<button class="btn btn-primary" onclick="App.showProjectForm('${p.id}');App.closeModal()">ویرایش</button>
      <button class="btn btn-secondary" onclick="App.closeModal()">بستن</button>`, 'modal-lg');

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
      });
    });
  },

  showProjectForm(id) {
    const p = id ? DB.getProjectById(id) : null;
    const contractors = DB.getContractors();
    const consultants = DB.getConsultants();
    this.openModal(p ? 'ویرایش پروژه' : 'ثبت پروژه جدید', `
      <form id="project-form">
        <div class="form-row">
          <div class="form-group"><label>عنوان *</label><input class="form-control" name="title" value="${p?.title || ''}" required></div>
          <div class="form-group"><label>کد</label><input class="form-control" name="code" value="${p?.code || ''}" placeholder="خودکار"></div>
        </div>
        <div class="form-group"><label>شرح</label><textarea class="form-control" name="description" rows="2">${p?.description || ''}</textarea></div>
        <div class="form-row-3">
          <div class="form-group"><label>نوع *</label><select class="form-control" name="type">${['ساختمانی','راه و ترابری','آب و فاضلاب','صنعتی','فضای سبز','بازسازی','عمرانی','انرژی'].map(t => `<option value="${t}" ${p?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label>وضعیت *</label><select class="form-control" name="status">${['فعال','خاتمه‌یافته','متوقف‌شده','دارای تأخیر','در حال برنامه‌ریزی'].map(s => `<option value="${s}" ${p?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="form-group"><label>اولویت</label><select class="form-control" name="priority">${['بالا','متوسط','پایین'].map(pr => `<option value="${pr}" ${p?.priority === pr ? 'selected' : ''}>${pr}</option>`).join('')}</select></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>سازمان</label><input class="form-control" name="organization" value="${p?.organization || ''}"></div>
          <div class="form-group"><label>منطقه</label><input class="form-control" name="region" value="${p?.region || ''}"></div>
          <div class="form-group"><label>مدیر پروژه</label><input class="form-control" name="manager" value="${p?.manager || ''}"></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>شروع</label><input class="form-control" name="startDate" value="${p?.startDate || ''}" placeholder="1403/01/01"></div>
          <div class="form-group"><label>پایان برنامه‌ای</label><input class="form-control" name="plannedEndDate" value="${p?.plannedEndDate || ''}"></div>
          <div class="form-group"><label>مدت (ماه)</label><input class="form-control" name="contractDuration" type="number" value="${p?.contractDuration || ''}"></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>بودجه مصوب</label><input class="form-control" name="approvedBudget" type="number" value="${p?.approvedBudget || ''}"></div>
          <div class="form-group"><label>قرارداد اولیه</label><input class="form-control" name="initialContractAmount" type="number" value="${p?.initialContractAmount || ''}"></div>
          <div class="form-group"><label>الحاقیه</label><input class="form-control" name="additionalContracts" type="number" value="${p?.additionalContracts || 0}"></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>پیشرفت فیزیکی ٪</label><input class="form-control" name="physicalProgress" type="number" min="0" max="100" value="${p?.physicalProgress || 0}"></div>
          <div class="form-group"><label>پیشرفت مالی ٪</label><input class="form-control" name="financialProgress" type="number" min="0" max="100" value="${p?.financialProgress || 0}"></div>
          <div class="form-group"><label>پیشرفت برنامه‌ای ٪</label><input class="form-control" name="plannedProgress" type="number" min="0" max="100" value="${p?.plannedProgress || 0}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>پیمانکار</label><select class="form-control" name="contractorId"><option value="">—</option>${contractors.map(c => `<option value="${c.id}" ${p?.contractorId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>مشاور</label><select class="form-control" name="consultantId"><option value="">—</option>${consultants.map(c => `<option value="${c.id}" ${p?.consultantId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label>یادداشت</label><textarea class="form-control" name="notes" rows="2">${p?.notes || ''}</textarea></div>
      </form>
    `, `<button class="btn btn-primary" onclick="App.saveProject('${id || ''}')">ذخیره</button>
      <button class="btn btn-secondary" onclick="App.closeModal()">انصراف</button>`, 'modal-lg');
  },

  saveProject(id) {
    const form = document.getElementById('project-form');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form).entries());
    ['approvedBudget','initialContractAmount','additionalContracts','physicalProgress','financialProgress','plannedProgress','contractDuration'].forEach(k => { data[k] = data[k] ? Number(data[k]) : 0; });
    if (!data.title?.trim()) { Utils.showToast('عنوان الزامی است', 'error'); return; }
    if (data.physicalProgress < 0 || data.physicalProgress > 100) { Utils.showToast('پیشرفت باید ۰ تا ۱۰۰ باشد', 'error'); return; }
    data.totalContractAmount = (data.initialContractAmount || 0) + (data.additionalContracts || 0);
    const existing = id ? DB.getProjectById(id) : null;
    data.paidAmount = existing?.paidAmount || 0;
    data.invoicesAmount = existing?.invoicesAmount || 0;
    data.remainingCommitment = data.totalContractAmount - data.paidAmount;
    if (id) { DB.updateProject(id, data); Utils.showToast('پروژه به‌روزرسانی شد', 'success'); }
    else { DB.addProject(data); Utils.showToast('پروژه ثبت شد', 'success'); }
    this.closeModal();
    this.navigate('projects');
  },

  async deleteProject(id) {
    const p = DB.getProjectById(id);
    if (!p) return;
    const ok = await Utils.confirmAction(`حذف پروژه «${p.title}»؟`);
    if (ok) { DB.deleteProject(id); Utils.showToast('حذف شد', 'success'); this.renderProjects(); }
  },

  exportProjectsCSV() {
    Utils.exportCSV(DB.getProjects(), 'projects-export', [
      { key: 'code', label: 'کد' }, { key: 'title', label: 'عنوان' }, { key: 'type', label: 'نوع' },
      { key: 'organization', label: 'سازمان' }, { key: 'region', label: 'منطقه' }, { key: 'status', label: 'وضعیت' },
      { key: 'physicalProgress', label: 'پیشرفت فیزیکی' }, { key: 'financialProgress', label: 'پیشرفت مالی' },
      { key: 'approvedBudget', label: 'بودجه' }, { key: 'totalContractAmount', label: 'قرارداد' }
    ]);
    Utils.showToast('خروجی آماده شد', 'success');
  },

  renderContracts() {
    const contracts = DB.getContracts();
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-right"><span style="font-size:13px;color:var(--text-secondary)">${Utils.toPersianDigits(contracts.length)} قرارداد</span></div>
        <div class="toolbar-left"><button class="btn btn-primary btn-sm" onclick="App.showContractForm()"><i data-lucide="plus" style="width:14px;height:14px"></i> قرارداد جدید</button></div>
      </div>
      <div class="card"><div class="card-body" style="padding:0"><div class="table-wrapper"><table>
        <thead><tr><th>شماره</th><th>پروژه</th><th>پیمانکار</th><th>مبلغ نهایی</th><th>شروع</th><th>پایان</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>${contracts.map(c => {
          const proj = DB.getProjectById(c.projectId);
          const ctr = DB.getContractorById(c.contractorId);
          return `<tr>
            <td><strong>${Utils.toPersianDigits(c.number)}</strong></td>
            <td>${proj ? proj.title : '—'}</td><td>${ctr ? ctr.name : '—'}</td>
            <td>${Utils.formatMoneyShort(c.finalAmount)}</td>
            <td>${Utils.toPersianDigits(c.startDate)}</td><td>${Utils.toPersianDigits(c.endDate)}</td>
            <td><span class="badge ${Utils.getStatusClass(c.status)}">${c.status}</span></td>
            <td>
              <button class="btn-icon" onclick="App.showContractForm('${c.id}')"><i data-lucide="pencil" style="width:16px;height:16px"></i></button>
              <button class="btn-icon" onclick="App.deleteContract('${c.id}')"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  showContractForm(id) {
    const c = id ? DB.getContractById(id) : null;
    this.openModal(c ? 'ویرایش قرارداد' : 'ثبت قرارداد', `
      <form id="contract-form">
        <div class="form-row">
          <div class="form-group"><label>شماره *</label><input class="form-control" name="number" value="${c?.number || ''}" required></div>
          <div class="form-group"><label>وضعیت</label><select class="form-control" name="status">${['فعال','خاتمه‌یافته','معلق','فسخ‌شده'].map(s => `<option value="${s}" ${c?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>پروژه</label><select class="form-control" name="projectId"><option value="">—</option>${DB.getProjects().map(p => `<option value="${p.id}" ${c?.projectId === p.id ? 'selected' : ''}>${p.title}</option>`).join('')}</select></div>
          <div class="form-group"><label>پیمانکار</label><select class="form-control" name="contractorId"><option value="">—</option>${DB.getContractors().map(ct => `<option value="${ct.id}" ${c?.contractorId === ct.id ? 'selected' : ''}>${ct.name}</option>`).join('')}</select></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>مبلغ اولیه</label><input class="form-control" name="initialAmount" type="number" value="${c?.initialAmount || ''}"></div>
          <div class="form-group"><label>الحاقیه</label><input class="form-control" name="additionalAmount" type="number" value="${c?.additionalAmount || 0}"></div>
          <div class="form-group"><label>مدت (ماه)</label><input class="form-control" name="duration" type="number" value="${c?.duration || ''}"></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>تاریخ انعقاد</label><input class="form-control" name="date" value="${c?.date || ''}"></div>
          <div class="form-group"><label>شروع</label><input class="form-control" name="startDate" value="${c?.startDate || ''}"></div>
          <div class="form-group"><label>پایان</label><input class="form-control" name="endDate" value="${c?.endDate || ''}"></div>
        </div>
        <div class="form-group"><label>توضیحات</label><textarea class="form-control" name="notes" rows="2">${c?.notes || ''}</textarea></div>
      </form>
    `, `<button class="btn btn-primary" onclick="App.saveContract('${id || ''}')">ذخیره</button>
      <button class="btn btn-secondary" onclick="App.closeModal()">انصراف</button>`);
  },

  saveContract(id) {
    const form = document.getElementById('contract-form');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form).entries());
    data.initialAmount = Number(data.initialAmount) || 0;
    data.additionalAmount = Number(data.additionalAmount) || 0;
    data.finalAmount = data.initialAmount + data.additionalAmount;
    data.duration = Number(data.duration) || 0;
    if (!data.number) { Utils.showToast('شماره الزامی است', 'error'); return; }
    if (id) { DB.updateContract(id, data); Utils.showToast('به‌روزرسانی شد', 'success'); }
    else { DB.addContract(data); Utils.showToast('ثبت شد', 'success'); }
    this.closeModal();
    this.renderContracts();
  },

  async deleteContract(id) {
    if (await Utils.confirmAction('حذف قرارداد؟')) { DB.deleteContract(id); Utils.showToast('حذف شد', 'success'); this.renderContracts(); }
  },

  renderContractors() {
    const list = DB.getContractors();
    document.getElementById('page-content').innerHTML = `
      <div class="toolbar">
        <div class="toolbar-right"><span style="font-size:13px;color:var(--text-secondary)">${Utils.toPersianDigits(list.length)} پیمانکار</span></div>
        <div class="toolbar-left"><button class="btn btn-primary btn-sm" onclick="App.showContractorForm()"><i data-lucide="plus" style="width:14px;height:14px"></i> جدید</button></div>
      </div>
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">
        ${list.map(c => `<div class="card" style="padding:20px">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px">
            <div><h3 style="font-size:14px;font-weight:700">${c.name}</h3>
              <span class="badge ${c.status === 'فعال' ? 'status-active' : 'status-stopped'}">${c.status}</span></div>
            <div style="display:flex;gap:4px">
              <button class="btn-icon" onclick="App.showContractorForm('${c.id}')"><i data-lucide="pencil" style="width:15px;height:15px"></i></button>
              <button class="btn-icon" onclick="App.deleteContractor('${c.id}')"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:2">
            <div>شناسه: ${Utils.toPersianDigits(c.nationalId)}</div>
            <div>تلفن: ${Utils.toPersianDigits(c.phone)}</div>
            <div>رابط: ${c.contactPerson}</div>
            <div>پروژه‌های فعال: ${Utils.toPersianDigits(c.activeProjects)}</div>
            <div>مجموع قرارداد: ${Utils.formatMoneyShort(c.totalContracts)}</div>
          </div>
        </div>`).join('')}
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  showContractorForm(id) {
    const c = id ? DB.getContractorById(id) : null;
    this.openModal(c ? 'ویرایش پیمانکار' : 'ثبت پیمانکار', `
      <form id="contractor-form">
        <div class="form-group"><label>نام *</label><input class="form-control" name="name" value="${c?.name || ''}" required></div>
        <div class="form-row">
          <div class="form-group"><label>شناسه ملی</label><input class="form-control" name="nationalId" value="${c?.nationalId || ''}"></div>
          <div class="form-group"><label>تلفن</label><input class="form-control" name="phone" value="${c?.phone || ''}"></div>
        </div>
        <div class="form-group"><label>آدرس</label><input class="form-control" name="address" value="${c?.address || ''}"></div>
        <div class="form-row">
          <div class="form-group"><label>شخص رابط</label><input class="form-control" name="contactPerson" value="${c?.contactPerson || ''}"></div>
          <div class="form-group"><label>وضعیت</label><select class="form-control" name="status">
            <option value="فعال" ${c?.status === 'فعال' ? 'selected' : ''}>فعال</option>
            <option value="معلق" ${c?.status === 'معلق' ? 'selected' : ''}>معلق</option>
          </select></div>
        </div>
      </form>
    `, `<button class="btn btn-primary" onclick="App.saveContractor('${id || ''}')">ذخیره</button>
      <button class="btn btn-secondary" onclick="App.closeModal()">انصراف</button>`);
  },

  saveContractor(id) {
    const form = document.getElementById('contractor-form');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.name) { Utils.showToast('نام الزامی است', 'error'); return; }
    data.activeProjects = (id ? DB.getContractorById(id)?.activeProjects : 0) || 0;
    data.totalContracts = (id ? DB.getContractorById(id)?.totalContracts : 0) || 0;
    if (id) { DB.updateContractor(id, data); Utils.showToast('به‌روزرسانی شد', 'success'); }
    else { DB.addContractor(data); Utils.showToast('ثبت شد', 'success'); }
    this.closeModal();
    this.renderContractors();
  },

  async deleteContractor(id) {
    if (await Utils.confirmAction('حذف پیمانکار؟')) { DB.deleteContractor(id); Utils.showToast('حذف شد', 'success'); this.renderContractors(); }
  },

  renderConsultants() {
    const list = DB.getConsultants();
    document.getElementById('page-content').innerHTML = `
      <div class="toolbar">
        <div class="toolbar-right"><span style="font-size:13px;color:var(--text-secondary)">${Utils.toPersianDigits(list.length)} مشاور</span></div>
        <div class="toolbar-left"><button class="btn btn-primary btn-sm" onclick="App.showConsultantForm()"><i data-lucide="plus" style="width:14px;height:14px"></i> جدید</button></div>
      </div>
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">
        ${list.map(c => `<div class="card" style="padding:20px">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px">
            <div><h3 style="font-size:14px;font-weight:700">${c.name}</h3><span class="badge status-active">${c.status}</span></div>
            <div style="display:flex;gap:4px">
              <button class="btn-icon" onclick="App.showConsultantForm('${c.id}')"><i data-lucide="pencil" style="width:15px;height:15px"></i></button>
              <button class="btn-icon" onclick="App.deleteConsultant('${c.id}')"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:2">
            <div>شناسه: ${Utils.toPersianDigits(c.nationalId)}</div>
            <div>تلفن: ${Utils.toPersianDigits(c.phone)}</div>
            <div>رابط: ${c.contactPerson}</div>
            <div>پروژه‌های فعال: ${Utils.toPersianDigits(c.activeProjects)}</div>
          </div>
        </div>`).join('')}
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  showConsultantForm(id) {
    const c = id ? DB.getConsultantById(id) : null;
    this.openModal(c ? 'ویرایش مشاور' : 'ثبت مشاور', `
      <form id="consultant-form">
        <div class="form-group"><label>نام *</label><input class="form-control" name="name" value="${c?.name || ''}" required></div>
        <div class="form-row">
          <div class="form-group"><label>شناسه ملی</label><input class="form-control" name="nationalId" value="${c?.nationalId || ''}"></div>
          <div class="form-group"><label>تلفن</label><input class="form-control" name="phone" value="${c?.phone || ''}"></div>
        </div>
        <div class="form-group"><label>آدرس</label><input class="form-control" name="address" value="${c?.address || ''}"></div>
        <div class="form-row">
          <div class="form-group"><label>شخص رابط</label><input class="form-control" name="contactPerson" value="${c?.contactPerson || ''}"></div>
          <div class="form-group"><label>وضعیت</label><select class="form-control" name="status">
            <option value="فعال" ${c?.status !== 'معلق' ? 'selected' : ''}>فعال</option>
            <option value="معلق" ${c?.status === 'معلق' ? 'selected' : ''}>معلق</option>
          </select></div>
        </div>
      </form>
    `, `<button class="btn btn-primary" onclick="App.saveConsultant('${id || ''}')">ذخیره</button>
      <button class="btn btn-secondary" onclick="App.closeModal()">انصراف</button>`);
  },

  saveConsultant(id) {
    const form = document.getElementById('consultant-form');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.name) { Utils.showToast('نام الزامی است', 'error'); return; }
    data.activeProjects = (id ? DB.getConsultantById(id)?.activeProjects : 0) || 0;
    if (id) { DB.updateConsultant(id, data); Utils.showToast('به‌روزرسانی شد', 'success'); }
    else { DB.addConsultant(data); Utils.showToast('ثبت شد', 'success'); }
    this.closeModal();
    this.renderConsultants();
  },

  async deleteConsultant(id) {
    if (await Utils.confirmAction('حذف مشاور؟')) { DB.deleteConsultant(id); Utils.showToast('حذف شد', 'success'); this.renderConsultants(); }
  },

  renderFinance() {
    const projects = DB.getProjects();
    const stats = DB.getDashboardStats();
    document.getElementById('page-content').innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card"><div class="stat-icon"><i data-lucide="landmark"></i></div>
          <div class="stat-value" style="font-size:18px">${Utils.formatMoneyShort(stats.totalBudget)}</div><div class="stat-label">بودجه مصوب</div></div>
        <div class="stat-card"><div class="stat-icon"><i data-lucide="file-signature"></i></div>
          <div class="stat-value" style="font-size:18px">${Utils.formatMoneyShort(stats.totalContract)}</div><div class="stat-label">مجموع قراردادها</div></div>
        <div class="stat-card success"><div class="stat-icon"><i data-lucide="banknote"></i></div>
          <div class="stat-value" style="font-size:18px">${Utils.formatMoneyShort(stats.totalPaid)}</div><div class="stat-label">پرداخت‌ها</div></div>
        <div class="stat-card warning"><div class="stat-icon"><i data-lucide="scale"></i></div>
          <div class="stat-value" style="font-size:18px">${Utils.formatMoneyShort(stats.totalContract - stats.totalPaid)}</div><div class="stat-label">مانده تعهدات</div></div>
      </div>
      <div class="card"><div class="card-header"><h3>خلاصه مالی پروژه‌ها</h3></div>
        <div class="card-body" style="padding:0"><div class="table-wrapper"><table>
          <thead><tr><th>پروژه</th><th>بودجه</th><th>قرارداد</th><th>پرداخت</th><th>مانده</th><th>جذب ٪</th><th>پیشرفت مالی</th></tr></thead>
          <tbody>${projects.map(p => {
            const absorb = p.approvedBudget ? Math.round(p.paidAmount / p.approvedBudget * 100) : 0;
            return `<tr><td>${p.title}</td><td>${Utils.formatMoneyShort(p.approvedBudget)}</td>
              <td>${Utils.formatMoneyShort(p.totalContractAmount)}</td><td>${Utils.formatMoneyShort(p.paidAmount)}</td>
              <td>${Utils.formatMoneyShort(p.remainingCommitment)}</td><td>${Utils.formatPercent(absorb)}</td>
              <td>${Utils.formatPercent(p.financialProgress)}</td></tr>`;
          }).join('')}</tbody>
        </table></div></div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderProgress() {
    const projects = DB.getProjects().filter(p => p.status !== 'خاتمه‌یافته');
    document.getElementById('page-content').innerHTML = `
      <div class="card"><div class="card-header"><h3>پیشرفت پروژه‌های فعال</h3></div>
        <div class="card-body" style="padding:0"><div class="table-wrapper"><table>
          <thead><tr><th>پروژه</th><th>فیزیکی</th><th>مالی</th><th>برنامه‌ای</th><th>انحراف</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>${projects.map(p => {
            const dev = Utils.calcDeviation(p.physicalProgress, p.plannedProgress);
            const ds = Utils.getDeviationStatus(dev);
            return `<tr>
              <td>${p.title}</td>
              <td><div class="progress-text">${Utils.formatPercent(p.physicalProgress)}</div>
                <div class="progress-bar"><div class="fill teal" style="width:${p.physicalProgress}%"></div></div></td>
              <td>${Utils.formatPercent(p.financialProgress)}</td>
              <td>${Utils.formatPercent(p.plannedProgress)}</td>
              <td>${Utils.toPersianDigits(dev)}٪</td>
              <td><span class="badge ${ds.class}">${ds.label}</span></td>
              <td><button class="btn btn-sm btn-secondary" onclick="App.updateProgress('${p.id}')">به‌روزرسانی</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div></div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  updateProgress(id) {
    const p = DB.getProjectById(id);
    if (!p) return;
    this.openModal('به‌روزرسانی پیشرفت — ' + p.title, `
      <form id="progress-form">
        <div class="form-group"><label>فیزیکی ٪ (فعلی: ${Utils.formatPercent(p.physicalProgress)})</label>
          <input class="form-control" name="physicalProgress" type="number" min="0" max="100" value="${p.physicalProgress}"></div>
        <div class="form-group"><label>مالی ٪</label>
          <input class="form-control" name="financialProgress" type="number" min="0" max="100" value="${p.financialProgress}"></div>
        <div class="form-group"><label>برنامه‌ای ٪</label>
          <input class="form-control" name="plannedProgress" type="number" min="0" max="100" value="${p.plannedProgress}"></div>
        <div class="form-group"><label>یادداشت</label><textarea class="form-control" name="notes" rows="2">${p.notes || ''}</textarea></div>
      </form>
    `, `<button class="btn btn-primary" onclick="App.saveProgress('${id}')">ذخیره</button>
      <button class="btn btn-secondary" onclick="App.closeModal()">انصراف</button>`);
  },

  saveProgress(id) {
    const form = document.getElementById('progress-form');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form).entries());
    data.physicalProgress = Number(data.physicalProgress);
    data.financialProgress = Number(data.financialProgress);
    data.plannedProgress = Number(data.plannedProgress);
    if (data.physicalProgress < 0 || data.physicalProgress > 100) { Utils.showToast('مقدار نامعتبر', 'error'); return; }
    DB.updateProject(id, data);
    Utils.showToast('به‌روزرسانی شد', 'success');
    this.closeModal();
    this.renderProgress();
  },

  renderSchedule() {
    const projects = DB.getProjects().filter(p => p.status === 'فعال' || p.status === 'دارای تأخیر');
    document.getElementById('page-content').innerHTML = `
      <div class="card"><div class="card-header"><h3>زمان‌بندی پروژه‌های فعال</h3></div>
        <div class="card-body">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">نمایش گرافیکی بازه زمانی. نمودار گانت تعاملی در نسخه بعدی اضافه می‌شود.</p>
          ${projects.map(p => {
            const pct = p.physicalProgress || 0;
            return `<div style="margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
                <span><strong>${p.title}</strong></span>
                <span style="color:var(--text-muted)">${Utils.toPersianDigits(p.startDate)} → ${Utils.toPersianDigits(p.plannedEndDate)}</span>
              </div>
              <div style="height:28px;background:var(--border);border-radius:6px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--accent-light));border-radius:6px;display:flex;align-items:center;padding:0 10px;font-size:11px;color:white;font-weight:600;min-width:fit-content">
                  ${Utils.formatPercent(pct)}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  renderDocuments() {
    document.getElementById('page-content').innerHTML = `
      <div class="empty-state">
        <i data-lucide="files" style="width:64px;height:64px;opacity:0.3"></i>
        <h3>مدیریت اسناد و مدارک</h3>
        <p style="max-width:400px;margin:8px auto 16px;font-size:13px;line-height:1.8">
          در نسخه اول، ذخیره‌سازی فایل با محدودیت LocalStorage انجام می‌شود.
          برای استفاده عملیاتی، نسخه سرور‌محور توصیه می‌شود.
        </p>
        <button class="btn btn-primary" onclick="Utils.showToast('پیوست فایل در نسخه بعدی تکمیل می‌شود','info')">افزودن سند</button>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderAnalytics() {
    const alerts = Analytics.runAll();
    const risks = Analytics.rankByRisk().slice(0, 10);
    const levelLabels = { critical: 'بحرانی', high: 'بالا', medium: 'متوسط', low: 'پایین' };
    document.getElementById('page-content').innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
        <div class="stat-card danger"><div class="stat-icon"><i data-lucide="alert-octagon"></i></div>
          <div class="stat-value">${Utils.toPersianDigits(alerts.filter(a => a.level === 'critical').length)}</div><div class="stat-label">بحرانی</div></div>
        <div class="stat-card warning"><div class="stat-icon"><i data-lucide="alert-triangle"></i></div>
          <div class="stat-value">${Utils.toPersianDigits(alerts.filter(a => a.level === 'high').length)}</div><div class="stat-label">بالا</div></div>
        <div class="stat-card info"><div class="stat-icon"><i data-lucide="info"></i></div>
          <div class="stat-value">${Utils.toPersianDigits(alerts.filter(a => a.level === 'medium').length)}</div><div class="stat-label">متوسط</div></div>
        <div class="stat-card"><div class="stat-icon"><i data-lucide="list"></i></div>
          <div class="stat-value">${Utils.toPersianDigits(alerts.length)}</div><div class="stat-label">کل هشدارها</div></div>
      </div>
      <div class="charts-grid">
        <div>
          <h3 style="font-size:14px;font-weight:700;margin-bottom:16px">هشدارها و پیشنهادها</h3>
          ${alerts.length === 0 ? '<div class="empty-state"><h3>هشداری نیست</h3></div>' :
            alerts.map(a => `<div class="alert-card ${a.level}">
              <div class="alert-header">
                <span class="alert-title">${a.title}</span>
                <span class="badge ${a.level === 'critical' ? 'status-critical' : a.level === 'high' ? 'status-delay' : 'status-planning'}">${levelLabels[a.level]}</span>
              </div>
              <div class="alert-body">
                <div><strong>نوع:</strong> ${a.type}</div>
                <div><strong>دلیل:</strong> ${a.reason}</div>
                <div class="alert-action">💡 ${a.suggestion}</div>
              </div>
            </div>`).join('')}
        </div>
        <div>
          <h3 style="font-size:14px;font-weight:700;margin-bottom:16px">رتبه‌بندی ریسک</h3>
          <div class="card"><div class="card-body" style="padding:0"><table>
            <thead><tr><th>رتبه</th><th>پروژه</th><th>امتیاز</th><th>سطح</th></tr></thead>
            <tbody>${risks.map((r, i) => `<tr>
              <td>${Utils.toPersianDigits(i + 1)}</td><td>${r.project.title}</td>
              <td><div class="progress-text">${Utils.toPersianDigits(r.riskScore)}</div>
                <div class="progress-bar"><div class="fill ${r.riskScore >= 60 ? 'red' : r.riskScore >= 40 ? 'yellow' : 'green'}" style="width:${r.riskScore}%"></div></div></td>
              <td><span class="badge ${r.level === 'critical' ? 'status-critical' : r.level === 'high' ? 'status-delay' : 'status-ok'}">${levelLabels[r.level]}</span></td>
            </tr>`).join('')}</tbody>
          </table></div></div>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderReports() {
    document.getElementById('page-content').innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">
        ${[
          { title: 'گزارش کلی پروژه‌ها', desc: 'خلاصه تمام پروژه‌ها', action: 'all' },
          { title: 'پروژه‌های فعال', desc: 'در حال اجرا', action: 'active' },
          { title: 'دارای تأخیر', desc: 'عقب‌افتاده از برنامه', action: 'delayed' },
          { title: 'گزارش مالی', desc: 'بودجه و پرداخت', action: 'finance' },
          { title: 'پیمانکاران', desc: 'عملکرد پیمانکاران', action: 'contractors' },
          { title: 'توزیع منطقه‌ای', desc: 'بر اساس منطقه', action: 'region' }
        ].map(r => `<div class="card" style="padding:24px;cursor:pointer" onclick="App.generateReport('${r.action}')">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:6px">${r.title}</h3>
          <p style="font-size:12px;color:var(--text-muted)">${r.desc}</p>
          <div style="margin-top:12px"><span class="btn btn-sm btn-secondary">تولید گزارش</span></div>
        </div>`).join('')}
      </div>
      <div id="report-output" style="margin-top:24px"></div>`;
  },

  generateReport(type) {
    let projects = DB.getProjects();
    let title = 'گزارش';
    if (type === 'active') { projects = projects.filter(p => p.status === 'فعال'); title = 'پروژه‌های فعال'; }
    else if (type === 'delayed') { projects = projects.filter(p => p.status === 'دارای تأخیر'); title = 'پروژه‌های دارای تأخیر'; }
    else if (type === 'all') title = 'گزارش کلی پروژه‌ها';
    else if (type === 'finance') title = 'گزارش مالی';
    else if (type === 'contractors') {
      const list = DB.getContractors();
      document.getElementById('report-output').innerHTML = `
        <div class="card" id="report-content">
          <div class="card-header"><h3>گزارش پیمانکاران</h3>
            <button class="btn btn-sm btn-secondary" onclick="Utils.printElement('report-content','گزارش پیمانکاران')">چاپ</button></div>
          <div class="card-body" style="padding:0"><table>
            <thead><tr><th>نام</th><th>وضعیت</th><th>پروژه‌های فعال</th><th>مجموع قرارداد</th></tr></thead>
            <tbody>${list.map(c => `<tr><td>${c.name}</td><td>${c.status}</td>
              <td>${Utils.toPersianDigits(c.activeProjects)}</td><td>${Utils.formatMoneyShort(c.totalContracts)}</td></tr>`).join('')}
          </tbody></table></div></div>`;
      return;
    } else if (type === 'region') {
      const dist = DB.getRegionDistribution();
      document.getElementById('report-output').innerHTML = `
        <div class="card" id="report-content">
          <div class="card-header"><h3>توزیع منطقه‌ای</h3>
            <button class="btn btn-sm btn-secondary" onclick="Utils.printElement('report-content','گزارش منطقه‌ای')">چاپ</button></div>
          <div class="card-body" style="padding:0"><table>
            <thead><tr><th>منطقه</th><th>تعداد</th></tr></thead>
            <tbody>${Object.entries(dist).map(([k,v]) => `<tr><td>${k}</td><td>${Utils.toPersianDigits(v)}</td></tr>`).join('')}
          </tbody></table></div></div>`;
      return;
    }
    document.getElementById('report-output').innerHTML = `
      <div class="card" id="report-content">
        <div class="card-header"><h3>${title}</h3>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" onclick="Utils.printElement('report-content','${title}')">چاپ</button>
            <button class="btn btn-sm btn-secondary" onclick="App.exportProjectsCSV()">Excel</button>
          </div></div>
        <div class="card-body" style="padding:0"><table>
          <thead><tr><th>کد</th><th>عنوان</th><th>وضعیت</th><th>فیزیکی</th><th>مالی</th><th>بودجه</th><th>منطقه</th></tr></thead>
          <tbody>${projects.map(p => `<tr>
            <td>${Utils.toPersianDigits(p.code)}</td><td>${p.title}</td><td>${p.status}</td>
            <td>${Utils.formatPercent(p.physicalProgress)}</td><td>${Utils.formatPercent(p.financialProgress)}</td>
            <td>${Utils.formatMoneyShort(p.approvedBudget)}</td><td>${p.region}</td>
          </tr>`).join('')}</tbody>
        </table></div></div>`;
  },

  renderSettings() {
    const settings = DB.getSettings();
    document.getElementById('page-content').innerHTML = `
      <div class="charts-grid">
        <div class="card"><div class="card-header"><h3>تنظیمات عمومی</h3></div>
          <div class="card-body">
            <div class="form-group"><label>نام سامانه</label><input class="form-control" id="set-company" value="${settings.companyName || ''}"></div>
            <div class="form-group"><label>واحد پول</label><select class="form-control" id="set-currency">
              <option value="ریال" ${settings.currency === 'ریال' ? 'selected' : ''}>ریال</option>
              <option value="تومان" ${settings.currency === 'تومان' ? 'selected' : ''}>تومان</option>
            </select></div>
            <div class="form-group"><label>تم</label><select class="form-control" id="set-theme">
              <option value="light" ${settings.theme !== 'dark' ? 'selected' : ''}>روشن</option>
              <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>تاریک</option>
            </select></div>
            <button class="btn btn-primary" onclick="App.saveSettings()">ذخیره</button>
          </div>
        </div>
        <div class="card"><div class="card-header"><h3>مدیریت داده‌ها</h3></div>
          <div class="card-body">
            <p style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.8">داده‌ها در LocalStorage ذخیره می‌شوند.</p>
            <div style="display:flex;flex-direction:column;gap:10px">
              <button class="btn btn-secondary" onclick="DB.exportJSON();Utils.showToast('پشتیبان دانلود شد','success')"><i data-lucide="download" style="width:16px;height:16px"></i> دانلود پشتیبان</button>
              <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()"><i data-lucide="upload" style="width:16px;height:16px"></i> بازیابی از فایل</button>
              <input type="file" id="import-file" accept=".json" style="display:none" onchange="App.importData(event)">
              <hr style="border:none;border-top:1px solid var(--border);margin:8px 0">
              <button class="btn btn-secondary" onclick="App.resetSample()"><i data-lucide="refresh-cw" style="width:16px;height:16px"></i> بارگذاری داده‌های نمونه</button>
              <button class="btn btn-danger" onclick="App.clearAllData()"><i data-lucide="trash-2" style="width:16px;height:16px"></i> پاک کردن همه</button>
            </div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:20px"><div class="card-header"><h3>درباره</h3></div>
        <div class="card-body" style="font-size:13px;line-height:2;color:var(--text-secondary)">
          <p><strong>سامانه هوشمند مدیریت پروژه‌ها</strong> — نسخه ۱.۰.۰</p>
          <p>نسخه اول (Standalone Frontend) — بدون نیاز به سرور</p>
          <p>آماده انتشار روی GitHub Pages</p>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  saveSettings() {
    DB.updateSettings({
      companyName: document.getElementById('set-company')?.value,
      currency: document.getElementById('set-currency')?.value,
      theme: document.getElementById('set-theme')?.value
    });
    this.applyTheme();
    Utils.showToast('ذخیره شد', 'success');
  },

  async resetSample() {
    if (await Utils.confirmAction('داده‌ها با نمونه جایگزین شوند؟')) {
      DB.resetToSample();
      this.navigate(this.currentPage);
    }
  },

  async clearAllData() {
    if (await Utils.confirmAction('تمام اطلاعات حذف شود؟ غیرقابل بازگشت!')) {
      DB.clearAll();
      this.navigate(this.currentPage);
    }
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      if (DB.importJSON(e.target.result)) {
        Utils.showToast('بازیابی موفق', 'success');
        this.navigate(this.currentPage);
      } else Utils.showToast('خطا در فایل', 'error');
    };
    reader.readAsText(file);
  },

  openModal(title, body, footer = '', sizeClass = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-footer').innerHTML = footer;
    const modal = document.getElementById('modal');
    modal.className = 'modal ' + sizeClass;
    document.getElementById('modal-overlay').classList.add('active');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  closeModal() {
    document.getElementById('modal-overlay')?.classList.remove('active');
  },

  globalSearch(query) {
    if (!query || query.length < 2) return;
    const results = Utils.searchFilter(DB.getProjects(), query, ['title', 'code', 'organization']);
    if (results.length > 0) {
      this.filters.projects = { search: query };
      this.pagination.projects = 1;
      this.navigate('projects');
    } else Utils.showToast('نتیجه‌ای یافت نشد', 'info');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
