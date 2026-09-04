// ═══════════════════════════════════════════════════
//  PR's Tutor RAG — Application Logic
//  Powered by Google Gemini AI
// ═══════════════════════════════════════════════════

'use strict';

/* ─────────────────────────────────────────
   STATE
   ───────────────────────────────────────── */
const state = {
  apiKey: localStorage.getItem('prt_gemini_key') || '',
  extractedText: '',
  uploadedFiles: [],
  timer: {
    durationMs: 25 * 60 * 1000,
    remaining: 25 * 60 * 1000,
    isRunning: false,
    intervalId: null,
    selectedMinutes: 25,
    pomodoros: 0,
    totalStudiedMs: 0,
    sessionStartMs: null,
  },
  generated: {
    quiz: null,
    questions: null,
    notes: null,
    shortcuts: null,
  },
  quiz: {
    currentQ: 0,
    answers: {},
    submitted: false,
  },
};

/* ─────────────────────────────────────────
   DOM REFS
   ───────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

/* ─────────────────────────────────────────
   NAVIGATION
   ───────────────────────────────────────── */
function switchSection(name) {
  $$('.section').forEach(s => s.classList.remove('active'));
  $$('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.section === name);
    b.setAttribute('aria-current', b.dataset.section === name ? 'page' : 'false');
  });
  const sec = $(`section-${name}`);
  if (sec) sec.classList.add('active');
}

$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchSection(btn.dataset.section));
});

/* ─────────────────────────────────────────
   TOASTS
   ───────────────────────────────────────── */
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

/* ─────────────────────────────────────────
   API KEY MODAL
   ───────────────────────────────────────── */
const apiModal = $('apiKeyModal');
const apiKeyInput = $('apiKeyInput');

$('apiKeyBtn').addEventListener('click', () => {
  apiModal.hidden = false;
  apiKeyInput.value = state.apiKey;
});
$('modalCloseBtn').addEventListener('click', () => { apiModal.hidden = true; });
$('cancelKeyBtn').addEventListener('click', () => { apiModal.hidden = true; });
$('toggleKeyVisibility').addEventListener('click', () => {
  apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  $('toggleKeyVisibility').textContent = apiKeyInput.type === 'password' ? '👁' : '🙈';
});
$('saveKeyBtn').addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) { showToast('Please enter an API key', 'warning'); return; }
  state.apiKey = key;
  localStorage.setItem('prt_gemini_key', key);
  apiModal.hidden = true;
  showToast('API key saved successfully!', 'success');
});
apiModal.addEventListener('click', (e) => {
  if (e.target === apiModal) apiModal.hidden = true;
});

/* ─────────────────────────────────────────
   FILE UPLOAD
   ───────────────────────────────────────── */
const uploadZone = $('uploadZone');
const fileInput = $('fileInput');

$('browseBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

// Drag & Drop
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragging');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragging'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragging');
  handleFiles(Array.from(e.dataTransfer.files));
});
fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));

async function handleFiles(files) {
  const allowed = ['text/plain', 'application/pdf', 'text/markdown', 'text/x-markdown'];
  const valid = files.filter(f => allowed.includes(f.type) || f.name.endsWith('.md') || f.name.endsWith('.txt') || f.name.endsWith('.pdf'));

  if (!valid.length) {
    showToast('Only PDF, TXT, and MD files are supported', 'warning');
    return;
  }

  for (const file of valid) {
    if (state.uploadedFiles.find(f => f.name === file.name && f.size === file.size)) continue;
    state.uploadedFiles.push(file);
    const text = await extractText(file);
    state.extractedText += `\n\n--- ${file.name} ---\n${text}`;
  }
  renderFileList();
  showToast(`${valid.length} file(s) uploaded successfully`, 'success');
}

async function extractText(file) {
  if (file.type === 'application/pdf') {
    return await extractPdfText(file);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsText(file);
  });
}

async function extractPdfText(file) {
  try {
    if (typeof pdfjsLib === 'undefined') {
      return await readAsText(file);
    }
    const arrayBuffer = await file.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText;
  } catch (e) {
    console.error('PDF extraction failed:', e);
    return '[PDF content could not be extracted — please paste the text manually]';
  }
}

function readAsText(file) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.readAsText(file);
  });
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
    btn.addEventListener('click', () => removeFile(parseInt(btn.dataset.idx)));
  });
}

function removeFile(idx) {
  state.uploadedFiles.splice(idx, 1);
  rebuildExtractedText();
  renderFileList();
}

async function rebuildExtractedText() {
  state.extractedText = '';
  for (const file of state.uploadedFiles) {
    const text = await extractText(file);
    state.extractedText += `\n\n--- ${file.name} ---\n${text}`;
  }
}

$('clearFilesBtn').addEventListener('click', () => {
  state.uploadedFiles = [];
  state.extractedText = '';
  renderFileList();
  showToast('All files cleared', 'info');
});

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Manual text
$('manualNotes').addEventListener('input', function () {
  $('charCount').textContent = this.value.length.toLocaleString() + ' characters';
});

/* ─────────────────────────────────────────
   TIMER
   ───────────────────────────────────────── */
const CIRCUMFERENCE = 2 * Math.PI * 85;
const progressCircle = $('timerProgressCircle');
progressCircle.style.strokeDasharray = CIRCUMFERENCE;

// Add SVG gradient defs
const svgEl = document.querySelector('.timer-svg');
const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
defs.innerHTML = `
  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" style="stop-color:#7c6aff"/>
    <stop offset="100%" style="stop-color:#00d4ff"/>
  </linearGradient>
`;
svgEl.insertBefore(defs, svgEl.firstChild);
progressCircle.setAttribute('stroke', 'url(#timerGradient)');

$$('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (state.timer.isRunning) return;
    $$('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mins = parseInt(btn.dataset.minutes);
    state.timer.selectedMinutes = mins;
    state.timer.durationMs = mins * 60 * 1000;
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
  state.timer.durationMs = val * 60 * 1000;
  state.timer.remaining = state.timer.durationMs;
  updateTimerDisplay();
});

$('startTimerBtn').addEventListener('click', toggleTimer);
$('resetTimerBtn').addEventListener('click', resetTimer);

function toggleTimer() {
  if (state.timer.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

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
  playTimerAlarm();
  showToast(`Session complete! 🍅 Pomodoro #${state.timer.pomodoros} done!`, 'success', 6000);
}

function updateTimerDisplay() {
  const mins = Math.floor(state.timer.remaining / 60000);
  const secs = Math.floor((state.timer.remaining % 60000) / 1000);
  $('timerDisplay').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progress = state.timer.remaining / state.timer.durationMs;
  const offset = CIRCUMFERENCE * (1 - progress);
  progressCircle.style.strokeDashoffset = offset;
}

function updateSessionInfo() {
  $('pomodoroCount').textContent = state.timer.pomodoros;
  const totalMins = Math.floor(state.timer.totalStudiedMs / 60000);
  $('totalStudied').textContent = totalMins > 0 ? totalMins + 'm' : '0m';
}

function playTimerAlarm() {
  try {
    // Simple beep using AudioContext
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

/* ─────────────────────────────────────────
   AI GENERATION — Gemini API
   ───────────────────────────────────────── */
$('generateBtn').addEventListener('click', startGeneration);

async function startGeneration() {
  const notes = getNotesText();
  if (!notes.trim()) {
    showToast('Please upload notes or paste text before generating', 'warning');
    return;
  }
  if (!state.apiKey) {
    showToast('Please set your Gemini API key first 🔑', 'warning');
    $('apiKeyModal').hidden = false;
    return;
  }

  const genQuiz = $('chkQuiz').checked;
  const genQ = $('chkQuestions').checked;
  const genNotes = $('chkNotes').checked;
  const genSC = $('chkShortcuts').checked;
  const difficulty = $('difficultySelect').value;

  if (!genQuiz && !genQ && !genNotes && !genSC) {
    showToast('Please select at least one type of content to generate', 'warning');
    return;
  }

  setGenerating(true);
  const steps = [];
  if (genQuiz) steps.push('quiz');
  if (genQ) steps.push('questions');
  if (genNotes) steps.push('notes');
  if (genSC) steps.push('shortcuts');

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      updateStatus(`Generating ${step} (${i + 1}/${steps.length})...`);
      await generateContent(step, notes, difficulty);
      await sleep(300);
    }
    setGenerating(false);
    showToast('Study materials generated successfully! 🎉', 'success');
    // Auto-navigate to first generated section
    if (genQuiz) switchSection('quiz');
    else if (genQ) switchSection('questions');
    else if (genNotes) switchSection('notes');
    else switchSection('shortcuts');
  } catch (err) {
    setGenerating(false);
    console.error(err);
    showToast(`Generation failed: ${err.message}`, 'error', 6000);
  }
}

function getNotesText() {
  const manual = $('manualNotes').value.trim();
  return (state.extractedText + '\n\n' + manual).trim();
}

function setGenerating(loading) {
  const btn = $('generateBtn');
  const status = $('generateStatus');
  btn.disabled = loading;
  status.hidden = !loading;
}

function updateStatus(msg) {
  $('statusText').textContent = msg;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${state.apiKey}`;
  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 8192,
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

function parseJSON(text) {
  // Try to extract JSON block from markdown code fences or raw text
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1] : text;
  try {
    return JSON.parse(raw.trim());
  } catch {
    // Try to find first { or [
    const start = Math.min(
      raw.indexOf('{') !== -1 ? raw.indexOf('{') : Infinity,
      raw.indexOf('[') !== -1 ? raw.indexOf('[') : Infinity
    );
    if (start === Infinity) throw new Error('No JSON found in response');
    const sub = raw.slice(start);
    return JSON.parse(sub);
  }
}

async function generateContent(type, notes, difficulty) {
  const truncatedNotes = notes.slice(0, 12000); // limit to ~3k tokens

  const prompts = {
    quiz: `You are an expert educational AI. Based on the following study notes, create a multiple-choice quiz.
Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "difficulty": "${difficulty}",
  "topic": "<inferred topic name>",
  "questions": [
    {
      "id": 1,
      "question": "<question text>",
      "options": ["A) <opt>", "B) <opt>", "C) <opt>", "D) <opt>"],
      "correctIndex": 0,
      "explanation": "<brief explanation of correct answer>"
    }
  ]
}
Generate exactly 8 questions. Difficulty: ${difficulty}.
NOTES:
${truncatedNotes}`,

    questions: `You are an expert educator. Based on the study notes, generate sample exam questions.
Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": 1,
      "type": "short",
      "question": "<question>",
      "answer": "<concise answer>"
    }
  ]
}
Types must be one of: "short", "long", "critical".
Generate: 4 short-answer, 3 long-answer, 3 critical-thinking questions (10 total).
NOTES:
${truncatedNotes}`,

    notes: `You are an expert study assistant. Analyze the notes and produce structured study content.
Return ONLY valid JSON in this exact format:
{
  "summary": "<comprehensive 3-4 paragraph summary>",
  "keyConcepts": [
    { "term": "<concept>", "definition": "<clear definition>" }
  ],
  "keyPoints": [
    "<key point 1>",
    "<key point 2>"
  ]
}
Generate: 1 summary, 6-8 key concepts, 8-10 key points.
NOTES:
${truncatedNotes}`,

    shortcuts: `You are a learning coach. Create memory shortcuts to help students learn the material quickly.
Return ONLY valid JSON in this exact format:
{
  "shortcuts": [
    {
      "type": "mnemonic",
      "topic": "<what it helps remember>",
      "content": "<explanation of the shortcut>",
      "highlight": "<the mnemonic/acronym/key phrase itself>"
    }
  ]
}
Types must be one of: "mnemonic", "analogy", "trick", "acronym", "formula".
Generate 8 diverse shortcuts (mix of all types).
NOTES:
${truncatedNotes}`,
  };

  const raw = await callGemini(prompts[type]);
  const parsed = parseJSON(raw);

  switch (type) {
    case 'quiz':
      state.generated.quiz = parsed;
      renderQuiz(parsed);
      break;
    case 'questions':
      state.generated.questions = parsed;
      renderQuestions(parsed);
      break;
    case 'notes':
      state.generated.notes = parsed;
      renderNotes(parsed);
      break;
    case 'shortcuts':
      state.generated.shortcuts = parsed;
      renderShortcuts(parsed);
      break;
  }
}

/* ─────────────────────────────────────────
   RENDER: QUIZ
   ───────────────────────────────────────── */
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
            <input type="radio" name="quiz-q-${idx}" value="${oIdx}" data-qidx="${idx}" data-oidx="${oIdx}" />
            <span class="option-indicator">${'ABCD'[oIdx]}</span>
            <span class="option-text">${escapeHtml(opt.replace(/^[A-D]\)\s*/, ''))}</span>
          </label>
        `).join('')}
      </div>
      <div class="q-explanation" id="exp-${idx}" style="display:none">${escapeHtml(q.explanation || '')}</div>
    `;
    list.appendChild(card);

    // Radio change handler
    card.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (state.quiz.submitted) return;
        state.quiz.answers[idx] = parseInt(radio.value);
        // Update selected visual
        card.querySelectorAll('.q-option-label').forEach(l => l.classList.remove('selected'));
        radio.closest('.q-option-label').classList.add('selected');
        updateQuizProgress();
      });
    });
  });

  updateQuizNavigation();
  updateQuizProgress();
  $('quizFooter').hidden = false;
  $('scorePanel').hidden = true;
}

function updateQuizNavigation() {
  const total = state.generated.quiz?.questions?.length || 0;
  const curr = state.quiz.currentQ;
  $('prevQBtn').disabled = curr === 0;
  $('nextQBtn').disabled = curr >= total - 1;
  $('qIndicator').textContent = `${curr + 1} / ${total}`;
}

function updateQuizProgress() {
  const total = state.generated.quiz?.questions?.length || 0;
  const answered = Object.keys(state.quiz.answers).length;
  const pct = total > 0 ? (answered / total) * 100 : 0;
  $('quizProgressFill').style.width = pct + '%';
  const bar = $('quizProgressBar');
  bar.setAttribute('aria-valuenow', Math.round(pct));
}

$('prevQBtn').addEventListener('click', () => {
  if (state.quiz.currentQ <= 0) return;
  state.quiz.currentQ--;
  showCurrentQuestion();
});
$('nextQBtn').addEventListener('click', () => {
  const total = state.generated.quiz?.questions?.length || 0;
  if (state.quiz.currentQ >= total - 1) return;
  state.quiz.currentQ++;
  showCurrentQuestion();
});

function showCurrentQuestion() {
  $$('.quiz-q-card').forEach((c, i) => {
    c.classList.toggle('active', i === state.quiz.currentQ);
  });
  updateQuizNavigation();
}

$('submitQuizBtn').addEventListener('click', submitQuiz);
$('retakeQuizBtn').addEventListener('click', retakeQuiz);
$('retakeFromResultBtn').addEventListener('click', retakeQuiz);

function submitQuiz() {
  if (state.quiz.submitted) return;
  const qs = state.generated.quiz?.questions || [];
  if (Object.keys(state.quiz.answers).length < qs.length) {
    const unanswered = qs.length - Object.keys(state.quiz.answers).length;
    showToast(`Please answer all questions. ${unanswered} remaining.`, 'warning');
    return;
  }
  state.quiz.submitted = true;
  let score = 0;
  qs.forEach((q, idx) => {
    const correct = q.correctIndex;
    const chosen = state.quiz.answers[idx];
    const labels = document.querySelectorAll(`#quiz-q-${idx} .q-option-label`);
    labels.forEach((lbl, oIdx) => {
      if (oIdx === correct) lbl.classList.add('correct');
      if (oIdx === chosen && oIdx !== correct) lbl.classList.add('incorrect');
    });
    if (chosen === correct) score++;
    // Show explanation
    const exp = $(`exp-${idx}`);
    if (exp) exp.style.display = 'block';
    // Disable radios
    document.querySelectorAll(`input[name="quiz-q-${idx}"]`).forEach(r => r.disabled = true);
  });

  $('finalScore').textContent = score;
  $('finalTotal').textContent = `/${qs.length}`;
  const pct = Math.round((score / qs.length) * 100);
  const titles = pct >= 90 ? 'Excellent! 🏆' : pct >= 70 ? 'Great Work! 🌟' : pct >= 50 ? 'Good Effort! 👍' : 'Keep Studying! 📚';
  const msgs = pct >= 90 ? 'Outstanding performance! You have mastered this material.' : pct >= 70 ? 'Solid understanding! A bit more review will make you perfect.' : pct >= 50 ? 'You\'re getting there! Focus on the incorrect answers.' : 'Review the material and try again. Practice makes perfect!';
  $('scoreTitle').textContent = titles;
  $('scoreMsg').textContent = msgs;
  $('scorePanel').hidden = false;
  $('quizProgressFill').style.width = '100%';
  showToast(`Quiz completed! Score: ${score}/${qs.length} (${pct}%)`, pct >= 70 ? 'success' : 'info', 5000);
}

function retakeQuiz() {
  if (!state.generated.quiz) return;
  renderQuiz(state.generated.quiz);
}

/* ─────────────────────────────────────────
   RENDER: QUESTIONS
   ───────────────────────────────────────── */
function renderQuestions(data) {
  $('questionsEmpty').hidden = true;
  $('questionsContainer').hidden = false;
  state.generated.questions = data;
  renderFilteredQuestions('all');
}

function renderFilteredQuestions(filter) {
  const list = $('questionsList');
  list.innerHTML = '';
  const qs = state.generated.questions?.questions || [];
  const filtered = filter === 'all' ? qs : qs.filter(q => q.type === filter);

  if (!filtered.length) {
    list.innerHTML = '<p style="color:var(--clr-text-3); text-align:center; padding:2rem">No questions of this type.</p>';
    return;
  }

  filtered.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.dataset.type = q.type;
    card.innerHTML = `
      <div class="q-card-type ${q.type}">${typeLabel(q.type)}</div>
      <p class="q-card-text">${escapeHtml(q.question)}</p>
      <button class="q-toggle-btn" type="button" data-idx="${idx}">👁 Show Answer</button>
      <div class="q-card-answer" id="qa-${idx}">${escapeHtml(q.answer || '')}</div>
    `;
    list.appendChild(card);
    card.querySelector('.q-toggle-btn').addEventListener('click', function () {
      const ans = $(`qa-${idx}`);
      const isVisible = ans.classList.toggle('visible');
      this.textContent = isVisible ? '🙈 Hide Answer' : '👁 Show Answer';
    });
  });
}

function typeLabel(type) {
  return { short: '📝 Short Answer', long: '📖 Long Answer', critical: '🧠 Critical Thinking' }[type] || type;
}

$$('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.filter-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    renderFilteredQuestions(tab.dataset.filter);
  });
});

/* ─────────────────────────────────────────
   RENDER: NOTES
   ───────────────────────────────────────── */
function renderNotes(data) {
  $('notesEmpty').hidden = true;
  $('notesContainer').hidden = false;

  // Summary
  const summaryPanel = $('panel-summary');
  summaryPanel.innerHTML = `
    <div class="summary-card">
      <h4>📋 Overview Summary</h4>
      ${data.summary.split('\n').filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('')}
    </div>
  `;

  // Key Concepts
  const conceptsPanel = $('panel-concepts');
  conceptsPanel.innerHTML = `
    <div class="concepts-grid">
      ${(data.keyConcepts || []).map(c => `
        <div class="concept-card">
          <div class="concept-term">💡 ${escapeHtml(c.term)}</div>
          <div class="concept-def">${escapeHtml(c.definition)}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Key Points
  const timelinePanel = $('panel-timeline');
  timelinePanel.innerHTML = `
    <div class="keypoints-list">
      ${(data.keyPoints || []).map((pt, i) => `
        <div class="keypoint-item">
          <div class="keypoint-bullet">${i + 1}</div>
          <div class="keypoint-text">${escapeHtml(pt)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

$$('.notes-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.notes-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    $$('.notes-panel').forEach(p => p.classList.remove('active'));
    $(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

/* ─────────────────────────────────────────
   RENDER: SHORTCUTS
   ───────────────────────────────────────── */
const shortcutGlows = {
  mnemonic: 'rgba(124,106,255,0.12)',
  analogy: 'rgba(0,212,255,0.1)',
  trick: 'rgba(251,191,36,0.1)',
  acronym: 'rgba(6,246,200,0.1)',
  formula: 'rgba(244,63,94,0.1)',
};

function renderShortcuts(data) {
  $('shortcutsEmpty').hidden = true;
  $('shortcutsContainer').hidden = false;
  const grid = $('shortcutsGrid');
  grid.innerHTML = '';

  (data.shortcuts || []).forEach(sc => {
    const card = document.createElement('div');
    card.className = 'shortcut-card';
    card.style.setProperty('--card-glow-clr', shortcutGlows[sc.type] || shortcutGlows.mnemonic);
    card.innerHTML = `
      <div class="sc-type-badge sc-type-${sc.type}">${shortcutEmoji(sc.type)} ${capitalize(sc.type)}</div>
      <div class="sc-topic">${escapeHtml(sc.topic)}</div>
      <div class="sc-content">${escapeHtml(sc.content)}</div>
      ${sc.highlight ? `<div class="sc-highlight">${escapeHtml(sc.highlight)}</div>` : ''}
    `;
    grid.appendChild(card);
  });
}

function shortcutEmoji(type) {
  return { mnemonic: '🧩', analogy: '🔗', trick: '✨', acronym: '🔤', formula: '📐' }[type] || '⚡';
}

/* ─────────────────────────────────────────
   EXPORT
   ───────────────────────────────────────── */
$('exportQuizBtn').addEventListener('click', () => exportAs('quiz'));
$('exportQBtn').addEventListener('click', () => exportAs('questions'));
$('exportNotesBtn').addEventListener('click', () => exportAs('notes'));

function exportAs(type) {
  const data = state.generated[type];
  if (!data) { showToast('Nothing to export yet', 'warning'); return; }
  let text = '';
  const now = new Date().toLocaleString();

  if (type === 'quiz') {
    text = `PR's Tutor RAG — Quiz Export\nGenerated: ${now}\n\n`;
    (data.questions || []).forEach((q, i) => {
      text += `Q${i + 1}: ${q.question}\n`;
      q.options.forEach(o => text += `  ${o}\n`);
      text += `Answer: ${q.options[q.correctIndex]}\n`;
      text += `Explanation: ${q.explanation}\n\n`;
    });
  } else if (type === 'questions') {
    text = `PR's Tutor RAG — Sample Questions Export\nGenerated: ${now}\n\n`;
    (data.questions || []).forEach((q, i) => {
      text += `[${typeLabel(q.type)}]\nQ${i + 1}: ${q.question}\nAnswer: ${q.answer}\n\n`;
    });
  } else if (type === 'notes') {
    text = `PR's Tutor RAG — Smart Notes Export\nGenerated: ${now}\n\n--- SUMMARY ---\n${data.summary}\n\n--- KEY CONCEPTS ---\n`;
    (data.keyConcepts || []).forEach(c => text += `• ${c.term}: ${c.definition}\n`);
    text += '\n--- KEY POINTS ---\n';
    (data.keyPoints || []).forEach((p, i) => text += `${i + 1}. ${p}\n`);
  }

  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `prs_tutor_${type}_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`${capitalize(type)} exported!`, 'success');
}

/* ─────────────────────────────────────────
   UTILITIES
   ───────────────────────────────────────── */
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────────────
   INIT
   ───────────────────────────────────────── */
function init() {
  updateTimerDisplay();
  updateSessionInfo();

  // Show API key prompt if not set
  if (!state.apiKey) {
    setTimeout(() => {
      showToast('Welcome! Set your Gemini API key to start 🔑', 'info', 6000);
    }, 1000);
  } else {
    setTimeout(() => {
      showToast('Welcome back to PR\'s Tutor RAG! 🧠', 'success', 3000);
    }, 800);
  }

  console.log(`
  ╔══════════════════════════════════════╗
  ║       PR's Tutor RAG v1.0            ║
  ║   AI-Powered Study Intelligence      ║
  ╚══════════════════════════════════════╝
  `);
}

init();
