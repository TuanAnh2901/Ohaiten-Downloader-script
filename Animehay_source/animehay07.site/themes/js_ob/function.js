Element.prototype.hide = function () {
  this.style.display = "none";
};
Element.prototype.show = function () {
  this.style.display = "block";
};
Element.prototype.middleWindow = function () {
  let center = (window.innerHeight - this.clientHeight) / 2;
  let client_width =
    window.innerWidth < 550 ? (window.innerWidth * 6) / 7 : 500;
  let left = (window.innerWidth - client_width) / 2;
  center = center > 0 ? center : 0;
  this.style.left = `${left}px`;
  this.style.top = `${center}px`;
  this.style.width = `${client_width}px`;
};
function Observer(name_element, func, unob = true) {
  var _element = document.getElementById(`${name_element}`);
  var _options = {
    root: null,
    rootMargin: "0px",
    threshold: 0.5,
  };
  var prev = 0;
  var _callback = (entries, observer) => {
    entries.forEach((entry) => {
      // console.log(entry);
      if (entry.intersectionRatio > prev) {
        unob && observer.unobserve(_element);
        func();
      }
      prev = entry.intersectionRatio;
    });
  };
  let observer = new IntersectionObserver(_callback, _options);
  observer.observe(_element);
}

function timeConverter(UNIX_timestamp) {
  var a = new Date(UNIX_timestamp * 1000);
  var hour = a.getHours();
  var min = a.getMinutes();
  var time = `${hour} giờ ${min} phút`;
  return time;
}

function Toast(item = {}) {
  let title = item.title || "Thông báo";
  let message = item.message || "Thông báo";
  let time_post = item.time_post || null;

  let type = item.type || "info";
  let time_out = item.time_out || 3000;
  let href = item.href || null;
  let image = item.image || null;
  let class_type = "toast-info";
  let elem_toast = document.getElementById("ah_toast");
  if (typeof href == "string") {
    href = `window.location.href="${href}"`;
  }
  switch (type) {
    case "warning":
      class_type = "toast-warning";
      break;
    case "success":
      class_type = "toast-success";
      break;
    case "error":
      class_type = "toast-error";
      break;
    default:
      break;
  }

  let elem_item_toast = document.createElement("div");
  elem_item_toast.classList.add("toast");
  href && elem_item_toast.setAttribute("onclick", href);
  let html = `<div class="flex">`;
  if (image) {
    html += `<div class="toast_image margin-r-5"><img src="${image}"/></div>`;
  }
  html += "<div>";
  html += `
    <div class="toast_head ${class_type}">
      <div class="toast_title">${title}</div>
      <div class="toast_exit padding-0-10" onclick="this.parentElement.parentElement.remove()">X</div>
    </div>
    <div class="toast_body">
        <div class="toast_message">${message}</div>
    </div>
    `;
  if (time_post) {
    html += `
    <div class="toast_footer">
        <div class="toast_time">Lúc ${timeConverter(time_post)}</div>
    </div>
  `;
  }
  html += "</div>";

  html += `<div>`;

  elem_item_toast.insertAdjacentHTML("afterbegin", html);
  elem_toast.appendChild(elem_item_toast);
  execDelay(function () {
    elem_item_toast.remove();
  }, time_out);
}
function handlingSearch() {
  var _form_seach = document.getElementById("form-search");
  var _keyword = _form_seach.querySelector('input[name="keyword"]').value.trim();
  if (_keyword) {
    window.location.href = "/tim-kiem/?keyword=" + encodeURIComponent(_keyword);
  } else {
    alert("Bạn chưa nhập từ khoá để tìm kiếm!");
  }
}
//
function setupTab() {
  const tab_links = document.getElementsByClassName("tab-links");
  const tab_content = document.getElementsByClassName("tab-content");

  try {
    if (tab_links == null || tab_content == null)
      throw "Không phát hiện code-tab, không thể cài đặt";
    for (let i = 0; i < tab_links.length; i++) {
      let tab_links_item = [...tab_links[i].children];
      let tab_content_item = [...tab_content[i].children];

      tab_links_item.forEach((item) => {
        item.addEventListener("click", function () {
          let bind_content = item.attributes.bind.value;
          tab_links_item.forEach((item) => {
            item.classList.contains("active") &&
              item.classList.remove("active");
          });
          this.classList.add("active");

          tab_content_item.forEach((item) => {
            if (item.attributes.id.value == bind_content) {
              item.classList.add("display-block");
            } else {
              item.classList.contains("display-block") &&
                item.classList.remove("display-block");
            }
          });
        });
      });
    }
  } catch (e) {
    console.log(e);
  }
}
function getElem(name, type = "id") {
  let elem = null;
  switch (type) {
    case "id":
      elem = document.getElementById(name);
      break;
    case "class":
      elem = document.getElementsByClassName(name);
      break;
    case "name":
      elem = document.getElementsByName(name);
      break;
    case "tagname":
      elem = document.getElementsByTagName(name);
      break;
    default:
      elem = null;
      break;
  }
  return elem;
}
function middleBoxScreen(item = {}) {
  const title = item.title || "Thông tin";
  const content = item.content || null;
  const elem_html = item.elem || null;
  var middle_box_screen = document.getElementById("middle-box-screen");
  if (middle_box_screen == null) {
    middle_box_screen = document.createElement("div");
    middle_box_screen.setAttribute("id", "middle-box-screen");
    document.body.appendChild(middle_box_screen);
    middleBoxScreen(item);
  } else {
    middle_box_screen.innerHTML = null;
    if (middle_box_screen.style.display) {
      middle_box_screen.style = null;
    } else {
      middle_box_screen.insertAdjacentHTML(
        "afterbegin",
        `<div class='flex flex-hozi-center flex-space-auto fs-21 border-style-2'><div class='color-red-2 fw-500'>${title}</div><div class='color-white'onclick='middleBoxScreen()'>X</div></div>`
      );
      middle_box_screen.insertAdjacentHTML(
        "beforeend",
        elem_html ? elem_html.innerHTML : content
      );
      middle_box_screen.style.display = "block";
      middle_box_screen.middleWindow();

    }
  }
}
function viewFullImage(event) {
  const event_clone = event.cloneNode(false);
  event_clone.removeAttribute("onload");
  const event_clone_to_view = event_clone.cloneNode(false);
  const elem_cover = document.createElement("div");
  elem_cover.classList.add("view-full-image");
  const button_view = document.createElement("div");
  button_view.textContent = "Click To View";

  button_view.classList.add("button-view");
  elem_cover.addEventListener("click", function() {
      let html = document.createElement("div");
      html.style = "position:fixed;width:100%;height:100%;background:#000;top: 0;z-index:20;display: flex;justify-content: center;align-items: center;";
      // console.log(event_clone_to_view);
      event_clone_to_view.removeAttribute("width");
      event_clone_to_view.removeAttribute("height");
      event_clone_to_view.style = "max-height:100%;max-width: 100%";
      html.appendChild(event_clone_to_view);
      html.addEventListener("click", function() {
          this.remove();
      })
      document.body.appendChild(html);
  })
  elem_cover.appendChild(event_clone);
  elem_cover.appendChild(button_view);

  event.insertAdjacentElement("beforebegin", elem_cover);
  const button_style_top = (elem_cover.clientHeight - button_view.clientHeight) / 2;
  const button_style_left = (elem_cover.clientWidth - button_view.clientWidth) / 2;
  button_view.style = `top:${button_style_top}px;left:${button_style_left}px`;
  event.remove();
}
function getParam($name) {
  return parseInt(new URL(window.location.href).searchParams.get($name));
}
function visitedNoti() {
  const notifcation_id = getParam("notif_id") || null;
  if (notifcation_id != null) {
    axios
      .post("/api", {
        action: "visited_noti",
        notif_id: notifcation_id,
      })
      .then((rps) => {
        console.log(rps.data);
      });
  }
}
function goPage(max_page) {
  var _input_go_page = document.getElementById("go_page");
  var _value_input_this = _input_go_page.value;
  var _url_go = document
    .getElementsByClassName("active_page")[0]
    .getAttribute("href");
  if (!_value_input_this) {
    alert("Vui lòng nhập số page cần đến");
    return false;
  }
  if (_value_input_this > max_page) {
    alert("Danh sách phim này giới hạn " + max_page);
  } else if (_value_input_this < 1) {
    alert("Không nhập số page cần đến < hơn 1");
  } else {
    _url_go = _url_go.replace(/trang-[0-9]+/, "trang-" + _value_input_this);
    window.location.href = _url_go;
  }
}
function replaceEmojis(str) {
  return str.replace(
    /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g,
    (m, idx) => `&#x${m.codePointAt(0).toString(16)};`
  );
}

function CFirm(text = "Rỗng") {
  return confirm(text);
}

function toggleGoPage() {
  var input_go_page = document.getElementsByClassName("go_page")[0];
  if (input_go_page.style.display == "none") {
    input_go_page.style.display = "flex";
  } else {
    input_go_page.style.display = "none";
  }
}

function execDelay(callback, time_out = 3000) {
  var x = 0;
  return new Promise(function (resolve, reject) {
    setTimeout(() => {
      resolve(1);
    }, time_out);
  }).then(function () {
    callback();
  });
}
async function securityCode() {
  await axios.get("/token.php").then((rps) => {
    $dt.token = rps.data.token;
  });
}
function removeLoading(element) {
  element.classList.remove("loading-cover");
}
function addLoading(element) {
  element.classList.add("loading-cover");
}
function addStr(str, index, stringToAdd) {
  return (
    str.substring(0, index) + stringToAdd + str.substring(index, str.length)
  );
}
function loadingSpinner() {
  var div_1 = document.createElement("div");
  div_1.classList.add("ah_loading");
  var div_2 = document.createElement("div");
  div_2.classList.add("lds-ellipsis");
  div_2.innerHTML = "<div></div><div></div><div></div><div></div>";
  div_1.appendChild(div_2);
  return div_1;
}

function getListEmoji() {
  axios.get("/themes/json/list-emoji-replace.json").then((rps) => {
    $dt.code_emoji = rps.data;
  });
}

(function () {
  getListEmoji();
  window.addEventListener("DOMContentLoaded", (e) => {
    setupTab();
    visitedNoti();

    const message_line = document.getElementById("message-line");
    if (message_line != null) {
      message_line.scrollIntoView(false);
    }
  });
})();



// ============================================================
// NOTIFICATION MODULE (dropdown + page)
// ============================================================
var NotiModule = (function () {
  var _cache    = null;   // null → chưa load
  var _loading  = false;
  var _filter   = 'all';
  var _hasMore  = false;
  var _lastId   = 0;

  /* Xóa badge thông báo trên header */
  function _hideBadge() {
    var badge = document.getElementById('noti-badge');
    badge && badge.remove();
  }

  /* ── Skeleton HTML ─────────────────────────────── */
  function skeletons(n) {
    var h = '<div class="noti-skeleton-wrap">';
    for (var i = 0; i < n; i++) {
      h += '<div class="noti-skeleton">'
        +    '<div class="noti-skeleton__icon"></div>'
        +    '<div class="noti-skeleton__avatar"></div>'
        +    '<div class="noti-skeleton__body">'
        +      '<div class="noti-skeleton__line"></div>'
        +      '<div class="noti-skeleton__line noti-skeleton__line--short"></div>'
        +      '<div class="noti-skeleton__line noti-skeleton__line--tiny"></div>'
        +    '</div>'
        +  '</div>';
    }
    return h + '</div>';
  }

  /* ── Render 1 item ──────────────────────────────── */
  function renderItem(item) {
    var unreadClass = item.visited ? '' : ' noti-item--unread';
    var typeFilter  = 'data-type="' + item.type + '"';
    var dot         = item.visited ? '' : '<div class="noti-item__dot"></div>';
    var img         = item.image
      ? '<img src="' + escHtml(item.image) + '" alt="" onerror="this.src=\'/themes/img/avatar/0.jpg\'">'
      : '<img src="/themes/img/avatar/0.jpg" alt="">';

    return '<a class="noti-item' + unreadClass + '" href="' + escHtml(item.href) + '"'
      + ' data-id="' + item.notif_id + '" ' + typeFilter
      + ' onclick="NotiModule.visit(' + item.notif_id + ',event)">'
      +   '<div class="noti-item__icon" style="background:' + escHtml(item.type_color) + '">'
      +     '<span class="material-icons-round">' + escHtml(item.type_icon) + '</span>'
      +   '</div>'
      +   '<div class="noti-item__avatar">' + img + '</div>'
      +   '<div class="noti-item__body">'
      +     '<div class="noti-item__title">' + item.title + '</div>'
      +     '<div class="noti-item__content">' + escHtml(item.content) + '</div>'
      +     '<div class="noti-item__meta">'
      +       '<span class="noti-item__type-label">' + escHtml(item.type_label) + '</span>'
      +       '<span class="noti-item__time">' + escHtml(item.time_text) + '</span>'
      +     '</div>'
      +   '</div>'
      +   dot
      + '</a>';
  }

  /* ── Fetch from API ─────────────────────────────── */
  async function fetchItems(idLoadMore) {
    var res = await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load_noti_json', id_load_more: idLoadMore || 0 }),
      credentials: 'same-origin'
    });
    return res.json();
  }

  /* ── Render to container ────────────────────────── */
  function renderTo(el, items, append) {
    if (!el) return;
    if (!append) el.innerHTML = '';
    if (!items || !items.length) {
      if (!append) {
        el.innerHTML = '<div class="noti-empty-state">'
          + '<span class="material-icons-round">notifications_none</span>'
          + '<span>Không có thông báo nào</span></div>';
      }
      return;
    }
    var html = '';
    items.forEach(function (item) { html += renderItem(item); });
    el.insertAdjacentHTML('beforeend', html);
    applyFilter(el, _filter);
  }

  /* ── Apply filter to existing items ────────────── */
  function applyFilter(el, filter) {
    if (!el) return;
    el.querySelectorAll('.noti-item').forEach(function (el) {
      if (filter === 'all' || el.dataset.type === filter) {
        el.classList.remove('noti-item--hidden');
      } else {
        el.classList.add('noti-item--hidden');
      }
    });
  }

  function escHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    /* Called when bell is clicked */
    open: function () {
      var el = document.getElementById('noti-list-dropdown');
      if (!el) return;
      if (_cache !== null) {
        applyFilter(el, _filter);
        _hideBadge();
        fetch('/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_all_read' }),
          credentials: 'same-origin'
        });
        return;
      }
      if (_loading) return;
      _loading = true;
      el.innerHTML = skeletons(5);
      fetchItems(0).then(function (data) {
        _loading = false;
        if (!data.ok) { el.innerHTML = '<div class="noti-empty-state"><span>Không tải được thông báo</span></div>'; return; }
        _cache   = data.items || [];
        _hasMore = data.has_more;
        _lastId  = _cache.length ? _cache[_cache.length - 1].notif_id : 0;
        _hideBadge();
        renderTo(el, _cache, false);
      }).catch(function () {
        _loading = false;
        el.innerHTML = '<div class="noti-empty-state"><span>Lỗi tải thông báo</span></div>';
      });
    },

    /* Filter tabs */
    filter: function (type) {
      _filter = type;
      document.querySelectorAll('.noti-tab').forEach(function (b) {
        b.classList.toggle('active', b.dataset.filter === type);
      });
      var el = document.getElementById('noti-list-dropdown')
            || document.getElementById('noti-list-page');
      applyFilter(el, type);
    },

    /* Mark all read */
    markAll: function () {
      fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
        credentials: 'same-origin'
      }).then(function () {
        _hideBadge();
        document.querySelectorAll('.noti-item--unread').forEach(function (el) {
          el.classList.remove('noti-item--unread');
        });
        document.querySelectorAll('.noti-item__dot').forEach(function (d) { d.remove(); });
        if (_cache) _cache.forEach(function (i) { i.visited = 1; });
      });
    },

    /* Mark single visited */
    visit: function (id, e) {
      if (id) {
        fetch('/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'visited_noti', notif_id: id }),
          credentials: 'same-origin'
        });
        var el = document.querySelector('[data-id="' + id + '"]');
        el && el.classList.remove('noti-item--unread');
        el && el.querySelector('.noti-item__dot') && el.querySelector('.noti-item__dot').remove();
      }
    },

    /* Load more for full page */
    loadMore: function (targetId, idLoadMore) {
      if (_loading) return;
      _loading = true;
      var el = document.getElementById(targetId);
      if (!el) { _loading = false; return; }
      var sentinel = document.getElementById('noti-sentinel');
      sentinel && (sentinel.style.display = 'flex');
      fetchItems(idLoadMore).then(function (data) {
        _loading = false;
        sentinel && (sentinel.style.display = 'none');
        if (!data.ok || !data.items || !data.items.length) {
          sentinel && sentinel.remove(); return;
        }
        _hasMore = data.has_more;
        _lastId  = data.items[data.items.length - 1].notif_id;
        if (!_hasMore) sentinel && sentinel.remove();
        renderTo(el, data.items, true);
        applyFilter(el, _filter);
        _hideBadge();
      }).catch(function () { _loading = false; });
    },

    /* Invalidate cache */
    invalidateCache: function () { _cache = null; },

    /* Expose for full-page use */
    getLastId: function () { return _lastId; },
    hasMore:   function () { return _hasMore; }
  };
})();
