document.addEventListener('DOMContentLoaded', function () {

  // SELECTORS / CLASS NAMES
  const container = '.appContainer';
  const btnAddProject = '.btnAddProject';
  const btnSave = '.saveData';
  const btnAddURL = 'addURL';
  const btnRemoveProject = 'btnRemeveProject';
  const projectWrap = 'projectWrap';
  const placeholderURL = 'placeholder="ex) https://yourprojectdomain/"';
  const placeholderProject = 'placeholder="ex) PROJECT-001"';

  // small DOM helpers
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const markChanged = () => { const sd = qs(btnSave); if (sd) sd.classList.add('changed'); };

  // JSON DATA
  let userJSON = [];
  // becomes true only after the initial load + render settles, so saves
  // can never run against an empty (not-yet-populated) form
  let isReady = false;

  // if has localstorage theswithcer, it should be removed
  if (localStorage.key('theswitcher')) {
    localStorage.removeItem('theswitcher');
  }

  const placeholderLabel = 'placeholder="ex) prod env"';
  const projectDom = `
  <div class="${projectWrap}" draggable="true">
    <dl>
      <dt>
        <span class="dragHandle" title="Drag to reorder"><i class="fa-solid fa-grip-vertical"></i></span>
        <span>Project Name : </span><input ${placeholderProject} type="text" value="" data-proname="projectName1" />
        <span class="${btnRemoveProject}"><button><i class="fa-solid fa-circle-xmark"></i> __MSG_option_message_07__</button></span>
      </dt>
      <dd>
        <div class="urlRow">
          <input ${placeholderURL} type="text" class="urlInput" value="" data-envname="url1" />
          <input ${placeholderLabel} type="text" class="urlLabelInput" value="">
          <input type="color" class="urlColorPicker" value="#808080">
        </div>
      </dd>
    </dl>
    <button class="${btnAddURL}"><i class="fa-solid fa-circle-plus"></i> __MSG_option_message_08__</button>
  </div>
  `;

  function htmlDecode(text) {
    const el = document.createElement('textarea');
    el.innerHTML = text;
    return el.value;
  }

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
          handle.title = 'Drag to reorder';
          handle.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>';
          dt.appendChild(handle);
          const label = document.createElement('span');
          label.textContent = 'Project Name : ';
          dt.appendChild(label);

          const nameInput = document.createElement('input');
          nameInput.type = 'text';
          nameInput.placeholder = 'ex) PROJECT-001';
          nameInput.setAttribute('data-proname', `projectName${index + 1}`);
          nameInput.value = rawName;
          dt.appendChild(nameInput);

          const removeWrap = document.createElement('span');
          removeWrap.className = btnRemoveProject;
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> ';
          removeBtn.appendChild(document.createTextNode(chrome.i18n.getMessage('option_message_07')));
          removeWrap.appendChild(removeBtn);
          dt.appendChild(removeWrap);

          const dd = document.createElement('dd');
          const dl = document.createElement('dl');
          dl.appendChild(dt);
          dl.appendChild(dd);

          const addURLBtn = document.createElement('button');
          addURLBtn.className = btnAddURL;
          addURLBtn.innerHTML = '<i class="fa-solid fa-circle-plus"></i> ';
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
              const urlInput = document.createElement('input');
              urlInput.type = 'text';
              urlInput.className = 'urlInput';
              urlInput.placeholder = 'ex) https://yourprojectdomain/';
              urlInput.value = htmlDecode(item.url[i]);
              const labelInput = document.createElement('input');
              labelInput.type = 'text';
              labelInput.className = 'urlLabelInput';
              labelInput.placeholder = 'ex) prod env';
              labelInput.value = (item.labels && item.labels[i]) ? htmlDecode(item.labels[i]) : '';
              const colorInput = document.createElement('input');
              colorInput.type = 'color';
              colorInput.className = 'urlColorPicker';
              colorInput.value = (item.colors && item.colors[i]) ? item.colors[i] : '#808080';
              urlRow.appendChild(urlInput);
              urlRow.appendChild(labelInput);
              urlRow.appendChild(colorInput);
              dd.appendChild(urlRow);
            }
          }
        } else if (item && typeof item === 'object' && item.sametab) {
          if (item.sametab === true) {
            const cb = qs('#sametab');
            if (cb) cb.checked = true;
          }
        }
      });
    });
  };

  // ADD URL INPUT AREA
  const insertInputURLArea = function (btnEl) {
    const wrap = btnEl.closest('.' + projectWrap);
    if (!wrap) return;
    const dd = wrap.querySelector('dd');
    const areaNumber = wrap.querySelectorAll('dd input[type="text"]').length + 1;
    const urlRow = document.createElement('div');
    urlRow.className = 'urlRow';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'urlInput';
    input.placeholder = 'ex) https://yourprojectdomain/';
    input.value = '';
    input.setAttribute('data-envname', `url${areaNumber}`);
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'urlLabelInput';
    labelInput.placeholder = 'ex) prod env';
    labelInput.value = '';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'urlColorPicker';
    colorInput.value = '#808080';
    urlRow.appendChild(input);
    urlRow.appendChild(labelInput);
    urlRow.appendChild(colorInput);
    dd.appendChild(urlRow);
  };

  // CONVERT FORM -> JSON
  const convertJSON = function () {
    const sametabEl = qs('#sametab');
    const isSametab = !!(sametabEl && sametabEl.checked);
    userJSON = [];
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
    btn.innerHTML = '<i class="fa-solid fa-check"></i> ' + escapeHtml(label);
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
      c.insertBefore(dragSrcEl, before ? wrap : wrap.nextSibling);
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
