@charset "UTF-8";


@keyframes from_left {
    from {
        transform: translateX(-100%)
    }
    to {
        transform: translateX(0)
    }
}

@keyframes from_right {
    from {
        transform: translateX(100%)
    }
    to {
        transform: translateX(0)
    }
}

@keyframes from_bottom {
    from {
        transform: translateY(100%)
    }
    to {
        transform: translateY(0)
    }
}


@keyframes top_middle_bottom {
    from {
        bottom: 100%;
        left: calc(50%);
        transform: translateX(-50%);
    }
    to {
        bottom: 0;
        transform: translateX(-50%);
    }
}


@keyframes from_top_middle {
    0% {
        transform: translate(-50%, -100%);
        opacity: 0;
    }
    100% {
        transform: translate(-50%, 0);
        opacity: 1;
    }
}


@keyframes from_top {
    from {
        transform: translateY(-100%)
    }
    to {
        transform: translateY(0)
    }
}

@keyframes left_right {
    from {
        right: 100%
    }
    to {
        right: 0
    }
}

@keyframes right_left {
    from {
        left: 100%
    }

    to {
        left: 0
    }
}

@keyframes top_bottom {
    from {
        bottom: 100%
    }

    to {
        bottom: 0
    }
}

@keyframes bottom_top {
    from {
        top: 100%
    }
    to {
        top: 0
    }
}

@keyframes bottom_middle_top {
    from {
        top: 100%;
        left: calc(50%);
        transform: translateX(-50%);
    }
    to {
        top: 0;
        left: calc(50%);
        transform: translateX(-50%);
    }
}


.sldr_slider_div {
    background-color: transparent;
    overflow: hidden;
    border: 0;
    padding: 0;
    margin: 0;
    position: fixed;
    z-index: 2147483647
}

.sldr_slider .vastTimeLeftCounter, .sldr_slider .vjs-control-bar {
    display: none;
    color: transparent;
    width: 0;
    height: 0
}

.sldr_left_left:not(.fullscreen) {
    animation: from_left 1s ease-in-out normal forwards;
    left: 0;
    bottom: 0
}

.sldr_left_bottom:not(.fullscreen) {
    animation: from_bottom 1s ease-in-out normal forwards;
    left: 0;
    bottom: 0
}

.sldr_left_right:not(.fullscreen) {
    animation: left_right 3s ease-in-out normal forwards;
    bottom: 0
}

.sldr_right_right:not(.fullscreen) {
    animation: from_right 1s ease-in-out normal forwards;
    right: 0;
    bottom: 0
}

.sldr_right_bottom:not(.fullscreen) {
    animation: from_bottom 1s ease-in-out normal forwards;
    right: 0;
    bottom: 0
}

.sldr_right_left:not(.fullscreen) {
    animation: right_left 3s ease-in-out normal forwards;
    bottom: 0
}

.sldr_right_corner:not(.fullscreen) {
    right: 0;
    bottom: 0
}

.sldr_right_top_right_top:not(.fullscreen) {
    animation: from_top 1s ease-in-out normal forwards;
    right: 0;
    top: 0
}

.sldr_middle_top_middle_top:not(.fullscreen) {
    top: 0;
    left: calc(50%);
    animation: from_top_middle 1s ease-out normal forwards;


}

.sldr_left_top_left_top:not(.fullscreen) {
    animation: from_top 1s ease-in-out normal forwards;
    left: 0;
    top: 0
}

.sldr_right_top_right_bottom:not(.fullscreen) {
    animation: top_bottom 3s ease-in-out normal forwards;
    right: 0
}

.sldr_middle_top_middle_bottom:not(.fullscreen) {
    left: calc(50%);
    transform: translateX(-50%);
    animation: top_middle_bottom 3s ease-in-out normal forwards
}

.sldr_left_top_left_bottom:not(.fullscreen) {
    animation: top_bottom 3s ease-in-out normal forwards;
    left: 0
}

.sldr_right_bottom_right_top:not(.fullscreen) {
    animation: bottom_top 3s ease-in-out normal forwards;
    right: 0
}

.sldr_middle_bottom_middle_top:not(.fullscreen) {
    left: calc(50%);
    animation: bottom_middle_top 3s ease-in-out normal forwards
}

.sldr_left_bottom_left_top:not(.fullscreen) {
    animation: bottom_top 3s ease-in-out normal forwards;
    left: 0
}

.sldr_video {
    cursor: pointer;
    position: relative
}

.sldr_volumeBtn {
    background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAyODAgMjgwIj48cGF0aCBmaWxsPSJ3aGl0ZSIgZD0ibSAxNjUuMTgyNywyMzYuNDU4NzEgMC4yNzk3NiwtMTIuNTQxMjggOC4xNjQ3MywtMy4zNDE0MyBjIDI4LjkxMjM5LC0xMS44MzI1MiA1MC4wNzkzNywtNDAuNDEwMDggNTMuMjAwNDYsLTcxLjgyNiAzLjc3MjcyLC0zNy45NzU2NyAtMTguMzA0NzUsLTc1LjA0NDc5MyAtNTMuMjAwNDYsLTg5LjMyNjAwMiBMIDE2NS40NjI0Niw1Ni4wODI1NyAxNjUuMTgyNyw0My41NDEyODQgYyAtMC4xOTYyMiwtOC43OTUyODQgMC4wNTY3LC0xMi41NDEyODYgMC44NDU4NSwtMTIuNTQxMjg2IDIuNjYyOTgsMCAxMy4wNTU2NiwzLjU1Njc5NiAyMC43MzgyLDcuMDk3NDYzIDI3Ljg4MDE5LDEyLjg0OTE3MiA0OS45OTQyOCwzNy40NjU3MjEgNTkuNzM3MDMsNjYuNDk2Nzg5IDcuMzI4MjksMjEuODM2NTQgNy4zMjgyOSw0OC45NzQ5NSAwLDcwLjgxMTQ5IC05Ljc0Mjc1LDI5LjAzMTA4IC0zMS44NTY4NCw1My42NDc2MiAtNTkuNzM3MDMsNjYuNDk2OCBDIDE3OS4wODQyMSwyNDUuNDQzMiAxNjguNjkxNTMsMjQ5IDE2Ni4wMjg1NSwyNDkgYyAtMC43ODk0NSwwIC0xLjA0MjA3LC0zLjc0NiAtMC44NDU4NSwtMTIuNTQxMjkgeiBNIDEwOC40NDQ5NiwyMDcuOTk1NTIgNzcuNDIwMzQ3LDE3NyBIIDUyLjcxMDE3NyAyOCBWIDE0MCAxMDMgSCA1Mi43MDY1NDQgNzcuNDEzMDk1IEwgMTA4LjY5MTI3LDcxLjc3MTI0NCAxMzkuOTY5NDIsNDAuNTQyNDkxIHYgOTkuMjI4NzU5IGMgMCw1NC41NzU4MSAtMC4xMTI0Nyw5OS4yMjY3MyAtMC4yNDk4OCw5OS4yMjQyNyAtMC4xMzc0NywtMC4wMDIgLTE0LjIxMTA1LC0xMy45NTI0NiAtMzEuMjc0NTgsLTMxIHogTSAxNjQuOTYyNjUsMTQwIFYgODkuOTU5MzUgbCAzLjg5MjY1LDEuOTg2NDMxIGMgMi4xNDA5MiwxLjA5MjUzNyA2LjU4MTQzLDQuNTg5MTc5IDkuODY3NjksNy43NzAzMjkgMjIuNjcxMTIsMjEuOTQ1NzMgMjIuOTI0NTIsNTcuNTU4OTkgMC41NjkwNCw3OS45NzMxMSAtMy4zOTUyLDMuNDA0MDcgLTguMDA4MjUsNy4xMjU3MiAtMTAuMjUxMTksOC4yNzAzMyBsIC00LjA3ODE5LDIuMDgxMSB6IiAvPjwvc3ZnPg==");
    width: 30px;
    height: 30px;
    position: absolute;
    display: block;
    background-color: #555;
    border-radius: 5px;
    bottom: 10px;
    right: 10px;
    cursor: pointer;
	z-index:1500;
}





.sldr_volumeBtn.sldr_mute {
    background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAyODAgMjgwIj48cGF0aCBmaWxsPSJ3aGl0ZSIgZD0ibSAyMjMuNzc3ODIsMjM5LjM1NDMzIC0xMi42NTQ3MywtMTIuNjQ1NjggLTUuMzEzMTUsNC4wMDQ5NCBjIC04LjAxOTgxLDYuMDQ1MTYgLTE5LjEyOTI1LDExLjc1MzM5IC0zMC41NTM3NywxNS42OTkwNiBsIC0xMC4yNjMzMiwzLjU0NDYzIDAuMjc4NDQsLTEzLjAwOTY5IDAuMjc4NDQsLTEzLjAwOTY5IDYuNDkwMTcsLTIuNTg4NzcgYyA2Ljg1NjU5LC0yLjczNDk0IDIwLjE4MDU3LC0xMC4zOTA5MyAyMC42Nzc3OCwtMTEuODgxNTEgMC4xNjE2OSwtMC40ODQ3MyAtMTEuNjEzNzcsLTEyLjc3NDIxIC0yNi4xNjc3LC0yNy4zMDk5NSBMIDE0MC4wODgzLDE1NS43MjkwNCB2IDQxLjg3ODIgNDEuODc4MiBsIC0zMS4yMzkzOSwtMzEuMTU5MiAtMzEuMjM5Mzg5LC0zMS4xNTkyIEggNTIuOTMzNjEgMjguMjU3NyB2IC0zNi45MTc2IC0zNi45MTc1OSBoIDI4Ljk1NjEzNyBjIDE1LjkyNTg3NSwwIDI4Ljk1NjEzNywtMC4zMzM5NCAyOC45NTYxMzcsLTAuNzQyMSAwLC0wLjQwODE1IC0xMy4wODgyNDQsLTEzLjgyNjYgLTI5LjA4NDk5MiwtMjkuODE4NzkgTCAyOCw0My42OTQyNjcgMzUuNTcyMDEsMzUuODQ3MTMzIDQzLjE0NDAzLDI4IGwgMTA0LjQxNzExLDEwNC4yOTc1MSAxMDQuNDE3MTEsMTA0LjI5NzUyIC03LjEwMjQ2LDcuNzAyNDggQyAyNDAuOTY5NDUsMjQ4LjUzMzg4IDIzNy40NzE2NywyNTIgMjM3LjEwMjk1LDI1MiBjIC0wLjM2ODcyLDAgLTYuMzY1MDMsLTUuNjkwNTYgLTEzLjMyNTEzLC0xMi42NDU2NyB6IG0gNi4zMzU2MywtNTYuNTEzNzcgLTkuMzI0MzYsLTkuMzgwNTIgMi41NjY1LC04LjExODU5IGMgNS4xNjA1NywtMTYuMzI0MzkgNC45OTMwMywtMzYuMDcyNTkgLTAuNDQ0NjQsLTUyLjQxMzM5IEMgMjE4LjQ5NzIsOTkuNjY0MzEgMjEyLjA3MjMzLDg5LjQ1NDcyIDIwMS40ODg2Miw3OC44ODY0MSAxOTEuOTY3ODksNjkuMzc5NTU1IDE4Ni4xMDg4OCw2NS40MTk5MDkgMTczLjM5Miw1OS44OTgxNDQgbCAtNy44NDIyNywtMy40MDUxNzUgLTAuMjc3OTksLTEyLjkxMDc4OSAtMC4yNzc5OSwtMTIuOTEwNzg5IDYuNzY4MTYsMS45OTczNSBjIDM0LjE4MTEyLDEwLjA4NzE5NSA2My4yNzkyNiwzOC4xNzEwODcgNzQuNjY0MDgsNzIuMDYxNTc5IDguNzQ5MzcsMjYuMDQ1MjggNy4xMTI2OCw1Ny4xMDkwMyAtNC4zMDUxMiw4MS43MDk4NSBsIC0yLjY4MzA3LDUuNzgwOTMgeiBNIDE3OS43NjU2OSwxMzIuNTA0NjIgMTY1LjA1MDQ4LDExNy43NzUzOSBWIDEwNC4wNjgxIGMgMCwtNy41MzkwMiAwLjI2MDg1LC0xMy43MDczIDAuNTc5NjYsLTEzLjcwNzMgMS43MTY3MywwIDExLjk2Njk2LDcuODE3OCAxNS43MjEzMiwxMS45OTA1NiA1LjQwMDgsNi4wMDI2OSAxMC45ODY0OSwxNi41MDQ1NSAxMy4wNjkzNSwyNC41NzIxNyAxLjYyMTI0LDYuMjc5NjEgMi4xODg3LDIwLjMxMDMyIDAuODIxNDQsMjAuMzEwMzIgLTAuNDE4NzUsMCAtNy4zODMyLC02LjYyODE1IC0xNS40NzY1NiwtMTQuNzI5MjMgeiBNIDEyNi44NDM2Nyw3OS42MjA2MSAxMTQuMTI3MDksNjYuODg0ODY5IDEyNy4xMDc3LDUzLjk0MjM1NCAxNDAuMDg4Myw0MC45OTk4NCB2IDI1LjY3ODI1MyBjIDAsMTQuMTIzMDM3IC0wLjExODgxLDI1LjY3ODI1NyAtMC4yNjQwMywyNS42NzgyNTcgLTAuMTQ1MjEsMCAtNS45ODY0OCwtNS43MzEwOSAtMTIuOTgwNiwtMTIuNzM1NzQgeiIgLz48L3N2Zz4=")
}

.sldr_closeBtn {
    padding: 10px 8px;
    background-color: #555;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    font-family: sans-serif;
    top: 0;
    right: 0;
    position: absolute;
    cursor: pointer;
    border: 0
}

.sldr_frame {
    background: 0 0;
    width: 100vw;
    height: 100vh;
    position: absolute;
    left: 0;
    top: 0;
    border: 0;
    overflow: hidden;
    z-index: -1
}

.sldr_richmedia > div, .sldr_richmedia > iframe {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    transform: scaleY(1) scaleX(1);
    -o-transform: scaleY(1) scaleX(1);
    -webkit-transform: scaleY(1) scaleX(1);
    -moz-transform: scaleY(1) scaleX(1);
    -ms-transform: scaleY(1) scaleX(1)
}