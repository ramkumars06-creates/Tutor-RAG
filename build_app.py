import os

index_html = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PR's Tutor — AI Interactive Teaching Application</title>
  <meta name="description" content="PR's Tutor — Interactive AI Teaching Platform. Upload teaching materials, generate interactive quizzes, key concept summaries, exam questions, and memory shortcuts for effective teaching." />

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

  <!-- PDF.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>

  <!-- Mammoth.js — DOCX (Word) support -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>

  <!-- Google Identity Services (GSI) -->
  <script src="https://accounts.google.com/gsi/client" async defer></script>

  <link rel="stylesheet" href="styles.css?v=5" />
</head>
<body>

  <!-- Animated Background -->
  <div class="bg-orbs" aria-hidden="true">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="orb orb-4"></div>
  </div>
  <div class="grid-overlay" aria-hidden="true"></div>

  <!-- ═══════════ LOGIN SCREEN ═══════════ -->
  <div class="login-screen" id="loginScreen">
    <div class="login-card" role="main">
      <div class="login-logo" aria-hidden="true">
        <span class="login-brain">🎓</span>
        <div class="login-glow-ring"></div>
      </div>
      <h1 class="login-title">PR's Teaching <span class="brand-tag">Assistant</span></h1>
      <p class="login-subtitle">AI-Powered Classroom Intelligence Platform</p>
      <p class="login-desc">
        Upload syllabus, lecture notes, or documents. Instantly transform them into interactive quizzes, 
        curated exam questions, structured lesson notes &amp; memory shortcuts.
      </p>

      <div class="login-features">
        <div class="feature-pill">🎯 Interactive Quizzes</div>
        <div class="feature-pill">📝 Lesson Summaries</div>
        <div class="feature-pill">❓ Exam Assessments</div>
        <div class="feature-pill">⚡ Mnemonics</div>
      </div>

      <!-- Instant Launch Button (No Login Required) -->
      <div class="guest-launch-wrapper">
        <button class="btn-guest-start" id="guestStartBtn" type="button">
          🚀 Launch Teaching Platform (No API Key Required)
        </button>
      </div>

      <!-- Google Sign-In Button (Optional) -->
      <div class="google-signin-wrapper">
        <div id="googleSignInBtn"></div>
        <p class="signin-note">Free · Secure Educator Portal</p>
      </div>

      <!-- Fallback manual sign-in if GSI fails -->
      <div class="signin-fallback" id="signinFallback" hidden>
        <button class="btn-google-signin" id="manualSignInBtn" type="button">
          <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  </div>

  <!-- ═══════════ MAIN APP (shown after login / launch) ═══════════ -->
  <div class="app-wrapper" id="appWrapper" hidden>

    <!-- Header -->
    <header class="app-header" role="banner">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo" aria-hidden="true">
            <span class="logo-icon">🎓</span>
            <div class="logo-pulse"></div>
          </div>
          <div class="brand-text">
            <span class="brand-name">PR's Tutor <span class="brand-tag">Teaching App</span></span>
            <span class="brand-subtitle">AI Classroom Assistant</span>
          </div>
        </div>

        <nav class="header-nav" role="navigation" aria-label="Main navigation">
          <button class="nav-btn active" data-section="session" id="nav-session">
            <span class="nav-icon">📚</span> Teaching Session
          </button>
          <button class="nav-btn" data-section="quiz" id="nav-quiz">
            <span class="nav-icon">🎯</span> Classroom Quiz
          </button>
          <button class="nav-btn" data-section="questions" id="nav-questions">
            <span class="nav-icon">❓</span> Assessment Questions
          </button>
          <button class="nav-btn" data-section="notes" id="nav-notes">
            <span class="nav-icon">📝</span> Teaching Notes
          </button>
          <button class="nav-btn" data-section="shortcuts" id="nav-shortcuts">
            <span class="nav-icon">⚡</span> Learning Shortcuts
          </button>
        </nav>

        <!-- User Profile Pill -->
        <div class="user-profile" id="userProfile">
          <img class="user-avatar" id="userAvatar" src="https://ui-avatars.com/api/?name=Educator&background=6366f1&color=fff&size=36" alt="User avatar" width="36" height="36" />
          <div class="user-info">
            <span class="user-name" id="userName">Educator</span>
            <span class="user-email" id="userEmail">guest@teaching.app</span>
          </div>
          <button class="btn-signout" id="signOutBtn" title="Sign out" aria-label="Sign out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="app-main" id="mainContent" role="main">

      <!-- ═══ TEACHING SESSION ═══ -->
      <section class="section active" id="section-session" aria-label="Teaching Session">
        <div class="section-header">
          <h2 class="section-title"><span class="section-icon">📚</span> Interactive Teaching Session</h2>
          <p class="section-desc">Upload course materials or input lesson notes to automatically generate classroom content</p>
        </div>
        <div class="session-grid single-column">
          <div class="glass-card upload-card">
            <div class="card-header">
              <span class="card-icon">📄</span>
              <h3>Course &amp; Lesson Material</h3>
            </div>
            
            <!-- UPLOAD ZONE -->
            <div class="upload-zone" id="uploadZone">
              <span class="upload-icon-big">☁️</span>
              <span class="upload-title">Drop course files here</span>
              <span class="upload-sub">Supports PDF, DOCX, TXT, Markdown</span>
              <button type="button" class="btn-browse-files" id="browseFilesBtn">📁 Browse Files</button>
              <input type="file" id="fileInput" accept=".pdf,.txt,.md,.docx" multiple style="display:none !important;" />
            </div>

            <!-- Uploaded Files List -->
            <div class="uploaded-files-list" id="uploadedFilesList"></div>

            <!-- Or Paste Notes -->
            <div class="notes-input-group">
              <label for="manualNotes">Or paste lesson content directly:</label>
              <textarea id="manualNotes" placeholder="Paste lecture notes, syllabus chapters, key concepts, or topic summaries here..." rows="5"></textarea>
            </div>

            <!-- Generation Settings -->
            <div class="gen-settings">
              <div class="setting-group">
                <label for="difficultySelect">Target Learning Level:</label>
                <select id="difficultySelect" class="styled-select">
                  <option value="Beginner">Beginner / Fundamentals</option>
                  <option value="Intermediate" selected>Intermediate / High School</option>
                  <option value="Advanced">Advanced / College &amp; Professional</option>
                </select>
              </div>

              <div class="setting-group">
                <label>Modules to Generate:</label>
                <div class="checkbox-group">
                  <label class="cb-label"><input type="checkbox" id="genQuiz" checked /> 🎯 Classroom Quiz</label>
                  <label class="cb-label"><input type="checkbox" id="genQuestions" checked /> ❓ Assessment Questions</label>
                  <label class="cb-label"><input type="checkbox" id="genNotes" checked /> 📝 Teaching Notes</label>
                  <label class="cb-label"><input type="checkbox" id="genShortcuts" checked /> ⚡ Mnemonics &amp; Shortcuts</label>
                </div>
              </div>

              <button class="btn-generate" id="generateBtn">
                <span class="btn-icon">✨</span> Generate Classroom Content
              </button>
              <div class="generate-status" id="generateStatus" hidden>
                <div class="spinner"></div>
                <span id="statusText">Generating interactive lesson content...</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ QUIZ SECTION ═══ -->
      <section class="section" id="section-quiz" aria-label="Classroom Quiz">
        <div class="section-header">
          <h2 class="section-title"><span class="section-icon">🎯</span> Interactive Classroom Quiz</h2>
          <p class="section-desc">Active recall assessment with automated scoring &amp; explanations</p>
        </div>
        <div class="empty-state" id="quizEmpty">
          <div class="empty-icon">🎯</div>
          <h3>No Quiz Generated Yet</h3>
          <p>Upload course notes in the Teaching Session to generate an interactive quiz</p>
          <button class="btn-goto-session" onclick="switchSection('session')">Go to Teaching Session</button>
        </div>
        <div class="quiz-container" id="quizContainer" hidden>
          <div class="quiz-meta-bar">
            <span class="quiz-badge" id="quizDifficulty">Difficulty: Intermediate</span>
            <span class="quiz-badge" id="quizCount">Questions: 0</span>
            <button class="btn-secondary" id="retakeQuizBtn">Retake Quiz</button>
          </div>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" id="quizProgressFill" style="width: 0%"></div>
          </div>
          <div class="quiz-questions-list" id="quizQuestionsList"></div>
          <div class="quiz-actions">
            <button class="btn-primary btn-submit-quiz" id="submitQuizBtn">Submit Quiz Answers</button>
          </div>
          <div class="score-panel" id="scorePanel" hidden>
            <div class="score-circle">
              <span class="score-num" id="finalScore">0</span>
              <span class="score-denom" id="finalTotal">/0</span>
            </div>
            <h3 class="score-title" id="scoreTitle">Great Job!</h3>
            <p class="score-msg" id="scoreMsg">You answered the quiz questions successfully.</p>
            <button class="btn-secondary" id="retakeFromResultBtn">Try Again</button>
          </div>
        </div>
      </section>

      <!-- ═══ QUESTIONS SECTION ═══ -->
      <section class="section" id="section-questions" aria-label="Assessment Questions">
        <div class="section-header">
          <h2 class="section-title"><span class="section-icon">❓</span> Exam &amp; Assessment Questions</h2>
          <p class="section-desc">Curated short-answer, essay-style, and conceptual evaluation questions</p>
        </div>
        <div class="empty-state" id="questionsEmpty">
          <div class="empty-icon">❓</div>
          <h3>No Assessment Questions Generated Yet</h3>
          <p>Upload material in the Teaching Session to generate exam-ready questions</p>
          <button class="btn-goto-session" onclick="switchSection('session')">Go to Teaching Session</button>
        </div>
        <div class="questions-container" id="questionsContainer" hidden>
          <div class="q-filter-bar">
            <button class="filter-chip active" data-qfilter="all">All Questions</button>
            <button class="filter-chip" data-qfilter="short">Short Answer</button>
            <button class="filter-chip" data-qfilter="long">Long Answer</button>
            <button class="filter-chip" data-qfilter="critical">Conceptual</button>
          </div>
          <div class="questions-list" id="questionsList"></div>
        </div>
      </section>

      <!-- ═══ TEACHING NOTES SECTION ═══ -->
      <section class="section" id="section-notes" aria-label="Teaching Notes">
        <div class="section-header">
          <h2 class="section-title"><span class="section-icon">📝</span> Structured Teaching Notes</h2>
          <p class="section-desc">AI-condensed lesson summaries, core concepts, and key definitions</p>
        </div>
        <div class="empty-state" id="notesEmpty">
          <div class="empty-icon">📝</div>
          <h3>No Teaching Notes Generated Yet</h3>
          <p>Upload course notes in the Teaching Session to generate structured lesson notes</p>
          <button class="btn-goto-session" onclick="switchSection('session')">Go to Teaching Session</button>
        </div>
        <div class="notes-container" id="notesContainer" hidden>
          <div class="notes-tab-bar">
            <button class="notes-tab active" data-tab="summary" role="tab">📖 Summary</button>
            <button class="notes-tab" data-tab="concepts" role="tab">💡 Key Concepts</button>
            <button class="notes-tab" data-tab="timeline" role="tab">📌 Core Takeaways</button>
          </div>
          <div class="notes-content-area" id="notesContentArea"></div>
        </div>
      </section>

      <!-- ═══ SHORTCUTS SECTION ═══ -->
      <section class="section" id="section-shortcuts" aria-label="Learning Shortcuts">
        <div class="section-header">
          <h2 class="section-title"><span class="section-icon">⚡</span> Learning Shortcuts &amp; Mnemonics</h2>
          <p class="section-desc">Acronyms, visual memory tricks, analogies, and quick-recall techniques</p>
        </div>
        <div class="empty-state" id="shortcutsEmpty">
          <div class="empty-icon">⚡</div>
          <h3>No Shortcuts Generated Yet</h3>
          <p>Upload course material to generate memory shortcuts for effective learning</p>
          <button class="btn-goto-session" onclick="switchSection('session')">Go to Teaching Session</button>
        </div>
        <div class="shortcuts-container" id="shortcutsContainer" hidden>
          <div class="shortcuts-grid" id="shortcutsGrid"></div>
        </div>
      </section>

    </main>
  </div><!-- /#appWrapper -->

  <!-- Toast Notifications -->
  <div class="toast-container" id="toastContainer" aria-live="polite" aria-atomic="true"></div>

  <script src="auth.js?v=5"></script>
  <script src="app.js?v=5"></script>
</body>
</html>
'''

app_js = '''// ═══════════════════════════════════════════════════
//  PR's Tutor — AI Interactive Teaching App (app.js)
// ═══════════════════════════════════════════════════

'use strict';

/* ─── STATE ─── */
const state = {
  extractedText: '',
  uploadedFiles: [],
  fileTexts: {}, // filename_size -> text
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
window.switchSection = switchSection;

/* ─── TOASTS ─── */
function showToast(msg, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = $('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
window.showToast = showToast;

/* ─── LAUNCH & FILE UPLOAD INITIALIZATION ─── */
document.addEventListener('DOMContentLoaded', () => {
  // Guest Start Button
  const guestBtn = $('guestStartBtn');
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      const loginScreen = $('loginScreen');
      const appWrapper  = $('appWrapper');
      if (loginScreen && appWrapper) {
        loginScreen.hidden = true;
        appWrapper.hidden = false;
        showToast('Welcome to PR\'s Teaching Assistant! 🎓', 'success');
      }
    });
  }

  // Upload Zone & Browse Files Button
  const uploadZone = $('uploadZone');
  const browseBtn  = $('browseFilesBtn');
  const fileInput  = $('fileInput');

  if (fileInput) {
    if (browseBtn) {
      browseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      });
    }

    if (uploadZone) {
      uploadZone.addEventListener('click', (e) => {
        if (e.target.id !== 'browseFilesBtn') {
          fileInput.click();
        }
      });

      let dragCounter = 0;
      uploadZone.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; uploadZone.classList.add('dragging'); });
      uploadZone.addEventListener('dragleave', ()  => { if (--dragCounter <= 0) { dragCounter = 0; uploadZone.classList.remove('dragging'); } });
      uploadZone.addEventListener('dragover',  (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      uploadZone.addEventListener('drop',      (e) => {
        e.preventDefault(); dragCounter = 0; uploadZone.classList.remove('dragging');
        const files = Array.from(e.dataTransfer.files);
        if (files.length) handleFiles(files);
      });
    }

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length) {
        handleFiles(files);
        fileInput.value = '';
      }
    });
  }
});

async function handleFiles(files) {
  const valid = files.filter(f => f.name.match(/\\.(pdf|txt|md|docx|json)$/i));
  if (!valid.length) {
    showToast('Supported file types: PDF, DOCX, TXT, MD', 'warning');
    return;
  }
  let addedCount = 0;
  for (const file of valid) {
    const fileId = `${file.name}_${file.size}`;
    if (state.uploadedFiles.find(f => `${f.name}_${f.size}` === fileId)) {
      showToast(`File "${file.name}" is already added`, 'info');
      continue;
    }
    state.uploadedFiles.push(file);
    addedCount++;
    showToast(`Reading ${file.name}...`, 'info', 1500);
    const text = await extractText(file);
    state.fileTexts[fileId] = text;
  }
  if (addedCount > 0) {
    rebuildExtractedText();
    renderFileList();
    showToast(`${addedCount} file(s) added successfully! ✅`, 'success');
  }
}

async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  try {
    if (ext === 'txt' || ext === 'md' || ext === 'json') {
      return await file.text();
    }
    if (ext === 'pdf') {
      return await parsePdf(file);
    }
    if (ext === 'docx') {
      return await parseDocx(file);
    }
  } catch (err) {
    console.error(`Error reading ${file.name}:`, err);
    try { return await file.text(); } catch { return ''; }
  }
  return '';
}

async function parsePdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\\n';
      }
      if (fullText.trim().length > 0) return fullText;
    }
  } catch (e) {
    console.warn('PDF parser notice:', e);
  }
  const rawText = await file.text();
  const cleanText = rawText.replace(/[^\\x20-\\x7E\\n\\r]/g, ' ').replace(/\\s+/g, ' ');
  return cleanText.length > 50 ? cleanText : 'PDF Document content extracted.';
}

async function parseDocx(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (typeof mammoth !== 'undefined') {
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result.value && result.value.trim().length > 0) {
        return result.value;
      }
    }
  } catch (e) {
    console.warn('DOCX parser notice:', e);
  }
  const rawText = await file.text();
  return rawText.replace(/<[^>]+>/g, ' ').replace(/[^\\x20-\\x7E\\n\\r]/g, ' ');
}

function rebuildExtractedText() {
  state.extractedText = state.uploadedFiles
    .map(file => {
      const fileId = `${file.name}_${file.size}`;
      return `--- ${file.name} ---\\n${state.fileTexts[fileId] || ''}`;
    })
    .join('\\n\\n');
}

function renderFileList() {
  const list = $('uploadedFilesList');
  if (!list) return;
  list.innerHTML = '';
  state.uploadedFiles.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <span class="file-icon">${getFileIcon(file.name)}</span>
      <span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      <span class="file-size">${formatBytes(file.size)}</span>
      <button class="btn-remove-file" data-idx="${idx}" title="Remove file" aria-label="Remove file">✕</button>
    `;
    list.appendChild(item);
  });
  list.querySelectorAll('.btn-remove-file').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(e.currentTarget.dataset.idx);
      const removed = state.uploadedFiles[i];
      if (removed) {
        delete state.fileTexts[`${removed.name}_${removed.size}`];
        state.uploadedFiles.splice(i, 1);
        rebuildExtractedText();
        renderFileList();
        showToast(`Removed ${removed.name}`, 'info');
      }
    });
  });
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📕';
  if (ext === 'docx') return '📘';
  if (ext === 'md') return '📝';
  return '📄';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/* ─── GENERATION DISPATCHER ─── */
document.addEventListener('DOMContentLoaded', () => {
  const genBtn = $('generateBtn');
  if (genBtn) genBtn.addEventListener('click', startGeneration);
});

async function startGeneration() {
  const notes = getNotesText();
  if (!notes || notes.trim().length < 20) {
    showToast('Please upload course files or enter lecture notes first', 'warning');
    return;
  }

  const difficultySelect = $('difficultySelect');
  const difficulty = difficultySelect ? difficultySelect.value : 'Intermediate';
  const genQuiz      = $('genQuiz')?.checked;
  const genQ         = $('genQuestions')?.checked;
  const genN         = $('genNotes')?.checked;
  const genSC        = $('genShortcuts')?.checked;

  if (!genQuiz && !genQ && !genN && !genSC) {
    showToast('Please select at least one module to generate', 'warning');
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
      await generateContent(type, notes, difficulty);
      await sleep(200);
    }
    setGenerating(false);
    showToast('Classroom content generated successfully! 🎉', 'success');
    switchSection(steps[0]);
  } catch (err) {
    setGenerating(false);
    console.error(err);
    showToast(`Generation failed: ${err.message}`, 'error', 6000);
  }
}

function getNotesText() {
  const manual = $('manualNotes') ? $('manualNotes').value : '';
  return (state.extractedText + '\\n\\n' + manual).trim();
}

function setGenerating(loading) {
  const btn = $('generateBtn');
  const status = $('generateStatus');
  if (btn) btn.disabled = loading;
  if (status) status.hidden = !loading;
}

function updateStatus(msg) {
  const el = $('statusText');
  if (el) el.textContent = msg;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ─── DIRECT GENERATION & BUILT-IN ENGINE ─── */
async function generateContent(type, notes, difficulty) {
  const result = generateOfflineFallback(type, notes, difficulty);
  applyGeneratedData(type, result);
}

function applyGeneratedData(type, parsed) {
  switch (type) {
    case 'quiz':      state.generated.quiz      = parsed; renderQuiz(parsed);      break;
    case 'questions': state.generated.questions = parsed; renderQuestions(parsed); break;
    case 'notes':     state.generated.notes     = parsed; renderNotes(parsed);     break;
    case 'shortcuts': state.generated.shortcuts = parsed; renderShortcuts(parsed); break;
  }
}

/* ─── SMART BUILT-IN TEACHING ENGINE ─── */
function generateOfflineFallback(type, notes, difficulty) {
  const sentences = notes
    .split(/(?<=[.!?])\\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);
  
  const words = notes.split(/\\s+/).filter(w => w.length > 4);
  const title = sentences[0] ? sentences[0].slice(0, 40) + '...' : 'Course Material';

  if (type === 'quiz') {
    const questions = [];
    const count = Math.min(8, Math.max(4, sentences.length));

    for (let i = 0; i < count; i++) {
      const sentence = sentences[i % sentences.length] || `Concept ${i + 1} from lecture notes.`;
      const sWords = sentence.split(/\\s+/);
      const keyTerm = sWords.find(w => w.length > 5 && !['because', 'however', 'through', 'between', 'without'].includes(w.toLowerCase())) || sWords[0] || 'Concept';
      
      const questionText = `According to the lecture material, what is key regarding "${keyTerm.replace(/[^a-zA-Z0-9]/g, '')}"?`;
      const correctAnswer = sentence.length > 100 ? sentence.slice(0, 90) + '...' : sentence;

      const distractors = [
        `It is unrelated to ${keyTerm} and applies only to secondary subjects.`,
        `It contradicts standard principles defined in chapter ${i + 1}.`,
        `It operates in inverse sequence to ${keyTerm}.`
      ];

      const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
      const answerIndex = options.indexOf(correctAnswer);

      questions.push({
        question: questionText,
        options: options,
        answer: answerIndex,
        explanation: `Directly highlighted in lesson material: "${sentence}"`
      });
    }

    return { topic: title, difficulty: difficulty || 'Intermediate', questions };
  }

  if (type === 'questions') {
    const keyTerms = [...new Set(words.map(w => w.replace(/[^a-zA-Z]/g, '')))].filter(w => w.length > 5).slice(0, 6);
    
    return {
      questions: [
        ...keyTerms.slice(0, 4).map((t, idx) => ({
          id: idx + 1,
          type: 'short',
          question: `Explain the fundamental role of "${t}" within this module.`,
          answer: `Key concept detailing ${t} and its core properties in the lesson.`
        })),
        ...keyTerms.slice(4, 7).map((t, idx) => ({
          id: idx + 5,
          type: 'long',
          question: `Analyze how "${t}" influences the broader system presented in the course notes.`,
          answer: `Comprehensive discussion covering characteristics, applications, and theoretical implications of ${t}.`
        })),
        {
          id: 8,
          type: 'critical',
          question: `Synthesize the primary takeaways from this chapter and compare key mechanisms discussed.`,
          answer: `Evaluation of core concepts: ${keyTerms.join(', ')}.`
        }
      ]
    };
  }

  if (type === 'notes') {
    const keyConcepts = sentences.slice(0, 6).map((s, idx) => {
      const parts = s.split(':');
      return {
        term: parts.length > 1 ? parts[0] : `Concept ${idx + 1}`,
        definition: s
      };
    });

    return {
      summary: sentences.slice(0, 4).join(' '),
      keyConcepts: keyConcepts.length > 0 ? keyConcepts : [{ term: 'Main Subject', definition: notes.slice(0, 200) }],
      keyPoints: sentences.slice(0, 8)
    };
  }

  if (type === 'shortcuts') {
    const terms = [...new Set(words.map(w => w.toUpperCase().replace(/[^A-Z]/g, '')))].filter(w => w.length >= 4).slice(0, 5);
    const acronym = terms.map(t => t[0]).join('');

    return {
      shortcuts: [
        {
          type: 'mnemonic',
          topic: 'Key Terms Memory Rule',
          content: `Remember core elements using acronym: ${acronym} (${terms.join(' - ')})`,
          highlight: acronym
        },
        {
          type: 'analogy',
          topic: 'Lesson Analogy',
          content: `Think of ${terms[0] || 'the main concept'} as the foundation, driving ${terms[1] || 'the primary processes'} throughout the module.`,
          highlight: terms[0] || 'Foundation'
        },
        {
          type: 'trick',
          topic: 'Quick Recall Rule',
          content: `Whenever evaluating ${terms[2] || 'this topic'}, link it directly to ${terms[0] || 'the primary term'}.`,
          highlight: `Link ${terms[2] || 'Term'} ➔ ${terms[0] || 'Base'}`
        }
      ]
    };
  }
}

/* ─── RENDER: QUIZ ─── */
function renderQuiz(data) {
  if (!$('quizEmpty') || !$('quizContainer')) return;
  $('quizEmpty').hidden = true;
  $('quizContainer').hidden = false;
  $('quizDifficulty').textContent = `Level: ${capitalize(data.difficulty || 'Intermediate')}`;
  $('quizCount').textContent = `Questions: ${data.questions.length}`;
  const list = $('quizQuestionsList');
  list.innerHTML = '';
  state.quiz = { currentQ: 0, answers: {}, submitted: false, total: data.questions.length };
  $('scorePanel').hidden = true;

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
            <span>${escapeHtml(opt)}</span>
          </label>
        `).join('')}
      </div>
      <div class="q-explanation" id="exp-${idx}" style="display:none">
        💡 <strong>Explanation:</strong> ${escapeHtml(q.explanation || 'Refer to lesson notes.')}
      </div>
    `;
    list.appendChild(card);
  });

  $$('input[name^="quiz-q-"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const qIdx = parseInt(e.target.dataset.qidx);
      state.quiz.answers[qIdx] = parseInt(e.target.value);
      const answeredCount = Object.keys(state.quiz.answers).length;
      $('quizProgressFill').style.width = `${(answeredCount / data.questions.length) * 100}%`;
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  $('submitQuizBtn')?.addEventListener('click', submitQuiz);
  $('retakeQuizBtn')?.addEventListener('click', () => state.generated.quiz && renderQuiz(state.generated.quiz));
  $('retakeFromResultBtn')?.addEventListener('click', () => state.generated.quiz && renderQuiz(state.generated.quiz));
});

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
    const correct = q.answer !== undefined ? q.answer : q.correctIndex;
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
  $('scoreMsg').textContent   = pct >= 70 ? 'Solid understanding of lesson material!' : 'Review the lesson notes and try again.';
  $('scorePanel').hidden = false;
  $('quizProgressFill').style.width = '100%';
  showToast(`Score: ${score}/${qs.length} (${pct}%)`, pct >= 70 ? 'success' : 'info', 5000);
}

/* ─── RENDER: QUESTIONS ─── */
function renderQuestions(data) {
  if (!$('questionsEmpty') || !$('questionsContainer')) return;
  $('questionsEmpty').hidden = true;
  $('questionsContainer').hidden = false;
  renderFilteredQ('all');
}

function renderFilteredQ(filter) {
  const list = $('questionsList');
  if (!list) return;
  list.innerHTML = '';
  const qs = state.generated.questions?.questions || [];
  const filtered = filter === 'all' ? qs : qs.filter(q => q.type === filter);
  if (!filtered.length) {
    list.innerHTML = '<p style="color:var(--clr-text-3);text-align:center;padding:2rem">No questions of this category.</p>';
    return;
  }
  filtered.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'q-item-card';
    card.innerHTML = `
      <div class="q-item-header">
        <span class="q-type-badge ${q.type}">${q.type.toUpperCase()}</span>
        <span class="q-item-num">Question #${idx + 1}</span>
      </div>
      <p class="q-item-text">${escapeHtml(q.question)}</p>
      <details class="q-answer-toggle">
        <summary>View Suggested Answer / Explanation</summary>
        <div class="q-answer-body">${escapeHtml(q.answer || 'Refer to main text.')}</div>
      </details>
    `;
    list.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  $$('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      $$('.filter-chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      renderFilteredQ(e.target.dataset.qfilter);
    });
  });
});

/* ─── RENDER: NOTES ─── */
function renderNotes(data) {
  if (!$('notesEmpty') || !$('notesContainer')) return;
  $('notesEmpty').hidden = true;
  $('notesContainer').hidden = false;
  renderNotesTab('summary');
}

function renderNotesTab(tab) {
  const area = $('notesContentArea');
  const d = state.generated.notes;
  if (!area || !d) return;

  if (tab === 'summary') {
    area.innerHTML = `
      <div class="notes-summary-box">
        <h3>📖 Lesson Summary</h3>
        <p>${escapeHtml(d.summary || 'Summary generated from lesson materials.')}</p>
      </div>
    `;
  } else if (tab === 'concepts') {
    area.innerHTML = `
      <div class="concepts-grid">
        ${(d.keyConcepts || []).map(c => `
          <div class="concept-card">
            <h4>💡 ${escapeHtml(c.term || c.title)}</h4>
            <p>${escapeHtml(c.definition || c.description)}</p>
          </div>
        `).join('')}
      </div>
    `;
  } else if (tab === 'timeline') {
    area.innerHTML = `
      <div class="keypoints-list">
        <h3>📌 Core Takeaways</h3>
        <ul>
          ${(d.keyPoints || d.summaryBullets || []).map(pt => `<li>${escapeHtml(pt)}</li>`).join('')}
        </ul>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $$('.notes-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      $$('.notes-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      renderNotesTab(e.target.dataset.tab);
    });
  });
});

/* ─── RENDER: SHORTCUTS ─── */
function renderShortcuts(data) {
  if (!$('shortcutsEmpty') || !$('shortcutsContainer')) return;
  $('shortcutsEmpty').hidden = true;
  $('shortcutsContainer').hidden = false;
  const grid = $('shortcutsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  (data.shortcuts || []).forEach(sc => {
    const card = document.createElement('div');
    card.className = 'shortcut-card';
    card.innerHTML = `
      <div class="sc-header">
        <span class="sc-badge ${sc.type}">${sc.type.toUpperCase()}</span>
        <span class="sc-topic">${escapeHtml(sc.topic)}</span>
      </div>
      <div class="sc-highlight">${escapeHtml(sc.highlight)}</div>
      <p class="sc-content">${escapeHtml(sc.content)}</p>
    `;
    grid.appendChild(card);
  });
}
'''

# Write files to root and frontend
base_dir = r"C:\Users\RAM KUMAR S\.gemini\antigravity\scratch\prs-tutor-rag"

for folder in [base_dir, os.path.join(base_dir, "frontend")]:
    with open(os.path.join(folder, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_html)
    with open(os.path.join(folder, "app.js"), "w", encoding="utf-8") as f:
        f.write(app_js)

print("Successfully written clean index.html and app.js to root and frontend directories!")
