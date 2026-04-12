// ===================== app.js (Agg Editor - Code Changer di Panel Preview) =====================
let files = [];
let activeFileId = null;
let openTabIds = [];
let editor = null;
let currentZoom = 100;
let wordWrap = true;
let renameTargetId = null;
let findCursor = null;
let suppressDirty = false;
let sidebar, previewPanel, resizeHandle;
let isResizing = false;
let startX, startWidth;
let draggedTabIndex = null;

// --- Toast ---
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toastMsg');
  if (!toast) return;
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

// --- Konfirmasi modal ---
function confirmAsync(message, title = 'Konfirmasi') {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    if (!modal) return resolve(false);
    titleEl.innerText = title;
    msgEl.innerText = message;
    modal.classList.add('show');
    const onConfirm = () => { modal.classList.remove('show'); cleanup(); resolve(true); };
    const onCancel = () => { modal.classList.remove('show'); cleanup(); resolve(false); };
    const cleanup = () => {
      okBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      modal.querySelector('.modal-overlay')?.removeEventListener('click', onCancel);
    };
    okBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    modal.querySelector('.modal-overlay')?.addEventListener('click', onCancel);
  });
}

function escapeHtml(str) { return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]); }
function genId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 8); }

function getLanguageFromName(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const map = {
    html: 'htmlmixed', htm: 'htmlmixed',
    css: 'css',
    js: 'javascript', mjs: 'javascript', jsx: 'javascript',
    ts: 'text/typescript', tsx: 'text/typescript',
    json: 'application/json',
    md: 'markdown', markdown: 'markdown',
    scss: 'text/x-scss', sass: 'text/x-scss',
    py: 'python',
    php: 'application/x-httpd-php',
    sql: 'text/x-sql',
    sh: 'shell', bash: 'shell',
    go: 'go',
    rs: 'rust',
    yaml: 'yaml', yml: 'yaml',
    toml: 'toml',
    vue: 'vue',
    c: 'text/x-csrc', h: 'text/x-csrc',
    cpp: 'text/x-c++src', cc: 'text/x-c++src', cxx: 'text/x-c++src',
    cs: 'text/x-csharp',
    java: 'text/x-java',
    rb: 'ruby',
    kt: 'text/x-kotlin',
    swift: 'swift'
  };
  return map[ext] || 'text/plain';
}

function getFileIconHtml(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const icons = {
    html: '<i class="fab fa-html5 text-green-400"></i>', htm: '<i class="fab fa-html5 text-green-400"></i>',
    css: '<i class="fab fa-css3-alt text-blue-400"></i>',
    js: '<i class="fab fa-js text-yellow-500"></i>', mjs: '<i class="fab fa-js text-yellow-500"></i>', jsx: '<i class="fab fa-js text-yellow-500"></i>',
    ts: '<i class="fab fa-js text-blue-500"></i>', tsx: '<i class="fab fa-js text-blue-500"></i>',
    json: '<i class="fas fa-brackets-curly text-yellow-300"></i>',
    md: '<i class="fab fa-markdown text-gray-300"></i>', markdown: '<i class="fab fa-markdown text-gray-300"></i>',
    scss: '<i class="fab fa-sass text-pink-400"></i>', sass: '<i class="fab fa-sass text-pink-400"></i>',
    py: '<i class="fab fa-python text-blue-300"></i>',
    php: '<i class="fab fa-php text-indigo-400"></i>',
    sql: '<i class="fas fa-database text-orange-400"></i>',
    sh: '<i class="fas fa-terminal text-green-300"></i>', bash: '<i class="fas fa-terminal text-green-300"></i>',
    go: '<i class="fas fa-code text-cyan-400"></i>',
    rs: '<i class="fas fa-code text-orange-500"></i>',
    yaml: '<i class="fas fa-file-code text-red-300"></i>', yml: '<i class="fas fa-file-code text-red-300"></i>',
    vue: '<i class="fab fa-vuejs text-green-500"></i>'
  };
  if (icons[ext]) return icons[ext];
  return '<i class="fas fa-file-code text-gray-400"></i>';
}

function persistState() {
  try {
    localStorage.setItem('editor_state', JSON.stringify({ files, openTabIds, activeFileId, wordWrap, currentZoom }));
    localStorage.setItem('editor_theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
  } catch (e) { console.warn(e); }
}

function updateStatusBar() {
  if (!editor) return;
  const file = files.find(f => f.id === activeFileId);
  const cursor = editor.getCursor();
  const langMap = {
    htmlmixed: 'HTML', css: 'CSS', javascript: 'JavaScript',
    'text/typescript': 'TypeScript', markdown: 'Markdown',
    'text/x-scss': 'SCSS', python: 'Python',
    'application/x-httpd-php': 'PHP', 'text/x-sql': 'SQL',
    shell: 'Shell', go: 'Go', rust: 'Rust', yaml: 'YAML',
    toml: 'TOML', vue: 'Vue', 'text/x-csrc': 'C',
    'text/x-c++src': 'C++', 'text/x-csharp': 'C#',
    'text/x-java': 'Java', 'application/json': 'JSON',
    'text/plain': 'Plain Text'
  };
  const fileEl = document.getElementById('statusFile');
  const langEl = document.getElementById('statusLang');
  const cursorEl = document.getElementById('statusCursor');
  const zoomEl = document.getElementById('statusZoom');
  const emmetEl = document.getElementById('statusEmmet');
  if (fileEl) fileEl.innerHTML = `<i class="fas fa-file-code mr-1"></i> ${file ? file.name : 'No file open'}`;
  if (langEl) langEl.textContent = file ? (langMap[file.language] || file.language || 'Text') : '';
  if (cursorEl) cursorEl.innerHTML = `<i class="fas fa-caret-right"></i> Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
  if (zoomEl) zoomEl.textContent = `${currentZoom}%`;
  if (emmetEl) {
    const supportsEmmet = file && (file.language === 'htmlmixed' || file.language === 'css' || file.language === 'text/x-scss');
    emmetEl.classList.toggle('show', supportsEmmet);
  }
}

function updateWelcomeScreen() {
  const ws = document.getElementById('welcomeScreen');
  if (!ws) return;
  const hasOpen = openTabIds.length > 0;
  if (hasOpen) ws.classList.add('hidden');
  else ws.classList.remove('hidden');
}

// ===================== EMMET =====================
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
function emmetExpand(abbr, indentStr) {
  indentStr = indentStr || '';
  if (abbr === '!') return `<!DOCTYPE html>\n<html lang="id">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>`;
  if (!abbr.match(/[>.+*{#\[]/)) {
    const cssExpanded = expandCssEmmet(abbr);
    if (cssExpanded) return cssExpanded;
  }
  try { return parseEmmetNode(abbr, indentStr); } catch (e) { return null; }
}
function parseEmmetNode(abbr, indent) {
  const siblings = splitTopLevel(abbr, '+');
  if (siblings.length > 1) return siblings.map(s => parseEmmetNode(s.trim(), indent)).join('\n');
  const childIdx = findTopLevelChar(abbr, '>');
  if (childIdx !== -1) {
    const parent = abbr.substring(0, childIdx).trim();
    const child = abbr.substring(childIdx + 1).trim();
    return buildTag(parent, parseEmmetNode(child, indent + '  '), indent, true);
  }
  return buildTag(abbr, null, indent, false);
}
function buildTag(spec, innerContent, indent, multiline) {
  let count = 1;
  const mulMatch = spec.match(/^(.+)\*(\d+)$/);
  if (mulMatch) { spec = mulMatch[1]; count = parseInt(mulMatch[2]); }
  let textContent = '';
  const textMatch = spec.match(/^(.*)\{([^}]*)\}$/);
  if (textMatch) { spec = textMatch[1]; textContent = textMatch[2]; }
  const parsed = parseTagSpec(spec);
  const results = [];
  for (let i = 0; i < count; i++) {
    const txt = textContent.replace(/\$+/g, m => String(i + 1).padStart(m.length, '0'));
    const inner = txt || innerContent;
    results.push(buildSingleTag(parsed, inner, indent, multiline || !!innerContent));
  }
  return results.join('\n');
}
function parseTagSpec(spec) {
  let tag = 'div', id = '', classes = [];
  let remaining = spec.trim() || 'div';
  const attrs = {};
  remaining = remaining.replace(/\[([^\]]*)\]/g, (_, content) => {
    content.split(/\s+/).forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) attrs[k] = v ? v.replace(/^"|"$/g, '') : '';
    });
    return '';
  });
  const parts = remaining.split(/(?=[.#])/);
  if (parts[0] && !parts[0].startsWith('.') && !parts[0].startsWith('#')) {
    tag = parts.shift();
  }
  parts.forEach(p => {
    if (p.startsWith('#')) id = p.slice(1);
    else if (p.startsWith('.')) classes.push(p.slice(1));
  });
  return { tag: tag || 'div', id, classes, attrs };
}
function buildSingleTag(parsed, inner, indent, multiline) {
  const { tag, id, classes, attrs } = parsed;
  let attrStr = '';
  if (id) attrStr += ` id="${id}"`;
  if (classes.length) attrStr += ` class="${classes.join(' ')}"`;
  Object.entries(attrs).forEach(([k, v]) => { attrStr += v !== '' ? ` ${k}="${v}"` : ` ${k}`; });
  if (VOID_TAGS.has(tag)) return `${indent}<${tag}${attrStr}>`;
  if (!inner) return `${indent}<${tag}${attrStr}></${tag}>`;
  if (multiline) return `${indent}<${tag}${attrStr}>\n${inner}\n${indent}</${tag}>`;
  return `${indent}<${tag}${attrStr}>${inner}</${tag}>`;
}
function splitTopLevel(str, char) {
  const result = [];
  let depth = 0, current = '';
  for (const ch of str) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === char && depth === 0) { result.push(current); current = ''; }
    else current += ch;
  }
  result.push(current);
  return result;
}
function findTopLevelChar(str, char) {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === char && depth === 0) return i;
  }
  return -1;
}
const CSS_EMMET_MAP = {
  'm': 'margin: ;', 'mt': 'margin-top: ;', 'mr': 'margin-right: ;', 'mb': 'margin-bottom: ;',
  'ml': 'margin-left: ;', 'p': 'padding: ;', 'pt': 'padding-top: ;', 'pr': 'padding-right: ;',
  'pb': 'padding-bottom: ;', 'pl': 'padding-left: ;', 'w': 'width: ;', 'h': 'height: ;',
  'mw': 'max-width: ;', 'mh': 'max-height: ;', 'd': 'display: ;', 'df': 'display: flex;',
  'dg': 'display: grid;', 'dn': 'display: none;', 'pos': 'position: ;', 'posa': 'position: absolute;',
  'posr': 'position: relative;', 'posf': 'position: fixed;', 'f': 'font-size: ;', 'fw': 'font-weight: ;',
  'ff': 'font-family: ;', 'c': 'color: ;', 'bg': 'background: ;', 'bgc': 'background-color: ;',
  'bgi': 'background-image: url();', 'b': 'border: ;', 'br': 'border-radius: ;', 'o': 'opacity: ;',
  'ov': 'overflow: ;', 'cur': 'cursor: ;', 'z': 'z-index: ;', 'jc': 'justify-content: ;',
  'ai': 'align-items: ;', 'fl': 'float: ;', 'cl': 'clear: ;', 'ta': 'text-align: ;',
  'td': 'text-decoration: ;', 'tt': 'text-transform: ;', 'ls': 'letter-spacing: ;',
  'lh': 'line-height: ;', 't': 'top: ;', 'r': 'right: ;', 'bot': 'bottom: ;', 'l': 'left: ;',
  'tr': 'transition: ;', 'trf': 'transform: ;', 'bs': 'box-shadow: ;', 'cnt': 'content: "";',
  'ga': 'grid-area: ;', 'gtc': 'grid-template-columns: ;'
};
function expandCssEmmet(abbr) {
  const valMatch = abbr.match(/^([a-z]+)(-?[\d.]+)([a-z%]*)$/);
  if (valMatch) {
    const [, prop, val, unit] = valMatch;
    const expanded = CSS_EMMET_MAP[prop];
    if (expanded) {
      const u = unit || (parseFloat(val) !== 0 ? 'px' : '');
      return expanded.replace(': ;', `: ${val}${u};`);
    }
  }
  return CSS_EMMET_MAP[abbr] || null;
}
function tryEmmet(cm) {
  const cursor = cm.getCursor();
  const line = cm.getLine(cursor.line);
  const before = line.substring(0, cursor.ch);
  const mode = cm.getOption('mode');
  const match = before.match(/([^\s,;{}()\[\]"'`]+)$/);
  if (!match) return false;
  const abbr = match[1];
  if (!abbr) return false;
  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '';
  let expanded = null;
  if (mode === 'htmlmixed' || mode === 'xml') expanded = emmetExpand(abbr, indent);
  else if (mode === 'css') expanded = expandCssEmmet(abbr);
  if (!expanded) return false;
  const from = { line: cursor.line, ch: cursor.ch - abbr.length };
  const to = { line: cursor.line, ch: cursor.ch };
  cm.replaceRange(expanded, from, to);
  const lines = expanded.split('\n');
  const cursorLine = cursor.line + lines.length - 1;
  let cursorCh;
  if (lines.length === 1) {
    cursorCh = from.ch + lines[0].length;
    const emptyTag = expanded.match(/><\/[^>]+>$/);
    if (emptyTag) cursorCh = from.ch + expanded.indexOf('></') + 1;
    const semiIdx = expanded.lastIndexOf(': ;');
    if (semiIdx !== -1) cursorCh = from.ch + semiIdx + 2;
  } else {
    const lastLine = lines[lines.length - 1];
    cursorCh = lastLine.length;
  }
  cm.setCursor({ line: cursorLine, ch: cursorCh });
  return true;
}

// ===================== BRACKET COLORIZER =====================
let bracketOverlay = null;
function enableBracketColorizer() {
  if (!editor) return;
  if (bracketOverlay) editor.removeOverlay(bracketOverlay);
  bracketOverlay = {
    token(stream) {
      const ch = stream.peek();
      if ('([{'.includes(ch)) { stream.next(); return 'pair-colorizer-' + ('([{'.indexOf(ch) + 1); }
      if (')]}'.includes(ch)) { stream.next(); return 'pair-colorizer-' + (')]}'.indexOf(ch) + 1); }
      stream.eatWhile(/[^()[\]{}]/);
      return null;
    }
  };
  editor.addOverlay(bracketOverlay);
}

// ===================== PRETTIER FORMAT =====================
async function formatCodeWithPrettier(code, language) {
  if (typeof prettier === 'undefined') {
    showToast('Formatter belum siap', 2000);
    return code;
  }
  let parser = null;
  let plugins = [];
  if (language === 'htmlmixed') { parser = 'html'; plugins = [prettierPlugins?.html]; }
  else if (language === 'css') { parser = 'css'; plugins = [prettierPlugins?.postcss]; }
  else if (language === 'text/x-scss') { parser = 'scss'; plugins = [prettierPlugins?.postcss]; }
  else if (language === 'javascript') { parser = 'babel'; plugins = [prettierPlugins?.babel]; }
  else if (language === 'text/typescript') { parser = 'typescript'; plugins = [prettierPlugins?.typescript]; }
  else if (language === 'markdown') { parser = 'markdown'; plugins = [prettierPlugins?.markdown]; }
  else if (language === 'application/json') { parser = 'json'; plugins = [prettierPlugins?.babel]; }
  else { showToast('Format tidak tersedia untuk bahasa ini', 1800); return code; }
  if (!plugins.length || !plugins[0]) { showToast('Plugin formatter tidak ditemukan', 2500); return code; }
  try {
    const formatted = await prettier.format(code, { parser, plugins, tabWidth: 2, semi: true, singleQuote: false, printWidth: 80 });
    return typeof formatted === 'string' ? formatted : (await Promise.resolve(formatted));
  } catch (e) {
    showToast('Format gagal: ' + e.message, 3000);
    return code;
  }
}

// ===================== SAVE / FORMAT =====================
async function saveCurrentFile() {
  if (!activeFileId) return showToast('Tidak ada file aktif', 1500);
  const file = files.find(f => f.id === activeFileId);
  if (!file || !editor) return;
  let content = editor.getValue();
  file.content = content;
  file.savedContent = content;
  
  if (file.handle && typeof file.handle.createWritable === 'function') {
    try {
      const writable = await file.handle.createWritable();
      await writable.write(content);
      await writable.close();
      showToast(`"${file.name}" tersimpan ke sistem`, 2000);
    } catch (err) {
      console.error(err);
      showToast(`Gagal menyimpan ke file sistem: ${err.message}`, 3000);
    }
  } else if ('showSaveFilePicker' in window) {
    try {
      const ext = file.name.split('.').pop() || 'txt';
      const newHandle = await window.showSaveFilePicker({
        suggestedName: file.name,
        types: [{ description: 'File Kode', accept: { 'text/plain': ['.' + ext] } }]
      });
      const writable = await newHandle.createWritable();
      await writable.write(content);
      await writable.close();
      file.handle = newHandle;
      showToast(`"${file.name}" disimpan ke sistem dan terhubung`, 2000);
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Gagal menyimpan: ' + err.message, 3000);
      return;
    }
  } else {
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`"${file.name}" di-download (fallback)`, 2000);
  }
  
  if (file.dirty) {
    file.dirty = false;
    updateTabDirtyState(file.id, false);
  }
  persistState();
  renderFileList();
  renderTabs();
}

async function formatCurrentFile() {
  if (!activeFileId || !editor) return;
  const file = files.find(f => f.id === activeFileId);
  if (!file) return;
  const originalCode = editor.getValue();
  const formattedCode = await formatCodeWithPrettier(originalCode, file.language);
  if (formattedCode !== originalCode) {
    suppressDirty = true;
    editor.setValue(formattedCode);
    suppressDirty = false;
    file.content = formattedCode;
    if (!file.dirty) {
      file.dirty = true;
      updateTabDirtyState(file.id, true);
    }
    persistState();
    showToast('Kode diformat', 1500);
  } else {
    showToast('Tidak ada perubahan (kode sudah rapi)', 1500);
  }
}

async function saveAsFile() {
  if (!activeFileId) return showToast('Tidak ada file aktif', 1500);
  const oldFile = files.find(f => f.id === activeFileId);
  if (!oldFile) return;
  let content = editor.getValue();
  
  if ('showSaveFilePicker' in window) {
    try {
      const ext = oldFile.name.split('.').pop() || 'txt';
      const newHandle = await window.showSaveFilePicker({
        suggestedName: oldFile.name,
        types: [{ description: 'File Kode', accept: { 'text/plain': ['.' + ext] } }]
      });
      const writable = await newHandle.createWritable();
      await writable.write(content);
      await writable.close();
      const newName = newHandle.name;
      if (files.some(f => f.name === newName)) {
        showToast(`File "${newName}" sudah ada di project`, 2000);
        return;
      }
      const newId = genId();
      files.push({ id: newId, name: newName, content, savedContent: content, language: getLanguageFromName(newName), dirty: false, handle: newHandle });
      openFileInTab(newId);
      persistState();
      showToast(`Disimpan sebagai "${newName}" (terhubung ke sistem)`, 2000);
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Gagal save as: ' + err.message, 3000);
    }
  } else {
    const newName = prompt('Simpan sebagai (nama + ekstensi):', oldFile.name);
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();
    if (files.some(f => f.name === trimmed)) return showToast(`"${trimmed}" sudah ada`, 2000);
    const newId = genId();
    files.push({ id: newId, name: trimmed, content, savedContent: content, language: getLanguageFromName(trimmed), dirty: false });
    openFileInTab(newId);
    persistState();
    showToast(`Disimpan sebagai "${trimmed}" (tidak terhubung ke sistem)`, 2000);
  }
}

// ===================== FILE CRUD =====================
function createNewFile() {
  let base = 'newfile', ext = '.txt', n = 1, name = base + ext;
  while (files.some(f => f.name === name)) name = `${base}${n++}${ext}`;
  const id = genId();
  files.push({ id, name, content: '', savedContent: '', language: getLanguageFromName(name), dirty: false });
  openFileInTab(id);
  renderFileList();
  persistState();
  showToast(`File "${name}" dibuat`, 2000);
}

async function deleteFileById(id) {
  const idx = files.findIndex(f => f.id === id);
  if (idx === -1) return;
  const name = files[idx].name;
  const confirmed = await confirmAsync(`Hapus file "${name}"?`, 'Hapus File');
  if (!confirmed) return;
  files.splice(idx, 1);
  openTabIds = openTabIds.filter(t => t !== id);
  if (activeFileId === id) activeFileId = openTabIds[0] || null;
  if (activeFileId) loadEditorContent();
  else if (editor) {
    suppressDirty = true;
    editor.setValue('');
    suppressDirty = false;
    editor.setOption('mode', 'text/plain');
  }
  renderFileList();
  renderTabs();
  persistState();
  showToast(`"${name}" dihapus`, 1500);
  updateStatusBar();
}

function renameFile(id) {
  const file = files.find(f => f.id === id);
  if (!file) return;
  renameTargetId = id;
  const modal = document.getElementById('renameModal');
  const input = document.getElementById('renameInput');
  input.value = file.name;
  modal.classList.add('show');
  setTimeout(() => { input.focus(); input.select(); }, 50);
}

async function importFiles(list) {
  for (const f of Array.from(list)) {
    const content = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsText(f, 'UTF-8');
    });
    const name = f.name;
    const existing = files.find(x => x.name === name);
    if (existing) {
      const confirmed = await confirmAsync(`File "${name}" sudah ada. Timpa?`, 'Timpa File');
      if (!confirmed) continue;
      const idx = files.findIndex(x => x.id === existing.id);
      if (idx !== -1) files.splice(idx, 1);
      openTabIds = openTabIds.filter(t => t !== existing.id);
      if (activeFileId === existing.id) activeFileId = openTabIds[0] || null;
    }
    const id = genId();
    files.push({ id, name, content, savedContent: content, language: getLanguageFromName(name), dirty: false, handle: null });
    openFileInTab(id);
    renderFileList();
    persistState();
    showToast(`"${name}" diimpor`, 2000);
  }
}

async function exportAllAsZip() {
  if (!files.length) return showToast('Tidak ada file', 1500);
  const zip = new JSZip();
  syncEditorToFile();
  files.forEach(f => zip.file(f.name, f.content));
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'project_export.zip';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Semua file diekspor ke ZIP', 2000);
}

function exportCurrentFile() {
  const file = files.find(f => f.id === activeFileId);
  if (!file) return showToast('Tidak ada file aktif', 1500);
  syncEditorToFile();
  const blob = new Blob([file.content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`"${file.name}" diekspor`, 2000);
}

// ===================== ZOOM / THEME / WRAP =====================
function setZoom(pct) {
  currentZoom = Math.max(50, Math.min(200, pct));
  if (editor) {
    editor.getWrapperElement().style.fontSize = (currentZoom / 100 * 14) + 'px';
    editor.refresh();
  }
  updateStatusBar();
  persistState();
}
function zoomIn() { setZoom(currentZoom + 10); }
function zoomOut() { setZoom(currentZoom - 10); }
function zoomReset() { setZoom(100); }

function setTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    if (editor) editor.setOption('theme', 'default');
  } else {
    document.body.classList.remove('light-theme');
    if (editor) editor.setOption('theme', 'monokai');
  }
  if (editor) editor.refresh();
  persistState();
}

function toggleWordWrap() {
  wordWrap = !wordWrap;
  if (editor) editor.setOption('lineWrapping', wordWrap);
  const el = document.getElementById('wordWrapState');
  if (el) {
    el.textContent = wordWrap ? 'ON' : 'OFF';
    el.className = wordWrap ? 'text-xs text-green-400 ml-1' : 'text-xs text-gray-400 ml-1';
  }
  persistState();
}

// ===================== TOGGLE PANELS =====================
function toggleSidebar() {
  sidebar.classList.toggle('closed');
  const isClosed = sidebar.classList.contains('closed');
  const hamburgerIcon = document.getElementById('hamburgerIcon');
  if (isClosed) {
    hamburgerIcon.classList.remove('fa-times');
    hamburgerIcon.classList.add('fa-bars');
  } else {
    hamburgerIcon.classList.remove('fa-bars');
    hamburgerIcon.classList.add('fa-times');
  }
  document.getElementById('toggleSidebarBtn').classList.toggle('sidebar-closed', isClosed);
  localStorage.setItem('sidebar_closed', isClosed);
  setTimeout(() => editor && editor.refresh(), 300);
}

function togglePreviewPanel() {
  previewPanel.classList.toggle('closed');
  const isClosed = previewPanel.classList.contains('closed');
  resizeHandle.style.display = isClosed ? 'none' : '';
  localStorage.setItem('preview_closed', isClosed);
  setTimeout(() => editor && editor.refresh(), 300);
}

// ===================== RESIZE HANDLE =====================
function initResize() {
  if (!resizeHandle || !previewPanel) return;
  resizeHandle.addEventListener('mousedown', e => {
    isResizing = true;
    startX = e.clientX;
    startWidth = previewPanel.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    resizeHandle.classList.add('active');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!isResizing) return;
    const newW = Math.max(260, Math.min(window.innerWidth * 0.7, startWidth + (startX - e.clientX)));
    previewPanel.style.width = newW + 'px';
    e.preventDefault();
  });
  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    resizeHandle.classList.remove('active');
    localStorage.setItem('preview_width', previewPanel.offsetWidth);
    if (editor) editor.refresh();
  });
}

// ===================== FIND / REPLACE =====================
function openFindBar() {
  document.getElementById('findBar').classList.add('show');
  document.getElementById('findInput').focus();
}
function closeFindBarFn() {
  document.getElementById('findBar').classList.remove('show');
  findCursor = null;
  if (editor) editor.focus();
}
function doFind(dir = 1) {
  if (!editor) return;
  const query = document.getElementById('findInput').value;
  if (!query) return;
  if (!findCursor || findCursor._q !== query) {
    findCursor = editor.getSearchCursor(query, dir === 1 ? { line: 0, ch: 0 } : { line: Infinity });
    findCursor._q = query;
  }
  const found = dir === 1 ? findCursor.findNext() : findCursor.findPrevious();
  if (found) {
    editor.setSelection(findCursor.from(), findCursor.to());
    editor.scrollIntoView({ from: findCursor.from(), to: findCursor.to() }, 60);
  } else {
    findCursor = editor.getSearchCursor(query, dir === 1 ? { line: 0, ch: 0 } : { line: Infinity });
    findCursor._q = query;
    const f2 = dir === 1 ? findCursor.findNext() : findCursor.findPrevious();
    if (f2) {
      editor.setSelection(findCursor.from(), findCursor.to());
      editor.scrollIntoView({ from: findCursor.from(), to: findCursor.to() }, 60);
    }
  }
  updateFindCount(query);
}
function doReplaceOne() {
  if (!editor || !findCursor) return;
  findCursor.replace(document.getElementById('replaceInput').value);
  doFind(1);
}
function doReplaceAll() {
  if (!editor) return;
  const q = document.getElementById('findInput').value;
  const r = document.getElementById('replaceInput').value;
  if (!q) return;
  let n = 0;
  const c = editor.getSearchCursor(q);
  while (c.findNext()) {
    c.replace(r);
    n++;
  }
  showToast(`${n} penggantian`, n ? 2000 : 1500);
}
function updateFindCount(query) {
  const el = document.getElementById('findCount');
  if (!el || !editor || !query) {
    if (el) el.textContent = '';
    return;
  }
  let n = 0;
  const c = editor.getSearchCursor(query);
  while (c.findNext()) n++;
  el.textContent = n ? `${n} hasil` : 'Tidak ada';
}

// ===================== RENDER UI =====================
function renderFileList() {
  const container = document.getElementById('fileList');
  if (!container) return;
  container.innerHTML = '';
  if (!files.length) {
    container.innerHTML = '<div class="text-gray-500 text-xs px-4 py-3 text-center"><i class="fas fa-folder-open"></i> Belum ada file.<br>Klik + untuk membuat.</div>';
    return;
  }
  files.forEach(file => {
    const div = document.createElement('div');
    div.className = 'file-item' + (activeFileId === file.id ? ' active' : '');
    let borderColor = '#94a3b8';
    if (file.language === 'htmlmixed') borderColor = '#4ade80';
    else if (file.language === 'css') borderColor = '#3b82f6';
    else if (file.language === 'javascript') borderColor = '#f97316';
    div.style.borderLeftColor = borderColor;
    div.innerHTML = `<span class="file-icon">${getFileIconHtml(file.name)}</span><span class="truncate flex-1 text-xs" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span><div class="file-actions"><button class="file-action-btn rename-btn" title="Rename"><i class="fas fa-edit"></i></button><button class="file-action-btn delete-btn" title="Hapus" style="color:#f87171"><i class="fas fa-trash-alt"></i></button></div>`;
    div.querySelector('.rename-btn').onclick = e => { e.stopPropagation(); renameFile(file.id); };
    div.querySelector('.delete-btn').onclick = async e => { e.stopPropagation(); await deleteFileById(file.id); };
    div.onclick = () => openFileInTab(file.id);
    container.appendChild(div);
  });
}

function updateTabDirtyState(fileId, isDirty) {
  const tab = document.querySelector(`.tab-item[data-file-id="${fileId}"]`);
  if (!tab) return;
  const closeSpan = tab.querySelector('.tab-close');
  if (isDirty) {
    if (closeSpan) {
      closeSpan.innerHTML = '<span class="tab-dirty-indicator"></span>';
      closeSpan.classList.add('dirty');
    }
  } else {
    if (closeSpan && closeSpan.classList.contains('dirty')) {
      closeSpan.innerHTML = '<i class="fas fa-times-circle"></i>';
      closeSpan.classList.remove('dirty');
    }
  }
}

function handleDragStart(e) {
  const tab = e.target.closest('.tab-item');
  if (!tab) return;
  draggedTabIndex = parseInt(tab.getAttribute('data-index'));
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedTabIndex);
}
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function handleDrop(e) {
  e.preventDefault();
  const targetTab = e.target.closest('.tab-item');
  if (!targetTab) return;
  const targetIndex = parseInt(targetTab.getAttribute('data-index'));
  if (draggedTabIndex !== null && draggedTabIndex !== targetIndex) {
    const [moved] = openTabIds.splice(draggedTabIndex, 1);
    openTabIds.splice(targetIndex, 0, moved);
    persistState();
    renderTabs();
  }
  draggedTabIndex = null;
}
function handleDragEnd(e) { draggedTabIndex = null; }

function renderTabs() {
  const tabBar = document.getElementById('tabBar');
  if (!tabBar) return;
  tabBar.innerHTML = '';
  openTabIds.forEach((id, index) => {
    const file = files.find(f => f.id === id);
    if (!file) return;
    const tab = document.createElement('div');
    tab.className = 'tab-item' + (activeFileId === id ? ' active' : '');
    tab.setAttribute('data-file-id', id);
    tab.setAttribute('draggable', 'true');
    tab.setAttribute('data-index', index);
    let closeHtml = file.dirty ? '<span class="tab-close dirty"><span class="tab-dirty-indicator"></span></span>' : '<span class="tab-close"><i class="fas fa-times-circle"></i></span>';
    tab.innerHTML = `<span class="file-icon" style="font-size:12px">${getFileIconHtml(file.name)}</span><span class="truncate max-w-[120px] text-xs">${escapeHtml(file.name)}</span>${closeHtml}`;
    tab.addEventListener('click', e => {
      if (e.target.closest('.tab-close')) {
        e.stopPropagation();
        closeTabWithConfirm(id);
      } else {
        setActiveFile(id);
      }
    });
    tab.addEventListener('dragstart', handleDragStart);
    tab.addEventListener('dragend', handleDragEnd);
    tab.addEventListener('dragover', handleDragOver);
    tab.addEventListener('drop', handleDrop);
    tabBar.appendChild(tab);
  });
  updateWelcomeScreen();
}

function openFileInTab(fileId) {
  if (!openTabIds.includes(fileId)) openTabIds.push(fileId);
  setActiveFile(fileId);
}

async function closeTabWithConfirm(fileId) {
  const file = files.find(f => f.id === fileId);
  if (!file) return;
  if (file.dirty) {
    const confirmed = await confirmAsync(`File "${file.name}" belum disimpan. Lanjutkan menutup tanpa menyimpan?`, 'Perubahan belum disimpan');
    if (!confirmed) return;
    file.content = file.savedContent ?? file.content;
    file.dirty = false;
    if (activeFileId === fileId && editor) {
      suppressDirty = true;
      editor.setValue(file.content);
      suppressDirty = false;
      updateTabDirtyState(fileId, false);
    }
  }
  closeTab(fileId, true);
}

function closeTab(fileId, skipSync = false) {
  if (!skipSync && activeFileId === fileId && !files.find(f => f.id === fileId)?.dirty) {
    syncEditorToFile();
  }
  const idx = openTabIds.indexOf(fileId);
  if (idx !== -1) openTabIds.splice(idx, 1);
  if (activeFileId === fileId) {
    activeFileId = openTabIds[Math.max(0, idx - 1)] || openTabIds[0] || null;
  }
  renderTabs();
  renderFileList();
  if (activeFileId) {
    loadEditorContent();
  } else if (editor) {
    suppressDirty = true;
    editor.setValue('');
    suppressDirty = false;
    editor.setOption('mode', 'text/plain');
  }
  persistState();
  updateStatusBar();
  updateWelcomeScreen();
}

function setActiveFile(fileId) {
  syncEditorToFile();
  activeFileId = fileId;
  findCursor = null;
  renderFileList();
  renderTabs();
  loadEditorContent();
  persistState();
  updateStatusBar();
}

function loadEditorContent() {
  const file = files.find(f => f.id === activeFileId);
  if (!file || !editor) return;
  suppressDirty = true;
  editor.setValue(file.content || '');
  suppressDirty = false;
  editor.setOption('mode', file.language);
  editor.setOption('foldGutter', true);
  const lintOpts = getLintOptions(file.language);
  if (lintOpts) {
    editor.setOption('gutters', ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers']);
    editor.setOption('lint', lintOpts);
  } else {
    editor.setOption('gutters', ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']);
    editor.setOption('lint', false);
  }
  enableBracketColorizer();
  editor.refresh();
  editor.focus();
  updateStatusBar();
  setTimeout(updateLintErrorDisplay, 800);
}

function syncEditorToFile() {
  if (activeFileId && editor) {
    const file = files.find(f => f.id === activeFileId);
    if (file) file.content = editor.getValue();
  }
}

function getLintOptions(language) {
  if (language === 'javascript') {
    return {
      getAnnotations: (code) => {
        if (typeof JSHINT === 'undefined') return [];
        JSHINT(code, { esversion: 11, undef: false, unused: false, asi: true, expr: true });
        return (JSHINT.errors || []).filter(Boolean).map(err => ({
          message: err.reason,
          severity: 'error',
          from: CodeMirror.Pos(err.line - 1, err.character - 1),
          to: CodeMirror.Pos(err.line - 1, err.character)
        }));
      },
      async: false
    };
  }
  if (language === 'css') {
    return {
      getAnnotations: (code) => {
        if (typeof CSSLint === 'undefined') return [];
        const result = CSSLint.verify(code);
        return result.messages.map(msg => ({
          message: msg.message,
          severity: msg.type === 'error' ? 'error' : 'warning',
          from: CodeMirror.Pos((msg.line || 1) - 1, (msg.col || 1) - 1),
          to: CodeMirror.Pos((msg.line || 1) - 1, (msg.col || 1))
        }));
      },
      async: false
    };
  }
  return null;
}

function updateLintErrorDisplay() {
  const el = document.getElementById('statusLintErrors');
  const countEl = document.getElementById('lintErrorCount');
  if (!el || !countEl || !editor) return;
  const state = editor.state?.lint;
  const count = state?.marked?.length || 0;
  if (count > 0) {
    countEl.textContent = count;
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}

// ===================== FITUR SISTEM FILE LANGSUNG =====================
async function openFileFromSystem() {
  try {
    if ('showOpenFilePicker' in window) {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Kode File', accept: { 'text/plain': ['.js', '.html', '.css', '.txt', '.json', '.py', '.php', '.go', '.rs', '.md', '.ts', '.jsx', '.vue', '.c', '.cpp', '.java'] } }],
        multiple: false
      });
      const file = await handle.getFile();
      const content = await file.text();
      const name = file.name;
      const existing = files.find(f => f.name === name);
      if (existing) {
        existing.content = content;
        existing.savedContent = content;
        existing.dirty = false;
        existing.handle = handle;
        updateTabDirtyState(existing.id, false);
        if (activeFileId === existing.id) {
          suppressDirty = true;
          editor.setValue(content);
          suppressDirty = false;
        }
        showToast(`"${name}" diperbarui dari sistem`, 2000);
      } else {
        const newId = genId();
        files.push({ id: newId, name, content, savedContent: content, language: getLanguageFromName(name), dirty: false, handle });
        openFileInTab(newId);
        showToast(`"${name}" dibuka (terhubung ke file sistem)`, 2000);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.js,.html,.css,.txt,.json,.py,.php,.go,.rs,.md,.ts,.jsx,.vue,.c,.cpp,.java';
      input.onchange = async (e) => {
        if (!e.target.files[0]) return;
        const file = e.target.files[0];
        const content = await file.text();
        const name = file.name;
        const existing = files.find(f => f.name === name);
        if (existing) {
          const confirmed = await confirmAsync(`File "${name}" sudah ada. Timpa?`, 'Timpa File');
          if (confirmed) {
            existing.content = content;
            existing.savedContent = content;
            existing.dirty = true;
            updateTabDirtyState(existing.id, true);
            if (activeFileId === existing.id) {
              suppressDirty = true;
              editor.setValue(content);
              suppressDirty = false;
            }
            showToast(`"${name}" diperbarui dari sistem`, 2000);
          } else {
            let newName = name, counter = 1;
            while (files.some(f => f.name === newName)) {
              const ext = name.split('.').pop();
              const base = name.slice(0, name.length - ext.length - 1);
              newName = `${base} (${counter}).${ext}`;
              counter++;
            }
            const newId = genId();
            files.push({ id: newId, name: newName, content, savedContent: content, language: getLanguageFromName(newName), dirty: false });
            openFileInTab(newId);
            showToast(`"${newName}" dibuka`, 2000);
          }
        } else {
          const newId = genId();
          files.push({ id: newId, name, content, savedContent: content, language: getLanguageFromName(name), dirty: false });
          openFileInTab(newId);
          showToast(`"${name}" dibuka`, 2000);
        }
        persistState();
        renderFileList();
        renderTabs();
      };
      input.click();
    }
  } catch (err) {
    if (err.name !== 'AbortError') showToast('Gagal membuka file: ' + err.message, 3000);
  }
}

async function saveActiveFileToFolder() {
  const file = files.find(f => f.id === activeFileId);
  if (!file) return showToast('Tidak ada file aktif', 1500);
  syncEditorToFile();
  
  if (file.handle && typeof file.handle.createWritable === 'function') {
    try {
      const writable = await file.handle.createWritable();
      await writable.write(file.content);
      await writable.close();
      showToast(`"${file.name}" tersimpan ke lokasi asli`, 2000);
      return;
    } catch (err) {
      console.warn('Gagal pakai handle asli, fallback ke save dialog', err);
    }
  }
  
  try {
    if ('showSaveFilePicker' in window) {
      const newHandle = await window.showSaveFilePicker({
        suggestedName: file.name,
        types: [{ description: 'File Kode', accept: { 'text/plain': ['.' + file.name.split('.').pop()] } }]
      });
      const writable = await newHandle.createWritable();
      await writable.write(file.content);
      await writable.close();
      file.handle = newHandle;
      showToast(`"${file.name}" disimpan ke folder pilihan dan terhubung`, 2000);
    } else {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(`"${file.name}" di-download (fallback)`, 2000);
    }
  } catch (err) {
    if (err.name !== 'AbortError') showToast('Gagal menyimpan: ' + err.message, 3000);
  }
}

async function exportProjectToFolder() {
  if (!files.length) return showToast('Tidak ada file untuk diekspor', 1500);
  syncEditorToFile();
  try {
    if ('showDirectoryPicker' in window) {
      const dirHandle = await window.showDirectoryPicker();
      for (const file of files) {
        const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file.content);
        await writable.close();
      }
      showToast(`Proyek diekspor ke folder ${dirHandle.name}`, 3000);
    } else {
      showToast('Browser tidak mendukung ekspor folder langsung. Gunakan Export All (ZIP)', 3000);
      exportAllAsZip();
    }
  } catch (err) {
    if (err.name !== 'AbortError') showToast('Gagal ekspor: ' + err.message, 3000);
  }
}

async function openProjectFolder() {
  if ("showDirectoryPicker" in window) {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: "read" });
      const supported = new Set(["html","htm","css","js","mjs","jsx","ts","tsx","json","md","py","php","sql","sh","bash","go","rs","yaml","yml","toml","vue","c","cpp","cs","java","rb","kt","swift","scss","sass","txt"]);
      let count = 0;
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind !== "file") continue;
        const ext = name.split(".").pop().toLowerCase();
        if (!supported.has(ext)) continue;
        try {
          const fileHandle = handle;
          const file = await fileHandle.getFile();
          const content = await file.text();
          const existing = files.find(f => f.name === name);
          if (existing) {
            existing.content = content;
            existing.savedContent = content;
            existing.dirty = false;
            existing.handle = fileHandle;
          } else {
            const id = genId();
            files.push({ id, name, content, savedContent: content, language: getLanguageFromName(name), dirty: false, handle: fileHandle });
            count++;
          }
        } catch(e) {}
      }
      renderFileList(); persistState();
      if (!activeFileId && files.length) openFileInTab(files[0].id);
      showToast(count ? count + " file dimuat dari folder" : "Tidak ada file baru", 2500);
      return;
    } catch(e) { if (e.name === "AbortError") return; }
  }
  const input = document.createElement("input");
  input.type = "file"; input.multiple = true;
  input.accept = ".html,.css,.js,.ts,.json,.md,.py,.php,.go,.rs,.yaml,.toml,.vue,.c,.cpp,.txt,.scss,.sass";
  input.onchange = async (e) => { if (e.target.files.length) await importFiles(e.target.files); };
  input.click();
}

// ===================== CODE CHANGER (sekarang di panel) =====================
let ccPendingCallback = null;
function refreshFileDropdown() {
  const select = document.getElementById('ccFileSelect');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih file --</option>';
  files.forEach(file => {
    const option = document.createElement('option');
    option.value = file.id;
    option.textContent = file.name;
    select.appendChild(option);
  });
}

function showPositionModal(callback) {
  ccPendingCallback = callback;
  document.getElementById('ccPositionModal').classList.add('show');
}
function closePositionModal() {
  document.getElementById('ccPositionModal').classList.remove('show');
  ccPendingCallback = null;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeFlexibleRegex(searchCode) {
  const escaped = escapeRegExp(searchCode);
  const flexible = escaped.replace(/\s+/g, '\\s+');
  return new RegExp(flexible, 'g');
}

function findFlexiblePosition(content, searchCode) {
  const regex = makeFlexibleRegex(searchCode);
  regex.lastIndex = 0;
  const match = regex.exec(content);
  if (match) {
    return { start: match.index, end: match.index + match[0].length };
  }
  return null;
}

async function executeCodeChange() {
  const fileId = document.getElementById('ccFileSelect').value;
  if (!fileId) { showToast('Pilih file terlebih dahulu', 2000); return; }
  const file = files.find(f => f.id === fileId);
  if (!file) return;

  const isAdd = document.getElementById('ccActionAdd').checked;
  const isEdit = document.getElementById('ccActionEdit').checked;
  if (!isAdd && !isEdit) { showToast('Pilih tindakan Tambah atau Ubah', 2000); return; }

  const keyword = document.getElementById('ccKeyword').value;
  const beforeCode = document.getElementById('ccBefore').value;
  const afterCode = document.getElementById('ccAfter').value;

  let content = file.content;
  let newContent = content;
  let message = '';

  if (isEdit) {
    if (!beforeCode) { showToast('Kode sebelum harus diisi untuk mengubah', 2000); return; }
    const regex = makeFlexibleRegex(beforeCode);
    if (regex.test(content)) {
      newContent = content.replace(regex, afterCode);
      message = `Kode berhasil diubah (pencarian fleksibel whitespace)`;
    } else {
      showToast('Tidak ditemukan kode yang cocok (coba perhatikan spasi/indentasi? sudah fleksibel)', 3000);
      return;
    }
  } 
  else if (isAdd) {
    if (!afterCode) { showToast('Kode sesudah harus diisi untuk menambah', 2000); return; }

    if (beforeCode.trim() === '') {
      const pos = await new Promise((resolve) => {
        showPositionModal((position) => {
          resolve(position);
          closePositionModal();
        });
      });
      if (!pos) return;

      if (pos === 'awal') {
        newContent = afterCode + '\n' + content;
        message = 'Kode baru ditambahkan di awal file';
      } 
      else if (pos === 'akhir') {
        newContent = content + '\n' + afterCode;
        message = 'Kode baru ditambahkan di akhir file';
      } 
      else if (pos === 'setelah_keyword') {
        if (!keyword) { showToast('Masukkan kata kunci untuk posisi setelahnya', 2000); return; }
        const keywordPos = content.indexOf(keyword);
        if (keywordPos === -1) {
          const kwRegex = makeFlexibleRegex(keyword);
          const match = kwRegex.exec(content);
          if (!match) { showToast('Kata kunci tidak ditemukan', 2000); return; }
          const insertPos = match.index + match[0].length;
          newContent = content.slice(0, insertPos) + '\n' + afterCode + content.slice(insertPos);
        } else {
          newContent = content.slice(0, keywordPos + keyword.length) + '\n' + afterCode + content.slice(keywordPos + keyword.length);
        }
        message = `Kode baru ditambahkan setelah kata kunci "${keyword}"`;
      }
    } 
    else {
      const pos = findFlexiblePosition(content, beforeCode);
      if (pos) {
        const insertPos = pos.end;
        newContent = content.slice(0, insertPos) + '\n' + afterCode + content.slice(insertPos);
        message = 'Kode berhasil ditambahkan setelah kode sebelum (pencarian fleksibel)';
      } else {
        showToast('Tidak ditemukan kode sebelum yang cocok untuk penambahan', 2000);
        return;
      }
    }
  }

  if (newContent !== content) {
    file.content = newContent;
    file.dirty = true;
    updateTabDirtyState(file.id, true);
    persistState();

    if (activeFileId === fileId && editor) {
      suppressDirty = true;
      editor.setValue(newContent);
      suppressDirty = false;
      editor.refresh();
    }
    renderFileList();
    showToast(message, 2500);
  } else {
    showToast('Tidak ada perubahan yang dilakukan', 2000);
  }
}

function bindPositionModalEvents() {
  const posAwal = document.getElementById('ccPosAwal');
  const posAkhir = document.getElementById('ccPosAkhir');
  const posSetelah = document.getElementById('ccPosSetelahKeyword');
  const cancel = document.getElementById('ccPosCancelBtn');
  if (posAwal) posAwal.onclick = () => { if (ccPendingCallback) ccPendingCallback('awal'); };
  if (posAkhir) posAkhir.onclick = () => { if (ccPendingCallback) ccPendingCallback('akhir'); };
  if (posSetelah) posSetelah.onclick = () => { if (ccPendingCallback) ccPendingCallback('setelah_keyword'); };
  if (cancel) cancel.onclick = () => { if (ccPendingCallback) ccPendingCallback(null); closePositionModal(); };
}

// ===================== INIT EDITOR =====================
function initEditor() {
  const textarea = document.getElementById('editorTextarea');
  editor = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    mode: 'htmlmixed',
    theme: 'monokai',
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    lineWrapping: true,
    autofocus: true,
    autoCloseBrackets: true,
    autoCloseTags: true,
    matchBrackets: true,
    matchTags: { bothTags: true },
    styleActiveLine: true,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    extraKeys: {
      'Tab': cm => {
        const mode = cm.getOption('mode');
        const isHtmlCss = mode === 'htmlmixed' || mode === 'css' || mode === 'xml';
        if (isHtmlCss && !cm.somethingSelected()) {
          if (tryEmmet(cm)) return;
        }
        CodeMirror.commands.indentMore(cm);
      },
      'Shift-Tab': cm => CodeMirror.commands.indentLess(cm),
      'Ctrl-S': () => saveCurrentFile(),
      'Ctrl-B': () => toggleSidebar(),
      'Ctrl-H': () => openFindBar(),
      'Alt-F': () => formatCurrentFile(),
      'Ctrl-/': cm => cm.execCommand('toggleComment'),
      'Ctrl-=': () => zoomIn(),
      'Ctrl--': () => zoomOut(),
      'Escape': () => { closeFindBarFn(); editor.focus(); },
      'Ctrl-Shift-[': cm => cm.foldCode(cm.getCursor()),
      'Ctrl-Shift-]': cm => cm.foldCode(cm.getCursor(), null, 'unfold'),
    }
  });
  const savedZoom = localStorage.getItem('editor_state') ? (JSON.parse(localStorage.getItem('editor_state')).currentZoom || 100) : 100;
  currentZoom = savedZoom;
  setZoom(currentZoom);
  const savedTheme = localStorage.getItem('editor_theme');
  setTheme(savedTheme === 'light' ? 'light' : 'dark');
  editor.setOption('lineWrapping', wordWrap);
  editor.on('change', (cm, change) => {
    if (suppressDirty) return;
    syncEditorToFile();
    const file = files.find(f => f.id === activeFileId);
    if (file && !file.dirty) {
      file.dirty = true;
      updateTabDirtyState(file.id, true);
    }
    clearTimeout(editor._lintTimer);
    editor._lintTimer = setTimeout(updateLintErrorDisplay, 1000);
  });
  editor.on('cursorActivity', () => updateStatusBar());
  window.addEventListener('resize', () => editor.refresh());
}

// ===================== LOAD STATE =====================
function loadState() {
  const saved = localStorage.getItem('editor_state');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      files = Array.isArray(state.files) ? state.files : [];
      openTabIds = Array.isArray(state.openTabIds) ? state.openTabIds : [];
      activeFileId = state.activeFileId || null;
      wordWrap = state.wordWrap !== undefined ? state.wordWrap : true;
      currentZoom = state.currentZoom || 100;
      openTabIds = openTabIds.filter(id => files.some(f => f.id === id));
      if (activeFileId && !files.find(f => f.id === activeFileId)) activeFileId = null;
      if (!activeFileId && files.length) activeFileId = files[0].id;
    } catch (e) { console.warn(e); }
  }
  if (!files.length) { files = []; openTabIds = []; activeFileId = null; }
  files.forEach(f => {
    f.language = getLanguageFromName(f.name);
    if (f.dirty === undefined) f.dirty = false;
    if (f.savedContent === undefined) f.savedContent = f.content;
  });
  const wwEl = document.getElementById('wordWrapState');
  if (wwEl) {
    wwEl.textContent = wordWrap ? 'ON' : 'OFF';
    wwEl.className = wordWrap ? 'text-xs text-green-400 ml-1' : 'text-xs text-gray-400 ml-1';
  }
  if (editor) editor.setOption('lineWrapping', wordWrap);
  renderFileList();
  renderTabs();
  loadEditorContent();
  updateStatusBar();
}

// ===================== MAIN =====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing Agg Editor...');
  sidebar = document.getElementById('sidebar');
  previewPanel = document.getElementById('previewPanel');
  resizeHandle = document.getElementById('resizeHandle');

  initEditor();
  loadState();
  initResize();

  // Load saved sidebar state
  if (localStorage.getItem('sidebar_closed') === 'true') {
    sidebar.classList.add('closed');
    document.getElementById('toggleSidebarBtn').classList.add('sidebar-closed');
  }
  const previewClosed = localStorage.getItem('preview_closed') === 'true';
  if (previewClosed) {
    previewPanel.classList.add('closed');
    resizeHandle.style.display = 'none';
  }
  const savedW = localStorage.getItem('preview_width');
  if (savedW && !previewClosed) {
    const w = parseInt(savedW);
    if (w >= 260 && w <= window.innerWidth * 0.7) previewPanel.style.width = w + 'px';
  }

  // Tombol-tombol utama
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const newFileBtn = document.getElementById('newFileBtn');
  const newFileSidebarBtn = document.getElementById('newFileSidebarBtn');
  if (toggleSidebarBtn) toggleSidebarBtn.onclick = toggleSidebar;
  if (closePreviewBtn) closePreviewBtn.onclick = togglePreviewPanel;
  if (newFileBtn) newFileBtn.onclick = createNewFile;
  if (newFileSidebarBtn) newFileSidebarBtn.onclick = createNewFile;

  const wNewFile = document.getElementById('welcomeNewFile');
  const wImport = document.getElementById('welcomeImport');
  if (wNewFile) wNewFile.onclick = createNewFile;
  if (wImport) wImport.onclick = () => document.getElementById('importFileInput').click();

  updateWelcomeScreen();

  // Menu File
  const menuOpenFile = document.getElementById('menuOpenFile');
  const menuSaveToFolder = document.getElementById('menuSaveToFolder');
  const menuExportFolder = document.getElementById('menuExportFolder');
  const menuImport = document.getElementById('menuImport');
  const menuExportAll = document.getElementById('menuExportAll');
  const menuExportCurrent = document.getElementById('menuExportCurrent');
  const menuSave = document.getElementById('menuSave');
  const menuSaveAs = document.getElementById('menuSaveAs');

  if (menuOpenFile) menuOpenFile.onclick = openFileFromSystem;
  const menuOpenFolder = document.getElementById('menuOpenFolder');
  if (menuOpenFolder) menuOpenFolder.onclick = openProjectFolder;
  if (menuSaveToFolder) menuSaveToFolder.onclick = saveActiveFileToFolder;
  if (menuExportFolder) menuExportFolder.onclick = exportProjectToFolder;
  if (menuImport) menuImport.onclick = () => document.getElementById('importFileInput').click();
  if (menuExportAll) menuExportAll.onclick = exportAllAsZip;
  if (menuExportCurrent) menuExportCurrent.onclick = exportCurrentFile;
  if (menuSave) menuSave.onclick = saveCurrentFile;
  if (menuSaveAs) menuSaveAs.onclick = saveAsFile;

  // Menu Edit
  const menuFormat = document.getElementById('menuFormat');
  const menuEmmet = document.getElementById('menuEmmet');
  const menuFind = document.getElementById('menuFind');
  const menuComment = document.getElementById('menuComment');
  const menuUndo = document.getElementById('menuUndo');
  const menuRedo = document.getElementById('menuRedo');

  if (menuFormat) menuFormat.onclick = formatCurrentFile;
  if (menuEmmet) menuEmmet.onclick = () => { if (editor) { editor.focus(); tryEmmet(editor) || showToast('Tidak ada abbreviasi Emmet', 1500); } };
  if (menuFind) menuFind.onclick = openFindBar;
  if (menuComment) menuComment.onclick = () => editor && editor.execCommand('toggleComment');
  if (menuUndo) menuUndo.onclick = () => editor && editor.undo();
  if (menuRedo) menuRedo.onclick = () => editor && editor.redo();

  // Menu View
  const menuZoomIn = document.getElementById('menuZoomIn');
  const menuZoomOut = document.getElementById('menuZoomOut');
  const menuZoomReset = document.getElementById('menuZoomReset');
  const menuWordWrap = document.getElementById('menuWordWrap');
  const menuFoldAll = document.getElementById('menuFoldAll');
  const menuUnfoldAll = document.getElementById('menuUnfoldAll');

  if (menuZoomIn) menuZoomIn.onclick = zoomIn;
  if (menuZoomOut) menuZoomOut.onclick = zoomOut;
  if (menuZoomReset) menuZoomReset.onclick = zoomReset;
  if (menuWordWrap) menuWordWrap.onclick = toggleWordWrap;
  if (menuFoldAll) menuFoldAll.onclick = () => { if (editor) for (let i = 0; i < editor.lineCount(); i++) { try { editor.foldCode(CodeMirror.Pos(i, 0), null, 'fold'); } catch (e) {} } };
  if (menuUnfoldAll) menuUnfoldAll.onclick = () => { if (editor) for (let i = 0; i < editor.lineCount(); i++) { try { editor.foldCode(CodeMirror.Pos(i, 0), null, 'unfold'); } catch (e) {} } };

  // Menu Options
  const menuDarkTheme = document.getElementById('menuDarkTheme');
  const menuLightTheme = document.getElementById('menuLightTheme');
  if (menuDarkTheme) menuDarkTheme.onclick = () => setTheme('dark');
  if (menuLightTheme) menuLightTheme.onclick = () => setTheme('light');

  // Import input
  const importFileInput = document.getElementById('importFileInput');
  if (importFileInput) importFileInput.onchange = async e => { if (e.target.files.length) await importFiles(e.target.files); e.target.value = ''; };

  // Find bar buttons
  const findNextBtn = document.getElementById('findNextBtn');
  const findPrevBtn = document.getElementById('findPrevBtn');
  const replaceOneBtn = document.getElementById('replaceOneBtn');
  const replaceAllBtn = document.getElementById('replaceAllBtn');
  const closeFindBarBtn = document.getElementById('closeFindBar');
  if (findNextBtn) findNextBtn.onclick = () => doFind(1);
  if (findPrevBtn) findPrevBtn.onclick = () => doFind(-1);
  if (replaceOneBtn) replaceOneBtn.onclick = doReplaceOne;
  if (replaceAllBtn) replaceAllBtn.onclick = doReplaceAll;
  if (closeFindBarBtn) closeFindBarBtn.onclick = closeFindBarFn;

  const findInputEl = document.getElementById('findInput');
  if (findInputEl) {
    findInputEl.addEventListener('input', () => { findCursor = null; updateFindCount(findInputEl.value); });
    findInputEl.addEventListener('keydown', e => { if (e.key === 'Enter') doFind(e.shiftKey ? -1 : 1); if (e.key === 'Escape') closeFindBarFn(); });
  }

  // Rename modal
  const renameCancelBtn = document.getElementById('renameCancelBtn');
  const renameConfirmBtn = document.getElementById('renameConfirmBtn');
  const renameInput = document.getElementById('renameInput');
  if (renameCancelBtn) renameCancelBtn.onclick = () => document.getElementById('renameModal').classList.remove('show');
  if (renameConfirmBtn) {
    renameConfirmBtn.onclick = () => {
      const newName = renameInput.value.trim();
      if (!newName || !renameTargetId) return;
      const file = files.find(f => f.id === renameTargetId);
      if (!file) return;
      if (files.some(f => f.name === newName && f.id !== renameTargetId)) return showToast(`"${newName}" sudah ada`, 2000);
      file.name = newName;
      file.language = getLanguageFromName(newName);
      if (activeFileId === renameTargetId && editor) editor.setOption('mode', file.language);
      renderFileList(); renderTabs(); persistState(); updateStatusBar();
      document.getElementById('renameModal').classList.remove('show');
      showToast(`Diubah ke "${newName}"`, 2000);
    };
  }
  if (renameInput) {
    renameInput.addEventListener('keydown', e => { if (e.key === 'Enter') renameConfirmBtn.click(); if (e.key === 'Escape') renameCancelBtn.click(); });
  }

  // ===================== CODE CHANGER (Tombol toggle panel) =====================
  const ccBtn = document.getElementById('codeChangerBtn');
  if (ccBtn) {
    ccBtn.onclick = () => {
      const panel = document.getElementById('previewPanel');
      if (panel) {
        panel.classList.toggle('closed');
        localStorage.setItem('preview_closed', panel.classList.contains('closed'));
        if (!panel.classList.contains('closed')) {
          refreshFileDropdown(); // update daftar file setiap panel dibuka
        }
        if (editor) editor.refresh();
      }
    };
  }

  const ccCancelBtn = document.getElementById('ccCancelBtn');
  const ccExecuteBtn = document.getElementById('ccExecuteBtn');
  if (ccCancelBtn) {
    ccCancelBtn.addEventListener('click', () => {
      document.getElementById('ccActionAdd').checked = false;
      document.getElementById('ccActionEdit').checked = false;
      document.getElementById('ccKeyword').value = '';
      document.getElementById('ccBefore').value = '';
      document.getElementById('ccAfter').value = '';
      document.getElementById('ccKeywordContainer').classList.add('hidden');
    });
  }
  if (ccExecuteBtn) ccExecuteBtn.addEventListener('click', executeCodeChange);
  bindPositionModalEvents();

  // Modal posisi tetap ada
  const posModal = document.getElementById('ccPositionModal');
  if (posModal) posModal.querySelector('.modal-overlay')?.addEventListener('click', closePositionModal);

  const addCheckbox = document.getElementById('ccActionAdd');
  const editCheckbox = document.getElementById('ccActionEdit');
  const keywordContainer = document.getElementById('ccKeywordContainer');
  function setMutualExclusion() {
    if (addCheckbox.checked && editCheckbox.checked) {
      if (addCheckbox === document.activeElement) editCheckbox.checked = false;
      else addCheckbox.checked = false;
    }
    if (addCheckbox.checked) keywordContainer.classList.remove('hidden');
    else keywordContainer.classList.add('hidden');
  }
  if (addCheckbox) addCheckbox.addEventListener('change', setMutualExclusion);
  if (editCheckbox) editCheckbox.addEventListener('change', setMutualExclusion);

  const initialSidebarClosed = localStorage.getItem('sidebar_closed') === 'true';
  const hamburgerIcon = document.getElementById('hamburgerIcon');
  if (initialSidebarClosed) {
    hamburgerIcon.classList.remove('fa-times');
    hamburgerIcon.classList.add('fa-bars');
  } else {
    hamburgerIcon.classList.remove('fa-bars');
    hamburgerIcon.classList.add('fa-times');
  }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); toggleSidebar(); }
  });

  updateStatusBar();
  refreshFileDropdown(); // isi dropdown file di panel Code Changer

  // Peringatan browser jika tidak mendukung File System Access API
  if (!('showSaveFilePicker' in window)) {
    const toast = document.createElement('div');
    toast.id = 'browserToast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #f97316;
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border-left: 4px solid #dc2626;
      max-width: 300px;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      font-family: monospace;
    `;
    document.body.appendChild(toast);
    toast.textContent = '⚠️ Browser Anda tidak mendukung penyimpanan langsung ke file sistem. Gunakan Chrome, Edge, atau Opera untuk fitur Save otomatis. Saat ini akan menggunakan download sebagai fallback.';
    setTimeout(() => { toast.style.opacity = '1'; }, 100);
    setTimeout(() => { toast.style.opacity = '0'; }, 8000);
  }

  console.log('Agg Editor ready with Code Changer in panel.');
});