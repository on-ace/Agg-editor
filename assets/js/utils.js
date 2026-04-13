function showToast(message, duration = 3000, type = 'info') {
  const toast = document.getElementById('toastMsg');
  if (!toast) return;
  toast.innerText = message;
  toast.className = ''; // Reset classes
  toast.classList.add('show');
  if (type) toast.classList.add(type);
  
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { 
    toast.classList.remove('show'); 
  }, duration);
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
