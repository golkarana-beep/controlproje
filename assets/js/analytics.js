/**
 * ماژول تحلیل هوشمند — مبتنی بر قواعد و داده‌های واقعی
 */

const Analytics = {
  // اجرای تمام تحلیل‌ها
  runAll() {
    const alerts = [];
    alerts.push(...this.detectDelayProjects());
    alerts.push(...this.detectProgressAnomaly());
    alerts.push(...this.detectPhysicalFinancialMismatch());
    alerts.push(...this.detectExpiringContracts());
    alerts.push(...this.detectFinancialRisk());
    alerts.push(...this.detectContractIncrease());

    // مرتب‌سازی بر اساس سطح اهمیت
    const priority = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => priority[a.level] - priority[b.level]);
    return alerts;
  },

  // پروژه‌های دارای تأخیر
  detectDelayProjects() {
    const projects = DB.getProjects();
    return projects
      .filter(p => {
        const dev = Utils.calcDeviation(p.physicalProgress, p.plannedProgress);
        return p.status === 'دارای تأخیر' || dev <= -10;
      })
      .map(p => {
        const dev = Utils.calcDeviation(p.physicalProgress, p.plannedProgress);
        const level = dev <= -20 ? 'critical' : dev <= -10 ? 'high' : 'medium';
        return {
          id: 'delay-' + p.id,
          type: 'تأخیر پیشرفت',
          level,
          title: `تأخیر در پروژه «${p.title}»`,
          projectId: p.id,
          projectCode: p.code,
          projectTitle: p.title,
          reason: `پیشرفت فیزیکی ${Utils.toPersianDigits(p.physicalProgress)}٪ در مقابل پیشرفت برنامه‌ای ${Utils.toPersianDigits(p.plannedProgress)}٪ — انحراف ${Utils.toPersianDigits(Math.abs(dev))} واحد درصد منفی`,
          support: {
            physical: p.physicalProgress,
            planned: p.plannedProgress,
            deviation: dev,
            status: p.status,
            delayMonths: p.delayMonths
          },
          suggestion: dev <= -20
            ? 'بررسی فوری دلایل تأخیر و تشکیل جلسه مدیریت بحران پیشنهاد می‌شود.'
            : 'برنامه جبرانی تدوین و منابع اضافی تخصیص داده شود.'
        };
      });
  },

  // پیشرفت غیرعادی (خیلی جلو یا خیلی عقب)
  detectProgressAnomaly() {
    const projects = DB.getProjects().filter(p => p.status === 'فعال' || p.status === 'دارای تأخیر');
    return projects
      .filter(p => {
        const dev = Utils.calcDeviation(p.physicalProgress, p.plannedProgress);
        return Math.abs(dev) >= 15;
      })
      .map(p => {
        const dev = Utils.calcDeviation(p.physicalProgress, p.plannedProgress);
        const isAhead = dev > 0;
        return {
          id: 'anomaly-' + p.id,
          type: 'پیشرفت غیرعادی',
          level: Math.abs(dev) >= 25 ? 'high' : 'medium',
          title: isAhead
            ? `پیشرفت جلوتر از برنامه در «${p.title}»`
            : `پیشرفت غیرعادی عقب‌افتاده در «${p.title}»`,
          projectId: p.id,
          projectCode: p.code,
          projectTitle: p.title,
          reason: isAhead
            ? `پیشرفت فیزیکی ${Utils.toPersianDigits(p.physicalProgress)}٪ در حالی که برنامه ${Utils.toPersianDigits(p.plannedProgress)}٪ بوده است (${Utils.toPersianDigits(dev)}+ واحد درصد)`
            : `اختلاف قابل توجه بین پیشرفت واقعی و برنامه‌ای`,
          support: { physical: p.physicalProgress, planned: p.plannedProgress, deviation: dev },
          suggestion: isAhead
            ? 'صحت گزارش پیشرفت بررسی شود و در صورت تأیید، برنامه به‌روزرسانی گردد.'
            : 'تحلیل ریشه‌ای علل انحراف انجام شود.'
        };
      });
  },

  // مغایرت پیشرفت فیزیکی و مالی
  detectPhysicalFinancialMismatch() {
    const projects = DB.getProjects().filter(p => p.status !== 'خاتمه‌یافته');
    return projects
      .filter(p => Math.abs((p.physicalProgress || 0) - (p.financialProgress || 0)) >= 15)
      .map(p => {
        const diff = (p.physicalProgress || 0) - (p.financialProgress || 0);
        return {
          id: 'mismatch-' + p.id,
          type: 'مغایرت فیزیکی-مالی',
          level: Math.abs(diff) >= 25 ? 'high' : 'medium',
          title: `مغایرت پیشرفت فیزیکی و مالی در «${p.title}»`,
          projectId: p.id,
          projectCode: p.code,
          projectTitle: p.title,
          reason: diff > 0
            ? `پیشرفت فیزیکی (${Utils.toPersianDigits(p.physicalProgress)}٪) بالاتر از پیشرفت مالی (${Utils.toPersianDigits(p.financialProgress)}٪) است — احتمال تأخیر در پرداخت‌ها`
            : `پیشرفت مالی (${Utils.toPersianDigits(p.financialProgress)}٪) بالاتر از پیشرفت فیزیکی (${Utils.toPersianDigits(p.physicalProgress)}٪) است — نیاز به بررسی صحت صورت‌وضعیت‌ها`,
          support: {
            physical: p.physicalProgress,
            financial: p.financialProgress,
            difference: diff
          },
          suggestion: diff > 0
            ? 'وضعیت صورت‌وضعیت‌ها و پرداخت‌ها بررسی شود.'
            : 'صحت اندازه‌گیری پیشرفت فیزیکی و تطابق با صورت‌وضعیت‌ها کنترل شود.'
        };
      });
  },

  // قراردادهای نزدیک به پایان
  detectExpiringContracts() {
    const contracts = DB.getContracts().filter(c => c.status === 'فعال');
    const today = Utils.getTodayJalali();
    const results = [];

    contracts.forEach(c => {
      const end = Utils.parseJalali(c.endDate);
      if (!end) return;
      // تقریبی: اختلاف ماه
      const monthDiff = (end.year - today.year) * 12 + (end.month - today.month);
      if (monthDiff <= 3 && monthDiff >= 0) {
        const project = DB.getProjectById(c.projectId);
        results.push({
          id: 'exp-' + c.id,
          type: 'انقضای قرارداد',
          level: monthDiff <= 1 ? 'high' : 'medium',
          title: `قرارداد «${c.number}» نزدیک به پایان است`,
          projectId: c.projectId,
          projectCode: project ? project.code : '—',
          projectTitle: project ? project.title : '—',
          reason: `تاریخ پایان قرارداد: ${Utils.toPersianDigits(c.endDate)} — حدود ${Utils.toPersianDigits(monthDiff)} ماه باقی مانده`,
          support: { contractNumber: c.number, endDate: c.endDate, monthDiff },
          suggestion: monthDiff <= 1
            ? 'اقدام فوری برای تمدید یا تحویل پروژه ضروری است.'
            : 'برنامه تحویل یا تمدید قرارداد تدوین شود.'
        });
      }
    });
    return results;
  },

  // ریسک مالی
  detectFinancialRisk() {
    const projects = DB.getProjects().filter(p => p.status !== 'خاتمه‌یافته');
    return projects
      .filter(p => {
        const budget = p.approvedBudget || 1;
        const contract = p.totalContractAmount || 0;
        const paid = p.paidAmount || 0;
        // قرارداد بیشتر از بودجه یا پرداخت بیش از ۸۵٪ با پیشرفت کمتر از ۶۰٪
        return contract > budget * 1.05 ||
          (paid / budget > 0.85 && (p.physicalProgress || 0) < 60);
      })
      .map(p => {
        const budget = p.approvedBudget || 1;
        const contract = p.totalContractAmount || 0;
        const overBudget = contract > budget;
        return {
          id: 'finrisk-' + p.id,
          type: 'ریسک مالی',
          level: overBudget ? 'critical' : 'high',
          title: `ریسک مالی در پروژه «${p.title}»`,
          projectId: p.id,
          projectCode: p.code,
          projectTitle: p.title,
          reason: overBudget
            ? `مبلغ کل قرارداد (${Utils.formatMoneyShort(contract)}) بیش از بودجه مصوب (${Utils.formatMoneyShort(budget)}) است`
            : `پرداخت‌ها به ${Utils.formatPercent((p.paidAmount / budget) * 100)} بودجه رسیده در حالی که پیشرفت فیزیکی ${Utils.formatPercent(p.physicalProgress)} است`,
          support: {
            budget: p.approvedBudget,
            contract: p.totalContractAmount,
            paid: p.paidAmount,
            physical: p.physicalProgress
          },
          suggestion: 'بازنگری بودجه و کنترل هزینه‌ها و صورت‌وضعیت‌ها توصیه می‌شود.'
        };
      });
  },

  // افزایش غیرعادی مبلغ قرارداد
  detectContractIncrease() {
    const projects = DB.getProjects();
    return projects
      .filter(p => {
        const initial = p.initialContractAmount || 1;
        const additional = p.additionalContracts || 0;
        return (additional / initial) >= 0.15;
      })
      .map(p => {
        const pct = Math.round(((p.additionalContracts || 0) / (p.initialContractAmount || 1)) * 100);
        return {
          id: 'increase-' + p.id,
          type: 'افزایش قرارداد',
          level: pct >= 25 ? 'high' : 'medium',
          title: `افزایش قابل توجه مبلغ قرارداد «${p.title}»`,
          projectId: p.id,
          projectCode: p.code,
          projectTitle: p.title,
          reason: `مبلغ الحاقیه ${Utils.formatMoneyShort(p.additionalContracts)} معادل ${Utils.toPersianDigits(pct)}٪ مبلغ اولیه قرارداد`,
          support: {
            initial: p.initialContractAmount,
            additional: p.additionalContracts,
            percent: pct
          },
          suggestion: 'دلایل الحاقیه‌ها و تطابق با دامنه کار اولیه بررسی شود.'
        };
      });
  },

  // رتبه‌بندی ریسک پروژه‌ها
  rankByRisk() {
    const projects = DB.getProjects().filter(p => p.status !== 'خاتمه‌یافته');
    return projects.map(p => {
      let score = 0;
      const dev = Utils.calcDeviation(p.physicalProgress, p.plannedProgress);
      if (dev <= -20) score += 40;
      else if (dev <= -10) score += 25;
      else if (dev < 0) score += 10;

      if (p.status === 'متوقف‌شده') score += 30;
      if (p.status === 'دارای تأخیر') score += 20;

      const mismatch = Math.abs((p.physicalProgress || 0) - (p.financialProgress || 0));
      if (mismatch >= 20) score += 15;

      const budget = p.approvedBudget || 1;
      if ((p.totalContractAmount || 0) > budget) score += 20;

      if (p.priority === 'بالا') score += 10;

      return {
        project: p,
        riskScore: Math.min(score, 100),
        level: score >= 60 ? 'critical' : score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low'
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }
};

window.Analytics = Analytics;
