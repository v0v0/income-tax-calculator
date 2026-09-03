(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const state = { cityData:null, taxPolicy:null, bonusTaxMode:"auto", detailView:"monthly" };
  const DEFAULTS = {
    city:"beijing",
    salary:20000,
    bonusInputMode:"months",
    bonusMonths:3,
    bonusAmount:60000,
    bonusMonth:12,
    bonusTaxMode:"auto",
    socialBaseMode:"auto",
    fundBaseMode:"auto",
    fundRateMode:"default",
    newSalary:60000,
    newBonusInputMode:"months",
    newBonusMonths:4,
    newBonusAmount:240000
  };

  const n = (v,f=0) => Number.isFinite(Number(v)) ? Number(v) : f;
  const clamp = (v,min,max) => Math.max(min, Math.min(max,v));
  const round2 = v => Math.round((v + Number.EPSILON) * 100) / 100;

  function money(v, signed=false) {
    const x = Math.abs(round2(v));
    const text = new Intl.NumberFormat("zh-CN", {
      minimumFractionDigits: x % 1 ? 2 : 0,
      maximumFractionDigits: 2
    }).format(x);
    if (signed) {
      if (v > 0) return `+¥${text}`;
      if (v < 0) return `-¥${text}`;
    }
    return `${v < 0 ? "-" : ""}¥${text}`;
  }

  function deductionMoney(v) {
    return `-¥${new Intl.NumberFormat("zh-CN", {
      minimumFractionDigits: Math.abs(round2(v)) % 1 ? 2 : 0,
      maximumFractionDigits: 2
    }).format(Math.abs(round2(v)))}`;
  }

  function pct(v, signed=false) {
    if (!Number.isFinite(v)) return "—";
    const p = v * 100;
    return `${signed && p > 0 ? "+" : ""}${p.toFixed(1)}%`;
  }

  function rateText(v) {
    const p = v * 100;
    return `${Number.isInteger(p) ? p.toFixed(0) : p.toFixed(1)}%`;
  }

  function currentCity() {
    return state.cityData.cities.find(c => c.id === $("city").value) || state.cityData.cities[0];
  }

  function bonusValue(prefix="") {
    const isNew = prefix === "new";
    const salary = n($(isNew ? "newSalary" : "salary").value);
    const mode = $(isNew ? "newBonusInputMode" : "bonusInputMode").value;
    if (mode === "months") {
      return Math.max(0, salary * n($(isNew ? "newBonusMonths" : "bonusMonths").value));
    }
    return Math.max(0, n($(isNew ? "newBonusAmount" : "bonusAmount").value));
  }

  function bracketTax(taxable, brackets, maxKey) {
    const x = Math.max(0, taxable);
    const row = brackets.find(b => b[maxKey] == null || x <= b[maxKey]) || brackets.at(-1);
    return Math.max(0, round2(x * row.rate - row.quick));
  }

  const comprehensiveTax = taxable => bracketTax(taxable, state.taxPolicy.comprehensiveBrackets, "max");

  function separateBonusTax(bonus) {
    if (bonus <= 0) return 0;
    const monthlyEquivalent = bonus / 12;
    const row = state.taxPolicy.bonusBrackets.find(b => b.monthlyMax == null || monthlyEquivalent <= b.monthlyMax) || state.taxPolicy.bonusBrackets.at(-1);
    return Math.max(0, round2(bonus * row.rate - row.quick));
  }

  function getBaseSettings(salary, city) {
    const socialRaw = $("socialBaseMode").value === "custom" ? n($("socialBaseCustom").value, salary) : salary;
    const fundRaw = $("fundBaseMode").value === "custom" ? n($("fundBaseCustom").value, salary) : salary;
    const f = city.housingFund;
    let personalFundRate = f.defaultPersonalRate;
    let employerFundRate = f.defaultEmployerRate;
    if ($("fundRateMode").value === "custom") {
      personalFundRate = n($("personalFundRate").value) / 100;
      employerFundRate = n($("employerFundRate").value) / 100;
    }
    return { socialRaw, fundRaw, personalFundRate, employerFundRate };
  }

  function calculateContributions(salary, city) {
    const s = getBaseSettings(salary, city);
    const items = {};
    let personalSocial = 0;

    for (const [key,row] of Object.entries(city.socialInsurance)) {
      const base = clamp(s.socialRaw, row.baseMin, row.baseMax);
      const personal = round2(base * row.personalRate + (row.fixedPersonal || 0));
      items[key] = { ...row, base, personal };
      personalSocial += personal;
    }

    const f = city.housingFund;
    const fundBase = clamp(s.fundRaw, f.baseMin, f.baseMax);
    const personalFund = round2(fundBase * s.personalFundRate);
    const employerFund = round2(fundBase * s.employerFundRate);

    return {
      items,
      socialRaw:s.socialRaw,
      fundRaw:s.fundRaw,
      personalSocial:round2(personalSocial),
      fundBase,
      personalFund,
      employerFund,
      totalFund:round2(personalFund + employerFund),
      personalFundRate:s.personalFundRate,
      employerFundRate:s.employerFundRate
    };
  }

  function deductionSelection() {
    const monthly = {};
    const annual = {};
    let monthlyTotal = 0;
    let annualOnlyTotal = 0;

    for (const [key,def] of Object.entries(state.taxPolicy.deductionDefaults)) {
      const check = $(`deduction-${key}`);
      const input = $(`deduction-amount-${key}`);
      if (!check || !check.checked) continue;

      const raw = Math.max(0, n(input.value));
      if (def.kind === "monthly") {
        let amount = raw;
        if (key === "personalPension") amount = Math.min(amount, (def.annualMax || 12000) / 12);
        monthly[key] = amount;
        monthlyTotal += amount;
      } else {
        let amount = raw;
        if (def.annualMax) amount = Math.min(amount, def.annualMax);
        annual[key] = amount;
        annualOnlyTotal += amount;
      }
    }

    return {
      monthly,
      annual,
      monthlyTotal:round2(monthlyTotal),
      annualOnlyTotal:round2(annualOnlyTotal),
      annualTotal:round2(monthlyTotal * 12 + annualOnlyTotal)
    };
  }

  function calculatePlan({salary, bonus, bonusMonth, mode, city}) {
    salary = Math.max(0, salary);
    bonus = Math.max(0, bonus);
    bonusMonth = clamp(Math.round(bonusMonth), 1, 12);

    const contributions = calculateContributions(salary, city);
    const deductions = deductionSelection();
    let cumulativePayrollGross = 0;
    let cumulativeWithheldPayroll = 0;
    let totalWithheld = 0;
    let cumulativeCash = 0;
    const rows = [];
    const bonusSeparate = mode === "separate" ? separateBonusTax(bonus) : 0;

    for (let month=1; month<=12; month++) {
      const bonusThisMonth = month === bonusMonth ? bonus : 0;
      const mergedBonusThisMonth = mode === "merged" ? bonusThisMonth : 0;
      cumulativePayrollGross += salary + mergedBonusThisMonth;

      const cumulativeTaxable = Math.max(
        0,
        cumulativePayrollGross
        - state.taxPolicy.monthlyBasicDeduction * month
        - contributions.personalSocial * month
        - contributions.personalFund * month
        - deductions.monthlyTotal * month
      );

      const targetCumulativeTax = comprehensiveTax(cumulativeTaxable);
      const payrollTaxThisMonth = Math.max(0, round2(targetCumulativeTax - cumulativeWithheldPayroll));
      cumulativeWithheldPayroll = round2(cumulativeWithheldPayroll + payrollTaxThisMonth);

      const bonusTaxThisMonth = mode === "separate" && month === bonusMonth ? bonusSeparate : 0;
      const taxThisMonth = round2(payrollTaxThisMonth + bonusTaxThisMonth);
      totalWithheld = round2(totalWithheld + taxThisMonth);

      const cash = round2(salary + bonusThisMonth - contributions.personalSocial - contributions.personalFund - taxThisMonth);
      cumulativeCash = round2(cumulativeCash + cash);

      rows.push({
        month,
        salary,
        bonus:bonusThisMonth,
        pension:contributions.items.pension?.personal || 0,
        medical:contributions.items.medical?.personal || 0,
        unemployment:contributions.items.unemployment?.personal || 0,
        personalFund:contributions.personalFund,
        tax:taxThisMonth,
        cash,
        fundTotal:contributions.totalFund,
        cumulativeCash
      });
    }

    const salaryTaxableAnnual = Math.max(
      0,
      salary * 12
      - state.taxPolicy.annualBasicDeduction
      - contributions.personalSocial * 12
      - contributions.personalFund * 12
      - deductions.annualTotal
    );

    let finalTax;
    if (mode === "separate") {
      finalTax = round2(comprehensiveTax(salaryTaxableAnnual) + bonusSeparate);
    } else {
      finalTax = comprehensiveTax(Math.max(0, salaryTaxableAnnual + bonus));
    }

    const settlement = round2(totalWithheld - finalTax);
    const grossAnnual = round2(salary * 12 + bonus);
    const annualCash = round2(cumulativeCash + settlement);
    const personalFundAnnual = round2(contributions.personalFund * 12);
    const employerFundAnnual = round2(contributions.employerFund * 12);
    const fundTotalAnnual = round2(contributions.totalFund * 12);
    const socialAnnual = round2(contributions.personalSocial * 12);
    const comprehensiveAnnual = round2(annualCash + fundTotalAnnual);

    return {
      mode,salary,bonus,grossAnnual,annualCash,finalTax,settlement,totalWithheld,rows,
      contributions,deductions,personalFundAnnual,employerFundAnnual,fundTotalAnnual,
      socialAnnual,comprehensiveAnnual,
      cashRate:grossAnnual ? annualCash/grossAnnual : 0,
      comprehensiveRate:grossAnnual ? comprehensiveAnnual/grossAnnual : 0,
      separateBonusTax:bonusSeparate
    };
  }

  function chooseResults(salary, bonus, city) {
    const args = { salary, bonus, bonusMonth:n($("bonusMonth").value,12), city };
    const separate = calculatePlan({...args, mode:"separate"});
    const merged = calculatePlan({...args, mode:"merged"});
    const recommended = separate.annualCash >= merged.annualCash ? separate : merged;

    let selected = recommended;
    if (state.bonusTaxMode === "separate") selected = separate;
    if (state.bonusTaxMode === "merged") selected = merged;

    return { separate, merged, recommended, selected };
  }

  function renderCityPolicy(city, c) {
    const labels = state.cityData.statusLegend || {};
    $("policyStatus").textContent = labels[city.status] || city.status || "";
    $("policyStatus").className = `status-chip ${city.status || ""}`;
    $("policySummary").textContent = `${city.name} · ${city.note || "按当前公开规则估算"}`;

    $("fundDefaultRate").textContent = `个人 ${rateText(city.housingFund.defaultPersonalRate)} · 公司 ${rateText(city.housingFund.defaultEmployerRate)}`;
    $("fundRateHint").textContent = city.housingFund.note || "";

    const rows = [];
    for (const item of Object.values(c.items)) {
      rows.push(`<tr>
        <td>${item.label}</td>
        <td>${money(item.baseMin)} ~ ${money(item.baseMax)}</td>
        <td>${money(item.base)}</td>
        <td>${rateText(item.personalRate)}${item.fixedPersonal ? ` + ${money(item.fixedPersonal)}` : ""}</td>
        <td>${money(item.personal)}</td>
        <td>—</td>
      </tr>`);
    }

    rows.push(`<tr class="fund-source-row">
      <td><b>住房公积金</b></td>
      <td>${money(city.housingFund.baseMin)} ~ ${money(city.housingFund.baseMax)}</td>
      <td>${money(c.fundBase)}</td>
      <td>${rateText(c.personalFundRate)}</td>
      <td>${money(c.personalFund)}</td>
      <td>${money(c.employerFund)} (${rateText(c.employerFundRate)})</td>
    </tr>`);

    $("contributionBody").innerHTML = rows.join("");
    $("monthlySocial").textContent = money(c.personalSocial);
    $("monthlyPersonalFund").textContent = money(c.personalFund);
    $("monthlyEmployerFund").textContent = money(c.employerFund);
    $("monthlyFundTotal").textContent = money(c.totalFund);

    $("fundPolicyRange").textContent = `${money(city.housingFund.baseMin)} ~ ${money(city.housingFund.baseMax)}`;
    $("fundActualBase").textContent = money(c.fundBase);
    $("fundPersonalRateText").textContent = rateText(c.personalFundRate);

    const salary = n($("salary").value);
    const messages = [];
    if ($("fundBaseMode").value === "auto" && (salary < city.housingFund.baseMin || salary > city.housingFund.baseMax)) {
      messages.push(`公积金实际计费基数为 ${money(c.fundBase)}。`);
    }
    messages.push("自动基数按月工资估算；实际单位申报通常依据本人上年度月平均工资，可手工覆盖。");
    $("baseHint").textContent = messages.join(" ");
  }

  function modeName(mode) {
    return mode === "separate" ? "单独计税" : "并入综合所得";
  }

  function updateAutoOption(recommendedMode) {
    const select = $("bonusTaxModeSelect");
    const autoOption = select.querySelector('option[value="auto"]');
    autoOption.textContent = `自动最优（${modeName(recommendedMode)}）`;
  }

  function renderMetrics(r, recommendedMode) {
    $("grossAnnual").textContent = money(r.grossAnnual);
    $("annualCash").textContent = money(r.annualCash);
    $("personalFundAnnual").textContent = money(r.personalFundAnnual);
    $("employerFundAnnual").textContent = money(r.employerFundAnnual);
    $("fundTotalAnnual").textContent = money(r.fundTotalAnnual);
    $("socialAnnual").textContent = money(r.socialAnnual);
    $("annualTax").textContent = money(r.finalTax);
    $("comprehensiveAnnual").textContent = money(r.comprehensiveAnnual);
    $("cashRate").textContent = pct(r.cashRate);
    $("comprehensiveRate").textContent = pct(r.comprehensiveRate);

    const s = r.settlement;
    const settlement = $("settlement");
    settlement.textContent = s > 0 ? `预计退税 ${money(s)}` : s < 0 ? `预计补税 ${money(-s)}` : "¥0";
    settlement.className = s > 0 ? "positive" : s < 0 ? "negative" : "";

    if (state.bonusTaxMode === "auto") {
      $("selectedModeText").textContent = `自动最优：${modeName(recommendedMode)}`;
    } else {
      $("selectedModeText").textContent = `当前选择：${modeName(r.mode)}`;
    }
  }

  function renderBonusComparison(results) {
    const diff = round2(Math.abs(results.separate.annualCash - results.merged.annualCash));
    const recommendedMode = results.recommended.mode;
    const selectedMode = results.selected.mode;

    const card = (r,title) => {
      const recommended = r.mode === recommendedMode;
      const selected = r.mode === selectedMode;
      const bonusTaxText = r.mode === "separate" ? money(r.separateBonusTax) : "并入累计预扣";
      const ribbon = recommended ? `<span class="ribbon">推荐 · ${diff ? `多到手 ${money(diff)}` : "结果相同"}</span>` : "";
      return `<div class="bonus-option ${recommended ? "recommended" : ""} ${selected ? "selected" : ""}">
        ${ribbon}
        <h3>${title}</h3>
        <div class="cash">${money(r.annualCash)}</div>
        <dl>
          <dt>年度最终税后现金</dt><dd>${money(r.annualCash)}</dd>
          <dt>全年最终个税</dt><dd>${money(r.finalTax)}</dd>
          <dt>年终奖计税</dt><dd>${bonusTaxText}</dd>
          <dt>现金 + 公积金</dt><dd>${money(r.comprehensiveAnnual)}</dd>
        </dl>
      </div>`;
    };

    $("bonusComparison").innerHTML =
      card(results.separate, "全年一次性奖金单独计税") +
      card(results.merged, "奖金并入综合所得");
  }

  function renderMonthly(r) {
    const rows = r.rows.map(x => `<tr>
      <td class="cell-meta">${x.month} 月</td>
      <td class="cell-income">${money(x.salary)}</td>
      <td class="cell-income">${x.bonus ? money(x.bonus) : "—"}</td>
      <td class="cell-social">${money(x.pension)}</td>
      <td class="cell-social">${money(x.medical)}</td>
      <td class="cell-social">${money(x.unemployment)}</td>
      <td class="cell-fund">${money(x.personalFund)}</td>
      <td class="cell-tax">${money(x.tax)}</td>
      <td class="cell-cash"><b>${money(x.cash)}</b></td>
      <td class="cell-fund">${money(x.fundTotal)}</td>
      <td class="cell-cash">${money(x.cumulativeCash)}</td>
    </tr>`);

    if (Math.abs(r.settlement) >= .01) {
      rows.push(`<tr class="settlement-row">
        <td class="cell-meta"><b>年度汇算</b></td>
        <td class="cell-income">—</td><td class="cell-income">—</td>
        <td class="cell-social">—</td><td class="cell-social">—</td><td class="cell-social">—</td>
        <td class="cell-fund">—</td>
        <td class="cell-tax ${r.settlement > 0 ? "positive" : "negative"}">${r.settlement > 0 ? "退税 " + money(r.settlement) : "补税 " + money(-r.settlement)}</td>
        <td class="cell-cash"><b>${money(r.settlement)}</b></td>
        <td class="cell-fund">—</td>
        <td class="cell-cash"><b>${money(r.annualCash)}</b></td>
      </tr>`);
    }

    $("monthlyBody").innerHTML = rows.join("");
  }

  function annualSection(cls, title, items) {
    return `<section class="annual-section ${cls}">
      <h3>${title}</h3>
      <div class="annual-section-grid">
        ${items.map(([label,value,display]) => `<div class="annual-item"><span>${label}</span><b>${display || money(value)}</b></div>`).join("")}
      </div>
    </section>`;
  }

  function renderAnnual(r) {
    const social = r.contributions.items;
    const html = [
      annualSection("annual-income","税前收入",[
        ["工资收入",r.salary*12],
        ["年终奖",r.bonus],
        ["税前总收入",r.grossAnnual]
      ]),
      annualSection("annual-social","五险扣除",[
        ["个人养老保险",(social.pension?.personal || 0)*12],
        ["个人医疗保险",(social.medical?.personal || 0)*12],
        ["个人失业保险",(social.unemployment?.personal || 0)*12],
        ["个人五险合计",r.socialAnnual]
      ]),
      annualSection("annual-deduction","专项扣除",[
        ["专项/其他税前扣除",r.deductions.annualTotal],
        ["发薪阶段已预扣税",r.totalWithheld]
      ]),
      annualSection("annual-fund","公积金",[
        ["个人公积金",r.personalFundAnnual],
        ["公司公积金",r.employerFundAnnual],
        ["公积金双边入账",r.fundTotalAnnual]
      ]),
      annualSection("annual-result","税与到手收入",[
        ["全年最终个税",r.finalTax],
        ["年度汇算退/补税",Math.abs(r.settlement), r.settlement > 0 ? `+${money(r.settlement)}` : r.settlement < 0 ? deductionMoney(-r.settlement) : "¥0"],
        ["年度最终税后现金",r.annualCash],
        ["现金 + 公积金",r.comprehensiveAnnual]
      ])
    ];
    $("annualList").innerHTML = html.join("");
  }

  function increase(a,b) {
    if (b === 0) return a === 0 ? 0 : NaN;
    return (a-b)/b;
  }

  function renderPlanComparison(cur,next) {
    const cashInc = increase(next.annualCash, cur.annualCash);
    const fundInc = increase(next.fundTotalAnnual, cur.fundTotalAnnual);
    const totalInc = increase(next.comprehensiveAnnual, cur.comprehensiveAnnual);

    $("cashIncrease").textContent = pct(cashInc,true);
    $("fundIncrease").textContent = pct(fundInc,true);
    $("totalIncrease").textContent = pct(totalInc,true);

    $("newAnnualSalary").textContent = money(next.salary * 12);
    $("newBonusGross").textContent = money(next.bonus);
    $("newGrossAnnual").textContent = money(next.grossAnnual);
    $("newSocialDeduction").textContent = deductionMoney(next.socialAnnual);
    $("newFundDeduction").textContent = deductionMoney(next.personalFundAnnual);
    $("newTaxDeduction").textContent = deductionMoney(next.finalTax);
    $("newCashAmount").textContent = money(next.annualCash);
    $("newFundCredit").textContent = money(next.fundTotalAnnual);
    $("newComprehensiveAmount").textContent = money(next.comprehensiveAnnual);

    const rows = [
      ["年薪",cur.salary*12,next.salary*12,false],
      ["年终奖",cur.bonus,next.bonus,false],
      ["五险个人扣除",cur.socialAnnual,next.socialAnnual,true],
      ["个人公积金扣除",cur.personalFundAnnual,next.personalFundAnnual,true],
      ["全年个税",cur.finalTax,next.finalTax,true],
      ["税后现金",cur.annualCash,next.annualCash,false],
      ["公积金双边入账",cur.fundTotalAnnual,next.fundTotalAnnual,false],
      ["现金 + 公积金",cur.comprehensiveAnnual,next.comprehensiveAnnual,false]
    ];

    $("planComparisonBody").innerHTML = rows.map(([label,oldValue,newValue,isDeduction]) => {
      const delta = round2(newValue - oldValue);
      const ratio = increase(newValue, oldValue);
      const oldText = isDeduction ? deductionMoney(oldValue) : money(oldValue);
      const newText = isDeduction ? deductionMoney(newValue) : money(newValue);
      const deltaText = isDeduction
        ? (delta >= 0 ? `-${money(delta).replace(/^[-+]?¥/,"¥")}` : `+${money(-delta)}`)
        : money(delta,true);
      return `<tr>
        <td>${label}</td>
        <td>${oldText}</td>
        <td>${newText}</td>
        <td>${deltaText}</td>
        <td class="${ratio >= 0 ? "positive" : "negative"}">${pct(ratio,true)}</td>
      </tr>`;
    }).join("");
  }

  function renderDeductions() {
    const defs = state.taxPolicy.deductionDefaults;
    $("deductionGrid").innerHTML = Object.entries(defs).map(([key,def]) => {
      const value = def.kind === "monthly" ? def.monthly : def.annual;
      const unit = def.kind === "monthly" ? "/月" : "/年";
      return `<div class="deduction-item">
        <input id="deduction-${key}" type="checkbox">
        <label for="deduction-${key}">${def.label}</label>
        <div class="amount-wrap">
          <input id="deduction-amount-${key}" type="number" min="0" step="100" value="${value || 0}">
          <span class="unit">${unit}</span>
        </div>
      </div>`;
    }).join("");

    Object.keys(defs).forEach(key => {
      $(`deduction-${key}`).addEventListener("change", () => {
        if (key === "housingLoan" && $(`deduction-${key}`).checked) $("deduction-rent").checked = false;
        if (key === "rent" && $(`deduction-${key}`).checked) $("deduction-housingLoan").checked = false;
        update();
      });
      $(`deduction-amount-${key}`).addEventListener("input", update);
    });
  }

  function updateVisibility() {
    const bonusMode = $("bonusInputMode").value;
    $("bonusMonthsWrap").classList.toggle("hidden", bonusMode !== "months");
    $("bonusAmountWrap").classList.toggle("hidden", bonusMode !== "amount");

    const newBonusMode = $("newBonusInputMode").value;
    $("newBonusMonthsWrap").classList.toggle("hidden", newBonusMode !== "months");
    $("newBonusAmountWrap").classList.toggle("hidden", newBonusMode !== "amount");

    $("socialBaseCustomWrap").classList.toggle("hidden", $("socialBaseMode").value !== "custom");
    $("fundBaseCustomWrap").classList.toggle("hidden", $("fundBaseMode").value !== "custom");

    const customFundRate = $("fundRateMode").value === "custom";
    $("fundDefaultLine").classList.toggle("hidden", customFundRate);
    $("fundCustomPanel").classList.toggle("hidden", !customFundRate);
  }

  function update() {
    if (!state.cityData || !state.taxPolicy) return;
    updateVisibility();

    const city = currentCity();
    const salary = Math.max(0, n($("salary").value));
    const bonus = bonusValue("");
    const results = chooseResults(salary, bonus, city);

    updateAutoOption(results.recommended.mode);
    renderCityPolicy(city, results.selected.contributions);
    renderMetrics(results.selected, results.recommended.mode);
    renderBonusComparison(results);
    renderMonthly(results.selected);
    renderAnnual(results.selected);

    const newSalary = Math.max(0, n($("newSalary").value));
    const newBonus = bonusValue("new");
    const args = { salary:newSalary, bonus:newBonus, bonusMonth:n($("bonusMonth").value,12), city };
    const separate = calculatePlan({...args,mode:"separate"});
    const merged = calculatePlan({...args,mode:"merged"});

    let next = separate.annualCash >= merged.annualCash ? separate : merged;
    if (state.bonusTaxMode === "separate") next = separate;
    if (state.bonusTaxMode === "merged") next = merged;

    renderPlanComparison(results.selected, next);
  }

  function syncFundCustomDefaults() {
    const c = currentCity();
    $("personalFundRate").value = (c.housingFund.defaultPersonalRate * 100).toFixed(1).replace(".0","");
    $("employerFundRate").value = (c.housingFund.defaultEmployerRate * 100).toFixed(1).replace(".0","");
  }

  function reset() {
    Object.entries(DEFAULTS).forEach(([key,value]) => {
      if ($(key)) $(key).value = value;
    });

    state.bonusTaxMode = "auto";
    $("bonusTaxModeSelect").value = "auto";

    Object.keys(state.taxPolicy.deductionDefaults).forEach(key => {
      $(`deduction-${key}`).checked = false;
    });

    $("socialBaseCustom").value = DEFAULTS.salary;
    $("fundBaseCustom").value = DEFAULTS.salary;
    syncFundCustomDefaults();
    update();
  }

  function bindEvents() {
    [
      "salary","bonusInputMode","bonusMonths","bonusAmount","bonusMonth",
      "socialBaseMode","socialBaseCustom","fundBaseMode","fundBaseCustom",
      "fundRateMode","personalFundRate","employerFundRate",
      "newSalary","newBonusInputMode","newBonusMonths","newBonusAmount"
    ].forEach(id => {
      const el = $(id);
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", update);
    });

    $("city").addEventListener("change", () => {
      syncFundCustomDefaults();
      update();
    });

    $("bonusTaxModeSelect").addEventListener("change", e => {
      state.bonusTaxMode = e.target.value;
      update();
    });

    $("detailTabs").addEventListener("click", e => {
      const btn = e.target.closest("button[data-value]");
      if (!btn) return;
      state.detailView = btn.dataset.value;
      document.querySelectorAll("#detailTabs button").forEach(b => b.classList.toggle("active", b === btn));
      $("monthlyPanel").classList.toggle("hidden", state.detailView !== "monthly");
      $("annualPanel").classList.toggle("hidden", state.detailView !== "annual");
    });

    $("resetBtn").addEventListener("click", reset);
  }

  async function init() {
    try {
      const [cityResponse,taxResponse] = await Promise.all([
        fetch("./data/city-policies.json"),
        fetch("./data/tax-policy.json")
      ]);
      if (!cityResponse.ok || !taxResponse.ok) throw new Error("policy data load failed");

      state.cityData = await cityResponse.json();
      state.taxPolicy = await taxResponse.json();

      $("city").innerHTML = state.cityData.cities
        .slice()
        .sort((a,b) => a.rank - b.rank)
        .map(c => `<option value="${c.id}">${c.rank}. ${c.name}</option>`)
        .join("");

      for (let i=1; i<=12; i++) {
        $("bonusMonth").insertAdjacentHTML("beforeend", `<option value="${i}">${i} 月</option>`);
      }

      $("sourceFooter").textContent =
        `城市政策数据更新时间：${state.cityData.snapshotDate}。页面按当前有效、暂行或最近一期公开值静态计算；详细核验记录见仓库 DATA_SOURCES.md。`;

      renderDeductions();
      bindEvents();
      reset();
    } catch (err) {
      console.error(err);
      $("sourceFooter").textContent = "政策数据加载失败，请刷新页面。";
    }
  }

  init();
})();