function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function htmlDecode(text) {
  const el = document.createElement('textarea');
  el.innerHTML = text;
  return el.value;
}

function highlightUrlDiff(activeUrl, newUrl) {
  if (activeUrl === newUrl) return document.createTextNode(newUrl);
  const minLen = Math.min(activeUrl.length, newUrl.length);
  let pre = 0;
  while (pre < minLen && activeUrl[pre] === newUrl[pre]) pre++;
  let suf = 0;
  while (suf < minLen - pre && activeUrl[activeUrl.length - 1 - suf] === newUrl[newUrl.length - 1 - suf]) suf++;
  const diffEnd = newUrl.length - suf;
  const frag = document.createDocumentFragment();
  if (pre > 0) frag.appendChild(document.createTextNode(newUrl.slice(0, pre)));
  if (diffEnd > pre) {
    const span = document.createElement('span');
    span.className = 'urlDiff';
    span.textContent = newUrl.slice(pre, diffEnd);
    frag.appendChild(span);
  }
  if (diffEnd < newUrl.length) frag.appendChild(document.createTextNode(newUrl.slice(diffEnd)));
  return frag;
}

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function getIsSametabValue(obj) {
  for (const item of obj) {
    if (item.sametab) {
      return true;
    }
  }
  return false;
}

let activeTabURL = '';
let currentSametab = false;
let currentDisplayMode = TheSwitcherStore.DISPLAY_MODE_URL;
// Every per-row "open in the other tab mode" link — kept so their label can
// be refreshed in one place whenever currentSametab changes (see
// refreshSameTabLinkLabels, called from the footer quick-toggle handler).
let sameTabLinkEls = [];

function refreshSameTabLinkLabels() {
  const newTabText = chrome.i18n.getMessage('popup_open_new_tab') || 'Open new tab';
  const sameTabText = chrome.i18n.getMessage('popup_open_same_tab') || 'Open same tab';
  sameTabLinkEls.forEach(function (el) {
    el.textContent = currentSametab ? newTabText : sameTabText;
  });
}

getCurrentTab().then((tab) => {
  try {
    const appContainer = document.querySelector('.appContainer');
    let myOptions;
    let syncEnabled = false;
    setupAnnouncementBanner();
    Promise.all([TheSwitcherStore.load(), TheSwitcherStore.loadDisplayMode()]).then(function (results) {
      const result = results[0];
      currentDisplayMode = results[1];
      if (!result.data) {
        console.log('No data found for theswitcher');
        return;
      }
      myOptions = result.data;
      syncEnabled = !!result.syncEnabled;
      let isSametab = getIsSametabValue(myOptions);
      currentSametab = isSametab;
      let urlsize = 0;
      let targetURL = "";
      let hasCustomColor = false;
      activeTabURL = tab.url;

      myOptions.forEach(function (proj) {
        if (proj.name) {
          let projectName = proj.name;
          for (let i in proj.url) {
            if (proj.url[i]) {
              if (activeTabURL.indexOf(proj.url[i]) > -1) {
                appContainer.replaceChildren();

                const h2 = document.createElement('h2');
                h2.className = 'listed';
                h2.appendChild(document.createTextNode(htmlDecode(projectName)));
                const gear = document.createElement('a');
                gear.setAttribute('tabindex', '-1');
                gear.href = 'options.html';
                gear.target = '_blank';
                gear.className = 'setting';
                gear.innerHTML = '<svg class="icon"><use href="#icon-gear"></use></svg>';
                h2.appendChild(gear);
                appContainer.appendChild(h2);

                for (let j in proj.url) {
                  let newURL = activeTabURL.replace(String(proj.url[i]), String(proj.url[j]));
                  if (!isSafeUrl(newURL)) { urlsize++; continue; }
                  let tabindex = (i == 0) ? 1 : 10;
                  const isActive = newURL.indexOf(proj.url[i]) > -1;
                  if (!isActive) targetURL = newURL;

                  const div = document.createElement('div');
                  div.className = 'urlBlock';
                  if (isActive) div.classList.add('active');

                  const dragHandle = document.createElement('span');
                  dragHandle.className = 'urlDragHandle';
                  dragHandle.title = chrome.i18n.getMessage('popup_drag_reorder') || 'Drag to reorder';
                  dragHandle.innerHTML = '<svg class="icon"><use href="#icon-grip-vertical"></use></svg>';
                  div.appendChild(dragHandle);

                  const urlColor = (proj.colors && proj.colors[j]) ? proj.colors[j] : '';
                  if (urlColor) {
                    if (urlColor.toLowerCase() !== '#808080') hasCustomColor = true;
                    const dot = document.createElement('span');
                    dot.className = 'urlColorDot';
                    dot.style.background = urlColor;
                    div.appendChild(dot);
                  }

                  const mainLink = document.createElement('a');
                  mainLink.setAttribute('tabindex', tabindex);
                  mainLink.href = newURL;
                  mainLink.target = '_blank';
                  const urlLabel = (proj.labels && proj.labels[j]) ? proj.labels[j] : '';
                  if (currentDisplayMode === TheSwitcherStore.DISPLAY_MODE_LABEL && urlLabel) {
                    mainLink.title = newURL;
                    mainLink.appendChild(document.createTextNode(htmlDecode(urlLabel)));
                  } else {
                    mainLink.appendChild(highlightUrlDiff(activeTabURL, newURL));
                  }
                  if (isActive) mainLink.setAttribute('autofocus', '');

                  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                  icon.setAttribute('class', 'icon');
                  const iconUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                  iconUse.setAttribute('href', '#icon-up-right-from-square');
                  icon.appendChild(iconUse);

                  const sameTabLink = document.createElement('a');
                  sameTabLink.id = `openInSameTab_${urlsize}`;
                  sameTabLink.setAttribute('tabindex', tabindex);
                  sameTabLink.href = newURL;
                  sameTabLink.target = '_blank';
                  // This button always offers the opposite of the current
                  // "open in same tab" setting, so mainLink and this button
                  // together cover both ways to open a URL.
                  sameTabLinkEls.push(sameTabLink);

                  const copyBtn = document.createElement('button');
                  copyBtn.type = 'button';
                  copyBtn.className = 'copyBtn';
                  copyBtn.setAttribute('tabindex', tabindex);
                  copyBtn.title = chrome.i18n.getMessage('popup_copy') || 'Copy URL';
                  copyBtn.setAttribute('aria-label', copyBtn.title);
                  copyBtn.innerHTML = '<svg class="icon"><use href="#icon-copy"></use></svg>';

                  div.dataset.origIndex = j;
                  div.appendChild(mainLink);
                  div.appendChild(icon);
                  div.appendChild(copyBtn);
                  div.appendChild(sameTabLink);
                  appContainer.appendChild(div);
                  setupPopupUrlRowDragReorder(div, proj, myOptions, syncEnabled);

                  const capturedURL = newURL;
                  mainLink.addEventListener('click', function (event) {
                    // When "open in same tab" is ON, navigate the current tab instead of opening a new one.
                    if (currentSametab) {
                      event.preventDefault();
                      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        chrome.tabs.update(tabs[0].id, { url: capturedURL });
                      });
                      window.close();
                    }
                    // else: let the default target="_blank" open a new tab
                  });
                  copyBtn.addEventListener('click', function (event) {
                    event.preventDefault();
                    copyToClipboard(capturedURL, copyBtn);
                  });
                  sameTabLink.addEventListener('click', function (event) {
                    event.preventDefault();
                    if (currentSametab) {
                      // Current setting is "same tab" -> this button offers "new tab".
                      chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                        chrome.tabs.create({ url: capturedURL, index: tabs[0].index + 1 });
                      });
                    } else {
                      // Current setting is "new tab" -> this button offers "same tab".
                      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        chrome.tabs.update(tabs[0].id, { url: capturedURL });
                      });
                    }
                    window.close();
                  });
                  urlsize++;
                }
              }
            }
          }
        }
        if (urlsize == 1) {
          appContainer.insertAdjacentHTML('beforeend', '<div class="urlBlock notice">Please set <span class="txtUnderLine">two or more document roots</span> in <a href="options.html" target="_blank">the options page</a>.</div>');
        }
      });

      // Exactly 2 document roots: switch immediately without showing the popup.
      // "Open in same tab" ON -> navigate current tab; OFF -> open a new tab.
      if (urlsize == 2 && isSafeUrl(targetURL)) {
        if (isSametab) {
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.update(tabs[0].id, { url: targetURL });
          });
        } else {
          chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            chrome.tabs.create({ url: targetURL, index: tabs[0].index + 1 });
          });
        }
        window.close();
        return;
      }

      // 3+ roots (or single/no match): keep the popup open and set up the quick toggle.
      const hasSwitchTargets = isSafeUrl(targetURL);
      refreshSameTabLinkLabels();
      setupSametabQuickToggle(myOptions, isSametab, syncEnabled, hasSwitchTargets);
      setupDisplayModeToggle(hasSwitchTargets);

      // When the candidate list is shown (3+ document roots) and no custom
      // color has been set yet, suggest the per-project color feature.
      if (urlsize >= 3 && !hasCustomColor) {
        const hint = document.createElement('div');
        hint.className = 'urlBlock colorHint';
        hint.innerHTML = '<svg class="icon"><use href="#icon-palette"></use></svg> ' + htmlDecode(chrome.i18n.getMessage('popup_color_hint'));
        appContainer.appendChild(hint);
      }
    });
  } catch (error) {
    console.log(error);
  }
});

// Wire the footer display-mode toggle (URL / Label): reflect current value, persist on change.
// Hidden entirely when this page has no environment to switch to.
function setupDisplayModeToggle(visible) {
  const wrap = document.querySelector('.displayModeToggle');
  if (!wrap) return;
  if (!visible) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';
  const buttons = Array.from(wrap.querySelectorAll('.displayModeBtn'));
  function reflect() {
    buttons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === currentDisplayMode);
    });
  }
  reflect();
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const mode = btn.dataset.mode;
      if (mode === currentDisplayMode) return;
      currentDisplayMode = mode;
      TheSwitcherStore.saveDisplayMode(mode).catch(function (err) {
        console.log(err);
      });
      reflect();
      location.reload();
    });
  });
}

// ── DRAG-TO-REORDER URL ROWS (popup) ─────────────────────
// Same live-reorder-during-dragover approach as the options page (see
// js/options.js) rather than computing the drop position once at drop
// time, which is prone to boundary-condition drift.
let popupUrlRowDragSrcEl = null;
function setupPopupUrlRowDragReorder(row, proj, myOptions, syncEnabled) {
  const handle = row.querySelector('.urlDragHandle');
  if (!handle) return;

  handle.addEventListener('mousedown', function () {
    row.draggable = true;
  });
  row.addEventListener('mouseup', function () {
    row.draggable = false;
  });

  row.addEventListener('dragstart', function (e) {
    popupUrlRowDragSrcEl = row;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', ''); } catch (err) { /* some browsers require this */ }
  });
  row.addEventListener('dragend', function () {
    row.classList.remove('dragging');
    row.draggable = false;
    const parent = row.parentElement;
    popupUrlRowDragSrcEl = null;
    if (!parent) return;

    // Rebuild proj.url/colors/labels from the current DOM order. Rows that
    // weren't rendered (e.g. filtered out as unsafe) keep their original
    // relative order, appended after the rows that were visible.
    const visibleRows = Array.from(parent.querySelectorAll('.urlBlock[data-orig-index]'));
    const usedIdx = new Set();
    const newUrl = [];
    const newColors = [];
    const newLabels = [];
    visibleRows.forEach(function (r) {
      const idx = r.dataset.origIndex;
      usedIdx.add(idx);
      newUrl.push(proj.url[idx]);
      newColors.push((proj.colors && proj.colors[idx]) ? proj.colors[idx] : '#808080');
      newLabels.push((proj.labels && proj.labels[idx]) ? proj.labels[idx] : '');
    });
    for (const idx in proj.url) {
      if (!usedIdx.has(idx)) {
        newUrl.push(proj.url[idx]);
        newColors.push((proj.colors && proj.colors[idx]) ? proj.colors[idx] : '#808080');
        newLabels.push((proj.labels && proj.labels[idx]) ? proj.labels[idx] : '');
      }
    }
    proj.url = newUrl;
    proj.colors = newColors;
    proj.labels = newLabels;

    TheSwitcherStore.save(myOptions, syncEnabled).catch(function (err) { console.log(err); });
  });
  row.addEventListener('dragover', function (e) {
    e.preventDefault();
    if (!popupUrlRowDragSrcEl || popupUrlRowDragSrcEl === row) return;
    const parent = row.parentElement;
    if (!parent || popupUrlRowDragSrcEl.parentElement !== parent) return;
    const rect = row.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    const target = before ? row : row.nextElementSibling;
    if (target === popupUrlRowDragSrcEl) return;
    if (popupUrlRowDragSrcEl.nextElementSibling === target) return;
    parent.insertBefore(popupUrlRowDragSrcEl, target);
  });
  row.addEventListener('drop', function (e) {
    e.preventDefault();
    // Reordering already happened live during dragover; dragend persists it.
  });
}

// ── "What's new" popup announcement banner ──────────────
// A small dismissible banner near the bottom of the popup. Once closed,
// it never shows again (tracked per announcement ID in local storage).
const ANNOUNCE_V2_5_0_ID = 'v2_5_0_labels_and_reorder';
function setupAnnouncementBanner() {
  const banner = document.getElementById('announceBanner');
  const list = document.getElementById('announceList');
  const closeBtn = document.getElementById('announceCloseBtn');
  if (!banner || !list || !closeBtn) return;

  TheSwitcherStore.isNoteDismissed(ANNOUNCE_V2_5_0_ID).then(function (dismissed) {
    if (dismissed) return;

    const items = [
      chrome.i18n.getMessage('popup_announce_v2_5_0_labels'),
      chrome.i18n.getMessage('popup_announce_v2_5_0_reorder')
    ];
    items.forEach(function (text) {
      if (!text) return;
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    });
    if (list.children.length > 0) {
      banner.style.display = '';
    }
  }).catch(function (err) { console.log(err); });

  closeBtn.addEventListener('click', function () {
    banner.style.display = 'none';
    TheSwitcherStore.dismissNote(ANNOUNCE_V2_5_0_ID).catch(function (err) { console.log(err); });
  });
}

// Wire the footer SameTab quick-toggle: reflect current value, persist on change.
// Hidden entirely when this page has no environment to switch to.
function setupSametabQuickToggle(myOptions, isSametab, syncEnabled, visible) {
  const wrap = document.querySelector('.quickSettings');
  const toggle = document.getElementById('sametabQuick');
  if (!toggle) return;
  if (!visible) {
    if (wrap) wrap.style.display = 'none';
    return;
  }
  if (wrap) wrap.style.display = '';
  toggle.checked = isSametab;
  toggle.addEventListener('change', function () {
    const next = toggle.checked;
    currentSametab = next;
    refreshSameTabLinkLabels();
    const updated = (myOptions || []).map(function (item) {
      if (item && typeof item === 'object' && typeof item.sametab === 'boolean') {
        return { sametab: next };
      }
      return item;
    });
    if (!updated.some(function (it) { return it && typeof it.sametab === 'boolean'; })) {
      updated.push({ sametab: next });
    }
    myOptions = updated;
    TheSwitcherStore.save(updated, syncEnabled).catch(function (err) {
      console.log(err);
      toggle.checked = !next;
    });
  });
}

function localizeHtmlPage() {
  // Localize by replacing __MSG_***__ meta tags
  const objects = document.getElementsByTagName('html');
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
localizeHtmlPage();

// Arrow-key navigation between links
window.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowUp') {
    focus_prev();
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    focus_next();
    e.preventDefault();
  }
});

function focus_prev() {
  const anchors = Array.from(document.querySelectorAll('a'));
  const current = anchors.indexOf(document.activeElement);
  if (current > 0) {
    anchors[current - 1].focus();
  }
}

function focus_next() {
  const anchors = Array.from(document.querySelectorAll('a'));
  const current = anchors.indexOf(document.activeElement);
  if (current > -1) {
    if (current < anchors.length - 1) {
      anchors[current + 1].focus();
    }
  } else if (anchors.length) {
    anchors[0].focus();
  }
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(function () {
    flashCopied(btn);
  }).catch(function (err) {
    console.log(err);
    // Fallback for environments where the async Clipboard API is blocked
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      flashCopied(btn);
    } catch (e) {
      console.log(e);
    }
  });
}

function flashCopied(btn) {
  const originalHTML = btn.innerHTML;
  const originalTitle = btn.title;
  btn.classList.add('copied');
  btn.innerHTML = '<svg class="icon"><use href="#icon-check"></use></svg>';
  btn.title = chrome.i18n.getMessage('popup_copied') || 'Copied!';
  setTimeout(function () {
    btn.classList.remove('copied');
    btn.innerHTML = originalHTML;
    btn.title = originalTitle;
  }, 1200);
}
