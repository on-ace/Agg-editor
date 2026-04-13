// ===================== CORE EDITOR LOGIC & FILE OPERATIONS =====================

function initEditor() {
  const textarea = document.getElementById('editorTextarea');
  if (!textarea) return;
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

// --- FILE OPERATIONS ---
async function saveCurrentFile() {
  if (!activeFileId) return showToast('Tidak ada file aktif', 1500, 'info');
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
      showToast(`"${file.name}" tersimpan ke sistem`, 2000, 'success');
    } catch (err) {
      console.error(err);
      showToast(`Gagal menyimpan: ${err.message}`, 3000, 'error');
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
      showToast(`"${file.name}" disimpan`, 2000, 'success');
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Gagal: ' + err.message, 3000, 'error');
      return;
    }
  } else {
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`"${file.name}" di-download`, 2000, 'success');
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
    if (!file.dirty) { file.dirty = true; updateTabDirtyState(file.id, true); }
    persistState(); showToast('Kode diformat', 1500, 'success');
  } else { showToast('Kode sudah rapi', 1500, 'info'); }
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
      const newId = genId();
      files.push({ id: newId, name: newName, content, savedContent: content, language: getLanguageFromName(newName), dirty: false, handle: newHandle });
      openFileInTab(newId);
      persistState();
      showToast(`Disimpan sebagai "${newName}"`, 2000);
    } catch (err) { if (err.name !== 'AbortError') showToast('Gagal: ' + err.message, 3000); }
  } else {
    const newName = prompt('Simpan sebagai:', oldFile.name);
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();
    const newId = genId();
    files.push({ id: newId, name: trimmed, content, savedContent: content, language: getLanguageFromName(trimmed), dirty: false });
    openFileInTab(newId); persistState();
    showToast(`Disimpan sebagai "${trimmed}"`, 2000);
  }
}

function createNewFile() {
  let base = 'newfile', ext = '.txt', n = 1, name = base + ext;
  while (files.some(f => f.name === name)) name = `${base}${n++}${ext}`;
  const id = genId();
  files.push({ id, name, content: '', savedContent: '', language: getLanguageFromName(name), dirty: false });
  openFileInTab(id); renderFileList(); persistState();
  showToast(`File "${name}" dibuat`, 2000, 'success');
}

async function deleteFileById(id) {
  const idx = files.findIndex(f => f.id === id);
  if (idx === -1) return;
  const name = files[idx].name;
  if (!(await confirmAsync(`Hapus file "${name}"?`, 'Hapus File'))) return;
  files.splice(idx, 1);
  openTabIds = openTabIds.filter(t => t !== id);
  if (activeFileId === id) activeFileId = openTabIds[0] || null;
  if (activeFileId) loadEditorContent();
  else if (editor) { suppressDirty = true; editor.setValue(''); suppressDirty = false; editor.setOption('mode', 'text/plain'); }
  renderFileList(); renderTabs(); persistState();
  showToast(`"${name}" dihapus`, 1500, 'info'); updateStatusBar();
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
    const content = await new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsText(f, 'UTF-8'); });
    const name = f.name;
    const existing = files.find(x => x.name === name);
    if (existing) { 
      if (!(await confirmAsync(`File "${name}" sudah ada. Timpa?`))) continue; 
      const filtered = files.filter(x => x.id !== existing.id);
      files.splice(0, files.length, ...filtered);
      const filteredTabs = openTabIds.filter(t => t !== existing.id);
      openTabIds.splice(0, openTabIds.length, ...filteredTabs);
    }
    const id = genId();
    files.push({ id, name, content, savedContent: content, language: getLanguageFromName(name), dirty: false });
    openFileInTab(id); renderFileList(); persistState();
  }
  showToast('File diimpor', 2000, 'success');
}

async function exportAllAsZip() {
  if (!files.length) return;
  const zip = new JSZip(); syncEditorToFile();
  files.forEach(f => zip.file(f.name, f.content));
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'project.zip'; a.click();
  showToast('Project diekspor ke ZIP', 2000, 'success');
}

function exportCurrentFile() {
  const file = files.find(f => f.id === activeFileId);
  if (!file) return;
  syncEditorToFile();
  const blob = new Blob([file.content], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
}

async function openFileFromSystem() {
  try {
    if ('showOpenFilePicker' in window) {
      const [handle] = await window.showOpenFilePicker({ types: [{ description: 'Kode', accept: { 'text/plain': ['.js','.html','.css','.txt','.json','.py','.php','.go','.rs','.md','.ts','.jsx','.vue','.c','.cpp','.java'] } }] });
      const file = await handle.getFile(); const content = await file.text(); const name = file.name;
      const existing = files.find(f => f.name === name);
      if (existing) { existing.content = content; existing.savedContent = content; existing.dirty = false; existing.handle = handle; if (activeFileId === existing.id) { suppressDirty = true; editor.setValue(content); suppressDirty = false; } }
      else { const id = genId(); files.push({ id, name, content, savedContent: content, language: getLanguageFromName(name), dirty: false, handle }); openFileInTab(id); }
      showToast(`"${name}" dibuka`, 2000, 'success');
    } else { /* Fallback used by <input type="file"> logic from old app.js if needed */ }
  } catch(e) { if (e.name !== 'AbortError') showToast('Error: ' + e.message, 3000); }
}

async function openProjectFolder() {
  if ("showDirectoryPicker" in window) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const supported = new Set(["html","htm","css","js","jsx","ts","tsx","json","md","py","php","sql","sh","go","rs","yaml","toml","vue","c","cpp","txt"]);
      let count = 0;
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind !== "file") continue;
        const ext = name.split(".").pop().toLowerCase(); if (!supported.has(ext)) continue;
        const fileHandle = handle; const file = await fileHandle.getFile(); const content = await file.text();
        const existing = files.find(f => f.name === name);
        if (existing) { existing.content = content; existing.savedContent = content; existing.handle = fileHandle; }
        else { files.push({ id: genId(), name, content, savedContent: content, language: getLanguageFromName(name), dirty: false, handle: fileHandle }); count++; }
      }
      renderFileList(); persistState(); if (!activeFileId && files.length) openFileInTab(files[0].id);
      showToast(count ? count + " file dimuat" : "Tidak ada file baru", 2500);
    } catch(e) { if (e.name !== "AbortError") console.error(e); }
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
    } catch (err) { console.warn('Gagal pakai handle asli, fallback', err); }
  }
  try {
    if ('showSaveFilePicker' in window) {
      const newHandle = await window.showSaveFilePicker({ suggestedName: file.name, types: [{ description: 'File Kode', accept: { 'text/plain': ['.' + file.name.split('.').pop()] } }] });
      const writable = await newHandle.createWritable();
      await writable.write(file.content);
      await writable.close();
      file.handle = newHandle;
      showToast(`"${file.name}" disimpan ke folder pilihan`, 2000);
    } else {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    }
  } catch (err) { if (err.name !== 'AbortError') showToast('Gagal menyimpan: ' + err.message, 3000); }
}

async function exportProjectToFolder() {
  if (!files.length) return showToast('Tidak ada file untuk diekspor', 1500);
  syncEditorToFile();
  try {
    if ('showDirectoryPicker' in window) {
      const dirHandle = await window.showDirectoryPicker();
      for (const file of files) {
        try {
          const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(file.content);
          await writable.close();
        } catch(e) { console.error(`Gagal ekspor ${file.name}`, e); }
      }
      showToast(`Proyek diekspor ke folder ${dirHandle.name}`, 3000);
    } else {
      showToast('Browser tidak mendukung ekspor folder. Gunakan ZIP.', 3000);
      exportAllAsZip();
    }
  } catch (err) { if (err.name !== 'AbortError') showToast('Gagal ekspor: ' + err.message, 3000); }
}

function setActiveFile(id) { syncEditorToFile(); activeFileId = id; findCursor = null; renderFileList(); renderTabs(); loadEditorContent(); persistState(); updateStatusBar(); }
function openFileInTab(id) { if (!openTabIds.includes(id)) openTabIds.push(id); setActiveFile(id); }
async function closeTabWithConfirm(id) {
  const f = files.find(x => x.id === id); if (!f) return;
  if (f.dirty) { if (!(await confirmAsync(`"${f.name}" belum disimpan. Tutup?`))) return; f.content = f.savedContent; f.dirty = false; }
  closeTab(id, true);
}
function closeTab(id, skipSync = false) {
  if (!skipSync && activeFileId === id) syncEditorToFile();
  const idx = openTabIds.indexOf(id); if (idx !== -1) openTabIds.splice(idx, 1);
  if (activeFileId === id) activeFileId = openTabIds[Math.max(0, idx - 1)] || openTabIds[0] || null;
  renderTabs(); renderFileList(); loadEditorContent(); persistState(); updateStatusBar();
}

function setZoom(pct) { currentZoom = Math.max(50, Math.min(200, pct)); if (editor) { editor.getWrapperElement().style.fontSize = (currentZoom / 100 * 14) + 'px'; editor.refresh(); } updateStatusBar(); persistState(); }
function zoomIn() { setZoom(currentZoom + 10); }
function zoomOut() { setZoom(currentZoom - 10); }
function zoomReset() { setZoom(100); }
function setTheme(t) { if (t === 'light') { document.body.classList.add('light-theme'); if (editor) editor.setOption('theme', 'default'); } else { document.body.classList.remove('light-theme'); if (editor) editor.setOption('theme', 'monokai'); } if (editor) editor.refresh(); persistState(); }
function toggleWordWrap() { wordWrap = !wordWrap; if (editor) editor.setOption('lineWrapping', wordWrap); const el = document.getElementById('wordWrapState'); if (el) { el.textContent = wordWrap ? 'ON' : 'OFF'; el.className = wordWrap ? 'text-xs text-green-400 ml-1' : 'text-xs text-gray-400 ml-1'; } persistState(); }

// --- DOM INIT ---
document.addEventListener('DOMContentLoaded', () => {
  sidebar = document.getElementById('sidebar');
  previewPanel = document.getElementById('previewPanel');
  resizeHandle = document.getElementById('resizeHandle');

  initEditor();
  loadState();
  initResize();

  // Load saved sidebar state
  if (localStorage.getItem('sidebar_closed') === 'true') {
    sidebar?.classList.add('closed');
    document.getElementById('toggleSidebarBtn')?.classList.add('sidebar-closed');
  }
  const previewClosed = localStorage.getItem('preview_closed') === 'true';
  if (previewClosed) {
    previewPanel?.classList.add('closed');
    if (resizeHandle) resizeHandle.style.display = 'none';
  }
  const savedW = localStorage.getItem('preview_width');
  if (savedW && !previewClosed && previewPanel) {
    const w = parseInt(savedW);
    if (w >= 260 && w <= window.innerWidth * 0.7) previewPanel.style.width = w + 'px';
  }

  // Helper to bind click
  const bindClick = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };

  bindClick('toggleSidebarBtn', toggleSidebar);
  bindClick('closePreviewBtn', togglePreviewPanel);
  bindClick('newFileBtn', createNewFile);
  bindClick('newFileSidebarBtn', createNewFile);
  bindClick('welcomeNewFile', createNewFile);
  bindClick('welcomeImport', () => document.getElementById('importFileInput')?.click());

  // Menu File
  bindClick('menuOpenFile', openFileFromSystem);
  bindClick('menuOpenFolder', openProjectFolder);
  bindClick('menuSaveToFolder', saveActiveFileToFolder);
  bindClick('menuExportFolder', exportProjectToFolder);
  bindClick('menuImport', () => document.getElementById('importFileInput')?.click());
  bindClick('menuExportAll', exportAllAsZip);
  bindClick('menuExportCurrent', exportCurrentFile);
  bindClick('menuSave', saveCurrentFile);
  bindClick('menuSaveAs', saveAsFile);

  // Menu Edit
  bindClick('menuFormat', formatCurrentFile);
  bindClick('menuEmmet', () => { if (editor) { editor.focus(); tryEmmet(editor); } });
  bindClick('menuFind', openFindBar);
  bindClick('menuComment', () => editor && editor.execCommand('toggleComment'));
  bindClick('menuUndo', () => editor && editor.undo());
  bindClick('menuRedo', () => editor && editor.redo());

  // Menu View
  bindClick('menuZoomIn', zoomIn);
  bindClick('menuZoomOut', zoomOut);
  bindClick('menuZoomReset', zoomReset);
  bindClick('menuWordWrap', toggleWordWrap);
  bindClick('menuDarkTheme', () => setTheme('dark'));
  bindClick('menuLightTheme', () => setTheme('light'));

  // Import
  const importInput = document.getElementById('importFileInput');
  if (importInput) {
    importInput.onchange = async e => {
      if (e.target.files.length) await importFiles(e.target.files);
      e.target.value = '';
    };
  }

  // Find Bar
  bindClick('findNextBtn', () => doFind(1));
  bindClick('findPrevBtn', () => doFind(-1));
  bindClick('replaceOneBtn', doReplaceOne);
  bindClick('replaceAllBtn', doReplaceAll);
  bindClick('closeFindBar', closeFindBarFn);

  const fIn = document.getElementById('findInput');
  if (fIn) {
    fIn.addEventListener('input', () => { findCursor = null; updateFindCount(fIn.value); });
    fIn.addEventListener('keydown', e => { if (e.key === 'Enter') doFind(e.shiftKey ? -1 : 1); });
  }

  // Rename
  bindClick('renameCancelBtn', () => document.getElementById('renameModal')?.classList.remove('show'));
  bindClick('renameConfirmBtn', () => {
    const input = document.getElementById('renameInput');
    const newName = input?.value.trim();
    if (!newName || !renameTargetId) return;
    const f = files.find(x => x.id === renameTargetId);
    if (!f) return;
    f.name = newName;
    f.language = getLanguageFromName(newName);
    if (activeFileId === renameTargetId && editor) editor.setOption('mode', f.language);
    renderFileList();
    renderTabs();
    persistState();
    document.getElementById('renameModal')?.classList.remove('show');
    showToast(`Diubah ke "${newName}"`, 2000, 'success');
  });

  // Code Changer
  bindClick('codeChangerBtn', () => {
    if (!previewPanel) return;
    previewPanel.classList.toggle('closed');
    localStorage.setItem('preview_closed', previewPanel.classList.contains('closed'));
    if (!previewPanel.classList.contains('closed')) refreshFileDropdown();
    if (editor) editor.refresh();
  });

  bindClick('ccCancelBtn', () => {
    ['ccKeyword', 'ccBefore', 'ccAfter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  });
  bindClick('ccExecuteBtn', executeCodeChange);

  // CC Position
  bindClick('ccPosAwal', () => { if (ccPendingCallback) ccPendingCallback('awal'); });
  bindClick('ccPosAkhir', () => { if (ccPendingCallback) ccPendingCallback('akhir'); });
  bindClick('ccPosSetelahKeyword', () => { if (ccPendingCallback) ccPendingCallback('setelah_keyword'); });
  bindClick('ccPosCancelBtn', () => { if (ccPendingCallback) ccPendingCallback(null); closePositionModal(); });

  // CC Action Mutual Exclusion
  const addCb = document.getElementById('ccActionAdd');
  const editCb = document.getElementById('ccActionEdit');
  const kwCont = document.getElementById('ccKeywordContainer');

  const updateCCUI = () => {
    if (addCb?.checked) kwCont?.classList.remove('hidden');
    else kwCont?.classList.add('hidden');
  };

  if (addCb) addCb.onchange = () => { if (addCb.checked && editCb) editCb.checked = false; updateCCUI(); };
  if (editCb) editCb.onchange = () => { if (editCb.checked && addCb) addCb.checked = false; updateCCUI(); };

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); toggleSidebar(); }
  });

  updateStatusBar();
});