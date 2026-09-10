/* ============================================================
   UI layer: routing, rendering, and event wiring.
   ============================================================ */

const app = document.getElementById('app');

const state = {
  route: 'dashboard',
  session: null, // active assessment run
  reportStudentId: null,
  progressStudentId: null,
};

function navigate(route) {
  state.route = route;
  render();
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.nav));
});

function setActiveNav() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === state.route);
  });
}

function render() {
  setActiveNav();
  if (state.route === 'dashboard') return renderDashboard();
  if (state.route === 'students') return renderStudents();
  if (state.route === 'assess') return renderAssessPicker();
  if (state.route === 'progress') return renderProgress();
  if (state.route === 'report') return renderReport();
  if (state.route === 'data') return renderData();
}

/* ---------------- Dashboard ---------------- */

function renderDashboard() {
  const studentCount = DATA.students.length;
  const assessmentCount = DATA.assessments.length;
  const recent = [...DATA.assessments]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  app.innerHTML = `
    <section class="hero-panel">
      <h1>Good to see you.</h1>
      <p class="lede">Track letter and number recognition, one quick check at a time.</p>
      <div class="stat-row">
        <div class="stat"><span class="stat-num">${studentCount}</span><span class="stat-label">Students</span></div>
        <div class="stat"><span class="stat-num">${assessmentCount}</span><span class="stat-label">Assessments logged</span></div>
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary" data-go="assess">Run an assessment</button>
        <button class="btn btn-ghost" data-go="students">Manage students</button>
      </div>
    </section>

    <section class="panel">
      <h2>Recent activity</h2>
      ${recent.length ? `
        <table class="table">
          <thead><tr><th>Student</th><th>Skill</th><th>Score</th><th>Date</th></tr></thead>
          <tbody>
            ${recent.map(a => {
              const s = getStudent(a.studentId);
              const cat = CATEGORIES[a.category];
              return `<tr>
                <td>${s ? escapeHtml(s.number) : 'Unknown'}</td>
                <td><span class="chip" style="--chip:${cat.color}">${cat.short}</span></td>
                <td>${a.correctCount}/${a.totalCount} (${a.percent}%)</td>
                <td>${formatDate(a.date)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      ` : `<p class="empty">No assessments yet. Add a student, then run your first check.</p>`}
    </section>
  `;
  app.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.go)));
}

/* ---------------- Students ---------------- */

function renderStudents() {
  app.innerHTML = `
    <section class="panel">
      <h2>Add a student</h2>
      <form id="addStudentForm" class="inline-form">
        <label>
          <span>Student #</span>
          <input type="text" id="newStudentNumber" placeholder="e.g. 14" required />
        </label>
        <label>
          <span>Name <em>(optional)</em></span>
          <input type="text" id="newStudentName" placeholder="optional, for your reference only" />
        </label>
        <button class="btn btn-primary" type="submit">Add student</button>
      </form>
    </section>

    <section class="panel">
      <h2>Students (${DATA.students.length})</h2>
      ${DATA.students.length ? `
        <div class="student-grid">
          ${DATA.students
            .slice()
            .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
            .map(s => studentCard(s)).join('')}
        </div>
      ` : `<p class="empty">No students yet. Add one above to get started.</p>`}
    </section>
  `;

  document.getElementById('addStudentForm').addEventListener('submit', e => {
    e.preventDefault();
    const number = document.getElementById('newStudentNumber').value.trim();
    const name = document.getElementById('newStudentName').value.trim();
    if (!number) return;
    if (DATA.students.some(s => s.number.toLowerCase() === number.toLowerCase())) {
      alert('A student with that number already exists.');
      return;
    }
    DATA.students.push({ id: uid(), number, name, createdAt: todayISO() });
    saveData(DATA);
    renderStudents();
  });

  app.querySelectorAll('[data-assess-student]').forEach(b =>
    b.addEventListener('click', () => {
      state.session = { pickedStudentId: b.dataset.assessStudent };
      navigate('assess');
    })
  );
  app.querySelectorAll('[data-report-student]').forEach(b =>
    b.addEventListener('click', () => {
      state.reportStudentId = b.dataset.reportStudent;
      navigate('report');
    })
  );
  app.querySelectorAll('[data-progress-student]').forEach(b =>
    b.addEventListener('click', () => {
      state.progressStudentId = b.dataset.progressStudent;
      navigate('progress');
    })
  );
  app.querySelectorAll('[data-remove-student]').forEach(b =>
    b.addEventListener('click', () => {
      const id = b.dataset.removeStudent;
      const s = getStudent(id);
      if (!confirm(`Remove student ${s.number}${s.name ? ' (' + s.name + ')' : ''} and all their assessment history? This can't be undone.`)) return;
      DATA.students = DATA.students.filter(st => st.id !== id);
      DATA.assessments = DATA.assessments.filter(a => a.studentId !== id);
      saveData(DATA);
      renderStudents();
    })
  );
}

function studentCard(s) {
  const total = studentAssessments(s.id).length;
  const lastByCategory = CATEGORY_ORDER.map(key => {
    const a = latestAssessment(s.id, key);
    return { key, a };
  });
  return `
    <div class="student-card">
      <div class="student-card-head">
        <div class="student-badge">${escapeHtml(s.number)}</div>
        <div>
          ${s.name ? `<div class="student-name">${escapeHtml(s.name)}</div>` : ''}
          <div class="student-meta">${total} assessment${total === 1 ? '' : 's'} logged</div>
        </div>
      </div>
      <div class="mini-scores">
        ${lastByCategory.map(({ key, a }) => {
          const cat = CATEGORIES[key];
          return `<div class="mini-score" style="--chip:${cat.color}" title="${cat.label}">
            <span>${cat.short}</span>
            <strong>${a ? a.percent + '%' : '\u2014'}</strong>
          </div>`;
        }).join('')}
      </div>
      <div class="student-actions">
        <button class="btn btn-small btn-primary" data-assess-student="${s.id}">Assess</button>
        <button class="btn btn-small btn-ghost" data-progress-student="${s.id}">Progress</button>
        <button class="btn btn-small btn-ghost" data-report-student="${s.id}">Family report</button>
        <button class="btn btn-small btn-danger" data-remove-student="${s.id}">Remove</button>
      </div>
    </div>
  `;
}

/* ---------------- Assessment: picker ---------------- */

function renderAssessPicker() {
  if (!DATA.students.length) {
    app.innerHTML = `<section class="panel"><h2>Run an assessment</h2>
      <p class="empty">You'll need at least one student before you can run an assessment.</p>
      <button class="btn btn-primary" data-go="students">Add a student</button></section>`;
    app.querySelector('[data-go]').addEventListener('click', () => navigate('students'));
    return;
  }

  const preStudent = state.session && state.session.pickedStudentId;

  app.innerHTML = `
    <section class="panel">
      <h2>Run an assessment</h2>
      <form id="pickerForm" class="inline-form">
        <label>
          <span>Student</span>
          <select id="pickStudent" required>
            <option value="">Choose a student\u2026</option>
            ${DATA.students
              .slice()
              .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
              .map(s => `<option value="${s.id}" ${s.id === preStudent ? 'selected' : ''}>#${escapeHtml(s.number)}${s.name ? ' \u2013 ' + escapeHtml(s.name) : ''}</option>`)
              .join('')}
          </select>
        </label>
        <label>
          <span>Skill to assess</span>
          <select id="pickCategory" required>
            <option value="">Choose a skill\u2026</option>
            ${CATEGORY_ORDER.map(key => `<option value="${key}">${CATEGORIES[key].label}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn-primary" type="submit">Start assessment</button>
      </form>
    </section>
  `;

  document.getElementById('pickerForm').addEventListener('submit', e => {
    e.preventDefault();
    const studentId = document.getElementById('pickStudent').value;
    const category = document.getElementById('pickCategory').value;
    if (!studentId || !category) return;
    startAssessment(studentId, category);
  });
}

/* ---------------- Assessment: run ---------------- */

function startAssessment(studentId, category) {
  const cat = CATEGORIES[category];
  const items = shuffle(cat.items.slice()).map(item => ({ item, label: item, correct: null }));
  state.session = { studentId, category, index: 0, items, startedAt: todayISO() };
  renderRun();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderRun() {
  const s = state.session;
  const cat = CATEGORIES[s.category];
  const student = getStudent(s.studentId);
  const total = s.items.length;

  if (s.index >= total) return renderRunSummary();

  const current = s.items[s.index];
  const answeredSoFar = s.items.filter(i => i.correct !== null).length;

  app.innerHTML = `
    <section class="run-screen" style="--cat-color:${cat.color}">
      <div class="run-top">
        <div class="run-student">Student #${escapeHtml(student.number)} \u2014 ${cat.label}</div>
        <div class="run-progress-text">${s.index + 1} of ${total}</div>
      </div>
      <div class="run-progress-bar"><div class="run-progress-fill" style="width:${(answeredSoFar / total) * 100}%"></div></div>

      <p class="run-prompt">${cat.prompt}</p>

      <div class="run-item">
        ${cat.display === 'shape'
          ? `<div class="shape-display">${shapeSVG(current.item, cat.color)}</div>`
          : `<div class="letter-display">${escapeHtml(current.item)}</div>`}
      </div>

      <div class="run-buttons">
        <button class="btn-answer btn-incorrect" id="btnIncorrect">
          <span class="btn-answer-icon">\u2715</span> Not yet
        </button>
        <button class="btn-answer btn-correct" id="btnCorrect">
          <span class="btn-answer-icon">\u2713</span> Correct
        </button>
      </div>

      <div class="run-footer">
        <button class="btn btn-ghost btn-small" id="btnBack" ${s.index === 0 ? 'disabled' : ''}>\u2190 Previous item</button>
        <button class="btn btn-ghost btn-small" id="btnCancel">Cancel assessment</button>
      </div>
    </section>
  `;

  const answer = correct => {
    s.items[s.index].correct = correct;
    s.index += 1;
    renderRun();
  };
  document.getElementById('btnCorrect').addEventListener('click', () => answer(true));
  document.getElementById('btnIncorrect').addEventListener('click', () => answer(false));
  document.getElementById('btnBack').addEventListener('click', () => {
    if (s.index > 0) {
      s.index -= 1;
      s.items[s.index].correct = null;
      renderRun();
    }
  });
  document.getElementById('btnCancel').addEventListener('click', () => {
    if (confirm('Cancel this assessment? Nothing will be saved.')) {
      state.session = null;
      navigate('assess');
    }
  });

  // Keyboard shortcuts: left arrow / "n" = not yet, right arrow / "y" = correct
  document.onkeydown = ev => {
    if (state.route !== 'assess' || !state.session || state.session.index === undefined) return;
    if (ev.key === 'ArrowRight' || ev.key.toLowerCase() === 'y') answer(true);
    if (ev.key === 'ArrowLeft' || ev.key.toLowerCase() === 'n') answer(false);
  };
}

function renderRunSummary() {
  document.onkeydown = null;
  const s = state.session;
  const cat = CATEGORIES[s.category];
  const student = getStudent(s.studentId);
  const correctCount = s.items.filter(i => i.correct).length;
  const total = s.items.length;
  const percent = Math.round((correctCount / total) * 100);
  const missed = s.items.filter(i => !i.correct);

  app.innerHTML = `
    <section class="panel summary-panel" style="--cat-color:${cat.color}">
      <h2>Assessment complete</h2>
      <p class="lede">Student #${escapeHtml(student.number)} \u2014 ${cat.label}</p>
      <div class="score-big">${correctCount}/${total} <span>(${percent}%)</span></div>
      ${missed.length ? `
        <div class="missed-box">
          <strong>Missed:</strong> ${missed.map(i => escapeHtml(i.label)).join(', ')}
        </div>
      ` : `<p class="missed-box missed-none">Perfect score \u2014 every item correct!</p>`}
      <div class="hero-actions">
        <button class="btn btn-primary" id="btnSave">Save assessment</button>
        <button class="btn btn-ghost" id="btnDiscard">Discard</button>
      </div>
    </section>
  `;

  document.getElementById('btnSave').addEventListener('click', () => {
    DATA.assessments.push({
      id: uid(),
      studentId: s.studentId,
      category: s.category,
      date: todayISO(),
      items: s.items.map(i => ({ item: i.item, label: i.label, correct: !!i.correct })),
      correctCount,
      totalCount: total,
      percent,
    });
    saveData(DATA);
    state.session = null;
    navigate('progress');
    state.progressStudentId = s.studentId;
    renderProgress();
  });
  document.getElementById('btnDiscard').addEventListener('click', () => {
    if (confirm('Discard this assessment? It will not be saved.')) {
      state.session = null;
      navigate('assess');
    }
  });
}

/* ---------------- Progress ---------------- */

function renderProgress() {
  if (!DATA.students.length) {
    app.innerHTML = `<section class="panel"><h2>Progress</h2><p class="empty">Add a student first to see progress here.</p></section>`;
    return;
  }
  const selectedId = state.progressStudentId || DATA.students[0].id;
  state.progressStudentId = selectedId;
  const student = getStudent(selectedId);

  app.innerHTML = `
    <section class="panel">
      <div class="panel-head-row">
        <h2>Progress</h2>
        <select id="progressStudentSelect">
          ${DATA.students
            .slice()
            .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
            .map(s => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>#${escapeHtml(s.number)}${s.name ? ' \u2013 ' + escapeHtml(s.name) : ''}</option>`)
            .join('')}
        </select>
      </div>
      ${student ? renderProgressBody(student) : '<p class="empty">Student not found.</p>'}
    </section>
  `;

  document.getElementById('progressStudentSelect').addEventListener('change', e => {
    state.progressStudentId = e.target.value;
    renderProgress();
  });
}

function renderProgressBody(student) {
  const blocks = CATEGORY_ORDER.map(key => {
    const cat = CATEGORIES[key];
    const history = studentAssessments(student.id, key);
    if (!history.length) {
      return `<div class="progress-block" style="--cat-color:${cat.color}">
        <h3>${cat.label}</h3>
        <p class="empty small">No assessments yet.</p>
      </div>`;
    }
    const chronological = history.slice().reverse();
    const latest = history[0];
    return `<div class="progress-block" style="--cat-color:${cat.color}">
      <h3>${cat.label}</h3>
      <div class="sparkline">${sparklineSVG(chronological.map(a => a.percent))}</div>
      <table class="table small-table">
        <thead><tr><th>Date</th><th>Score</th></tr></thead>
        <tbody>
          ${history.map(a => `<tr><td>${formatDate(a.date)}</td><td>${a.correctCount}/${a.totalCount} (${a.percent}%)</td></tr>`).join('')}
        </tbody>
      </table>
      ${latest.items.some(i => !i.correct) ? `<p class="missed-line"><strong>Most recent misses:</strong> ${latest.items.filter(i => !i.correct).map(i => escapeHtml(i.label)).join(', ')}</p>` : ''}
    </div>`;
  }).join('');

  return `<div class="progress-grid">${blocks}</div>`;
}

function sparklineSVG(values) {
  if (values.length < 2) {
    return `<svg viewBox="0 0 200 50" class="spark"><text x="0" y="30" font-size="12" fill="var(--ink-soft)">Not enough data yet for a trend line</text></svg>`;
  }
  const w = 200, h = 50, pad = 6;
  const max = 100, min = 0;
  const step = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const dots = pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="var(--cat-color)"/>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="spark"><path d="${path}" fill="none" stroke="var(--cat-color)" stroke-width="2"/>${dots}</svg>`;
}

/* ---------------- Family report ---------------- */

function renderReport() {
  if (!DATA.students.length) {
    app.innerHTML = `<section class="panel"><h2>Family report</h2><p class="empty">Add a student first to generate a report.</p></section>`;
    return;
  }
  const selectedId = state.reportStudentId || DATA.students[0].id;
  state.reportStudentId = selectedId;
  const student = getStudent(selectedId);

  const sections = CATEGORY_ORDER.map(key => {
    const a = latestAssessment(selectedId, key);
    if (!a) return null;
    return buildRecommendation(a);
  }).filter(Boolean);

  app.innerHTML = `
    <section class="panel no-print">
      <div class="panel-head-row">
        <h2>Family report</h2>
        <select id="reportStudentSelect">
          ${DATA.students
            .slice()
            .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
            .map(s => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>#${escapeHtml(s.number)}${s.name ? ' \u2013 ' + escapeHtml(s.name) : ''}</option>`)
            .join('')}
        </select>
      </div>
      ${sections.length ? `<button class="btn btn-primary" id="printBtn">Print / Save as PDF</button>` : ''}
    </section>

    <section class="report-sheet">
      <div class="report-head">
        <h1>Learning Check-In</h1>
        <p>Student #${escapeHtml(student.number)}${student.name ? ' \u2013 ' + escapeHtml(student.name) : ''}</p>
        <p class="report-date">Prepared ${formatDate(todayISO())}</p>
      </div>

      ${sections.length ? sections.map(r => `
        <div class="report-section" style="--cat-color:${r.category.color}">
          <div class="report-section-head">
            <h2>${r.category.label}</h2>
            <span class="report-score">${r.percent}%</span>
          </div>
          <p>${r.summary}</p>
          <p class="report-missed">${r.missedLine}</p>
          <div class="report-activities">
            <p class="report-activities-title">Try at home:</p>
            <ul>${r.activities.map(a => `<li>${a}</li>`).join('')}</ul>
          </div>
        </div>
      `).join('') : `<p class="empty">No assessments recorded yet for this student. Run an assessment first, then come back here to generate a report.</p>`}

      <p class="report-footer">Great learning happens with a little practice, often. Thank you for supporting your child at home!</p>
    </section>
  `;

  const sel = document.getElementById('reportStudentSelect');
  if (sel) sel.addEventListener('change', e => {
    state.reportStudentId = e.target.value;
    renderReport();
  });
  const printBtn = document.getElementById('printBtn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
}

/* ---------------- Data (export / import / reset) ---------------- */

function renderData() {
  app.innerHTML = `
    <section class="panel">
      <h2>Your data</h2>
      <p>Everything is stored privately in this browser, on this computer. Nothing is uploaded anywhere.
      Export a backup regularly, especially before clearing your browser data or switching computers.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" id="exportBtn">Export backup (.json)</button>
        <label class="btn btn-ghost file-btn">
          Import backup
          <input type="file" id="importInput" accept="application/json" hidden />
        </label>
        <button class="btn btn-danger" id="resetBtn">Erase all data</button>
      </div>
      <p class="hint">Importing merges with existing students and assessments (duplicates by ID are skipped).</p>
    </section>
  `;

  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `early-learning-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(reader.result);
        const existingStudentIds = new Set(DATA.students.map(s => s.id));
        const existingAssessmentIds = new Set(DATA.assessments.map(a => a.id));
        (incoming.students || []).forEach(s => { if (!existingStudentIds.has(s.id)) DATA.students.push(s); });
        (incoming.assessments || []).forEach(a => { if (!existingAssessmentIds.has(a.id)) DATA.assessments.push(a); });
        saveData(DATA);
        alert('Import complete.');
        navigate('dashboard');
      } catch (err) {
        alert('That file could not be read as a backup.');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Erase ALL students and assessments from this browser? This cannot be undone. Export a backup first if you want to keep a copy.')) {
      DATA = { students: [], assessments: [] };
      saveData(DATA);
      navigate('dashboard');
    }
  });
}

/* ---------------- Utilities ---------------- */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

render();
