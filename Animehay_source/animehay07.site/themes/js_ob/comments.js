// ── Global elements ────────────────────────────────────────────────────────────
$elem.frame_comment    = document.getElementById("frame-comment");
$elem.content_comment  = null;
$elem.add_comment      = null;
$elem.refresh_comments = document.getElementById("refresh-comments");
$elem.comments         = document.getElementById("comments");

var $position_selection = 0;
var $flag = { a: true, b: true, d: true, e: true };

// ── Emoji replacement ──────────────────────────────────────────────────────────
function replaceWithEmoji(str) {
  var _regexp = $dt.code_emoji.map(function (item) { return item.text; }).join("|");
  _regexp = new RegExp("(" + _regexp + ")", "g");
  return str.replace(_regexp, function (text) {
    return $dt.code_emoji.filter((item) => text == item.text)[0].replace;
  });
}

// ── Track currently open reply frame ─────────────────────────────────────
var _activeReplyId = null;

// ── Comment options dropdown ───────────────────────────────────────────────
var _openDropId = null;

function cmtToggleDrop(btn) {
  var dropId = btn.getAttribute('data-drop');
  var drop   = document.getElementById(dropId);
  if (!drop) return;

  // Đang mở → đóng lại
  if (_openDropId === dropId) {
    cmtCloseDrop();
    return;
  }

  // Đóng dropdown cũ nếu có
  cmtCloseDrop();

  drop.classList.add('open');
  _openDropId = dropId;
}

function cmtCloseDrop() {
  if (_openDropId) {
    var prev = document.getElementById(_openDropId);
    if (prev) prev.classList.remove('open');
    _openDropId = null;
  }
}

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', function (e) {
  if (_openDropId && !e.target.closest('.cmt-card__options')) {
    cmtCloseDrop();
  }
}, true);


// ── Reply frame ────────────────────────────────────────────────────────────────
function showFrameReplyComment(reply_comment_id, text_content, reply_user_id, hash) {
  var _containerId = "toggle_frame_comment_" + reply_comment_id;
  var _container   = document.getElementById(_containerId);
  if (!_container) return;

  // ── Close logic: same button clicked again → toggle off ──────────────────
  if (_activeReplyId === reply_comment_id) {
    _container.innerHTML = "";
    _activeReplyId = null;
    return;
  }

  // ── Close any previously open reply frame ────────────────────────────────
  if (_activeReplyId !== null) {
    var _prev = document.getElementById("toggle_frame_comment_" + _activeReplyId);
    if (_prev) _prev.innerHTML = "";
  }
  _activeReplyId = reply_comment_id;

  // ── Build & inject the editor ─────────────────────────────────────────────
  _container.innerHTML = "";
  var _node = frameComment({
    reply_comment_id,
    text_content: "@" + text_content + " ",
    reply_user_id,
    hash,
  });
  _container.appendChild(_node);

  // Mark container for entrance animation
  _container.classList.add("reply-frame--animate");
  setTimeout(function () { _container.classList.remove("reply-frame--animate"); }, 600);

  // ── Smooth scroll: account for sticky header height ──────────────────────
  var _header       = document.querySelector(".ah-navbar") || document.querySelector("header");
  var _headerHeight = _header ? _header.getBoundingClientRect().height : 60;
  var _extra        = 16; // breathing room
  var _rect         = _container.getBoundingClientRect();
  var _scrollTarget = window.pageYOffset + _rect.top - _headerHeight - _extra;

  window.scrollTo({ top: _scrollTarget, behavior: "smooth" });

  // ── Focus textarea & place cursor at end ─────────────────────────────────
  var _textarea = _container.querySelector(".content-of-comment");
  if (_textarea) {
    // Wait for scroll before focusing to avoid layout jank
    setTimeout(function () {
      _textarea.focus({ preventScroll: true });
      var len = _textarea.value.length;
      _textarea.setSelectionRange(len, len);
    }, 350);
  }
}


// ── Edit frame ────────────────────────────────────────────────────────────────
function showFrameEditComment(id_comment, type_comment) {
  var _elemId = type_comment === "comment_reply"
    ? "reply_"   + id_comment
    : "comment_" + id_comment;
  var _orig = document.getElementById(_elemId);
  if (!_orig) return;

  // If an edit frame already exists right after this element, cancel it (toggle)
  var _existing = _orig.nextElementSibling;
  if (_existing && _existing.classList.contains("comment-editor") &&
      _existing.dataset.editTarget === _elemId) {
    _orig.style.display = "";
    _existing.remove();
    return;
  }

  // ── Grab the raw text content from the card ───────────────────────────────
  var _contentEl  = _orig.querySelector(".cmt-card__content") ||
                    _orig.querySelector(".content");
  var _rawContent = _contentEl ? _contentEl.innerText.trim() : "";

  // ── Hide original card ──────────────────────────────────────────────────
  _orig.style.display = "none";

  // ── Build editor ────────────────────────────────────────────────────────
  var _editorNode = frameComment({
    type_editor:  "edit_comment",
    id_comment,
    type_comment,
    text_content: _rawContent,
  });
  // Tag the editor so we can detect toggle
  _editorNode.dataset.editTarget = _elemId;

  _orig.insertAdjacentElement("afterend", _editorNode);

  // ── Scroll editor into view (offset sticky header) ───────────────────────
  var _header       = document.querySelector(".ah-navbar") || document.querySelector("header");
  var _headerHeight = _header ? _header.getBoundingClientRect().height : 60;
  var _rect         = _editorNode.getBoundingClientRect();
  var _scrollTarget = window.pageYOffset + _rect.top - _headerHeight - 12;
  window.scrollTo({ top: _scrollTarget, behavior: "smooth" });

  // ── Focus + place cursor at end ───────────────────────────────────────
  var _ta = _editorNode.querySelector(".content-of-comment");
  if (_ta) {
    setTimeout(function () {
      _ta.focus({ preventScroll: true });
      var len = _ta.value.length;
      _ta.setSelectionRange(len, len);
    }, 320);
  }
}


// ── Character counter ──────────────────────────────────────────────────────────
function updateCharCounter(textarea, counterEl) {
  var len = textarea.value.length;
  var max = parseInt(textarea.getAttribute("maxlength")) || 2000;
  counterEl.textContent = len + "/" + max;
  counterEl.classList.toggle("warn",   len > max * 0.8);
  counterEl.classList.toggle("danger", len > max * 0.95);
}

// ── Comment editor builder ─────────────────────────────────────────────────────
function frameComment(item) {
  item = item || {};
  var _reply_comment_id = item.reply_comment_id || 0,
      _text_content     = item.text_content     || null,
      _type_editor      = item.type_editor      || null,
      _id_comment       = item.id_comment       || 0,
      _hash             = item.hash             || 0,
      _type_comment     = item.type_comment     || null,
      _reply_user_id    = item.reply_user_id    || 0;

  var _comment_editor = document.createElement("div");
  _comment_editor.classList.add("comment-editor");

  // Textarea
  var _content_comment = document.createElement("textarea");
  _content_comment.classList.add("content-of-comment");
  _content_comment.setAttribute("placeholder", "Nhập bình luận của bạn tại đây...");
  _content_comment.setAttribute("rows", "3");
  _content_comment.setAttribute("maxlength", "2000");
  _content_comment.value = _text_content != null ? _text_content : "";
  $elem.content_comment = _content_comment;

  // Auto-resize
  function autoResize() {
    _content_comment.style.height = "auto";
    _content_comment.style.height = Math.min(_content_comment.scrollHeight, 280) + "px";
  }
  _content_comment.addEventListener("input", function () {
    $elem.content_comment = this;
    this.value = replaceWithEmoji(this.value);
    $position_selection = this.selectionEnd;
    autoResize();
    updateCharCounter(this, _char_counter);
  });
  _content_comment.addEventListener("mouseup", function () {
    $position_selection = this.selectionEnd;
    $elem.content_comment = this;
  });
  _content_comment.addEventListener("focus", function () {
    $elem.content_comment = this;
  });

  // Toolbar
  var _tool_bar       = document.createElement("div");
  var _tool_bar_left  = document.createElement("div");
  var _tool_bar_right = document.createElement("div");
  _tool_bar.classList.add("tool-bar");

  // Emoji button
  var _add_emoji = document.createElement("div");
  _add_emoji.classList.add("add-emoji", "button-default", "color-white");
  _add_emoji.innerHTML = '<span class="material-icons-round">emoji_emotions</span>';
  _add_emoji.addEventListener("click", function () {
    $elem.content_comment = _content_comment;
  });

  // Char counter — initialise with current text length
  var _char_counter = document.createElement("span");
  _char_counter.classList.add("cmt-char-counter");
  // Set initial count based on pre-filled text
  (function initCounter() {
    var len = _content_comment.value.length;
    _char_counter.textContent = len + "/2000";
    _char_counter.classList.toggle("warn",   len > 1600);
    _char_counter.classList.toggle("danger", len > 1900);
    // Trigger resize to match content
    _content_comment.style.height = "auto";
    _content_comment.style.height = Math.min(_content_comment.scrollHeight, 280) + "px";
  })();

  // Submit button
  var _add_comment     = document.createElement("div");
  var _element_comment = _type_comment == "comment_reply"
    ? "reply_" + _id_comment
    : "comment_" + _id_comment;

  switch (_type_editor) {
    case "edit_comment":
      var _cancel_edit = document.createElement("div");
      _cancel_edit.classList.add("button-default", "color-white");
      _cancel_edit.textContent = "Huỷ";
      _tool_bar_right.appendChild(_cancel_edit);
      _cancel_edit.addEventListener("click", function () {
        var orig = document.getElementById(_element_comment);
        if (orig) orig.style.display = "";
        _comment_editor.remove();
      });
      _add_comment.classList.add("add-comment", "bg-blue", "color-white");
      _add_comment.textContent = "Lưu";
      _add_comment.addEventListener("click", function () {
        var newContent = _content_comment.value.trim();
        if (!newContent) {
          Toast({ message: "Nội dung không được để trống", type: "error" });
          return;
        }
        // Loading state
        var _origLabel = _add_comment.textContent;
        _add_comment.disabled = true;
        _add_comment.innerHTML = '<span class="material-icons-round" style="animation:spin 1s linear infinite;font-size:14px">autorenew</span>';

        editComment({
          content:      newContent,
          id_comment:   _id_comment,
          type_comment: _type_comment,
          orig_elem:    document.getElementById(_element_comment),
          editor_elem:  _comment_editor,
        }).finally(function () {
          _add_comment.disabled = false;
          _add_comment.innerHTML = _origLabel;
        });
      });
      break;
    default:
      _add_comment.classList.add("add-comment", "color-white");
      _add_comment.textContent = "Gửi";
      _add_comment.addEventListener("click", function () {
        if (_reply_comment_id) _comment_editor.remove();
        addComment({
          content:          _content_comment.value,
          reply_comment_id: _reply_comment_id,
          reply_user_id:    _reply_user_id,
          hash:             _hash,
          element: {
            add_comment:    _add_comment,
            content_comment: _content_comment,
          },
        });
      });
  }

  _tool_bar_left.appendChild(_add_emoji);
  _tool_bar_left.appendChild(_char_counter);
  _tool_bar_right.appendChild(_add_comment);
  _tool_bar.appendChild(_tool_bar_left);
  _tool_bar.appendChild(_tool_bar_right);
  _comment_editor.appendChild(_content_comment);
  _comment_editor.appendChild(_tool_bar);
  return _comment_editor;
}

// ── Add comment ────────────────────────────────────────────────────────────────
async function addComment(item) {
  item = item || {};
  var _content          = item.content          || "",
      _element          = item.element          || null,
      _hash             = item.hash             || null,
      _reply_comment_id = item.reply_comment_id || 0,
      _reply_user_id    = item.reply_user_id    || 0;

  if (!_element) return;
  addLoading(_element.add_comment);
  _content = String(_content);
  _content = replaceEmojis(_content);
  await securityCode();
  if ($flag.a) {
    $flag.a = false;
    await axios.post("/api", {
      action:           "add_comment",
      movie_id:         $info_data.movie_id,
      content:          JSON.stringify(_content),
      reply_comment_id: _reply_comment_id,
      reply_user_id:    _reply_user_id,
      hash:             _hash,
      token:            $dt.token,
    }).then((rps) => {
      var _data = rps.data;
      if (_data.status == "success") {
        _element.content_comment.value = "";
        if (_reply_comment_id) {
          var fb = document.getElementById("feedback_" + _reply_comment_id);
          if (fb) fb.insertAdjacentHTML("beforeend", _data.comment);
          // Clean up reply frame & reset tracker
          var _replyContainer = document.getElementById("toggle_frame_comment_" + _reply_comment_id);
          if (_replyContainer) _replyContainer.innerHTML = "";
          _activeReplyId = null;
        } else {
          $elem.comments.insertAdjacentHTML("afterbegin", _data.comment);
        }
        // Remove empty state if present
        var empty = $elem.comments.querySelector(".cmt-empty");
        if (empty) empty.remove();
        Toast({ message: _data.result, type: "success" });
      } else {
        Toast({ message: _data.result, type: "error" });
      }
    }).catch(() => {
      Toast({ message: "Lỗi kết nối, vui lòng thử lại", type: "error" });
    });
    $flag.a = true;
  } else {
    Toast({ message: "Hệ thống đang xử lý, vui lòng đợi", type: "warning" });
  }
  removeLoading(_element.add_comment);
}

// ── Edit comment (dedicated, no CFirm) ────────────────────────────────────────
var $flag_edit = true;
async function editComment(item) {
  item = item || {};
  var _content      = item.content      || "",
      _id_comment   = item.id_comment,
      _type_comment = item.type_comment  || null,
      _orig_elem    = item.orig_elem    || null,
      _editor_elem  = item.editor_elem  || null;

  if (!$flag_edit) {
    Toast({ message: "Hệ thống đang xử lý, vui lòng đợi", type: "warning" });
    return;
  }
  $flag_edit = false;

  var _processed = replaceEmojis(String(_content));

  try {
    await securityCode();
    var rps = await axios.post("/api", {
      action:       "option_comment",
      perform:      "edit",
      content:      JSON.stringify(_processed),
      type_comment: _type_comment,
      id_comment:   _id_comment,
      token:        $dt.token,
    });
    var _data = rps.data;
    if (_data.status === "success") {
      // Update DOM only after confirmed success
      if (_orig_elem) {
        var _c = _orig_elem.querySelector(".cmt-card__content") ||
                 _orig_elem.querySelector(".content");
        if (_c) _c.innerText = _content;
        // Show "edited" badge if not already present
        var _footer = _orig_elem.querySelector(".cmt-card__footer");
        if (_footer && !_orig_elem.querySelector(".cmt-card__edited")) {
          var _badge = document.createElement("span");
          _badge.className = "cmt-card__edited";
          _badge.textContent = "· đã chỉnh sửa";
          _footer.appendChild(_badge);
        }
        _orig_elem.style.display = "";
      }
      if (_editor_elem) _editor_elem.remove();
      Toast({ message: _data.result || "Lưu thành công", type: "success" });
    } else {
      Toast({ message: _data.result || "Lưu thất bại", type: "error" });
      // Restore original card so user doesn't lose content
      if (_orig_elem) _orig_elem.style.display = "";
      if (_editor_elem) _editor_elem.remove();
    }
  } catch (e) {
    Toast({ message: "Lỗi kết nối, vui lòng thử lại", type: "error" });
    if (_orig_elem) _orig_elem.style.display = "";
    if (_editor_elem) _editor_elem.remove();
  }
  $flag_edit = true;
}

// ── Option comment (hide only) ─────────────────────────────────────────────────
async function optionComment(item) {
  item = item || {};
  var _type_comment = item.type_comment || null,
      _id_comment   = item.id_comment,
      _perform      = item.perform      || null;

  // Only handle hide; edit is now handled by editComment()
  if (_perform !== "hide") return;

  var confirm = CFirm("Bạn chắc muốn ẩn bình luận này?");
  if (!confirm) return false;

  if ($flag.d) {
    $flag.d = false;
    await securityCode();
    await axios.post("/api", {
      action:       "option_comment",
      perform:      "hide",
      type_comment: _type_comment,
      id_comment:   _id_comment,
      token:        $dt.token,
    }).then((rps) => {
      var _data   = rps.data,
          _status = _data.status,
          _result = _data.result;
      if (_status === "success") {
        var _elemId = _type_comment === "comment_reply"
          ? "reply_"   + _id_comment
          : "comment_" + _id_comment;
        var _el = document.getElementById(_elemId);
        var _fb = document.getElementById("feedback_" + _id_comment);
        if (_el) _el.remove();
        if (_fb) _fb.remove();
        Toast({ message: _result, type: "success" });
      } else {
        Toast({ message: _result, type: "error" });
      }
    }).catch(() => {
      Toast({ message: "Lỗi kết nối", type: "error" });
    });
    $flag.d = true;
  }
}

// ── MOD: Ẩn / Hiện comment trực tiếp ─────────────────────────────────────────
async function modToggleComment(comment_id, type_comment) {
  var cmt_type = (type_comment === 'comment_reply') ? 'comment_reply' : 'comment_main';
  try {
    var rps = await axios.post('/api', {
      action:       'mod_hide_comment',
      comment_id:   comment_id,
      comment_type: cmt_type,
      mod_action:   'toggle',
    });
    var data = rps.data || {};
    if (!data.ok) {
      Toast({ message: data.msg || 'Thao tác thất bại', type: 'error' });
      return;
    }
    var elemId = (type_comment === 'comment_reply') ? 'reply_' + comment_id : 'comment_' + comment_id;
    var el = document.getElementById(elemId);
    if (el) {
      if (data.hidden) {
        el.classList.add('cmt-card--mod-hidden');
        Toast({ message: '[MOD] Đã ẩn bình luận', type: 'success' });
      } else {
        el.classList.remove('cmt-card--mod-hidden');
        Toast({ message: '[MOD] Đã hiện lại bình luận', type: 'success' });
      }
    }
  } catch(e) {
    Toast({ message: 'Lỗi kết nối', type: 'error' });
  }
}






// ── Load comments ──────────────────────────────────────────────────────────────
async function loadComments(item) {
  item = item || {};
  if (!$flag.b) {
    Toast({ message: "Hệ thống đang xử lý, vui lòng đợi", type: "warning" });
    return;
  }
  $flag.b = false;

  var _id_load_more     = item.id_load_more     || 0,
      _reply_comment_id = item.reply_comment_id || 0,
      _element_append   = item.element_append   || null,
      _ref_noti         = item.ref_noti         || false,
      _get_type         = item.get_type         || "older",
      _limit            = item.limit            || 6,
      _refresh_click    = item.refresh_click    || null;

  if (_refresh_click) $elem.comments.innerHTML = "";

  // Show spinner (loadingSpinner() JS returns HTMLElement, not string)
  var _loading_spinner = loadingSpinner();
  if (_element_append) {
    _element_append.insertAdjacentElement("afterend", _loading_spinner);
  } else {
    $elem.comments.appendChild(_loading_spinner);
  }

  await securityCode();
  await axios.post("/api", {
    action:           "load_comments",
    movie_id:         $info_data.movie_id,
    id_load_more:     _id_load_more,
    reply_comment_id: _reply_comment_id,
    ref_noti:         _ref_noti,
    get_type:         _get_type,
    limit:            _limit,
    token:            $dt.token,
  }).then((rps) => {
    var _data   = rps.data,
        _status = _data.status,
        _result = _data.result;

    if (_loading_spinner) _loading_spinner.remove();
    if (_element_append)  _element_append.remove();

    if (_status == "success") {
      if (!_id_load_more) {
        // Initial load
        if (!_result || _result.trim() === "") {
          $elem.comments.innerHTML =
            '<div class="cmt-empty">' +
            '<span class="material-icons-round">chat_bubble_outline</span>' +
            '<span>Chưa có bình luận nào. Hãy là người đầu tiên!</span></div>';
        } else {
          $elem.comments.innerHTML = _result;
        }
      } else {
        // Load more
        if (_result) {
          if (_reply_comment_id) {
            var fb = document.getElementById("feedback_" + _reply_comment_id);
            if (fb) fb.insertAdjacentHTML("beforeend", _result);
          } else {
            if (_get_type == "older") {
              $elem.comments.insertAdjacentHTML("beforeend", _result);
            } else {
              $elem.comments.insertAdjacentHTML("afterbegin", _result);
            }
          }
        }
      }

      // Auto-scroll to comment from notification
      if (_ref_noti) {
        var _first = $elem.comments.querySelector(".cmt-card");
        if (_first) {
          setTimeout(() => _first.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
        }
      }
    } else {
      Toast({ message: _result || "Tải bình luận thất bại", type: "error" });
    }
  }).catch(() => {
    if (_loading_spinner) _loading_spinner.remove();
    Toast({ message: "Lỗi kết nối khi tải bình luận", type: "error" });
  });

  $flag.b = true;
}

// ── Reaction event delegation ──────────────────────────────────────────────────
if ($elem.comments) {
  $elem.comments.addEventListener("click", function (e) {
    var btn = e.target.closest(".reaction-btn");
    if (!btn) return;
    if (!$user || !$user.id) {
      Toast({ message: "Đăng nhập để thả cảm xúc", type: "error" });
      return;
    }
    var bar       = btn.closest(".reaction-bar");
    var commentId = bar ? bar.dataset.comment : null;
    var type      = btn.dataset.type;
    if (!commentId || !type) return;
    reactToComment(parseInt(commentId), parseInt(type), btn, bar);
  });
}

async function reactToComment(commentId, type, btn, bar) {
  btn.disabled = true;
  await axios.post("/api", {
    action:     "react_comment",
    comment_id: commentId,
    type:       type,
  }).then((rps) => {
    var data = rps.data;
    if (data && data.counts !== undefined) {
      // Re-render reaction bar
      var newBar = buildReactionBarHTML(commentId, data.counts, data.user_type);
      bar.outerHTML = newBar;
    }
  }).catch(() => {
    Toast({ message: "Lỗi kết nối", type: "error" });
  });
  // btn may no longer exist, so no need to re-enable
}

function buildReactionBarHTML(commentId, counts, userType) {
  var EMOJIS = { 1: '<span class="material-icons-round">thumb_up</span>', 2: '<span class="material-icons-round">thumb_down</span>' };
  var MODS   = { 1: "",                    2: " reaction-btn--dislike" };
  var LABELS = { 1: "Thích",            2: "Không thích" };
  var html = '<div class="reaction-bar" data-comment="' + commentId + '">';
  for (var t = 1; t <= 2; t++) {
    var cnt    = (counts && counts[t]) ? counts[t] : 0;
    var active = userType === t ? " active" : "";
    html += '<button class="reaction-btn' + active + MODS[t] + '" data-type="' + t + '" title="' + LABELS[t] + '">';
    html += EMOJIS[t];
    if (cnt > 0) html += ' <span>' + cnt + "</span>";
    html += "</button>";
  }
  html += "</div>";
  return html;
}


// ── View profile ───────────────────────────────────────────────────────────────
async function initViewProfile(user_id) {
  user_id = user_id || 0;
  var view_profile = document.getElementById("view-profile");
  if (view_profile == null) {
    view_profile = document.createElement("div");
    view_profile.setAttribute("id", "view-profile");
    document.body.appendChild(view_profile);
    initViewProfile(user_id);
  } else {
    view_profile.innerHTML = null;
    if (view_profile.style.display) {
      view_profile.style = null;
    } else {
      view_profile.middleWindow();
      view_profile.style.display = "block";
      view_profile.appendChild(loadingSpinner());
      var _loading = view_profile.lastElementChild;
      await securityCode();
      await axios.post("/api", {
        action:  "get_profile",
        user_id: user_id,
        token:   $dt.token,
      }).then(function (rps) {
        var html = rps.data.result;
        if (_loading) _loading.remove();
        view_profile.innerHTML = html;
        view_profile.insertAdjacentHTML(
          "afterbegin",
          "<div class='flex flex-hozi-center flex-space-auto fs-21 border-style-2'>" +
          "<div class='color-red-2 fw-500'>Thông tin</div>" +
          "<div class='color-white' onclick='initViewProfile()'>X</div></div>"
        );
        view_profile.middleWindow();
      });
    }
  }
}
