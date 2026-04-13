// ===================== EMMET =====================
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
function emmetExpand(abbr, indentStr) {
  indentStr = indentStr || '';
  if (abbr === '!')
    return `<!DOCTYPE html>\n<html lang="id">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>`;
  if (!abbr.match(/[>.+*{#\[]/)) {
    const cssExpanded = expandCssEmmet(abbr);
    if (cssExpanded) return cssExpanded;
  }
  try {
    return parseEmmetNode(abbr, indentStr);
  } catch (e) {
    return null;
  }
}
function parseEmmetNode(abbr, indent) {
  const siblings = splitTopLevel(abbr, '+');
  if (siblings.length > 1) return siblings.map((s) => parseEmmetNode(s.trim(), indent)).join('\n');
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
  if (mulMatch) {
    spec = mulMatch[1];
    count = parseInt(mulMatch[2]);
  }
  let textContent = '';
  const textMatch = spec.match(/^(.*)\{([^}]*)\}$/);
  if (textMatch) {
    spec = textMatch[1];
    textContent = textMatch[2];
  }
  const parsed = parseTagSpec(spec);
  const results = [];
  for (let i = 0; i < count; i++) {
    const txt = textContent.replace(/\$+/g, (m) => String(i + 1).padStart(m.length, '0'));
    const inner = txt || innerContent;
    results.push(buildSingleTag(parsed, inner, indent, multiline || !!innerContent));
  }
  return results.join('\n');
}
function parseTagSpec(spec) {
  let tag = 'div',
    id = '',
    classes = [];
  let remaining = spec.trim() || 'div';
  const attrs = {};
  remaining = remaining.replace(/\[([^\]]*)\]/g, (_, content) => {
    content.split(/\s+/).forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) attrs[k] = v ? v.replace(/^"|"$/g, '') : '';
    });
    return '';
  });
  const parts = remaining.split(/(?=[.#])/);
  if (parts[0] && !parts[0].startsWith('.') && !parts[0].startsWith('#')) {
    tag = parts.shift();
  }
  parts.forEach((p) => {
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
  Object.entries(attrs).forEach(([k, v]) => {
    attrStr += v !== '' ? ` ${k}="${v}"` : ` ${k}`;
  });
  if (VOID_TAGS.has(tag)) return `${indent}<${tag}${attrStr}>`;
  if (!inner) return `${indent}<${tag}${attrStr}></${tag}>`;
  if (multiline) return `${indent}<${tag}${attrStr}>\n${inner}\n${indent}</${tag}>`;
  return `${indent}<${tag}${attrStr}>${inner}</${tag}>`;
}
function splitTopLevel(str, char) {
  const result = [];
  let depth = 0,
    current = '';
  for (const ch of str) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === char && depth === 0) {
      result.push(current);
      current = '';
    } else current += ch;
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
  m: 'margin: ;',
  mt: 'margin-top: ;',
  mr: 'margin-right: ;',
  mb: 'margin-bottom: ;',
  ml: 'margin-left: ;',
  p: 'padding: ;',
  pt: 'padding-top: ;',
  pr: 'padding-right: ;',
  pb: 'padding-bottom: ;',
  pl: 'padding-left: ;',
  w: 'width: ;',
  h: 'height: ;',
  mw: 'max-width: ;',
  mh: 'max-height: ;',
  d: 'display: ;',
  df: 'display: flex;',
  dg: 'display: grid;',
  dn: 'display: none;',
  pos: 'position: ;',
  posa: 'position: absolute;',
  posr: 'position: relative;',
  posf: 'position: fixed;',
  f: 'font-size: ;',
  fw: 'font-weight: ;',
  ff: 'font-family: ;',
  c: 'color: ;',
  bg: 'background: ;',
  bgc: 'background-color: ;',
  bgi: 'background-image: url();',
  b: 'border: ;',
  br: 'border-radius: ;',
  o: 'opacity: ;',
  ov: 'overflow: ;',
  cur: 'cursor: ;',
  z: 'z-index: ;',
  jc: 'justify-content: ;',
  ai: 'align-items: ;',
  fl: 'float: ;',
  cl: 'clear: ;',
  ta: 'text-align: ;',
  td: 'text-decoration: ;',
  tt: 'text-transform: ;',
  ls: 'letter-spacing: ;',
  lh: 'line-height: ;',
  t: 'top: ;',
  r: 'right: ;',
  bot: 'bottom: ;',
  l: 'left: ;',
  tr: 'transition: ;',
  trf: 'transform: ;',
  bs: 'box-shadow: ;',
  cnt: 'content: "";',
  ga: 'grid-area: ;',
  gtc: 'grid-template-columns: ;',
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
function enableBracketColorizer() {
  if (!editor) return;
  if (bracketOverlay) editor.removeOverlay(bracketOverlay);
  bracketOverlay = {
    token(stream) {
      const ch = stream.peek();
      if ('([{'.includes(ch)) {
        stream.next();
        return 'pair-colorizer-' + ('([{'.indexOf(ch) + 1);
      }
      if (')]}'.includes(ch)) {
        stream.next();
        return 'pair-colorizer-' + (')]}'.indexOf(ch) + 1);
      }
      stream.eatWhile(/[^()[\]{}]/);
      return null;
    },
  };
  editor.addOverlay(bracketOverlay);
}

// ===================== PRETTIER FORMAT =====================
async function formatCodeWithPrettier(code, language) {
  if (typeof prettier === 'undefined') {
    showToast('Formatter belum siap', 2000, 'info');
    return code;
  }
  let parser = null;
  let plugins = [];
  if (language === 'htmlmixed') {
    parser = 'html';
    plugins = [prettierPlugins?.html];
  } else if (language === 'css') {
    parser = 'css';
    plugins = [prettierPlugins?.postcss];
  } else if (language === 'text/x-scss') {
    parser = 'scss';
    plugins = [prettierPlugins?.postcss];
  } else if (language === 'javascript') {
    parser = 'babel';
    plugins = [prettierPlugins?.babel];
  } else if (language === 'text/typescript') {
    parser = 'typescript';
    plugins = [prettierPlugins?.typescript];
  } else if (language === 'markdown') {
    parser = 'markdown';
    plugins = [prettierPlugins?.markdown];
  } else if (language === 'application/json') {
    parser = 'json';
    plugins = [prettierPlugins?.babel];
  } else {
    showToast('Format tidak tersedia untuk bahasa ini', 1800, 'info');
    return code;
  }
  if (!plugins.length || !plugins[0]) {
    showToast('Plugin formatter tidak ditemukan', 2500, 'error');
    return code;
  }
  try {
    const formatted = await prettier.format(code, {
      parser,
      plugins,
      tabWidth: 2,
      semi: true,
      singleQuote: false,
      printWidth: 80,
    });
    return typeof formatted === 'string' ? formatted : await Promise.resolve(formatted);
  } catch (e) {
    showToast('Format gagal: ' + e.message, 3000, 'error');
    return code;
  }
}

// ===================== FIND / REPLACE =====================
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
  showToast(`${n} penggantian`, n ? 2000 : 1500, 'success');
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

// ===================== CODE CHANGER =====================
function refreshFileDropdown() {
  const selects = document.querySelectorAll('#ccFileSelect');
  if (!selects.length) return;

  selects.forEach((select) => {
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Pilih file --</option>';

    // Gunakan global files dari state.js
    if (Array.isArray(window.files) || Array.isArray(files)) {
      const source = window.files || files;
      source.forEach((file) => {
        const option = document.createElement('option');
        option.value = file.id;
        option.textContent = file.name;
        select.appendChild(option);
      });
    }

    if (currentVal) select.value = currentVal;
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
  // Regex untuk spasi, tab, komentar (//, /* */, <!-- -->)
  // Menggunakan non-capturing group (?:...) agar tidak mengganggu grup lain
  const ignorable = '(?:\\s|\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|<!--[\\s\\S]*?-->)*';

  // 1. Pecah kode pencarian menjadi token (kata atau simbol tunggal)
  const tokens = searchCode.trim().match(/([a-zA-Z0-9_$]+|[^\w\s])/g);
  if (!tokens) return new RegExp(escapeRegExp(searchCode.trim()), 'g');

  // 2. Escape setiap token secara individual agar simbol seperti ( atau [ tidak dianggap bagian regex
  // 3. Gabungkan token dengan pola 'ignorable' di antaranya
  const flexible = tokens.map((t) => escapeRegExp(t)).join(ignorable);

  return new RegExp(ignorable + flexible + ignorable, 'g');
}
function findFlexiblePosition(content, searchCode) {
  const regex = makeFlexibleRegex(searchCode);
  regex.lastIndex = 0;
  const match = regex.exec(content);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}
async function executeCodeChange() {
  const fileId = document.getElementById('ccFileSelect').value;
  if (!fileId) {
    showToast("Pilih file terlebih dahulu", 2000, 'error');
    return;
  }
  const file = files.find((f) => f.id === fileId);
  if (!file) return;
  const isAdd = document.getElementById('ccActionAdd').checked;
  const isEdit = document.getElementById('ccActionEdit').checked;
  if (!isAdd && !isEdit) {
    showToast('Pilih tindakan Tambah atau Ubah', 2000, 'error');
    return;
  }
  const keyword = document.getElementById('ccKeyword').value;
  const beforeCode = document.getElementById('ccBefore').value;
  const afterCode = document.getElementById('ccAfter').value;
  let content = file.content;
  let insertIndex = -1;
  let appliedLength = afterCode.length;

  if (isEdit) {
    if (!beforeCode) {
      showToast("Kode sebelum harus diisi untuk mengubah", 2000, 'error');
      return;
    }
    const regex = makeFlexibleRegex(beforeCode);
    const match = regex.exec(content);
    if (match) {
      insertIndex = match.index;
      newContent = content.replace(regex, afterCode);
      message = `Kode berhasil diubah`;
    } else {
      showToast("Tidak ditemukan kode yang cocok", 3000, 'error');
      return;
    }
  } else if (isAdd) {
    if (!afterCode) {
      showToast("Kode sesudah harus diisi untuk menambah", 2000, 'error');
      return;
    }
    if (beforeCode.trim() === "") {
      const pos = await new Promise((resolve) => {
        showPositionModal((position) => {
          resolve(position);
          closePositionModal();
        });
      });
      if (!pos) return;
      if (pos === "awal") {
        insertIndex = 0;
        newContent = afterCode + "\n" + content;
        message = "Ditambahkan di awal";
      } else if (pos === "akhir") {
        insertIndex = content.length + 1; // +1 for newline
        newContent = content + "\n" + afterCode;
        message = "Ditambahkan di akhir";
      } else if (pos === "setelah_keyword") {
        if (!keyword) {
          showToast("Masukkan kata kunci", 2000, 'error');
          return;
        }
        const keywordPos = content.indexOf(keyword);
        let finalIdx = -1;
        if (keywordPos === -1) {
          const kwRegex = makeFlexibleRegex(keyword);
          const match = kwRegex.exec(content);
          if (!match) {
            showToast("Kata kunci tidak ditemukan", 2000, 'error');
            return;
          }
          finalIdx = match.index + match[0].length;
        } else {
          finalIdx = keywordPos + keyword.length;
        }
        insertIndex = finalIdx + 1;
        newContent = content.slice(0, finalIdx) + "\n" + afterCode + content.slice(finalIdx);
        message = `Ditambahkan setelah keyword`;
      }
    } else {
      const pos = findFlexiblePosition(content, beforeCode);
      if (pos) {
        insertIndex = pos.end + 1;
        newContent = content.slice(0, pos.end) + "\n" + afterCode + content.slice(pos.end);
        message = "Kode berhasil ditambahkan";
      } else {
        showToast("Tidak ditemukan kode sebelum yang cocok", 2000, 'error');
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

      // Highlight/Block kursor pada bagian yang berubah
      if (insertIndex !== -1) {
        const posFrom = editor.posFromIndex(insertIndex);
        const posTo = editor.posFromIndex(insertIndex + appliedLength);
        editor.setSelection(posFrom, posTo);
        editor.scrollIntoView({ from: posFrom, to: posTo }, 100);
        editor.focus();
      }
    }
    renderFileList();
    showToast(message, 3000, 'success');
  } else {
    showToast("Tidak ada perubahan", 2000, 'info');
  }
}
