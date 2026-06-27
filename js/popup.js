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

let activeTabURL = '';
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

getCurrentTab().then((tab) => {
  try {
    let myOptions;
    chrome.storage.local.get('theswitcher').then(function (result) {
      if (!result.theswitcher) {
        console.log('No data found for theswitcher');
        return;
      }
      myOptions = result.theswitcher;
      let isSametab = getIsSametabValue(myOptions);
      let urlsize = 0;
      let targetURL = "";
      activeTabURL = tab.url;
      activeDomain = '';
      myOptions.forEach(function (key, index) {
        if (key.name) {
          let projectName = key.name;
          for (let i in key.url) {
            if (key.url[i]) {
              if (activeTabURL.indexOf(key.url[i]) > -1) {
                $('.appContainer').empty();
                const $h2 = $('<h2 class="listed"></h2>');
                $h2.append(document.createTextNode(htmlDecode(projectName)));
                $h2.append('<a tabindex="-1" href="options.html" target="_blank" class="setting"><i class="fa-solid fa-gear"></i></a>');
                $('.appContainer').append($h2);
                for (let j in key.url) {
                  let newURL = activeTabURL.replace(String(key.url[i]), String(key.url[j]));
                  if (!isSafeUrl(newURL)) { urlsize++; continue; }
                  let tabindex = (i == 0) ? 1 : 10;
                  const isActive = newURL.indexOf(key.url[i]) > -1;
                  if (!isActive) targetURL = newURL;
                  const $div = $('<div class="urlBlock"></div>');
                  if (isActive) $div.addClass('active');
                  const $mainLink = $('<a></a>')
                    .attr('tabindex', tabindex)
                    .attr('href', newURL)
                    .attr('target', '_blank')
                    .text(newURL);
                  if (isActive) $mainLink.attr('autofocus', true);
                  const $sameTabLink = $('<a>&gt;&gt;SameTab</a>')
                    .attr('id', `openInSameTab_${urlsize}`)
                    .attr('tabindex', tabindex)
                    .attr('href', newURL)
                    .attr('target', '_blank');
                  $div.append($mainLink)
                      .append('<i class="fa-solid fa-up-right-from-square"></i>')
                      .append($sameTabLink);
                  $('.appContainer').append($div);
                  $(`#openInSameTab_${urlsize}`).click(function (event) {
                    event.preventDefault();
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                      chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: (url) => {
                          window.location.assign(url);
                        },
                        args: [newURL]
                      });
                    });
                    window.close();
                  });
                  urlsize++;
                }
              }
            }
          }
        }
        if (urlsize == 1) {
          $('.appContainer').append(`<div class="urlBlock notice">Please set <span class="txtUnderLine">two or more document roots</span> in <a href="options.html" target="_blank">the options page</a>.</div>`);
        }
      });
      if (urlsize == 2 && isSafeUrl(targetURL) && !isSametab) {
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
          chrome.tabs.create({ url: targetURL, index: tabs[0].index + 1 });
        });
        window.close();
      } else if (urlsize == 2 && isSafeUrl(targetURL) && isSametab) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (targetURL) => {
              window.location.assign(targetURL);
            },
            args: [targetURL]
          });
        });
        window.close();
      }
    });
  } catch (error) {
    console.log(error);
  }
});

function localizeHtmlPage() {
  //Localize by replacing __MSG_***__ meta tags
  var objects = document.getElementsByTagName('html');
  for (var j = 0; j < objects.length; j++) {
    var obj = objects[j];

    var valStrH = obj.innerHTML.toString();
    var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : "";
    });

    if (valNewH != valStrH) {
      obj.innerHTML = valNewH;
    }
  }
}
localizeHtmlPage();

$(window).on('keydown', function (e) {
  if (e.keyCode === 38) {
    focus_prev();
    return false;
  }
  if (e.keyCode === 40) {
    focus_next();
    return false;
  }
});
function focus_prev() {
  var currentFocusIndex = $('a').index($(':focus'));
  if (currentFocusIndex > -1) {
    for (var i = 0; i < $('a').length; i++) {
      if (i === currentFocusIndex && i > 0) {
        $('a').eq(i - 1).focus();
      }
    }
  }
}
function focus_next() {
  var currentFocusIndex = $('a').index($(':focus'));
  if (currentFocusIndex > -1) {
    for (var i = 0; i < $('a').length; i++) {
      if (i === currentFocusIndex && i < $('a').length - 1) {
        $('a').eq(i + 1).focus();
      }
    }
  } else {
    $('a').eq(0).focus();
  }
}
