$(function () {

  // DOM CLASSES
  const container = '.appContainer';
  const btnAddProject = '.btnAddProject';
  const btnSave = '.saveData';
  const btnAddURL = 'addURL';
  const btnRemoveProject = 'btnRemeveProject';
  const projectWrap = 'projectWrap';
  const placeholderURL = 'placeholder="ex) https://yourprojectdomain/"';
  const placeholderProject = 'placeholder="ex) PROJECT-001"';
  const sameTabCheckbox = '#sametab';

  // JSON DATA
  let userJSON = [];

  // if has localstorage theswithcer, it should be removed
  if (localStorage.key('theswitcher')) {
    localStorage.removeItem('theswitcher');
  }
  let projectDom = `
  <div class="${projectWrap}">
    <dl>
      <dt>
        <span>Project Name : </span><input ${placeholderProject} type="text" value="" data-proname="projectName1" />
        <span class="${btnRemoveProject}"><button><i class="fa-solid fa-circle-xmark"></i> __MSG_option_message_07__</button></span>
      </dt>
      <dd>
        <input ${placeholderURL} type="text" value="" data-envname="url1" />
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

  // init APP
  const init = function (jsonData) {
    jsonData = JSON.stringify(jsonData);
    let obj;
    try {
      obj = JSON.parse(jsonData);
    } catch (e) {
      console.log(e);
    }
    console.log(obj);
    Object.keys(obj).forEach(function (key, index) {
      obj[key].forEach(function (key, index) {

        if (typeof key === 'object' && key.name) {
          const rawName = htmlDecode(key.name);

          const $dt = $('<dt></dt>');
          $dt.append('<span>Project Name : </span>');
          const $nameInput = $('<input type="text">')
            .attr('placeholder', 'ex) PROJECT-001')
            .attr('data-proname', `projectName${index + 1}`)
            .val(rawName);
          const $removeBtn = $('<span></span>').addClass(btnRemoveProject);
          const $removeBtnInner = $('<button></button>');
          $removeBtnInner.append('<i class="fa-solid fa-circle-xmark"></i> ');
          $removeBtnInner.append(document.createTextNode(chrome.i18n.getMessage('option_message_07')));
          $removeBtn.append($removeBtnInner);
          $dt.append($nameInput).append($removeBtn);

          const $dd = $('<dd></dd>');
          const $dl = $('<dl></dl>').append($dt).append($dd);

          const $addURLBtn = $('<button></button>').addClass(btnAddURL);
          $addURLBtn.append('<i class="fa-solid fa-circle-plus"></i> ');
          $addURLBtn.append(document.createTextNode(chrome.i18n.getMessage('option_message_08')));

          const $block = $('<div></div>').addClass(projectWrap).append($dl).append($addURLBtn);
          $(container).append($block);

          for (var i in key.url) {
            if (key.url[i]) {
              const $urlInput = $('<input type="text">')
                .attr('placeholder', 'ex) https://yourprojectdomain/')
                .val(htmlDecode(key.url[i]));
              $dd.append($urlInput);
            }
          }
        } else if (typeof key == 'object' && key.sametab) {
          if (key.sametab === true) {
            $('#sametab').prop('checked', true);
          }
        }
      });
    });
  }

  // ADD URL INPUT AREA
  const insertInputURLArea = function ($this) {
    let areaNumber = $this.parent(String('.' + projectWrap)).find('dd input').length + 1;
    let inputURLArea = `
    <input type="text" ${placeholderURL} value="" data-envname="url${areaNumber}">
    `;
    $this.parent(String('.' + projectWrap)).find('dd').append(inputURLArea);
  }

  // CONVERT DATA INTO JSON
  // retrun JSON STRINGS
  const convertJSON = function () {
    const isSametab = $('#sametab').prop("checked");
    userJSON = [];
    $(String('.' + projectWrap)).each(function () {
      let pName = escapeHtml($(this).find('dt input').val());
      let uName = [];
      $(this).find('dd input').each(function () {
        let inputValue = escapeHtml($(this).val());
        if (inputValue) {
          uName.push(inputValue);
        }
      });
      userJSON.push({ "name": pName, "url": uName });
    });
    userJSON.push({ "sametab": isSametab });
    return userJSON;
  }

  // SAVE TO LOCAL
  const saveToLocalStorage = function () {
    chrome.storage.local.set({ 'theswitcher': convertJSON() });
  }

  // Localize static HTML before user data is rendered
  localizeHtmlPage();

  // WHEN OPEN THIS PAGE
  chrome.storage.local.get('theswitcher').then(function (result) {
    init(result);
  });

  // BTN ADD PROJECT
  $(document).on('click', btnAddProject, function () {
    $(container).append(projectDom);
    localizeHtmlPageForElement($(container).children().last());
  });
  // BTN REMOVE PROJECT
  $(document).on('click', String('.' + btnRemoveProject), function () {
    $(this).closest(String('.' + projectWrap)).remove();
    $('.saveData').addClass('changed');
  });
  // BTN ADD URL
  $(document).on('click', String('.' + btnAddURL), function (e) {
    insertInputURLArea($(this));
  });
  // BTN SAVE
  $(document).on('click', btnSave, function () {
    // CHECK INPUT VALUE
    $('input').each(function () {
      if ($(this).val().indexOf('"') > -1) {
        alert('Sorry " is not available.');
        $(this).addClass('error');
        e.preventDefault();
        e.stopImmediatePropagation();
      } else {
        $(this).removeClass('error');
      }
    });
    saveToLocalStorage();
    $(this).removeClass('changed');
  });
  // BTN RELOAD
  $(document).on('click', '.reload', function () {
    location.reload();
  });
  // CHANGE INPUT
  $(document).on('input', 'input', function () {
    $('.saveData').addClass('changed');
  });
  // ON ACTIVE
  $(document).on('focus', 'input', function () {
    $(this).closest('.projectWrap').addClass('is-active');
  });
  // ON BLUR
  $(document).on('blur', 'input', function () {
    $(this).closest('.projectWrap').removeClass('is-active');
  });
  // MORE HINT
  $(document).on('click', '.morehint a', function () {
    $(this).closest('h2').next('.close').slideToggle();
  });
});
// multi lang
function localizeHtmlPage() {
  //Localize by replacing __MSG_***__ meta tags
  var objects = document.getElementsByTagName('body');
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
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
// 特定の要素に対してローカライズを適用する関数
function localizeHtmlPageForElement(element) {
  var valStrH = element.html().toString();
  var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
    return v1 ? chrome.i18n.getMessage(v1) : "";
  });

  if (valNewH != valStrH) {
    element.html(valNewH);
  }
}
