// ── Ad-block detection placeholder (disabled for localhost dev) ──────────────
var detect_ad_block = false;

$elem.report_error = document.getElementById("report_error");
const dataHistory = {
  movie_id: $info_data.movie_id,
  no_ep: $info_data.no_ep,
  id: $info_data.id,
  time: new Date().getTime(),
};
const local_store = localStorage.getItem("data_history");
const data_history_store = local_store ? JSON.parse(local_store) : [];

function checkHistory() {
  var _index_this_movie = data_history_store.indexOf($info_data.movie_id);
  return _index_this_movie;
}

function saveHistory() {
  var _data_push = data_history_store;
  if (local_store !== null) {
    if (_data_push.length > 100) {
      _data_push.splice(0, 1);
    }
    _data_push = _data_push.filter(
      (item) => item.movie_id != dataHistory.movie_id
    );
  }
  _data_push.push(dataHistory);
  localStorage.setItem("data_history", JSON.stringify(_data_push));
}
function _escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function getNewestEpIsReaded() {
  if (data_history_store.length > 0) {
    const exist_in_store = data_history_store.findIndex(
      (item) => item.movie_id == $info_data.movie_id
    );
    if (exist_in_store > -1) {
      const insert_on_elem = document.getElementById("newest-ep-is-readed");
      const no_ep_is_readed = String(data_history_store[exist_in_store].no_ep || '').replace(/[^0-9A-Za-z.\-]/g, '');
      const id_ep_is_readed = parseInt(data_history_store[exist_in_store].id, 10) || 0;

      let full_url_ep = window.location.href;
      full_url_ep = full_url_ep.replace(
        /tap-([0-9A-Za-z]*)-([0-9]*)/gi,
        function (a, b, c) {
          b = no_ep_is_readed;
          c = id_ep_is_readed;
          return `tap-${b}-${c}`;
        }
      );
      insert_on_elem.innerHTML = `Lần trước xem <a href="${_escHtml(full_url_ep)}" class="color-yellow fw-500">tập ${_escHtml(no_ep_is_readed)}</a>`;
    }
  }
}
function Waiting() {
  Toast({ message: "Hệ thống đang xử lý, vui lòng đợi", type: "warning" });
}

function reportError() {
  var _el_report_error = document.getElementById("episode_error");
  if (
    _el_report_error.style.display == "none" ||
    !_el_report_error.style.display
  ) {
    _el_report_error.style.display = "block";
    _el_report_error.style.textAlign = "center";
  } else {
    _el_report_error.style.display = "none";
  }
}

function initEventListen() {
  $elem.report_error.addEventListener("click", function () {
    reportError();
  });
  $elem.refresh_comments.addEventListener("click", function () {
    loadComments({ refresh_click: true });
  });
  //
  var _toggleLight = document.getElementById("toggle-light");
  _toggleLight.addEventListener("click", function (e) {
    let toggle_light_this = this;
    var _html = document.createElement("div");
    _html.classList.add("light-off");
    if (!this.classList.contains("active")) {
      this.classList.add("active");
      document.body.appendChild(_html);
      let _video_player = document.getElementById("video-player");
      window.scrollTo(0, _video_player.offsetTop);
      this.innerHTML =
        '<span class="material-icons-round">wb_sunny</span> Light';

      _html.addEventListener("click", function () {
        _html.remove();
        toggle_light_this.innerHTML =
        '<span class="material-icons-round">nightlight</span> Night';
        toggle_light_this.classList.remove("active");
      });
    } else {
      this.innerHTML =
        '<span class="material-icons-round">nightlight</span> Night';
      this.classList.remove("active");
      document.getElementsByClassName("light-off")[0].remove();
    }
  });
}
function afsEvent(e) {
  if (detect_ad_block) {
    Toast({
      message: "Bỏ chặn quảng cáo để sử dụng tính năng",
      type: "error",
    });
    return false;
  }
  if (e.currentTarget.checked) {
    $cookie.setItem("afs_on", 1, 82000, "/");
    getElem("auto-full-screen", "class")[0].setAttribute("checked", "");
  } else {
    $cookie.setItem("afs_on", 0, 1, "/");
    getElem("auto-full-screen", "class")[0].removeAttribute("checked");
  }
  Toast({
    message: "Đã lưu cài đặt",
    type: "success",
  });
}

function atonmEvent(e) {
  if (detect_ad_block) {
    Toast({
      message: "Bỏ chặn quảng cáo để sử dụng tính năng",
      type: "error",
    });
    return false;
  }
  if (!$user.is_vip) {
    Toast({
      message: "Yêu cầu là thành viên VIP",
      type: "error",
    });
    return false;
  }
  if (e.currentTarget.checked) {
    $cookie.setItem("atonm_on", 1, 82000, "/");
    getElem("auto-turn-on-night-mode", "class")[0].setAttribute("checked", "");
  } else {
    $cookie.setItem("atonm_on", 0, 1, "/");
    getElem("auto-turn-on-night-mode", "class")[0].removeAttribute("checked");
  }
  Toast({
    message: "Đã lưu cài đặt",
    type: "success",
  });
}

function aoneEvent() {
  let switch_aone_raw = getElem("aone-on", "class")[0];

  let switch_aone = getElem("aone-on", "class")[1];
  if (switch_aone.classList.contains("display-none")) {
    switch_aone.classList.remove("display-none");
    switch_aone.classList.add("flex");
    $cookie.setItem("aone_event", 1, 82000, "/");
    //
    switch_aone_raw.classList.remove("display-none");
    switch_aone_raw.classList.add("flex");
    getElem("auto-open-next-ep", "class")[0].setAttribute("checked", "");
  } else {
    switch_aone.classList.add("display-none");
    $cookie.setItem("aone_event", 0, 1, "/");
    //
    switch_aone_raw.classList.add("display-none");
    getElem("auto-open-next-ep", "class")[0].removeAttribute("checked");
  }
}

function aoneMin(e) {
  if (detect_ad_block) {
    Toast({
      message: "Bỏ chặn quảng cáo để sử dụng tính năng",
      type: "error",
    });
    return false;
  }
  getElem("aone-min", "name")[0].setAttribute("value", e.currentTarget.value);
  $cookie.setItem("aone_min", e.currentTarget.value, 82000, "/");
  setAoneTime();
  Toast({
    message: "Đã lưu cài đặt",
    type: "success",
  });
}

function aoneSec(e) {
  if (detect_ad_block) {
    Toast({
      message: "Bỏ chặn quảng cáo để sử dụng tính năng",
      type: "error",
    });
    return false;
  }
  getElem("aone-sec", "name")[0].setAttribute("value", e.currentTarget.value);
  $cookie.setItem("aone_sec", e.currentTarget.value, 82000, "/");
  setAoneTime();
  Toast({
    message: "Đã lưu cài đặt",
    type: "success",
  });
}
// skip op
function skipOpEvent() {
  let switch_skip_op_raw = getElem("turn-on-skip-op", "class")[0];

  let switch_skip_op = getElem("turn-on-skip-op", "class")[1];
  if (switch_skip_op.classList.contains("display-none")) {
    switch_skip_op.classList.remove("display-none");
    switch_skip_op.classList.add("flex");
    $cookie.setItem("skip_op", 1, 82000, "/");
    //
    switch_skip_op_raw.classList.remove("display-none");
    switch_skip_op_raw.classList.add("flex");
    getElem("skip-op", "class")[0].setAttribute("checked", "");
  } else {
    switch_skip_op.classList.add("display-none");
    $cookie.setItem("skip_op", 0, 1, "/");
    //
    switch_skip_op_raw.classList.add("display-none");
    getElem("skip-op", "class")[0].removeAttribute("checked");
  }
}

function skipOpMin(e) {
  if (detect_ad_block) {
    Toast({
      message: "Bỏ chặn quảng cáo để sử dụng tính năng",
      type: "error",
    });
    return false;
  }
  getElem("skip-op-min", "name")[0].setAttribute("value", e.currentTarget.value);
  $cookie.setItem("skip_op_min", e.currentTarget.value, 82000, "/");
  setAoneTime();
  Toast({
    message: "Đã lưu cài đặt",
    type: "success",
  });
}

function skipOpSec(e) {
  if (detect_ad_block) {
    Toast({
      message: "Bỏ chặn quảng cáo để sử dụng tính năng",
      type: "error",
    });
    return false;
  }
  getElem("skip-op-sec", "name")[0].setAttribute("value", e.currentTarget.value);
  $cookie.setItem("skip_op_sec", e.currentTarget.value, 82000, "/");
  setAoneTime();
  Toast({
    message: "Đã lưu cài đặt",
    type: "success",
  });
}
//
document.addEventListener("DOMContentLoaded", function (event) {
  getNewestEpIsReaded();
  saveHistory();
  Observer("comments", loadComments);
  initEventListen();
  if ($user.id) {
    $elem.frame_comment.appendChild(frameComment());
    new FgEmojiPicker({
      trigger: [".add-emoji"],
      position: ["bottom", "right"],
      emit(obj, triggerElement) {
        var _emoji = obj.emoji;
        var _content = $elem.content_comment;
        _content.value = addStr(_content.value, $position_selection, _emoji);
      },
    });
  }
});
