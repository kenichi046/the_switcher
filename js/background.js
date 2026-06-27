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
      chrome.storage.local.get('theswitcher').then(function (result) {
        let obj = JSON.stringify(result);
        obj = JSON.parse(obj);
        Object.keys(obj).forEach(function (key, index) {
          obj[key].forEach(function (key, index) {
            for (var i in key.url) {
              if (key.url[i]) {
                if (activeTabsURL.indexOf(key.url[i]) > -1) {
                  // TOP LEVEL CONTEXTMENU
                  chrome.contextMenus.create({
                    "id": "theswitcher",
                    "title": "swithing...",
                    "type": "normal",
                    "contexts": ["all"]
                  }, () => chrome.runtime.lastError);
                  for (var j in key.url) {
                    newURL = activeTabsURL.replace(String(key.url[i]), String(key.url[j]));
                    generateContextMenu(j, newURL, key.url[j]);
                  }
                }
              }
            }
          });
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
