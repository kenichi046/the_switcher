importScripts(chrome.runtime.getURL('js/storage.js'));
let isUpdating = false;

function theswitcher() {
  if (isUpdating) return;
  isUpdating = true;

  chrome.contextMenus.removeAll(function () {
    let activeTabsURL;
    let newURL;

    chrome.tabs.query({ active: true, currentWindow: true }, (e) => {
      // Create Child-menu(Lower level contextmenu)
      const generateContextMenu = function (_id, _url, _name) {
        chrome.contextMenus.create({
          "id": _url,
          "title": _name,
          "type": "normal",
          "contexts": ["all"],
          "parentId": "theswitcher"
        }, () => chrome.runtime.lastError);
      }
      if (e[0].url != undefined) {
        activeTabsURL = e[0].url;
      }
      // Generatte Lower level cntextmenu
      TheSwitcherStore.load().then(function (res) {
        const list = Array.isArray(res.data) ? res.data : [];
        if (!activeTabsURL) { isUpdating = false; return; }
        list.forEach(function (proj) {
          for (var i in proj.url) {
            if (proj.url[i]) {
              if (activeTabsURL.indexOf(proj.url[i]) > -1) {
                // TOP LEVEL CONTEXTMENU
                chrome.contextMenus.create({
                  "id": "theswitcher",
                  "title": "swithing...",
                  "type": "normal",
                  "contexts": ["all"]
                }, () => chrome.runtime.lastError);
                for (var j in proj.url) {
                  newURL = activeTabsURL.replace(String(proj.url[i]), String(proj.url[j]));
                  generateContextMenu(j, newURL, proj.url[j]);
                }
              }
            }
          }
        });
        isUpdating = false;
      });
    });
  });
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  theswitcher();
});
chrome.tabs.onActivated.addListener(function (tabId, changeInfo, tab) {
  theswitcher();
});

function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

// Low level menu onClick
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId != "theswitcher" && isSafeUrl(info.menuItemId)) {
    chrome.tabs.create({ index: tab.index + 1, url: info.menuItemId, selected: true });
  }
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (changes && (changes.theswitcher || changes.theswitcher_sync)) {
    theswitcher();
  }
});

// ── Omnibox (address-bar keyword) ──────────────────────
function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0];
}

// Compute switch targets for the current URL (same replacement rule as the popup)
async function computeSwitchTargets(currentUrl) {
  const res = await TheSwitcherStore.load();
  const list = Array.isArray(res.data) ? res.data : [];
  const out = [];
  const seen = new Set();
  list.forEach(function (proj) {
    if (!proj || !proj.url) return;
    for (const i in proj.url) {
      const rootI = proj.url[i];
      if (!rootI || currentUrl.indexOf(rootI) === -1) continue;
      for (const j in proj.url) {
        if (j === i) continue;
        const rootJ = proj.url[j];
        if (!rootJ) continue;
        const newURL = currentUrl.replace(String(rootI), String(rootJ));
        if (!isSafeUrl(newURL) || seen.has(newURL)) continue;
        seen.add(newURL);
        out.push({ root: rootJ, url: newURL, project: proj.name || '' });
      }
    }
  });
  return out;
}

function filterTargets(targets, text) {
  const q = (text || '').trim().toLowerCase();
  if (!q) return targets;
  return targets.filter(function (t) {
    return t.url.toLowerCase().includes(q) ||
      t.root.toLowerCase().includes(q) ||
      (t.project && t.project.toLowerCase().includes(q));
  });
}

chrome.omnibox.onInputStarted.addListener(async function () {
  let desc;
  const tab = await getActiveTab();
  if (tab && tab.url) {
    const targets = await computeSwitchTargets(tab.url);
    desc = targets.length
      ? (chrome.i18n.getMessage('omnibox_filter') || 'Type to filter, or pick an environment below')
      : (chrome.i18n.getMessage('omnibox_nomatch') || 'No matching environment for this page');
  } else {
    desc = chrome.i18n.getMessage('omnibox_hint') || 'Switch this page environment';
  }
  chrome.omnibox.setDefaultSuggestion({ description: escapeXml(desc) });
});

chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
  (async function () {
    const tab = await getActiveTab();
    if (!tab || !tab.url) { suggest([]); return; }
    const targets = filterTargets(await computeSwitchTargets(tab.url), text);
    const suggestions = targets.map(function (t) {
      const label = t.project ? (t.project + ' / ' + t.root) : t.root;
      return {
        content: t.url,
        description: '<dim>' + escapeXml(label) + '</dim>  <url>' + escapeXml(t.url) + '</url>'
      };
    });
    suggest(suggestions);
  })();
});

chrome.omnibox.onInputEntered.addListener(function (text, disposition) {
  (async function () {
    let url = text;
    if (!isSafeUrl(url)) {
      const tab = await getActiveTab();
      if (tab && tab.url) {
        const targets = filterTargets(await computeSwitchTargets(tab.url), text);
        if (targets.length) url = targets[0].url;
      }
    }
    if (!isSafeUrl(url)) return;
    const tab = await getActiveTab();
    if (disposition === 'currentTab') {
      if (tab) chrome.tabs.update(tab.id, { url: url });
      else chrome.tabs.create({ url: url });
    } else if (disposition === 'newForegroundTab') {
      chrome.tabs.create({ url: url, active: true, index: tab ? tab.index + 1 : undefined });
    } else {
      chrome.tabs.create({ url: url, active: false, index: tab ? tab.index + 1 : undefined });
    }
  })();
});
