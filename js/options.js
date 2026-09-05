document.addEventListener('DOMContentLoaded', function () {

  // SELECTORS / CLASS NAMES
  const container = '.appContainer';
  const btnAddProject = '.btnAddProject';
  const btnSave = '.saveData';
  const btnAddURL = 'addURL';
  const btnRemoveProject = 'btnRemeveProject';
  const btnRemoveUrlRow = 'btnRemoveUrlRow';
  const projectWrap = 'projectWrap';
  const URL_PLACEHOLDER = 'ex) https://yourprojectdomain/';
  const LABEL_PLACEHOLDER = 'ex) prod env';
  const PROJECT_PLACEHOLDER = 'ex) PROJECT-001';
  const DRAG_TO_REORDER = 'Drag to reorder';
  const placeholderURL = `placeholder="${URL_PLACEHOLDER}"`;
  const placeholderProject = `placeholder="${PROJECT_PLACEHOLDER}"`;
  const placeholderLabel = `placeholder="${LABEL_PLACEHOLDER}"`;

  // small DOM helpers
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const markChanged = () => { const sd = qs(btnSave); if (sd) sd.classList.add('changed'); };

  // becomes true only after the initial load + render settles, so saves
  // can never run against an empty (not-yet-populated) form
  let isReady = false;

  const projectDom = `
  <div class="${projectWrap}" draggable="true">
    <dl>
      <dt>
        <span class="dragHandle" title="${DRAG_TO_REORDER}"><svg class="icon"><use href="#icon-grip-vertical"></use></svg></span>
        <span>Project Name : </span><input ${placeholderProject} type="text" value="" data-proname="projectName1" />
        <span class="${btnRemoveProject}"><button><svg class="icon"><use href="#icon-circle-xmark"></use></svg> __MSG_option_message_07__</button></span>
      </dt>
      <dd>
        <div class="urlRow">
          <span class="urlDragHandle" title="${DRAG_TO_REORDER}"><svg class="icon"><use href="#icon-grip-vertical"></use></svg></span>
          <input ${placeholderURL} type="text" class="urlInput" value="" data-envname="url1" />
          <input ${placeholderLabel} type="text" class="urlLabelInput" value="">
          <input type="color" class="urlColorPicker" value="#808080">
          <button type="button" class="${btnRemoveUrlRow}" title="__MSG_option_remove_url_row__"><svg class="icon"><use href="#icon-xmark"></use></svg></button>
        </div>
      </dd>
    </dl>
    <button class="${btnAddURL}"><svg class="icon"><use href="#icon-circle-plus"></use></svg> __MSG_option_message_08__</button>
  </div>
  `;

  function htmlDecode(text) {
    const el = document.createElement('textarea');
    el.innerHTML = text;
    return el.value;
  }

  // Mirror a URL row's color picker onto its own --node-color, so the
  // rail's node dot (drawn via box-shadow on the row's inputs) matches.
  const syncNodeColor = function (colorInput) {
    const row = colorInput.closest('.urlRow');
    if (row) row.style.setProperty('--node-color', colorInput.value);
  };

  // INIT APP — render saved data into the form
  const init = function (jsonData) {
    let obj;
    try {
      obj = JSON.parse(JSON.stringify(jsonData));
    } catch (e) {
      console.log(e);
      return;
    }
    Object.keys(obj).forEach(function (topKey) {
      const list = obj[topKey];
      if (!Array.isArray(list)) return;
      list.forEach(function (item, index) {

        if (item && typeof item === 'object' && item.name) {
          const rawName = htmlDecode(item.name);

          const dt = document.createElement('dt');
          const handle = document.createElement('span');
          handle.className = 'dragHandle';
          handle.title = DRAG_TO_REORDER;
          handle.innerHTML = '<svg class="icon"><use href="#icon-grip-vertical"></use></svg>';
          dt.appendChild(handle);
          const label = document.createElement('span');
          label.textContent = 'Project Name : ';
          dt.appendChild(label);

          const nameInput = document.createElement('input');
          nameInput.type = 'text';
          nameInput.placeholder = PROJECT_PLACEHOLDER;
          nameInput.setAttribute('data-proname', `projectName${index + 1}`);
          nameInput.value = rawName;
          dt.appendChild(nameInput);

          const removeWrap = document.createElement('span');
          removeWrap.className = btnRemoveProject;
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '<svg class="icon"><use href="#icon-circle-xmark"></use></svg> ';
          removeBtn.appendChild(document.createTextNode(chrome.i18n.getMessage('option_message_07')));
          removeWrap.appendChild(removeBtn);
          dt.appendChild(removeWrap);

          const dd = document.createElement('dd');
          const dl = document.createElement('dl');
          dl.appendChild(dt);
          dl.appendChild(dd);

          const addURLBtn = document.createElement('button');
          addURLBtn.className = btnAddURL;
          addURLBtn.innerHTML = '<svg class="icon"><use href="#icon-circle-plus"></use></svg> ';
          addURLBtn.appendChild(document.createTextNode(chrome.i18n.getMessage('option_message_08')));

          const block = document.createElement('div');
          block.className = projectWrap;
          block.draggable = true;
          block.appendChild(dl);
          block.appendChild(addURLBtn);
          qs(container).appendChild(block);

          for (const i in item.url) {
            if (item.url[i]) {
              const urlRow = document.createElement('div');
              urlRow.className = 'urlRow';
              const urlDragHandle = document.createElement('span');
              urlDragHandle.className = 'urlDragHandle';
              urlDragHandle.title = DRAG_TO_REORDER;
              urlDragHandle.innerHTML = '<svg class="icon"><use href="#icon-grip-vertical"></use></svg>';
              const urlInput = document.createElement('input');
              urlInput.type = 'text';
              urlInput.className = 'urlInput';
              urlInput.placeholder = URL_PLACEHOLDER;
              urlInput.value = htmlDecode(item.url[i]);
              const labelInput = document.createElement('input');
              labelInput.type = 'text';
              labelInput.className = 'urlLabelInput';
              labelInput.placeholder = LABEL_PLACEHOLDER;
              labelInput.value = (item.labels && item.labels[i]) ? htmlDecode(item.labels[i]) : '';
              const colorInput = document.createElement('input');
              colorInput.type = 'color';
              colorInput.className = 'urlColorPicker';
              colorInput.value = (item.colors && item.colors[i]) ? item.colors[i] : '#808080';
              const removeUrlBtn = document.createElement('button');
              removeUrlBtn.type = 'button';
              removeUrlBtn.className = btnRemoveUrlRow;
              removeUrlBtn.title = chrome.i18n.getMessage('option_remove_url_row') || 'Remove this document root';
              removeUrlBtn.innerHTML = '<svg class="icon"><use href="#icon-xmark"></use></svg>';
              urlRow.appendChild(urlDragHandle);
              urlRow.appendChild(urlInput);
              urlRow.appendChild(labelInput);
              urlRow.appendChild(colorInput);
              urlRow.appendChild(removeUrlBtn);
              dd.appendChild(urlRow);
              syncNodeColor(colorInput);
            }
          }
        } else if (item && typeof item === 'object' && item.sametab === true) {
          const cb = qs('#sametab');
          if (cb) cb.checked = true;
        }
      });
    });
  };

  // ADD URL INPUT AREA
  const insertInputURLArea = function (btnEl) {
    const wrap = btnEl.closest('.' + projectWrap);
    if (!wrap) return;
    const dd = wrap.querySelector('dd');
    const areaNumber = wrap.querySelectorAll('dd .urlInput').length + 1;
    const urlRow = document.createElement('div');
    urlRow.className = 'urlRow';
    const urlDragHandle = document.createElement('span');
    urlDragHandle.className = 'urlDragHandle';
    urlDragHandle.title = DRAG_TO_REORDER;
    urlDragHandle.innerHTML = '<svg class="icon"><use href="#icon-grip-vertical"></use></svg>';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'urlInput';
    input.placeholder = URL_PLACEHOLDER;
    input.value = '';
    input.setAttribute('data-envname', `url${areaNumber}`);
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'urlLabelInput';
    labelInput.placeholder = LABEL_PLACEHOLDER;
    labelInput.value = '';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'urlColorPicker';
    colorInput.value = '#808080';
    const removeUrlBtn = document.createElement('button');
    removeUrlBtn.type = 'button';
    removeUrlBtn.className = btnRemoveUrlRow;
    removeUrlBtn.title = chrome.i18n.getMessage('option_remove_url_row') || 'Remove this document root';
    removeUrlBtn.innerHTML = '<svg class="icon"><use href="#icon-xmark"></use></svg>';
    urlRow.appendChild(urlDragHandle);
    urlRow.appendChild(input);
    urlRow.appendChild(labelInput);
    urlRow.appendChild(colorInput);
    urlRow.appendChild(removeUrlBtn);
    dd.appendChild(urlRow);
    syncNodeColor(colorInput);
    setupUrlRowDragReorder(urlRow);
  };

  // CONVERT FORM -> JSON
  const convertJSON = function () {
    const sametabEl = qs('#sametab');
    const isSametab = !!(sametabEl && sametabEl.checked);
    const userJSON = [];
    qsa('.' + projectWrap).forEach(function (wrap) {
      const nameEl = wrap.querySelector('dt input');
      const pName = escapeHtml(nameEl ? nameEl.value : '');
      const uName = [];
      const uColors = [];
      const uLabels = [];
      wrap.querySelectorAll('dd .urlRow').forEach(function (row) {
        const urlInp = row.querySelector('.urlInput');
        const labelInp = row.querySelector('.urlLabelInput');
        const colorInp = row.querySelector('.urlColorPicker');
        const inputValue = urlInp ? escapeHtml(urlInp.value) : '';
        if (inputValue) {
          uName.push(inputValue);
          uColors.push(colorInp ? colorInp.value : '#808080');
          uLabels.push(labelInp ? escapeHtml(labelInp.value) : '');
        }
      });
      userJSON.push({ "name": pName, "url": uName, "colors": uColors, "labels": uLabels });
    });
    userJSON.push({ "sametab": isSametab });
    return userJSON;
  };

  // SAVE (local or sync depending on toggle)
  const getUseSync = function () { const el = qs('#useSync'); return !!(el && el.checked); };
  const saveCurrent = function () {
    if (!isReady) return Promise.resolve();
    return TheSwitcherStore.save(convertJSON(), getUseSync());
  };

  // Build a JSON config object for export (based on SAVED data, not the form)
  const buildExport = async function () {
    const res = await TheSwitcherStore.load();
    return {
      app: 'The Switcher',
      type: 'theswitcher-config',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: Array.isArray(res.data) ? res.data : []
    };
  };

  // Normalize an imported object into the internal array form
  const normalizeImport = function (parsed) {
    let arr = null;
    if (Array.isArray(parsed)) arr = parsed;
    else if (parsed && Array.isArray(parsed.data)) arr = parsed.data;
    if (!arr) return null;
    const out = [];
    let sametab = false;
    arr.forEach(function (item) {
      if (item && typeof item === 'object') {
        if (Array.isArray(item.url)) {
          const urls = item.url.filter(function (u) { return typeof u === 'string'; });
          const colors = Array.isArray(item.colors)
            ? item.colors.map(function (c) { return (typeof c === 'string' && c) ? c : '#808080'; })
            : urls.map(function () { return '#808080'; });
          const labels = Array.isArray(item.labels)
            ? item.labels.map(function (l) { return typeof l === 'string' ? l : ''; })
            : urls.map(function () { return ''; });
          out.push({ name: typeof item.name === 'string' ? item.name : '', url: urls, colors: colors, labels: labels });
        } else if (typeof item.sametab === 'boolean') {
          sametab = item.sametab;
        }
      }
    });
    if (out.length === 0) return null;
    out.push({ sametab: sametab });
    return out;
  };

  // jQuery-free slideToggle (height animation)
  const slideToggle = function (el, duration = 200) {
    const hidden = getComputedStyle(el).display === 'none';
    el.style.overflow = 'hidden';
    el.style.transition = `height ${duration}ms ease`;
    if (hidden) {
      el.style.display = 'block';
      const target = el.scrollHeight;
      el.style.height = '0px';
      requestAnimationFrame(() => { el.style.height = target + 'px'; });
      el.addEventListener('transitionend', function done() {
        el.style.height = '';
        el.style.overflow = '';
        el.style.transition = '';
        el.removeEventListener('transitionend', done);
      });
    } else {
      el.style.height = el.scrollHeight + 'px';
      requestAnimationFrame(() => { el.style.height = '0px'; });
      el.addEventListener('transitionend', function done() {
        el.style.display = 'none';
        el.style.height = '';
        el.style.overflow = '';
        el.style.transition = '';
        el.removeEventListener('transitionend', done);
      });
    }
  };

  // SAVE handler
  const handleSave = function (btnEl) {
    if (!isReady) return;
    let hasError = false;
    qsa('input[type="text"]').forEach(function (inp) {
      if (inp.value.indexOf('"') > -1) {
        inp.classList.add('error');
        hasError = true;
      } else {
        inp.classList.remove('error');
      }
    });
    if (hasError) {
      alert('Sorry " is not available.');
      return;
    }
    if (!TheSwitcherStore.hasProjects(convertJSON())) {
      if (!confirm(chrome.i18n.getMessage('option_empty_save_confirm') || 'There are no projects. Saving now overwrites your settings with empty data. Continue?')) {
        return;
      }
    }
    saveCurrent().then(function () {
      btnEl.classList.remove('changed');
    }).catch(function (err) {
      console.log(err);
      alert(chrome.i18n.getMessage('option_save_error') || 'Failed to save settings.');
    });
  };

  // EXPORT handler (saved data based)
  const handleExport = async function () {
    const sd = qs(btnSave);
    if (sd && sd.classList.contains('changed')) {
      if (!confirm(chrome.i18n.getMessage('option_export_unsaved') || 'There are unsaved changes. Export the last saved settings? (Unsaved edits will not be included.)')) {
        return;
      }
    }
    const payload = await buildExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const d = new Date();
    const stamp = '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'the-switcher-config-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // COPY EXPORT JSON TO CLIPBOARD
  const copyText = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (e2) {
        console.log(e2);
        return false;
      }
    }
  };

  const flashBtn = function (btn, label) {
    if (!btn) return;
    const origHTML = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = '<svg class="icon"><use href="#icon-check"></use></svg> ' + escapeHtml(label);
    setTimeout(function () {
      btn.classList.remove('copied');
      btn.innerHTML = origHTML;
    }, 1400);
  };

  const handleExportCopy = async function (btnEl) {
    const sd = qs(btnSave);
    if (sd && sd.classList.contains('changed')) {
      if (!confirm(chrome.i18n.getMessage('option_export_unsaved') || 'There are unsaved changes. Copy the last saved settings? (Unsaved edits will not be included.)')) {
        return;
      }
    }
    const payload = await buildExport();
    const ok = await copyText(JSON.stringify(payload, null, 2));
    if (ok) {
      flashBtn(btnEl, chrome.i18n.getMessage('option_export_copied') || 'Copied!');
    } else {
      alert(chrome.i18n.getMessage('option_export_copy_failed') || 'Failed to copy to clipboard.');
    }
  };

  // RESTORE FROM BACKUP
  const handleRestore = async function () {
    const backup = await TheSwitcherStore.loadBackup();
    if (!backup || !TheSwitcherStore.hasProjects(backup.data)) {
      alert(chrome.i18n.getMessage('option_restore_none') || 'No backup is available yet.');
      return;
    }
    const when = backup.savedAt ? new Date(backup.savedAt).toLocaleString() : '';
    let msg = chrome.i18n.getMessage('option_restore_confirm') || 'Restore settings from backup? Your current settings will be overwritten.';
    if (when) msg += '\n(' + when + ')';
    if (!confirm(msg)) return;
    qs(container).replaceChildren();
    const st = qs('#sametab');
    if (st) st.checked = false;
    init({ theswitcher: backup.data });
    attachDragHandlersToAll();
    applyProjectFilter();
    saveCurrent().then(function () {
      const sd = qs(btnSave);
      if (sd) sd.classList.remove('changed');
      alert(chrome.i18n.getMessage('option_restore_done') || 'Settings restored from backup.');
    }).catch(function (err) {
      console.log(err);
      alert(chrome.i18n.getMessage('option_save_error') || 'Failed to save settings.');
    });
  };

  // ── DRAG-TO-REORDER PROJECTS ─────────────────────────
  let dragSrcEl = null;
  const setupDragReorder = function (wrap) {
    wrap.addEventListener('dragstart', function (e) {
      dragSrcEl = wrap;
      wrap.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', ''); } catch (err) { /* some browsers require this */ }
    });
    wrap.addEventListener('dragend', function () {
      wrap.classList.remove('dragging');
      qsa('.' + projectWrap).forEach(function (w) { w.classList.remove('dragOver'); });
      dragSrcEl = null;
    });
    wrap.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (dragSrcEl && dragSrcEl !== wrap) wrap.classList.add('dragOver');
    });
    wrap.addEventListener('dragleave', function () {
      wrap.classList.remove('dragOver');
    });
    wrap.addEventListener('drop', function (e) {
      e.preventDefault();
      wrap.classList.remove('dragOver');
      if (!dragSrcEl || dragSrcEl === wrap) return;
      const c = qs(container);
      const rect = wrap.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      c.insertBefore(dragSrcEl, before ? wrap : wrap.nextElementSibling);
      markChanged();
    });
  };
  // Attach drag handlers to every current project block (call after any (re)render)
  const attachDragHandlersToAll = function () {
    qsa('.' + projectWrap).forEach(function (wrap) {
      if (wrap.dataset.dragWired) return;
      wrap.dataset.dragWired = '1';
      setupDragReorder(wrap);
    });
    attachUrlRowDragHandlersToAll();
  };

  // ── DRAG-TO-REORDER URL ROWS (within a single project) ──
  // The row is moved live as the pointer passes over other rows during
  // dragover, rather than computed once at drop time — this avoids any
  // stale-rect / boundary-condition mismatch between where the row visibly
  // lands and where it's actually inserted.
  let urlRowDragSrcEl = null;
  const setupUrlRowDragReorder = function (row) {
    if (row.dataset.dragWired) return;
    row.dataset.dragWired = '1';

    const handle = row.querySelector('.urlDragHandle');
    if (!handle) return;

    // Only start a drag when the pointer went down on the handle —
    // the row itself holds text inputs and a color picker that must
    // stay normally interactive.
    handle.addEventListener('mousedown', function () {
      row.draggable = true;
    });
    row.addEventListener('mouseup', function () {
      row.draggable = false;
    });

    row.addEventListener('dragstart', function (e) {
      urlRowDragSrcEl = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', ''); } catch (err) { /* some browsers require this */ }
    });
    row.addEventListener('dragend', function () {
      row.classList.remove('dragging');
      row.draggable = false;
      const dd = row.closest('dd');
      if (dd) qsa('.urlRow', dd).forEach(function (r) { r.classList.remove('dragOver'); });
      urlRowDragSrcEl = null;
      // The DOM order is already final at this point (updated live during
      // dragover) — persist it now that the drag gesture is complete.
      saveCurrent().then(function () {
        const sd = qs(btnSave);
        if (sd) sd.classList.remove('changed');
      }).catch(function (err) { console.log(err); });
    });
    row.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (!urlRowDragSrcEl || urlRowDragSrcEl === row) return;
      const dd = row.closest('dd');
      // Only reorder within the same project's own URL list.
      if (!dd || urlRowDragSrcEl.closest('dd') !== dd) return;
      const rect = row.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      const target = before ? row : row.nextElementSibling;
      // No-op guard: skip the DOM write entirely when the row is already
      // in the requested position, to avoid redundant reflows/flicker.
      if (target === urlRowDragSrcEl) return;
      if (urlRowDragSrcEl.nextElementSibling === target) return;
      dd.insertBefore(urlRowDragSrcEl, target);
    });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      // Actual reordering already happened live during dragover;
      // dragend handles the save. Nothing left to do here.
    });
  };
  // Attach drag handlers to every current URL row (call after any (re)render)
  const attachUrlRowDragHandlersToAll = function () {
    qsa('.urlRow').forEach(function (row) {
      setupUrlRowDragReorder(row);
    });
  };

  // ── PROJECT FILTER (search) ──────────────────────────
  const applyProjectFilter = function () {
    const input = qs('#projectFilter');
    const counter = qs('#filterCount');
    const q = input ? input.value.trim().toLowerCase() : '';
    const wraps = qsa('.' + projectWrap);
    let visible = 0;
    wraps.forEach(function (wrap) {
      if (!q) { wrap.style.display = ''; visible++; return; }
      const nameEl = wrap.querySelector('dt input');
      const name = nameEl ? nameEl.value.toLowerCase() : '';
      const urls = Array.from(wrap.querySelectorAll('dd input[type="text"]')).map(function (i) { return i.value.toLowerCase(); });
      const match = name.includes(q) || urls.some(function (u) { return u.includes(q); });
      wrap.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    if (counter) {
      counter.textContent = q ? (visible + ' / ' + wraps.length) : '';
    }
  };

  // Localize static HTML before user data is rendered
  localizeHtmlPage();

  // Lock saving until the initial load + render has settled
  (function () { const sb = qs(btnSave); if (sb) sb.disabled = true; })();

  // WHEN OPEN THIS PAGE
  TheSwitcherStore.load().then(function (res) {
    init({ theswitcher: res.data || [] });
    const useEl = qs('#useSync');
    if (useEl) useEl.checked = !!res.syncEnabled;
    attachDragHandlersToAll();
  }).catch(function (err) {
    console.log(err);
  }).finally(function () {
    isReady = true;
    const sb = qs(btnSave);
    if (sb) sb.disabled = false;
  });

  // CLICK (delegated)
  document.addEventListener('click', function (e) {
    if (e.target.closest(btnAddProject)) {
      const c = qs(container);
      c.insertAdjacentHTML('beforeend', projectDom);
      localizeHtmlPageForElement(c.lastElementChild);
      qsa('.urlColorPicker', c.lastElementChild).forEach(syncNodeColor);
      attachDragHandlersToAll();
      applyProjectFilter();
      return;
    }
    const removeEl = e.target.closest('.' + btnRemoveProject);
    if (removeEl) {
      const wrap = removeEl.closest('.' + projectWrap);
      if (wrap) wrap.remove();
      markChanged();
      return;
    }
    const removeUrlEl = e.target.closest('.' + btnRemoveUrlRow);
    if (removeUrlEl) {
      const row = removeUrlEl.closest('.urlRow');
      if (row) row.remove();
      markChanged();
      return;
    }
    const addUrlEl = e.target.closest('.' + btnAddURL);
    if (addUrlEl) {
      insertInputURLArea(addUrlEl);
      return;
    }
    const saveEl = e.target.closest(btnSave);
    if (saveEl) {
      handleSave(saveEl);
      return;
    }
    if (e.target.closest('.reload')) {
      location.reload();
      return;
    }
    const hintEl = e.target.closest('.morehint a');
    if (hintEl) {
      const h2 = hintEl.closest('h2');
      const sib = h2 ? h2.nextElementSibling : null;
      if (sib && sib.classList.contains('close')) slideToggle(sib);
      return;
    }
    if (e.target.closest('.btnExport')) {
      handleExport();
      return;
    }
    const exportCopyEl = e.target.closest('.btnExportCopy');
    if (exportCopyEl) {
      handleExportCopy(exportCopyEl);
      return;
    }
    if (e.target.closest('.btnImport')) {
      const fi = qs('#importFile');
      fi.value = '';
      fi.click();
      return;
    }
    if (e.target.closest('.btnRestore')) {
      handleRestore();
      return;
    }
  });

  // INPUT change -> mark unsaved (the project filter box is excluded: it's a view-only search, not form data)
  document.addEventListener('input', function (e) {
    if (e.target.id === 'projectFilter') {
      applyProjectFilter();
      return;
    }
    if (e.target.matches('.urlColorPicker')) syncNodeColor(e.target);
    if (e.target.matches('input')) markChanged();
  });

  // FOCUS / BLUR on inputs (focusin/focusout bubble)
  document.addEventListener('focusin', function (e) {
    if (e.target.matches('input')) {
      const w = e.target.closest('.projectWrap');
      if (w) w.classList.add('is-active');
    }
  });
  document.addEventListener('focusout', function (e) {
    if (e.target.matches('input')) {
      const w = e.target.closest('.projectWrap');
      if (w) w.classList.remove('is-active');
    }
  });

  // IMPORT file chosen
  const importFile = qs('#importFile');
  if (importFile) {
    importFile.addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        let parsed;
        try {
          parsed = JSON.parse(reader.result);
        } catch (err) {
          alert(chrome.i18n.getMessage('option_import_invalid') || 'Invalid configuration file.');
          return;
        }
        const list = normalizeImport(parsed);
        if (!list) {
          alert(chrome.i18n.getMessage('option_import_invalid') || 'Invalid configuration file.');
          return;
        }
        if (!confirm(chrome.i18n.getMessage('option_import_confirm') || 'This will overwrite your current settings. Continue?')) {
          return;
        }
        qs(container).replaceChildren();
        const st = qs('#sametab');
        if (st) st.checked = false;
        init({ theswitcher: list });
        attachDragHandlersToAll();
        applyProjectFilter();
        saveCurrent().then(function () {
          const sd = qs(btnSave);
          if (sd) sd.classList.remove('changed');
          alert(chrome.i18n.getMessage('option_import_done') || 'Settings imported.');
        }).catch(function (err) {
          console.log(err);
          alert(chrome.i18n.getMessage('option_save_error') || 'Failed to save settings.');
        });
      };
      reader.readAsText(file);
    });
  }

  // SYNC toggle
  const useSync = qs('#useSync');
  if (useSync) {
    useSync.addEventListener('change', function () {
      saveCurrent().then(function () {
        const sd = qs(btnSave);
        if (sd) sd.classList.remove('changed');
      }).catch(function (err) {
        console.log(err);
        useSync.checked = false;
        alert(chrome.i18n.getMessage('option_sync_error') || 'Could not sync settings. They may exceed the sync size limit.');
      });
    });
  }

  // SAMETAB toggle -> persist immediately so it never silently reverts
  const sametabToggle = qs('#sametab');
  if (sametabToggle) {
    sametabToggle.addEventListener('change', function () {
      saveCurrent().then(function () {
        const sd = qs(btnSave);
        if (sd) sd.classList.remove('changed');
      }).catch(function (err) {
        console.log(err);
        alert(chrome.i18n.getMessage('option_save_error') || 'Failed to save settings.');
      });
    });
  }
});

// ---- top-level helpers (no jQuery) ----

// multi lang
function localizeHtmlPage() {
  // Localize by replacing __MSG_***__ meta tags
  const objects = document.getElementsByTagName('body');
  for (let j = 0; j < objects.length; j++) {
    const obj = objects[j];
    const valStrH = obj.innerHTML.toString();
    const valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : "";
    });
    if (valNewH != valStrH) {
      obj.innerHTML = valNewH;
    }
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Localize a single freshly-added element
function localizeHtmlPageForElement(element) {
  if (!element) return;
  const valStrH = element.innerHTML.toString();
  const valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
    return v1 ? chrome.i18n.getMessage(v1) : "";
  });
  if (valNewH != valStrH) {
    element.innerHTML = valNewH;
  }
}
