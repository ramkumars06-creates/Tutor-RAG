// ═══════════════════════════════════════════════════
//  PR's Tutor RAG — App Logic (app.js)
//  Uses backend proxy instead of direct Gemini calls
// ═══════════════════════════════════════════════════

'use strict';

/* ─── STATE ─── */
const state = {
  extractedText: '',
  uploadedFiles: [],
  timer: {
    durationMs: 25 * 60 * 1000,
    remaining:  25 * 60 * 1000,
    isRunning:  false,
    intervalId: null,
    selectedMinutes: 25,
    pomodoros: 0,
    totalStudiedMs: 0,
    sessionStartMs: null,
  },
  generated: { quiz: null, questions: null, notes: null, shortcuts: null },
  quiz: { currentQ: 0, answers: {}, submitted: false, total: 0 },
};

/* ─── DOM HELPERS ─── */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

/* ─── NAVIGATION ─── */
function switchSection(name) {
  $$('.section').forEach(s => s.classList.remove('active'));
  $$('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.section === name);
    b.setAttribute('aria-current', b.dataset.section === name ? 'page' : 'false');
  });
  const sec = $(`section-${name}`);
  if (sec) sec.classList.add('active');
}
$$('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchSection(btn.dataset.section)));

/* ─── TOASTS ─── */
function showToast(msg, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = $('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
window.showToast = showToast;

/* ─── FILE UPLOAD ─── */
const uploadZone = $('uploadZone');
const fileInput  = $('fileInput');

// Prevent browser from opening files dropped outside the upload zone
document.addEventListener('dragover',  (e) => e.preventDefault());
document.addEventListener('drop',      (e) => e.preventDefault());

// Browse button
$('browseBtn').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
uploadZone.addEventListener('click',   () => fileInput.click());
uploadZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });

// Drag & Drop — use a counter to avoid false dragleave when hovering child elements
let dragCounter = 0;

uploadZone.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  uploadZone.classList.add('dragging');
});

uploadZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) uploadZone.classList.remove('dragging');
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault(); // Required for drop to fire
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  uploadZone.classList.remove('dragging');
  const files = Array.from(e.dataTransfer.files);
  if (files.length) handleFiles(files);
});

fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));


async function handleFiles(files) {
  const valid = files.filter(f => f.name.match(/\.(pdf|txt|md)$/i));
  if (!valid.length) { showToast('Only PDF, TXT, and MD files are supported', 'warning'); return; }
  for (const file of valid) {
    if (state.uploadedFiles.find(f => f.name === file.name && f.size === file.size)) continue;
    state.uploadedFiles.push(file);
    const text = await extractText(file);
    state.extractedText += `\n\n--- ${file.name} ---\n${text}`;
  }
  renderFileList();
  showToast(`${valid.length} file(s) uploaded`, 'success');
}

async function extractText(file) {
  if (file.name.endsWith('.pdf')) return await extractPdfText(file);
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.readAsText(file);
  });
}

async function extractPdfText(file) {
  try {
    if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js not loaded');
    const buf = await file.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let txt = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      txt += content.items.map(item => item.str).join(' ') + '\n';
    }
    return txt;
  } catch (e) {
    console.error('PDF error:', e);
    return '[PDF content could not be extracted — please paste the text manually]';
  }
}

function renderFileList() {
  const container = $('uploadedFiles');
  const list = $('filesList');
  if (!state.uploadedFiles.length) { container.hidden = true; return; }
  container.hidden = false;
  list.innerHTML = '';
  state.uploadedFiles.forEach((file, idx) => {
    const ext = file.name.split('.').pop().toUpperCase();
    const icons = { PDF: '📄', TXT: '📝', MD: '📋' };
    const li = document.createElement('li');
    li.className = 'file-item';
    li.innerHTML = `
      <span class="file-icon">${icons[ext] || '📎'}</span>
      <span class="file-name">${file.name}</span>
      <span class="file-size">${formatBytes(file.size)}</span>
      <button class="file-remove" data-idx="${idx}" aria-label="Remove ${file.name}">✕</button>
    `;
    list.appendChild(li);
  });
  list.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.uploadedFiles.splice(parseInt(btn.dataset.idx), 1);
      state.extractedText = '';
      renderFileList();
    });
  });
}

$('clearFilesBtn').addEventListener('click', () => {
  state.uploadedFiles = [];
  state.extractedText = '';
  renderFileList();
  showToast('All files cleared', 'info');
});

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

$('manualNotes').addEventListener('input', function () {
  $('charCount').textContent = this.value.length.toLocaleString() + ' characters';
});

/* ─── TIMER ─── */
const CIRCUMFERENCE = 2 * Math.PI * 85;
const progressCircle = $('timerProgressCircle');
progressCircle.style.strokeDasharray = CIRCUMFERENCE;

// Add SVG gradient
const svgEl = document.querySelector('.timer-svg');
const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
defs.innerHTML = `<linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" style="stop-color:#7c6aff"/>
  <stop offset="100%" style="stop-color:#00d4ff"/>
</linearGradient>`;
svgEl.insertBefore(defs, svgEl.firstChild);
progressCircle.setAttribute('stroke', 'url(#timerGradient)');

$$('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (state.timer.isRunning) return;
    $$('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.timer.selectedMinutes = parseInt(btn.dataset.minutes);
    state.timer.durationMs = state.timer.selectedMinutes * 60000;
    state.timer.remaining = state.timer.durationMs;
    $('customMinutes').value = '';
    updateTimerDisplay();
  });
});

$('customMinutes').addEventListener('change', function () {
  const val = parseInt(this.value);
  if (!val || val < 1 || val > 480) return;
  $$('.preset-btn').forEach(b => b.classList.remove('active'));
  state.timer.selectedMinutes = val;
  state.timer.durationMs = val * 60000;
  state.timer.remaining = state.timer.durationMs;
  updateTimerDisplay();
});

$('startTimerBtn').addEventListener('click', toggleTimer);
$('resetTimerBtn').addEventListener('click', resetTimer);

function toggleTimer() { state.timer.isRunning ? pauseTimer() : startTimer(); }

function startTimer() {
  if (state.timer.remaining <= 0) resetTimer();
  state.timer.isRunning = true;
  state.timer.sessionStartMs = Date.now();
  $('startBtnIcon').textContent = '⏸';
  $('startBtnText').textContent = 'Pause';
  $('timerStatus').textContent = 'Studying';
  state.timer.intervalId = setInterval(tickTimer, 1000);
}

function pauseTimer() {
  state.timer.isRunning = false;
  clearInterval(state.timer.intervalId);
  if (state.timer.sessionStartMs) {
    state.timer.totalStudiedMs += Date.now() - state.timer.sessionStartMs;
    state.timer.sessionStartMs = null;
    updateSessionInfo();
  }
  $('startBtnIcon').textContent = '▶';
  $('startBtnText').textContent = 'Resume';
  $('timerStatus').textContent = 'Paused';
}

function resetTimer() {
  pauseTimer();
  state.timer.remaining = state.timer.durationMs;
  $('startBtnIcon').textContent = '▶';
  $('startBtnText').textContent = 'Start';
  $('timerStatus').textContent = 'Ready';
  updateTimerDisplay();
}

function tickTimer() {
  state.timer.remaining -= 1000;
  if (state.timer.remaining <= 0) {
    state.timer.remaining = 0;
    updateTimerDisplay();
    timerComplete();
    return;
  }
  updateTimerDisplay();
}

function timerComplete() {
  clearInterval(state.timer.intervalId);
  state.timer.isRunning = false;
  state.timer.pomodoros++;
  if (state.timer.sessionStartMs) {
    state.timer.totalStudiedMs += Date.now() - state.timer.sessionStartMs;
    state.timer.sessionStartMs = null;
  }
  $('timerStatus').textContent = 'Done! 🎉';
  $('startBtnIcon').textContent = '▶';
  $('startBtnText').textContent = 'Start';
  updateSessionInfo();
  playAlarm();
  showToast(`Session complete! 🍅 Pomodoro #${state.timer.pomodoros} done!`, 'success', 6000);
}

function updateTimerDisplay() {
  const mins = Math.floor(state.timer.remaining / 60000);
  const secs = Math.floor((state.timer.remaining % 60000) / 1000);
  $('timerDisplay').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const offset = CIRCUMFERENCE * (1 - state.timer.remaining / state.timer.durationMs);
  progressCircle.style.strokeDashoffset = offset;
}

function updateSessionInfo() {
  $('pomodoroCount').textContent = state.timer.pomodoros;
  $('totalStudied').textContent = Math.floor(state.timer.totalStudiedMs / 60000) + 'm';
}

function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [0, 0.4, 0.8].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.3);
      osc.start(now + offset);
      osc.stop(now + offset + 0.35);
    });
  } catch (e) {}
}

/* ─── AI GENERATION (via Backend Proxy) ─── */
$('generateBtn').addEventListener('click', startGeneration);

async function startGeneration() {
  const notes = getNotesText();
  if (!notes.trim()) { showToast('Please upload notes or paste text first', 'warning'); return; }

  if (!window.AUTH?.idToken) {
    showToast('Please sign in to generate study materials', 'warning');
    return;
  }

  const genQuiz = $('chkQuiz').checked;
  const genQ    = $('chkQuestions').checked;
  const genN    = $('chkNotes').checked;
  const genSC   = $('chkShortcuts').checked;
  const difficulty = $('difficultySelect').value;

  if (!genQuiz && !genQ && !genN && !genSC) {
    showToast('Select at least one content type to generate', 'warning');
    return;
  }

  const steps = [];
  if (genQuiz) steps.push('quiz');
  if (genQ) steps.push('questions');
  if (genN) steps.push('notes');
  if (genSC) steps.push('shortcuts');

  setGenerating(true);

  try {
    for (let i = 0; i < steps.length; i++) {
      const type = steps[i];
      updateStatus(`Generating ${type} (${i + 1}/${steps.length})...`);
      await generateViaBackend(type, notes, difficulty);
      await sleep(300);
    }
    setGenerating(false);
    showToast('Study materials generated! 🎉', 'success');
    // Refresh quota display
    fetchQuotaStatus();
    switchSection(steps[0]);
  } catch (err) {
    setGenerating(false);
    console.error(err);
    if (err.message?.includes('Daily limit')) {
      showToast(err.message, 'warning', 8000);
    } else {
      showToast(`Generation failed: ${err.message}`, 'error', 6000);
    }
  }
}

function getNotesText() {
  return (state.extractedText + '\n\n' + $('manualNotes').value).trim();
}

function setGenerating(loading) {
  $('generateBtn').disabled = loading;
  $('generateStatus').hidden = !loading;
}

function updateStatus(msg) { $('statusText').textContent = msg; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Build prompts for each content type
function buildPrompt(type, notes, difficulty) {
  const truncated = notes.slice(0, 12000);
  const prompts = {
    quiz: `You are an expert educational AI. Based on the following study notes, create a multiple-choice quiz.
Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"difficulty":"${difficulty}","topic":"<inferred topic>","questions":[{"id":1,"question":"<question>","options":["A) <opt>","B) <opt>","C) <opt>","D) <opt>"],"correctIndex":0,"explanation":"<brief explanation>"}]}
Generate exactly 8 questions. Difficulty: ${difficulty}.
NOTES:\n${truncated}`,

    questions: `You are an expert educator. Generate sample exam questions from the study notes.
Return ONLY valid JSON:
{"questions":[{"id":1,"type":"short","question":"<q>","answer":"<a>"}]}
Types: "short","long","critical". Generate: 4 short, 3 long, 3 critical (10 total).
NOTES:\n${truncated}`,

    notes: `Analyze the notes and produce structured study content.
Return ONLY valid JSON:
{"summary":"<3-4 paragraphs>","keyConcepts":[{"term":"<t>","definition":"<d>"}],"keyPoints":["<point>"]}
Generate: 1 summary, 6-8 concepts, 8-10 points.
NOTES:\n${truncated}`,

    shortcuts: `Create memory shortcuts to help students learn quickly.
Return ONLY valid JSON:
{"shortcuts":[{"type":"mnemonic","topic":"<topic>","content":"<explanation>","highlight":"<the mnemonic>"}]}
Types: "mnemonic","analogy","trick","acronym","formula". Generate 8 diverse shortcuts.
NOTES:\n${truncated}`,
  };
  return prompts[type];
}

async function generateViaBackend(type, notes, difficulty) {
  const token = await window.getIdToken();
  const prompt = buildPrompt(type, notes, difficulty);

  const res = await fetch(`${window.AUTH.backendUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, type }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    // Rate limit hit
    if (res.status === 429) throw new Error(data.message || 'Daily limit reached');
    throw new Error(data.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  const parsed = parseJSON(data.result);

  switch (type) {
    case 'quiz':      state.generated.quiz      = parsed; renderQuiz(parsed);      break;
    case 'questions': state.generated.questions = parsed; renderQuestions(parsed); break;
    case 'notes':     state.generated.notes     = parsed; renderNotes(parsed);     break;
    case 'shortcuts': state.generated.shortcuts = parsed; renderShortcuts(parsed); break;
  }
}

function parseJSON(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  try { return JSON.parse(raw.trim()); }
  catch {
    const start = Math.min(
      raw.indexOf('{') !== -1 ? raw.indexOf('{') : Infinity,
      raw.indexOf('[') !== -1 ? raw.indexOf('[') : Infinity
    );
    if (start === Infinity) throw new Error('No JSON in response');
    return JSON.parse(raw.slice(start));
  }
}

/* ─── RENDER: QUIZ ─── */
function renderQuiz(data) {
  $('quizEmpty').hidden = true;
  $('quizContainer').hidden = false;
  $('quizDifficulty').textContent = `Difficulty: ${capitalize(data.difficulty || 'Intermediate')}`;
  $('quizCount').textContent = `Questions: ${data.questions.length}`;
  const list = $('quizQuestionsList');
  list.innerHTML = '';
  state.quiz = { currentQ: 0, answers: {}, submitted: false, total: data.questions.length };

  data.questions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = `quiz-q-card ${idx === 0 ? 'active' : ''}`;
    card.id = `quiz-q-${idx}`;
    card.innerHTML = `
      <div class="q-number">Question ${idx + 1} of ${data.questions.length}</div>
      <p class="q-text">${escapeHtml(q.question)}</p>
      <div class="q-options">
        ${q.options.map((opt, oIdx) => `
          <label class="q-option-label" id="opt-${idx}-${oIdx}">
            <input type="radio" name="quiz-q-${idx}" value="${oIdx}" data-qidx="${idx}" />
            <span class="option-indicator">${'ABCD'[oIdx]}</span>
            <span class="option-text">${escapeHtml(opt.replace(/^[A-D]\)\s*/,''))}</span>
          </label>`).join('')}
      </div>
      <div class="q-explanation" id="exp-${idx}" style="display:none">${escapeHtml(q.explanation || '')}</div>
    `;
    list.appendChild(card);
    card.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (state.quiz.submitted) return;
        state.quiz.answers[idx] = parseInt(radio.value);
        card.querySelectorAll('.q-option-label').forEach(l => l.classList.remove('selected'));
        radio.closest('.q-option-label').classList.add('selected');
        updateQuizProgress();
      });
    });
  });

  updateQuizNav();
  updateQuizProgress();
  $('quizFooter').hidden = false;
  $('scorePanel').hidden = true;
}

function updateQuizProgress() {
  const total = state.generated.quiz?.questions?.length || 0;
  const pct = total > 0 ? (Object.keys(state.quiz.answers).length / total) * 100 : 0;
  $('quizProgressFill').style.width = pct + '%';
}

function updateQuizNav() {
  const total = state.generated.quiz?.questions?.length || 0;
  $('prevQBtn').disabled = state.quiz.currentQ === 0;
  $('nextQBtn').disabled = state.quiz.currentQ >= total - 1;
  $('qIndicator').textContent = `${state.quiz.currentQ + 1} / ${total}`;
}

$('prevQBtn').addEventListener('click', () => { if (state.quiz.currentQ > 0) { state.quiz.currentQ--; showCurrentQ(); } });
$('nextQBtn').addEventListener('click', () => {
  const total = state.generated.quiz?.questions?.length || 0;
  if (state.quiz.currentQ < total - 1) { state.quiz.currentQ++; showCurrentQ(); }
});

function showCurrentQ() {
  $$('.quiz-q-card').forEach((c, i) => c.classList.toggle('active', i === state.quiz.currentQ));
  updateQuizNav();
}

$('submitQuizBtn').addEventListener('click', submitQuiz);
$('retakeQuizBtn').addEventListener('click', () => state.generated.quiz && renderQuiz(state.generated.quiz));
$('retakeFromResultBtn').addEventListener('click', () => state.generated.quiz && renderQuiz(state.generated.quiz));

function submitQuiz() {
  if (state.quiz.submitted) return;
  const qs = state.generated.quiz?.questions || [];
  if (Object.keys(state.quiz.answers).length < qs.length) {
    showToast(`${qs.length - Object.keys(state.quiz.answers).length} question(s) unanswered`, 'warning');
    return;
  }
  state.quiz.submitted = true;
  let score = 0;
  qs.forEach((q, idx) => {
    const correct = q.correctIndex;
    const chosen  = state.quiz.answers[idx];
    document.querySelectorAll(`#quiz-q-${idx} .q-option-label`).forEach((lbl, oIdx) => {
      if (oIdx === correct) lbl.classList.add('correct');
      if (oIdx === chosen && oIdx !== correct) lbl.classList.add('incorrect');
    });
    if (chosen === correct) score++;
    const exp = $(`exp-${idx}`);
    if (exp) exp.style.display = 'block';
    document.querySelectorAll(`input[name="quiz-q-${idx}"]`).forEach(r => r.disabled = true);
  });
  $('finalScore').textContent = score;
  $('finalTotal').textContent = `/${qs.length}`;
  const pct = Math.round((score / qs.length) * 100);
  $('scoreTitle').textContent = pct >= 90 ? 'Excellent! 🏆' : pct >= 70 ? 'Great Work! 🌟' : pct >= 50 ? 'Good Effort! 👍' : 'Keep Studying! 📚';
  $('scoreMsg').textContent   = pct >= 70 ? 'Solid understanding! Keep it up.' : 'Review the material and try again. You\'ve got this!';
  $('scorePanel').hidden = false;
  $('quizProgressFill').style.width = '100%';
  showToast(`Score: ${score}/${qs.length} (${pct}%)`, pct >= 70 ? 'success' : 'info', 5000);
}

/* ─── RENDER: QUESTIONS ─── */
function renderQuestions(data) {
  $('questionsEmpty').hidden = true;
  $('questionsContainer').hidden = false;
  renderFilteredQ('all');
}

function renderFilteredQ(filter) {
  const list = $('questionsList');
  list.innerHTML = '';
  const qs = state.generated.questions?.questions || [];
  const filtered = filter === 'all' ? qs : qs.filter(q => q.type === filter);
  if (!filtered.length) {
    list.innerHTML = '<p style="color:var(--clr-text-3);text-align:center;padding:2rem">No questions of this type.</p>';
    return;
  }
  filtered.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
      <div class="q-card-type ${q.type}">${typeLabel(q.type)}</div>
      <p class="q-card-text">${escapeHtml(q.question)}</p>
      <button class="q-toggle-btn" type="button" data-idx="${idx}">👁 Show Answer</button>
      <div class="q-card-answer" id="qa-${idx}">${escapeHtml(q.answer || '')}</div>
    `;
    list.appendChild(card);
    card.querySelector('.q-toggle-btn').addEventListener('click', function () {
      const ans = $(`qa-${idx}`);
      const vis = ans.classList.toggle('visible');
      this.textContent = vis ? '🙈 Hide Answer' : '👁 Show Answer';
    });
  });
}

function typeLabel(type) {
  return { short: '📝 Short Answer', long: '📖 Long Answer', critical: '🧠 Critical Thinking' }[type] || type;
}

$$('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderFilteredQ(tab.dataset.filter);
  });
});

/* ─── RENDER: NOTES ─── */
function renderNotes(data) {
  $('notesEmpty').hidden = true;
  $('notesContainer').hidden = false;

  $('panel-summary').innerHTML = `
    <div class="summary-card">
      <h4>📋 Overview Summary</h4>
      ${data.summary.split('\n').filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('')}
    </div>`;

  $('panel-concepts').innerHTML = `
    <div class="concepts-grid">
      ${(data.keyConcepts || []).map(c => `
        <div class="concept-card">
          <div class="concept-term">💡 ${escapeHtml(c.term)}</div>
          <div class="concept-def">${escapeHtml(c.definition)}</div>
        </div>`).join('')}
    </div>`;

  $('panel-timeline').innerHTML = `
    <div class="keypoints-list">
      ${(data.keyPoints || []).map((pt, i) => `
        <div class="keypoint-item">
          <div class="keypoint-bullet">${i + 1}</div>
          <div class="keypoint-text">${escapeHtml(pt)}</div>
        </div>`).join('')}
    </div>`;
}

$$('.notes-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.notes-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    $$('.notes-panel').forEach(p => p.classList.remove('active'));
    $(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

/* ─── RENDER: SHORTCUTS ─── */
const scGlows = { mnemonic:'rgba(124,106,255,0.12)', analogy:'rgba(0,212,255,0.1)', trick:'rgba(251,191,36,0.1)', acronym:'rgba(6,246,200,0.1)', formula:'rgba(244,63,94,0.1)' };

function renderShortcuts(data) {
  $('shortcutsEmpty').hidden = true;
  $('shortcutsContainer').hidden = false;
  const grid = $('shortcutsGrid');
  grid.innerHTML = '';
  (data.shortcuts || []).forEach(sc => {
    const card = document.createElement('div');
    card.className = 'shortcut-card';
    card.style.setProperty('--card-glow-clr', scGlows[sc.type] || scGlows.mnemonic);
    card.innerHTML = `
      <div class="sc-type-badge sc-type-${sc.type}">${scEmoji(sc.type)} ${capitalize(sc.type)}</div>
      <div class="sc-topic">${escapeHtml(sc.topic)}</div>
      <div class="sc-content">${escapeHtml(sc.content)}</div>
      ${sc.highlight ? `<div class="sc-highlight">${escapeHtml(sc.highlight)}</div>` : ''}
    `;
    grid.appendChild(card);
  });
}

function scEmoji(t) { return { mnemonic:'🧩', analogy:'🔗', trick:'✨', acronym:'🔤', formula:'📐' }[t] || '⚡'; }

/* ─── EXPORT ─── */
$('exportQuizBtn').addEventListener('click', () => exportData('quiz'));
$('exportQBtn').addEventListener('click',    () => exportData('questions'));
$('exportNotesBtn').addEventListener('click',() => exportData('notes'));

function exportData(type) {
  const data = state.generated[type];
  if (!data) { showToast('Nothing to export yet', 'warning'); return; }
  let text = `PR's Tutor RAG — ${capitalize(type)} Export\nGenerated: ${new Date().toLocaleString()}\n\n`;
  if (type === 'quiz') {
    (data.questions || []).forEach((q, i) => {
      text += `Q${i+1}: ${q.question}\n${q.options.join('\n')}\nAnswer: ${q.options[q.correctIndex]}\nExplanation: ${q.explanation}\n\n`;
    });
  } else if (type === 'questions') {
    (data.questions || []).forEach((q, i) => {
      text += `[${typeLabel(q.type)}]\nQ${i+1}: ${q.question}\nAnswer: ${q.answer}\n\n`;
    });
  } else if (type === 'notes') {
    text += `--- SUMMARY ---\n${data.summary}\n\n--- KEY CONCEPTS ---\n`;
    (data.keyConcepts || []).forEach(c => text += `• ${c.term}: ${c.definition}\n`);
    text += '\n--- KEY POINTS ---\n';
    (data.keyPoints || []).forEach((p, i) => text += `${i+1}. ${p}\n`);
  }
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `prs_tutor_${type}_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`${capitalize(type)} exported!`, 'success');
}

/* ─── UTILS ─── */
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Expose fetchQuotaStatus to auth.js
window.fetchQuotaStatus = async function() {
  try {
    const token = await window.getIdToken();
    const res = await fetch(`${window.AUTH.backendUrl}/api/rate-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (window.updateQuotaUI) window.updateQuotaUI(data.used, data.limit);
  } catch (e) { console.warn('Quota fetch failed:', e.message); }
};

/* ─── INIT ─── */
updateTimerDisplay();
updateSessionInfo();
console.log("PR's Tutor RAG loaded ✅");
