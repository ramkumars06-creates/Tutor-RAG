// ═══════════════════════════════════════════════════
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
        showToast('Welcome to PR's Teaching Assistant! 🎓', 'success');
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
  const valid = files.filter(f => f.name.match(/\.(pdf|txt|md|docx|json)$/i));
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
        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
      }
      if (fullText.trim().length > 0) return fullText;
    }
  } catch (e) {
    console.warn('PDF parser notice:', e);
  }
  const rawText = await file.text();
  const cleanText = rawText.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ');
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
  return rawText.replace(/<[^>]+>/g, ' ').replace(/[^\x20-\x7E\n\r]/g, ' ');
}

function rebuildExtractedText() {
  state.extractedText = state.uploadedFiles
    .map(file => {
      const fileId = `${file.name}_${file.size}`;
      return `--- ${file.name} ---\n${state.fileTexts[fileId] || ''}`;
    })
    .join('\n\n');
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
  return (state.extractedText + '\n\n' + manual).trim();
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
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);
  
  const words = notes.split(/\s+/).filter(w => w.length > 4);
  const title = sentences[0] ? sentences[0].slice(0, 40) + '...' : 'Course Material';

  if (type === 'quiz') {
    const questions = [];
    const count = Math.min(8, Math.max(4, sentences.length));

    for (let i = 0; i < count; i++) {
      const sentence = sentences[i % sentences.length] || `Concept ${i + 1} from lecture notes.`;
      const sWords = sentence.split(/\s+/);
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
