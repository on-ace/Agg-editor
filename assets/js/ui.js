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
  if (typeof refreshFileDropdown === 'function') refreshFileDropdown();
}

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

function toggleSidebar() {
  if (!sidebar) sidebar = document.getElementById('sidebar');
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
  if (!previewPanel) previewPanel = document.getElementById('previewPanel');
  if (!resizeHandle) resizeHandle = document.getElementById('resizeHandle');
  previewPanel.classList.toggle('closed');
  const isClosed = previewPanel.classList.contains('closed');
  resizeHandle.style.display = isClosed ? 'none' : '';
  localStorage.setItem('preview_closed', isClosed);
  setTimeout(() => editor && editor.refresh(), 300);
}

function initResize() {
  if (!previewPanel) previewPanel = document.getElementById('previewPanel');
  if (!resizeHandle) resizeHandle = document.getElementById('resizeHandle');
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

function openFindBar() {
  document.getElementById('findBar').classList.add('show');
  document.getElementById('findInput').focus();
}

function closeFindBarFn() {
  document.getElementById('findBar').classList.remove('show');
  findCursor = null;
  if (editor) editor.focus();
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
