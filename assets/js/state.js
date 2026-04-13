var files = [];
var activeFileId = null;
var openTabIds = [];
var editor = null;
var currentZoom = 100;
var wordWrap = true;
var renameTargetId = null;
var findCursor = null;
var suppressDirty = false;
var sidebar, previewPanel, resizeHandle;
var isResizing = false;
var startX, startWidth;
var draggedTabIndex = null;
var ccPendingCallback = null;
var bracketOverlay = null;

// Ekspor ke window untuk kepastian akses antar file
window.files = files;
window.activeFileId = activeFileId;
window.openTabIds = openTabIds;

function persistState() {
  try {
    localStorage.setItem('editor_state', JSON.stringify({ files, openTabIds, activeFileId, wordWrap, currentZoom }));
    localStorage.setItem('editor_theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
  } catch (e) { console.warn(e); }
}

function loadState() {
  const saved = localStorage.getItem('editor_state');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      if (Array.isArray(state.files)) files.splice(0, files.length, ...state.files);
      if (Array.isArray(state.openTabIds)) openTabIds.splice(0, openTabIds.length, ...state.openTabIds);
      
      activeFileId = state.activeFileId || null;
      wordWrap = state.wordWrap !== undefined ? state.wordWrap : true;
      currentZoom = state.currentZoom || 100;
      
      const filteredTabs = openTabIds.filter(id => files.some(f => f.id === id));
      openTabIds.splice(0, openTabIds.length, ...filteredTabs);
      
      if (activeFileId && !files.find(f => f.id === activeFileId)) activeFileId = null;
      if (!activeFileId && files.length) activeFileId = files[0].id;
    } catch (e) { console.warn(e); }
  }
  if (!files.length) { 
    files.splice(0, files.length); 
    openTabIds.splice(0, openTabIds.length); 
    activeFileId = null; 
  }
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

function syncEditorToFile() {
  if (activeFileId && editor) {
    const file = files.find(f => f.id === activeFileId);
    if (file) file.content = editor.getValue();
  }
}
