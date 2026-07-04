class liveSearch {
    constructor(props) {
      this.props = props;
      this.time = null;
      this.position_insert = document.getElementById("navbar");
      this.input = document.forms[0][0];
    }
    nullSpace() {
      this.input.value = "";
      this.insertToSpace(null);
    }
    createSpace() {
      var _parent_html = document.createElement("div");
      var _html = document.createElement("div");
      var _exit = document.createElement("div");
      _html.classList.add("result-of-search");
      _parent_html.classList.add("live-search");
      _parent_html.style.display = "none";
      _exit.classList.add("padding-10");
      _exit.classList.add("flex");
      _exit.innerHTML =
        '<a href="javascript:handlingSearch()" style="flex:0.7">Đến trang tìm kiếm</a><a href="javascript:live_search.nullSpace()" style="flex:0.3;text-align:right"><span class="material-icons-round fs-21">close</span></a>';
      _parent_html.innerHTML = _exit.outerHTML + _html.outerHTML;
      this.position_insert.appendChild(_parent_html);
    }
    insertToSpace(result, display = "none") {
      let el_live_search = document.getElementsByClassName("result-of-search")[0];
      this.position_insert.lastElementChild.style.display = display;
      el_live_search.innerHTML = result;
    }
    sendRequest(keyword) {
      clearTimeout(this.time);
      this.time = setTimeout(() => {
        if (keyword.length >= 2) {
          axios
            .post("/api", {
              action: "live_search",
              keyword,
            })
            .then((reponse) => {
              let data = reponse.data;
              if (data.status) {
                this.insertToSpace(data.data, "block");
              }
            });
        } else {
          this.insertToSpace(null);
        }
      }, 700);
    }
    action() {
      this.createSpace();
      this.input.addEventListener("keyup", (value) => {
        this.sendRequest(this.input.value);
      });
    }
  }
  
  class MyModal {
    constructor() {
      this.modal_el = document.getElementById("modal");
      this.setAniModal();
    }
    setAniModal() {
      this.modal_el.style.visibility = "hidden";
      this.modal_el.style.display = "block";
      this.modal_el.style.top = 0;
      this.modal_el.style.transition = "top .3s";
    }
    toggleModal() {

      if (this.modal_el.style.visibility == "hidden") {
        this.modal_el.style.visibility = "visible";
        this.modal_el.middleWindow();
      } else {
        this.setAniModal();
      }
    }
  }