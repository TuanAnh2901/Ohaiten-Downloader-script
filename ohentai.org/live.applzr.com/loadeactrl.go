var adMoxyCtrl = (typeof adMoxyCtrl != 'undefined' && typeof adMoxyCtrl.init != 'undefined') ? adMoxyCtrl : {
    datadomain: '',
    datafailover_domain: '',
    refurl: '',
    datapath: 'data',
    connectors: {}, /* connectors */
    ctrlId: 12337, /* controller id known in database */
    sCtrlName: 'adMoxyCtrl',
    bypassAb: true,
    abDisplayProps: {},
    ctrlSettings: {},
    iWaitMs: 0,
    abDetected: false,
    initialized: false,
    jqLoaded: false,
    jQ: null,
    adCals: [],
    docloaded: false,
    f_print: 'unknown',
    browserInfo: [],
    plugins: [],
    aPlugins: ['redirect', 'banner', 'floater', 'fpa', 'im', 'invideo', 'native', 'video', 'pop', 'videoslider', 'fxim_banner', 'native_webpush', 'native_bar', 'tabs', 'dyn_banner', 'tools', 'inpage_video', 'skin', 'footer_code', 'reel', 'creator_widget', 'video_carousel'],
    pluginInfo: [],
    aOnReadyFuncts: [],
    aOnAbFuncts: [],
    bRanAbFuncts: false,
    bOnReady: false,
    adArr: [],
    debugOn: false,
    iTime: 0,
    isPaused: false,
    sLastStatus: '',
    bSlowConn: false,
    bFirstStart: false,
    bSkipAdding: false,
    bSkipConnecting: false,
    initDataLoaded: false,
    videoAdRunning: false,
    aSkippedAds: [],
    aImplog: [],
    ImpLastAdded: 0,
    ImpCounter: 0,
    ImpCounterSubmitted: 0,
    iLastAdded: 0,
    iItemsPending: 0,
    PageLoading: "",
    awHwnd: [],
    rid: 0,

    sRequestType: 'POST',
    lazyLoading: false,
    isPreview: false,
    interStitalRunning: false,
    lvJs: false,
    sCloseButtonHtml: "<img alt='Close Ad' class='closeBtn' style='background:#ffffff;border-radius: 50%;margin:2px;z-index:100000' width='24' height='24' src='data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIwIDAgNDk2IDQ5NiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDk2IDQ5NjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPGc+DQoJCTxnPg0KCQkJPHBhdGggZD0iTTI0OCwwQzExMS4wMzMsMCwwLDExMS4wMzMsMCwyNDhzMTExLjAzMywyNDgsMjQ4LDI0OHMyNDgtMTExLjAzMywyNDgtMjQ4QzQ5NS44NDEsMTExLjA5OSwzODQuOTAxLDAuMTU5LDI0OCwweg0KCQkJCSBNMjQ4LDQ4MEMxMTkuODcsNDgwLDE2LDM3Ni4xMywxNiwyNDhTMTE5Ljg3LDE2LDI0OCwxNnMyMzIsMTAzLjg3LDIzMiwyMzJDNDc5Ljg1OSwzNzYuMDcyLDM3Ni4wNzIsNDc5Ljg1OSwyNDgsNDgweiIvPg0KCQkJPHBhdGggZD0iTTM2MS4xMzYsMTM0Ljg2NGMtMy4xMjQtMy4xMjMtOC4xODgtMy4xMjMtMTEuMzEyLDBMMjQ4LDIzNi42ODhMMTQ2LjE3NiwxMzQuODY0Yy0zLjA2OS0zLjE3OC04LjEzNC0zLjI2Ni0xMS4zMTItMC4xOTcNCgkJCQljLTMuMTc4LDMuMDY5LTMuMjY2LDguMTM0LTAuMTk3LDExLjMxMmMwLjA2NCwwLjA2NywwLjEzLDAuMTMyLDAuMTk3LDAuMTk3TDIzNi42ODgsMjQ4TDEzNC44NjQsMzQ5LjgyNA0KCQkJCWMtMy4xNzgsMy4wNy0zLjI2Niw4LjEzNC0wLjE5NiwxMS4zMTJjMy4wNywzLjE3OCw4LjEzNCwzLjI2NiwxMS4zMTIsMC4xOTZjMC4wNjctMC4wNjQsMC4xMzItMC4xMywwLjE5Ni0wLjE5NkwyNDgsMjU5LjMxMg0KCQkJCWwxMDEuODI0LDEwMS44MjRjMy4xNzgsMy4wNyw4LjI0MiwyLjk4MiwxMS4zMTItMC4xOTZjMi45OTUtMy4xLDIuOTk1LTguMDE2LDAtMTEuMTE2TDI1OS4zMTIsMjQ4bDEwMS44MjQtMTAxLjgyNA0KCQkJCUMzNjQuMjU5LDE0My4wNTIsMzY0LjI1OSwxMzcuOTg4LDM2MS4xMzYsMTM0Ljg2NHoiLz4NCgkJPC9nPg0KCTwvZz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjwvc3ZnPg0K'/>",


    getVersion: function () {
        return "6.9";
    },
    GetMyId: function () {
        return this.ctrlId;
    },
    reset: function () {
        this.bSkipAdding = false;
        this.aSkippedAds = [];
        this.adCals = [];
        this.adArr = [];
    },
    pause: function () {
        this.isPaused = true;
    },
    resume: function () {
        this.isPaused = false;
        this.run();
    },
    backLog: function (stype, json) {
    },
    AddImplog: function (a) {
        this.ImpLastAdded = Date.now();
        this.ImpCounter++;
        this.aImplog.push(a);
    },

    CheckImplog: function () {
        let o = this;
        if (o.aImplog.length > 0 && o.ImpLastAdded < (o.Tools.now() - 60)) {
            let b = o.aImplog;
            o.aImplog = [];
            let u = 'act=logmultiimp';
            let i = 0;
            b.forEach(function (v, k) {
                if (v != '') {
                    u += `&logitem[${i}]=${v}`;
                    o.ImpCounterSubmitted++;
                    i++;
                }
            });
            if (i > 0) {
                adMoxyCtrl.request('logimp', u, 0, {
                    result: function (d) {
                        o.debug("Impressions logged", Date.now());
                    }
                });
            }
        }
    },
    runSkippedAds: function () {
        let n = this;
        n.pause();
        n.aSkippedAds.forEach(function (v, k) {
            n.ad(v);
        });
        n.resume();
    },
    isInFold: function (a) {
        return adMoxyCtrl.Tools.isInFold(a);
    },
    bkLog: function (stype, iItem, json, aItem) {
        if (aItem == null || typeof aItem == 'undefined') {
            aItem = adMoxyCtrl.adCals[iItem];
        }
        let o = adMoxyCtrl;
        if (typeof json != 'object') {
            json = {};
        }
        if (typeof iItem == 'undefined') {
            iItem = 0;
        }

        json.itemid = iItem;
        json.adzone = o.getItem(aItem, 'name', 'unk');
        json.plugin = o.getItem(aItem, 'plugin', 'unk');
        json.spaceid = aItem.sid;
        json.subid = aItem.subid;
        if (typeof aItem.data != 'undefined') {
            json.spaceid = aItem.data.spaceid;
            json.siteid = aItem.data.siteid;
            if (aItem.plugin == 'banner' || aItem.plugin == 'native') {
                json.adpos = aItem.data.pos;
            } else {
                json.adpos = { left: 0, top: 0 };
            }
            if (typeof aItem.data.xparams != 'undefined') {
                let xparams = aItem.data.xparams;
                delete xparams.bid;
                json.forEach(function (v, i) {
                    xparams[i] = v;
                });
                json = xparams;
            }
        }
        adMoxyCtrl.backLog(stype, json);
    },
    init: function () {
        if (adMoxyCtrl.initialized) {
            return;
        }
        if (adMoxyCtrl.Gup('debug') == '1') {
            adMoxyCtrl.debugOn = true;
        }


        if (adMoxyCtrl.PageLoading == "" || adMoxyCtrl.PageLoading.indexOf("http") == -1) {
            adMoxyCtrl.PageLoading = adMoxyCtrl.getItem(document, 'location', '');
        }
        if (typeof adMoxyCtrlRecs != 'undefined') {
            adMoxyCtrlRecs.forEach(function (funct, i) {
                adMoxyCtrl.adArr.push(funct);
                delete adMoxyCtrlRecs[i];
            });
        }
        adMoxyCtrl.initialized = true;
        const t = adMoxyCtrl.Tools;
        t.docready(function () {
            t.fetch_session('set', true);
            adMoxyCtrl.start(1);
            setInterval(function () {
                adMoxyCtrl.CheckImplog();
            }, 500);
        });
    },
    chkab1: function (cb) {
        let script = document.createElement('script');
        script.onload = function () {
            script.parentNode.removeChild(script);
            cb(false);
        };
        script.onerror = function () {
            script.parentNode.removeChild(script);
            cb(true);
        };
        script.src = "//go.goadserver.com/ads.go";
        document.body.appendChild(script);
    },
    chkab2: function (cb) {
        let flaggedURL = '//go.goadserver.com/eactrl.go';
        if (window.fetch) {
            let request = new Request(flaggedURL, {
                method: 'GET',
            });
            fetch(request)
                .then(function (response) {
                    cb(false);
                })
                .catch(function (error) {
                    cb(true);
                });
        } else {
            let http = new XMLHttpRequest();
            http.open('GET', flaggedURL, false);
            try {
                http.send();
            } catch (err) {
                cb(true);
            }
            cb(false);
        }
    },
    chkab0: function (cb) {
        if (document.body != null && typeof document.body != 'undefined') {
            let el = document.createElement('div');
            el.id = 'adsbox';
            el.innerHTML = '<h2>&nbsp;</h2>';
            document.body.appendChild(el);
            if (el.offsetHeight === 0) {
                cb(true);
            } else {
                cb(false);
            }
            el.parentNode.removeChild(el);
        } else {
            cb(true);
        }
    },

    chAbAll: function (cb) {
        adMoxyCtrl.chkab0(function (f) {
            if (f) {
                cb(true);
            } else {
                adMoxyCtrl.chkab1(function (f) {
                    if (f) {
                        cb(true);
                    } else {
                        adMoxyCtrl.chkab2(function (f) {
                            cb(f);
                        });
                    }
                });
            }
        });
    },
    checkAb: function (cb) {
        if (adMoxyCtrl.abDetected) {
            if (cb != null) {
                cb();
                return;
            }
            return true;
        }
        adMoxyCtrl.chAbAll(function (f) {
            if (f) {
                adMoxyCtrl.abDetected = true;
                adMoxyCtrl.runAbFuncts();
            }
            if (cb != null) {
                cb();
                return;
            }
            return f;
        });
    },
    start: function (dr) {
        let run = function () {
            let aPlugins = [];
            adMoxyCtrl.aPlugins.forEach(function (v, i) {
                let o = adMoxyCtrl.checkPlugin(v, true);
                if (o !== false) {
                    aPlugins.push({ f: v, v: o });
                }
            });
            adMoxyCtrl.bOnReady = true;
            adMoxyCtrl.adArr.forEach(function (v, i) {
                adMoxyCtrl.add(v);
            });
            adMoxyCtrl.adArr = [];
            adMoxyCtrl.docloaded = true;
            adMoxyCtrl.run(aPlugins);
        };

        if (adMoxyCtrl.lvJs == true) {
            run();
        } else {
            adMoxyCtrl.checkAb(function () {
                run();
            });
        }
    },
    makeId: function (im) {
        let t = "";
        let s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        for (let i = 0; i < im; i++) {
            t += s.charAt(Math.floor(Math.random() * s.length));
        }
        return t;
    },
    openModal: function (aParms) {
        let sid = adMoxyCtrl.makeId(10);
        let uri = adMoxyCtrl.getItem(aParms, 'uri', '');
        if (uri == '') {
            adMoxyCtrl.debug("No url given to open the modal");
            return;
        }
        let bOpenOnHide = adMoxyCtrl.getItem(aParms, 'reopen_onhide', false);
        let sBgColor = adMoxyCtrl.getItem(aParms, 'bgcolor', '#000000');
        let sDivStyle = `display:block;background-color:${sBgColor};position:absolute;z-index:1000000000000;top:0px;left:0px;width:100%;height:100%;margin:0,0,0,0;overflow:hidden;`;
        let sFrameStyle = `position: absolute; ${!adMoxyCtrl.browserInfo.ismobile ? ' left:50%;top: 50%;transform: translate(-50%, -50%);' : 'left:0px;top:0px;'}`;
        const t = adMoxyCtrl.Tools;
        t.append('head', `<style>#${sid}_cs{${sDivStyle}} #${sid}_frm{${sFrameStyle}}</style>`);
        setTimeout(function () {
            let sHtml = `<div id="${sid}_cs"><iframe id="${sid}_frm" ${!adMoxyCtrl.browserInfo.ismobile ? ' width="90%" height="90%"' : 'width="100%" height="100%"'} frameborder="0" src="${uri}"></iframe><div>`;
            t.append('body', sHtml);
            if (bOpenOnHide) {
                oReCheck = function () {
                    if (t.isvisible(`#${sid}_cs`)) {
                        setTimeout("oReCheck()", 1000);
                    } else {
                        t.remove(`#${sid}`);
                        adMoxyCtrl.openModal(aParms);
                    }
                };
                setTimeout("oReCheck()", 1000);
            }
            ;
        }, 1500);
    },
    getSettings: function () {
        return adMoxyCtrl.ctrlSettings;
    },
    initResult: function (jdata) {
        let u = 'undefined';
        adMoxyCtrl.addPlugins(jdata);
        if (u != typeof (jdata['logo_data']) && jdata['logo_data'] != '') {
            adMoxyCtrl.sLogoData = jdata['logo_data'];
        }
        if (u != typeof (jdata['closebtn_data']) && jdata['closebtn_data'] != '') {
            adMoxyCtrl.sCloseButtonData = jdata['closebtn_data'];
        }
        if (u != typeof (jdata['browserinfo'])) {
            adMoxyCtrl.browserInfo = jdata['browserinfo'];
        }
        if (u != typeof (jdata['datadomain'])) {
            adMoxyCtrl.datadomain = jdata['datadomain'];
        }
        if (u != typeof (jdata['datapath'])) {
            adMoxyCtrl.datapath = jdata['datapath'];
        }
        if (u != typeof (jdata['refurl'])) {
            adMoxyCtrl.refurl = jdata['refurl'];
        }
        if (u != typeof (jdata['plugininfo'])) {
            adMoxyCtrl.pluginInfo = jdata['plugininfo'];
        }
        if (u != typeof (jdata['siteinfo'])) {
            adMoxyCtrl.siteinfo = jdata['siteinfo'];
        }
        if (u != typeof (jdata['ctrlsettings'])) {
            adMoxyCtrl.ctrlSettings = jdata['ctrlsettings'];
        }
        if (u != typeof (jdata['abrestictions'])) {
            adMoxyCtrl.abDisplayProps = jdata['abrestictions'];
        }
        if (u != typeof (jdata['cmd'])) {
            try {
                eval(jdata['cmd']);
            } catch (_e) {
                adMoxyCtrl.debug(_e);
            }
        }
        if (typeof (jdata['errors']) != 'undefined') {
            adMoxyCtrl.displayErrors(jdata['errors']);
        }
        adMoxyCtrl.initDataLoaded = true;
        adMoxyCtrl.aOnReadyFuncts.forEach(function (f, i) {
            try {
                f();
            } catch (_e) {
                adMoxyCtrl.debug(_e);
            }
            ;
        });
        adMoxyCtrl.rid = 0;
        adMoxyCtrl.rid = setInterval("adMoxyCtrl.checkHiddenAds()", 500);
    },
    checkHiddenAds: function () {
        if (adMoxyCtrl.isPaused) {
            return;
        }
        let bFound = false,
            iCnt = 0;
        adMoxyCtrl.adCals.forEach(function (val, i) {
            if (val.state == -1) {
                iCnt++;
                if (adMoxyCtrl.Tools.isvisible(`#${val.display}`)) {
                    adMoxyCtrl.debug(`AdTag: ${val.display} ItemId${i} Is visible again`);
                    adMoxyCtrl.adCals[i].state = 0;
                    bFound = true;
                    iCnt--;
                }
            }
        });
        if (bFound) {
            adMoxyCtrl.run();
        }
    },
    onAbDetected: function (f) {
        adMoxyCtrl.aOnAbFuncts.push(f);
    },
    runAbFuncts: function () {
        if (adMoxyCtrl.bRanAbFuncts) {
            return;
        }
        adMoxyCtrl.bRanAbFuncts = true;
        adMoxyCtrl.aOnAbFuncts.forEach(function (funct, i) {
            try {
                funct();
            } catch (_e) {
                adMoxyCtrl.debug(_e);
            }
        });
    },
    onReady: function (f) {
        if (!adMoxyCtrl.initialized) {
            adMoxyCtrl.aOnReadyFuncts.push(f);
        } else {
            try {
                f();
            } catch (_e) {
                adMoxyCtrl.debug(_e);
            }
        }
    },
    arrToJson: function (obj, filter) {
        let s = '';
        this.abDisplayProps.forEach(function (v, i) {
            if (typeof filter == 'undefined' || typeof filter[i] != 'undefined') {
                s += (s != '' ? ',' : '') + `"${i}":"${v}"`;
            }
        });
        return `{${s}}`;
    },
    debug: function (...o) {
        if (adMoxyCtrl.debugOn) {
            console.log('GAS: ', o);
        }
    },
    Add: function (args, cb) {
        this.add(args, cb);
    },
    runads: function () {
        if (adMoxyCtrl.iItemsPending > 0 && adMoxyCtrl.iLastAdded < Date.now() - 5) {
            adMoxyCtrl.iItemsPending = 0;
            let aPlugins = [];
            adMoxyCtrl.aPlugins.forEach(function (funct, i) {
                let o = adMoxyCtrl.checkPlugin(funct, true);
                if (o !== false) {
                    aPlugins.push({ f: funct, v: o });
                }
            });
            adMoxyCtrl.run(aPlugins);
        }
    },
    add: function (args, cb) {
        if (adMoxyCtrl.bSkipAdding) {
            adMoxyCtrl.aSkippedAds.push(args);
            return;
        }
        if (!adMoxyCtrl.bOnReady) {
            adMoxyCtrl.adArr.push(args);
            return;
        }
        if (adMoxyCtrl.abDetected && adMoxyCtrl.getItem(adMoxyCtrl.abDisplayProps, args.plugin, 'yes') == 'no') {
            /* skip the plugins which dont have to run in case of an adblocker */
            return;
        }
        args.state = 0;
        let i = adMoxyCtrl.adCals.length;
        adMoxyCtrl.adCals.push(args);
        adMoxyCtrl.iLastAdded = Date.now();
        adMoxyCtrl.iItemsPending++;
        setTimeout(function () { /* buffering */
            adMoxyCtrl.runads();
        }, 6);

        if (typeof cb != 'undefined') {
            cb(i);
        }
    },
    runOnErrors: function () {
        adMoxyCtrl.adCals.forEach(function (val, i) {
            if (typeof val.onerror == 'function') {
                if (typeof val.errorhandled == 'undefined' && val.state == '1') { /* state 1 was pending... state 2 is executed */
                    adMoxyCtrl.adCals[i].errorhandled = 1;
                    try {
                        val.onerror(i, adMoxyCtrl.getItem(val, 'display', 'unknown'));
                    } catch (_e) {
                        adMoxyCtrl.debug(`something went wrong with executing the onerror handler in addtag:${adMoxyCtrl.getItem(val, 'display', 'unknown')} SpaceId:${adMoxyCtrl.getItem(val, 'sid', 'Unknown')}`);
                        adMoxyCtrl.debug(_e);
                    }
                }
            }
        });
    },
    request: function (sact, sArgs, bRetry, aRet) {
        if (!adMoxyCtrl.lvJs && adMoxyCtrl.abDetected && !adMoxyCtrl.bypassAb) {
            adMoxyCtrl.debug("Request cancelled, enable the option bypassAb to get this running");
            return;
        }
        let sConnUrl = '';
        let iConnID = -1;
        let iStart = 0;
        let iEnd = 0;
        let ob = this;
        let uc;
        for (const k in adMoxyCtrl.connectors) {
            uc = adMoxyCtrl.connectors[k];
            if (typeof uc['isfailed'] == 'undefined') {
                adMoxyCtrl.connectors[k].isfailed = 0;
            }
            if (!adMoxyCtrl.lvJs && adMoxyCtrl.abDetected) {
                if (!adMoxyCtrl.getItem(uc, 'isproxy', 0)) {
                    continue;
                }
            }
            if (!uc['isfailed']) {
                iConnID = k;
                sConnUrl = uc['url'];
                break;
            }
        }
        if (sConnUrl == '') {
            adMoxyCtrl.backLog('error', { 'msg': 'no connectionurl available', 'abdetected': adMoxyCtrl.abDetected });
            return false;
        }
        if (adMoxyCtrl.abDetected) {
            sArgs += '&ab=1';
        }
        sArgs += `&hastouch=${'ontouchend' in document}`; /* then we know if its a tochscreen or not, we need this because some mobile/tablet os are not detectable as they can be in desktop mode */
        if (sact != 'loadimage' && (typeof (bRetry) == "undefined" || bRetry == 0)) {
            sArgs += `&time=${(new Date).getTime()}`;
            sArgs += `&is_ssl=${adMoxyCtrl.isSecure() ? '1' : '0'}`;
            sArgs += `&ctrlname=${adMoxyCtrl.sCtrlName}`;
            sArgs += `&ctrlid=${adMoxyCtrl.ctrlId}&version=${parseFloat(adMoxyCtrl.getVersion())}`;
            sArgs += `&ispreview=${adMoxyCtrl.isPreview}`;
            if (adMoxyCtrl.Gup("nocap") == 1 || adMoxyCtrl.isPreview) {
                sArgs += '&nocap=1';
            }
            sArgs += `&itime=${adMoxyCtrl.iTime}`;
            if (sact == 'init' || sact == 'get') {
                sArgs += `&doc=${escape(adMoxyCtrl.PageLoading)}`;
                sArgs += `&ref=${escape(adMoxyCtrl.getItem(document, 'referrer', ''))}`;
                sArgs += `&sh=${adMoxyCtrl.getItem(screen, 'height', 0)}`;
                sArgs += `&sw=${adMoxyCtrl.getItem(screen, 'width', 0)}`;
                if (adMoxyCtrl.debugOn) {
                    sArgs += '&de' + 'bug=1';
                }
                let tm = "-1";
                try {
                    tm = new Date().toString().match(/([-\+][0-9]+)\s/)[1];
                    tm = tm.replace('+', '');
                } catch (_e) {
                    tm = "-1";
                }
                if (typeof tm == 'undefined' || tm == null || tm == '') {
                    tm = '-1';
                }
                sArgs += `&tz=${tm}`;
                try {
                    const t = adMoxyCtrl.Tools;
                    sArgs += `&dh=${parseInt(t.dh())}&dw=${parseInt(t.dw())}`;
                    sArgs += `&p_title=${escape(ob.utf8_encode(t.find("title").innerText))}`;
                } catch (_e) {
                }
            }
        }
        let sdata_Type = "json";
        if (sact == "loadplugin" || sact == "logimp") {
            sdata_Type = "text";
        }
        try {
            let postData = '';
            let sMethod = adMoxyCtrl.sRequestType;
            if (sact == "loadimage") {
                postData = sArgs;
            } else {
                postData = `s=${adMoxyCtrl.encode(sArgs)}`;
            }
            iStart = adMoxyCtrl.Tools.now();
            let http = new XMLHttpRequest();

            function tC(evt) {
                let rjdata = evt.target.response;
                if (rjdata != null && typeof rjdata['error'] != 'undefined') {
                    adMoxyCtrl.debug(`there was an error ${rjdata['error']}`);
                    if (rjdata['error'] == 'connect_error') { /* this is only trough the proxy */
                        if (sact == 'get') {
                            adMoxyCtrl.bSkipConnecting = true;
                            adMoxyCtrl.runOnErrors();
                        }
                    }
                } else {
                    adMoxyCtrl.sLastStatus = 'success';
                    iEnd = adMoxyCtrl.Tools.now();
                    if (sact == "init") {
                        let iC = (iEnd - iStart);
                        if (adMoxyCtrl.iTime < iC) {
                            adMoxyCtrl.iTime = iC;
                        }
                        adMoxyCtrl.debug(`Total Init Request Time:${adMoxyCtrl.iTime}`);
                    }
                    if (rjdata === undefined || rjdata == null) {
                        if (typeof (aRet) != 'undefined' && typeof (aRet.result) != 'undefined') {
                            rjdata = { success: false, data: {} };
                            return aRet.result(rjdata);
                        }
                    } else {
                        if (typeof (rjdata['errors']) != 'undefined') {
                            adMoxyCtrl.displayErrors(rjdata['errors']);
                        }
                        if (typeof (aRet) != 'undefined' && typeof (aRet.result) != 'undefined') {
                            return aRet.result(rjdata);
                        } else {
                            adMoxyCtrl.handleResult(sact, rjdata);
                        }
                    }
                }
            }

            function tF(evt) {
                let xhr = evt.target;
                if (typeof (aRet) != 'undefined' && typeof (aRet.error) != 'undefined') {
                    aRet.error();
                }
                adMoxyCtrl.sLastStatus = xhr.sTxt;
                if (xhr.status == 0 && xhr.timeout == 0) {
                    if (bRetry == 0 && !adMoxyCtrl.abDetected) {
                        if (adMoxyCtrl.checkAb()) {
                            if (adMoxyCtrl.bypassAb) {
                                adMoxyCtrl.request(sact, sArgs, 1, aRet);
                            } else {
                                adMoxyCtrl.debug("enable the bypassab option to get ads");
                                adMoxyCtrl.runOnErrors();
                            }
                        }
                    } else {
                        adMoxyCtrl.runOnErrors();
                    }
                    return;
                } else if (xhr.status != 200) {
                    adMoxyCtrl.runOnErrors();
                    return;
                }
            }

            try {
                http.addEventListener("load", tC);
                http.addEventListener("error", tF);
                http.open("POST", sConnUrl);
                http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                http.responseType = sdata_Type;
                http.send(postData);
            } catch (_e) {
                adMoxyCtrl.debug(_e);
            }
        } catch (_e) {
            adMoxyCtrl.debug("Adblocker detected (catch error)");
            adMoxyCtrl.runAbFuncts();
            adMoxyCtrl.abDetected = true;
            if (adMoxyCtrl.bypassAb) {
                adMoxyCtrl.request(sact, sArgs, 1, aRet);
            } else {
                adMoxyCtrl.debug("enable the bypassab option to get ads");
            }
        }
    },
    loadBin: function (s, c) {
        let ob = this;
        ob.request("loadimage", `&act=getimage&f=${s}`, 0, {
            result: function (ar) {
                let sd = '';
                if (typeof ar.errors != 'undefined') {
                    ar.errors.forEach(function (v, i) {
                        if (typeof v != 'undefined' && v != '') {
                            ob.debug(v);
                        }
                    });
                }
                c(ar.success, ar.data);
            },
            error: function () {
                c(false, '');
            }
        });
    },
    swpvid: function (obj, itemid, subid) {
        let ob = this;
        if (!adMoxyCtrl.abDetected) {
            adMoxyCtrl.banner.reload(itemid);
            return;
        }
        if (obj.src.indexOf("base64") == -1) {
            try {
                ob.loadBin(obj.src, function (ok, s) {
                    if (ok) {
                        obj.src = s.replace("image", "video");
                    }
                });
            } catch (_e) {
            }
        } else {
            adMoxyCtrl.banner.reload(itemid);
        }
    },
    rma: function (n, ka) {
        let a = [];
        if (n.attributes) {
            for (const at of n.attributes) {
                if (ka.indexOf(at.name) == -1) {
                    a.push(at.name);
                }
            }
            ;
            for (let i = 0; i < a.length; i++) {
                n.removeAttribute(a[i]);
            }
        }
    },
    swap: function (o) {
        let ob = this;
        if (o.src.indexOf("base64") == -1) {
            try {
                ob.loadBin(o.src, function (ok, s) {
                    if (ok) {
                        o.src = s;
                        adMoxyCtrl.rma(o, ['src', 'width', 'height', 'id', 'border']);
                    } else {
                        ob.Tools.remove(o);
                    }
                });
            } catch (_e) {
                adMoxyCtrl.debug(_e);
            }
        }
    },
    open: function (uri, cb, i) {
        i = i | 0;
        let ob = this;
        let win, uc;
        if (i == 0 && (!adMoxyCtrl.abDetected || !adMoxyCtrl.bypassAb)) {
            win = window.open(uri, ob.makeId());
        } else {
            if (adMoxyCtrl.bypassAb) {
                for (const k in adMoxyCtrl.connectors) {
                    uc = adMoxyCtrl.connectors[k];
                    let i = adMoxyCtrl.getItem(uc, 'isproxy', 0);
                    if (i == 1) {
                        if (uri.substring(0, 2) == "//") {
                            uri = "http" + (adMoxyCtrl.isSecure() ? "s" : "") + ":" + uri;
                        }
                        let u = uc['url'] + "?i=0&act=redir&uri=" + escape(uri);
                        win = window.open(u, ob.makeId());
                    }
                }
                ;
            }
        }
        if (cb && typeof cb == 'function') {
            setTimeout(function () {
                if (!win || win.closed) {
                    cb(false);
                } else {
                    cb(true);
                }

            }, 1000);
        }
    },
    handleResult: function (sact, jdata) {
        switch (sact) {
            case 'get':
                if (typeof jdata.init_res != 'undefined') {
                    adMoxyCtrl.initResult(jdata.init_res);
                }
                adMoxyCtrl.addPlugins(jdata);
                if (typeof jdata['results'] != 'undefined') {
                    jdata['results'].forEach(function (aData, i) {
                        try {
                            adMoxyCtrl.interStitalRunning = adMoxyCtrl.interStitalRunning | false;

                            function ds() {
                                if (adMoxyCtrl.interStitalRunning) {
                                    setTimeout(function () {
                                        ds();
                                    });
                                    return;
                                }
                                adMoxyCtrl.display(aData['itemid'], aData);
                            }

                            ds();
                        } catch (_e) {
                            adMoxyCtrl.debug(_e);
                        }
                    });
                }
                break;
        }
    },
    addPlugins: function (jdata) {
        if ('undefined' != typeof (jdata['plugins'])) {
            jdata['plugins'].forEach(function (v, i) {
                try {
                    eval(v);
                } catch (_e) {
                    adMoxyCtrl.debug("error in loading plugin");
                    adMoxyCtrl.debug(_e);
                }
            });
        }
    },
    loadPlugin: function (iItem, splugin, cb) {
        if (adMoxyCtrl.checkPlugin(splugin)) {
            if ('undefined' != typeof cb) {
                try {
                    cb();
                } catch (_e) {
                    adMoxyCtrl.debug(`Error in executing call back in plugin:${splugin} Error:${_e}`);
                }
                return;
            }
            if (iItem > -1) {
                let aItem = adMoxyCtrl.adCals[iItem];
                adMoxyCtrl.adCals[iItem].state = 2;
                adMoxyCtrl.display(iItem, aItem.data);
            }
            return;
        }
        adMoxyCtrl.debug(`loading plugin:${splugin}`);
        adMoxyCtrl.plugins.push(splugin);
        adMoxyCtrl.request('loadplugin', `&act=loadplugin&plugins[0]=${splugin}&ctrl=${adMoxyCtrl.sCtrlName}`, 0, {
            result: function (a) {
                try {
                    eval(a);
                    if ('undefined' != typeof cb) {
                        cb();
                        return;
                    }
                    if (iItem > -1) {
                        let aItem = adMoxyCtrl.adCals[iItem];
                        adMoxyCtrl.adCals[iItem].state = 2;
                        adMoxyCtrl.display(iItem, aItem.data);
                    }
                } catch (_e) {
                    adMoxyCtrl.debug(`error in loading plugin:${splugin}`);
                }
            }
        });
    },
    watch: function (iItem, cb) {
        let ad = adMoxyCtrl.adCals[iItem].data;
        if (typeof ad != 'object' || adMoxyCtrl.adCals[iItem].d_called == 0) {
            setTimeout(function () {
                adMoxyCtrl.watch(iItem, cb);
            }, 500);
        } else {
            cb(ad);
        }
    },
    display: function (iItem, j) {
        let aItem = adMoxyCtrl.adCals[iItem];
        if (adMoxyCtrl.adCals[iItem].state != 2) {
            adMoxyCtrl.adCals[iItem].state = 2;
            adMoxyCtrl.adCals[iItem].d_called = 0;
            adMoxyCtrl.adCals[iItem].settings = adMoxyCtrl.getItem(j, 'settings', {}, false);
            adMoxyCtrl.adCals[iItem].data = j;
        }
        adMoxyCtrl.adCals[iItem].d_called = 0;
        adMoxyCtrl.adCals[iItem].loaded = 0;
        if (!adMoxyCtrl.checkPlugin(aItem.plugin)) {
            adMoxyCtrl.loadPlugin(iItem, aItem.plugin);
            return;
        }
        if ('undefined' != typeof (adMoxyCtrl[aItem.plugin])) {
            adMoxyCtrl[aItem.plugin].display(iItem, j);
            adMoxyCtrl.adCals[iItem].d_called = 1;
        }
    },
    Open: function (uri) {
        this.open(uri, {}, 0);
    },
    openRef: function (i) {
        let item = this.adCals[i];
        if (item != null && typeof item.data != 'undefined') {
            let pid = this.getItem(item.data, 'pubid', 0);
            let spaceid = this.getItem(item.data, 'spaceid', 0);
            if (pid != 0) {
                let url = this.refurl;
                if (url == '') {
                    return;
                }
                url = url.replace('{userid}', pid);
                url = url.replace('{spaceid}', pid);
                this.Open(url);
            }
        }
    },
    isSecure: function () {
        if (window.location.protocol != 'http:') {
            return true;
        }
        return false;
    },


    setAdParams: function (ad, set) {

        let dSubId = adMoxyCtrl.Gup("subid"); /* not sure who is using this? */
        set.sid = adMoxyCtrl.getItem(ad, 'subid', dSubId, true);

        set.kw = adMoxyCtrl.getItem(ad, 'keywords', '', true);
        set.mc = adMoxyCtrl.getItem(ad, 'maincat', '', true);
        set.cat = adMoxyCtrl.getItem(ad, 'category', '', true);
        let s = adMoxyCtrl.getItem(ad, 'sid1', '', true);
        if (s != "") {
            set.sid1 = s;
        }
        s = adMoxyCtrl.getItem(ad, 'sid2', '', true);
        if (s != "") {
            set.sid2 = s;
        }
        s = adMoxyCtrl.getItem(ad, 'sid3', '', true);
        if (s != "") {
            set.sid3 = s;
        }
        s = adMoxyCtrl.getItem(ad, 'sid4', '', true);
        if (s != "") {
            set.sid4 = s;
        }
        s = adMoxyCtrl.getItem(ad, 'sid5', '', true);
        if (s != "") {
            set.sid5 = s;
        }

        s = adMoxyCtrl.getItem(ad, 'sid6', '', true);
        if (s != "") {
            set.sid6 = s;
        }
        s = adMoxyCtrl.getItem(ad, 'sid7', '', true);
        if (s != "") {
            set.sid7 = s;
        }
        s = adMoxyCtrl.getItem(ad, 'sid8', '', true);
        if (s != "") {
            set.sid8 = s;
        }
        s = adMoxyCtrl.getItem(ad, 'sid9', '', true);
        if (s != "") {
            set.sid9 = s;
        }
        s = adMoxyCtrl.getItem(ad, 'sid10', '', true);
        if (s != "") {
            set.sid10 = s;
        }
        s = adMoxyCtrl.getItem(ad, 'qs', '', true);
        if (s != "") {
            set.qs = s;
        }

        s = adMoxyCtrl.getItem(ad, 'em', '', true);
        if (s != "") {
            set.em = s;
        }
        s = adMoxyCtrl.getItem(ad, 'av', 0, false);
        if (s === 1) {
            set.av = s;
        }
    },


    run: function (aPlugins) {
        if (adMoxyCtrl.isPaused) {
            this.debug("Controller cannot run because its set on \"Paused\" please command \"resume\"");
            return false;
        }
        let sArgs = '';
        let aFuncts = [];
        let iCnt = 0;
        let iPluginCnt = 0;
        let iItem = 0;
        let u = 'undefined';

        adMoxyCtrl.adCals.forEach(function (val, i) {
            iItem = i;
            let splugin = adMoxyCtrl.getItem(val, 'plugin', '', false);

            if (splugin != '') {
                splugin = splugin.replace(' ', '');
                if (!(adMoxyCtrl.abDetected && adMoxyCtrl.getItem(adMoxyCtrl.abDisplayProps, splugin, 'yes') == 'no')) {
                    if (val.state == 0) {
                        adMoxyCtrl.adCals[iItem].state = 1;
                        if ('undefined' != typeof (val.fn)) {
                            let args = { plugin: splugin, fn: val.fn, fn_params: val.fn_params };
                            aFuncts.push(args);
                        }
                        let b = true;
                        if (splugin == 'video') {
                            b = false;
                            if (typeof val.videoads != u) {
                                if (!adMoxyCtrl.abDetected) {
                                    val.videoads.forEach(function (ad, tel) {
                                        let b = true;
                                        let set = {
                                            s: {}
                                        };
                                        if (typeof val['settings'] == 'object') {
                                            set.s = val['settings'];
                                        }
                                        let icap = parseInt(adMoxyCtrl.getItem(ad, 'capping', 0));
                                        if (icap > 0) {
                                            let scap = 'video_cap_' + ad.type;
                                            set.s.capping = icap;
                                            if (adMoxyCtrl.getStorage(scap) != null) {
                                                b = false;
                                            }
                                        }
                                        if (b && typeof ad.sid != u) {
                                            set.s.itemid = iItem;
                                            set.s.actionid = tel;
                                            set.s.vtype = adMoxyCtrl.getItem(ad, 'type', 'preroll');
                                            if (typeof ad.defaultad != u) {
                                                let sname = adMoxyCtrl.getItem(ad.defaultad, 'name', 'unknown ad');
                                                let imincpm = adMoxyCtrl.getItem(ad.defaultad, 'mincpm', 0);
                                                if (isNaN(imincpm)) {
                                                    imincpm = 0;
                                                }
                                                let scurr = adMoxyCtrl.getItem(ad.defaultad, 'curr', 'usd');
                                                if (scurr != 'usd') {
                                                    scurr = 'eur';
                                                }
                                                let stype = adMoxyCtrl.getItem(ad.defaultad, 'type', 'vast');
                                                if (stype != 'vast') {
                                                    stype = 'vast';
                                                }
                                                let surl = adMoxyCtrl.getItem(ad.defaultad, 'url', '');
                                                if (surl == '') {
                                                    delete adMoxyCtrl.adCals[iItem].videoads[tel].defaultad;
                                                    adMoxyCtrl.debug(`Missing param 'url' for defaultad in spaceid:${ad.sid}`);
                                                } else {
                                                    set.s.defaultad = { name: sname, mincpm: imincpm, curr: scurr };
                                                }
                                            }
                                            adMoxyCtrl.adCals[iItem].state = 1;
                                            if (typeof adMoxyCtrl.adCals[iItem].actions == u) {
                                                adMoxyCtrl.adCals[iItem].actions = [];
                                            }
                                            adMoxyCtrl.adCals[iItem].actions[tel] = ad;
                                            set.id = ad.sid;

                                            adMoxyCtrl.setAdParams(ad, set);
                                            sArgs += `&ad=${JSON.stringify(set)}`;
                                            iCnt++;
                                        } else {
                                        }
                                    });
                                } else {
                                }
                            }
                            if (typeof adMoxyCtrl.video != u) {
                                adMoxyCtrl.video.display(iItem, {});
                            }
                        } else {
                            let g = '';
                            let set = {
                                s: {}
                            };
                            if (typeof val['settings'] == 'object') {
                                set.s = val['settings'];
                            }
                            if (!adMoxyCtrl.isPreview) {
                                if (splugin == 'banner') {

                                    if (!adMoxyCtrl.Tools.isvisible(`#${val.display}`) && adMoxyCtrl.getItem(val, 'isflt', 0) != 1) {
                                        adMoxyCtrl.debug(`AdTag: ${val.display} ItemId${i} Is hidden, abort processing`);
                                        adMoxyCtrl.adCals[iItem].state = -1;
                                        b = false;
                                    } else {
                                        try {
                                            let pos = adMoxyCtrl.Tools.getnode(`#${adMoxyCtrl.adCals[iItem].display}`).getBoundingClientRect();
                                            set.s.px = parseInt(pos.left);
                                            set.s.py = parseInt(pos.top);
                                        } catch (_e) {
                                            set.s.px = 0;
                                            set.s.py = 0;
                                        }
                                    }
                                }
                            }
                            if (splugin == 'pop') {
                                if (typeof val.skipCookie != u && val.skipCookie == true) {
                                    set.s.skipCookie = 1;
                                }
                                if (typeof val.capSettings == 'object') {
                                    set.s.capSettings = val.capSettings;
                                }
                            }
                            if (splugin == 'banner' || splugin == "pop") {
                                if (typeof val.defaultad != 'undefined') {
                                    let sname = adMoxyCtrl.getItem(val.defaultad, 'name', 'unknown FO Ad');
                                    let imincpm = parseFloat(adMoxyCtrl.getItem(val.defaultad, 'mincpm', 0.000001));
                                    let scurr = adMoxyCtrl.getItem(val.defaultad, 'curr', 'usd');
                                    if (scurr != 'eur' && scurr != 'usd') {
                                        scurr = 'usd';
                                    }
                                    let buse = true;
                                    let url = '';
                                    if (splugin == 'banner') {
                                        let type = adMoxyCtrl.getItem(val.defaultad, 'type', 'image');
                                        let path, data, url = '';
                                        switch (type) {
                                            case 'image':
                                                path = adMoxyCtrl.getItem(val.defaultad, 'image', '');
                                                url = adMoxyCtrl.getItem(val.defaultad, 'url', '');
                                                break;
                                            case "iframe":
                                                path = adMoxyCtrl.getItem(val.defaultad, 'iframe', '');
                                                break;
                                            case 'html':
                                                data = adMoxyCtrl.getItem(val.defaultad, 'html', '');
                                                break;
                                        }
                                        if (type == 'image' || type == 'iframe') {
                                            if (path == '') {
                                                adMoxyCtrl.debug(`Adtag ${adMoxyCtrl.getItem(val, 'name', 'Unknown')} is missing the path for his ${type}`);
                                                buse = false;
                                            }
                                            if (type == 'image') {
                                                if (url == '') {
                                                    adMoxyCtrl.debug(`Adtag ${adMoxyCtrl.getItem(val, 'name', 'Unknown')} is missing the url for his Image`);
                                                    buse = false;
                                                }
                                            }
                                        } else if (type == 'html') {
                                            if (data == '') {
                                                adMoxyCtrl.debug(`Adtag ${adMoxyCtrl.getItem(val, 'name', 'Unknown')} is missing the html needed to load as ad`);
                                                buse = false;
                                            }
                                        } else {
                                            adMoxyCtrl.debug(`Adtag ${adMoxyCtrl.getItem(val, 'name', 'Unknown')} has a unvalid 'type' value (${type})`);
                                            buse = false;
                                        }
                                    } else {
                                        url = adMoxyCtrl.getItem(val.defaultad, 'url', '');
                                        if (url == '') {
                                            buse = false;
                                            adMoxyCtrl.debug(`Adtag ${adMoxyCtrl.getItem(val, 'name', 'Unknown')} is missing the url for his Pop`);
                                        }
                                    }
                                    if (buse) {
                                        set.s.defaultad = { name: sname, mincpm: imincpm, curr: scurr };
                                        if (splugin == 'pop') {
                                            set.s.defaultad.url = url;
                                        }
                                    } else {
                                        /* something is wrong.. so remove it */
                                        delete adMoxyCtrl.adCals[iItem].defaultad;
                                    }
                                }
                            }
                            if (b) {

                                if (typeof set.s == 'undefined') {
                                    set.s = { itemid: 0 };
                                }
                                set.s.itemid = iItem;
                                if (typeof val.rtbext == "object") {
                                    set.s.rtbext = JSON.stringify(val.rtbext);
                                }
                                if (adMoxyCtrl.getItem(val, 'sid', '') != '') {
                                    adMoxyCtrl.adCals[iItem].state = 1;
                                    set.id = parseInt(val.sid);
                                    adMoxyCtrl.setAdParams(val, set);
                                    sArgs += `&ad=${JSON.stringify(set)}`;
                                    iCnt++;
                                }
                            }
                        }
                    }
                    if (splugin == "invideo" || splugin == "im" || splugin == "floater" || splugin == "fxim_banner") {
                        if (!adMoxyCtrl.checkPlugin("banner")) {
                            sArgs += `&plugins[${iPluginCnt}]=banner`;
                            adMoxyCtrl.plugins.push("banner");
                            iPluginCnt++;
                        }
                    }
                    if (!adMoxyCtrl.checkPlugin(splugin)) {

                        sArgs += `&plugins[${iPluginCnt}]=${splugin}`;
                        adMoxyCtrl.plugins.push(splugin);
                        iPluginCnt++;
                    }
                }
            } else {
                adMoxyCtrl.debug(`No plugin given in param ${val.toString()}`);
            }
        });
        if (adMoxyCtrl.lazyLoading) {
            if (typeof Waypoint != 'function') {
                sArgs += `&plugins[${iPluginCnt}]=waypoint`;
            }
        }
        if (sArgs != '') {
            let sData = sArgs + '&act=get';
            if (adMoxyCtrl.initDataLoaded == false) {
                adMoxyCtrl.initDataLoaded = true;
                sData += '&getinit=1';
            }
            if (typeof aPlugins != 'undefined') {
                sData += `&pluginsav=${JSON.stringify(aPlugins)}`;
            }
            adMoxyCtrl.request('get', sData, 0, {
                result: function (jdata) {
                    adMoxyCtrl.handleResult('get', jdata);
                    adMoxyCtrl.runFn(aFuncts);
                }
            });
        } else {
            adMoxyCtrl.runFn(aFuncts);
        }
    },
    displayErrors: function (errors) {
        try {
            errors.forEach(function (v, i) {
                adMoxyCtrl.debug(v);
            });
        } catch (e) {
        }
    },
    runFn: function (aFuncts) {
        aFuncts.forEach(function (v, i) {
            let splugin = v['plugin'];
            let fn = v['fn'];
            let fn_params = v['fn_params'];
            try {
                adMoxyCtrl[splugin][fn](fn_params);
            } catch (_e) {
                adMoxyCtrl.debug(`Error in executing function:${fn.toString()},plugin:${splugin.toString()}, Error: ${_e}`);
            }
        });
    },
    checkPlugin: function (s, brv) {
        let u = 'undefined';
        if (typeof adMoxyCtrl[s] == u) {
            if (adMoxyCtrl.plugins.indexOf(s) >= 0) {
                return true;
            }
            if (typeof brv == u) {
                adMoxyCtrl.debug(`Plugin ${s} has to be pulled`);
            }
            return false;
        } else {
            if (adMoxyCtrl.plugins.indexOf(s) >= 0) {
                return true;
            }
            try {
                if (typeof adMoxyCtrl[s]['getVersion'] == u) {
                    adMoxyCtrl.debug(`Plugin ${s} is really out of date, loading the new version`);
                    return false;
                } else {
                    let version = adMoxyCtrl[s]['getVersion']();
                    if (version == u || (typeof adMoxyCtrl.pluginInfo[s] != u && version < adMoxyCtrl.pluginInfo[s]['version'])) {
                        adMoxyCtrl.debug(`Plugin ${s} is out of date, pulling the new version`);
                        return false;
                    }
                    if (typeof brv != u) {
                        return version;
                    } else {
                        if (typeof adMoxyCtrl.pluginInfo[s] == u) { /* we didn't finish the init yet */
                            return false;
                        }
                    }
                }
            } catch (_e) {
                adMoxyCtrl.debug(`Something is wrong with checking plugin ${s}`);
                adMoxyCtrl.debug(_e);
                return false;
            }
        }
        return true;
    },
    getItem: function (arr, fld, dval, escChars, sPrepend) {

        let debug = false;
        if (fld.indexOf(".") > 0) { /* we need to go deeper */
            let ags = fld.split(".");
            for (let i = 0; i < ags.length - 1; i++) { /* all except its last */
                let key = ags[i];
                if (arr != null && typeof (arr[key]) != 'undefined') {
                    arr = arr[key];
                    fld = ags[i + 1];
                }
            }
        }


        let rval;
        if (arr != null && typeof (arr) != 'undefined' && (typeof (arr[fld]) != 'undefined')) {
            rval = arr[fld];
            if (typeof dval == "boolean") {
                let aret = (rval === 'true' || rval === '1' || rval === true) ? true : false;
                return aret;
            } else if (typeof dval == "number") {
                return parseInt(rval);
            } else {
            }
            if (arr[fld] === '') {
                return dval;
            }
        } else {
            rval = dval;
            if (typeof dval != "string") {
                return dval;
            }
        }
        if (escChars != null && typeof escChars != 'undefined' && escChars) {
            rval = adMoxyCtrl.escChars(rval);
        }
        return (sPrepend != null && typeof (sPrepend) != 'undefined' ? sPrepend : '') + rval;
    },
    loaded: function (i) {

        let o = this;
        let a = o.adCals[i].data;
        let g = parseInt(o.getItem(a, 'logimp', 1));
        if (g === 1) {
            if (!o.adCals[i].loaded) {
                o.adCals[i].loaded = true;
                o.AddImplog(a['hash']);
                o.debug("Impression log added for Adzone ", o.adCals[i].sid);
            }
        }
    },
    clicked: function (i) {
        adMoxyCtrl.debug(`ad ${i} is clicked`);
    },
    escChars: function (s) {
        return escape(s);
    },
    encode: function (s) {
        return adMoxyCtrl.Base64.encode(s);
    },
    utf8_encode: function (s) {
        return adMoxyCtrl.Base64._utf8_encode(s);
    },
    createCookie: function (cookieName, cookieState, cookieLifetime) {
        try {
            let date = new Date(new Date().getTime() + (cookieLifetime * 60 * 1000)).toGMTString();
            document.cookie = `${cookieName}=${cookieState}; expires=${date}; path=/`;
        } catch (_e) {
        }
    },
    readCookie: function (name) {
        try {
            let nameEQ = name + "=";
            let ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) == ' ')
                    c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) == 0) return unescape(c.substring(nameEQ.length, c.length));
            }
        } catch (_e) {
        }
        return "";
    },
    removeStorage: function (name) {
        let infSt;
        try {
            infSt = ((!!window.localStorage) && (!!window.atob));
        } catch (e) {
            infSt = 0;
        }
        if (infSt) {
            try {
                window.localStorage.removeItem(name);
            } catch (e) {
                adMoxyCtrl.debug(`removeStorage: Error removing key [${name}] from localStorage: ${JSON.stringify(e)}`);
                return false;
            }
            return true;
        }
    },
    getStorage: function (key) {
        let infSt;
        try {
            infSt = ((!!window.localStorage) && (!!window.atob));
        } catch (e) {
            infSt = 0;
        }
        if (!infSt) {
            return adMoxyCtrl.readCookie(key);
        } else {
            let now = Date.now(); /* epoch time, lets deal only with integer */
            try {
                let item = window.localStorage.getItem(key);
                if (item === undefined || item == null) {
                    return null;
                } else {
                    item = JSON.parse(item);
                    let tm = item.expires;
                    let val = item.value;
                    if (tm < now) {
                        adMoxyCtrl.removeStorage(key);
                        return null;
                    } else {
                        return val;
                    }
                }
            } catch (e) {
                adMoxyCtrl.debug(`getStorage: Error reading key [${key}] from localStorage: ${JSON.stringify(e)}`);
                return null;
            }
        }
    },
    Gup: function (name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        let regexS = "[\\?&]" + name + "=([^&#]*)";
        let regex = new RegExp(regexS);
        let results = regex.exec(document.location.href);
        if (results == null) {
            try {
                let results = regex.exec(top.location.href);
                if (results == null) {
                    return "";
                }
            } catch (_e) {
                return "";
            }
        }
        return results[1];
    },
    setStorage: function (key, value, expires) {
        let infSt;
        try {
            infSt = ((!!window.localStorage) && (!!window.atob));
        } catch (e) {
            infSt = 0;
        }
        if (!infSt) {
            adMoxyCtrl.createCookie(key, value, expires);
        } else {
            if (expires === undefined || expires === null) {
                expires = (24 * 60); /* default: minutes for 1 day */
            } else {
                expires = Math.abs(expires); /* make sure it's positive */
            }
            let now = Date.now(); /* millisecs since epoch time, lets deal only with integer */
            let schedule = now + (expires * 60 * 1000); /* expecting minutes */
            try {
                let item = { expires: schedule, value: value };
                window.localStorage.setItem(key, JSON.stringify(item));
            } catch (e) {
                adMoxyCtrl.debug(`setStorage: Error setting key [${key}] in localStorage: ${JSON.stringify(e)}`);
                return false;
            }
            return true;
        }
    },
    reload: function (i) {
        let item = adMoxyCtrl.adCals[i];
        item.loaded = false;
        try {
            delete item.data;
            delete item.loaded;
            delete item.btype;
            delete item.state;
            delete item.settings;
        } catch (e) {
        }
        item.reload = 1;
        item.state = 0;
        adMoxyCtrl.run();
    },
    logImp: function (iItem, adtype, xargs, aItem) {
        let u = 'undefined';
        let aAd;
        if (aItem == null || typeof aItem == 'undefined') {

            aAd = adMoxyCtrl.adCals[iItem].data;
        } else {
            aItem = adMoxyCtrl.adCals[iItem];
            aAd = aItem.data; /* troug plugin video */
        }
        adMoxyCtrl.AddImplog(aAd['hash']);

        adMoxyCtrl.bkLog('impression', iItem, {}, aItem);
    },

    getAdDomain: function () {
        return adMoxyCtrl.ctrlSettings.ctrl_domain;
    },


    Base64: {
        _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        encode: function (e) {
            let t = "";
            let n, r, i, s, o, u, a;
            let f = 0;
            e = this._utf8_encode(e);
            while (f < e.length) {
                n = e.charCodeAt(f++);
                r = e.charCodeAt(f++);
                i = e.charCodeAt(f++);
                s = n >> 2;
                o = (n & 3) << 4 | r >> 4;
                u = (r & 15) << 2 | i >> 6;
                a = i & 63;
                if (isNaN(r)) {
                    u = a = 64;
                } else if (isNaN(i)) {
                    a = 64;
                }
                t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a);
            }
            return t;
        },
        _utf8_encode: function (e) {
            e = e.replace(/\r\n/g, "\n");
            let t = "";
            for (let n = 0; n < e.length; n++) {
                let r = e.charCodeAt(n);
                if (r < 128) {
                    t += String.fromCharCode(r);
                } else if (r > 127 && r < 2048) {
                    t += String.fromCharCode(r >> 6 | 192);
                    t += String.fromCharCode(r & 63 | 128);
                } else {
                    t += String.fromCharCode(r >> 12 | 224);
                    t += String.fromCharCode(r >> 6 & 63 | 128);
                    t += String.fromCharCode(r & 63 | 128);
                }
            }
            return t;
        },
    }
};
adMoxyCtrl.skin = {
    getVersion: function () {
        return "1.0";
    },
    display: function (iItem, ad) {
        const aItem = adMoxyCtrl.adCals[iItem];
        const s = adMoxyCtrl.getItem(aItem, "bindto", "body");
        const t = adMoxyCtrl.Tools;
        const node = t.getnode(s);
        const simg = ad.imagepath;
        if (node) {
            if (adMoxyCtrl.abDetected) {
                adMoxyCtrl.loadBin(simg, function (ok, sd) {
                    if (ok) {
                        t.css(s, { 'background-image': `url("${sd}")`, 'background-repeat': 'repeat' });
                    }
                });
            } else {
                t.css(s, { 'background-image': `url("${simg}")`, 'background-repeat': 'repeat' });
            }
            adMoxyCtrl.AddImplog(ad.hash);
            adMoxyCtrl.bkLog('view', iItem);
            node.addEventListener('click', function (e) {
                try {
                    if (e.path[0] == node) {
                        const lc = adMoxyCtrl.getItem(ad, 'logclick', '0') == "1";
                        let url;
                        if (lc) {
                            url = adMoxyCtrl.getItem(ad, 'destinationurl', '');
                        } else {
                            let sDomain = "";
                            if (typeof adMoxyCtrl.ctrlSettings.ctrl_domain != 'undefined' && adMoxyCtrl.ctrlSettings.ctrl_domain != "") {
                                sDomain = adMoxyCtrl.ctrlSettings.ctrl_domain;
                            }
                            url = `${sDomain}/click.go?xref=${ad['hash']}`;
                        }
                        adMoxyCtrl.open(url, function (ok) {
                            if (ok) {
                                if (lc) {
                                    const uri = `act=logclick&xref=${ad['hash']}`;
                                    adMoxyCtrl.request('logclick', uri, 0, { result: function (rdata) { } });
                                }
                                adMoxyCtrl.bkLog('click', iItem);
                            }
                        });
                    }
                } catch (_e) {
                }
            });
        }
    }
};adMoxyCtrl.banner = {
    sTag: "",
    getVersion: function () {
        return "7.9";
    },
    imghwd: [],
    wpc: false,
    haswebp: false,
    display: function (iItem, json) {
        const o = this;
        if (adMoxyCtrl.getItem(json, 'adtype', '') === 'native') {
            adMoxyCtrl.loadPlugin(-1, "native", function () {
                json.adtype = 'banner';
                adMoxyCtrl.native.display(iItem, json);
            });
            return;
        }
        if (typeof adMoxyCtrl.adCals[iItem] === 'undefined') return;
        if (typeof adMoxyCtrl.lazyLoading === 'undefined') adMoxyCtrl.lazyLoading = false;

        const aItem = adMoxyCtrl.adCals[iItem];
        const displaySelector = `#${aItem['display']}`;
        aItem.data = [];
        let Bfound = false;
        let bExit = false;
        const aNodes = adMoxyCtrl.Tools.getnodes(displaySelector);
        aNodes.forEach(function (node, i) {
            let srun = node.getAttribute('run');
            let reload = adMoxyCtrl.getItem(aItem, 'reload', 0);
            if (srun == 1) {
                if (json.pubid == 13296) {
                    if (reload != 1) {
                        reload = 1;
                        srun = '';
                        adMoxyCtrl.debug("Override used Node");
                    }
                }
            }
            if (srun != '1' || reload == 1) {
                if (!Bfound) {
                    delete aItem.reload;
                    if (reload == 1) adMoxyCtrl.Tools.html(node, '');
                    if (aItem.plugin === 'banner') {
                        if (adMoxyCtrl.abDetected) {
                            adMoxyCtrl.Tools.getnode(displaySelector).removeAttribute("style");
                        }
                        if (!adMoxyCtrl.Tools.isvisible(displaySelector)) {
                            if (adMoxyCtrl.getItem(aItem, 'isflt', 0) != 1) {
                                if (!adMoxyCtrl.abDetected) {
                                    adMoxyCtrl.debug(`AdTag ${aItem['display']} is not visible, abort loading`);
                                    bExit = true;
                                    return true;
                                } else {
                                    adMoxyCtrl.debug(`AdTag ${aItem['display']} is not visible, probably because the active adblocker`);
                                }
                            }
                        }
                    }
                    let aAds = [];
                    if (typeof json.items !== 'undefined' && json.items.length > 0) {
                        aAds = json.items;
                        const sId = o.makeId(15);
                        adMoxyCtrl.Tools.html(node, `<div id="${sId}" style="width:${json.adwidth}px;height:${json.adheight}px;overflow:hidden;margin:0px;padding:0px;"></div>`);
                        node = adMoxyCtrl.Tools.getnode(`#${sId}`);
                    } else {
                        adMoxyCtrl.Tools.html(node, '');
                        aAds.push(json);
                    }
                    adMoxyCtrl.Tools.attr(node, 'run', '1');
                    aAds.forEach(function (ad, i) {
                        if (adMoxyCtrl.getItem(ad, 'sellingtype', 'unk') === 'own_ad_eactrl') {
                            ad.type = adMoxyCtrl.getItem(aItem.defaultad, 'type', 'image');
                            switch (ad.type) {
                                case 'image':
                                    ad.bannerpath = adMoxyCtrl.getItem(aItem.defaultad, 'image', '');
                                    ad.destinationurl = adMoxyCtrl.getItem(aItem.defaultad, 'url', '');
                                    break;
                                case 'iframe':
                                    ad.bannerpath = adMoxyCtrl.getItem(aItem.defaultad, 'iframe', '');
                                    break;
                                case 'html':
                                    ad.html = adMoxyCtrl.getItem(aItem.defaultad, 'html', '');
                                    break;
                            }
                            ad.bannertype = ad.type;
                            ad.isrtb = 0;
                            ad.networkid = 0;
                            ad.ispubad = 1;
                        }
                        aItem.data.push(ad);
                        o.genHtml(iItem, ad, function (s) {
                            if (adMoxyCtrl.lazyLoading && !adMoxyCtrl.Tools.isInFold(node) && typeof Waypoint === 'function') {
                                try {
                                    new Waypoint({
                                        element: node,
                                        handler: function () {
                                            o.execute(node, s, aItem, i, iItem);
                                            this.destroy();
                                        },
                                        offset: 'bottom-in-view'
                                    });
                                } catch (_e) {
                                    o.execute(node, s, aItem, i, iItem);
                                }
                            } else {
                                adMoxyCtrl.debug(`Banner node injecting adzone ${ad.spaceid}`, "nodeid", node.id);
                                o.execute(node, s, aItem, i, iItem);
                            }
                        }, i);
                    });
                    Bfound = true;
                }
                return;
            } else {
                adMoxyCtrl.debug(`Ad was already placed? ${json.spaceid}`);
            }
        });
        if (bExit) return;
        if (!Bfound) {
            if (aNodes.length > 0) {
                adMoxyCtrl.debug(`Could not use adnode ${aItem['display']}`);
            } else {
                adMoxyCtrl.debug(`Could not find element with id:${aItem['display']}`);
            }
        }
    },
    execute: function (node, sHtml, aItem, i, iItem) {
        const o = this;
        adMoxyCtrl.Tools.append(node, sHtml);
        if (adMoxyCtrl.ctrlId == 112) {
            adMoxyCtrl.Tools.css(node, { "overflow": "visible" });
        }
        if (typeof aItem.onload === 'function') {
            try {
                aItem.onload(function () { });
            } catch (_e) {
                adMoxyCtrl.debug(`something went wrong with executing the onload function for adtag:${adMoxyCtrl.getItem(aItem, 'name', 'unk')}`);
                adMoxyCtrl.debug(_e);
            }
        }
        let ir = adMoxyCtrl.getItem(aItem, 'reloadtime', 0);
        if (ir > 0) {
            if (ir < 4) ir = 4;
            ir *= 1000;
            setTimeout(function () {
                if (typeof aItem.onbeforeReload === 'function') {
                    try {
                        aItem.onbeforeReload(function () { o.reload(iItem); });
                    } catch (_e) {
                        adMoxyCtrl.debug(`something went wrong with executing the onbeforeReload function for adtag:${adMoxyCtrl.getItem(aItem, 'name', 'unk')}`);
                        adMoxyCtrl.debug(_e);
                        o.reload(iItem);
                    }
                } else {
                    o.reload(iItem);
                }
            }, ir);
        }
        o.addHandler(iItem, {}, i);
    },
    reload: function (iItem) {
        const aItem = adMoxyCtrl.adCals[iItem];
        aItem.loaded = false;
        try {
            delete aItem.data;
            delete aItem.loaded;
            delete aItem.btype;
            delete aItem.state;
            delete aItem.settings;
        } catch (e) { }
        aItem.reload = 1;
        aItem.state = 0;
        adMoxyCtrl.run();
    },
    addHandler: function (iItem, functs, iSubItem) {
        iSubItem = iSubItem | 0;
        if (typeof functs !== 'undefined') {
            this.imghwd[iItem] = functs;
        } else {
            functs = this.imghwd[iItem];
        }
        const aItem = adMoxyCtrl.adCals[iItem];
        const px = `${this.sTag}${iItem}${iSubItem}px`;
        const n = adMoxyCtrl.Tools.getnode(`#${px}`);
        if (n) {
            n.addEventListener('load', function () {
                adMoxyCtrl.banner.loaded(iItem, aItem['btype'], this, functs, iSubItem);
            });
        } else {
            adMoxyCtrl.debug('cannot find pixel node');
        }
        const btype = aItem['btype'];
        if (btype === 'image' || btype === 'video' || btype === 'image_set' || btype === 'hotlink_iframe') {
            const clickSelector = `#${this.sTag}u${iItem}_${iSubItem}`;
            const na = adMoxyCtrl.Tools.getnode(clickSelector);
            if (na) {
                na.addEventListener('click', function (event) {
                    event.stopImmediatePropagation();
                    let ad = aItem['data'];
                    if (typeof ad.length !== 'undefined') ad = ad[iSubItem];

                    const IsPhone = typeof ad.is_phone === 'boolean' ? ad.is_phone : false;
                    if (IsPhone) {
                        adMoxyCtrl.request('logclick', `act=logclick&xref=${ad['hash']}`, 0, { result: function () { } });
                    } else {
                        const sDomain = adMoxyCtrl.getItem(adMoxyCtrl.ctrlSettings, 'ctrl_domain', '');
                        const url = `${sDomain}/click.go?xref=${ad['hash']}`;
                        if (adMoxyCtrl.getItem(aItem, 'target', '') === 'self') {
                            document.location = url;
                        } else {
                            adMoxyCtrl.open(url, function (ok) {
                                if (ok) adMoxyCtrl.bkLog('click', iItem, { isiframe: 0 });
                            });
                        }
                    }
                    return false;
                });
            } else {
                adMoxyCtrl.debug(`cannot find node ${clickSelector}`);
            }
        }
    },
    loaded: function (iItem, sType, Object, functs, iSubItem) {
        const u = 'undefined';
        iSubItem = iSubItem | 0;
        if (adMoxyCtrl.abDetected && typeof sType !== u && sType === 'img') {
            if (typeof adMoxyCtrl.Tools.getnode(Object).getAttribute('class') !== u) {
                adMoxyCtrl.debug('Swap image because ab blocked');
                adMoxyCtrl.swap(Object);
                return;
            }
        }
        if (typeof functs !== u && typeof functs.onload !== u) {
            functs.onload();
        }
        let aAd = adMoxyCtrl.adCals[iItem].data;
        if (typeof aAd.length !== 'undefined') aAd = aAd[iSubItem];

        if (typeof aAd.loaded !== 'undefined' && aAd.loaded) {
            this.reload(iItem);
            return;
        }
        const aItem = adMoxyCtrl.adCals[iItem];
        const displaySelector = `#${aItem['display']}`;
        const tagSelector = `#${this.sTag}${iItem}`;
        if (adMoxyCtrl.abDetected && aItem.data.type === 'image' && aItem.plugin === 'banner') {
            if (!adMoxyCtrl.Tools.isvisible(displaySelector)) {
                adMoxyCtrl.Tools.attr(displaySelector, 'style', 'display:block !important');
                if (!adMoxyCtrl.Tools.isvisible(displaySelector)) {
                    adMoxyCtrl.debug('Ad hidden by adblocker');
                    return;
                }
            } else if (!adMoxyCtrl.Tools.isvisible(tagSelector)) {
                adMoxyCtrl.Tools.attr(tagSelector, 'style', 'display:block !important');
                if (!adMoxyCtrl.Tools.isvisible(tagSelector)) {
                    adMoxyCtrl.debug('Ad hidden by adblocker');
                    return;
                }
            }
        }
        adMoxyCtrl.adCals[iItem].loaded = true;
        adMoxyCtrl.debug(`${aItem.plugin} ItemId:${iItem} finished`);
        if (typeof aAd.nurl !== u && aAd.nurl !== '') {
            const ul = aAd.nurl.replace('${AUCTION_PRICE}', aAd.bid);
            adMoxyCtrl.Tools.append('body', `<img src="${ul}" border="0" width="1" height="1"/>`);
        }
        adMoxyCtrl.debug(`Add Impression Log ${aAd.spaceid}`);
        adMoxyCtrl.AddImplog(aAd['hash']);
        adMoxyCtrl.bkLog('view', iItem);
    },
    iframe: function (args) {
        const sHtml = `<iframe class="" name="${adMoxyCtrl.getItem(args, 'name', '')}" id="${adMoxyCtrl.getItem(args, 'id', '')}" src="${adMoxyCtrl.getItem(args, 'url', '')}" width="${adMoxyCtrl.getItem(args, 'width', '')}" height="${adMoxyCtrl.getItem(args, 'height', '')}" scrolling="${adMoxyCtrl.getItem(args, 'scroll', 'no')}" frameborder="0"></iframe>`;
        adMoxyCtrl.Tools.html(`#${args.display}`, sHtml);
        if (typeof args.onerror !== 'undefined') {
            adMoxyCtrl.Tools.getnode(`#${args.id}`).addEventListener('error', function () {
                try {
                    adMoxyCtrl.Tools.html(`#${args.display}`, '');
                    args.onerror();
                } catch (_e) { }
            });
        }
        if (typeof args.onload !== 'undefined') {
            adMoxyCtrl.Tools.getnode(`#${args.id}`).addEventListener('load', function () {
                try { args.onload(); } catch (_e) { }
            });
        }
    },
    open: function (uri) {
        const win = window.open(uri);
        setTimeout(function () {
            if (!win || win.closed) top.location = uri;
        }, 500);
    },
    makeId: function (iMax) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let t = '';
        for (let i = 0; i < iMax; i++) {
            t += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return t;
    },
    vidloaded: function () { },
    genHtml: function (iItem, json, callBack, i) {
        const o = this;
        if (!o.wpc) {
            o.wpc = true;
            o.hasWebP(function (ok) {
                o.haswebp = ok;
                o.genHtml(iItem, json, callBack, i);
            });
            return;
        }
        const iSubItem = (i != null) ? i : 0;
        if (this.sTag === '') {
            this.sTag = this.makeId(Math.floor(Math.random() * 10 + 1));
        }
        const aItem = adMoxyCtrl.adCals[iItem];
        let sXy = '';
        let sHtml = '';
        const DynamicBanner = adMoxyCtrl.getItem(json.settings, 'isdynamic', 0) == 1;
        let ShowAboutInfo = typeof json.about === 'boolean' ? json.about : false;
        if (adMoxyCtrl.Gup("about") == 1) ShowAboutInfo = true;
        json.about = ShowAboutInfo;

        let IsPhone = typeof json.is_phone === 'boolean' ? json.is_phone : false;
        const PhoneNumber = IsPhone ? adMoxyCtrl.getItem(json, 'phone_number', '') : '';
        if (PhoneNumber === '' && IsPhone) {
            IsPhone = false;
            json.is_phone = false;
        }
        let sXyStyle = '';

        if (DynamicBanner) {
            if (json.settings.width.responsive == 1) {
                sXy = 'width="100%"';
                sXyStyle = 'width:100%;';
            } else {
                sXy = `width="${json.settings.width.value}"`;
                sXyStyle = `width:${json.settings.width.value}px;`;
            }
            if (json.settings.height.responsive == 1) {
                sXy += ' height="100%"';
                sXyStyle += 'height:100%;';
            } else {
                sXy += ` height="${json.settings.height.value}"`;
                sXyStyle += `height:${json.settings.height.value}px;`;
            }
        } else {
            if (aItem['responsive'] == '1') {
                sXy = 'width="100%"';
                sXyStyle = 'width:100%;';
            } else {
                sXy = `width="${json['adwidth']}" height="${json['adheight']}"`;
                sXyStyle = `width:${json['adwidth']};height:${json['adheight']}px;`;
            }
        }
        adMoxyCtrl.adCals[iItem]['btype'] = json['type'];
        let ttl = adMoxyCtrl.getItem(json, 'ainfo', '');
        if (ttl !== '') ttl = `title="${ttl}" `;

        const tag = this.sTag;
        const px = `${tag}${iItem}${iSubItem}px`;
        const linkId = `${tag}u${iItem}_${iSubItem}`;
        const elemId = `${tag}${iItem}_${iSubItem}`;
        const phoneHref = IsPhone ? `href="tel:${PhoneNumber}"` : 'href="#" rel="sponsored noopener nofollow" role="banner"';
        const pxImg = `<img width="0" height="0" id="${px}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="/>`;

        switch (json['type']) {
            case 'img_base64':
                sHtml = `<a id="${linkId}" ${phoneHref}><img ${ttl} id="${elemId}" src="${json['imgdata']}" ${sXy} border="0"/></a>${pxImg}`;
                break;
            case 'hotlink_iframe':
                sHtml = `<a style="display: inline-block; cursor: pointer;" id="${linkId}" href="#" rel="sponsored noopener nofollow" role="banner"><iframe ${ttl} style="pointer-events: none; border: 0;" rel="sponsored noopener nofollow noindex" sandbox="allow-same-origin allow-scripts" src="${json.bannerpath}" ${sXy} id="${elemId}px" style="border: 0px;margin: 0,0"></iframe></a>${pxImg}`;
                break;
            case 'iframe':
                sHtml = `<iframe ${ttl} rel="sponsored noopener nofollow noindex" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-scripts allow-top-navigation-by-user-activation allow-forms" src="${json.bannerpath}" ${sXy} id="${elemId}px" style="border: 0px;margin: 0,0" frameborder="0" scrolling="no" marginwidth="0" marginheight="0"></iframe>${pxImg}`;
                break;
            case 'image_set': {
                const spath = json.bannerpath;
                let sm;
                if (!adMoxyCtrl.abDetected && o.haswebp) {
                    sm = (json.files['webp'] != null && json.files['webp'] !== '') ? json.files['webp'] : json.files['org'];
                } else {
                    sm = (json.files['org'] != null && json.files['org'] !== '') ? json.files['org'] : json.files['webp'];
                }
                sHtml = `<a id="${linkId}" ${phoneHref}><img ${ttl} id="${elemId}" src="${spath}/${sm}" ${sXy} border="0" onerror="adMoxyCtrl.swap(this)"/></a>${pxImg}`;
                break;
            }
            case 'image':
                sHtml = `<a id="${linkId}" ${phoneHref}><img ${ttl} id="${elemId}" src="${json.bannerpath}" ${sXy} border="0" onerror="adMoxyCtrl.swap(this)"/></a>${pxImg}`;
                break;
            case 'html':
                sHtml = `${json.html}${pxImg}`;
                break;
            case 'video': {
                const sImg = json.bannerpath;
                const vidId = `${tag}_vid_${iItem}_${iSubItem}`;
                const alt = adMoxyCtrl.getItem(json, 'alt_image', '');
                sHtml = `<a id="${linkId}" ${phoneHref} ${sXy}>`;
                if (alt !== '' && !adMoxyCtrl.abDetected) {
                    let poster = adMoxyCtrl.getItem(json, 'screenshot', '');
                    if (poster !== '') poster = `poster="${poster}" `;
                    sHtml += `<video id="${vidId}" autoplay muted playsinline loop data-object-fit="cover" ${poster} onload="adMoxyCtrl.banner.vidloaded(this)" ${sXy} src="${sImg}" type="video/mp4" altimg="${alt}" onerror="adMoxyCtrl.banner.swpvid(this)"></video></a>`;
                } else {
                    sHtml += `<video id="${vidId}" autoplay muted playsinline loop data-wf-ignore="true" data-object-fit="cover" ${sXy} onload="adMoxyCtrl.banner.vidloaded(this)" src="${sImg}" type="video/mp4" onerror="adMoxyCtrl.swpvid(this,${iItem},${iSubItem})"></video></a>`;
                }
                sHtml += pxImg;
                break;
            }
            default:
                adMoxyCtrl.debug(`unknown bannertype:${json['type']}`);
                break;
        }

        if (ShowAboutInfo) {
            const aboutEvt = `adMoxyCtrl.banner.showAbout('${tag}',${iItem},${iSubItem})`;
            let s = `<div style="position: relative;${sXyStyle}padding:0px;margin:0px;">`;
            s += `<img onmouseover="${aboutEvt}" onclick="${aboutEvt}" id="${tag}_icn_${iItem}_${iSubItem}" style="position:absolute;top:2px;left:2px;z-index:10000;border-radius:50%;background:#ffffff;width:15px;height:15px;cursor:pointer" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAACXBIWXMAAAsTAAALEwEAmpwYAAABhUlEQVR4nM2WsUoDQRRFj8mioD8gWEXxCyyMsbHVT7CMJD8giJ2Fxn+wtNIUYiEB61jZRLQQBC2SlEkhgooWrgy8DcO6m3kzWnjhQQj3cnfe3Jk38I9QACrAIdAErqROgQawIpxgREAd6AOxo/pATTReWADuFAZxqm6Bea3JKjAMMImlhtJq50o0Jg+OFQ+AUp5JpGzXETAhmv0xvBugmGVUV7Zmw9IsObhbaZOCMl2mLoAZYAo4dnB76ehXPDf8A3hVcsu2UUMh+ASugTPg0eOjzD6O0HSQW8BcKjgtpZG5QUZoO8jPwBewY2mqSqO2j1FSpsUJtkOMXK1Lat3SnIe0ThOGd2Ba+JPAS0gYNPG+tPhrHqkr+x7YPYu/qzTpZs2qmkNkJ25TTv2TQ2OS+QORzJM80T0wa/EX5TrK43fyLlVkaI0bE2/yMV05V0Fjwg7GwGOz4wwT845QoSTzxNeko1lJGkWZJz1luqrj9kQDE09zFg6AE+u5ZX6b/5Z/+9z6U3wDO7KJQlUPB4IAAAAASUVORK5CYII=">`;
            s += `<div id="${tag}_about_${iItem}_${iSubItem}" style="display:none;background:#000000 !important;position:absolute;top:1px;left:18px;height:14px;width:66px;color:#ffffff !important;border:1px solid #FFFFFF;text-align: center;font-family:sans-serif;font-size:10px;line-height:15px;border-radius:5px;z-index:1000;cursor:pointer" onclick="adMoxyCtrl.banner.openAbout(${iItem},${iSubItem})">About this Ad</div>`;
            sHtml = `${s}${sHtml}</div>`;
        }

        if (typeof json.imp_trackingurl !== 'undefined' && json.imp_trackingurl !== '') {
            sHtml += `<img style="width:0px;height:0px;" width="0" height="0" src="${json.imp_trackingurl}" onerror="adMoxyCtrl.Tools.remove(this)" border="0"/>`;
        }

        callBack(sHtml);
    },
    openAbout: function (iItem, iSubItem) {
        const aItem = adMoxyCtrl.adCals[iItem];
        let ad = aItem['data'];
        if (typeof ad.length !== 'undefined') ad = ad[iSubItem];
        const domain = adMoxyCtrl.getItem(adMoxyCtrl.ctrlSettings, 'ctrl_domain', '');
        if (domain !== '') {
            let uri = `https://${domain}/about.go`;
            if (ad.hash !== '') uri += `?xref=${ad.hash}`;
            adMoxyCtrl.open(uri);
        }
    },
    showAbout: function (sTag, iItem, iSubItem) {
        const selector = `#${sTag}_about_${iItem}_${iSubItem}`;
        adMoxyCtrl.Tools.show(selector);
        setTimeout(function () { adMoxyCtrl.Tools.hide(selector); }, 5000);
    },
    swpvid: function (vid) {
        const imgpath = vid.getAttribute('altimg');
        const img = document.createElement('img');
        adMoxyCtrl.debug(`video ${vid.src} got replaced with ${imgpath} because of an error`);
        const p = vid.parentNode;
        img.src = imgpath;
        img.setAttribute('width', vid.getAttribute('width'));
        img.setAttribute('height', vid.getAttribute('height'));
        img.setAttribute('onerror', 'adMoxyCtrl.swap(this)');
        img.setAttribute('id', vid.getAttribute('id'));
        p.insertBefore(img, vid);
        p.removeChild(vid);
    },
    hasWebP: function (cb) {
        const img = document.createElement('img');
        img.onload = function () { cb(img.width === 2 && img.height === 1); };
        img.onerror = function () { cb(false); };
        img.src = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAQAAAAfQ//73v/+BiOh/AAA=';
    }
};adMoxyCtrl.fpa = {
    viewLogged: false,
    layeropen: false,
    ismobile: false,
    ctrlName: 'fpa',
    IsLoaded: false,
    aHtml: [],
    ClickTags: ['a'],
    ignoreList: [],
    sessionTime: 0,
    startAt: 1,
    repeatAt: 0,
    sessData: { time: 0, clicks: 0 },
    sessionName: "",
    lsett: {
        url: "",
        target: ""
    },
    getVersion: function () {
        return "4.9";
    },
    fire: function (iItem) {
        this.css();
        const Html = this.aHtml[iItem];
        if (typeof Html != 'undefined') {
            adMoxyCtrl.Tools.append('body', Html);
            this.IsLoaded = true;
        }
    },
    checkParents: function (aNode, findNode) {
        let aParents = adMoxyCtrl.Tools.parents(aNode);

        let bFound = false;
        try {
            if (aParents != null && aParents.length > 0) {
                for (let i = 0; i < aParents.length; i++) {
                    const v = aParents[i];
                    if (v == findNode) {
                        bFound = true;
                        break;
                    }
                }
            }
        } catch (e) {
        }
        return bFound;
    },
    checkChilds: function (aNode, findNode) {
        let bFound = false;
        try {
            if (typeof aNode.children != 'undefined') {
                const aChilds = aNode.children;
                if (aChilds.length > 0) {
                    for (let i = 0; i < aChilds.length; i++) {
                        const v = aChilds[i];
                        if (v == findNode) {
                            bFound = true;
                            break;
                        }
                    }
                }
            }
        } catch (e) {
        }
        return bFound;
    },

    updateClicks: function () {
        const ob = this;
        ob.sessData.c++;
        let ok = false;
        if (ob.sessData.c == ob.startAt) {
            ok = true;
        } else {
            const t = adMoxyCtrl.Tools;
            if (ob.repeatAt > 0 && ob.sessData.c > ob.startAt) {
                if (ob.sessData.c >= (ob.startAt + ob.repeatAt)) {
                    ok = true;
                    ob.sessData.c = ob.startAt;
                    ob.sessData.t = (t.now() / 1000);
                }
            } else if (ob.repeatAt == 0) {
                ob.sessData.t = (t.now() / 1000);
            }
        }
        sessionStorage.setItem(this.sessionName, JSON.stringify(ob.sessData));
        return ok;
    },

    needCapping: function () {
        return this.sessionTime > 0 && !adMoxyCtrl.Gup("nocap") == 1;
    },


    canFire: function (aNode) {
        const ob = this;
        let bRet = false;
        try {
            ob.ClickTags.forEach(function (v, i) {
                const fNodes = adMoxyCtrl.Tools.getnodes(v);
                if (fNodes != null && fNodes.length > 0) {

                    for (let i = 0; i < fNodes.length; i++) {
                        const fNode = fNodes[i];
                        if (fNode === aNode) {
                            bRet = true;
                            break;
                        } else {
                            if (ob.checkParents(aNode, fNode)) { /* check if there is a parent matching */
                                bRet = true;
                                break;
                            } else if (ob.checkChilds(aNode, fNode)) { /* check if there is a child matching */
                                bRet = true;
                                break;
                            }
                        }
                    }
                }
                if (bRet) {
                    return false; /* skip looping */
                }
            });
        } catch (_e) {
        }
        if (bRet) {
            if (this.ignoreList != null && typeof this.ignoreList == "object") {
                this.ignoreList.forEach(function (v, i) {
                    const fNodes = adMoxyCtrl.Tools.getnodes(v);
                    fNodes.forEach(function (fNode, icnt) {
                        if (fNode == aNode) {
                            bRet = false;
                            return false;
                        } else if (v != 'body' && ob.checkParents(aNode, fNode)) {
                            bRet = false;
                            return false;
                        }
                    });
                    if (bRet == false) {
                        return false;
                    }
                });
            }
        }
        return bRet;
    },
    sessionData: function () {
        let ck = sessionStorage.getItem(this.sessionName);
        if (ck == null || typeof ck != 'string') {
            ck = { t: 0, c: 0 };
            sessionStorage.setItem(this.sessionName, JSON.stringify(ck));
        } else {
            ck = JSON.parse(ck);
        }
        return ck;
    },
    css: function () {
        const css = `.interstitial-topbar {
    flex: 0 0 auto;
    background: #000;
    border-bottom: 1px solid #ddd;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
}
.interstitial-topbar .interstitial-label {
    font-size: 14px;
    font-weight: 500;
    color: #fff;
}
.interstitial {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.25);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 10px;
    box-sizing: border-box;
}
.interstitial-content {
    background: #000;
    border-radius: 12px;
    width: 90vw;
    height: 90vh;
    max-width: 1600px;
    max-height: 900px;
    aspect-ratio: 16/9;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    position: relative;
    display: flex;
    flex-direction: column;
}
.interstitial-content iframe {
    border: none;
    width: 100%;
    height: 100%;
    __border-radius: 12px;
}
@media (max-width: 768px) {
    .interstitial-content {
        width: 95%;
        max-width: 95%;
        max-height: 80vh;
        aspect-ratio: auto;
    }
}`;
        adMoxyCtrl.Tools.append('head', `<style>${css}</style>`);

    },

    display: function (iItem, aItem) {
        if (this.layeropen) {
            return;
        }
        const ob = this;
        const ea = adMoxyCtrl;
        const t = adMoxyCtrl.Tools;
        if (ea.browserInfo.ismobile) {
            t.append('head', '<meta name="viewport" content="width=device-width,height=device-height,initial-scale=1.0"/>');
            this.ismobile = true;
        }
        const Item = ea.adCals[iItem];
        if (Item != null) {
            if (typeof Item.clickTags != 'undefined' && Item.clickTags.length > 0) {
                this.ClickTags = Item.clickTags;
            }
            if (typeof Item.ignoreTags == 'object' && Item.ignoreTags.length > 0) {
                this.ignoreList = Item.ignoreTags;
            }
        }
        let Html = '';
        let uri = `https:${ea.getAdDomain()}/fpa.go?spaceid=${aItem.spaceid}`;
        uri = t.appendUrlParms(uri, aItem) + '&nojump';
        if (ea.isPreview && aItem.destinationurl != null) {
            uri = aItem.destinationurl;
        }
        ob.sessionTime = parseInt(ea.getItem(aItem['settings'], 'refreshtime', 0));
        ob.sessionName = `fpa_${aItem.spaceid}`;
        ob.startAt = parseInt(ea.getItem(aItem['settings'], 'start_at', 0));
        ob.repeatAt = parseInt(ea.getItem(aItem['settings'], 'repeat_at', 0));
        ob.sessData = ob.sessionData();
        let Advertise = ea.getItem(Item, "advertise", "");
        if (ea.isPreview) {
            Advertise = 'Advertisement';
        }
        let s;
        if (typeof ea.sCloseFpaButtonHtml != 'undefined' && ea.sCloseFpaButtonHtml != '') {
            s = ea.sCloseFpaButtonHtml;
        } else {
            s = '<button style="height:40px;font-size:19px;margin-top:5px;margin-right:5px;background:#FFFFFF;color:#000;border-radius:20%"><b>Close</b></button>';
        }
        const closeTitle = ea.isPreview ? 'Preview' : 'Ad';
        const advLabel = Advertise != '' ? `<div style="float:left;"><div class="interstitial-label">${Advertise}</div></div>` : '';
        Html += `<div class="interstitial" id="fpa_layer"><div class="interstitial-content"><div class="interstitial-topbar">${advLabel}<div id="fpa_close_button" style="float:right;" onclick="adMoxyCtrl.fpa.close();"><a title="Close ${closeTitle}">${s}</a></div></div><div id="fpa_loader" class="fpa_loader" style="overflow:none;height: 100%; width: 100%;"><iframe framborder="0" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" style="padding:0;margin:0;border:0;" width="100%" height="100%" id="fpa_frame" onload="adMoxyCtrl.fpa.loaded(${iItem});" src="${uri}" onerror="adMoxyCtrl.fpa.error()"></iframe></div><style id="fpa_css" type="text/css">fpa_frame{overflow-y:scroll !important;border:none;top:0;left:0;margin:0;padding:0;width:100%;height:100%;-webkit-overflow-scrolling: touch;}`;
        if (this.ismobile) { /* mobile needs extra css to get the iframe scolling */
            Html += '.fpa_loader{display: inline-block;-webkit-overflow-scrolling: touch;overflow-y: scroll;}.fpa_loader .fpa_loader{width:100%;}';
        }
        Html += '</style></div></div>';
        ob.aHtml[iItem] = Html;
        if (ea.isPreview) {
            ob.fire(iItem);
        } else {
            const ch = function (t, e) {
                try {
                    if (!ob.IsLoaded) {
                        if (ob.canFire(t)) {
                            if (ob.needCapping()) {
                                if (ob.sessData.time > 0 && ob.sessData.time > ((ea.Tools.now() / 1000) - ob.sessionTime)) {
                                    return false;
                                }
                            }
                            const phref = t.getAttribute("href");
                            const ptarget = t.getAttribute("target");
                            if (phref !== '#' && phref != "" && phref !== 'javascript:void(0)') {
                                if (ob.updateClicks()) {
                                    if (ptarget != null) {
                                        ob.lsett.target = ptarget;
                                    }
                                    ob.lsett.url = phref;
                                    ea.interStitalRunning = true;
                                    ob.IsLoaded = true;
                                    ob.css();
                                    ea.Tools.append('body', Html);
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.stopImmediatePropagation();
                                    ea.debug("Fpa Called");
                                }
                            }
                        }
                    }
                } catch (_e) {
                }
            };
            ea.Tools.on("click", '*', function (e) {
                if (ob.IsLoaded) {
                    return;
                }
                let el = e.target;
                while (el) {
                    if (el.nodeName == 'A') {
                        ch(el, e);
                        return;
                    }
                    el = el.parentNode;
                }
            });
        }
    },
    error: function () {
        adMoxyCtrl.debug("error in loading FPA,probably blocked ");
        this.close();
    },
    close: function () {
        const t = adMoxyCtrl.Tools;
        t.remove("#fpa_layer");
        if (this.ismobile) {
            t.show('body > :not(#fpa_layer)');
        }
        t.css('body', { 'overflow': '' });
        adMoxyCtrl.interStitalRunning = false;
        this.IsLoaded = false;
        this.layeropen = false;
        if (typeof this.lsett.url != 'undefined') {
            if (this.lsett.url != null && this.lsett.url != "") {
                if (this.lsett.target.search('blank') >= 0) {
                    const w = window.open(this.lsett.url, '_blank');
                    this.lsett = {
                        url: "",
                        target: ""
                    };
                } else {
                    top.location.href = this.lsett.url;
                }
            }
        }
    },
    loaded: function (iItem) {
        if (this.layeropen) {
            return;
        }
        const t = adMoxyCtrl.Tools;
        if (this.ismobile) {
            /* it prevent scolling on the original page in some browsers*/
            t.hide('body > :not(#fpa_layer)');
        }
        t.css('body', { 'overflow': 'hidden' });
        window.scrollTo(0, 0);
        this.layeropen = true;
        t.show("#fpa_layer");
        t.on(window, 'resize', function () {
            adMoxyCtrl.fpa.applySize();
        });
        t.on(document, 'scroll', function () {
            adMoxyCtrl.fpa.applySizeScroll();
        });
        t.on(window, "orientationchange", function (event) {
            adMoxyCtrl.fpa.applySize();
        });
        setTimeout(() => {
            adMoxyCtrl.fpa.applySize()
        }, 1000);
        this.applySize();
    },
    displayClose: function () {
        adMoxyCtrl.Tools.fadeIn("#fpa_close_button", 2500);

    },
    gw: function (i) {
        try {
            return (i.innerWidth ? i.innerWidth : (i.offsetWidth ? i.offsetWidth : (i.screen != null ? i.screen.availWidth : 0)));
        } catch (_e) {
            return adMoxyCtrl.Tools.width(i);
        }
    },
    applySize: function () {
        const t = adMoxyCtrl.Tools;
        let iHeight = t.height(window);
        t.css('#fpa_layer', { 'height': `${iHeight}px` });
        iHeight -= (t.height('#fpa_top'));
        t.css('#fpa_loader', { 'height': `${iHeight}px` });
        t.css('#fpa_frame', { 'height': `${iHeight}px` });
        if (this.ismobile) {
            const iWidth = this.gw(window);
            t.css('#fpa_layer', { 'width': `${iWidth}px` });
            t.css('#fpa_frame', { 'width': `${iWidth}px` });
        }
    },
    isLandscape: function () {
        return (window.orientation === 90 || window.orientation === -90);
    },
    applySizeScroll: function () {
        if (this.layeropen) {
            window.scrollTo(0, 0);
            this.applySize();
        }
    },
};adMoxyCtrl.im = {
    skipreload: false,
    reload: false,
    reloadTime: 30,
    popsid: 0,
    isInitialized: false,
    ctrlName: 'im',
    itemId: 0,
    aSet: null,
    sTag: "imlayer",
    getVersion: function () {
        return "4.4";
    },
    hide: function () {
        this.reload = false;
        adMoxyCtrl.Tools.remove([`#${this.sTag}`, `#${this.sTag}_tst`]);
    },
    init: function (iItem, aSett) {
        if (this.isInitialized) { return; }
        aSett['hideadsby'] = true;
        this.isInitialized = true;
        let xposcss = 'right:10px;';
        let xposshcss = 'float:right;';
        if (typeof (aSett['position']) != 'undefined') {
            if (aSett['position'] == 'bottom_left') {
                xposcss = 'left:5px;';
                xposshcss = 'float:left;';
            } else if (aSett['position'] == 'bottom_center') {
                xposcss = `left:50%;margin-left:-${aSett['width'] / 2}px;`;
            }
        }
        let cpos = "fixed";
        try {
            cpos = (document.compatMode == 'CSS1Compat') ? "fixed" : "absolute";
            const browser = navigator.appName;
            const version = parseFloat(navigator.appVersion.split("MSIE")[1]);
            if (browser == "Microsoft Internet Explorer" && version <= 6) {
                cpos = "absolute";
            }
        } catch (_e) { }
        let sCloseButtonHtml = '';
        if (typeof adMoxyCtrl.sCloseButtonHtml == 'undefined') {
            adMoxyCtrl.sCloseButtonHtml = sCloseButtonHtml = "<img alt='Close " + (adMoxyCtrl.isPreview ? "Preview" : "Ad") + " style='background:#ffffff;border-radius: 50%;margin:2px' width='24' height='24' src='data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIwIDAgNDk2IDQ5NiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDk2IDQ5NjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPGc+DQoJCTxnPg0KCQkJPHBhdGggZD0iTTI0OCwwQzExMS4wMzMsMCwwLDExMS4wMzMsMCwyNDhzMTExLjAzMywyNDgsMjQ4LDI0OHMyNDgtMTExLjAzMywyNDgtMjQ4QzQ5NS44NDEsMTExLjA5OSwzODQuOTAxLDAuMTU5LDI0OCwweg0KCQkJCSBNMjQ4LDQ4MEMxMTkuODcsNDgwLDE2LDM3Ni4xMywxNiwyNDhTMTE5Ljg3LDE2LDI0OCwxNnMyMzIsMTAzLjg3LDIzMiwyMzJDNDc5Ljg1OSwzNzYuMDcyLDM3Ni4wNzIsNDc5Ljg1OSwyNDgsNDgweiIvPg0KCQkJPHBhdGggZD0iTTM2MS4xMzYsMTM0Ljg2NGMtMy4xMjQtMy4xMjMtOC4xODgtMy4xMjMtMTEuMzEyLDBMMjQ4LDIzNi42ODhMMTQ2LjE3NiwxMzQuODY0Yy0zLjA2OS0zLjE3OC04LjEzNC0zLjI2Ni0xMS4zMTItMC4xOTcNCgkJCQljLTMuMTc4LDMuMDY5LTMuMjY2LDguMTM0LTAuMTk3LDExLjMxMmMwLjA2NCwwLjA2NywwLjEzLDAuMTMyLDAuMTk3LDAuMTk3TDIzNi42ODgsMjQ4TDEzNC44NjQsMzQ5LjgyNA0KCQkJCWMtMy4xNzgsMy4wNy0zLjI2Niw4LjEzNC0wLjE5NiwxMS4zMTJjMy4wNywzLjE3OCw4LjEzNCwzLjI2NiwxMS4zMTIsMC4xOTZjMC4wNjctMC4wNjQsMC4xMzItMC4xMywwLjE5Ni0wLjE5NkwyNDgsMjU5LjMxMg0KCQkJCWwxMDEuODI0LDEwMS44MjRjMy4xNzgsMy4wNyw4LjI0MiwyLjk4MiwxMS4zMTItMC4xOTZjMi45OTUtMy4xLDIuOTk1LTguMDE2LDAtMTEuMTE2TDI1OS4zMTIsMjQ4bDEwMS44MjQtMTAxLjgyNA0KCQkJCUMzNjQuMjU5LDE0My4wNTIsMzY0LjI1OSwxMzcuOTg4LDM2MS4xMzYsMTM0Ljg2NHoiLz4NCgkJPC9nPg0KCTwvZz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjwvc3ZnPg0K'/>";
        } else {
            sCloseButtonHtml = adMoxyCtrl.sCloseButtonHtml;
            if (adMoxyCtrl.isPreview) {
                sCloseButtonHtml = sCloseButtonHtml.replace('Close Ad', 'Close Preview');
            }
        }
        const displayStyle = adMoxyCtrl.abDetected ? '' : 'display:none;';
        const t = adMoxyCtrl.Tools;
        t.append('head', `<style type="text/css"> #${this.sTag} {${xposcss} background: #000000; border-top-right-radius: 5px; border-top-left-radius: 5px; z-index:2000; padding: 0px; margin:0px; border:1px #000000 solid; border-spacing:1px; background-color:#000000; position: ${cpos}; ${xposcss}${xposshcss} bottom: 0px; text-align: left;${displayStyle}} #${this.sTag} a,#${this.sTag} a:link,#slider strong { text-decoration:none; color: black; font-size:12px; } </style>`);
        const closeTitle = adMoxyCtrl.isPreview ? 'Preview' : 'Ad';
        const sHtml = `<div id="btn_close_im_${iItem}" style="position:absolute;z-index:1000000; right:0px; float:right; top:0px;float:right;"><a title="Close ${closeTitle}" onclick="adMoxyCtrl.im.hide()">${sCloseButtonHtml}</a></div>`;
        t.append('body', `<div id="${this.sTag}" onmouseover="adMoxyCtrl.im.skipreload=true;" onmouseout="adMoxyCtrl.im.skipreload=false;">${sHtml}<div id="${this.sTag}_content"></div></div>`);
        const btndiv = `btn_close_im_${iItem}`;
        if (typeof (aSett['reloadtime']) != 'undefined') {
            let rtime = parseInt(aSett['reloadtime']);
            if (rtime > 0) {
                if (rtime < 5) { rtime = 5; }
                this.reloadTime = (rtime * 1000);
                this.reload = true;
            }
        }
        this.aSet = aSett;
        try {
            if (this.aSet.closepop.id > 0) {
                const ob = this;
                const aItem = adMoxyCtrl.adCals[this.itemId];
                adMoxyCtrl.loadPlugin(-1, "pop", function () {
                    cbTestIm = function () {
                        if (typeof eaPopn != 'undefined') {
                            const p = new eaPopn;
                            p.isPopunder = false;
                            p.url = p.genUrl(aItem, ob.aSet.closepop.id);
                            p.cookieTime = ob.aSet.closepop.cap;
                            p.clickHandler = [`#${btndiv}`];
                            p.ignoreList = [];
                            p.cookieName = `popcap_${ob.aSet.closepop.id}`;
                            p.xbtn = true;
                            ob.aPop = p;
                            if (p.canrun()) {
                                p.init();
                            }
                        } else {
                            setTimeout("cbTestIm()", 500);
                        }
                    };
                    cbTestIm();
                });
            }
        } catch (e) { }
    },
    display: function (iItem, json) {
        const o = this;
        if (this.itemId == 0) {
            this.itemId = iItem;
        } else {
            if (this.itemId != iItem) {
                adMoxyCtrl.debug("Im plugin got called more than one time, will be ignored");
                return;
            }
        }
        if (!this.isInitialized) {
            this.init(iItem, json['settings']);
        } else {
            if (typeof (json['settings']['position']) != 'undefined') {
                if (json['settings']['position'] == 'bottom_center') {
                    adMoxyCtrl.Tools.css(`#${o.sTag}`, { marginLeft: `-${json.settings.width / 2}px` });
                }
            }
        }
        const isNt = adMoxyCtrl.getItem(json, 'adtype', '') == 'native';
        if (isNt) {
            adMoxyCtrl.loadPlugin(-1, "native", function () {
                const sId = o.sTag + 'ct';
                adMoxyCtrl.adCals[iItem]["display"] = sId;
                adMoxyCtrl.adCals[iItem]["isflt"] = 1;
                const t = adMoxyCtrl.Tools;
                if (adMoxyCtrl.abDetected) {
                    t.html(`#${o.sTag}_content`, `<div style="clear:both;font-size:11px; color:black;" id="${sId}"></div>`);
                    adMoxyCtrl.native.display(iItem, json);
                } else {
                    t.html(`#${o.sTag}_content`, `<div style="clear:both;font-size:11px; color:black;" id="${sId}"></div>`);
                    adMoxyCtrl.native.display(iItem, json);
                    t.slideUp(`#${o.sTag}`, 2000, function () { });
                    if (adMoxyCtrl.im.reload && adMoxyCtrl.im.reloadTime > 0) {
                        setTimeout(function () {
                            if (!adMoxyCtrl.im.reload) { return; }
                            adMoxyCtrl.banner.reload(iItem);
                        }, adMoxyCtrl.im.reloadTime);
                    }
                }
            });
            return;
        } else {
            adMoxyCtrl.loadPlugin(-1, 'banner', function () {
                adMoxyCtrl.banner.genHtml(iItem, json, function (shtml) {
                    const sHtml = `<div style="clear:both;font-size:11px; color:black;">${shtml}</div>`;
                    const t = adMoxyCtrl.Tools;
                    if (adMoxyCtrl.abDetected) {
                        t.html(`#${o.sTag}_content`, sHtml);
                        adMoxyCtrl.banner.addHandler(iItem);
                    } else {
                        t.html(`#${o.sTag}_content`, sHtml);
                        adMoxyCtrl.banner.addHandler(iItem);
                        t.slideUp(`#${o.sTag}`, 2000, function () { });
                    }
                    if (adMoxyCtrl.im.reload && adMoxyCtrl.im.reloadTime > 0 && !adMoxyCtrl.abDetected) {
                        setTimeout(function () {
                            if (!adMoxyCtrl.im.reload) { return; }
                            adMoxyCtrl.banner.reload(iItem);
                        }, adMoxyCtrl.im.reloadTime);
                    }
                });
            });
        }
    },
};adMoxyCtrl.video = {
    aPlayers: [],
    getVersion: function () {
        return "5.3";
    },
    display: function (iItem, json) {
        if (typeof adMoxyCtrl.adCals[iItem] == 'undefined') {
            console.log("Item " + iItem + " dont exists");
            return;
        }
        var aItem = adMoxyCtrl.adCals[iItem];
        if (adMoxyCtrl.getItem(json, 'selling_type', 'unk') == 'own_ad_eactrl') {
            var this_action = adMoxyCtrl.adCals[iItem].videoads[json.actionid];
            json.video_vasturl = this_action.defaultad.url;
            json.isrtb = 0;
            json.networkid = 0;
            json.ispubad = 1;
            json.url = '';
            json.adtype = 'video';
        }
        var c = this;
        var sid = aItem.playerwrapper;
        if (typeof aItem.playerid != 'undefined') {
            sid = aItem.playerid;
        }
        var b = false;
        var player = null;
        this.aPlayers.forEach(function (v, i) {
            if (v.playerid == sid) {
                player = c.aPlayers[i];
                b = true;
            }
        });
        if (!b) {
            player = this.videoCtrl();
            player.playerid = sid;
            player.itemId = iItem;
            player.initPlayer(aItem);
            this.aPlayers.push(player);
        }
        if (typeof json.actionid != 'undefined') {/*  otherwise its the default call to init all events */
            player.addItem(iItem, json);
        }
        return player;
    },

    LoadVideo: function (nid, file, hls_file, cb) {
        var runHls = false;
        var HasHls = false;
        var org = '';

        let pl;
        if (typeof nid == 'object') {
            pl = nid;
            nid = pl.id;
        } else {
            pl = document.getElementById(nid);
        }

        let is_ktplayer = window.player_obj != null;


        if (hls_file == '') {
            if (file.search("m3u8") > 0) {/*  just in case the regular file is already hls */
                hls_file = file;
            }
        }
        if (hls_file != '') {
            HasHls = true;
            if (this.supportsHLS()) {
                org = file;
                file = hls_file;
            } else {
                runHls = true;
            }
        }
        if (!runHls) {
            if (HasHls) {
                try {
                    pl.addEventListener("error", (event) => {
                        if (org != '' && pl.src != org) {
                            //pl.pause();
                            pl.src = org;
                            try {
                                pl.load(org);
                                // pl.play();
                            } catch (_e) {
                                console.log(_e);
                            }
                            console.log('fallback to original video', org);
                            //pl.play();
                        }
                    });
                } catch (e) { };
            }
            try {

                if (is_ktplayer) {
                    pl.src = file;

                } else {
                    pl.setAttribute("src", file);
                }
                pl.load();
                pl.addEventListener('canplay', function () {
                    if (pl.paused) {
                        pl.play().catch(function () { });
                    }
                });
                if (cb != null) {
                    cb(HasHls);
                }
            } catch (e) {

            }
        } else {

            adMoxyCtrl.video.loadHls(function (ok) {
                if (ok) {
                    adMoxyCtrl.video.loadHLSWithTimeout(hls_file, 15000)
                        .then(hls => {
                            hls.attachMedia(pl);
                            hls.on(Hls.Events.MEDIA_ATTACHED, function () {
                                pl.play().catch(function () { });
                            });
                            hls.on(Hls.Events.ERROR, function (event, data) {
                                if (data.fatal) {
                                    try {
                                        pl.pause();
                                        hls.destroy();
                                        if (file != '') {
                                            pl.setAttribute("src", file);
                                            pl.play();
                                        } else {
                                            pl.setAttribute("src", hls_file);
                                            pl.play();
                                        }
                                        if (cb != null) {
                                            cb(false, hls);
                                        }
                                    } catch (e) {
                                    }
                                }
                            });
                            if (cb != null) {
                                cb(true, hls);
                            }
                        })
                        .catch((error) => {
                            if (file != '') {
                                pl.setAttribute("src", file);
                            } else {
                                pl.setAttribute("src", hls_file);
                            }
                            if (cb != null) {
                                cb(false);
                            }
                        });
                } else {
                    if (file != '') {
                        pl.setAttribute("src", file);
                    } else {
                        pl.setAttribute("src", hls_file);
                    }
                    if (cb != null) {
                        cb(false);
                    }
                }
            });
        }
    },

    loadHLSWithTimeout: function (videoUrl, timeoutDuration) {
        return new Promise((resolve, reject) => {
            const hls = new Hls();

            /*  Start loading the video */
            hls.loadSource(videoUrl);

            /*  Listen for the `MANIFEST_PARSED` event which indicates that the manifest was successfully loaded */
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
                clearTimeout(timeoutId);/*  Clear the timeout */
                resolve(hls);/*  Resolve with the hls object */
            });

            /*  Listen for the `error` event for any loading errors */
            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    clearTimeout(timeoutId);/*  Clear the timeout on error */
                    reject(new Error('HLS.js Error: ' + data.details));
                }
            });

            /*  Set a timeout to cancel the load request */
            const timeoutId = setTimeout(() => {
                hls.destroy();/*  Clean up the HLS instance */
                reject(new Error(`Request timed out after ${timeoutDuration} milliseconds`));
            }, timeoutDuration);
        });
    },


    supportsHLS: function () {
        var v = document.createElement('video');
        return Boolean(v.canPlayType('application/vnd.apple.mpegURL') || v.canPlayType('audio/mpegurl'));
    },

    loadHls: function (cb) {
        if (window.Hls == null || typeof Hls == 'undefined') {
            var s = document.createElement('script');
            s.src = "//cdn.jsdelivr.net/npm/hls.js@latest";
            s.onload = function () {
                cb(Hls.isSupported());
            };
            s.onerror = function () {
                cb(false);
            };
            document.head.appendChild(s);
        } else {
            cb(Hls.isSupported());
        }
    },


    videoCtrl: function () {
        return {
            playerid: '',
            isSlider: false,
            playerWidth: 0,
            playerHeight: 0,
            player: null,
            itemId: 0,
            bMidRollChecked: false,
            playerNode: null,
            playerParentNode: null,
            aPrerols: [],
            aMidRols: [],
            aPostRols: [],
            HlsUsed: false,
            HlsObj: null,
            playing: false,
            playerType: '',
            vidAdRunning: false,
            impLogged: false,
            playerPaused: false,
            hasPreRoll: false,
            prerolvid: { running: false, executed: false },
            postrolvid: { running: false, executed: false },
            midrolvid: { running: false, executed: false },
            currvid: {
                bHasPlayList: false,
                bOldConfig: false,
                iNext: 0,
                iCurr: 0,
                orgfile: '',
                playtime: 0,
                orgconfig: null
            },
            iSkipafter: 5,/*  skip after 5 seconds */
            iActionId: 0,
            sVideoType: '',
            currentAd: null,
            aActions: [],
            bImplogged: false,
            bSkipVideoAds: false,
            maxLoaderTime: 100000,
            IsFromInVideo: false,
            isFunction: function (ovar) {
                if (typeof ovar != 'undefined' && ovar != null) {
                    return (typeof ovar);
                } else {
                    return false;
                }
            },
            onAdStarted: function (sType) {
                adMoxyCtrl.videoAdRunning = true;
                var aItem = adMoxyCtrl.adCals[this.itemId];
                if (this.isFunction(aItem.onVideoAdStarted)) {
                    aItem.onVideoAdStarted(sType);
                }
            },
            onAdEnded: function (sType) {
                adMoxyCtrl.videoAdRunning = false;
                var aItem = adMoxyCtrl.adCals[this.itemId];
                if (this.isFunction(aItem.videoAdEnded)) {
                    aItem.onVideoAdEnded(sType);
                }
            },
            onVideoAdTimeUpdate: function (stype, currtime, duration) {
                var aItem = adMoxyCtrl.adCals[this.itemId];
                if (this.isFunction(aItem.onVideoAdTimeUpdate)) {
                    aItem.onVideoAdTimeUpdate(stype, currtime, duration);
                }
            },
            onTimeUpdate: function (currtime, duration) {
                var aItem = adMoxyCtrl.adCals[this.itemId];
                if (this.isFunction(aItem.onTimeUpdate)) {
                    aItem.onTimeUpdate(currtime, duration);
                }
            },
            onEnd: function () {
                var aItem = adMoxyCtrl.adCals[this.itemId];
                if (this.isFunction(aItem.onEnd)) {
                    aItem.onEnd();
                }
            },
            onStart: function () {
                var aItem = adMoxyCtrl.adCals[this.itemId];
                if (this.isFunction(aItem.onStart)) {
                    aItem.onStart();
                }
            },
            onPause: function () {
                var aItem = adMoxyCtrl.adCals[this.itemId];
                if (this.isFunction(aItem.onPause)) {
                    aItem.onPause();
                }
            },
            debug: function (txt, clear) {
                if (typeof clear != 'undefined' && clear == 1) {
                }
                adMoxyCtrl.Tools.append('#' + this.playerid + '-log', '<div>' + txt + '</div>');
            },
            isInFullScreenMode: function () {
                return false;
                /*
                try {
                    return ((document.fullscreenElement && document.fullscreenElement !== null && document.fullscreenElement === this.player) || document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen || (!window.screenTop && !window.screenY));
                } catch (_e) {
                    return false;
                }
                */
            },
            open: function (uri) {
                adMoxyCtrl.open(uri);
            },
            Play: function (pl) {
                var c = this;
                if (c.vidAdRunning) {
                    return;
                }
                if (!this.isInFullScreenMode()) {
                    if (c.prerolvid.executed == false && c.prerolvid.running == false) {
                        if (adMoxyCtrl.iTime > c.maxLoaderTime) {
                            c.prerolvid.executed = true;
                            console.log("skipping videoads because to low bandwith");
                            return;
                        }
                        this.prerolvid.running = true;
                        c.aPrerols.forEach(function (v, i) {
                            if (v.state == 0) {
                                v.state = 1;
                                let ad = v.data;
                                if (ad.adtype == 'video') {
                                    adMoxyCtrl.videoAdRunning = true;
                                    c.Pause();
                                    c.prerolvid.running = true;
                                    c.prerolvid.executed = true;
                                    /* console.log("call handle video"); */
                                    c.handleVideo(v.itemid, ad, 'preroll', v.actionid);
                                }
                            }
                        });
                    }
                } else {
                    c.prerolvid.executed = true;
                }
            },
            swapVideo: function (newfile, bIsVideoAd, stype, hls_file = '') {
                var ctrl = this;

                var u = 'undefined';
                ctrl.bImplogged = false;

                switch (this.playerType) {
                    case 'ktplayer':
                        if (bIsVideoAd) {
                            if (ctrl.player.conf == null) {
                                return false;
                            }
                            ctrl.currvid.orgfile = ctrl.player.conf.video_url;
                            ctrl.currvid.playtime = ctrl.player.currentTime;

                            adMoxyCtrl.video.LoadVideo(ctrl.playerNode, newfile, hls_file, function (hlsused, hls) {
                                ctrl.HlsUsed = hlsused;
                                if (hlsused) {
                                    ctrl.HlsObj = hls;
                                    ctrl.player.play();
                                } else {
                                    ctrl.playerNode.play();
                                    try {
                                        ctrl.player.play();
                                    } catch (e) {

                                    }
                                }
                                ctrl.onAdStarted(stype);
                            });
                        } else {
                            try {
                                if (ctrl.HlsUsed) {
                                    ctrl.HlsObj.destroy();
                                }
                            } catch (_e) {
                                console.log(e);
                            }
                            ctrl.playerNode.src = this.currvid.orgfile;
                            this.onAdEnded(stype);
                            if (stype == 'preroll') {
                                ctrl.playerNode.play();
                            }
                        }

                        break;


                    case "jwplayer":
                        if (bIsVideoAd) {
                            adMoxyCtrl.videoAdRunning = true;
                            if (this.isFunction(this.player.getConfig)) {
                                this.currvid.bOldConfig = false;
                                this.currvid.orgconfig = this.player.getConfig();
                                if (typeof this.currvid.orgconfig.nextUp != 'undefined') {
                                    this.currvid.iNext = this.currvid.orgconfig.nextUp.index;
                                    this.currvid.iCurr = (this.currvid.iNext - 1);
                                }
                            } else {
                                if (typeof this.player.config != u) {
                                    this.currvid.bOldConfig = true;
                                    this.currvid.orgconfig = this.player.config;
                                } else {
                                    /*  dont swap... we dont know what this is */
                                    return;
                                }
                            }
                            ctrl.currvid.playtime = this.player.getPosition();
                            this.player.load({ 'file': newfile });
                        } else {
                            if (this.currvid.orgconfig != null) {
                                var p = this.currvid.orgconfig.playlist;
                                if (p != null && p.length > 0) {
                                    var playlist = [];
                                    p.forEach(function (val, no) {
                                        var pl = val.sources[0];
                                        pl.title = val.title;
                                        playlist.push(pl);
                                    });
                                    this.player.load(playlist);
                                } else {
                                    this.player.load(this.currvid.orgconfig);
                                }
                                this.player.play();
                                if (stype == 'midroll' || stype == 'postroll') {
                                    var bcalled = false;
                                    ctrl.player.onPlay(function () {
                                        if (bcalled) {
                                            return;
                                        }
                                        bcalled = true;
                                        ctrl.player.seek(parseInt(ctrl.currvid.playtime));
                                    });
                                }
                                adMoxyCtrl.videoAdRunning = false;
                            }
                        }
                        break;
                    case "html5_video":
                        if (bIsVideoAd) {
                            this.currvid.orgfile = this.player.currentSrc;
                            ctrl.currvid.playtime = ctrl.player.currentTime;
                            var ob = this;
                            /*  hls_file = ''; */
                            adMoxyCtrl.video.LoadVideo(this.player.id, newfile, hls_file, function (hlsused, hls) {
                                ob.HlsUsed = hlsused;
                                if (hlsused) {
                                    ob.HlsObj = hls;
                                    ob.player.play();
                                } else {
                                    ob.player.load();
                                }
                                ob.onAdStarted(stype);
                            });
                        } else {
                            try {
                                if (this.HlsUsed) {
                                    this.HlsObj.destroy();
                                }
                            } catch (_e) {
                                /*  console.log(_e); */
                            }
                            this.debug("Current time:" + this.currvid.playtime);
                            this.player.src = this.currvid.orgfile;
                            this.player.load();
                            this.onAdEnded(stype);
                            if (this.player.paused && stype == 'preroll') {
                                this.player.play();
                            }
                            if (stype == 'midroll') {
                                if (ctrl.currvid.playtime > 0) {
                                    function seekTime() {
                                        ctrl.player.removeEventListener("canplay", seekTime);
                                        ctrl.debug(stype + " set seektime " + ctrl.currvid.playtime);
                                        ctrl.player.currentTime = (ctrl.currvid.playtime);
                                        ctrl.player.play();
                                    }

                                    ctrl.player.addEventListener("canplay", seekTime);
                                }
                            }
                            if (stype == 'postroll') {
                                function seekTime() {
                                    ctrl.debug(stype + " set seektime " + ctrl.currvid.playtime);
                                    ctrl.player.removeEventListener("canplay", seekTime);
                                    ctrl.player.currentTime = (ctrl.currvid.playtime - 1);
                                    ctrl.player.play();
                                }

                                ctrl.player.addEventListener("canplay", seekTime);
                            }
                        }
                        break;
                }
            },
            Pause: function () {
                switch (this.playerType) {
                    case "html5_video":
                    case 'jwplayer':
                    case 'ktplayer':
                    case 'video':
                        return this.player.pause();
                        break;
                }
            },
            End: function (bforce) {
                if (this.vidAdRunning) {
                    this.endActions(0);
                    if (this.currvid.bHasPlayList) {
                    }
                    /* return; */
                } else {
                    this.playing = false;
                    var ctrl = this;
                    var bact = false;
                    if (!this.isInFullScreenMode()) {
                        if (ctrl.postrolvid.executed == false && ctrl.postrolvid.running == false) {
                            this.aPostRols.forEach(function (v, i) {
                                if (v.state == 0) {
                                    v.state = 1;
                                    ad = v.data;
                                    if (ad.adtype == 'video') {
                                        bact = true;
                                        ctrl.postrolvid.executed = true;
                                        if (adMoxyCtrl.iTime > ctrl.maxLoaderTime) {
                                            console.log("skipping videoads because to low bandwith");
                                        } else {
                                            adMoxyCtrl.videoAdRunning = true;
                                            ctrl.postrolvid.running = true;
                                            setTimeout(function () {
                                                ctrl.handleVideo(v.itemid, ad, 'postroll', v.actionid);
                                            }, 0);
                                        }
                                    }
                                }
                            });
                        }
                    } else {
                        ctrl.postrolvid.executed = true;
                    }
                    if (!bact) {
                        ctrl.onEnd();
                    } else {
                    }
                }
            },
            Timer: function (i, d) {
                i = parseInt(i);
                d = parseInt(d);
                var ctrl = this;
                var u = 'undefined';
                if (ctrl.vidAdRunning) {
                    if (ctrl.isInFullScreenMode()) {
                        ctrl.endActions(1);
                    }
                    ctrl.onVideoAdTimeUpdate(ctrl.sVideoType, i, d);
                    /* c.debug("curr time:" + i + " Duration:"+d,1); */
                    /*  start,firstQuartile,midpoint,thirdQuartile,complete,mute,unmute,pause,resume,fullscreen */
                    var firtsQuartile = (d / 4);
                    var midPoint = (d / 2);
                    var thirdQuartile = (firtsQuartile + midPoint);
                    /* console.log(ctrl.aActions.trackingevents.progress); */
                    if (typeof ctrl.aActions.trackingevents.progress != 'undefined') {
                        for (a = 0; a < ctrl.aActions.trackingevents.progress.items.length; a++) {
                            /* console.log(a); */
                            item = ctrl.aActions.trackingevents.progress.items[a];
                            if (item.done == false) {
                                if (item.offset <= i) {
                                    ctrl.aActions.trackingevents.progress.items[a].done = true;
                                    var items = [];
                                    items.push(item.url);
                                    ctrl.sendNotifications(items, 'progress');
                                }
                            }
                        }
                    }
                    if (i >= firtsQuartile && i < (firtsQuartile + 1)) {
                        if (typeof ctrl.aActions.trackingevents.firstquartile != u && ctrl.aActions.trackingevents.firstquartile.done == false) {
                            ctrl.aActions.trackingevents.firstquartile.done = true;
                            ctrl.sendNotifications(ctrl.aActions.trackingevents.firstquartile.items, 'firstquartile');
                        }
                    } else if (i >= midPoint && i < (midPoint + 1)) {
                        if (typeof ctrl.aActions.trackingevents.midpoint != u && ctrl.aActions.trackingevents.midpoint.done == false) {
                            ctrl.aActions.trackingevents.midpoint.done = true;
                            ctrl.sendNotifications(ctrl.aActions.trackingevents.midpoint.items, 'midpoint');
                        }
                    } else if (i >= thirdQuartile && i < (thirdQuartile + 1)) {
                        if (typeof ctrl.aActions.trackingevents.thirdquartile != u && ctrl.aActions.trackingevents.thirdquartile.done == false) {
                            ctrl.aActions.trackingevents.thirdquartile.done = true;
                            ctrl.sendNotifications(ctrl.aActions.trackingevents.thirdquartile.items, 'thirdquartile');
                        }
                    }
                    var status_text = ctrl.getStatusTxt();
                    if (status_text != '') {
                        let sec = (d - i);
                        if (!isNaN(sec)) {
                            adMoxyCtrl.Tools.html('#vid_state_' + ctrl.playerid, status_text.replace('%s', sec));
                        }
                    }
                    if (i <= ctrl.iSkipafter) {
                        var is = ctrl.iSkipafter - i;
                        adMoxyCtrl.Tools.html('#vid_skip' + '_' + ctrl.playerid, "Skip ad in " + is);
                    } else {
                        if (!ctrl.bImplogged) {
                            ctrl.bImplogged = true;
                            var aItem = adMoxyCtrl.adCals[ctrl.itemId].actions[ctrl.iActionId];
                            aItem.data = ctrl.currentAd;
                            if (typeof aItem.data.imp_trackingurl != 'undefined' && aItem.data.imp_trackingurl != '') {
                                var sPx = '<img width="0" height="0" src="' + aItem.data.imp_trackingurl + '" border="0"/>';
                                adMoxyCtrl.Tools.append("body", sPx);
                            }
                            aItem.plugin = 'video';
                            adMoxyCtrl.logImp(ctrl.itemId, 'video', '', aItem);
                            ctrl.sendNotifications(ctrl.aActions.impression, 'impression');
                            adMoxyCtrl.Tools.html('#vid_skip' + '_' + ctrl.playerid, '<div class="vid_skip_btn_' + ctrl.playerid + '" id="vid_skip_btn_' + ctrl.playerid + '"></div>');
                            adMoxyCtrl.Tools.getnode('#vid_skip' + '_' + ctrl.playerid).addEventListener('click', function (e) {
                                ctrl.endActions(1);
                                return false;
                            });
                        }
                    }
                } else {
                    if (ctrl.hasPreRoll) {
                        if (ctrl.prerolvid.executed == false) {
                            console.log("preroll was not executed yet!");
                            ctrl.Play();
                            return;
                        }
                    }
                    var currtime = i;
                    var duration = d;
                    ctrl.onTimeUpdate(i, d);
                    var ctrl = this;
                    var midPoint = (d / 2);
                    if (currtime >= midPoint && currtime <= (midPoint + 10) && ctrl.bMidRollChecked == false) {
                        this.aMidRols.forEach(function (v, i) {
                            if (v.state == 0) {
                                v.state = 1;
                                let ad = v.data;
                                if (ad.adtype == 'video') {
                                    ctrl.bMidRollChecked = true;
                                    if (!ctrl.isInFullScreenMode()) {
                                        if (ctrl.midrolvid.executed == false && ctrl.midrolvid.running == false) {
                                            ctrl.midrolvid.executed = true;
                                            if (adMoxyCtrl.iTime > ctrl.maxLoaderTime) {
                                                console.log("skipping videoads because to low bandwith");
                                            } else {
                                                adMoxyCtrl.videoAdRunning = true;
                                                ctrl.midrolvid.running = true;
                                                ctrl.Pause();
                                                ctrl.handleVideo(v.itemid, ad, 'midroll', v.actionid);
                                            }
                                        }
                                    } else {
                                        ctrl.midrolvid.executed = true;
                                    }
                                }
                            }
                        });
                    }
                    if (parseInt(currtime) == parseInt(duration)) {
                        ctrl.End(1);
                    }
                }
            },
            Resume: function (stype) {
                var ctrl = this;
                switch (stype) {
                    case 'preroll':
                        this.prerolvid.running = false;
                        break;
                    case 'midroll':
                        this.midrolvid.running = false;
                        break;
                    case 'postroll':
                        this.postrolvid.running = false;
                        break;
                }
                this.swapVideo('', false, stype);
            },
            initPlayer: function (aItem) {

                var ctrl = this;
                var pWidth;
                var pHeight;
                switch (aItem.playertype) {
                    case "video":
                    case "html5_video":
                        aItem.playertype = "html5_video";
                        this.playerNode = adMoxyCtrl.Tools.getnode("#" + this.playerid);
                        if (typeof aItem.player == 'object') {
                            this.player = aItem.player;
                        } else {
                            this.player = adMoxyCtrl.Tools.find(this.playerNode, 'video')[0];
                            if (typeof this.player != 'object') {
                                if (typeof this.playerNode == 'object') {
                                    this.player = this.playerNode;
                                }
                            }
                        }
                        if (typeof this.player == 'undefined') {
                            console.log("Cannot find a VideoPlayer", this.playerid);
                            return;
                        }
                        pWidth = adMoxyCtrl.Tools.width(this.player[0]);
                        pHeight = adMoxyCtrl.Tools.height(this.player[0]);
                        this.playerType = "html5_video";
                        this.playerParentNode = this.player.parentNode;
                        ctrl.playerType = "html5_video";
                        ctrl.player.addEventListener("play", function (e) {
                            try {
                                ctrl.Play(e);
                                if (!ctrl.vidAdRunning) {
                                    ctrl.onStart();
                                }
                            } catch (_e) {
                                console.log(_e);
                            }
                        });
                        ctrl.player.addEventListener('timeupdate', function (e) {
                            var i = parseInt(e.target.currentTime);
                            var d = parseInt(e.target.duration);
                            ctrl.Timer(i, d);
                        });
                        ctrl.player.addEventListener("pause", function (e) {
                            if (!ctrl.vidAdRunning) {
                                ctrl.onPause();
                            }
                        });
                        ctrl.player.addEventListener("ended", function (e) {
                            ctrl.End();
                        });
                        break;
                    case 'jwplayer':
                        if (typeof aItem.player == 'object') {
                            this.player = aItem.player;
                        } else {
                            this.player = jwplayer(0);
                        }
                        this.playerNode = adMoxyCtrl.Tools.getnode("#" + this.playerid);
                        pWidth = adMoxyCtrl.Tools.width(this.playerNode);
                        pHeight = adMoxyCtrl.Tools.height(this.playerNode);
                        ctrl.playerType = "jwplayer";
                        ctrl.playerParentNode = ctrl.playerNode;
                        ctrl.player.onPlay(function (e) {
                            ctrl.Play(e);
                            if (!ctrl.vidAdRunning) {
                                ctrl.onStart();
                            }
                        });
                        ctrl.player.onBuffer(function (e) {
                        });
                        ctrl.player.onPause(function () {
                            if (!ctrl.vidAdRunning) {
                                ctrl.onPause();
                            }
                        });
                        ctrl.player.onTime(function (e) {
                            ctrl.Timer(e.position, e.duration);
                        });
                        /* ctrl.player.onReady(function(){ctrl.init();}); */
                        ctrl.player.onComplete(function () {
                            ctrl.End();
                        });
                        break;


                    case 'ktplayer':
                        /* let ctrl = this; */
                        if (typeof aItem.player == 'object') {
                            ctrl.player = aItem.player;
                            /*  console.log("playerid??",this.playerid); */
                        } else {
                            /* this.player = adMoxyCtrl.Tools.find(this.playerNode, 'video')[0]; */
                            if (window.player_obj != null) {
                                ctrl.player = window.player_obj;
                                ctrl.playerNode = adMoxyCtrl.Tools.getnode("#" + this.playerid + " video");
                                pWidth = adMoxyCtrl.Tools.width(ctrl.playerNode);
                                pHeight = adMoxyCtrl.Tools.height(ctrl.playerNode);
                            } else {
                                console.log("no ktplayer found");
                                return;
                            }

                        }
                        ctrl.playerType = "ktplayer";

                        ctrl.playerNode.addEventListener("play", function (e) {
                            try {
                                ctrl.Play(e);
                                if (!ctrl.vidAdRunning) {
                                    ctrl.onStart();
                                }
                            } catch (_e) {
                                console.log(_e);
                            }
                        });
                        ctrl.playerNode.addEventListener('timeupdate', function (e) {
                            var i = parseInt(e.target.currentTime);
                            var d = parseInt(e.target.duration);
                            ctrl.Timer(i, d);
                        });
                        ctrl.playerNode.addEventListener("pause", function (e) {
                            if (!ctrl.vidAdRunning) {
                                ctrl.onPause();
                            }
                        });
                        ctrl.playerNode.addEventListener("ended", function (e) {
                            ctrl.End();
                        });

                        /*

                        ctrl.player.listen('ktVideoStarted', function () {
                            try {
                                ctrl.Play();
                                if (!ctrl.vidAdRunning) {
                                    ctrl.onStart();
                                }
                            } catch (_e) {
                                console.log(_e);
                            }
                        });
                        ctrl.player.listen('ktVideoPaused', function () {
                            if (!ctrl.vidAdRunning) {
                                ctrl.onPause();
                            }
                        });
                        ctrl.player.listen('ktVideoStopped', function () {
                            ctrl.End();
                        });
                        ctrl.player.listen('ktVideoFinished', function () {
                            ctrl.End();
                        });

                        ctrl.playerNode.addEventListener('timeupdate', function (e) {
                            var i = parseInt(e.target.currentTime);
                            var d = parseInt(e.target.duration);
                            ctrl.Timer(i, d);
                        });

                         */

                        break;

                    default:
                        console.log("unknown or unsupported playertype:" + aItem.playertype);
                        return;
                        break;
                }
                var s = '<div style="display:none;width:' + pWidth + 'px;height:' + pHeight + 'px;" class="vid_wrapper_' + ctrl.playerid + '" id="vid_wrapper_' + ctrl.playerid + '"></div>';


                switch (this.playerType) {
                    case 'jwplayer':
                    case 'html5_video':
                    case 'flowplayer':
                        adMoxyCtrl.Tools.append(this.playerNode, s);
                        break;
                    case 'ktplayer':
                        let node = adMoxyCtrl.Tools.getnode("#" + this.playerid);
                        adMoxyCtrl.Tools.append(node, s);
                        break;

                    default:
                        break;
                }
                adMoxyCtrl.Tools.append('body', '<div id="notifications_' + ctrl.playerid + '"></div>');
                ctrl.playerWidth = pWidth;
                ctrl.playerHeight = pHeight;
                ctrl.debug("player:" + pWidth + 'x' + pHeight);
            },
            checkPlayingActions: function (e, ad, itemId, plugin = 'video_carousel') {
                this.checkVastActions(e, ad);
                this.checkImpressionLog(e, itemId, ad, 'video_carousel');
            },

            checkImpressionLog: function (e, itemId, ad, plugin = '') {
                let i = parseInt(e.target.currentTime);
                if (i <= 10) {
                    if (i >= 1) {
                        let pl = this;
                        if (!pl.bImplogged) {
                            pl.bImplogged = true;
                            let aItem = adMoxyCtrl.adCals[itemId];
                            if (!ad.imploged) {/*  only one implog per ad */
                                ad.imploged = true;
                                aItem.data = ad;
                                aItem.plugin = plugin;
                                adMoxyCtrl.logImp(pl.itemId, plugin, '', aItem, i);
                                pl.sendNotifications(ad.actions.impression, 'impression');
                                if (typeof ad.imp_trackingurl != 'undefined' && ad.imp_trackingurl != '') {
                                    let sPx = '<img width="0" height="0" src="' + ad.imp_trackingurl + '" border="0"/>';
                                    adMoxyCtrl.Tools.append("body", sPx);
                                }
                            }
                        }
                    }
                }
            },
            checkVastActions: function (e, ad, pl) {
                /*  already used with video carousel, others can follow */
                pl = pl || this;
                let i = parseInt(e.target.currentTime);
                let d = parseInt(e.target.duration);
                let firtsQuartile = (d / 4);
                let midPoint = (d / 2);
                let u = 'undefined';
                let thirdQuartile = (firtsQuartile + midPoint);
                if (ad.actions != null && typeof ad.actions != u && typeof ad.actions.trackingevents != u) {
                    if (typeof ad.actions.trackingevents.start != u && ad.actions.trackingevents.start.done == false) {
                        ad.actions.trackingevents.start.done = true;
                        pl.sendNotifications(ad.actions.trackingevents.start.items, 'start');
                    }
                    if (typeof ad.actions.trackingevents.progress != u) {
                        for (a = 0; a < ad.actions.trackingevents.progress.items.length; a++) {
                            item = ad.actions.trackingevents.progress.items[a];
                            if (item.done == false) {
                                if (item.offset <= i) {
                                    ad.actions.trackingevents.progress.items[a].done = true;
                                    let items = [];
                                    items.push(item.url);
                                    pl.sendNotifications(items, 'progress');
                                }
                            }
                        }
                    }
                    if (i >= firtsQuartile && i < (firtsQuartile + 1)) {
                        if (typeof ad.actions.trackingevents.firstquartile != u && ad.actions.trackingevents.firstquartile.done == false) {
                            ad.actions.trackingevents.firstquartile.done = true;
                            pl.sendNotifications(aActions.trackingevents.firstquartile.items, 'firstquartile');
                        }
                    } else if (i >= midPoint && i < (midPoint + 1)) {
                        if (typeof ad.actions.trackingevents.midpoint != u && ad.actions.trackingevents.midpoint.done == false) {
                            ad.actions.trackingevents.midpoint.done = true;
                            pl.sendNotifications(ad.actions.trackingevents.midpoint.items, 'midpoint');
                        }
                    } else if (i >= thirdQuartile && i < (thirdQuartile + 1)) {
                        if (typeof ad.actions.trackingevents.thirdquartile != u && ad.actions.trackingevents.thirdquartile.done == false) {
                            ad.actions.trackingevents.thirdquartile.done = true;
                            pl.sendNotifications(ad.actions.trackingevents.thirdquartile.items, 'thirdquartile');
                        }
                    }
                }
            },


            sendNotifications: function (aItems, idval) {
                var c = this;
                aItems.forEach(function (v, i) {
                    if (typeof v == 'string' && v != '') {
                        adMoxyCtrl.Tools.append('#notifications_' + c.playerid, '<img act="' + idval + '" src="' + v + '" border="0" width="0" height="0"/>');
                    }
                });
            },
            AddCaption: function (caption_text) {
                var s = '<div id="vid_caption_' + this.playerid + '" class="vid_caption">' + caption_text + '</div>';
                adMoxyCtrl.Tools.prepend('#vid_wrapper_' + this.playerid, s);
                var sLeft = (adMoxyCtrl.Tools.width('#vid_wrapper_' + this.playerid) / 2) - (adMoxyCtrl.Tools.width('#vid_caption_' + this.playerid) / 2);
                adMoxyCtrl.Tools.css('#vid_caption_' + this.playerid, { left: sLeft + 'px' });
            },
            RemoveCaption: function () {
                adMoxyCtrl.Tools.remove('#vid_caption_' + this.playerid);
            },
            addItem: function (iItem, json) {
                var aItem = adMoxyCtrl.adCals[iItem].actions[json.actionid];
                switch (aItem.type) {
                    case 'preroll':
                        this.aPrerols.push({ 'actionid': json.actionid, 'itemid': iItem, 'state': 0, 'data': json });
                        this.hasPreRoll = true;
                        break;
                    case 'midroll':
                        this.aMidRols.push({ 'actionid': json.actionid, 'itemid': iItem, 'state': 0, 'data': json });
                        break;
                    case 'postroll':
                        this.aPostRols.push({ 'actionid': json.actionid, 'itemid': iItem, 'state': 0, 'data': json });
                        if (typeof aItem.invideo != 'undefined' && aItem.invideo == 1) {
                            if (!this.playing);
                            this.End(1);
                        }
                        break;
                }
            },
            getStatusTxt: function () {
                var aItem = adMoxyCtrl.adCals[this.itemId].actions[this.iActionId];
                var state = null;
                var status_text = 'Video will be displayed in %s';
                if (typeof aItem['status_txt'] == 'object') {
                    state = aItem['status_txt'];
                }
                var dsp = 1;
                if (state != null) {
                    var dsp = adMoxyCtrl.getItem(state, 'display', 0);
                    if (dsp == 1) {
                        status_text = adMoxyCtrl.getItem(state, 'txt', status_text);
                    }
                }
                if (dsp == 0) {
                    status_text = '';
                }
                return status_text;
            },
            getCaptionText: function () {
                var aItem = adMoxyCtrl.adCals[this.itemId].actions[this.iActionId];
                var txt = "Advertisement";
                if (typeof aItem['caption'] == 'object') {
                    if (adMoxyCtrl.getItem(aItem['caption'], 'display', 0) == 0) {
                        txt = '';
                    } else {
                        txt = adMoxyCtrl.getItem(aItem['caption'], 'txt', txt);
                    }
                }
                return txt;
            },
            reposWrapper: function () {
            },
            AddClickthrough: function (iItem, ad, aActions) {
                var c = this;
                var video_player = c.player;
                adMoxyCtrl.Tools.remove('#click_' + this.playerid);/*  just in case he was still there */
                var s = '<div id="click_' + this.playerid + '" style="position:absolute;z-index:100;cursor:pointer;left:0px;top:0px;width:calc(100%);height:calc(100%);"></div>';
                adMoxyCtrl.Tools.append('#vid_wrapper_' + this.playerid, s);


                let node = adMoxyCtrl.Tools.getnode('#click_' + this.playerid);
                if (!node) {
                    console.log("no clickthrough node found", this.playerid);
                    return;
                }


                node.addEventListener('click', function (event) {
                    event.stopImmediatePropagation();
                    var url = '';
                    url = adMoxyCtrl.getItem(ad, 'destinationurl', '');
                    if (aActions['clickthrough_url'] != '') {
                        url = aActions['clickthrough_url'];
                    }
                    if (url != '') {/*  ok... we can log the click in the background and open the adv site instantly */
                        var uri = 'act=logclick&xref=' + ad['hash'];
                        adMoxyCtrl.request('logclick', uri, 0, {
                            result: function (rdata) {
                            }
                        });
                    } else {
                        console.log("no video clickurl????");
                        return;/*  this cannot happen... there should be an url! */
                    }
                    if (aActions['clickthrough_tracking'].length > 0) {
                        c.sendNotifications(aActions['clickthrough_tracking'], 'clicktrack');
                    }
                    c.open(url);
                    var aItem = adMoxyCtrl.adCals[c.itemId].actions[c.iActionId];
                    aItem.data = ad;
                    aItem.plugin = 'video';
                    adMoxyCtrl.bkLog('click', iItem, { isiframe: 0 }, aItem);
                    return false;
                });
            },
            endActions: function (state) {
                /* return; */
                var c = this;
                var u = 'undefined';
                /* return; */
                if (state == 1) {
                    c.player.pause();
                    if (typeof c.aActions.trackingevents.skip != u) {
                        c.sendNotifications(c.aActions.trackingevents.skip.items, 'skip');
                    }
                } else {
                    if (state == 0) {
                        if (typeof c.aActions.trackingevents.complete != u) {
                            c.sendNotifications(c.aActions.trackingevents.complete.items, 'complete');
                        }
                    }
                    /*  state -1 means something went wrong and we have to switch back */
                }
                adMoxyCtrl.Tools.remove('#click_' + c.playerid);
                adMoxyCtrl.Tools.hide('#vid_wrapper_' + c.playerid);
                c.vidAdRunning = false;
                c.Resume(c.sVideoType);
                adMoxyCtrl.Tools.remove('#vid_clickt_' + c.playerid);
                c.RemoveCaption();
                adMoxyCtrl.Tools.remove('#vid_skip_' + c.playerid);
                adMoxyCtrl.Tools.remove('#vid_state_' + c.playerid);
                setTimeout(function () {
                    adMoxyCtrl.Tools.remove("#notifications_" + c.playerid);
                }, 1000);
            },
            LoadActions: function (ad, cb) {
                var c = this;
                var aActions = c.defaultActions();
                if (typeof ad.video_vasturl != 'undefined' && ad.video_vasturl != '') {
                    c.LoadXml(ad.video_vasturl, function (XmlObj) {
                        c.ParseVastFile(XmlObj, aActions, function (aActions) {
                            cb(aActions);
                        });
                    });
                } else if (typeof ad.video_vastxml != 'undefined' && ad.video_vastxml != '') {
                    var parseXml;
                    if (typeof window.DOMParser != "undefined") {
                        parseXml = function (xmlStr) {
                            return new window.DOMParser().parseFromString(xmlStr, "text/xml");
                        };
                    } else if (typeof window.ActiveXObject != "undefined" &&
                        new window.ActiveXObject("Microsoft.XMLDOM")) {
                        parseXml = function (xmlStr) {
                            var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
                            xmlDoc.async = "false";
                            xmlDoc.loadXML(xmlStr);
                            return xmlDoc;
                        };
                    } else {
                        return;
                    }
                    XmlObj = parseXml(ad.video_vastxml);
                    c.ParseVastFile(XmlObj, aActions, function (aActions) {
                        cb(aActions);
                    });
                } else {
                    cb(aActions);
                }
            },
            handleVideo: function (iItem, ad, stype, actionid) {
                if (this.isInFullScreenMode()) {
                    return;
                }
                var c = this;

                c.LoadActions(ad, function (aActions) {
                    var file = "";
                    var hls_file = '';
                    var u = 'undefined';
                    if (typeof aActions != u && typeof aActions.mediafile != u && aActions.mediafile != '') {
                        file = aActions.mediafile;
                        /* hls_file = (aActions.hls_url != '') ? aActions.hls_url : ''; does not work properly when we hijack a player, we can only do this with our own */
                    } else {
                        if (typeof ad != u && typeof ad.video_url != u && ad.video_url != "") {
                            file = ad.video_url;
                        }
                        hls_file = adMoxyCtrl.getItem(ad, 'video_hls_url', '');
                    }
                    c.aActions = aActions;
                    if (file == null || file == '') {
                        adMoxyCtrl.debug("something went wrong, no videofile available for:" + stype);

                        c.player.play();
                        return;
                    }
                    c.iActionId = actionid;
                    c.sVideoType = stype;
                    c.itemId = iItem;
                    c.currentAd = ad;
                    c.vidAdRunning = true;
                    var u = 'undefined';
                    var aItem = adMoxyCtrl.adCals[iItem].actions[actionid];
                    var aActions = c.aActions;
                    if (typeof c.aActions.trackingevents.creativeview != u) {
                        c.sendNotifications(c.aActions.trackingevents.creativeview.items, 'createview');
                    }
                    var icap = parseInt(adMoxyCtrl.getItem(aItem, 'capping', 0));
                    if (icap > 0) {
                        var scap = 'video_cap_' + aItem.type;
                        adMoxyCtrl.setStorage(scap, 1, icap);
                    }
                    if (typeof aActions.trackingevents.start != u) {
                        c.sendNotifications(aActions.trackingevents.start.items, 'start');
                    }
                    adMoxyCtrl.Tools.show('#vid_wrapper_' + c.playerid);
                    adMoxyCtrl.Tools.css('#vid_wrapper_' + c.playerid, {
                        'z-index': 100000,
                        'top': '0px',
                        'left': '0px',
                        'height': 'calc(100%)',
                        'width': 'calc(100%)'
                    });
                    c.swapVideo(file, true, stype, hls_file);
                    var s = '<div class="vid_skip" id="vid_skip' + '_' + c.playerid + '"></div>';
                    adMoxyCtrl.Tools.append('#vid_wrapper_' + c.playerid, s);
                    if (c.getStatusTxt() != '') {
                        var s = '<div class="vid_state" id="vid_state' + '_' + c.playerid + '"></div>';
                        adMoxyCtrl.Tools.append('#vid_wrapper_' + c.playerid, s);
                    }
                    c.AddClickthrough(iItem, ad, aActions);
                    var s = c.getCaptionText();
                    if (s != '') {
                        c.AddCaption(s);
                    }
                    c.player.play();
                });
            },
            defaultActions: function () {
                return {
                    impression: [],
                    mediafile: '',
                    hls_url: '',
                    video_width: 0,
                    video_height: 0,
                    clickthrough_url: '',
                    clickthrough_tracking: [],
                    duration: 0,
                    trackingevents: {}
                };
            },
            LoadXml: function (vast_url, cb) {
                var xmlHttpReq;
                let ob = this;
                if (window.XMLHttpRequest) {
                    xmlHttpReq = new XMLHttpRequest();
                } else {
                    xmlHttpReq = new ActiveXObject("Microsoft.XMLHTTP");
                }
                var err = false;

                xmlHttpReq.onload = function () {
                    if (!err) {
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(xmlHttpReq.responseText, "application/xml");
                        /*  Remove empty (newline/whitespace-only) text nodes */
                        ob.cleanXmlNode(xmlDoc);
                        cb(xmlDoc);
                    }
                };

                var XHRErrorHandler = function (event) {
                    err = true;
                    cb({});
                };

                xmlHttpReq.addEventListener("error", XHRErrorHandler);
                xmlHttpReq.onerror = function () {
                    cb(xmlHttpReq.responseText || {});
                };

                xmlHttpReq.open("GET", vast_url);
                xmlHttpReq.send();
            },

            cleanXmlNode: function (node) {/*  clears junk in xml */
                let ob = this;
                for (let i = node.childNodes.length - 1; i >= 0; i--) {
                    const child = node.childNodes[i];
                    if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
                        const trimmed = child.nodeValue.trim();
                        if (trimmed === '') {
                            node.removeChild(child);
                        } else {
                            child.nodeValue = trimmed;
                        }
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        ob.cleanXmlNode(child);
                    }
                }
            },


            FixUrl: function (url) {
                if (url != null && url != '') {
                    let s = url;
                    url = url.toString().replaceAll(" ", "").replaceAll("\n", "").replaceAll("\t", "").replace("http:", "https:");
                    if (adMoxyCtrl.debugOn && url != s) {
                        console.log("Url converted to:" + url);
                    }
                    return url;
                }
                return url;
            },


            ParseVastFile: function (xmlDoc, obj_vast, cb) {

                /* Read XML file */
                var ob = this;
                let tools = adMoxyCtrl.Tools;
                if (obj_vast == null || typeof obj_vast == 'undefined') {
                    var obj_vast = new this.defaultActions();
                }
                if (xmlDoc == null || typeof xmlDoc == 'undefined') {
                    cb(obj_vast);
                    return;
                }
                let impression = xmlDoc.getElementsByTagName("Impression");
                for (let i = 0; i < impression.length; i++) {
                    try {/* / its possible that node is empty */
                        var s = impression[i].firstChild.nodeValue;
                        if (s != '') {

                            obj_vast.impression.push(ob.FixUrl(s));
                        }
                    } catch (_e) {
                    }
                }
                /* Get Creative */
                var creative = xmlDoc.getElementsByTagName("Creative");
                var media_files;
                var tracking_events;
                var vasttagaduri = [];
                var tmp = xmlDoc.getElementsByTagName("VASTAdTagURI");
                for (var i = 0; i < tmp.length; i++) {
                    try {
                        var s = tmp[i].firstChild.nodeValue;
                        if (s != '') {

                            vasttagaduri.push(ob.FixUrl(s));
                        }
                    } catch (e) {

                    }
                }
                for (var i = 0; i < creative.length; i++) {
                    var creative_linear = creative[i].getElementsByTagName("Linear");
                    if (creative_linear != null) {
                        for (var j = 0; j < creative_linear.length; j++) {
                            /* Get media files */
                            var files = creative_linear[j].getElementsByTagName("MediaFiles");
                            if (files != null) {
                                for (var k = 0; k < files.length; k++) {
                                    var f = files[k].getElementsByTagName("MediaFile");
                                    if (f != null) {
                                        media_files = f;
                                    }
                                }
                            } else {
                                console.log("no media files");
                            }
                            /* Get Clickthrough URL */
                            var clicks = creative_linear[j].getElementsByTagName("VideoClicks");
                            if (clicks != null) {
                                for (var k = 0; k < clicks.length; k++) {
                                    var clickthrough = null;
                                    try {
                                        if (typeof clicks[k].getElementsByTagName("ClickThrough") != 'undefined') {
                                            clickthrough = clicks[k].getElementsByTagName("ClickThrough")[0].childNodes[0].nodeValue;
                                        }
                                    } catch (_e) {
                                        clickthrough = null;
                                    }
                                    try {
                                        var ctElements = clicks[k].getElementsByTagName("ClickTracking");
                                        if (ctElements != null && ctElements.length > 0) {
                                            for (var ct = 0; ct < ctElements.length; ct++) {
                                                try {
                                                    var ctVal = ctElements[ct].childNodes[0].nodeValue;
                                                    if (ctVal != null && ctVal != '') {
                                                        obj_vast.clickthrough_tracking.push(ob.FixUrl(ctVal));
                                                    }
                                                } catch (_ei) { }
                                            }
                                        }
                                    } catch (_e) { }
                                    if (clickthrough != null) {
                                        obj_vast.clickthrough_url = ob.FixUrl(clickthrough);
                                    }

                                }
                            }
                            /* Get Tracking Events */
                            var events = creative_linear[j].getElementsByTagName("TrackingEvents");
                            /* console.log(events); */
                            if (events != null) {
                                for (var k = 0; k < events.length; k++) {
                                    var event = events[k].getElementsByTagName("Tracking");
                                    if (event != null) {
                                        tracking_events = event;
                                    }
                                }
                            }
                            /* Get AD Duration */
                            var duration = creative_linear[j].getElementsByTagName("Duration")[0];
                            if (duration != null) {
                                obj_vast.duration = duration.childNodes[0].nodeValue;
                                /* alert(obj_vast.duration); */
                                var arrD = obj_vast.duration.split(':');
                                var strSecs = (+arrD[0]) * 60 * 60 + (+arrD[1]) * 60 + (+arrD[2]);
                                obj_vast.duration = strSecs;
                            }
                        }
                    }
                }
                if (media_files != null) {
                    let obj, w, h, node;
                    for (let i = 0; i < media_files.length; i++) {
                        node = media_files[i].childNodes[0];
                        let val = node.parentElement.attributes['type'].nodeValue;
                        /*  console.log(val); */
                        switch (val) {
                            case 'video/mp4':
                                /* obj_vast.mediafile = node.nodeValue; */
                                obj_vast.mediafile = ob.FixUrl(media_files[i].textContent);
                                /* obj_vast. */
                                obj = node.parentElement;
                                w = obj.getAttribute("width");
                                h = obj.getAttribute("height");
                                if (h != null && w != null) {
                                    if (tools.isNumeric(w) && tools.isNumeric(h) && h > 0 && w > 0) {
                                        obj_vast.video_width = w;
                                        obj_vast.video_height = h;
                                    }
                                }
                                break;

                            case "application/x-mpegURL":

                                /*  console.log("hls_url:"+ob.FixUrl(media_files[i].textContent)); */
                                obj_vast.hls_url = ob.FixUrl(media_files[i].textContent);
                                /*  obj_vast.hls_url = node.nodeValue; */



                                obj = node.parentElement;
                                w = obj.getAttribute("width");
                                h = obj.getAttribute("height");
                                if (h != null && w != null) {
                                    if (tools.isNumeric(w) && tools.isNumeric(h) && h > 0 && w > 0) {
                                        obj_vast.video_width = w;
                                        obj_vast.video_height = h;
                                    }
                                }
                                break;
                            case 'application/javascript':/*  dont support */
                                break;
                            default:
                                if (obj_vast.mediafile == "") {
                                    /*  obj_vast.mediafile = node.nodeValue; */
                                    obj_vast.mediafile = ob.FixUrl(media_files[i].textContent);
                                }
                                break;
                        }
                    }
                }
                if (tracking_events != null) {
                    for (var i = 0; i < tracking_events.length; i++) {
                        var event = tracking_events[i].getAttribute('event');
                        if (!tracking_events[i].childNodes[0]) { continue; }
                        var val = tracking_events[i].childNodes[0].nodeValue;
                        if (event != '' && val != '') {
                            val = ob.FixUrl(val);
                            event = event.toLowerCase();/*  just to be sure */
                            if (typeof obj_vast.trackingevents[event] == 'undefined') {
                                obj_vast.trackingevents[event] = { done: false, items: [] };
                            }
                            if (event == "progress") {
                                var offset = (tracking_events[i].childNodes[0].parentElement.getAttribute("offset"));
                                if (offset != null) {
                                    let a = offset.split(":");
                                    if (a.length == 3) {/*  hh: mm: ss */
                                        /*  we should implement minute support? although there are other hardcoded events to handle this */
                                        let sec = parseInt(a[2]);

                                        obj_vast.trackingevents[event].items.push({
                                            "url": val,
                                            "offset": sec,
                                            done: false
                                        });
                                    }
                                }
                            } else {
                                obj_vast.trackingevents[event].items.push(val);
                            }
                        }
                    }
                }
                if (vasttagaduri.length > 0) {/*  supporting unlimited nested VASTs */
                    ob.LoadXml(vasttagaduri[0], function (xmlDoc) {
                        ob.ParseVastFile(xmlDoc, obj_vast, function (obj_vast) {
                            cb(obj_vast);
                        });
                    })
                } else {
                    cb(obj_vast);
                }
            },
        };
    }
};adMoxyCtrl.video_carousel = {
    aProcs: [],
    getVersion: function () {
        return "1.0";
    },
    display: function (iItem, json) {
        this.aProcs[iItem] = new this.proc();
        if (this.aProcs[iItem].init(iItem, json['settings'])) {
            this.aProcs[iItem].dc(iItem, json);
            return this.aProcs[iItem];
        }
    },
    css_muted: false,
    cssLoaded: false,

    proc: function () {
        return {
            popsid: 0,
            IsLoaded: false,
            itemId: 0,
            aSet: null,
            sTag: "",
            dTagId: "",

            impLogged: false,
            totalItems: 0,
            currentItem: 0,
            currPlayer: null,
            items: [],
            HlsUsed: false,
            obHls: null,
            started: false,
            showPrev: false,
            showNext: false,
            btnPrevUsed: false,
            btnNextUsed: false,
            btnPrevFading: false,
            btnNextFading: false,
            isNavigating: false,
            hasTouch: false,
            dragged: false,
            isPlaying: false,
            captionAdded: false,
            inFold: true,
            isHidden: false,
            isPaused: false,
            isMuted: true,
            hovering: false,
            suggestions_open: false,
            UserActive: false,
            isInFrame: false,
            isSlider: false,
            players: [],
            caller: null,
            isFullScreen: false,
            suggestions_time: 0,
            useAdLabel: false,

            settings: {
                close_btn: {
                    on: false,
                    start_at: 0
                },
                controls: {
                    on: false,
                    show_volume_btn: false,
                    show_fullscreen_btn: false
                },
                caption: {
                    on: false,
                    start_at: 2,
                    duration: 10,
                    back_on_hover: false,
                },
                suggestions: {
                    on: false,
                    spaceid: 0,
                    position: 'left',
                    start_at: 2,
                    duration: 25,
                    back_on_hover: false,
                    ad_options: {
                        show_icon: false,
                        show_title: false,
                        show_image: false,
                        show_description: false,
                        css: {
                            background_color: '',
                            border_color: '',
                            title_color: '',
                            text_color: '',
                            url_color: '',
                            fontsize: 15,
                            font_family: 'Verdana',
                        },
                        rows: 0,
                        cols: 0,
                    }
                }
            },

            hide: function () {
                if (this.HlsUsed) {
                    try { this.obHls.destroy(); } catch (e) { }
                }
                adMoxyCtrl.Tools.html(`#${this.sTag}_player`, '');
                adMoxyCtrl.Tools.remove(`#${this.dTagId}`);
                this.isHidden = true;
            },
            preDetectOrientation: function (callback) {
                const ob = this;
                ob.allPortrait = false;
                const sources = [];
                for (let i = 0; i < ob.items.length; i++) {
                    const item = ob.items[i];
                    const adw = parseInt(adMoxyCtrl.getItem(item, 'adwidth', 0), 10) || 0;
                    const adh = parseInt(adMoxyCtrl.getItem(item, 'adheight', 0), 10) || 0;
                    const screenshot = adMoxyCtrl.getItem(item, 'screenshot', '');
                    const videoUrl = adMoxyCtrl.getItem(item, 'video_url', '');
                    const vastUrl = adMoxyCtrl.getItem(item, 'video_vasturl', '');
                    const vastXml = adMoxyCtrl.getItem(item, 'video_vastxml', '');
                    if (adw > 0 && adh > 0 || screenshot !== '' || videoUrl !== '' || vastUrl !== '' || vastXml !== '') {
                        sources.push({ adw: adw, adh: adh, screenshot: screenshot, video: videoUrl, vastUrl: vastUrl, vastXml: vastXml, ad: item });
                    }
                }
                if (sources.length === 0) { callback(); return; }

                let checked = 0;
                let allPortrait = true;

                let done = false;
                const finish = function () {
                    if (done) return;
                    done = true;
                    ob.allPortrait = allPortrait;
                    if (ob.caller) {
                        ob.caller.allPortrait = allPortrait;
                        if (allPortrait) ob.caller.setwh();
                    }
                    callback();
                };
                const onChecked = function (idx, w, h) {
                    if (w > 0 && h > 0 && w >= h) {
                        allPortrait = false;
                    }
                    checked++;
                    checkNext();
                };
                const checkViaVideo = function (idx, url) {
                    const vid = document.createElement('video');
                    vid.preload = 'metadata';
                    vid.muted = true;
                    vid.style.display = 'none';
                    let handled = false;
                    const onResult = function () {
                        if (handled) return;
                        handled = true;
                        onChecked(idx, vid.videoWidth, vid.videoHeight);
                        vid.removeAttribute('src');
                        vid.load();
                        vid.remove();
                    };
                    vid.addEventListener('loadedmetadata', onResult);
                    vid.addEventListener('error', onResult);
                    document.body.appendChild(vid);
                    vid.src = url;
                };
                const checkViaVast = function (idx, src) {
                    var tmpPl = adMoxyCtrl.video.videoCtrl();
                    tmpPl.LoadActions(src.ad, function (aActions) {
                        var u = 'undefined';
                        if (aActions != null && typeof aActions != u) {
                            src.ad._cachedActions = aActions;
                            var vw = parseInt(aActions.video_width, 10) || 0;
                            var vh = parseInt(aActions.video_height, 10) || 0;
                            if (vw > 0 && vh > 0) {
                                onChecked(idx, vw, vh);
                                return;
                            }
                            var file = (typeof aActions.mediafile != u && aActions.mediafile != '') ? aActions.mediafile : '';
                            if (file !== '') {
                                checkViaVideo(idx, file);
                                return;
                            }
                        }
                        checked++;
                        checkNext();
                    });
                };
                var checkNext = function () {
                    if (checked >= sources.length || !allPortrait) { finish(); return; }
                    const idx = checked;
                    const src = sources[idx];
                    if (src.adw > 0 && src.adh > 0) {

                        onChecked(idx, src.adw, src.adh);
                    } else if (src.screenshot !== '') {
                        const img = new Image();
                        img.onload = function () {
                            onChecked(idx, img.naturalWidth, img.naturalHeight);
                        };
                        img.onerror = function () {
                            if (src.video !== '') { checkViaVideo(idx, src.video); }
                            else if (src.vastUrl !== '' || src.vastXml !== '') { checkViaVast(idx, src); }
                            else { checked++; checkNext(); }
                        };
                        img.src = src.screenshot;
                    } else if (src.video !== '') {
                        checkViaVideo(idx, src.video);
                    } else if (src.vastUrl !== '' || src.vastXml !== '') {
                        checkViaVast(idx, src);
                    } else {
                        checked++;
                        checkNext();
                    }
                };
                checkNext();
            },

            dc: function (iItem, json) {
                const o = this;
                if (o.itemId === 0) {
                    o.itemId = iItem;
                } else if (o.itemId !== iItem) {
                    adMoxyCtrl.debug("Videoslider plugin got called more than one time, will be ignored");
                    return;
                }
                o.items = json.items;
                o.totalItems = json.items.length;
                adMoxyCtrl.loadPlugin(-1, 'video', function () {
                    const aItem = adMoxyCtrl.adCals[iItem];
                    o.dTagId = aItem.display;
                    o.preDetectOrientation(function () {
                        if (o.isSlider) {
                            o.run(0);
                        } else {
                            try {
                                const n = adMoxyCtrl.Tools.getnode(`#${aItem.display}`);
                                n.insertAdjacentHTML('afterend', `<div id="trigger_${aItem.display}" style="height:400px;"></div>`);
                                new Waypoint({
                                    element: document.getElementById(`trigger_${aItem.display}`),
                                    handler: function () {
                                        adMoxyCtrl.debug(`Ad ${aItem['display']} visible`);
                                        adMoxyCtrl.Tools.remove(`#trigger_${aItem.display}`);
                                        o.run(0);
                                        this.destroy();
                                    },
                                    offset: 'bottom-in-view'
                                });
                            } catch (_e) {
                                adMoxyCtrl.Tools.remove(`#trigger_${aItem.display}`);
                                o.run(0);
                            }
                        }
                    });
                });
            },

            next: function () {
                this.switch(true);
            },
            prev: function () {
                this.switch(false);
            },
            switch: function (next) {
                next = next || false;
                const ob = this;
                let i = ob.currentItem;
                ob.isPlaying = false;
                ob.caption_open = false;
                adMoxyCtrl.Tools.hide(`#caption_${ob.currPlayer.playerid}`);
                if (ob.suggestions_open) {
                    ob.closeSuggestions(0);
                    ob.suggestions_open = false;
                }
                if (next) {
                    i++;
                    if (i >= ob.totalItems) {
                        if (ob.isSlider || ob.isInFrame) {
                            i = 0;
                        } else {
                            return
                        }
                    };
                } else {
                    if (i <= 0) return;
                    i--;
                }
                try {
                    ob.currPlayer.player.pause();
                    if (ob.HlsUsed) ob.obHls.destroy();
                    ob.currPlayer = null;
                } catch (e) { }
                ob.currentItem = i;
                ob.run(i);
            },

            run: function (i) {
                const ob = this;
                ob.isPlaying = false;
                ob.captionAdded = false;
                const iItem = ob.itemId;
                const ad = ob.items[i];
                if (!ad || ob.items.length === 0) {
                    ob.hide();
                    return;
                }

                const u = 'undefined';
                let pl;
                let need_init = false;
                if (!ob.players[i]) {
                    ob.players[i] = pl = adMoxyCtrl.video.videoCtrl();
                    need_init = true;
                } else {
                    pl = ob.players[i];
                }
                pl.isSlider = ob.isSlider;
                pl.itemId = ob.itemId;
                pl.iActionId = i;
                pl.playerid = `${ob.sTag}_content`;
                const aItem = adMoxyCtrl.adCals[iItem];
                pl.playerNode = adMoxyCtrl.Tools.getnode(`#${aItem.display}`);
                if (pl.playerNode === null) {
                    adMoxyCtrl.debug("adtag inpage video not found");
                    return;
                }
                ob.currPlayer = pl;

                adMoxyCtrl.Tools.hide(`#caption_${ob.currPlayer.playerid}`);
                ob.closeSuggestions();
                if (ob.dragged) ob.setBtns(false);

                const onActions = function (aActions) {
                    let file = '';
                    let hls_file = '';
                    if (aActions != null && typeof aActions != u && typeof aActions.mediafile != u && aActions.mediafile != '') {
                        file = aActions.mediafile;
                    } else {
                        if (typeof ad != u && typeof ad.video_url != u && ad.video_url != '') {
                            file = ad.video_url;
                        }
                        //hls_file = adMoxyCtrl.getItem(ad, 'video_hls_url', '');
                    }


                    ob.items[i].actions = (typeof aActions != u) ? aActions : [];

                    if (file === '') {
                        aItem.data = ad;
                        aItem.plugin = 'video_carousel';
                        adMoxyCtrl.logImp(pl.itemId, 'video_carousel', '', aItem);
                        pl.sendNotifications(aActions.impression, 'impression');
                        return;
                    }

                    adMoxyCtrl.Tools.css(pl.playerNode, { 'position': 'relative', 'display': 'none', 'overflow': 'hidden' });
                    if (!ob.started) {
                        ob.initStart();
                        ob.started = true;
                    }
                    pl.player = adMoxyCtrl.Tools.getnode(`#${ob.sTag}_player_${i}`);
                    if (pl.player == null) {
                        adMoxyCtrl.debug("cannot find player");
                        return;
                    }

                    const detectOrientation = function (video, index) {
                        const item_node = adMoxyCtrl.Tools.getnode(`#${ob.sTag}_item_${index}`);
                        if (!item_node || item_node.classList.contains('portrait') || item_node.classList.contains('landscape')) return;
                        if (video.videoWidth === 0 || video.videoHeight === 0) return;
                        if (video.videoHeight > video.videoWidth) {
                            item_node.classList.add('portrait');
                        } else {
                            item_node.classList.add('landscape');
                        }
                    };
                    pl.player.addEventListener('loadedmetadata', function () { detectOrientation(this, i); });
                    pl.player.addEventListener('playing', function () { detectOrientation(this, i); });

                    adMoxyCtrl.Tools.getnode(`#${ob.sTag}_carousel`).style.transform = `translateX(-${i * 100}%)`;
                    if (ob.isSlider && ob.caller && ob.caller.setwh && !ob.caller.running) {
                        pl.player.addEventListener('canplay', function () {
                            if (!ob.caller.running) {
                                ob.caller.running = true;
                                ob.caller.setwh();
                            }
                        }, { once: true });
                    }
                    adMoxyCtrl.video.LoadVideo(`${ob.sTag}_player_${i}`, file, hls_file, function (hlsused, hls) {
                        if (hlsused) {
                            ob.obHls = hls;
                            ob.HlsUsed = true;
                        } else if (ob.HlsUsed) {
                            ob.HlsUsed = false;
                            ob.obHls = null;
                            ad.video_hls_url = '';
                        }
                    });

                    ob.initItem();
                    adMoxyCtrl.Tools.show(`#${aItem.display}`);
                    if (need_init) ob.InitPlayerEvents();
                    try { pl.player.play(); } catch (e) { }
                };
                if (ad._cachedActions) {
                    onActions(ad._cachedActions);
                } else {
                    pl.LoadActions(ad, onActions);
                }
            },

            updateCircle: function (e) {
                const ob = this;
                const i = parseInt(e.target.currentTime);
                let d = parseInt(e.target.duration);
                if (ob.HlsUsed) d = 60;
                let t = Math.max(d - i, 0);
                if (isNaN(t)) { t = 0; }
                const percent = t / d * 100;
                const circle = adMoxyCtrl.Tools.getnode(`#carousel_countdown_${ob.itemId}_circle`);
                circle.style.background = `conic-gradient(white ${percent * 3.6}deg, black ${percent * 3.6}deg)`;
                const text = adMoxyCtrl.Tools.getnode(`#carousel_countdown_${ob.itemId}_text`);
                text.textContent = Math.ceil(t);
            },

            InitPlayerEvents: function () {
                const ob = this;
                const pl = ob.currPlayer;
                const playerIndex = ob.currentItem;
                const u = 'undefined';
                let clickListenerAdded = false;
                const playernode = adMoxyCtrl.Tools.getnode(`#${ob.sTag}_player_${playerIndex}`);

                playernode.addEventListener('error', function () {
                    if (ob.currentItem > 0) {
                        ob.HlsUsed = false; /* usually generated by blocked or not loading hls thus we reset it */
                    }
                });

                const ch = function () {
                    if (!ob.isMuted) pl.player.muted = false;
                    if (!clickListenerAdded) {
                        clickListenerAdded = true;
                        pl.player.addEventListener('click', function (e) {
                            if (ob.currentItem !== playerIndex) return;
                            if (ob.isPlaying) {
                                e.stopImmediatePropagation();
                                ob.isPlaying = false;
                                ob.handleClick();
                                return false;
                            }
                        });
                    }
                };

                pl.player.addEventListener('play', function () {
                    if (ob.currentItem !== playerIndex) return;
                    ob.isPlaying = true;
                    setTimeout(ch, 500);
                });

                pl.player.addEventListener('timeupdate', function (e) {
                    if (ob.currentItem !== playerIndex) return;
                    const ad = ob.items[ob.currentItem];
                    const i = parseInt(e.target.currentTime);
                    const d = parseInt(e.target.duration);
                    if (ob.currentItem < 0 || ad == null || !ob.isPlaying || d <= 0) return;
                    ob.updateCircle(e);
                    ob.checkCaption(i);
                    ob.checkSuggestion(i);
                    pl.checkPlayingActions(e, ad, ob.itemId, 'video_carousel');
                    if (i >= 60 && ob.HlsUsed) {
                        if (ob.userIsActive()) {
                            ob.next();
                        } else {
                            ob.currPlayer.player.pause();
                        }
                    }
                });

                pl.player.addEventListener('ended', function () {
                    if (ob.currentItem !== playerIndex) return;
                    const ad = ob.items[ob.currentItem];
                    if (typeof ad.actions.trackingevents.complete != u) {
                        pl.sendNotifications(ad.actions.trackingevents.complete.items, 'complete');
                    }
                    if (ob.userIsActive() && !ob.isPaused && ob.isPlaying) {
                        ob.next();
                    }
                });
            },

            userIsActive: function () {
                return this.UserActive || this.isSlider;
            },

            showCaption: function () {
                const ob = this;
                const playerNode = ob.currPlayer.playerNode;
                if (playerNode && (playerNode.offsetWidth < 300 || playerNode.offsetHeight < 250)) return;
                ob.caption_open = true;
                const captionSelector = `#caption_${ob.currPlayer.playerid}`;
                adMoxyCtrl.Tools.fadeIn(captionSelector, 1000, function () {
                    const d = ob.settings.caption.duration;
                    if (d > 0) {
                        const curr_item = ob.currentItem;
                        setTimeout(function () {
                            if (ob.currentItem === curr_item) {
                                adMoxyCtrl.Tools.fadeOut(captionSelector, 0);
                                ob.caption_open = false;
                            }
                        }, 1000 * d);
                    }
                });
            },

            checkCaption: function (play_time) {
                const ob = this;
                if (!ob.captionAdded) {
                    if (!ob.settings.caption.on) {
                        ob.captionAdded = true;
                        return;
                    }
                    if (play_time >= ob.settings.caption.start_at) {
                        const ad = ob.items[ob.currentItem];
                        const caption = adMoxyCtrl.getItem(ad, "title", "");
                        if (caption !== '') {
                            adMoxyCtrl.Tools.html(`#caption_${ob.currPlayer.playerid}`, caption);
                            ob.captionAdded = true;
                            ob.hascaption = true;
                            ob.showCaption();
                        }
                    }
                } else if (ob.hascaption && ob.hovering && ob.settings.caption.back_on_hover && !ob.caption_open) {
                    const ad = ob.items[ob.currentItem];
                    if (!ad.caption_hovercount) ad.caption_hovercount = 0;
                    if (ad.caption_hovercount < 1) {
                        ad.caption_hovercount++;
                        ob.showCaption();
                    }
                }
            },

            initItem: function () {
                const ob = this;
                const i = ob.currentItem;
                const prevSelector = `#btn_prev_${ob.sTag}`;
                const nextSelector = `#btn_next_${ob.sTag}`;



                if (ob.totalItems > 1) {
                    ob.showPrev = i > 0;
                    ob.showNext = i < ob.totalItems - 1;
                    if (!ob.hasTouch) {
                        if (ob.showPrev && ob.btnNextUsed && !ob.btnPrevUsed) {
                            adMoxyCtrl.Tools.fadeIn(prevSelector, 0);
                            ob.btnPrevUsed = true;
                        } else if (!ob.showPrev && ob.btnPrevUsed) {
                            adMoxyCtrl.Tools.fadeOut(prevSelector, 0);
                            ob.btnPrevUsed = false;
                        } else {
                            if (!ob.showPrev) {
                                adMoxyCtrl.Tools.fadeOut(prevSelector, 0);
                            }
                        }
                        if (ob.showNext && !ob.btnNextUsed && ob.btnPrevUsed) {
                            adMoxyCtrl.Tools.fadeIn(nextSelector, 0);
                            ob.btnNextUsed = true;
                        } else if (!ob.showNext && ob.btnNextUsed) {
                            adMoxyCtrl.Tools.fadeOut(nextSelector, 0);
                            ob.btnNextUsed = false;
                        } else {
                            if (!ob.showNext) {
                                adMoxyCtrl.Tools.fadeOut(nextSelector, 0);
                            }
                        }
                    }

                    if (ob.hasTouch && !ob.dragged) {
                        const flashBtn = function (selector, usedProp) {
                            adMoxyCtrl.Tools.fadeIn(selector, 1000, function () {
                                ob[usedProp] = true;
                                setTimeout(function () {
                                    adMoxyCtrl.Tools.fadeOut(selector, 1000, function () {
                                        ob[usedProp] = false;
                                    });
                                }, 3000);
                            });
                        };
                        if (ob.showNext) flashBtn(nextSelector, 'btnNextUsed');
                        if (ob.showPrev) flashBtn(prevSelector, 'btnPrevUsed');
                    }
                }
                ob.dragged = false;
            },

            checkSuggestion: function (i) {
                const ob = this;
                const su = ob.settings.suggestions;
                if (!su.on) return;

                const ad = ob.items[ob.currentItem];
                if (!ad.suggestions) {
                    ad.suggestions = [];
                    ob.loadSuggestions();
                    return;
                }
                if (ad.suggestions.length === 0) return;

                if (i >= su.start_at && !ob.suggestions_open && !ad.suggestions_time) {
                    ad.suggestions_time = Date.now();
                    ob.suggestions_time = Date.now();
                    ob.showSuggestions();
                }
                if (ob.hovering && ad.suggestions_time && !ob.suggestions_open && su.back_on_hover) {
                    if (ob.suggestions_time < Date.now() - 60000) {
                        ob.suggestions_time = Date.now();
                        ob.showSuggestions();
                    }
                }
            },
            closeSuggestions: function () {
                adMoxyCtrl.Tools.hide(`#carousel_suggestions_${this.itemId}`);
                this.suggestions_open = false;
            },

            showSuggestions: function () {
                const ob = this;
                const su = ob.settings.suggestions;
                if (!su.on || ob.suggestions_open) return;
                const playerNode = ob.currPlayer.playerNode;
                if (playerNode && (playerNode.offsetWidth < 400 || playerNode.offsetHeight < 250)) return;
                const ad = ob.items[ob.currentItem];
                if (ad.suggestions.length === 0) return;

                ob.suggestions_open = true;
                ob.drawSuggestions(function () {
                    const node = adMoxyCtrl.Tools.getnode(`#carousel_suggestions_${ob.itemId}`);
                    adMoxyCtrl.Tools.fadeIn(node, 1000, function () {
                        if (su.position === 'top' && su.ad_options.show_image && su.rows === 1) {
                            adMoxyCtrl.Tools.css(node, { 'display': 'flex', 'flex-wrap': 'nowrap', 'overflow-y': 'hidden' });
                        }
                        ad.suggestions.forEach(function (v) {
                            if (v.is_showed && !v.implogged) {
                                v.implogged = true;
                                adMoxyCtrl.AddImplog(v['hash']);
                            }
                        });
                        const d = su.duration;
                        const item = ob.currentItem;
                        ob.suggestions_time = Date.now();
                        if (d > 0) {
                            setTimeout(function () {
                                if (item === ob.currentItem) ob.closeSuggestions();
                                ob.suggestions_time = Date.now();
                                ob.suggestions_open = false;
                            }, d * 1000);
                        }
                    });
                });
            },

            loadSuggestions: function (fn) {
                const ob = this;
                const ad = ob.items[ob.currentItem];
                ad.suggestions = [];

                const val = adMoxyCtrl.adCals[ob.itemId];
                const set = { s: {}, id: ob.settings.suggestions.spaceid, itemid: 0 };
                adMoxyCtrl.setAdParams(val, set);
                if (ad.conn_campaign_id && ad.conn_campaign_id > 0) {
                    set.cid = ad.conn_campaign_id;
                }

                const sArgs = `&ad=${JSON.stringify(set)}`;
                adMoxyCtrl.request('get', `${sArgs}&act=get`, 0, {
                    result: function (jdata) {
                        if (jdata != null && typeof jdata.results === 'object' && jdata.results.length > 0) {
                            const result = jdata.results[0];
                            const o = ob.settings.suggestions.ad_options;
                            o.rows = result.settings.rows;
                            o.cols = result.settings.cols;
                            if (typeof result.settings.css === 'object') {
                                o.css = result.settings.css;
                            }
                            ad.suggestions = result.items;
                        }
                        if (typeof fn === 'function') fn(ad.suggestions.length > 0);
                    },
                    error: function () {
                        if (typeof fn === 'function') fn(false);
                    }
                });
            },

            drawSuggestions: function (fn) {
                const ob = this;
                const su = ob.settings.suggestions;
                const opts = su.ad_options;
                const position = su.position;
                const isTop = position === 'top';

                const node = adMoxyCtrl.Tools.getnode(`#carousel_suggestions_${ob.itemId}`);
                adMoxyCtrl.Tools.css(node, { "top": "-1000px" });
                adMoxyCtrl.Tools.html(node, '');
                adMoxyCtrl.Tools.show(node);

                const ad = ob.items[ob.currentItem];
                const player_height = adMoxyCtrl.Tools.height(ob.currPlayer.playerNode);
                const player_width = adMoxyCtrl.Tools.width(ob.currPlayer.playerNode);
                const small_pct = player_height * 0.3;
                const small_player = player_height < 400;
                let maxh = player_height / 2;
                if (small_player && small_pct < maxh) maxh = small_pct;

                let style = 'background-color: rgba(0, 0, 0, 0.7);color:white;font-size:18px;border-radius: 15px;line-height:20px;overflow:hidden;';
                let image_height = small_player ? small_pct : 120;
                const rows = opts.rows;

                if (ad.suggestions.length > 1) style += 'max-width:300px;';

                if (isTop) {
                    style += 'margin-left:auto;margin-right:auto;';
                    if (rows <= 1) {
                        adMoxyCtrl.Tools.css(node, { 'display': 'flex', 'flex-wrap': 'nowrap' });
                        if (opts.show_image) {
                            maxh = Math.min(maxh, 120, small_pct);
                            if (image_height > maxh) image_height = maxh;
                            image_height += 'px';
                        } else {
                            maxh = 50;
                            style += 'padding:5px;';
                        }
                    } else {
                        let mx = opts.show_image ? rows * 100 : rows * 60;
                        if (mx < maxh) maxh = mx;
                        image_height += 'px';
                    }
                } else {
                    if (opts.show_image) {
                        image_height += 'px';
                        style += 'margin:5px';
                    } else if (opts.show_title) {
                        const w = opts.show_icon ? 150 : 100;
                        style += `width:${w}px;margin:5px;`;
                    }
                }

                const css_obj = opts.css;
                const descr_css = `font-family:${css_obj.font_family};font-size:${(css_obj.fontsize / 100) * 80}px;color:${css_obj.text_color}!important;font-weight:bolder;`;
                const title_css = `font-family:${css_obj.font_family};font-size:${css_obj.fontsize}px;color:${css_obj.title_color}!important;font-weight:bold;`;
                const maxw = player_width - 20;
                const hasTextContent = opts.show_title || opts.show_description;

                for (let ia = 0; ia < ad.suggestions.length; ia++) {
                    const item = ad.suggestions[ia];
                    const id_val = `suggestion_item_${ob.itemId}_${ia}`;
                    let html = '';

                    if (isTop) {
                        if (opts.show_image) {
                            html += `<img class="carousel_image" onerror="adMoxyCtrl.swap(this)" style="display:block;float:left;height:${image_height}" src="${item.imagepath}"/>`;
                        }
                        if (opts.show_image && hasTextContent) {
                            html += '<div style="display:block;float:left;margin-top:auto;margin-bottom:auto;padding-right:5px">';
                        }
                        if (opts.show_icon && !opts.show_image) {
                            html += `<img class="carousel_icon" onerror="adMoxyCtrl.swap(this)" style="width:25px;height:25px;border-radius: 50%;display:block;float:left" src="${item.imagepath}"/>`;
                        }
                        if (opts.show_title) {
                            html += `<div class="carousel_title" style="padding-left:5px;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;${title_css}">${item.title}</div>`;
                        }
                        if (opts.show_description) {
                            html += `<div class="carousel_description" style="padding-left:5px;overflow: hidden;text-overflow: ellipsis;${descr_css};max-width:250px; ">${item.description}</div>`;
                        }
                        if (opts.show_image && hasTextContent) {
                            html += '</div>';
                        }
                    } else {
                        if (opts.show_image) {
                            html = `<img class="carousel_image" onerror="adMoxyCtrl.swap(this)" style="display:block;height:${image_height}" src="${item.imagepath}"/>`;
                        } else {
                            if (opts.show_icon) {
                                html += `<img class="carousel_icon" onerror="adMoxyCtrl.swap(this)" style="width:25px;height:25px;border-radius: 50%;display:block;" src="${item.imagepath}"/>`;
                            }
                            if (opts.show_title) {
                                html += `<div class="carousel_title" style="padding-left:5px;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;margin-top:auto;margin-bottom:auto ">${item.title}</div>`;
                            }
                        }
                    }

                    let itemStyle = style;
                    if (ia > 0 && isTop) itemStyle += 'margin-left:5px;';

                    adMoxyCtrl.Tools.append(node, `<div class="carousel_suggestion_item" item_id="${ia}" layout="row" id="${id_val}" style="cursor:pointer;display: flex;text-align:left;${itemStyle}">${html}</div>`);

                    const h = adMoxyCtrl.Tools.height(node);
                    const w = adMoxyCtrl.Tools.width(node);

                    if (h > maxh) {
                        adMoxyCtrl.Tools.remove(`#${id_val}`);
                        break;
                    }
                    if (isTop && rows <= 1 && w > maxw) {
                        adMoxyCtrl.Tools.remove(`#${id_val}`);
                        break;
                    }

                    const anode = adMoxyCtrl.Tools.getnode(`#${id_val}`);
                    anode.addEventListener("click", function (ev) {
                        const idx = parseInt(anode.getAttribute("item_id"));
                        const clickedItem = ad.suggestions[idx];
                        if (clickedItem != null) {
                            ev.stopImmediatePropagation();
                            adMoxyCtrl.open(`${adMoxyCtrl.getAdDomain()}/click.go?xref=${clickedItem.hash}`);
                        }
                    });
                    item.is_showed = true;
                }

                setTimeout(function () {
                    const neww = adMoxyCtrl.Tools.width(node);
                    const css = { "top": "5px" };

                    if (ob.useAdLabel) {
                        css['top'] = '25px';
                    }

                    if (isTop) {
                        const avw = player_width - neww;
                        if (avw > 0) {
                            css['left'] = '50%';
                            css['transform'] = 'translateX(-50%)';
                        }
                    }
                    adMoxyCtrl.Tools.css(node, css);
                    adMoxyCtrl.Tools.hide(node);
                    fn();
                }, 1000);
            },

            click: function () {

            },

            initStart: function () {
                if (!adMoxyCtrl.video_carousel.cssLoaded) {
                    adMoxyCtrl.video_carousel.cssLoaded = true;
                    const sDomain = adMoxyCtrl.getItem(adMoxyCtrl.ctrlSettings, "ctrl_domain", "");
                    if (sDomain !== '') {
                        adMoxyCtrl.Tools.append('head', `<link rel="stylesheet" href="${sDomain}/static.go?type=css&file=carousel">`);
                    }
                }

                const ob = this;
                const playerNode = ob.currPlayer.playerNode;
                const controls = ob.settings.controls.on ? ' controls' : '';
                playerNode.classList.add("video_carousel-container");
                if (ob.allPortrait) playerNode.classList.add("all-portrait");
                const t = adMoxyCtrl.Tools;

                let videohtml = '';
                for (let ia = 0; ia < ob.totalItems; ia++) {
                    const screenshot = adMoxyCtrl.getItem(ob.items[ia], "screenshot", "");
                    const poster = screenshot !== '' ? ` poster="${screenshot}" ` : '';
                    videohtml += `<div id="${ob.sTag}_item_${ia}" class="video_carousel-item"><div id="${ob.sTag}_vwrap_${ia}" class="video_carousel-video-wrap"><video id="${ob.sTag}_player_${ia}" muted="muted" ${poster} preload="auto" src="" autoPlay webkit-playsinline playsInline${controls}></video></div></div>`;
                }

                let navButtons = '';
                if (ob.totalItems > 1) {
                    navButtons = `<button id="btn_prev_${ob.sTag}" class="video_carousel-button prev" onclick="adMoxyCtrl.video_carousel.aProcs[${ob.itemId}].prev()">&#9664;</button><button class="video_carousel-button next" id="btn_next_${ob.sTag}" onclick="adMoxyCtrl.video_carousel.aProcs[${ob.itemId}].next()">&#9654;</button>`;
                }
                t.html(playerNode, `${navButtons}<div class="video_carousel-wrapper" id="${ob.sTag}_carousel">${videohtml}</div>`);

                if (!ob.isSlider) {
                    const aItem = adMoxyCtrl.adCals[ob.itemId];
                    const desc = adMoxyCtrl.getItem(aItem, "advertise", "");
                    if (desc !== "") {
                        ob.useAdLabel = true;
                        t.prepend(playerNode, `<div id="lbl_advertise_carousel_${ob.sTag}" class="lbl_advertise_slider" style="z-index:1000;background-color: #00000;color: #ffffff;padding:2px;max-height:20px;overflow:hidden;">${desc}</div>`);
                    }
                }

                if (ob.settings.close_btn.on) {
                    t.prepend(playerNode, `<div id="btn_close_carousel_${ob.itemId}" style="position:absolute;z-index:1000;top:0px;right:0px;display:none">${adMoxyCtrl.sCloseButtonHtml}</div>`);
                    setTimeout(function () {
                        t.show(`#btn_close_carousel_${ob.itemId}`);
                    }, ob.settings.close_btn.start_at * 1000);
                }

                if (ob.settings.suggestions.on) {
                    const suPos = ob.settings.suggestions.position;
                    let style = ['left', 'right'].indexOf(suPos) > -1 ? 'max-width:calc(30%);' : 'max-height:calc(30%);';
                    if (suPos === 'right') style += 'right:5px;';

                    t.prepend(playerNode, `<div class="carousel_suggestion_items" id="carousel_suggestions_${ob.itemId}" style="position:absolute;gap:5px;z-index:1000;top:5px;${style}"></div>`);
                }

                t.prepend(playerNode, `<div id="notifications_${ob.currPlayer.playerid}" style="display:none"></div>`);
                t.append(playerNode, `<div class="video_carousel_circle" id="carousel_countdown_${ob.itemId}_circle"><span class="video_carousel_circle_text" id="carousel_countdown_${ob.itemId}_text">0</span></div>`);

                ob.setVolumeBtn();
                ob.setFullscreenBtn();
                if (ob.settings.caption.on) {
                    const right = ob.settings.controls.show_volume_btn ? '50px' : '5px';
                    const bottom = ob.settings.controls.on ? 50 : 5;
                    adMoxyCtrl.Tools.append(playerNode, `<div class="carousel_caption" id="caption_${ob.currPlayer.playerid}" style="position:absolute;bottom:${bottom}px;z-index:1000;background-color: rgba(0, 0, 0, 0.7);color: #ffffff;padding: 10px;border-radius: 10px;text-align: center;gap:10px;left:60px;right:${right};cursor:pointer;display:none;"></div>`);
                }

                ob.setDefaultHandlers();
                ob.started = true;
            },

            setVolumeBtn: function () {
                const ob = this;
                if (!ob.settings.controls.show_volume_btn) return;
                adMoxyCtrl.Tools.append(ob.currPlayer.playerNode, `<div class="video_carousel_volumeBtn mute" id="btn_mute_carousel_${ob.itemId}" style="bottom: 10px;z-index:2000"></div>`);
                const btn = adMoxyCtrl.Tools.getnode(`#btn_mute_carousel_${ob.itemId}`);
                btn.addEventListener("click", function () {
                    ob.UserActive = true;
                    const wasMuted = ob.currPlayer.player.muted;
                    ob.currPlayer.player.muted = !wasMuted;
                    ob.isMuted = !wasMuted;
                    btn.classList.toggle("mute");
                });
            },

            setFullscreenBtn: function () {
                const ob = this;
                if (!ob.settings.controls.show_fullscreen_btn) return;
                adMoxyCtrl.Tools.append(ob.currPlayer.playerNode, `<div class="video_carousel_fullscreenBtn" id="btn_fullscreen_carousel_${ob.itemId}" style="z-index:2000"></div>`);
                const btn = adMoxyCtrl.Tools.getnode(`#btn_fullscreen_carousel_${ob.itemId}`);
                btn.addEventListener("click", function () {
                    ob.UserActive = true;
                    ob.handleFullscreen(btn);

                });
            },
            handleFullscreen: function (btn) {
                const ob = this;
                let t = adMoxyCtrl.Tools;


                if (typeof ob.caller === 'object' && ob.caller !== null && ob.hasTouch) { // for mobile we need to change it differently as we cannot request fullscreen??
                    ob.caller.handleFullScreen();
                } else {
                    const lblAdv = `#lbl_advertise_carousel_${ob.sTag}`;
                    if (ob.isFullScreen) {
                        ob.isFullScreen = false;
                        if (document.exitFullscreen) {
                            document.exitFullscreen();
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        }
                        t.show(lblAdv);
                    } else {
                        ob.isFullScreen = true;
                        t.hide(lblAdv);
                        ob.currPlayer.playerNode.requestFullscreen();
                        ob.currPlayer.playerNode.addEventListener('fullscreenchange', function () {
                            if (!document.fullscreenElement) {
                                ob.isFullScreen = false;
                                t.show(lblAdv);
                            }
                        });

                    }
                }
            },
            setTouchListener: function () {
                const ob = this;
                const c = adMoxyCtrl.Tools.getnode(`#${ob.sTag}_carousel`);
                let startX, endX;
                c.addEventListener('touchstart', function (e) {
                    startX = e.touches[0].clientX;
                });
                c.addEventListener('touchmove', function (e) {
                    endX = e.touches[0].clientX;
                });
                c.addEventListener('touchend', function () {
                    const diff = startX - endX;
                    if (Math.abs(diff) <= 50) return;
                    ob.dragged = true;
                    ob.UserActive = true;
                    if (diff > 50 && ob.currentItem < ob.items.length - 1) {
                        ob.next();
                    } else if (diff < -50 && ob.currentItem > 0) {
                        ob.prev();
                    }
                });
            },

            setDefaultHandlers: function () {
                const ob = this;
                const t = adMoxyCtrl.Tools;
                if (ob.hasTouch) {
                    ob.setTouchListener();
                } else {
                    const aItem = adMoxyCtrl.adCals[ob.itemId];

                    const n = t.getnode(`#${aItem.display}`);

                    n.addEventListener('mouseenter', function () {
                        if (ob.isHidden) return;
                        ob.setBtns(true);
                        ob.hovering = true;
                        ob.UserActive = true;
                    });
                    n.addEventListener('mouseleave', function () {
                        if (ob.isHidden) return;
                        ob.setBtns(false);
                        ob.hovering = false;
                    });

                    document.addEventListener('keydown', function (event) {
                        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            if (ob.isHidden || !ob.hovering) return;
                            if (!ob.isPaused && ob.userIsActive()) {
                                if (event.key === 'ArrowLeft') {
                                    ob.UserActive = true;
                                    ob.dragged = true;
                                    ob.prev();
                                } else if (event.key === 'ArrowRight') {
                                    ob.UserActive = true;
                                    ob.dragged = true;
                                    ob.next();
                                }
                            }
                        }
                    });

                    t.onResized(function () {
                        if (!ob.isHidden && ob.suggestions_open) {
                            ob.suggestions_open = false;
                            ob.showSuggestions();
                        }
                    });

                    t.onScrolled(function (ev) {
                        if (ob.isHidden) return;
                        try {
                            ob.inFold = t.isInFold(ob.currPlayer.playerNode);
                            if (ob.inFold) {
                                if (!ob.isPlaying && ob.isPaused) {
                                    ob.currPlayer.player.play();
                                    ob.isPaused = false;
                                }
                            } else if (ob.isPlaying) {
                                ob.currPlayer.player.pause();
                                ob.isPlaying = false;
                                ob.isPaused = true;
                            }
                        } catch (e) { }
                        if (ob.hovering && !ob.isPaused && ob.isInFrame) {
                            ob.UserActive = true;
                            if (ev.deltaY > 0) {
                                ob.prev();
                            } else {
                                ob.next();
                            }
                        }
                    });
                }

                if (adMoxyCtrl.getItem(ob.settings, "close_btn.on", false)) {
                    t.getnode(`#btn_close_carousel_${ob.itemId}`).addEventListener('click', function () {
                        ob.hide();
                    });
                }
                if (adMoxyCtrl.getItem(ob.settings, "caption.on", true)) {
                    t.getnode(`#caption_${ob.currPlayer.playerid}`).addEventListener('click', function () {
                        ob.handleClick();
                    });
                }
            },

            handleClick: function () {
                const ob = this;
                const ad = ob.items[ob.currentItem];
                let url = adMoxyCtrl.getItem(ad, 'destinationurl', '');
                if (ad.actions['clickthrough_url'] !== '') {
                    url = ad.actions['clickthrough_url'];
                }
                if (url !== '') {
                    adMoxyCtrl.request('logclick', `act=logclick&xref=${ad['hash']}`, 0, { result: function () { } });
                } else {
                    if (ad['hash'] === '') return;
                    url = `${adMoxyCtrl.getAdDomain()}/click.go?xref=${ad['hash']}`;
                }
                if (ad.actions['clickthrough_tracking'].length > 0) {
                    ob.currPlayer.sendNotifications(ad.actions['clickthrough_tracking'], 'clicktrack');
                }
                adMoxyCtrl.open(url);
                const aItem = adMoxyCtrl.adCals[ob.itemId];
                aItem.data = ad;
                aItem.plugin = 'video_carousel';
                adMoxyCtrl.bkLog('click', ob.itemId, { isiframe: 0 }, aItem);
            },

            setBtns: function (show, instant) {
                const ob = this;
                const ms = instant ? 0 : 0;// no animation as it causes flicker
                const prevSelector = `#btn_prev_${ob.sTag}`;
                const nextSelector = `#btn_next_${ob.sTag}`;

                if (show) {
                    if (ob.dragged) return;
                    if (ob.showPrev) {
                        if (!ob.btnPrevUsed) {
                            ob.btnPrevFading = true;
                            adMoxyCtrl.Tools.fadeIn(prevSelector, ms, function () {
                                ob.btnPrevUsed = true;
                                ob.btnPrevFading = false;
                            });
                        } else if (ob.btnPrevFading) {
                            setTimeout(function () { ob.setBtns(show, true); }, 500);
                        }
                    }
                    if (ob.showNext) {
                        if (!ob.btnNextUsed) {
                            ob.btnNextFading = true;
                            adMoxyCtrl.Tools.fadeIn(nextSelector, ms, function () {
                                ob.btnNextUsed = true;
                                ob.btnNextFading = false;
                            });
                        } else if (ob.btnNextFading) {
                            setTimeout(function () { ob.setBtns(show, true); }, 500);
                        }
                    }
                } else {
                    if (ob.showPrev && ob.btnPrevUsed) {
                        ob.btnPrevFading = true;
                        adMoxyCtrl.Tools.fadeOut(prevSelector, ms, function () {
                            ob.btnPrevUsed = false;
                            ob.btnPrevFading = false;
                        });
                    }
                    if (ob.showNext && ob.btnNextUsed) {
                        ob.btnNextFading = true;
                        adMoxyCtrl.Tools.fadeOut(nextSelector, ms, function () {
                            ob.btnNextUsed = false;
                            ob.btnNextFading = false;
                        });
                    }
                }
            },

            init: function (iItem, settings) {
                const ob = this;
                const aItem = adMoxyCtrl.adCals[iItem];
                const node = adMoxyCtrl.Tools.getnode(`#${aItem.display}`);
                if (node === null) {
                    adMoxyCtrl.debug('no adtag found for inpage video');
                    return false;
                }
                ob.itemId = iItem;
                ob.sTag = `crl_${iItem}`;
                adMoxyCtrl.Tools.remove(`[id^=${ob.sTag}]`);
                ob.settings = adMoxyCtrl.Tools.mergeDefaults(settings, ob.settings);
                ob.isSlider = typeof ob.settings.isSlider === 'boolean' ? ob.settings.isSlider : false;

                if (ob.isSlider) {
                    if (typeof ob.settings.caller === 'object' && ob.settings.caller !== null) {
                        ob.caller = ob.settings.caller;
                    }
                }

                if (ob.settings.controls.on) ob.settings.controls.show_volume_btn = false;
                ob.isInFrame = adMoxyCtrl.getItem(aItem, "in_frame", false) === true;
                if (ob.isInFrame || ob.isSlider) {
                    ob.settings.close_btn.on = false;
                    ob.settings.controls.on = false;
                }
                ob.hasTouch = adMoxyCtrl.Tools.isTouchDevice();

                if (ob.hasTouch || ob.isInFrame) {
                    ob.settings.controls.show_fullscreen_btn = false; // disable for mobile
                }
                if (ob.hasTouch) {
                    ob.settings.suggestions.on = false;
                }


                return true;
            },
        };
    },
};adMoxyCtrl.reel = {
    aProcs: [],
    getVersion: function () {
        return 1.0;
    },
    display: function (iItem, json) {
        const ob = this;
        if (ob.aProcs.length == 0) {
            try {
                ob.poll();
            } catch (_e) { }
        }
        ob.aProcs[iItem] = new ob.proc();
        if (ob.aProcs[iItem].init(iItem, json['settings'])) {
            ob.aProcs[iItem].dc(iItem, json);
        }
    },
    poll: function () {
        const ob = this;
        document.addEventListener("scroll", function () {
            ob.aProcs.forEach(function (v, k) {
                if (adMoxyCtrl.isInFold(document.getElementById(v.sTag + '_player'))) {
                    v.Resume();
                } else {
                    v.Pause();
                }
            });
        });
    },

    proc: function () {
        return {
            popsid: 0,
            isInitialized: false,
            IsLoaded: false,
            IsRunning: false,
            IsPlaying: false,
            itemId: 0,
            aSet: null,
            sTag: "",
            dTagId: "",
            Player: null,
            Resume: function () {
                if (!this.IsPlaying) {
                    this.Player.player.play();
                    this.IsPlaying = true;
                }
            },
            Pause: function () {
                if (this.IsPlaying) {
                    this.Player.player.pause();
                    this.IsPlaying = false;
                }
            },
            hide: function () {
                const t = adMoxyCtrl.Tools;
                t.html(`#${this.sTag}_player`, '');
                t.remove(`#${this.dTagId}`);
                t.remove(`#trigger_${this.dTagId}`);
                this.Player = null;
            },
            dc: function (iItem, json) {
                const o = this;
                const u = 'undefined';
                if (o.itemId == 0) {
                    o.itemId = iItem;
                } else {
                    if (o.itemId != iItem) {
                        adMoxyCtrl.debug("Videoslider plugin got called more than one time, will be ignored");
                        return;
                    }
                }
                adMoxyCtrl.loadPlugin(-1, 'video', function () {
                    const u = 'undefined';
                    const ad = json;
                    const pl = adMoxyCtrl.video.videoCtrl();
                    o.Player = pl;
                    pl.isSlider = true;
                    pl.itemId = iItem;
                    pl.iActionId = 0;
                    pl.playerid = o.sTag + '_content';
                    const aItem = adMoxyCtrl.adCals[iItem];
                    const t = adMoxyCtrl.Tools;
                    pl.playerNode = t.getnode(`#${aItem.display}`);
                    if (pl.playerNode === null) {
                        adMoxyCtrl.debug("adtag reel video not found");
                        return;
                    }
                    o.dTagId = aItem.display;
                    if (ad.type == "html") {
                        var run = function () {
                            t.append(`#${aItem.display}`, ad.html);
                            t.show(`#${aItem.display}`);
                            aItem.data = json;
                            aItem.plugin = 'reel';
                            adMoxyCtrl.logImp(pl.itemId, 'reels', '', aItem);
                            if (typeof json.imp_trackingurl != 'undefined' && json.imp_trackingurl != '') {
                                t.append("body", `<img width="0" height="0" src="${json.imp_trackingurl}" border="0"/>`);
                            }
                        };
                    } else {
                        var run = function (play) {
                            play = play | false;
                            var isp = false;
                            pl.LoadActions(json, function (aActions) {
                                var file = "";
                                if (typeof aActions != u && typeof aActions.mediafile != u && aActions.mediafile != '') {
                                    file = aActions.mediafile;
                                } else {
                                    if (typeof ad != u && typeof ad.video_url != u && ad.video_url != "") {
                                        file = ad.video_url;
                                    }
                                }
                                if (file == '') {
                                    /* we still log the impression... then adv had to respond with valid data!! */
                                    aItem.data = json;
                                    aItem.plugin = 'reel';
                                    adMoxyCtrl.logImp(pl.itemId, 'reel', '', aItem);
                                    pl.sendNotifications(aActions.impression, 'impression');
                                    o.hide();
                                    return;
                                }
                                t.append('body', `<div id="notifications_${pl.playerid}"></div>`);
                                t.css(pl.playerNode, { 'position': 'relative', 'display': 'none' });
                                t.html(pl.playerNode, `<video id="${o.sTag}_player" style="width:calc(100%);height:calc(100%);cursor:pointer" muted="muted" preload="auto" src="${file}" webkit-playsinline playsinline ${play ? 'autoplay' : ''} loop controls></video>`);
                                pl.player = t.getnode(`#${o.sTag}_player`);
                                t.show(`#${aItem.display}`);
                                t.prepend(pl.playerNode, `<div id="btn_close_inpage_${iItem}" style="position:absolute;z-index:1000;right:0px">${adMoxyCtrl.sCloseButtonHtml}</div>`);
                                t.getnode(`#btn_close_inpage_${iItem}`).addEventListener('click', function (e) {
                                    o.hide();
                                });
                                const ch = function () {
                                    try {
                                        t.getnode(`#${o.sTag}_player`).addEventListener('click', function (e) {
                                            if (isp) {
                                                e.stopImmediatePropagation();
                                                let url = adMoxyCtrl.getItem(ad, 'destinationurl', '');
                                                if (aActions['clickthrough_url'] != '') {
                                                    url = aActions['clickthrough_url'];
                                                }
                                                if (url != '') {
                                                    const uri = `act=logclick&xref=${ad['hash']}`;
                                                    adMoxyCtrl.request('logclick', uri, 0, { result: function (rdata) { } });
                                                } else {
                                                    url = `${adMoxyCtrl.ctrlSettings.ctrl_domain}/click.go?xref=${ad['hash']}`;
                                                }
                                                if (aActions['clickthrough_tracking'].length > 0) {
                                                    pl.sendNotifications(aActions['clickthrough_tracking'], 'clicktrack');
                                                }
                                                adMoxyCtrl.open(url);
                                                const aItem2 = adMoxyCtrl.adCals[iItem];
                                                aItem2.data = ad;
                                                aItem2.plugin = 'reel';
                                                adMoxyCtrl.bkLog('click', iItem, {}, aItem2);
                                                return false;
                                            } else {
                                                pl.player.play();
                                                return false;
                                            }
                                        });
                                    } catch (_e) { }
                                };
                                pl.player.addEventListener("play", function (e) {
                                    isp = true;
                                    setTimeout(() => {
                                        ch();
                                    }, 500);
                                });
                                pl.player.addEventListener('timeupdate', function (e) {
                                    isp = true;
                                    const i = parseInt(e.target.currentTime);
                                    if (i <= 0) { return; }
                                    const d = parseInt(e.target.duration);
                                    const firtsQuartile = (d / 4);
                                    const midPoint = (d / 2);
                                    const thirdQuartile = (firtsQuartile + midPoint);
                                    if (typeof aActions.trackingevents.start != u && aActions.trackingevents.start.done == false) {
                                        aActions.trackingevents.start.done = true;
                                        pl.sendNotifications(aActions.trackingevents.start.items, 'start');
                                    }
                                    if (typeof aActions.trackingevents.progress != u) {
                                        for (let a = 0; a < aActions.trackingevents.progress.items.length; a++) {
                                            const item = aActions.trackingevents.progress.items[a];
                                            if (item.done == false) {
                                                if (item.offset <= i) {
                                                    aActions.trackingevents.progress.items[a].done = true;
                                                    pl.sendNotifications([item.url], 'progress');
                                                }
                                            }
                                        }
                                    }
                                    if (i >= firtsQuartile && i < (firtsQuartile + 1)) {
                                        if (typeof aActions.trackingevents.firstquartile != u && aActions.trackingevents.firstquartile.done == false) {
                                            aActions.trackingevents.firstquartile.done = true;
                                            pl.sendNotifications(aActions.trackingevents.firstquartile.items, 'firstquartile');
                                        }
                                    } else if (i >= midPoint && i < (midPoint + 1)) {
                                        if (typeof aActions.trackingevents.midpoint != u && aActions.trackingevents.midpoint.done == false) {
                                            aActions.trackingevents.midpoint.done = true;
                                            pl.sendNotifications(aActions.trackingevents.midpoint.items, 'midpoint');
                                        }
                                    } else if (i >= thirdQuartile && i < (thirdQuartile + 1)) {
                                        if (typeof aActions.trackingevents.thirdquartile != u && aActions.trackingevents.thirdquartile.done == false) {
                                            aActions.trackingevents.thirdquartile.done = true;
                                            pl.sendNotifications(aActions.trackingevents.thirdquartile.items, 'thirdquartile');
                                        }
                                    }
                                    if (i <= 10) {
                                        if (i >= 1) {
                                            if (!pl.bImplogged) {
                                                pl.bImplogged = true;
                                                const aItem3 = adMoxyCtrl.adCals[iItem];
                                                aItem3.data = json;
                                                aItem3.plugin = 'inpage_video';
                                                adMoxyCtrl.logImp(pl.itemId, 'inpage_video', '', aItem3);
                                                pl.sendNotifications(aActions.impression, 'impression');
                                                if (typeof json.imp_trackingurl != 'undefined' && json.imp_trackingurl != '') {
                                                    const sPx = `<img width="0" height="0" src="${json.imp_trackingurl}" border="0"/>`;
                                                    t.append("body", sPx);
                                                }
                                            }
                                        }
                                    }
                                });
                                pl.player.addEventListener("ended", function (e) {
                                    if (typeof aActions.trackingevents.complete != u) {
                                        pl.sendNotifications(aActions.trackingevents.complete.items, 'complete');
                                    }
                                });
                            });
                        };
                    }
                    try {
                        const n = pl.playerNode;
                        n.insertAdjacentHTML('afterend', `<div id="trigger_${aItem.display}" style="height:0px;"></div>`);
                        const t_node = document.getElementById(`trigger_${aItem.display}`);

                        if (adMoxyCtrl.isInFold(t_node)) {
                            run(true);
                            o.IsRunning = true;
                            o.IsPlaying = true;
                        }
                        const waypoint = new Waypoint({
                            element: document.getElementById(`trigger_${aItem.display}`),
                            handler: function () {
                                if (!o.IsRunning) {
                                    run(false);
                                    o.IsRunning = true;
                                } else {
                                    pl.player.play();
                                    o.IsPlaying = true;
                                }

                            },
                            offset: 'bottom-in-view'
                        });
                    } catch (_e) {
                    }
                });
            },
            init: function (iItem, aSett) {
                const ob = this;
                const aItem = adMoxyCtrl.adCals[iItem];
                const t = adMoxyCtrl.Tools;
                const node = t.getnode(`#${aItem.display}`);
                if (node === null) {
                    adMoxyCtrl.debug('no adtag found for reel video');
                    return false;
                }
                ob.itemId = iItem;
                ob.sTag = `rl_${iItem}`;
                if (this.isInitialized) {
                    return;
                }
                this.isInitialized = true;
                t.remove(`[id^=${this.sTag}]`);
                this.aSet = aSett;
                return true;
            },
        };
    },
};adMoxyCtrl.footer_code = {
    sTag: "",
    getVersion: function () {
        return "1.0";
    },
    display: function (iItem, json) {
        const aItem = adMoxyCtrl.adCals[iItem];
        const sHtml = json.html;
        const t = adMoxyCtrl.Tools;
        t.append('body', sHtml);
        t.append('body', `<img width="0" height="0" id="fc_${iItem}_px" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="/>`);
        t.getnode(`#fc_${iItem}_px`).addEventListener('load', function () {
            adMoxyCtrl.AddImplog(json['hash']);
            adMoxyCtrl.bkLog('view', iItem);
        });
    }
};eaPopn = function () {

    this.phwnd = null;
    this.url = '';
    this.clickHandler = ['body'];
    this.ignoreList = [];
    this.cookieName = '';
    this.isPopunder = false;
    this.skipCookie = false;
    this.cookieTime = 900;
    this.nurls = {};
    this.popFired = false;
    this.xbtn = false;
    this.bjUsed = false;
    this.left = 0;
    this.p_width = screen.width;
    this.p_height = screen.height;
    this.top = 0;
    this.iItem = 0;
    this.cbp = false;
    this.onExit = false;
    this.capSettings = { repeatAmount: 0, repeatInterval: 0 };
    this.cHash = "";
    this.xparams = "";
    this.genUrl = function (aItem, spaceid) {
        let sDomain = "";
        if (typeof adMoxyCtrl.ctrlSettings.ctrl_domain != 'undefined' && adMoxyCtrl.ctrlSettings.ctrl_domain != "") {
            sDomain = adMoxyCtrl.ctrlSettings.ctrl_domain;
        }
        const t = adMoxyCtrl.Tools;
        const suri = `${sDomain}/pop.go?ctrlid=${adMoxyCtrl.ctrlId}&spaceid=${spaceid}`;
        if (t.appendUrlParms != null) {
            return t.appendUrlParms(suri, aItem);
        }
        return suri;
    };
    this.canrun = function () {

        if (adMoxyCtrl.Gup("nocap") == 1) {
            this.skipCookie = true;
        }

        if (this.skipCookie) {
            return true;
        }
        aVar = adMoxyCtrl.getStorage(this.cookieName);
        if (aVar == null || typeof aVar == 'undefined' || typeof aVar.repeatCount == 'undefined') {
            return true;
        } else {
            if (aVar.repeatCount < this.capSettings.repeatAmount) {
                iSec = parseInt(this.capSettings.repeatInterval);
                if (typeof aVar.Last != 'undefined' && !isNaN(aVar.Last)) {
                    i = parseInt(this.jq.now() / 1000);
                    is = parseInt(aVar.Last + iSec);
                    if (is < i) {
                        return true;
                    } else {
                        adMoxyCtrl.debug(`Pop need to wait ${is - i} Seconds`);
                    }
                } else {
                    return true;
                }
            } else {
                adMoxyCtrl.debug(`Pop repeat amount of ${this.capSettings.repeatAmount} Reached`);
            }
        }
        return false;
    };
    this.bypass = function () {
        if (!this.cbp) {
            return false;
        } else {
            try {
                const tools = adMoxyCtrl.Tools;
                if (tools.is_chrome() === true) {
                    const t = Math.round(new Date().getTime() / 1000);
                    let s;
                    try {
                        s = tools.fetch_session('get', true);
                    } catch (e) {
                        return false;
                    }
                    const d = t - s['time'];
                    if (s['v'] < 3 || d < 180) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            } catch (_e) {
                return false;
            }
        }
    };
    this.init = function () {
        const ob = this;
        ob.initPop();
    };
    this.isInitialized = function (fn) {
        this.phwnd = fn;
        this.adPop();
    };
    this.checkParents = function (aNode, findNode) {
        const aParents = adMoxyCtrl.Tools.parents(aNode);
        let bFound = false;
        aParents.forEach(function (v, i) {
            if (v == findNode) {
                bFound = true;
                return false;
            }
        });
        return bFound;
    };
    this.checkChilds = function (aNode, findNode) {
        const aChilds = aNode.childNodes;
        let bFound = false;
        if (aChilds.length > 0) {
            aChilds.forEach(function (v, i) {
                if (v == findNode) {
                    bFound = true;
                    return false;
                }
            });
        }
        return bFound;
    };


    this.canFire = function (aNode) {
        if (!this.canrun()) {
            return false;
        }
        let bRet = false;
        const ob = this;
        let bCheckIgnore = false;
        try {
            const t = adMoxyCtrl.Tools;
            ob.clickHandler.forEach(function (v, i) {
                const a = t.getnode(v);
                if (a == aNode) {
                    /* direct click on the tag, no need to check ignore */
                    bRet = true;
                    bCheckIgnore = true;
                } else {
                    const fNodes = t.getnodes(v);
                    fNodes.forEach(function (fNode, icnt) {
                        if (fNode == aNode) {
                            bRet = true;
                            if (this.xbtn) {
                                bCheckIgnore = true;
                            }
                            return false;
                        } else {
                            if (ob.checkParents(aNode, fNode)) { /* check if there is a parent matching */
                                bRet = true;
                                return false;
                            } else if (ob.checkChilds(aNode, fNode)) { /* check if there is a child matching */
                                bRet = true;
                                return false;
                            }
                        }
                    });
                }
                if (bRet) {
                    return false;
                }
            });
        } catch (_e) {
        }
        if (bRet && !bCheckIgnore) {
            if (aNode.nodeName == 'HTML') { /* never click on whitespace */
                bRet = false;
            } else {
                try {
                    ob.ignoreList.forEach(function (v, i) {
                        const fNodes = t.getnodes(v);
                        fNodes.forEach(function (fNode, icnt) {
                            if (fNode == aNode) {
                                bRet = false;
                                return false;
                            } else if (v != 'body' && ob.checkParents(aNode, fNode)) {
                                bRet = false;
                                return false;
                            }
                        });
                        if (bRet == false) {
                            return false;
                        }
                    });
                } catch (_e) {
                }
            }
            if (!bRet) {
                adMoxyCtrl.debug("Pop cancelled");
            }
        }
        return bRet;
    };
    this.upDateCookie = function () {
        let aVar = adMoxyCtrl.getStorage(this.cookieName);
        try {
            i = parseInt(Date.now() / 1000);
            e = 'undefined';
            if (aVar == null || typeof aVar == e || typeof aVar.repeatCount == e || typeof aVar.Last == e) {
                aVar = { repeatCount: 0, Last: i };
                adMoxyCtrl.setStorage(this.cookieName, aVar, this.cookieTime);
            } else {
                aVar.repeatCount++;
                aVar.Last = i;
                adMoxyCtrl.setStorage(this.cookieName, aVar, this.cookieTime);
            }
        } catch (_e) {
        }
    };
    this.Pop = function () {
        const ob = this;
        adMoxyCtrl.Tools.on('click', '*', function (e) {
            if (ob.canFire(e.target)) {
                ob.FirePop();
            }
        });
    };

    this.FirePop = function () {
        if (!adMoxyCtrl.eaPopShooted) {
            const ob = this;
            if (!ob.skipCookie) {
                ob.upDateCookie();
            }
            adMoxyCtrl.open(ob.url, function (ok) {
                if (ok) {
                    if (ob.cHash != '') {
                        adMoxyCtrl.AddImplog(ob.hash);
                    }
                    adMoxyCtrl.bkLog('view', ob.iItem);
                }
            });
        }
    };


    this.Under = function () {
        const ob = this;
        if (adMoxyCtrl.Gup("nocap") == 1) {
            ob.skipCookie = true;
        }
        let c = false;

        function r(e, node) {
            try {
                if (adMoxyCtrl.eaPopShooted == false && ob.canFire(node)) {
                    if (ob.bypass()) {
                        c = false;
                    } else {
                        adMoxyCtrl.eaPopShooted = true;
                        e.preventDefault();
                        e.stopPropagation();
                        let uri = window.location.href;
                        if (ob.xparams != '' && uri.indexOf(ob.xparams) === -1) {
                            uri += (uri.indexOf('?') !== -1 ? '&' : '?') + ob.xparams;
                        }

                        const s = adMoxyCtrl.getItem(node, 'href', '');
                        if (s != '' && s != '#' && s != 'javascript:void(0)') {
                            const tg = adMoxyCtrl.getItem(node, 'target', '');
                            if (tg != '' && tg == '_blank') {
                                window.open(uri, adMoxyCtrl.makeId(10));
                            }
                            window.open(s, adMoxyCtrl.makeId(10));
                        } else {
                            window.open(uri, adMoxyCtrl.makeId(10));
                        }
                        if (!ob.skipCookie) {
                            ob.upDateCookie();
                        }
                        if (ob.cHash != '') {
                            adMoxyCtrl.AddImplog(ob.cHash);
                        }
                        window.location.href = ob.url;
                        return false;
                    }
                }
                c = false;
                return true;
            } catch (_e) {
            }
        }

        const t = adMoxyCtrl.Tools;
        t.on('click', 'a', function (e) {
            c = true;
            return r(e, e.target);
        });
        t.on('click', '*', function (e) {
            if (!c) {
                let el = e.target;
                while (el) {
                    if (el.nodeName == 'A') {
                        if (!c) {
                            r(e, el);
                        }
                        return;
                    }
                    el = el.parentNode;
                }
                if (!c) {
                    r(e, e.target);
                }
            }
        });
    };
    this.initPop = function () {
        if (typeof adMoxyCtrl.eaPopShooted == 'undefined') {
            adMoxyCtrl.eaPopShooted = false;
        }
        const aItem = adMoxyCtrl.adCals[this.iItem];
        let id = 0;
        if (this.isPopunder) {
            id = 2;
        } else {
            if (typeof aItem.settings != 'undefined' && typeof aItem.settings.displaytype != 'undefined') {
                id = aItem.settings.displaytype;
            }
        }
        if (id == 2) {
            this.Under();
        } else {
            this.Pop();
        }
        if (this.onExit) {
            let lastY = -1;
            let inAction = false;
            const ob = this;
            document.addEventListener('mousemove', (e) => {
                if (e.clientY <= 5 && lastY > e.clientY && !inAction) { /* Assuming the top 5px is near the browser controls */
                    inAction = true;
                    setTimeout(function () {
                        if (lastY <= 5 && inAction) {
                            ob.FirePop();
                        }
                        inAction = false;
                    }, 500);
                } else {
                    if (e.clientY > 5) {
                        inAction = false;
                    }
                }
                lastY = e.clientY;
            });
        }
    };
};
adMoxyCtrl.pop = {
    fired: false,
    p_height: screen.availHeight,
    p_width: screen.availWidth,
    c_name: 'p_chk',
    pops: [],
    getVersion: function () {
        return "6.2";
    },
    display: function (iItem, jdata, tpItem) {

        if (adMoxyCtrl.getItem(jdata, "adtype", "") == "fpa") { /* fpa alternative for this browser */
            adMoxyCtrl.loadPlugin(iItem, "fpa", function () {
                adMoxyCtrl.fpa.display(iItem, jdata);
            });
            return;
        }

        const u = 'undefined';
        let sDomain = "";
        if (typeof adMoxyCtrl.ctrlSettings != u && typeof adMoxyCtrl.ctrlSettings.ctrl_domain != u && adMoxyCtrl.ctrlSettings.ctrl_domain != "") {
            sDomain = adMoxyCtrl.ctrlSettings.ctrl_domain;
        } else {
            if (typeof adMoxyCtrl.getSettings == "function") {
                const as = adMoxyCtrl.getSettings();
                adMoxyCtrl.ctrlSettings = as;
                sDomain = as.ctrl_domain;
            } else {
                adMoxyCtrl.debug("no domain found for pophandler");
                return;
            }
        }
        if (typeof window.eaPopShooted == u) {
            window.eaPopShooted = false;
        }
        const cname = this.c_name = `p_c_${jdata.spaceid}`;
        const pop = new eaPopn;
        let aItem;
        if (typeof (tpItem) != u) {
            aItem = tpItem;
        } else {
            aItem = adMoxyCtrl.adCals[iItem];
            if (typeof aItem.capSettings == 'object') {
                pop.capSettings = aItem.capSettings;
                jdata.settings.capSettings = pop.capSettings;
            }
            adMoxyCtrl.adCals[iItem].settings = jdata.settings;
        }
        if (typeof aItem.watchChrome == 'boolean') {
            pop.cbp = aItem.watchChrome;
        }
        pop.cookieTime = (aItem['settings']['refreshtime']);
        if (pop.cookieTime > 0) {
            pop.cookieTime = pop.cookieTime / 60; /* pop expect in minutes but sys return in seconds */
        }
        if (typeof aItem.ignoreTags == 'object' && aItem.ignoreTags.length > 0) {
            pop.ignoreList = aItem.ignoreTags;
        }
        if (typeof aItem.clickTags != u && aItem.clickTags.length > 0) {
            pop.clickHandler = aItem.clickTags;
        } else {
            pop.clickHandler = ['body'];
        }
        if (typeof aItem.skipCookie != u && aItem.skipCookie == true) {
            pop.skipCookie = true;
        }

        pop.onExit = adMoxyCtrl.getItem(aItem, "onExit", false) === true;
        if (!pop.onExit) {
            pop.onExit = adMoxyCtrl.getItem(aItem['settings'], "fire_on_exit", false) === true;
        }
        let purl = '';
        if (typeof jdata.destinationurl == u || jdata.destinationurl == '') {
            pop.url = pop.genUrl(aItem, jdata.spaceid);
            purl = pop.url;
        } else {
            pop.url = jdata.destinationurl;
            pop.cHash = jdata.hash;
            purl = `${sDomain}/imp.go?xref=${jdata.hash}`;
        }
        if (typeof aItem.onReady != u) {
            aItem.onReady(purl);
            return;
        }
        pop.cookieName = cname;
        pop.iItem = iItem;
        pop.init();
    },
};adMoxyCtrl.invideo = {
    a: [],
    getVersion: function () {
        return "4.7";
    },
    display: function (iItem, jdata) {
        if (typeof jdata.settings == 'undefined') {
            jdata.settings = {};
        }
        this.a[iItem] = new this.c();
        this.a[iItem].itemId = iItem;
        this.a[iItem].aOpts = jdata.settings;
        this.a[iItem].run();
    },
    c: function () {
        return {
            itemId: 0,
            aOpts: {},
            opts: null,
            playerNode: null,
            player: null,
            playerLoaded: false,
            fullScreenMode: false,
            MovieFinished: false,
            PlayerState: '',
            LastBannerShowed: '',
            pWidth: 0,
            pHeight: 0,
            playerType: '',
            an: null,
            playerNodeId: '',
            ctrlHeight: 0,
            sc: '',
            initialized: false,
            popFired: false,
            aPop: null,
            closePopId: 0,
            playPopId: 0,
            VP: null,
            autoplay: false,
            run: function () {
                const aOpts = adMoxyCtrl.adCals[this.itemId];
                const t = adMoxyCtrl.Tools;
                this.ctrlHeight = adMoxyCtrl.getItem(this.aOpts, 'controllerHeight', 0);
                if (aOpts.display != '') {
                    this.playerNodeId = aOpts.display;
                }
                if (typeof aOpts.player == "string" && aOpts.player != '') {
                    aOpts.playerNodeId = aOpts.player;
                    aOpts.player = t.getnode(`#${aOpts.player}`);
                } else {
                    if (aOpts.playertype == '' || aOpts.playertype == "autodetect") {
                        let p = this.detectJwPlayer();
                        if (typeof p != 'undefined' && typeof jwplayer(0).onPlay != "undefined") {
                            aOpts.playertype = "jwplayer";
                        } else {
                            const v = t.getnode("video");
                            if (v != null && v[0] != null) {
                                aOpts.playertype = "video";
                            } else {
                                p = this.detectFlowPlayerFlash();
                                if (typeof p != 'undefined') {
                                    aOpts.playertype = "flowplayer";
                                } else {
                                    p = this.detectKtPlayer();
                                    if (typeof p != 'undefined') {
                                        aOpts.playertype = "ktplayer";
                                    }
                                }
                            }
                        }
                        if (aOpts.playertype == '') {
                            adMoxyCtrl.debug("cannot detect player");
                            return;
                        }
                    }
                }
                switch (aOpts.playertype) {
                    case 'html5_video':
                    case 'video':
                        aOpts.playertype = "html5_video";
                        if (typeof aOpts.player != 'object') {
                            let s = adMoxyCtrl.getItem(aOpts, 'playerid', '');
                            if (s != "") {
                                this.player = t.getnode(`#${s}`);
                            } else {
                                s = adMoxyCtrl.getItem(aOpts, 'playerwrapper', '');
                                if (s != '') {
                                    this.player = t.find(`#${s}`, 'video')[0];
                                } else {
                                    this.player = t.getnode("video");
                                }
                            }
                        } else {
                            this.player = aOpts.player;
                        }


                        if (typeof this.player != 'object') {

                            adMoxyCtrl.debug("Could not detect the Videoplayer?");
                            return;
                        } else {
                            this.playerNodeId = aOpts.display;
                            if (t.getnode(`#${aOpts.display}`) === null || t.getnode(`#${this.playerNodeId}`).nodeName == 'VIDEO') {
                                s = adMoxyCtrl.getItem(aOpts, 'playerwrapper', '');
                                if (s == '') {
                                    s = this.player.parentNode.id;
                                }
                                this.playerNodeId = s;
                                aOpts.playerwrapper = this.playerNodeId;
                            }
                            const ctrl = this;
                            ctrl.playerType = "html5_video";
                            ctrl.player.addEventListener('play', function () {
                                ctrl.Play();
                            });
                            ctrl.player.addEventListener('playing', function () {
                                ctrl.Resume();
                            });
                            ctrl.player.addEventListener('canplaythrough', function () {
                            });
                            ctrl.player.addEventListener('pause', function () {
                                if (this.currentTime < (this.duration - 2) && !this.seeking) {
                                    ctrl.Pause();
                                }
                            });
                            ctrl.player.addEventListener('ended', function () {
                                ctrl.End();
                            });
                            ctrl.player.addEventListener('timeupdate', function (e) {
                                ctrl.Timer(this.currentTime, this.duration);
                            });
                            ctrl.player.addEventListener('webkitfullscreenchange', function () {
                                ctrl.CheckFullScreen();
                            });
                            ctrl.player.addEventListener('mozfullscreenchange', function () {
                                ctrl.CheckFullScreen();
                            });
                            ctrl.player.addEventListener('fullscreenchange', function () {
                                ctrl.CheckFullScreen();
                            });
                            ctrl.init();
                        }
                        break;
                    case "ktplayer": {
                        const ctrl = this;
                        if (typeof aOpts.player != 'object') {
                            if (aOpts.display == null || aOpts.display == '') {
                                aOpts.display = aOpts.playerwrapper;
                            }
                            ctrl.player = ctrl.detectKtPlayer(aOpts.display);
                            ctrl.playerNodeId = aOpts.display;

                        } else {
                            ctrl.player = aOpts.player;
                        }
                        if (typeof ctrl.player != 'object' && typeof ctrl.player != 'function') {
                            adMoxyCtrl.debug("Could not detect the KtPlayer");
                        } else {
                            ctrl.playerType = "ktplayer";
                            ctrl.player.listen('ktVideoStarted', function () {
                                ctrl.Play();
                            });
                            ctrl.player.listen('ktVideoPaused', function () {
                                ctrl.Pause();
                            });
                            ctrl.player.listen('ktVideoStopped', function () {
                                ctrl.End();
                            });
                            ctrl.player.listen('ktVideoFinished', function () {
                                ctrl.End();
                            });
                            ctrl.player.listen('ktVideoProgress', function (time) {
                                ctrl.Timer(time);
                            });
                            ctrl.init();
                        }
                        break;
                    }
                    case "jwplayer":
                        if (typeof aOpts.player == 'undefined' || aOpts.player == '') {
                            this.player = this.detectJwPlayer();
                        } else {
                            this.player = aOpts.player;
                        }
                        this.player = jwplayer(0);
                        if (typeof this.player != 'object') {
                            adMoxyCtrl.debug("Could not detect the JwPlayer");
                            return;
                        } else {
                            const ctrl = this;
                            ctrl.playerType = "jwplayer";
                            ctrl.playerNodeId = ctrl.player.id;
                            ctrl.player.onPlay(function () {
                                ctrl.Play();
                            });
                            ctrl.player.onPause(function () {
                                ctrl.Pause();
                            });
                            ctrl.player.onTime(function (e) {
                                ctrl.Timer(e.position, e.duration);
                            });
                            ctrl.player.onReady(function () {
                                ctrl.init();
                            });
                            setTimeout(function () {
                                ctrl.init();
                            }, 2000);
                        }
                        break;
                    case "flowplayer":
                        this.playerType = "flowplayer";
                        if (typeof aOpts.player == 'undefined' || aOpts.player == '') {
                            this.player = this.detectFlowPlayerFlash();
                        } else {
                            this.player = aOpts.player;
                        }
                        if (typeof this.player != 'object') {
                            adMoxyCtrl.debug("Could not detect the Flowplayer");
                            return;
                        } else {
                            const ctrl = this;
                            if (typeof this.player.on == 'function') {
                                if (t.getnode(`#${this.playerNodeId}`) === null) {
                                    const node = t.getnode('.flowplayer');
                                    if (node.getAttribute('id') == null) {
                                        t.attr(node, 'id', 'flowplayer');
                                        this.playerNodeId = 'flowplayer';
                                    } else {
                                        this.playerNodeId = node.getAttribute('id');
                                    }
                                }
                                this.player.on("progress", function (a, b, time) {
                                    ctrl.Timer(time);
                                });
                                this.player.on("pause", function () {
                                    ctrl.Pause();
                                });
                                this.player.on("ready", function () {
                                });
                                this.player.on("start", function () {
                                    ctrl.Play();
                                });
                                this.player.on("resume", function () {
                                    ctrl.Resume();
                                });
                                this.player.on("finish", function () {
                                    ctrl.End();
                                });
                            } else {
                                this.playerNodeId = this.player.getParent().id;
                                this.player.onPause(function () {
                                    ctrl.Pause();
                                });
                                this.player.onStart(function () {
                                    return ctrl.Play();
                                });
                                this.player.onResume(function () {
                                    return ctrl.Resume();
                                });
                                this.player.onFinish(function () {
                                    return ctrl.End();
                                });
                                this.player.onCuepoint([ctrl.aOpts.midrollstart * 1e3], function (e, t) {
                                    ctrl.openBanner("midroll");
                                });
                            }
                            ctrl.init();
                        }
                        break;
                    default:
                        adMoxyCtrl.debug(`unknown invideo player type ${aOpts.playertype}`);
                        return;
                        break;
                }
            },
            init: function () {
                if (this.playerType == "") {
                    return;
                }
                if (typeof adMoxyCtrl.sCloseButtonHtml == 'undefined') {
                    adMoxyCtrl.sCloseButtonHtml = "<img alt='Close Ad' style='background:#ffffff;border-radius: 50%;margin:2px' width='24' height='24' src='data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIwIDAgNDk2IDQ5NiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDk2IDQ5NjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPGc+DQoJCTxnPg0KCQkJPHBhdGggZD0iTTI0OCwwQzExMS4wMzMsMCwwLDExMS4wMzMsMCwyNDhzMTExLjAzMywyNDgsMjQ4LDI0OHMyNDgtMTExLjAzMywyNDgtMjQ4QzQ5NS44NDEsMTExLjA5OSwzODQuOTAxLDAuMTU5LDI0OCwweg0KCQkJCSBNMjQ4LDQ4MEMxMTkuODcsNDgwLDE2LDM3Ni4xMywxNiwyNDhTMTE5Ljg3LDE2LDI0OCwxNnMyMzIsMTAzLjg3LDIzMiwyMzJDNDc5Ljg1OSwzNzYuMDcyLDM3Ni4wNzIsNDc5Ljg1OSwyNDgsNDgweiIvPg0KCQkJPHBhdGggZD0iTTM2MS4xMzYsMTM0Ljg2NGMtMy4xMjQtMy4xMjMtOC4xODgtMy4xMjMtMTEuMzEyLDBMMjQ4LDIzNi42ODhMMTQ2LjE3NiwxMzQuODY0Yy0zLjA2OS0zLjE3OC04LjEzNC0zLjI2Ni0xMS4zMTItMC4xOTcNCgkJCQljLTMuMTc4LDMuMDY5LTMuMjY2LDguMTM0LTAuMTk3LDExLjMxMmMwLjA2NCwwLjA2NywwLjEzLDAuMTMyLDAuMTk3LDAuMTk3TDIzNi42ODgsMjQ4TDEzNC44NjQsMzQ5LjgyNA0KCQkJCWMtMy4xNzgsMy4wNy0zLjI2Niw4LjEzNC0wLjE5NiwxMS4zMTJjMy4wNywzLjE3OCw4LjEzNCwzLjI2NiwxMS4zMTIsMC4xOTZjMC4wNjctMC4wNjQsMC4xMzItMC4xMywwLjE5Ni0wLjE5NkwyNDgsMjU5LjMxMg0KCQkJCWwxMDEuODI0LDEwMS44MjRjMy4xNzgsMy4wNyw4LjI0MiwyLjk4MiwxMS4zMTItMC4xOTZjMi45OTUtMy4xLDIuOTk1LTguMDE2LDAtMTEuMTE2TDI1OS4zMTIsMjQ4bDEwMS44MjQtMTAxLjgyNA0KCQkJCUMzNjQuMjU5LDE0My4wNTIsMzY0LjI1OSwxMzcuOTg4LDM2MS4xMzYsMTM0Ljg2NHoiLz4NCgkJPC9nPg0KCTwvZz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjwvc3ZnPg0K'/>";
                }
                const e = 'undefined';
                const aOpts = adMoxyCtrl.adCals[this.itemId];
                const txtAdvertise = adMoxyCtrl.getItem(aOpts, "advertise", "Advertisement");
                const closePlay = adMoxyCtrl.getItem(aOpts, "close_play", "Close & Play");
                const css = 'display: flex;justify-content: space-between;width: 100%;box-sizing: border-box;';

                if (this.initialized) {
                    return;
                }
                this.initialized = true;
                this.sc = `ctrl_${this.itemId}_content`;
                const sHtml = `<div id="inv_${this.itemId}" class="invideo_banner" style="display:none;position:absolute;top:50%;left:50%;transform: translate(-50%, -50%);border-radius: 8px;color:#fff"><div class="invideo_header" id="ctrl_${this.itemId}_close_layer" style="${css}"><div class="lbl_advertise">${txtAdvertise}</div><a href="#" title="Close Ad" id="btn_ctrl_${this.itemId}_close" onclick="adMoxyCtrl.invideo.a[${this.itemId}].closeAd(1); return false;">${adMoxyCtrl.sCloseButtonHtml}</a></div><div id="${this.sc}" class="invideo_banner_content" style="${css}"></div><div class="invideo_footer" style="width:100%;align-items: center;text-align: center;padding:2px;cursor: pointer" onclick="adMoxyCtrl.invideo.a[${this.itemId}].closeAd(1);return false;">${closePlay}</div></div>`;
                let node = document.getElementById(this.playerNodeId);
                if (node == null) {
                    node = this.player.parentNode;
                }

                let needInvideo = false;
                if (this.aOpts.usepreroll) {
                    if (typeof this.aOpts.preroll.vsid != 'undefined' && !isNaN(this.aOpts.preroll.vsid)) {
                        if (this.aOpts.preroll.vsid > 0) {
                            needInvideo = true;
                        }
                    }
                }
                if (this.aOpts.usemidroll) {
                    if (typeof this.aOpts.midroll.vsid != 'undefined' && !isNaN(this.aOpts.midroll.vsid)) {
                        if (this.aOpts.midroll.vsid > 0) {
                            needInvideo = true;
                        }
                    }
                }
                if (this.aOpts.usepostroll) {
                    if (typeof this.aOpts.postroll.vsid != 'undefined' && !isNaN(this.aOpts.postroll.vsid)) {
                        if (this.aOpts.postroll.vsid > 0) {
                            needInvideo = true;
                        }
                    }
                }
                if (needInvideo) {
                    const iItem = this.itemId;
                    const ob = this;
                    adMoxyCtrl.loadPlugin(-1, "video", function () {
                        try {
                            const aSet = adMoxyCtrl.adCals[iItem];
                            aSet.videoads = [];
                            adMoxyCtrl.adCals[iItem] = aSet;
                            ob.VP = adMoxyCtrl.video.display(iItem, {});
                        } catch (_e) {
                        }
                    });
                }
                if (typeof this.aOpts.closepop != e && this.aOpts.closepop.id != e) {
                    const closePopId = this.aOpts.closepop.id;
                    const acap = this.aOpts.closepop.cappingtime;
                    const btn = this.sc;
                    adMoxyCtrl.loadPlugin(-1, "pop", function () {
                        cbp = function () {
                            if (typeof eaPopn != 'undefined') {
                                const p = new eaPopn;
                                p.isPopunder = 0;
                                p.url = p.genUrl({}, closePopId);
                                p.cookieTime = acap;
                                p.clickHandler = [`#${btn}`];
                                p.ignoreList = [document];
                                p.cookieName = `pop_btn_close_${closePopId}`;
                                if (p.canrun()) {
                                    p.init();
                                }
                            } else {
                                setTimeout("cbp()", 500);
                            }
                        };
                        cbp();
                    });
                }
                if (typeof this.aOpts.onplaypop != e && this.aOpts.onplaypop.id != e) {
                    const closePpId = this.aOpts.onplaypop.id;
                    const acp = this.aOpts.onplaypop.cappingtime;
                    const btna = this.playerNodeId;
                    adMoxyCtrl.loadPlugin(-1, "pop", function () {
                        cba = function () {
                            if (typeof eaPopn != 'undefined') {
                                const p = new eaPopn;
                                p.isPopunder = 1;
                                p.url = p.genUrl({}, closePpId);
                                p.cookieTime = acp;
                                p.clickHandler = [`#${btna}`];
                                p.xparams = "play=1";
                                p.ignoreList = [document];
                                p.cookieName = `pop_onplay_${closePpId}`;
                                if (p.canrun()) {
                                    p.init();
                                }
                            } else {
                                setTimeout("cba()", 500);
                            }
                        };
                        cba();
                    });
                }
                if (node.nodeName == "OBJECT") {
                    node = node.parentNode;
                    this.playerNodeId = node.id;
                }
                const t = adMoxyCtrl.Tools;
                this.an = t.prepend(node, sHtml);
                if (adMoxyCtrl.Gup("play") == 1) {
                    this.autoplay = true;
                }
                if (this.aOpts.usepreroll) {
                    this.openBanner('preroll');
                } else {
                    adMoxyCtrl.debug("no preroll configged for invideo");
                }
                const self = this;
                t.on(window, 'resize', function () {
                    self.RePosBanner();
                });
            },
            openBanner: function (dtype) {
                const ob = this;
                if (typeof adMoxyCtrl.videoAdRunning != 'undefined') {
                    if (adMoxyCtrl.videoAdRunning == true) {
                        return false;
                    }
                }
                if (this.fullScreenMode) {
                    return false;
                }
                if (this.an != null) {
                    if (typeof this.aOpts[dtype] == 'undefined') {
                        adMoxyCtrl.debug(`no invideo options for ${dtype}`);
                        return;
                    }
                    const t = adMoxyCtrl.Tools;
                    if (t.getnode(`#${this.sc}`) === null) {
                        adMoxyCtrl.debug("cannot find html noded to load ads");
                        return;
                    }
                    this.LastBannerShowed = dtype;
                    let opts = null;
                    switch (this.LastBannerShowed) {
                        case "preroll":
                            this.opts = opts = this.aOpts['preroll'];
                            if (this.PlayerState == "playing" || this.PlayerState == "buffering") {
                                return;
                            }
                            break;
                        case "pause":
                            this.opts = opts = this.aOpts['pause'];
                            break;
                        case "postroll":
                            this.opts = opts = this.aOpts['postroll'];
                            this.MovieFinished = true;
                            break;
                        case "midroll":
                            this.opts = opts = this.aOpts['midroll'];
                            break;
                        default:
                            return false;
                    }
                    this.aOpts[dtype].showed = true;
                    const val = adMoxyCtrl.adCals[this.itemId];
                    let sArgs = '';
                    let sids = opts.sids;
                    if (sids == null || typeof sids != 'object') {
                        sids = [];
                    }
                    if (typeof opts.vsid != 'undefined' && !isNaN(opts.vsid) && opts.vsid > 0) {
                        /* sids = []; */
                        sids.push(opts.vsid);
                    }
                    if (sids.length > 0) {
                        sArgs = '';
                        let i = 0;
                        sids.forEach(function (sid, ia) {
                            const set = {
                                s: {}
                            };
                            set.id = sid;
                            set.s.itemid = i;
                            let s = adMoxyCtrl.getItem(val, 'subid', '', true);
                            if (s != "") {
                                set.sid = s;
                            }
                            s = adMoxyCtrl.getItem(val, 'keywords', '', true);
                            if (s != "") {
                                set.kw = s;
                            }
                            s = adMoxyCtrl.getItem(val, 'maincat', '', true);
                            if (s != '') {
                                set.mc = s;
                            }
                            sArgs += `&ad=${JSON.stringify(set)}`;
                            i++;
                        });
                    }
                    const actrl = this;
                    const iItem = this.itemId;
                    adMoxyCtrl.request('get', `${sArgs}&act=get&doc=${escape(document.location)}`, 0, {
                        result: function (jdata) {
                            if ('undefined' != typeof jdata.results && 'undefined' != typeof jdata.results[0]) {
                                t.html(`#${actrl.sc}`, '');
                                adMoxyCtrl.adCals[iItem].data = jdata.results;
                                let iBannersFound = 0;
                                let iBanCpm = 0;
                                let iVidCpm = 0;
                                let iVideoFound = 0;
                                let i = 0;
                                jdata.results.forEach(function (ad, ia) {
                                    if (ad['adtype'] == "banner" || ad['adtype'] == "native") {
                                        iBannersFound++;
                                        if (typeof ad.ecpm == 'number') {
                                            iBanCpm += ad.ecpm;
                                        }
                                    } else {
                                        iVideoFound++;
                                        if (typeof ad.ecpm == 'number') {
                                            iVidCpm += ad.ecpm;
                                        }
                                    }
                                });
                                let skipbanner = false;
                                let skipvid = false;
                                if (actrl.autoplay && dtype == 'preroll') {
                                    skipbanner = true;
                                    //actrl.player.muted = true;
                                    //actrl.player.play();
                                }
                                const skip = adMoxyCtrl.getItem(adMoxyCtrl.adCals[iItem], 'skip_banner_when_video', true);
                                if (skip) {
                                    if (iBannersFound > 0 && iVideoFound > 0) {
                                        if (iBanCpm > iVidCpm) {
                                            skipvid = true;
                                        } else {
                                            skipbanner = true;
                                        }
                                    }
                                }
                                t.html(`#${actrl.sc}`, '');

                                jdata.results.forEach(function (ad, ia) {

                                    switch (ad['adtype']) {
                                        case "native":
                                            if (!skipbanner) {
                                                i++;
                                                adMoxyCtrl.loadPlugin(-1, "native", function () {
                                                    const sId = `${actrl.sc}ct_${i}`;
                                                    adMoxyCtrl.adCals[iItem]["display"] = sId;
                                                    adMoxyCtrl.adCals[iItem]["isflt"] = 1;
                                                    t.append(`#${actrl.sc}`, `<div style="float:left;padding:1px" id="${sId}"></div>`);
                                                    adMoxyCtrl.native.display(iItem, ad);
                                                    if (i == iBannersFound) {
                                                        adMoxyCtrl.invideo.a[iItem].adLoaded();
                                                    }
                                                });
                                            }
                                            break;
                                        case "banner":
                                            if (!skipbanner) {
                                                i++;
                                                adMoxyCtrl.banner.genHtml(iItem, ad, function (s) {



                                                    t.append(`#${actrl.sc}`, `<div style="float:left;padding:1px">${s}</div>`);
                                                    let functs = {};
                                                    if (i == iBannersFound) {
                                                        functs = {
                                                            onload: function () {
                                                                adMoxyCtrl.invideo.a[iItem].adLoaded();
                                                            }
                                                        };
                                                    }
                                                    adMoxyCtrl.banner.addHandler(iItem, functs, ia);
                                                }, ia);
                                            }
                                            break;
                                        case "video":
                                            if (!skipvid) {

                                                ad.type = dtype;

                                                if (ob.VP != null) {
                                                    if (typeof adMoxyCtrl.adCals[iItem].actions == 'undefined') {
                                                        adMoxyCtrl.adCals[iItem].actions = [];
                                                    }
                                                    adMoxyCtrl.adCals[iItem].actions[ad.actionid] = {
                                                        "type": dtype,
                                                        "invideo": 1
                                                    };
                                                    adMoxyCtrl.video.display(iItem, ad);
                                                }
                                            }
                                            break;
                                        default:
                                            adMoxyCtrl.debug(`unknown ad for invideo, adtype:${ad['adtype']}`);
                                            return;
                                    }
                                });
                            }
                        }
                    });
                    return true;
                }
            },
            closeAd: function (play) {
                adMoxyCtrl.Tools.hide(`#inv_${this.itemId}`);

                if (play != null && play) {
                    if (this.PlayerState != "playing" && !this.MovieFinished) {
                        this.Resume();
                        return false;
                    }
                    this.MovieFinished = false;
                    return true;
                }
            },
            adLoaded: function () {
                const o = this;
                if (o.opts.fadeIn) {
                    adMoxyCtrl.Tools.fadeIn(`#inv_${o.itemId}`, 2500, function () {
                        o.RePosBanner();
                    });
                } else {
                    document.getElementById(`inv_${o.itemId}`).style.display = 'block';
                    o.RePosBanner();
                }
            },
            CheckFullScreen: function () {
                if (this.VP != null && this.VP.vidAdRunning) {
                    if (this.isInFullScreenMode()) {
                        this.VP.endActions(1);
                    }
                }
            },
            RePosBanner: function (sfirst) {
                const t = adMoxyCtrl.Tools;
                if (t.html(`#${this.sc}`) == '') {
                    return;
                }
                if (this.an == null) {
                    return;
                }
                let pWidth;
                let pHeight;
                switch (this.playerType) {
                    case "html5_video":
                        pWidth = t.width(this.player);
                        pHeight = t.height(this.player);
                        break;
                    default:
                        if (t.getnode(`#${this.playerNodeId}`).length == 0) {
                            adMoxyCtrl.debug("No videolayer node");
                            return;
                        }
                        pWidth = t.width(`#${this.playerNodeId}`);
                        pHeight = t.height(`#${this.playerNodeId}`);
                        break;
                }
                switch (this.LastBannerShowed) {
                    case "preroll":
                        if (this.PlayerState == "playing" || this.PlayerState == "buffering") {
                            return;
                        }
                        break;
                    case "pause":
                        break;
                    case "postroll":
                        this.MovieFinished = true;
                        break;
                    case "midroll":
                        break;
                    default:
                        return false;
                }
                const AdNode = t.getnode(`#inv_${this.itemId}`);
                if (AdNode == null) {
                    return false;
                }
                if (pHeight <= 100) {
                    setTimeout(`adMoxyCtrl.invideo.a[${this.itemId}].RePosBanner();`, 100);
                    return;
                }
                pHeight -= this.ctrlHeight;
                const bWidth = t.width(AdNode);
                const bHeight = t.height(AdNode);
                if (bWidth <= 100) {
                    setTimeout(`adMoxyCtrl.invideo.a[${this.itemId}].RePosBanner();`, 100);
                    return;
                }
                let xstyle;
                switch (this.opts.position) {
                    case "center":
                        xstyle = "top:50%;left:50%;transform: translate(-50%, -50%);";
                        break;
                    case "center-bottom":
                        xstyle = "top:100%;left:50%;transform: translate(-50%, -100%);";
                        break;
                    case "top-left":
                        xstyle = "top:0%;left:0%;transform: translate(-0%, -0%);";
                        break;
                    case "top-center":
                        xstyle = "top:0%;left:50%;transform: translate(-50%, -0%);";
                        break;
                    case "left-middle":
                        xstyle = "top:50%;left:0%;transform: translate(-0%, -50%);";
                        break;
                    case "right-middle":
                        xstyle = "top:50%;left:100%;transform: translate(-100%, -50%);";
                        break;
                    case "top-right":
                        xstyle = "top:0%;left:100%;transform: translate(-100%, -0%);";
                        break;
                    case "left-bottom":
                        xstyle = `margin-top:${pHeight - bHeight}px;`;
                        xstyle += "margin-left:1px;";
                        break;
                    case "right-bottom":
                        xstyle = "top:100%;left:100%;transform: translate(-100%, -100%);";
                        break;
                    default:
                        return;
                }
                xstyle += 'z-index:5000; position: absolute; background: #000;white-space: nowrap;display:block;color:#ffff';
                if (sfirst) {
                    xstyle = "display:none";
                }
                t.attr(AdNode, 'style', xstyle);
                setTimeout(`adMoxyCtrl.invideo.a[${this.itemId}].RePosBanner();`, 500);
            },
            Resume: function () {
                this.closeAd();
                if (this.PlayerState != 'playing') {
                    if (this.autoplay) {
                        this.player.muted = true;
                    }
                    this.PlayerState = "playing";
                    switch (this.playerType) {
                        case "jwplayer":
                        case "ktplayer":
                        case "flowplayer_flash":
                        case "flowplayer":
                            this.player.play();
                            break;
                        case "flashplayer":
                            eroFlash.play();
                            break;
                        case 'html5_video':
                            this.player.play();
                            break;
                    }
                }
            },
            End: function () {
                if (this.PlayerState != "finished") {
                    this.PlayerState = "finished";
                    if (this.aOpts.usepostroll) {
                        this.openBanner("postroll");
                    }
                }
            },
            Play: function () {
                this.PlayerState = "playing";
                this.closeAd();
            },
            Pause: function () {
                this.PlayerState = "paused";
                if (this.LastBannerShowed == "midroll") {
                    this.LastBannerShowed = "";
                    this.Resume();
                    return;
                }
                if (this.aOpts.usepause) {
                    this.openBanner("pause");
                }
            },
            Timer: function (pos, dur) {
                if (this.VP != null && this.VP.vidAdRunning) {
                    if (this.isInFullScreenMode()) {
                        /* we need to cancel the preroll because we cannot display skip */
                        this.closeAd(1);
                    }
                    return;
                }
                this.fullScreenMode = this.isInFullScreenMode();
                this.FullScreen(this.fullScreenMode);
                if (!this.fullScreenMode) {
                    if (this.aOpts.usemidroll) {
                        if (isNaN(this.aOpts.midrollstart)) {
                            this.aOpts.midrollstart = 0;
                        }
                        if (this.aOpts.midrollstart == 0) {
                            this.aOpts.midrollstart = dur / 2;
                        } else {
                            if (!this.aOpts.midroll.showed && pos >= this.aOpts.midrollstart && pos < (this.aOpts.midrollstart + 5)) {
                                this.openBanner("midroll");
                            }
                        }
                    }
                }
                if ('undefined' != typeof dur) {
                    if (parseInt(pos) >= parseInt(dur)) {
                        this.End();
                    }
                }
            },
            detectJwPlayer: function () {
                if (typeof (jwplayer) != "undefined") {
                    return jwplayer();
                }
            },
            detectFlowPlayerFlash: function () {
                if (typeof $f !== "undefined") {
                    return $f;
                }
            },
            detectKtPlayer: function (nodeid) {
                if (typeof kt_player != 'undefined') {
                    if (window.player_obj != null) {
                        return window.player_obj;
                    }
                    const playerElement = document.getElementById('kt_player');
                    if (playerElement) {
                        return kt_player;
                    }
                }
            },
            isInFullScreenMode: function () {
                return false;
                /*
                try {
                    return ((document.fullscreenElement && document.fullscreenElement !== null && document.fullscreenElement === this.player) || document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen || (!window.screenTop && !window.screenY));
                } catch (_e) {
                    return false;
                }
                */
            },
            FullScreen: function (bool) {
                this.fullScreenMode = bool;
                if (bool) {
                    this.closeAd();
                }
            },
        };
    },
};adMoxyCtrl.native = {
    sTag: "itmp",
    getVersion: function () {
        return "5.5";
    },
    imghwd: [],
    IsLoaded: false,
    IsHided: false,
    elementName: "",
    removedItems: 0,
    reload: function (iItem) {
        const aItem = adMoxyCtrl.adCals[iItem];
        aItem.loaded = false;
        try {
            delete aItem.data;
            delete aItem.loaded;
            delete aItem.btype;
            delete aItem.state;
            delete aItem.settings;
        } catch (e) {
        }
        aItem.reload = 1;
        aItem.state = 0;
        adMoxyCtrl.run();
    },
    get: function (obj, fld, d) {
        return (obj[fld] != null && typeof obj[fld] === typeof d ? obj[fld] : d);
    },

    setpos: function (sn, st) {
        const t = adMoxyCtrl.Tools;
        let dh = t.height(`#${st}`);
        const wh = t.height(window) - 100;
        let dw = t.width(`#${st}`);
        const ww = t.width(window) - 100;
        let bdh,
            bdw = false;
        t.getnodes(`[id^="nt_row_${sn}_"]`).forEach(function (v, k) {
            if (dh > wh) {
                if (t.isvisible(v)) {
                    t.css(v, { display: "none" });
                    dh = t.height(`#${sn}`);
                }
            } else {
                if (!bdh) {
                    if (dh + 300 < wh) {
                        if (!t.isvisible(v)) {
                            t.css(v, { display: "flex" });
                            dh = t.height(`#${st}`);
                            if (dh > wh) {
                                t.css(v, { display: "none" });
                                bdh = true;
                            }
                        }
                    }
                }
            }

            if (t.isvisible(v)) {
                t.getnodes(`[id^="nt_col_${sn}_${k}_"]`).forEach(function (
                    v2,
                    k2
                ) {
                    if (dw > ww) {
                        if (t.isvisible(v2)) {
                            t.css(v2, { display: "none" });
                            dw = t.width(`#${st}`);
                        }
                    } else {
                        if (!bdw) {
                            if (dw + 300 < ww) {
                                if (!t.isvisible(v2)) {
                                    t.css(v2, { display: "inline-block" });
                                    dw = t.width(`#${st}`);
                                    if (dw > ww) {
                                        t.css(v2, { display: "none" });
                                        bdw = true;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
    },
    hide: function (sn) {
        adMoxyCtrl.Tools.remove([`#${sn}`, `#${sn}_bg`, `#${sn}_css`]);

        adMoxyCtrl.interStitalRunning = false;
        this.IsLoaded = false;
        this.IsHided = true;
    },
    display: function (iItem, json) {
        const ob = this;
        adMoxyCtrl.interStitalRunning = adMoxyCtrl.interStitalRunning | false;
        if (typeof adMoxyCtrl.lazyLoading == "undefined") {
            adMoxyCtrl.lazyLoading = false;
        }
        if (typeof adMoxyCtrl.sCloseButtonHtml == "undefined") {
            adMoxyCtrl.sCloseButtonHtml =
                "<img alt='Close Ad' style='background:#ffffff;border-radius: 50%;margin:2px' width='24' height='24' src='data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIwIDAgNDk2IDQ5NiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDk2IDQ5NjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPGc+DQoJCTxnPg0KCQkJPHBhdGggZD0iTTI0OCwwQzExMS4wMzMsMCwwLDExMS4wMzMsMCwyNDhzMTExLjAzMywyNDgsMjQ4LDI0OHMyNDgtMTExLjAzMywyNDgtMjQ4QzQ5NS44NDEsMTExLjA5OSwzODQuOTAxLDAuMTU5LDI0OCwweg0KCQkJCSBNMjQ4LDQ4MEMxMTkuODcsNDgwLDE2LDM3Ni4xMywxNiwyNDhTMTE5Ljg3LDE2LDI0OCwxNnMyMzIsMTAzLjg3LDIzMiwyMzJDNDc5Ljg1OSwzNzYuMDcyLDM3Ni4wNzIsNDc5Ljg1OSwyNDgsNDgweiIvPg0KCQkJPHBhdGggZD0iTTM2MS4xMzYsMTM0Ljg2NGMtMy4xMjQtMy4xMjMtOC4xODgtMy4xMjMtMTEuMzEyLDBMMjQ4LDIzNi42ODhMMTQ2LjE3NiwxMzQuODY0Yy0zLjA2OS0zLjE3OC04LjEzNC0zLjI2Ni0xMS4zMTItMC4xOTcNCgkJCQljLTMuMTc4LDMuMDY5LTMuMjY2LDguMTM0LTAuMTk3LDExLjMxMmMwLjA2NCwwLjA2NywwLjEzLDAuMTMyLDAuMTk3LDAuMTk3TDIzNi42ODgsMjQ4TDEzNC44NjQsMzQ5LjgyNA0KCQkJCWMtMy4xNzgsMy4wNy0zLjI2Niw4LjEzNC0wLjE5NiwxMS4zMTJjMy4wNywzLjE3OCw4LjEzNCwzLjI2NiwxMS4zMTIsMC4xOTZjMC4wNjctMC4wNjQsMC4xMzItMC4xMywwLjE5Ni0wLjE5NkwyNDgsMjU5LjMxMg0KCQkJCWwxMDEuODI0LDEwMS44MjRjMy4xNzgsMy4wNyw4LjI0MiwyLjk4MiwxMS4zMTItMC4xOTZjMi45OTUtMy4xLDIuOTk1LTguMDE2LDAtMTEuMTE2TDI1OS4zMTIsMjQ4bDEwMS44MjQtMTAxLjgyNA0KCQkJCUMzNjQuMjU5LDE0My4wNTIsMzY0LjI1OSwxMzcuOTg4LDM2MS4xMzYsMTM0Ljg2NHoiLz4NCgkJPC9nPg0KCTwvZz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjwvc3ZnPg0K'/>";
        }
        if (typeof json.settings.interstitial == "undefined") {
            json.settings.interstitial = false;
        } else {
            json.settings.interstitial = json.settings.interstitial || false;
        }
        const sTag = this.makeId(10);
        if (json.settings.interstitial) {
            if (adMoxyCtrl.interStitalRunning) {
                return;
            }
        }

        let isBanner = json.adtype == "banner";
        const isHtml = json.adtype == "native_html";


        var aItem = adMoxyCtrl.adCals[iItem];
        if (adMoxyCtrl.isPreview && !isHtml) {
            if (typeof aItem.nsettings == "object") {
                json.settings.cols = parseInt(aItem.nsettings.cols);
                json.settings.rows = parseInt(aItem.nsettings.rows);
                json.settings.width = parseInt(aItem.nsettings.width);
                json.settings.height = parseInt(aItem.nsettings.height);
                if (typeof aItem.nsettings.css == "object") {
                    json.settings.css = aItem.nsettings.css;
                }
            }
            let iTotal = json.items.length;
            let i = 0;
            const iTotalNeeded = json.settings.cols * json.settings.rows;
            if (iTotalNeeded > iTotal) {
                while (iTotalNeeded > iTotal) {
                    i = Math.floor(Math.random() * iTotal);
                    ob = json.items[i];
                    json.items.push(ob);
                    iTotal++;
                }
            }
        }
        const iRows = json.settings.rows;
        const iCols = json.settings.cols;

        let iWidth = 0;
        let iHeight = 0;
        if (isBanner) {
            iWidth = parseInt(adMoxyCtrl.getItem(json.settings, "width", 0));
            iHeight = parseInt(adMoxyCtrl.getItem(json.settings, "height", 0));
            if (!isHtml) { /* native ads are one level deeper */
                json = json.items[0];
            }
        }
        if (iWidth > 0 && iHeight > 0) {
            isBanner = true;
        } else if (json.settings.interstitial) {
            iWidth = iCols * 300;
            iHeight = iRows * 120;
            isBanner = true;
        }
        let iRow = 0;
        let iCol = 0;
        let sHtml = "";
        let sColdata = "";
        let tplItem,
            tblTbl,
            tpl_row = "";
        if (!isBanner) {
            tplItem = adMoxyCtrl.getItem(
                aItem,
                "tpl_item",
                `<td id="nt_col_${sTag}_{rowid}_{colid}" class="nt_flt_item" style="position:relative"><span class="title">{title}</span><br><a class="{href_itemid}" href="#">{image}<br/><span class="displayurl">{displayurl}</span></a></td>`
            );
            tblTbl = adMoxyCtrl.getItem(
                aItem,
                "tpl_body",
                `<table id="nt_table_${sTag}">{body}</table>`
            );
            tpl_row = adMoxyCtrl.getItem(
                aItem,
                "tpl_row",
                `<tr id="nt_row_${sTag}_{rowid}">{items}</tr>`
            );
        } else {

            const iw = iWidth / iCols - 2;
            const ih = iHeight / iRows - 2;
            const css = json.settings.css;
            if (
                typeof css.background_color != "string" ||
                css.background_color == ""
            ) {
                css.background_color = "#ffffff";
            }
            if (typeof css.border_color != "string" || css.border_color == "") {
                css.border_color = "#000000";
            }
            if (typeof css.title_color != "string" || css.title_color == "") {
                css.title_color = "#000000";
            }
            if (typeof css.text_color != "string" || css.text_color == "") {
                css.text_color = "#000000";
            }
            if (typeof css.url_color != "string" || css.url_color == "") {
                css.url_color = "#000000";
            }
            if (typeof css.font_family != "string" || css.font_family == "") {
                css.font_family = "Verdana";
            }
            if (typeof css.fontsize != "number" || css.fontsize <= 0) {
                css.fontsize = 12;
            }
            if (!json.settings.interstitial) {
                tblTbl = `<div style="width:${iWidth}px;height:${iHeight}px;overflow:hidden;">{body}</div>`;
            } else {
                tblTbl = '<div style="">{body}</div>';
            }
            let xs = "";
            if (!json.settings.interstitial) {
                xs = "float:left;";
            } else {
                xs = "display:inline-block;";
            }
            tplItem = `<div id="nt_col_${sTag}_{rowid}_{colid}" style="width:${iw}px;height:${ih}px;overflow:hidden;background-color:${css.background_color};border:1px solid ${css.border_color};border-radius:10px;margin:0px;padding:0px;${xs}">`;
            tplItem += `<div style="font-family:${css.font_family};cursor:pointer;padding:0px;" id="{href_itemid}">`;
            tplItem += '<div style="float:left">{image}</div>';
            if (iw >= 140) {
                tplItem += '<div style="padding-right:5px;">';
                xs = `color:${css.title_color};padding-left:5px;`;
                let xs1 = `color:${css.text_color};padding-left:5px;`,
                    xs2 = `color:${css.url_color};padding-left:5px;`;
                if (ih < 100) {
                    xs += "line-height:1.2;";
                    xs1 += "line-height:1.2;";
                    xs2 += "line-height:1.2;";
                }
                if (iw < 200) {
                    xs1 += `font-size:${css.fontsize}px;padding-top:2px;`;
                    xs2 += "";
                } else {
                    xs1 += `font-size:${css.fontsize}px;padding-top:5px;`;
                    xs2 += "display:block;";
                    tplItem += `<div style="font-size:${css.fontsize - 1}px;font-weight:bold;padding-top:5px;${xs}" >{title}</div>`;
                }
                tplItem += `<div style="${xs1}">{description}</div>`;
                tplItem += `<div style="font-size:${css.fontsize - 2}px;padding-top:5px;${xs2}margin-top:auto">{displayurl}</div>`;
                tplItem += "</div>";
            }
            tplItem += "</div></div>"; /* first and second div */
            tpl_row = `<div id="nt_row_${sTag}_{rowid}" style="display:flex">{items}</div>`;
        }
        const elmName = `nt_fl_${iItem}`;
        ob.elementName = elmName;
        const al = [];
        sColdata = "";
        const sImgId = `${sTag}_nt_${iItem}_px`;
        let sPx = `<img style="position:absolute;top:-100px" width="0" height="0" id="${sImgId}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="/>`;
        iRow = 0;
        const iTotalNeeded = iRows * iCols;
        let iCnt = 0;
        if (isHtml) {
            sHtml = json.html;
        } else {

            let AboutGlobal = false;
            let ShowAbout = false;

            const items = json.items;
            const total = items.length;
            if (total > 0) {
                if (ob.get(items[0], 'about', false) == true) {
                    AboutGlobal = true;
                    ShowAbout = true;
                    if (total > 1) {
                        if (ob.get(items[1], 'about', false) == true) {
                            AboutGlobal = false;
                        }
                    }
                }
            }
            items.forEach(function (ad, i) {
                iCnt++;
                if (iCnt > iTotalNeeded) {
                    return;
                }
                iCol++;
                if (typeof ad.imagepath == "undefined") {
                    ad.imagepath = "";
                }
                let sImg = ad.imagepath;
                if (sImg.substring(0, 2) == "//") {
                    sImg = `https:${sImg}`;
                }
                if (typeof ad.trackingevents != "undefined") {
                    ad.trackingevents.forEach(function (e, i) {
                        sPx += `<img style="position:absolute;top:-100px" width="0" height="0" src="${e.url}"/>`;
                    });
                }
                if (
                    typeof ad.imp_trackingurl != "undefined" &&
                    ad.imp_trackingurl != ""
                ) {
                    sPx += `<img style="position:absolute;top:-100px" width="0" height="0" src="${ad.imp_trackingurl}" border="0"/>`;
                }
                let s1 = tplItem;
                if (s1.indexOf('href="#"') > 0) {
                    s1 = s1.replace('href="#"', 'href="javascript:void(0);"');
                }
                const sId = `${sTag}ntv${iItem}_${i}`;
                let sxy = "";
                if (isBanner) {
                    const iw = iWidth / iCols;
                    const ih = iHeight / iRows - iRows;
                    if (ih > 50 && iw >= 150) {
                        let gw = iw,
                            gh = ih - 75,
                            sx = "";
                        if (iw > ih) {
                            if (iw > 200) {
                                gh = ih - 10;
                                gw = gh - 10;
                                il = iw - gw;
                                if (il < 180) {
                                    i = (180 - il) / 2;
                                    gh -= i;
                                    gw -= i;
                                }
                                sx += "border-radius:50%;margin:5px;";
                            }
                        } else {
                            if (gh > gw) {
                                gh = gw; /* make him square */
                            } else {
                                if (ih > 200) {
                                    gh = ih - 150;
                                }
                            }
                        }
                        const itop = (ih - gh) / 2 - 5;
                        sxy = `style="width:${gw}px;height:${gh}px;${sx}position:relative;top:${itop}"`;
                    } else {
                        sxy = `style="width:${iw}px;height:${ih}px;border-radius:60%;display:block;margin:-2px"`;
                    }
                }
                let s = "";
                let sabout = '';
                if (ShowAbout) {
                    if (AboutGlobal) {
                        ShowAbout = false;
                    }
                    sabout = `<div style="position:relative"><img id="${sId}_icn" onmouseover="adMoxyCtrl.native.showAbout('${sId}_about')" onclick="adMoxyCtrl.native.showAbout('${sId}_about') return false;" style="position:absolute;top:2px;left:2px;z-index:10000;border-radius:50%;background:#ffffff;width:15px;height:15px;cursor:pointer" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAACXBIWXMAAAsTAAALEwEAmpwYAAABhUlEQVR4nM2WsUoDQRRFj8mioD8gWEXxCyyMsbHVT7CMJD8giJ2Fxn+wtNIUYiEB61jZRLQQBC2SlEkhgooWrgy8DcO6m3kzWnjhQQj3cnfe3Jk38I9QACrAIdAErqROgQawIpxgREAd6AOxo/pATTReWADuFAZxqm6Bea3JKjAMMImlhtJq50o0Jg+OFQ+AUp5JpGzXETAhmv0xvBugmGVUV7Zmw9IsObhbaZOCMl2mLoAZYAo4dnB76ehXPDf8A3hVcsu2UUMh+ASugTPg0eOjzD6O0HSQW8BcKjgtpZG5QUZoO8jPwBewY2mqSqO2j1FSpsUJtkOMXK1Lat3SnIe0ThOGd2Ba+JPAS0gYNPG+tPhrHqkr+x7YPYu/qzTpZs2qmkNkJ25TTv2TQ2OS+QORzJM80T0wa/EX5TrK43fyLlVkaI0bE2/yMV05V0Fjwg7GwGOz4wwT845QoSTzxNeko1lJGkWZJz1luqrj9kQDE09zFg6AE+u5ZX6b/5Z/+9z6U3wDO7KJQlUPB4IAAAAASUVORK5CYII=">`;
                    sabout += `<div id="${sId}_about" style="display:none;background:#000000 !important;position:absolute;top:1px;left:18px;height:14px;width:66px;color:#ffffff !important;border:1px solid #FFFFFF;text-align: center;font-family:sans-serif;font-size:10px;line-height:15px;border-radius:5px;z-index:1000;cursor:pointer" onclick="adMoxyCtrl.native.openAbout(${iItem},${i}); return false">About this Ad</div></div>`;
                }
                s += `<img id="${sId}_im" src="${sImg}" border="0"${sxy} style="cursor:hand"/>`;
                s1 = s1.replace("{image}", sabout + s);
                s1 = s1.replace("{itemid}", i);
                s1 = s1.replace("{colid}", iCol);
                s1 = s1.replace("{rowid}", iRow);
                s1 = s1.replace("{description}", adMoxyCtrl.getItem(ad, "description", ""));
                s1 = s1.replace("{title}", adMoxyCtrl.getItem(ad, "title", ""));
                s1 = s1.replace("{displayurl}", adMoxyCtrl.getItem(ad, "displayurl", ""));
                al.push({
                    id: sId,
                    itemid: iItem,
                    i: i,
                    img: sImg,
                    rowid: iRow,
                    colid: iCol,
                });
                s1 = s1.replaceAll("{href_itemid}", sId);
                sColdata += s1;
                if (iCol == iCols) {
                    sHtml += tpl_row
                        .replace("{items}", sColdata)
                        .replace("{rowid}", iRow);
                    sColdata = "";
                    iCol = 0;
                    iRow++;
                }
            });
            sHtml = tblTbl.replace("{body}", sHtml);
        }
        let bExit,
            Bfound = false;
        const exec = function (node, sHtml, sPx, aItem, iItem, sImgId, json, al) {
            let iCnt = 0;
            const t = adMoxyCtrl.Tools;
            if (json.adtype == "native_html") {
                t.html(node, "");
                t.append(node, sHtml); /* .html function is not detecting javascript?? */
            } else {
                t.html(node, sHtml);
            }
            t.append("body", sPx);
            let ir = adMoxyCtrl.getItem(aItem, "reloadtime", 0);
            if (ir > 0) {
                if (ir < 30) {
                    ir = 30;
                }
                ir = ir * 1000;
                setTimeout(function () {
                    if (typeof aItem.onbeforeReload == "function") {
                        try {
                            aItem.onbeforeReload(function () {
                                ob.reload(iItem);
                            });
                        } catch (_e) {
                            adMoxyCtrl.debug(
                                `something went wrong with executing the onbeforeReload function for adtag:${adMoxyCtrl.getItem(aItem, "name", "unk")}`
                            );
                            adMoxyCtrl.debug(_e);
                            ob.reload(iItem);
                        }
                    } else {
                        ob.reload(iItem);
                    }
                }, ir);
            }
            t.getnode(`#${sImgId}`).addEventListener("load", function () {
                if (typeof aItem.onload == "function") {
                    try {
                        aItem.onload(function () {
                        });
                    } catch (_e) {
                        adMoxyCtrl.debug(
                            `something went wrong with executing the onload function for adtag:${adMoxyCtrl.getItem(aItem, "name", "unk")}`
                        );
                    }
                }
                if (json.adtype != "native_html") {
                    json.items.forEach(function (ad, i) {
                        adMoxyCtrl.AddImplog(ad["hash"]);
                    });
                } else {
                    adMoxyCtrl.AddImplog(json.hash);
                }
                adMoxyCtrl.bkLog("view", iItem);
            });
            if (adMoxyCtrl.abDetected) {
                const s = ob.makeId(15);
                t.attr(node, "id", s);
                aItem["display"] = s;
            }
            if (json.adtype != "native_html") {
                al.forEach(function (item, i) {
                    const a1 = t.getnode(`#${item.id}_about`);
                    if (a1 != null) {
                        a1.addEventListener("click", function () {
                            ev.stopImmediatePropagation();
                        });
                    }

                    const a2 = t.getnode(`#${item.id}_icn`);
                    if (a2 != null) {
                        a2.addEventListener("click", function () {
                            ev.stopImmediatePropagation();
                        });
                    }


                    const nodes = t.getnodes([
                        `.${item.id}`,
                        `#${item.id}`,
                        `#${item.id}_im`,
                    ]);
                    if (typeof nodes == "object") {
                        for (let ia = 0; ia < nodes.length; ia++) {
                            nodes[ia].addEventListener("click", function (ev) {
                                const aAd = json.items[i];
                                ev.stopImmediatePropagation();
                                const url = `${adMoxyCtrl.getAdDomain()}/click.go?xref=${aAd.hash}`;
                                adMoxyCtrl.open(
                                    url,
                                    function (ok) {
                                        if (ok) {
                                            adMoxyCtrl.bkLog("click", iItem);
                                        }
                                    },
                                    0
                                );
                                return false;
                            });
                        }
                    }
                    t.getnode(`#${item.id}_im`).addEventListener(
                        "load",
                        function () {
                            iCnt++;
                            ob.setpos(sTag, elmName);
                        }
                    );
                    t.getnode(`#${item.id}_im`).addEventListener(
                        "error",
                        function () {
                            adMoxyCtrl.swap(this);
                        }
                    );
                });
            }
        };
        if (json.settings.interstitial) {
            const fontSize = json.settings.css.fontsize;
            const t = adMoxyCtrl.Tools;
            t.append(
                "head",
                `<style id="${elmName}_css" type="text/css" media="all">#${elmName} { font-family: Arial, Helvetica, sans-serif; font-size:${fontSize}px; background: #ffffff; border-radius:15px;#000000;} #${elmName} a,#${elmName} a:link,#slider strong { text-decoration:none; color: black; font-size:${fontSize}px; } .nt_flt_item{width:300px;height:270px; overflow:hidden;} .nt_flt_item img{width:300px;height:232px;} .nt_flt_item::after{content:"";clear:both;display:table;} </style>`
            );
            t.append(
                "body",
                `<div id="${elmName}_bg" style="z-index:5000;top:0px;left:0px;padding:0px;margin:0px;background:#000;opacity: 0.8;filter: alpha(opacity = 80);position:fixed;display:none;width:100%;height:calc(100vh);"></div>`
            );
            t.getnode(`#${elmName}_bg`).addEventListener(
                "click",
                function (e) {
                    ob.hide(elmName);
                }
            );
            const s = `<div style="position:absolute;z-index:1000000; right:0px; float:right; top:0px;float:right;"><a id="nt_btn_close_${elmName}" title="Close Ad">${adMoxyCtrl.sCloseButtonHtml}</a></div>`;
            t.append(
                "body",
                `<div id="${elmName}" style="z-index:100000; padding: 5px; margin:0px;border:2px #000000 solid; border-spacing:1px; background-color:#ffffff; position:fixed;top:calc(50%);left:calc(50%);transform:translate(-50%, -50%); text-align: left;display:none ">${s}<br><div id="${elmName}_content" style=""></div></div>`
            );
            t.getnode(`#nt_btn_close_${elmName}`).addEventListener(
                "click",
                function (e) {
                    ob.hide(elmName);
                }
            );
            const run = function () {
                if (ob.IsHided) {
                    return;
                }
                if (!ob.IsLoaded) {
                    adMoxyCtrl.interStitalRunning = true;
                    const node = t.getnode(`#${elmName}_content`);
                    ob.IsLoaded = true;
                    exec(node, sHtml, sPx, aItem, iItem, sImgId, json, al);
                    t.show(`#${elmName}`);
                    t.show(`#${elmName}_bg`);
                    setTimeout(function () {
                        ob.setpos(sTag, elmName);
                    }, 1500);
                    const fn = function () {
                        if (ob.IsHided) {
                            return;
                        }
                        ob.setpos(sTag, elmName);
                        window.removeEventListener("resize", fn);
                    };
                    window.addEventListener("resize", fn);
                }
            };
            if (adMoxyCtrl.isPreview) {
                ob.IsLoaded = false;
                run();
            } else {
                t.on("click", "a", function (e) {
                    if (ob.IsHided) {
                        return;
                    }
                    try {
                        const phref = e.target.getAttribute("href");
                        if (
                            phref != null &&
                            phref !== "#" &&
                            phref !== "javascript:void(0)"
                        ) {
                            run();
                        }
                    } catch (_e) {
                    }
                });
            }
        } else {
            const t = adMoxyCtrl.Tools;
            t.getnodes(`#${aItem["display"]}`).forEach(function (node, i) {
                if (
                    node.getAttribute("run") != "1" ||
                    adMoxyCtrl.getItem(aItem, "reload", 0) == 1
                ) {
                    delete aItem.reload;
                    if (adMoxyCtrl.abDetected) {
                        /* we can remove this stype property which will be here yes */
                        t.getnode(`#${aItem["display"]}`).removeAttribute(
                            "style"
                        );
                    }
                    if (!t.isvisible(`#${aItem["display"]}`)) {
                        if (!adMoxyCtrl.abDetected) {
                            if (adMoxyCtrl.getItem(aItem, "isflt", 0) != 1 && !adMoxyCtrl.isPreview) {
                                adMoxyCtrl.debug(
                                    `AdTag ${aItem["display"]} is not visible, abort loading`
                                );
                                bExit = true;
                                return true;
                            }
                        } else {
                            adMoxyCtrl.debug(
                                `AdTag ${aItem["display"]} is not visible, probably because the active adblocker`
                            );
                        }
                    }
                    t.attr(node, "run", "1");
                    if (
                        adMoxyCtrl.lazyLoading &&
                        !adMoxyCtrl.isInFold(node) &&
                        typeof Waypoint == "function"
                    ) {
                        const waypoint = new Waypoint({
                            element: node,
                            handler: function (direction) {
                                exec(node, sHtml, sPx, aItem, iItem, sImgId, json, al);
                                this.destroy();
                            },
                            offset: "bottom-in-view",
                        });
                    } else {
                        exec(node, sHtml, sPx, aItem, iItem, sImgId, json, al);
                    }
                    Bfound = true;
                    return false;
                }
            });
            if (bExit) {
                return;
            }
            if (!Bfound) {
                adMoxyCtrl.debug(`Could not find element with id:${aItem["display"]}`);
            }
        }
    },
    displayFloat: function (iItem, json) {
        adMoxyCtrl.Tools.append("body", json.html);
    },
    makeId: function (iMax) {
        let t = "";
        const s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        for (let i = 0; i < iMax; i++) {
            t += s.charAt(Math.floor(Math.random() * s.length));
        }
        return t;
    },

    openAbout: function (iItem, iSubItem) {
        const aItem = adMoxyCtrl.adCals[iItem];
        const ad = aItem["data"].items[iSubItem];
        if (
            typeof adMoxyCtrl.ctrlSettings.ctrl_domain != "undefined" &&
            adMoxyCtrl.ctrlSettings.ctrl_domain != ""
        ) {
            let uri = `https://${adMoxyCtrl.ctrlSettings.ctrl_domain}/about.go`;
            if (ad.hash != "") {
                uri += `?xref=${ad.hash}`;
            }
            adMoxyCtrl.open(uri);
        }
    },
    showAbout: function (sTag) {
        adMoxyCtrl.Tools.show(`#${sTag}`);
        setTimeout(function () {
            adMoxyCtrl.Tools.hide(`#${sTag}`);
        }, 5000);
    },
};
adMoxyCtrl.tabs = {
    sTag: "",
    getVersion: function () {
        return "1.1";
    },
    display: function (iItem, ad) {
        let Bf = false;
        const aItem = adMoxyCtrl.adCals[iItem];
        const ob = this;
        const display = aItem['display'];
        const t = adMoxyCtrl.Tools;
        t.getnodes(`#${display}`).forEach(function (node, i) {
            if (node.getAttribute('run') != '1') {
                if (ob.sTag == '') {
                    const r = Math.floor((Math.random() * 20) + 1);
                    ob.sTag = adMoxyCtrl.makeId(r);
                }
                t.attr(node, 'run', '1');
                let sHtml = `<a id="${ob.sTag}u${iItem}" href="#" rel="nofollow">${ad.title}</a>`;
                sHtml += `<img width="0" height="0" id="${ob.sTag}${iItem}_px" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="/>`;
                t.html(node, sHtml);
                t.getnode(`#${ob.sTag}u${iItem}`).addEventListener('click', function (event) {
                    event.stopImmediatePropagation();
                    const url = adMoxyCtrl.getItem(ad, 'destinationurl', '');
                    adMoxyCtrl.open(url, function (ok) {
                        if (ok) {
                            const uri = `act=logclick&xref=${ad['hash']}`;
                            adMoxyCtrl.request('logclick', uri, 0, { result: function (rdata) { } });
                            adMoxyCtrl.bkLog('click', iItem);
                        }
                    });
                    return false;
                });
                t.getnode(`#${ob.sTag}${iItem}_px`).addEventListener('load', function () {
                    adMoxyCtrl.AddImplog(ad['hash']);
                    adMoxyCtrl.bkLog('view', iItem);
                });
                Bf = true;
                return false;
            }
        });
        if (!Bf) {
            adMoxyCtrl.debug(`cannot find tab node with id ${display}`);
        }
    }
};adMoxyCtrl.dyn_banner = {
    getVersion: function() {
        return "1.0";
    },
    display: function(iItem, json) {
        adMoxyCtrl.loadPlugin(-1, "banner", function() {
            json.settings.isdynamic = 1;
            adMoxyCtrl.banner.display(iItem, json);
        });
    }
};adMoxyCtrl.fxim_banner = {
    ctrlName: 'fxim_banner',
    itemId: 0,
    aSet: null,
    sTag: "fx_imbanner",
    sHtml: "",
    bLoaded: false,
    bOpen: false,
    getVersion: function () {
        return "1.4";
    },
    init: function (iItem, aJson) {
        const o = this;
        const aSett = aJson['settings'];
        this.aSet = aSett;
        const aItem = adMoxyCtrl.adCals[iItem];
        let xposcss = `width:${aSett['width']};right:10px;`;
        let xposshcss = 'float:right;';
        if (typeof (aSett['position']) != 'undefined') {
            if (aSett['position'] == 'bottom_left') {
                xposcss = 'left:10px;';
                xposshcss = 'float:left;';
            } else if (aSett['position'] == 'bottom_center') {
                xposcss = `left:50%;margin-left:-${aSett['width'] / 2}px;`;
            }
        }
        let cpos = "fixed";
        try {
            cpos = (document.compatMode == 'CSS1Compat') ? "fixed" : "absolute";
            const browser = navigator.appName;
            const version = parseFloat(navigator.appVersion.split("MSIE")[1]);
            if (browser == "Microsoft Internet Explorer" && version <= 6) {
                cpos = "absolute";
            }
        } catch (_e) { }
        t.append('head', `<style type="text/css" id="css_${o.sTag}"> #${o.sTag} { font-family: Arial, Helvetica, sans-serif; font-size:12px; ${xposcss} background: #000000; border-top-right-radius: 5px; border-top-left-radius: 5px; z-index:2000; padding: 0px; margin:0px; border:1px #000000 solid; border-spacing:1px; background-color:#000000; position: ${cpos}; ${xposcss}${xposshcss} bottom: 0px; text-align: left;display:block;} #${o.sTag} a,#${o.sTag} a:link,#slider strong { text-decoration:none; color: black; font-size:12px; } #${o.sTag}_hdr {color:#ffffff; height:50px;width:${aSett['width']}px;font-size:15px;margin-bottom:5px;cursor:pointer}</style>`);
        let sAdTitle = adMoxyCtrl.getItem(aItem, 'default_title', '');
        sAdTitle = adMoxyCtrl.getItem(aJson, 'title', sAdTitle);
        const isNt = adMoxyCtrl.getItem(aJson, 'adtype', '') == 'native';
        if (isNt || sAdTitle == '') {
            sAdTitle = 'Click To Open';
        }
        let sIcon = adMoxyCtrl.getItem(aItem, 'default_icon', '');
        sIcon = adMoxyCtrl.getItem(aJson, 'iconpath', sIcon);
        let sIconHtml = '';
        if (sIcon != '') {
            sIconHtml = `<img src="${sIcon}" border="0" width="45" height="45" style="float:left;padding-top:5px;padding-left:5px;background-color:#000000;"/>`;
        }
        let sCloseHtml = '';
        if (adMoxyCtrl.isPreview) {
            sCloseHtml = `<a title="Close Preview" onclick="adMoxyCtrl.fxim_banner.hide()" style="margin-left:-10px;z-index:3000">${adMoxyCtrl.sCloseButtonHtml}</a>`;
        }
        t.append('body', `<div id="${o.sTag}"><div id="${o.sTag}_hdr" onclick="adMoxyCtrl.fxim_banner.switch();">${sCloseHtml}${sIconHtml}<div style="float:left;margin-left:10px;margin-top:15px;max-width:${aSett['width'] - 40}px;overflow:hidden">${sAdTitle}</div><div style="float:right;margin-right:10px;margin-top:15px"><svg id="${o.sTag}_switch" width="20" height="20" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="m320,100l-320,320l128,128l192,-192l192,192l128,-128l-320,-320z"></path></svg></div></div><div id="${o.sTag}_content" style="display:none"></div></div>`);
    },
    switch: function (c) {
        const o = this;
        const t = adMoxyCtrl.Tools;
        if (!o.bOpen) {
            o.bOpen = true;
            t.html(`#${o.sTag}_switch`, '<path fill="#fff" d="m512,100l-192,192l-192,-192l-128,128l320,320l320,-320l-128,-128z"></path>');
            if (!o.bloaded) {
                o.bloaded = true;
            }
            t.show(`#${o.sTag}_content`);
        } else {
            t.html(`#${o.sTag}_switch`, '<path fill="#fff" d="m320,100l-320,320l128,128l192,-192l192,192l128,-128l-320,-320z"></path>');
            o.bOpen = false;
            t.hide(`#${o.sTag}_content`);
        }
    },
    hide: function () {
        adMoxyCtrl.Tools.remove([`#${this.sTag}`, `#css_${this.sTag}`]);
    },
    display: function (iItem, json) {
        const o = this;
        if (o.itemId == 0) {
            o.itemId = iItem;
            this.iItemId = iItem;
        } else {
            if (o.itemId != iItem) {
                adMoxyCtrl.debug("Im plugin got called more than one time, will be ignored");
                return;
            }
        }
        const isNt = adMoxyCtrl.getItem(json, 'adtype', '') == 'native';
        if (typeof (json['settings']['position']) != 'undefined') {
            if (json['settings']['position'] == 'bottom_center') {
                adMoxyCtrl.Tools.css(`#${o.sTag}`, { "marginLeft": `-${json.settings.width / 2}px` });
            }
        }
        o.init(iItem, json);
        if (isNt) {
            adMoxyCtrl.loadPlugin(-1, "native", function () {
                const sId = o.sTag + 'ct';
                adMoxyCtrl.adCals[iItem]["display"] = sId;
                adMoxyCtrl.adCals[iItem]["isflt"] = 1;
                const t = adMoxyCtrl.Tools;
                t.html(`#${o.sTag}_content`, `<div style="clear:both;font-size:11px; color:black;" id="${sId}"></div>`);
                json.adtype = 'banner';
                adMoxyCtrl.native.display(iItem, json);
                t.show(`#${o.sTag}`);
            });
            return;
        } else {
            adMoxyCtrl.loadPlugin(-1, 'banner', function () {
                adMoxyCtrl.banner.genHtml(iItem, json, function (shtml) {
                    adMoxyCtrl.Tools.html(`#${o.sTag}_content`, `<div style="clear:both;font-size:11px; color:black;">${shtml}</div>`);

                    adMoxyCtrl.banner.addHandler(o.itemId);
                });
            });
        }
    },
};adMoxyCtrl.native_webpush = {
    getVersion: () => {
        return "1.7";
    },
    aFlt: [],
    display: function (iItem, json) {
        const ob = this;
        adMoxyCtrl.interStitalRunning = adMoxyCtrl.interStitalRunning | false;
        adMoxyCtrl.interStitalWasRunning = adMoxyCtrl.interStitalWasRunning | false;
        ob.aFlt[iItem] = new ob.float(iItem, json);
        ob.aFlt[iItem].init();

        function rn() {
            ob.aFlt[iItem].run();
        }

        function chk() {
            if (adMoxyCtrl.interStitalRunning) {
                setTimeout(chk(), 500);
            } else {
                rn();
            }
        }

        chk();
    },


    openAbout: function (iItem, iSubItem) {
        const aItem = adMoxyCtrl.adCals[iItem];
        const ad = aItem['data'].items[iSubItem];
        if (typeof adMoxyCtrl.ctrlSettings.ctrl_domain != 'undefined' && adMoxyCtrl.ctrlSettings.ctrl_domain != "") {
            let uri = `https://${adMoxyCtrl.ctrlSettings.ctrl_domain}/about.go`;
            if (ad.hash != "") {
                uri += `?xref=${ad.hash}`;
            }
            adMoxyCtrl.open(uri);
        }
    },
    showAbout: function (sId) {
        const t = adMoxyCtrl.Tools;
        t.show(`#${sId}`);
        setTimeout(function () {
            t.hide(`#${sId}`);
        }, 5000);
    },
    float: function (iItem, json) {
        return {
            sTag: "",
            settings: {},
            iItem: iItem,
            json: json,
            init: function () {
                const ob = this;
                ob.settings = json.settings;
                ob.sTag = `wp_${iItem}_${ob.makeId(10)}`;
                let sCloseHtml = '';
                let sXStyleAttr = '';
                if (adMoxyCtrl.isPreview) {
                    sCloseHtml = `<div style="position:fixed;top:0px;right:10px;z-index:2000;"><a title="Close Preview" onclick="adMoxyCtrl.native_webpush.aFlt[${iItem}].clear()">${adMoxyCtrl.sCloseButtonHtml}</a></div>`;
                    sXStyleAttr = ` id="css_${iItem}"`;
                    setTimeout(function () {
                        ob.clear();
                    }, (30 * 1000));
                }
                ob.clear();
                const t = adMoxyCtrl.Tools;
                t.append('body', `<div id="${ob.sTag}" style="position:fixed;overflow:hidden;padding:10px;width:360px;min-width:360px;max-width:380px;transform:translate3d(0,0,0);z-index:1000;height:auto;">${sCloseHtml}</div>`);
                const css = json.settings.css;
                let sCss = `.${ob.sTag}_itm{position:relative;display:-webkit-box; display: -moz-box; display: -webkit-flex; display: -ms-flexbox; display: flex;-webkit-box-align:end;-moz-box-align:end;-ms-flex-align:end;-webkit-align-items:flex-end;align-items:flex-end;width:100%;cursor:pointer;border-radius:10px;-webkit-backdrop-filter:blur(20px);padding:10px;height:70px;box-sizing:border-box;}`;
                sCss += `.${ob.sTag}_itm{margin-top:5px;border:2px solid ${css['border_color']};border-radius:15px;padding:5px;background-color:${css['background_color']}}`;
                t.append('head', `<style${sXStyleAttr}>${sCss}</style>`);
            },
            clear: function () {
                const t = adMoxyCtrl.Tools;
                t.remove(`#${this.sTag}`);
                t.remove(`#css_${iItem}`);
            },
            run: function () {
                const ob = this;
                const sImgId = `${ob.sTag}_nt_${iItem}_px`;
                let sPx = `<img width="0" height="0" id="${sImgId}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="/>`;
                const css = ob.settings.css;
                json.items.forEach(function (ad, i) {
                    let ShowAboutInfo = (typeof ad.about == 'boolean' ? ad.about : false);
                    if (adMoxyCtrl.Gup("about") == 1) {
                        ShowAboutInfo = true;
                    }

                    if (typeof ad.imp_trackingurl != 'undefined' && ad.imp_trackingurl != '') {
                        sPx += `<img width="0" height="0" src="${ad.imp_trackingurl}" border="0"/>`;
                    }
                    if (typeof ad.trackingevents != 'undefined') {
                        ad.trackingevents.forEach(function (e, i) {
                            sPx += `<img width="0" height="0" src="${e.url}"/>`;
                        });
                    }
                    let s = `<div class="${ob.sTag}_itm" id="${ob.sTag}_itm_${i}">`;
                    if (ShowAboutInfo) {
                        s += `<img id="${ob.sTag}_about_icn_${i}" onmouseover="adMoxyCtrl.native_webpush.showAbout('${ob.sTag}_about_${i}')" onclick="adMoxyCtrl.native_webpush.showAbout('${ob.sTag}_about_${i}');return false" style="position:absolute;top:2px;left:2px;z-index:10000;border-radius:50%;background:#ffffff;width:15px;height:15px;cursor:pointer" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAACXBIWXMAAAsTAAALEwEAmpwYAAABhUlEQVR4nM2WsUoDQRRFj8mioD8gWEXxCyyMsbHVT7CMJD8giJ2Fxn+wtNIUYiEB61jZRLQQBC2SlEkhgooWrgy8DcO6m3kzWnjhQQj3cnfe3Jk38I9QACrAIdAErqROgQawIpxgREAd6AOxo/pATTReWADuFAZxqm6Bea3JKjAMMImlhtJq50o0Jg+OFQ+AUp5JpGzXETAhmv0xvBugmGVUV7Zmw9IsObhbaZOCMl2mLoAZYAo4dnB76ehXPDf8A3hVcsu2UUMh+ASugTPg0eOjzD6O0HSQW8BcKjgtpZG5QUZoO8jPwBewY2mqSqO2j1FSpsUJtkOMXK1Lat3SnIe0ThOGd2Ba+JPAS0gYNPG+tPhrHqkr+x7YPYu/qzTpZs2qmkNkJ25TTv2TQ2OS+QORzJM80T0wa/EX5TrK43fyLlVkaI0bE2/yMV05V0Fjwg7GwGOz4wwT845QoSTzxNeko1lJGkWZJz1luqrj9kQDE09zFg6AE+u5ZX6b/5Z/+9z6U3wDO7KJQlUPB4IAAAAASUVORK5CYII=">`;
                        s += `<div id="${ob.sTag}_about_${i}" style="display:none;background:#000000 !important;position:absolute;top:1px;left:18px;height:14px;width:66px;color:#ffffff !important;border:1px solid #FFFFFF;text-align: center;font-family:sans-serif;font-size:10px;line-height:15px;border-radius:5px;z-index:1000;cursor:pointer" onclick="adMoxyCtrl.native_webpush.openAbout(${iItem},${i});return false">About this Ad</div>`;
                    }
                    s += `<div><img style="width:50px;height:50px;border-radius: 50%;display:block;" src="${ad.imagepath}" onerror="adMoxyCtrl.swap(this)"></div><div style="max-width:300px;display:-webkit-box; display: -moz-box; display: -webkit-flex; display: -ms-flexbox; display: flex;-webkit-flex:1 1 auto;-ms-flex:1 1 auto;flex:1 1 auto;-webkit-box-align:end;-moz-box-align:end;-ms-flex-align:end;-webkit-align-items:flex-end;align-items:flex-end;height:100%;margin-left:10px;"><div style="max-width:300px;height:50px;display:-webkit-box; display: -moz-box; display: -webkit-flex; display: -ms-flexbox; display: flex;-webkit-box-pack:center;-moz-box-pack:center;-ms-flex-pack:center;-webkit-justify-content:center;justify-content:center;-webkit-box-direction:normal;-webkit-box-orient:vertical;-moz-box-direction:normal;-moz-box-orient:vertical;-webkit-flex-direction:column;-ms-flex-direction:column;flex-direction:column;-webkit-flex:1 1 auto;-ms-flex:1 1 auto;flex:1 1 auto;font-family:${css.font_family};color:${css.text_color};"><div style="overflow:hidden;font-size:13px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap;font-weight:bold;color:${css.title_color}">${ad.title}</div>`;
                    const sd = adMoxyCtrl.getItem(ad, 'description', '');
                    if (sd != '') {
                        s += `<div style="max-width:300px;overflow:hidden;font-size:12px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap;text-transform:none;color:${css.text_color}">${sd}</div>`;
                    }
                    s += `<div style="max-width:300px;overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap;color:${css.url_color}">${ad.displayurl}</div></div></div><div style="display:-webkit-box; display: -moz-box; display: -webkit-flex; display: -ms-flexbox; display: flex;-webkit-flex:0 0 auto;-ms-flex:0 0 auto;flex:0 0 auto;-webkit-box-pack:center;-moz-box-pack:center;-ms-flex-pack:center;-webkit-justify-content:center;justify-content:center;-webkit-box-align:center;-moz-box-align:center;-ms-flex-align:center;-webkit-align-items:center;align-items:center;width:10px;height:50px;position:relative;font-weight:bold;z-index:10;"><div id="${ob.sTag}_itm_${i}_close" style="display:none;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"/></svg></div></div></div>`;
                    ob.display(s, i, ad, iItem);
                });
                this.setpos();
                const t = adMoxyCtrl.Tools;
                t.append('body', sPx);
                t.getnode(`#${sImgId}`).addEventListener('load', function () {
                    const aItem = adMoxyCtrl.adCals[iItem];
                    if (typeof aItem.onload == "function") {
                        try {
                            aItem.onload(function () {
                            });
                        } catch (_e) {
                            adMoxyCtrl.debug(`something went wrong with executing the onload function for adtag:${adMoxyCtrl.getItem(aItem, 'name', 'unk')}`);
                        }
                    }
                    json.items.forEach(function (ad, i) {
                        adMoxyCtrl.AddImplog(ad.hash);
                    });
                });
            },
            setpos: function () {
                const ob = this;
                const t = adMoxyCtrl.Tools;
                const dh = t.height(`#${ob.sTag}`);
                const wh = t.height(window);
                switch (this.settings.position) {
                    case "top_left": {
                        const i = this.settings.topmargin;
                        t.css(`#${this.sTag}`, { "top": `${i}px`, "left": "0px" });
                        break;
                    }
                    case "top_right": {
                        const i = this.settings.topmargin;
                        t.css(`#${this.sTag}`, { "top": `${i}px`, "right": "0px" });
                        break;
                    }
                    case "bottom_right":
                        t.css(`#${this.sTag}`, { "bottom": "0px", "right": "0px" });
                        break;
                    case "bottom_left":
                        t.css(`#${this.sTag}`, { "bottom": "0px", "left": "0px" });
                        break;
                    case "center":
                        t.css(`#${this.sTag}`, {
                            top: '50%',
                            left: '50%',
                            margin: `-${t.height(`#${this.sTag}`) / 2}px 0 0 -${t.width(`#${this.sTag}`) / 2}px`
                        });
                        break;
                }
            },
            display: function (s, i, ad, iItem) {
                const ob = this;
                const t = adMoxyCtrl.Tools;
                t.append(`#${ob.sTag}`, s);
                t.fadeIn(`#${ob.sTag}_itm_${i}`, 1500, function () {
                });
                t.hover(`#${ob.sTag}_itm_${i}`, function () {
                    t.show(`#${ob.sTag}_itm_${i}_close`);
                }, function () {
                    t.hide(`#${ob.sTag}_itm_${i}_close`);
                });
                const a1 = t.getnode(`#${ob.sTag}_about_${i}`);
                if (a1 != null) {
                    a1.addEventListener('click', function (ev) {
                        ev.stopImmediatePropagation();
                    });
                }
                const a2 = t.getnode(`#${ob.sTag}_about_icn_${i}`);
                if (a2 != null) {
                    a2.addEventListener('click', function (ev) {
                        ev.stopImmediatePropagation();
                    });
                }
                t.getnode(`#${ob.sTag}_itm_${i}_close`).addEventListener('click', function (ev) {
                    ev.stopImmediatePropagation();
                    t.hide(`#${ob.sTag}_itm_${i}`);
                });
                t.getnode(`#${ob.sTag}_itm_${i}`).addEventListener('click', function (ev) {
                    ev.stopImmediatePropagation();
                    const url = `${adMoxyCtrl.getAdDomain()}/click.go?xref=${ad.hash}`;
                    adMoxyCtrl.open(url);
                    adMoxyCtrl.bkLog('click', iItem);
                });
                if (ob.settings.position == 'center') {
                    ob.setpos();
                }
            },
            makeId: function (im) {
                let t = "";
                const s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
                for (let i = 0; i < im; i++) {
                    t += s.charAt(Math.floor(Math.random() * s.length));
                }
                return t;
            },
            open: function (u) {
                const w = window.open(u);
                setTimeout(() => {
                    if (!w || w.closed) {
                        top.location = u;
                    }
                }, 500);
            },
        };
    },
};adMoxyCtrl.inpage_video = {
    aProcs: [],
    getVersion: function () {

        return "1.2";

    },
    display: function (iItem, json) {
        const ob = this;
        ob.aProcs[iItem] = new ob.proc();
        if (ob.aProcs[iItem].init(iItem, json['settings'])) {
            ob.aProcs[iItem].dc(iItem, json);
        }
    },
    proc: function () {
        return {
            popsid: 0,
            isInitialized: false,
            IsLoaded: false,
            itemId: 0,
            aSet: null,
            sTag: "",
            dTagId: "",
            skipBtn: false,
            skipPosition: "top_right",
            skipAfterSec: 5,
            autoHide: false,
            showCountdown: true,
            controls: true,
            impLogged: false,
            muted: true,
            autoPlay: false,
            loop: false,
            UseAdLabel: false,
            HoverMode: false,
            hide: function () {
                const t = adMoxyCtrl.Tools;
                t.html(`#${this.sTag}_player`, '');
                t.remove(`#${this.dTagId}`);
            },
            dc: function (iItem, json) {
                const o = this;
                const u = 'undefined';
                if (o.itemId == 0) {
                    o.itemId = iItem;
                } else {
                    if (o.itemId != iItem) {
                        adMoxyCtrl.debug("Videoslider plugin got called more than one time, will be ignored");
                        return;
                    }
                }
                /* } */
                adMoxyCtrl.loadPlugin(-1, 'video', function () {
                    const u = 'undefined';
                    const ad = json;
                    const pl = adMoxyCtrl.video.videoCtrl();
                    pl.isSlider = true;
                    pl.itemId = iItem;
                    pl.iActionId = 0;
                    pl.playerid = o.sTag + '_content';
                    const aItem = adMoxyCtrl.adCals[iItem];
                    const t = adMoxyCtrl.Tools;
                    pl.playerNode = t.getnode(`#${aItem.display}`);
                    if (pl.playerNode === null) {
                        adMoxyCtrl.debug("adtag inpage video not found");
                        return;
                    }
                    o.dTagId = aItem.display;
                    if (ad.type == "html") {
                        var run = function () {
                            t.append(`#${aItem.display}`, ad.html);
                            t.show(`#${aItem.display}`);
                            aItem.data = json;
                            aItem.plugin = 'inpage_video';
                            adMoxyCtrl.logImp(pl.itemId, 'inpage_video', '', aItem);
                            if (typeof json.imp_trackingurl != 'undefined' && json.imp_trackingurl != '') {
                                t.append("body", `<img width="0" height="0" src="${json.imp_trackingurl}" border="0"/>`);
                            }
                        };
                    } else {
                        var run = function () {
                            let isp = false;
                            pl.LoadActions(json, function (aActions) {
                                let file = "";
                                let hls_file = '';

                                if (typeof aActions != u && typeof aActions.mediafile != u && aActions.mediafile != '') {
                                    file = aActions.mediafile;
                                } else {
                                    if (typeof ad != u && typeof ad.video_url != u && ad.video_url != "") {
                                        file = ad.video_url;
                                    }
                                    hls_file = adMoxyCtrl.getItem(ad, 'video_hls_url', '');
                                }

                                if (file == '') {
                                    aItem.data = json;
                                    aItem.plugin = 'inpage_video';
                                    adMoxyCtrl.logImp(pl.itemId, 'inpage_video', '', aItem);
                                    pl.sendNotifications(aActions.impression, 'impression');
                                    o.hide();
                                    return;
                                }

                                let node = pl.playerNode;
                                if (o.UseAdLabel) {
                                    t.html(pl.playerNode, `<div id="wrapper_${pl.playerid}"></div>`);
                                    node = document.getElementById(`wrapper_${pl.playerid}`);
                                    t.prepend(node, `<div class="lbl_advertise_inpage" style="z-index:1000;background: #000000;color: #ffffff;padding:2px; max-width:200px">${aItem.advertise}</div>`);
                                }
                                t.append('body', `<div id="notifications_${pl.playerid}" style="display:none"></div>`);
                                t.css(pl.playerNode, {
                                    'position': 'relative',
                                    'display': 'none',
                                    'width': '100%',
                                    'overflow': 'hidden',
                                    'justify-content': 'center',
                                    'align-items': 'center',
                                    'background': 'black'
                                });
                                const poster = adMoxyCtrl.getItem(ad, 'screenshot', '');
                                t.append(node, `<video id="${o.sTag}_player" style="width:100%;height:100%;object-fit:contain;cursor:pointer"${o.muted ? ' muted="muted"' : ''} preload="${o.HoverMode ? 'metadata' : 'auto'}" src=""${poster ? ` poster="${poster}"` : ''}${o.autoPlay ? ' autoplay' : ''}${o.loop ? ' loop' : ''} webkit-playsinline playsinline${o.controls ? ' controls' : ''}></video>`);
                                pl.player = t.getnode(`#${o.sTag}_player`);
                                adMoxyCtrl.video.LoadVideo(`${o.sTag}_player`, file, hls_file);
                                if (o.HoverMode) {

                                    pl.player.pause();
                                    pl.player.addEventListener('loadeddata', function () {
                                        if (o.HoverMode && pl.player.autoplay) {
                                            pl.player.pause();
                                        }
                                    }, { once: true });
                                }
                                t.show(`#${aItem.display}`);
                                if (o.skipBtn) {

                                    let pos = 'right:0px;top:0px;';

                                    if (o.skipPosition == 'bottom_right') {
                                        pos = 'right:0px;bottom:0px;';
                                    }
                                    let sCloseButtonHtml = "<img alt='Close Ad' class='closeBtn' style='background:#ffffff;border-radius: 50%;z-index:100000' width='24' height='24' src='data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIwIDAgNDk2IDQ5NiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDk2IDQ5NjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPGc+DQoJCTxnPg0KCQkJPHBhdGggZD0iTTI0OCwwQzExMS4wMzMsMCwwLDExMS4wMzMsMCwyNDhzMTExLjAzMywyNDgsMjQ4LDI0OHMyNDgtMTExLjAzMywyNDgtMjQ4QzQ5NS44NDEsMTExLjA5OSwzODQuOTAxLDAuMTU5LDI0OCwweg0KCQkJCSBNMjQ4LDQ4MEMxMTkuODcsNDgwLDE2LDM3Ni4xMywxNiwyNDhTMTE5Ljg3LDE2LDI0OCwxNnMyMzIsMTAzLjg3LDIzMiwyMzJDNDc5Ljg1OSwzNzYuMDcyLDM3Ni4wNzIsNDc5Ljg1OSwyNDgsNDgweiIvPg0KCQkJPHBhdGggZD0iTTM2MS4xMzYsMTM0Ljg2NGMtMy4xMjQtMy4xMjMtOC4xODgtMy4xMjMtMTEuMzEyLDBMMjQ4LDIzNi42ODhMMTQ2LjE3NiwxMzQuODY0Yy0zLjA2OS0zLjE3OC04LjEzNC0zLjI2Ni0xMS4zMTItMC4xOTcNCgkJCQljLTMuMTc4LDMuMDY5LTMuMjY2LDguMTM0LTAuMTk3LDExLjMxMmMwLjA2NCwwLjA2NywwLjEzLDAuMTMyLDAuMTk3LDAuMTk3TDIzNi42ODgsMjQ4TDEzNC44NjQsMzQ5LjgyNA0KCQkJCWMtMy4xNzgsMy4wNy0zLjI2Niw4LjEzNC0wLjE5NiwxMS4zMTJjMy4wNywzLjE3OCw4LjEzNCwzLjI2NiwxMS4zMTIsMC4xOTZjMC4wNjctMC4wNjQsMC4xMzItMC4xMywwLjE5Ni0wLjE5NkwyNDgsMjU5LjMxMg0KCQkJCWwxMDEuODI0LDEwMS44MjRjMy4xNzgsMy4wNyw4LjI0MiwyLjk4MiwxMS4zMTItMC4xOTZjMi45OTUtMy4xLDIuOTk1LTguMDE2LDAtMTEuMTE2TDI1OS4zMTIsMjQ4bDEwMS44MjQtMTAxLjgyNA0KCQkJCUMzNjQuMjU5LDE0My4wNTIsMzY0LjI1OSwxMzcuOTg4LDM2MS4xMzYsMTM0Ljg2NHoiLz4NCgkJPC9nPg0KCTwvZz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjwvc3ZnPg0K'/>";

                                    t.prepend(pl.playerNode, `<div id="btn_close_inpage_${iItem}" style="position:absolute;z-index:1000;${pos}display:none;width:24px;height:24px" class="instream_close">${sCloseButtonHtml}</div>`);
                                    t.getnode(`#btn_close_inpage_${iItem}`).addEventListener('click', function (e) {
                                        o.hide();
                                    });
                                    if (o.showCountdown && !o.HoverMode) {
                                        t.prepend(pl.playerNode, `<div id="btn_countdown_${iItem}" style="position:absolute;z-index:1000;${pos}display:flex;width:22px;height:22px;font-size:14px;background:#ffffff;color:#000000;border-radius:50%;align-items: center;justify-content: center;border:1px solid black" class="instream_countdown">${o.skipAfterSec.toString()}</div>`);
                                    }
                                }
                                const ch = function () {
                                    t.getnode(`#${o.sTag}_player`).addEventListener('click', function (e) {
                                        if (isp) {
                                            e.stopImmediatePropagation();
                                            let url = adMoxyCtrl.getItem(ad, 'destinationurl', '');
                                            if (aActions['clickthrough_url'] != '') {
                                                url = aActions['clickthrough_url'];
                                            }
                                            if (url != '') {
                                                const uri = `act=logclick&xref=${ad['hash']}`;
                                                adMoxyCtrl.request('logclick', uri, 0, { result: function (rdata) { } });
                                            } else {
                                                url = `${adMoxyCtrl.ctrlSettings.ctrl_domain}/click.go?xref=${ad['hash']}`;
                                            }
                                            if (aActions['clickthrough_tracking'].length > 0) {
                                                pl.sendNotifications(aActions['clickthrough_tracking'], 'clicktrack');
                                            }
                                            pl.open(url);
                                            const aItem2 = adMoxyCtrl.adCals[iItem];
                                            aItem2.data = ad;
                                            aItem2.plugin = 'inpage_video';
                                            adMoxyCtrl.bkLog('click', iItem, { isiframe: 0 }, aItem2);
                                            return false;
                                        } else {
                                            pl.player.play();
                                            return false;
                                        }
                                    });
                                };
                                if (o.HoverMode) {
                                    const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
                                    if (hasMouse) {
                                        pl.playerNode.addEventListener('mouseenter', function () {
                                            pl.player.play();
                                        });
                                        pl.playerNode.addEventListener('mouseleave', function () {
                                            pl.player.pause();
                                        });
                                    } else {
                                        pl.playerNode.addEventListener('click', function () {
                                            if (pl.player.paused) {
                                                pl.player.play();
                                            } else {
                                                pl.player.pause();
                                            }
                                        });
                                    }
                                }
                                pl.player.addEventListener("play", function (e) {
                                    isp = true;
                                    setTimeout(function () {
                                        ch();
                                    }, 500);
                                });
                                pl.player.addEventListener('timeupdate', function (e) {
                                    isp = true;
                                    const i = parseInt(e.target.currentTime);
                                    if (o.skipBtn) {
                                        if (i >= o.skipAfterSec) {
                                            t.show(`#btn_close_inpage_${iItem}`);
                                            t.hide(`#btn_countdown_${iItem}`);
                                        } else {
                                            if (o.showCountdown) {
                                                const val = o.skipAfterSec - i;
                                                t.html(`#btn_countdown_${iItem}`, val.toString());
                                            }
                                        }
                                    }
                                    if (i <= 0) {
                                        return;
                                    }
                                    const d = parseInt(e.target.duration);
                                    const firtsQuartile = (d / 4);
                                    const midPoint = (d / 2);
                                    const thirdQuartile = (firtsQuartile + midPoint);
                                    if (typeof aActions.trackingevents.start != u && aActions.trackingevents.start.done == false) {
                                        aActions.trackingevents.start.done = true;
                                        pl.sendNotifications(aActions.trackingevents.start.items, 'start');
                                    }
                                    if (typeof aActions.trackingevents.progress != u) {
                                        for (let a = 0; a < aActions.trackingevents.progress.items.length; a++) {
                                            const item = aActions.trackingevents.progress.items[a];
                                            if (item.done == false) {
                                                if (item.offset <= i) {
                                                    aActions.trackingevents.progress.items[a].done = true;
                                                    pl.sendNotifications([item.url], 'progress');
                                                }
                                            }
                                        }
                                    }
                                    if (i >= firtsQuartile && i < (firtsQuartile + 1)) {
                                        if (typeof aActions.trackingevents.firstquartile != u && aActions.trackingevents.firstquartile.done == false) {
                                            aActions.trackingevents.firstquartile.done = true;
                                            pl.sendNotifications(aActions.trackingevents.firstquartile.items, 'firstquartile');
                                        }
                                    } else if (i >= midPoint && i < (midPoint + 1)) {
                                        if (typeof aActions.trackingevents.midpoint != u && aActions.trackingevents.midpoint.done == false) {
                                            aActions.trackingevents.midpoint.done = true;
                                            pl.sendNotifications(aActions.trackingevents.midpoint.items, 'midpoint');
                                        }
                                    } else if (i >= thirdQuartile && i < (thirdQuartile + 1)) {
                                        if (typeof aActions.trackingevents.thirdquartile != u && aActions.trackingevents.thirdquartile.done == false) {
                                            aActions.trackingevents.thirdquartile.done = true;
                                            pl.sendNotifications(aActions.trackingevents.thirdquartile.items, 'thirdquartile');
                                        }
                                    }
                                    if (i <= 10) {
                                        if (i >= 1) {
                                            if (!pl.bImplogged) {
                                                pl.bImplogged = true;
                                                const aItem3 = adMoxyCtrl.adCals[iItem];
                                                aItem3.data = json;
                                                aItem3.plugin = 'inpage_video';
                                                adMoxyCtrl.logImp(pl.itemId, 'inpage_video', '', aItem3);
                                                pl.sendNotifications(aActions.impression, 'impression');
                                                if (typeof json.imp_trackingurl != 'undefined' && json.imp_trackingurl != '') {
                                                    t.append("body", `<img width="0" height="0" src="${json.imp_trackingurl}" border="0"/>`);
                                                }
                                            }
                                        }
                                    }
                                });
                                pl.player.addEventListener("ended", function (e) {
                                    if (typeof aActions.trackingevents.complete != u) {
                                        pl.sendNotifications(aActions.trackingevents.complete.items, 'complete');
                                    }
                                    if (o.autoHide) {
                                        setTimeout(function () {
                                            o.hide();
                                        }, 10000);
                                    }
                                });
                            });
                        };
                    }
                    try {
                        const n = pl.playerNode;
                        n.insertAdjacentHTML('afterend', `<div id="trigger_${aItem.display}" style="height:200px;"></div>`);
                        const waypoint = new Waypoint({
                            element: document.getElementById(`trigger_${aItem.display}`),
                            handler: function (direction) {
                                adMoxyCtrl.debug(`Ad ${aItem['display']} visible`);
                                t.remove(`#trigger_${aItem.display}`);
                                run();
                                this.destroy();
                            },
                            offset: 'bottom-in-view'
                        });
                    } catch (_e) {
                        t.remove(`#trigger_${aItem.display}`);
                        run();
                    }
                });
            },
            init: function (iItem, aSett) {
                const ob = this;
                const aItem = adMoxyCtrl.adCals[iItem];
                const t = adMoxyCtrl.Tools;
                const node = t.getnode(`#${aItem.display}`);
                if (node === null) {
                    adMoxyCtrl.debug('no adtag found for inpage video');
                    return false;
                }
                if (node.innerHTML.trim() == '&nbsp;') {// we gaveout divtags with a &nbsp; as placeholder
                    node.innerHTML = '';// clear any existing content
                }

                ob.itemId = iItem;
                ob.sTag = `in_${iItem}`;
                if (this.isInitialized) {
                    return;
                }
                this.isInitialized = true;
                t.remove(`[id^=${this.sTag}]`);
                this.aSet = aSett;
                ob.skipBtn = adMoxyCtrl.getItem(aItem, 'skip_btn', false);
                if (ob.skipBtn) {
                    ob.skipAfterSec = parseInt(adMoxyCtrl.getItem(aItem, 'skip_after_sec', 5));
                    ob.skipPosition = adMoxyCtrl.getItem(aItem, 'skip_position', "top_right");
                    ob.showCountdown = adMoxyCtrl.getItem(aItem, 'show_countdown', true);
                    if (ob.skipAfterSec <= 0) {
                        ob.showCountdown = false;
                    }
                    switch (ob.skipPosition) {
                        case "top_right":
                        case "bottom_right":
                            break;
                        default:
                            ob.skipPosition = "top_right";
                            break;
                    }
                }
                ob.autoHide = adMoxyCtrl.getItem(aItem, 'auto_hide', false);
                ob.controls = adMoxyCtrl.getItem(aItem, 'controls', true);
                ob.muted = adMoxyCtrl.getItem(aItem, 'muted', false);
                ob.autoPlay = adMoxyCtrl.getItem(aItem, 'autoplay', false);
                ob.HoverMode = adMoxyCtrl.getItem(aItem, 'hovermode', false);
                if (ob.HoverMode) {
                    ob.autoPlay = false;
                }
                ob.loop = (!ob.autoHide ? adMoxyCtrl.getItem(aItem, 'loop', false) : false);
                ob.UseAdLabel = adMoxyCtrl.getItem(aItem, 'advertise', '') != '';


                return true;
            },
        };
    },
};adMoxyCtrl.Tools = {

    getVersion: function () {
        return "1.5";
    },
    isInFold: function (a) {
        try {
            const n = this.getnode(a);
            if (n) {
                const rect = this.domrect(n);
                return (rect.top > -(rect.height / 2) && rect.bottom <= (this.height(window) + (rect.height / 2)));
            }
        } catch (_e) {
        }
        return false;
    },
    is_bot: function () {
        return /bot|baidu|bing|msn|duckduckbot|teoma|slurp|yandex|lighthouse/i.test(navigator.userAgent);
    },
    is_chrome: function () {
        const isChromium = window.chrome;
        const winNav = window.navigator;
        const vendorName = winNav.vendor;
        const isOpera = typeof window.opr !== "undefined";
        const isIEedge = winNav.userAgent.indexOf("Edg") > -1;
        const isIOSChrome = winNav.userAgent.match("CriOS");
        const isSamsungChrome = winNav.userAgent.indexOf("SamsungBrowser") > -1;
        if (isIOSChrome) {
            return false;
        } else if (isChromium !== null && typeof isChromium !== "undefined" && vendorName === "Google Inc." && isOpera === false && isIEedge === false && isSamsungChrome === false) {
            return true;
        } else {
            return false;
        }
    },
    fetch_session: function (method, auto_reset) {
        if (typeof (Storage) !== "undefined") {
            const d = document.domain;
            const current_time = Math.round(new Date().getTime() / 1000);
            let browse_session = sessionStorage.getItem('bs');
            let new_session = false;
            if (auto_reset === true && document.referrer.indexOf(d) == -1) {
                new_session = true;
            }
            if (browse_session && !new_session) {
                browse_session = JSON.parse(browse_session);
                if (browse_session['time'] < current_time - 2 * 3600) {
                    browse_session = { 'v': 1, 'time': current_time };
                } else {
                    if (method == 'set') {
                        browse_session['v'] += 1;
                    }
                }
            } else {
                browse_session = { 'v': 1, 'time': current_time };
            }
            if (method == 'set' || new_session) sessionStorage.setItem('bs', JSON.stringify(browse_session));
            return browse_session;
        }
        return false;
    },

    isNumeric: (n) => {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },

    executeScripts: function (node) {
        /* return this.nodeScriptReplace */
        /* this function loads first all scripts which have a src attribute, and with the onload of the last one it will "execute" the normal scripts */
        const scriptElements = node.querySelectorAll("script");
        let ScriptScr = [];
        let ScriptTxt = [];
        Array.from(scriptElements).forEach((scriptElement) => {
            if (!scriptElement.getAttribute('run')) {
                scriptElement.setAttribute('run', '1');
                if (scriptElement.getAttribute('src')) {
                    ScriptScr.push(scriptElement);
                } else {
                    ScriptTxt.push(scriptElement);
                }
            }
        });
        if (ScriptScr.length > 0) { /* we have to load them first before we "inject" normal scripts */
            ScriptScr.forEach(function (scriptElement, k) {
                const clonedElement = document.createElement("script");
                Array.from(scriptElement.attributes).forEach((attribute) => {
                    clonedElement.setAttribute(attribute.name, attribute.value);
                });
                clonedElement.async = true;
                if (k == ScriptScr.length - 1) { /* add onload handler which add text scripts */
                    clonedElement.onload = function () {
                        ScriptTxt.forEach(function (v, k2) {
                            const cl = document.createElement("script");
                            Array.from(v.attributes).forEach((attribute) => {
                                cl.setAttribute(attribute.name, attribute.value);
                            });
                            cl.text = v.text;
                            v.parentNode.replaceChild(cl, v);
                        });
                    };
                }
                scriptElement.parentNode.replaceChild(clonedElement, scriptElement);
            });
            ScriptScr = [];
        } else {
            ScriptTxt.forEach(function (v, k2) {
                const cl = document.createElement("script");
                Array.from(v.attributes).forEach((attribute) => {
                    cl.setAttribute(attribute.name, attribute.value);
                });
                cl.text = v.text;
                v.parentNode.replaceChild(cl, v);
            });
            ScriptTxt = [];
        }
    },
    nodeScriptReplace: function (node) {
        const t = this;
        if (t.nodeScriptIs(node) === true) {

            const s = node.getAttribute('run');
            if (typeof s == 'string' && s == 'false') {
                node.setAttribute('run', 'true');
                node.parentNode.replaceChild(t.nodeScriptClone(node), node);
            }
        } else {
            let i = -1;
            const children = node.childNodes;
            while (++i < children.length) {
                t.nodeScriptReplace(children[i]);
            }
        }
        return node;
    },
    nodeScriptClone: function (node) {
        const script = document.createElement("script");
        script.text = node.innerHTML;
        let i = -1;
        const attrs = node.attributes;
        let attr;
        while (++i < attrs.length) {
            script.setAttribute((attr = attrs[i]).name, attr.value);
        }
        return script;
    },
    nodeScriptIs: function (node) {
        return node.tagName === 'SCRIPT';
    },
    dh: function () {
        return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    },
    dw: function () {
        return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    },
    wh: function () {
        return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    },
    ww: function () {
        return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    },
    find: function (a, b) {
        a = this.getnode(a);
        return this.getnodes(b, a);
    },
    docready: function (fn) {
        if (document.readyState === "complete" || (document.readyState !== "loading" && !document.documentElement.doScroll)) {
            fn();
        } else {
            const completed = function () {
                document.removeEventListener("DOMContentLoaded", completed);
                window.removeEventListener("load", completed);
                fn();
            };
            document.addEventListener("DOMContentLoaded", completed);
            window.addEventListener("load", completed);
        }
    },
    getnodes: function (a, b) {
        b = b || document;
        return b.querySelectorAll(a);
    },
    getnode: function (a, b) {
        try {
            if (a === window) {
                return a;
            }
            if (!(a instanceof Element)) {
                b = b || document;
                a = b.querySelector(a);
            }
            return a;
        } catch (_e) {
        }
    },
    append: function (a, b, c) {
        const n = this.getnode(a, c);
        try {
            if (n) {

                //console.log("append", b);

                b = b.replaceAll("<SCRIPT", '<script');
                b = b.replaceAll("</SCRIPT", '</script');
                let fs = b.indexOf("<script") >= 0;
                if (fs) {
                    b = b.replaceAll("<script", '<script run="false"');
                }
                n.insertAdjacentHTML('beforeend', b);
                if (fs) {
                    this.nodeScriptReplace(n);
                }
            }
        } catch (_e) {
        }
    },
    prepend: function (a, b, c) {
        const n = this.getnode(a, c);
        try {
            if (n) {

                b = b.replaceAll("<SCRIPT", '<script');
                b = b.replaceAll("</SCRIPT", '</script');
                let fs = b.indexOf("<script") >= 0;
                if (fs) {
                    b = b.replaceAll("<script", '<script run="false"');
                }
                n.insertAdjacentHTML('afterbegin', b);
                if (fs) {
                    this.nodeScriptReplace(n);
                }
            }
        } catch (_e) {
        }
        return n;
    },
    html: function (a, b, c) {
        try {
            const e = this.getnode(a, c);
            if (e) {
                if (b == null || typeof (b) == 'undefined') {
                    return e.innerHTML;
                } else {
                    let d = e.lastElementChild;
                    while (d) {
                        e.removeChild(d);
                        d = e.lastElementChild;
                    }
                    if (typeof b == 'string') {

                        b = b.replaceAll("<SCRIPT", '<script');
                        b = b.replaceAll("</SCRIPT", '</script');
                        let fs = b.indexOf("<script") >= 0;
                        if (fs) {
                            b = b.replaceAll("<script", '<script run="false"');
                        }
                        e.innerHTML = b;
                        if (fs) {
                            this.nodeScriptReplace(e);
                        }
                    } else {
                        e.parentNode.appendChild(b);
                    }
                }
            }
        } catch (_e) {
        }
    },
    isvisible: function (a) {
        try {
            a = this.getnode(a);
            return !!(a.offsetWidth || a.offsetHeight || a.getClientRects().length);
        } catch (_e) {
            return false;
        }
    },
    findall: function (a, b) {
        const c = [];
        const t = this;
        if (typeof a == 'string') {
            return t.getnodes(a);
        }
        if (a instanceof Element) {
            c.push(a);
        } else if (typeof a == 'object') {
            try {
                a.forEach(function (v, k) {
                    t.findall(v).forEach(function (e, i) {
                        c.push(e);
                    });
                });
            } catch (_e) {
            }
        }
        return c;
    },
    remove: function (a) {
        if (a instanceof Element) {
            a.parentNode.removeChild(a);
        } else {
            this.findall(a).forEach(function (v, k) {
                v.parentNode.removeChild(v);
            });
        }
    },
    attr: function (a, b, c) {
        this.findall(a).forEach(function (v, k) {
            if (c) {
                v.setAttribute(b, c);
            } else {
                return v.getAttribute(b);
            }
        });
    },
    now: function () {
        return Date.now();
    },
    show: function (a) {
        this.css(a, { "display": '' });
    },
    hide: function (a) {
        this.css(a, { "display": 'none' });
    },
    on: function (a, b, c) {
        if (!(a instanceof Element)) {
        } else if (a === screen) {
        }
        document.body.addEventListener(a, function (e) {
            if (e.target.matches(b)) {
                c(e);
            }
        });
    },
    hasWebP: function (cb) {
        const img = document.createElement("img");
        img.onload = function () {
            if (img.width === 2 && img.height === 1) {
                cb(true);
            } else {
                cb(false);
            }
        };
        img.onerror = function () {
            cb(false);
        };
        img.src = "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAQAAAAfQ//73v/+BiOh/AAA=";
    },
    parents: function (a) {
        a = this.getnode(a);
        const aret = [];
        if (a) {
            while (a.parentNode) {
                aret.push(a.parentNode);
                a = a.parentNode;
            }
        }
        return aret;
    },
    width: function (a) {
        if (a === window) {
            return a.innerWidth;
        } else if (a === screen) {
            return screen.width;
        }
        if (typeof a == 'string') {
            a = this.getnode(a);
        }
        if (a) {
            return a.getBoundingClientRect().width;
        }
    },
    height: function (a) {
        if (a === window) {
            return a.innerHeight;
        } else if (a === screen) {
            return screen.height;
        }
        const n = this.getnode(a);
        if (n) {
            return n.getBoundingClientRect().height;
        }
    },
    css: function (a, b) {
        a = this.getnode(a);
        if (a) {
            for (const k in b) {
                a.style[k] = b[k];
            }
        }
    },
    domrect: function (a) {
        try {
            a = this.getnode(a);
            const domRect = a.getBoundingClientRect();
            return domRect;
        } catch (_e) {
        }
    },
    hover: function (a, b, c) {
        a = this.getnode(a);
        if (!a) {
            return;
        }
        a.setAttribute('aria-expanded', 'false');
        let time = Date.now() - 10;
        const mhover = function () {
            if (time > Date.now() - 2 || a.getAttribute("aria-expanded") == 'true') {
                return;
            }
            a.setAttribute('aria-expanded', 'true');
            time = Date.now();
            b();
        };
        const mout = function (event) {
            let e = event.toElement || event.relatedTarget;
            while (e && e.parentNode && e.parentNode != window) {
                if (e.parentNode == this || e == this) {
                    if (e.preventDefault) e.preventDefault();
                    return false;
                }
                e = e.parentNode;
            }
            a.setAttribute('aria-expanded', 'false');
            c();
        };
        a.addEventListener('mouseover', mhover, true);
        a.addEventListener('mouseout', mout, true);
    },
    animateDown: function (a, time, c) {
        const slider = this.getnode(a);
        const mx = this.height(a);
        const min = 10;
        let timer = null;
        clearInterval(timer);
        const height = parseInt(slider.style.height);
        slider.style.height = '0px';
        const init = (new Date()).getTime();
        const disp = height - parseInt(slider.style.height);
        timer = setInterval(function () {
            const instance = (new Date()).getTime() - init;
            if (instance <= time) {
                const pos = min + Math.floor(disp * instance / time);
                slider.style.height = `${pos}px`;
            } else {
                slider.style.height = `${height}px`;
                clearInterval(timer);
                try {
                    c();
                } catch (_e) {
                }
            }
        }, 1);
    },
    /* taken from https://github.com/maekoya/simpleSlideToggle/blob/main/src/SimpleSlideToggle.ts */
    slideDown: function (a, b, c) {
        const duration = b || 1000;
        a = this.getnode(a);
        try {
            a.style.transitionProperty = 'height, margin, padding';
            a.style.transitionDuration = `${duration}ms`;
            a.style.boxSizing = 'border-box';
            a.style.overflow = 'hidden';
            a.style.height = `${a.offsetHeight}px`;
            a.setAttribute('aria-expanded', 'false');
            a.setAttribute('aria-hidden', 'true');
            /* move */
            a.offsetHeight;
            a.style.height = '0';
            a.style.paddingTop = '0';
            a.style.paddingBottom = '0';
            a.style.marginTop = '0';
            a.style.marginBottom = '0';
            /* reset */
            return new Promise(resolve => {
                setTimeout(() => {
                    a.style.display = 'none';
                    a.style.removeProperty('height');
                    a.style.removeProperty('box-sizing');
                    a.style.removeProperty('padding-top');
                    a.style.removeProperty('padding-bottom');
                    a.style.removeProperty('margin-top');
                    a.style.removeProperty('margin-bottom');
                    a.style.removeProperty('overflow');
                    a.style.removeProperty('transition-duration');
                    a.style.removeProperty('transition-property');
                    a.removeAttribute('data-slide-moving');
                    resolve('done');
                    if (c != null) {
                        c();
                    }
                }, duration);
            });
        } catch (_e) {
            adMoxyCtrl.debug(_e);
        }
    },
    slideUp: function (a, b, c) {
        try {
            const duration = b || 1000;
            const el = this.getnode(a);
            el.style.removeProperty('display');
            const originDisplay = window.getComputedStyle(el).display;
            el.style.display = (originDisplay === 'none') ? 'block' : originDisplay;
            const originHeight = el.offsetHeight;
            el.style.overflow = 'hidden';
            el.style.height = '0';
            el.style.paddingTop = '0';
            el.style.paddingBottom = '0';
            el.style.marginTop = '0';
            el.style.marginBottom = '0';
            el.offsetHeight;
            el.style.boxSizing = 'border-box';
            el.style.transitionProperty = 'height, margin, padding';
            el.style.transitionDuration = `${duration}ms`;
            el.setAttribute('aria-expanded', 'true');
            el.setAttribute('aria-hidden', 'false');
            /* move */
            el.style.height = `${originHeight}px`;
            el.style.removeProperty('padding-top');
            el.style.removeProperty('padding-bottom');
            el.style.removeProperty('margin-top');
            el.style.removeProperty('margin-bottom');
            /* reset */
            return new Promise(resolve => {
                setTimeout(() => {
                    el.style.removeProperty('box-sizing');
                    el.style.removeProperty('height');
                    el.style.removeProperty('overflow');
                    el.style.removeProperty('transition-duration');
                    el.style.removeProperty('transition-property');
                    el.removeAttribute('data-slide-moving');
                    resolve('done');
                    if (c != null) {
                        c();
                    }
                }, duration);
            });
        } catch (_e) {
            adMoxyCtrl.debug(_e);
        }
    },
    fadeIn: function (a, ms, c) {
        const el = this.getnode(a);
        if (!el)
            return;
        el.style.opacity = 0;
        el.style.filter = "alpha(opacity=0)";
        el.style.visibility = "visible";
        if (el.style.display == 'none') {
            el.style.display = '';
        }
        if (ms) {
            let opacity = 0;
            const timer = setInterval(function () {
                opacity += 50 / ms;
                if (opacity >= 1) {
                    clearInterval(timer);
                    opacity = 1;
                    if (c) {
                        c();
                    }
                }
                el.style.opacity = opacity;
                el.style.filter = `alpha(opacity=${opacity * 100})`;
            }, 50);
        } else {
            el.style.opacity = 1;
            el.style.filter = "alpha(opacity=1)";
            if (c) {
                c();
            }
        }
    },
    fadeOut: function (a, ms, c) {
        const el = this.getnode(a);
        if (!el) {
            return;
        }
        if (ms) {
            let opacity = 1;
            const timer = setInterval(function () {
                opacity -= 50 / ms;
                if (opacity <= 0) {
                    clearInterval(timer);
                    opacity = 0;
                    el.style.display = "none";
                    el.style.visibility = "hidden";
                    if (c) {
                        c();
                    }
                }
                el.style.opacity = opacity;
                el.style.filter = `alpha(opacity=${opacity * 100})`;
            }, 50);
        } else {
            el.style.opacity = 0;
            el.style.filter = "alpha(opacity=0)";
            el.style.display = "none";
            el.style.visibility = "hidden";
            if (c) {
                c();
            }
        }
    },
    isTouchDevice: function () {
        return ('ontouchend' in document);
    },


    mergeDefaults: function (t, s) {
        for (const key in s) {
            if (typeof s[key] == 'object' && key in t) {
                t[key] = adMoxyCtrl.Tools.mergeDefaults(t[key], s[key]);
            } else {
                if (!key in t || typeof t[key] == 'undefined') {
                    t[key] = s[key];
                }
            }
        }
        return t;

    },
    onResized: function (fn) {
        let rf;
        let h = innerHeight;
        let w = innerWidth;
        window.addEventListener('resize', function () {
            clearTimeout(rf);
            rf = setTimeout(function () {
                if (w != innerWidth || h != innerHeight) {
                    clearTimeout(rf);
                    fn(w, h, innerWidth, innerHeight);
                    w = innerWidth;
                    h = innerHeight;
                }
            }, 250);
        }, true);
    },


    onScrolled: function (fn) {
        let rf;
        window.addEventListener('wheel', function (event) {
            clearTimeout(rf);
            rf = setTimeout(function () {
                clearTimeout(rf);
                fn(event);

            }, 250);
        }, true);
    },

    appendUrlParms: function (uri, set) {
        const e = adMoxyCtrl;
        const t = this;
        if (e.abDetected) {
            uri += '&ab=1';
        }
        if (typeof set.defaultad == 'object') {
            uri += `&foad=${e.encode(JSON.stringify(set.defaultad))}`;
        }
        if (typeof set.rtbext == "object") {
            uri += `&rtbext=${e.encode(JSON.stringify(set.rtbext))}`;
        }
        uri += `&sh=${adMoxyCtrl.getItem(screen, 'height', 0)}`;
        uri += `&sw=${adMoxyCtrl.getItem(screen, 'width', 0)}`;
        let tm;
        try {
            tm = new Date().toString().match(/([-\+][0-9]+)\s/)[1];
        } catch (_e) {
            tm = -1;
        }
        if (tm == null || tm == '') {
            tm = -1;
        }
        uri += `&tz=${tm.replace('+', '')}`;
        uri += `&wh=${t.wh()}&ww=${t.ww()}&dh=${t.dh()}&dw=${t.dw()}`;
        uri += `&doc=${escape(e.getItem(document, 'location', ''))}`;
        uri += `&ref=${escape(e.getItem(document, 'referrer', ''))}`;
        uri += `&rnd=${Math.random()}&hastouch=${'ontouchend' in document}`;
        let s = e.getItem(set, 'em', '', true);
        if (s != "") {
            uri += `&email=${s}`;
        }
        s = e.getItem(set, 'subid', '', true);
        if (s != "") {
            uri += `&subid=${s}`;
        }
        s = e.getItem(set, 'keywords', '', true);
        if (s != '') {
            uri += `&keywords=${s}`;
        }
        s = e.getItem(set, 'maincat', '', true);
        if (s != '') {
            uri += `&maincat=${s}`;
        }
        s = e.getItem(set, 'category', '', true);
        if (s != '') {
            uri += `&category=${s}`;
        }
        s = e.getItem(set, 'sid1', '', true);
        if (s != "") {
            uri += `&sid1=${s}`;
        }
        s = e.getItem(set, 'sid2', '', true);
        if (s != "") {
            uri += `&sid2=${s}`;
        }
        s = e.getItem(set, 'sid3', '', true);
        if (s != "") {
            uri += `&sid3=${s}`;
        }
        s = e.getItem(set, 'sid4', '', true);
        if (s != "") {
            uri += `&sid4=${s}`;
        }
        s = e.getItem(set, 'sid5', '', true);
        if (s != "") {
            uri += `&sid5=${s}`;
        }
        s = e.getItem(set, 'sid6', '', true);
        if (s != "") {
            uri += `&sid6=${s}`;
        }
        s = e.getItem(set, 'sid7', '', true);
        if (s != "") {
            uri += `&sid7=${s}`;
        }
        s = e.getItem(set, 'sid8', '', true);
        if (s != "") {
            uri += `&sid8=${s}`;
        }
        s = e.getItem(set, 'sid9', '', true);
        if (s != "") {
            uri += `&sid9=${s}`;
        }
        s = e.getItem(set, 'sid10', '', true);
        if (s != "") {
            uri += `&sid10=${s}`;
        }
        return uri;
    },


};adMoxyCtrl.floater = {
    aFlt: [],
    i: 0,
    display: function (iItem, jData, isHtml) {
        adMoxyCtrl.interStitalRunning = adMoxyCtrl.interStitalRunning | false;
        adMoxyCtrl.interStitalWasRunning = adMoxyCtrl.interStitalWasRunning | false;
        if (typeof isHtml == 'undefined') {
            isHtml = 0;
        }
        if (typeof jData['settings'] != 'object' || jData['settings'] == null) {
            jData['settings'] = { position: "top-center", interstitial: false, position: '' };
        }
        this.aFlt[iItem] = new this.float(isHtml, iItem, jData, jData['settings']);
        if (this.aFlt[iItem].init()) {
            if (!isHtml) {
                this.aFlt[iItem].load();
            } else {
                this.aFlt[iItem].loadHtml();
            }
        }
    },
    getVersion: function () {
        return "4.7";
    },
    float: function (i, iItem, aAd, aSet) {
        return {
            position: "top-center",
            hideDelay: 0,
            hideSeconds: 30,
            elementName: "",
            ie: null,
            iebody: null,
            objheight: null,
            avHeight: null,
            avWidth: null,
            isActive: false,
            topMargin: 0,
            leftMargin: 0,
            bottomMargin: 0,
            position: '',
            objref: null,
            itemId: null,
            ctrlName: 'floater',
            pw: false,
            aPop: null,
            hasMultiItems: i,
            IsLoaded: false,
            fire: function (i) {
                if (!this.IsLoaded) {
                    this.run();
                    this.IsLoaded = true;
                }
            },
            init: function () {
                const ob = this;
                aSet.interstitial = aSet.interstitial || false;
                aSet.position = aSet.position || '';
                const aItem = adMoxyCtrl.adCals[iItem];
                const Advertise = adMoxyCtrl.getItem(aItem, "advertise", '');
                if (aSet.interstitial) {
                    if (adMoxyCtrl.interStitalRunning) {
                        return false;
                    }
                    aSet.position = "center";
                }
                if (typeof adMoxyCtrl.sCloseButtonHtml == 'undefined') {
                    adMoxyCtrl.sCloseButtonHtml = "<img alt='Close Ad' style='background:#ffffff;border-radius: 50%;margin:2px' width='24' height='24' src='data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIwIDAgNDk2IDQ5NiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDk2IDQ5NjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPGc+DQoJCTxnPg0KCQkJPHBhdGggZD0iTTI0OCwwQzExMS4wMzMsMCwwLDExMS4wMzMsMCwyNDhzMTExLjAzMywyNDgsMjQ4LDI0OHMyNDgtMTExLjAzMywyNDgtMjQ4QzQ5NS44NDEsMTExLjA5OSwzODQuOTAxLDAuMTU5LDI0OCwweg0KCQkJCSBNMjQ4LDQ4MEMxMTkuODcsNDgwLDE2LDM3Ni4xMywxNiwyNDhTMTE5Ljg3LDE2LDI0OCwxNnMyMzIsMTAzLjg3LDIzMiwyMzJDNDc5Ljg1OSwzNzYuMDcyLDM3Ni4wNzIsNDc5Ljg1OSwyNDgsNDgweiIvPg0KCQkJPHBhdGggZD0iTTM2MS4xMzYsMTM0Ljg2NGMtMy4xMjQtMy4xMjMtOC4xODgtMy4xMjMtMTEuMzEyLDBMMjQ4LDIzNi42ODhMMTQ2LjE3NiwxMzQuODY0Yy0zLjA2OS0zLjE3OC04LjEzNC0zLjI2Ni0xMS4zMTItMC4xOTcNCgkJCQljLTMuMTc4LDMuMDY5LTMuMjY2LDguMTM0LTAuMTk3LDExLjMxMmMwLjA2NCwwLjA2NywwLjEzLDAuMTMyLDAuMTk3LDAuMTk3TDIzNi42ODgsMjQ4TDEzNC44NjQsMzQ5LjgyNA0KCQkJCWMtMy4xNzgsMy4wNy0zLjI2Niw4LjEzNC0wLjE5NiwxMS4zMTJjMy4wNywzLjE3OCw4LjEzNCwzLjI2NiwxMS4zMTIsMC4xOTZjMC4wNjctMC4wNjQsMC4xMzItMC4xMywwLjE5Ni0wLjE5NkwyNDgsMjU5LjMxMg0KCQkJCWwxMDEuODI0LDEwMS44MjRjMy4xNzgsMy4wNyw4LjI0MiwyLjk4MiwxMS4zMTItMC4xOTZjMi45OTUtMy4xLDIuOTk1LTguMDE2LDAtMTEuMTE2TDI1OS4zMTIsMjQ4bDEwMS44MjQtMTAxLjgyNA0KCQkJCUMzNjQuMjU5LDE0My4wNTIsMzY0LjI1OSwxMzcuOTg4LDM2MS4xMzYsMTM0Ljg2NHoiLz4NCgkJPC9nPg0KCTwvZz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjwvc3ZnPg0K'/>";
                }
                const btndiv = `fl_${iItem}_close_layer`;
                const elmName = `fl_${iItem}`;
                this.elementName = elmName;
                const t = adMoxyCtrl.Tools;
                t.append('head', `<style type="text/css" media="all">@CHARSET "UTF-8";#${elmName} { font-family: Arial, Helvetica, sans-serif; font-size:12px; background: #000000; border-radius:5px; #000000; } #${elmName} a,#${elmName} a:link,#slider strong { text-decoration:none; color: black; font-size:12px; } </style>`);
                const closeTitle = adMoxyCtrl.isPreview ? 'Preview' : 'Ad';
                let sHtml = '';
                if (Advertise == '') {
                    sHtml = `<div id="${btndiv}" style="position:absolute;z-index:1000000; right:0px; float:right; top:0px;float:right;"><a title="Close ${closeTitle}" onclick="return adMoxyCtrl.floater.aFlt[${iItem}].hide(1);">${adMoxyCtrl.sCloseButtonHtml}</a></div>`;
                } else {
                    sHtml = `<div id="${btndiv}" style="display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;"><div style="color:#fff;padding-left:5px;font-size:14px">${Advertise}</div><div><a title="Close ${closeTitle}" onclick="return adMoxyCtrl.floater.aFlt[${iItem}].hide(1);">${adMoxyCtrl.sCloseButtonHtml}</a></div></div>`;
                }
                let sTag = 'body';
                let zindex = '1000';
                if (aSet.interstitial) {
                    t.append('body', `<div id="${elmName}_bg" style="z-index:5000;top:0px;left:0px;padding:0px;margin:0px;background:#000;opacity: 0.8;filter: alpha(opacity = 80);position:fixed;display:none;width:100%;height:calc(100vh);"></div>`);
                    sTag = `#${elmName}_bg`;
                    t.getnode(sTag).addEventListener('click', function (e) {
                        ob.hide();
                    });
                    zindex = '6000';
                }
                let sxy = '';
                if (!aSet.interstitial) {
                    const w1 = parseInt(adMoxyCtrl.getItem(aSet, "width", 0));
                    const h1 = parseInt(adMoxyCtrl.getItem(aSet, "height", 0));
                    if (w1 > 0 && h1 > 0) {
                        sxy = `style="width:${w1}px;height:${h1}px;"`;
                    }
                }
                t.append('body', `<div id="${elmName}" style="z-index:${zindex}; padding: 0px; margin:0px; border:1px #000000 solid; border-spacing:1px; background-color:#000000; position:fixed; text-align: left;display:none;">${sHtml}<div id="${elmName}_content" ${sxy}></div></div>`);
                this.objref = document.getElementById(elmName);
                const tmp = this;
                window.addEventListener('resize', function () {
                    tmp.setPosition();
                });
                if (document.compatMode != "CSS1Compat") {
                    window.addEventListener('scroll', function () {
                        tmp.setPosition();
                    });
                }
                this.ie = document.all && !window.opera;
                this.iebody = (document.compatMode == "CSS1Compat") ? document.documentElement : document.body;
                this.hideDelay = aSet.hidedelay;
                this.hideSeconds = aSet.hideseconds;
                if (this.hideSeconds < 15) { this.hideseconds = 15; }
                this.topMargin = aSet.topmargin;
                this.leftMargin = aSet.leftmargin;
                this.bottomMargin = aSet.bottommargin;
                if (aSet.position == '') {
                    aSet.position = "center";
                }
                this.position = aSet.position;
                return true;
            },
            run: function () {
                const ob = this;
                const elmName = this.elementName;
                const isNt = adMoxyCtrl.getItem(aAd, 'adtype', '') == 'native';
                if (isNt) {
                    adMoxyCtrl.loadPlugin(-1, "native", function () {
                        const sId = elmName + 'ct';
                        adMoxyCtrl.adCals[iItem]["display"] = sId;
                        adMoxyCtrl.adCals[iItem]["isflt"] = 1;
                        const t = adMoxyCtrl.Tools;
                        t.html(`#${elmName}_content`, `<div style="clear:both;font-size:11px; color:black;" id="${sId}"></div>`);
                        adMoxyCtrl.native.display(iItem, aAd);
                        ob.show();
                        if (aSet.interstitial) {
                            t.show(`#${elmName}_bg`);
                        }
                    });
                    return;
                } else {
                    if (typeof aAd.items != 'undefined') {
                        this.hasMultiItems = true;
                    } else {
                        adMoxyCtrl.banner.genHtml(iItem, aAd, function (s) {
                            function run() {
                                const t = adMoxyCtrl.Tools;
                                t.html(`#${elmName}_content`, s);
                                const functs = {
                                    onload: function () {
                                        ob.show();
                                        if (aSet.interstitial) {
                                            t.show(`#${elmName}_bg`);
                                        }
                                    }
                                };
                                adMoxyCtrl.banner.addHandler(iItem, functs);
                            }
                            if (aSet.interstitial) {
                                adMoxyCtrl.Tools.on('click', 'a', function (e) {

                                    try {
                                        const phref = e.target.getAttribute("href");
                                        if (phref != null && phref !== '#' && phref !== 'javascript:void(0)') {
                                            run();
                                        }
                                    } catch (_e) { }
                                });
                            } else {
                                run();
                            }
                        });
                    }
                }
            },
            load: function () {
                const ob = this;
                if (aSet.interstitial && !adMoxyCtrl.isPreview) {
                    if (adMoxyCtrl.floater.i >= 1) {
                        return;
                    }
                    adMoxyCtrl.floater.i++;
                    ob.run();
                    ob.IsLoaded = true;
                } else {
                    ob.run();
                }
            },
            loadHtml: function () {
                const ob = this;
                aSet.interstitial = aSet.interstitial | false;
                function run() {
                    const elmName = ob.elementName;
                    adMoxyCtrl.Tools.html(`#${elmName}_content`, aAd.html);
                    adMoxyCtrl.floater.aFlt[iItem].show();
                    if (typeof aAd.callback != 'undefined') {
                        aAd.callback();
                    }
                }
                if (aSet.interstitial) {
                    if (adMoxyCtrl.floater.i >= 1) {
                        return;
                    }
                    adMoxyCtrl.floater.i++;
                    adMoxyCtrl.Tools.on('click', '*', function (e) {

                        if (!ob.IsLoaded) {
                            run();
                            ob.IsLoaded = true;
                        }
                    });
                } else {
                    run();
                }
            },
            show: function () {
                this.isActive = true;
                adMoxyCtrl.Tools.show(`#${this.elementName}`);
                if (this.hasMultiItems) {
                }
                if (typeof aSet.hideref == 'undefined') { aSet.hideref = 1; }
                this.setPosition();
                if (this.hideDelay) {
                    const tmp = this;
                    if (tmp.hideSeconds > 0) {
                        if (tmp.hideSeconds < 20) {
                            tmp.hideSeconds = 20;
                        }
                        setTimeout(function () { tmp.hide(0); }, tmp.hideSeconds * 1000);
                    }
                }
                try {
                    if (aSet.closepop.id > 0) {
                        const ob = this;
                        const aItem = adMoxyCtrl.adCals[iItem];
                        adMoxyCtrl.loadPlugin(-1, "pop", function () {
                            cbTestFlt = function () {
                                if (typeof eaPopn != 'undefined') {
                                    const p = new eaPopn;
                                    p.isPopunder = 0;
                                    p.xbtn = true;
                                    p.url = p.genUrl(aItem, aSet.closepop.id);
                                    p.cookieTime = aSet.closepop.cap;
                                    p.clickHandler = [`#${btndiv}`];
                                    p.ignoreList = [];
                                    p.cookieName = `popcap_${aSet.closepop.id}`;
                                    ob.aPop = p;
                                    if (p.canrun()) {
                                        ob.pw = true;
                                        p.init();
                                    }
                                } else {
                                    setTimeout("cbTestFlt()", 500);
                                }
                            };
                            cbTestFlt();
                        });
                    }
                } catch (e) { }
            },
            hide: function (c) {
                c = c | 0;
                if (c && this.pw) {
                    /* in case there is a pop to handle we need to wait a bit */
                    var tmp = this;
                    setTimeout(function () { tmp.hide(0); }, 500);
                    return;
                }
                try {
                    this.isActive = false;
                    const t = adMoxyCtrl.Tools;
                    t.remove(`#${this.elementName}`);
                    adMoxyCtrl.adCals[iItem].d_called = 0;
                    t.remove(`#${this.elementName}_bg`);
                    adMoxyCtrl.interStitalRunning = false;
                } catch (_e) { }
            },
            reDisplayItems: function () {
            },
            setPosition: function (obj) {
                if (!this.isActive) { return; }
                this.avWidth = (this.ie) ? this.iebody.clientWidth : window.innerWidth;
                this.avHeight = (this.ie) ? this.iebody.clientHeight : window.innerHeight;
                this.objwidth = this.objref.offsetWidth;
                this.objheight = this.objref.offsetHeight;
                switch (this.position) {
                    case "center":
                        var left = this.avWidth / 2 - this.objwidth / 2;
                        if (left < this.leftMargin) { left = this.leftMargin; }
                        this.objref.style.left = left + "px";
                        this.objref.style.top = this.avHeight / 2 - this.objheight / 2 + "px";
                        break;
                    case "top-left":
                        this.objref.style.left = this.leftMargin + "px";
                        this.objref.style.top = this.topMargin + "px";
                        break;
                    case "top-right":
                        var left = (this.avWidth - (this.objwidth + 15));
                        if (left < this.leftMargin) { left = this.leftMargin; }
                        this.objref.style.left = left + "px";
                        this.objref.style.top = this.topMargin + "px";
                        break;
                    case "top-center":
                        var left = this.avWidth / 2 - this.objwidth / 2;
                        if (left < this.leftMargin) { left = this.leftMargin; }
                        this.objref.style.left = left + "px";
                        this.objref.style.top = this.topMargin + "px";
                        break;
                    case "left-middle":
                        this.objref.style.left = this.leftMargin + "px";
                        var top = ((this.avHeight - this.objheight) / 2) + this.topMargin;
                        if (top < this.topMargin) { top = this.topMargin; }
                        this.objref.style.top = top + 'px';
                        break;
                    case "right-middle":
                        var left = (this.avWidth - (this.objwidth + 15));
                        if (left < this.leftMargin) { left = this.leftMargin; }
                        this.objref.style.left = left + "px";
                        var top = ((this.avHeight - this.objheight) / 2) + this.topMargin;
                        if (top < this.topMargin) { top = this.topMargin; }
                        this.objref.style.top = top + 'px';
                        break;
                    case "left-bottom":
                        this.objref.style.left = this.leftMargin + "px";
                        this.objref.style.top = (this.avHeight - this.objheight) - this.bottomMargin + 'px';
                        break;
                    case "right-bottom":
                        this.objref.style.top = (this.avHeight - this.objheight) - this.bottomMargin + 'px';
                        var left = (this.avWidth - (this.objwidth + 15));
                        if (left < this.leftMargin) { left = this.leftMargin; }
                        this.objref.style.left = left + "px";
                        break;
                    case "bottom-center":
                        var left = this.avWidth / 2 - this.objwidth / 2;
                        if (left < this.leftMargin) { left = this.leftMargin; }
                        this.objref.style.left = left + "px";
                        this.objref.style.top = (this.avHeight - this.objheight) - this.bottomMargin + 'px';
                        break;
                }
                if (this.hasMultiItems) {
                    this.reDisplayItems();
                }
            },
        };
    }
};adMoxyCtrl.videoslider = {
    procs: [],
    ea: adMoxyCtrl,
    tools: adMoxyCtrl.Tools,
    ctrlName: 'videoslider',
    cssLoaded: false,
    display: function (i, json) {

        let ob = this;
        let ea = adMoxyCtrl;
        let tools = ea.Tools;

        if (ea.abDetected) {
            return;
        }
        ea.interStitalRunning = ea.interStitalRunning | false;
        ea.interStitalWasRunning = ea.interStitalWasRunning | false;
        ob.procs[i] = new ob.proc();

        let proc = ob.procs[i];
        if (proc.init(i, json['settings'])) {
            function dc() {
                proc.dc(i, json);
            }


            if (proc.interStitial && !ea.isPreview) {
                let aItem = ea.adCals[i];

                if (typeof aItem.ignoreTags == 'object' && aItem.ignoreTags.length > 0) {
                    proc.ignoreList = aItem.ignoreTags;

                }
                if (typeof aItem.clickTags != 'undefined' && aItem.clickTags.length > 0) {
                    proc.clickHandler = aItem.clickTags;
                } else {
                    proc.clickHandler = ['a'];
                }

                const ch = function () {
                    try {
                        tools.on("click", "a", function (e) {
                            let href = e.target.getAttribute("href");
                            if (href == null || typeof href == 'undefined') {
                                href = '#';
                            }
                            if (href !== '#' && href !== 'javascript:void(0)') {
                                if (!proc.IsLoaded) {
                                    let a = e.target;
                                    if (proc.canFire(a)) {
                                        ob.ea.interStitalRunning = true;
                                        proc.IsLoaded = true;
                                        proc.c_href = e.target;
                                        dc();
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }
                                }
                            }
                        });
                    } catch (e) {
                    }
                };
                ch();
            } else {
                dc();
            }
        }
    },
    getVersion: function () {
        return "1.8";
    },

    proc: function () {

        return {
            Video: null,
            skipreload: false,
            reload: false,
            reloadTime: 0,
            running: false,
            popsid: 0,
            isInitialized: false,
            interStitial: false,
            IsLoaded: false,
            itemId: 0,
            hasPoster: false,
            aSet: null,
            c_href: null,
            cntRunning: false,
            ignoreList: [],
            clickHandler: ["a"],
            hls: null,
            tools: adMoxyCtrl.Tools,
            IsCarousel: false,
            CarouselSettings: {},
            fullScreenMode: false,
            allPortrait: false,
            ClassName: '',
            pl: {},

            sTag: "im_video",
            ea: adMoxyCtrl,
            getSet: function () {
                let first_time = (sessionStorage.getItem("sldr" + this.itemId) === null);
                let set = this.ea.getStorage("sldr_" + this.itemId);
                if (set == null || typeof set != 'object' || first_time) {
                    set = {
                        set: Date.now(),
                        pv: 0,
                        clk: 0,
                        pg: "",
                    };
                    this.saveSet(set);
                }
                return set;
            },
            saveSet: function (set) {
                this.ea.setStorage("sldr_" + this.itemId, set, 3600);
            },

            setwh: function () {
                let tools = adMoxyCtrl.Tools;
                let ea = adMoxyCtrl;
                let ob = this;
                let ismobile = (tools.dw() <= 600 || ea.getItem(ea.browserInfo, "ismobile", 0) == 1);
                let i = 0;

                if (ob.IsCarousel) {
                    if (ob.fullScreenMode) {
                        ob.playerNode.parentNode.classList.add('fullscreen');
                        i = 100;
                        ob.playerNode.parentNode.setAttribute("style", `height:calc(${i}vh); width:calc(${i}vh * 16 / 9); max-width:100%;max-height:100%;position: absolute;top: 0;left: 50%;transform: translateX(-50%);`);
                        tools.hide(`#lbl_advertise_slider_${ob.sTag}`);

                    } else {
                        if (ob.allPortrait) {
                            i = (ismobile ? ob.aSet.max_vp_mobile_portrait : ob.aSet.max_vp_desktop_portrait);
                            ob.playerNode.parentNode.setAttribute("style", `height:calc(${i}vh + 15px); width:calc(${i}vh * 9 / 16); max-width:100%;`);
                        } else {
                            i = (ismobile ? ob.aSet.max_vp_mobile : ob.aSet.max_vp_desktop);
                            ob.playerNode.parentNode.setAttribute("style", `height:calc(${i}vh + 15px); width:calc(${i}vh * 16 / 9); max-width:100%;`);
                        }
                        ob.playerNode.parentNode.classList.remove('fullscreen');
                        tools.show(`#lbl_advertise_slider_${ob.sTag}`);

                    }
                    tools.show(`#${ob.sTag}`);
                } else {

                    if (!ob.aSet.interstitial) {
                        if (ob.hasPoster) {
                            let posterUrl = ob.pl.player.getAttribute("poster");
                            const posterImage = new Image();
                            posterImage.src = posterUrl;
                            posterImage.onload = function () {
                                const w = posterImage.width;
                                const h = posterImage.height;
                                if (w > h) { /* landscape, default */
                                    i = (ismobile ? ob.aSet.max_vp_mobile : ob.aSet.max_vp_desktop);
                                } else {
                                    i = (ismobile ? ob.aSet.max_vp_mobile_portrait : ob.aSet.max_vp_desktop_portrait);
                                }
                                ob.pl.player.setAttribute("style", `height:${i}vh !important`);
                                tools.show(`#${ob.sTag}`);
                            };
                        } else {
                            if (ob.pl.player.videoWidth > ob.pl.player.videoHeight) { /* landscape, default */
                                i = (ismobile ? ob.aSet.max_vp_mobile : ob.aSet.max_vp_desktop);
                            } else {
                                i = (ismobile ? ob.aSet.max_vp_mobile_portrait : ob.aSet.max_vp_desktop_portrait);
                            }
                            ob.pl.player.setAttribute("style", `height:${i}vh !important`);
                            tools.show(`#${ob.sTag}`);
                        }
                    }
                }
            },

            checkSet: function (i, json, cnt) {
                let ob = this;
                cnt = cnt || 0;
                cnt++;

                if (ob.aSet.close_action > 0) {
                    let set = ob.getSet();

                    if (set.clk == 0) { /* auto created and not through a clickevent */
                        return true;
                    }
                    try {
                        switch (ob.aSet.close_action) {
                            case 1:
                                if (set.pv <= ob.aSet.action_pageviews) {
                                    setTimeout(function () {
                                        set.pv++;
                                        set.pvd = Date.now();
                                        ob.saveSet(set);
                                        ob.dc(i, json, cnt);
                                    }, ob.aSet.action_seconds * 1000);
                                }
                                return false;
                                break;
                            case 2: /* dont display for x pageviews */

                                if (set.pg == document.location.href) {
                                    if (set.pv <= ob.aSet.action_pageviews) {
                                        set.pv++;
                                        set.pvd = Date.now();
                                        ob.saveSet(set);
                                        return false;
                                    }
                                }
                                return true;
                                break;
                            case 3: /* same as 2 but on refresh? */
                                if (set.pg == document.location.href) {

                                    if (set.pv <= ob.aSet.action_pageviews) {
                                        if (set.pvd < Date.now() - 10) {
                                            set.pv++;
                                            set.pvd = Date.now();
                                            ob.saveSet(set);
                                        }
                                        return false;
                                    }
                                }

                                break;
                            case 4:
                                /* most complicated one */
                                if (set.pg && set.pg == document.location.href) {
                                    return false;
                                }
                                break;


                            case 5:
                                let chk = sessionStorage.getItem("sldr" + ob.itemId);
                                return chk === null;
                                break;


                        }
                    } catch (e) {
                        console.log(e);
                    }
                } else {
                    return sessionStorage.getItem("sldr" + ob.itemId) === null;
                }

                return true;
            },
            handleFullScreen: function () {
                let ob = this;
                let el = ob.playerNode;
                let canFullscreen = el.requestFullscreen || el.webkitRequestFullscreen;

                if (!ob.fullScreenMode) {
                    ob.fullScreenMode = true;
                    if (canFullscreen) {
                        if (el.requestFullscreen) {
                            el.requestFullscreen();
                        } else {
                            el.webkitRequestFullscreen();
                        }
                        el.addEventListener('fullscreenchange', function () {
                            if (!document.fullscreenElement) {
                                ob.fullScreenMode = false;
                            }
                        });
                        el.addEventListener('webkitfullscreenchange', function () {
                            if (!document.webkitFullscreenElement) {
                                ob.fullScreenMode = false;
                            }
                        });
                    } else {
                        ob.setwh();
                    }
                } else {
                    ob.fullScreenMode = false;
                    if (canFullscreen && (document.fullscreenElement || document.webkitFullscreenElement)) {
                        if (document.exitFullscreen) {
                            document.exitFullscreen();
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        }
                    } else {
                        ob.setwh();
                    }
                }

            },


            hide: function (clk) {
                clk = clk || false;
                let ob = this;
                let ea = ob.ea;


                if (clk) {
                    let ia = ob.aSet.close_action;
                    if (ia > 0) {
                        let first_time = (sessionStorage.getItem("sldr" + ob.itemId) === null);

                        let set = ob.getSet();
                        if (first_time) {
                            /* new generated others we skip */
                            set.pv = 1;
                            set.clk = 1;

                        } else {
                            set.clk++;
                        }

                        if (ia == 1 || ia == 2) {
                            set.pv = 1; /* to reset the "no view counter" */
                        }

                        set.pg = document.location.href; /* we keep in mind which page closed it */

                        ob.saveSet(set);

                        if (ia == 1) {
                            if (ob.aSet.action_seconds > 0) {
                                setTimeout(() => {
                                    ea.reload(ob.itemId);
                                }, ob.aSet.action_seconds * 1000);
                            }
                        }

                    }
                    sessionStorage.setItem("sldr" + ob.itemId, "1"); /* for all */

                } else {
                    if (ob.reloadTime > 0) {
                        setTimeout(() => {
                            ea.reload(ob.itemId);
                        }, ob.reloadTime)
                    }
                }
                ob.reload = false;
                ob.running = false;
                ob.tools.html(`#${ob.sTag}_player`, '');
                ob.tools.remove([`#${ob.sTag}`, `#${ob.sTag}_css`, `#${ob.sTag}_bg`, `#notifications_${ob.sTag}_content`]);
                try {
                    if (ob.hls != null) {
                        ob.hls.destroy();
                    }
                } catch (e) {
                }
                if (ob.interStitial) {
                    ea.interStitalWasRunning = true;
                    ea.interStitalRunning = false;
                    if (ob.c_href != null) {
                        try {
                            const url = ob.c_href.getAttribute("href");
                            if (url != "") {
                                let tg = ob.c_href.getAttribute("target");
                                if (tg != '' && tg != "_self") {
                                    ea.Open(url, function () {
                                    });
                                } else {
                                    document.location = url;
                                }
                            }
                        } catch (e) {
                        }
                    }
                }
            },
            dc: function (i, json, cnt = 0) {
                let ob = this;

                let ea = ob.ea;
                if (ob.itemId == 0) {
                    ob.itemId = i;
                } else {
                    if (ob.itemId != i) {
                        ob.ea.debug("Videoslider plugin got called more than one time, will be ignored");
                        return;
                    }
                }
                ob.aSet.interstitial = ob.aSet.interstitial || false;

                ob.aSet.use_close_btn = parseInt(ea.getItem(ob.aSet, 'use_close_btn', 1));
                ob.aSet.counter_seconds = parseInt(ea.getItem(ob.aSet, 'counter_seconds', 0));
                ob.aSet.close_action = parseInt(ea.getItem(ob.aSet, 'close_action', 0));
                ob.aSet.action_seconds = parseInt(ea.getItem(ob.aSet, 'action_seconds', 0));
                ob.aSet.action_pageviews = parseInt(ea.getItem(ob.aSet, 'action_pageviews', 0));
                ob.aSet.ff_action = parseInt(ea.getItem(ob.aSet, 'ff_action', 0));

                ob.aSet.max_vp_desktop = parseInt(ea.getItem(ob.aSet, 'max_vp_desktop', 30));
                ob.aSet.max_vp_mobile = parseInt(ea.getItem(ob.aSet, 'max_vp_mobile', 30));

                ob.aSet.max_vp_desktop_portrait = parseInt(ea.getItem(ob.aSet, 'max_vp_desktop_portrait', 30));
                ob.aSet.max_vp_mobile_portrait = parseInt(ea.getItem(ob.aSet, 'max_vp_mobile_portrait', 30));

                if (ob.aSet.max_vp_desktop < 5 || ob.aSet.max_vp_desktop > 50) {
                    ob.aSet.max_vp_desktop = 30;
                }
                if (ob.aSet.max_vp_mobile < 5 || ob.aSet.max_vp_mobile > 50) {
                    ob.aSet.max_vp_mobile = 30;
                }


                if (ob.aSet.max_vp_desktop_portrait < 5 || ob.aSet.max_vp_desktop_portrait > 50) {
                    ob.aSet.max_vp_desktop_portrait = 30;
                }
                if (ob.aSet.max_vp_mobile_portrait < 5 || ob.aSet.max_vp_mobile_portrait > 50) {
                    ob.aSet.max_vp_mobile_portrait = 30;
                }
                ob.aSet.display_counter = parseInt(ea.getItem(ob.aSet, 'display_counter', 1));

                if (ob.aSet.interstitial) {
                    ob.aSet.width = 'calc(100%)';
                    ob.aSet.height = 'calc(100vh -1px)';
                } else {
                    ob.aSet.width = (ob.aSet.width | '640') + 'px';
                    ob.aSet.height = (ob.aSet.height | '360') + 'px';
                }

                let tools = adMoxyCtrl.Tools;
                let playerid = ob.sTag + '_content';
                ob.playerNode = ob.tools.getnode(`#${playerid}`);
                let pWidth = ob.aSet.width;
                let pHeight = ob.aSet.height;
                let item = adMoxyCtrl.adCals[i];
                item.reload = item.reload || 0;
                if (!ob.aSet.interstitial) {
                    ob.tools.hide(`#${ob.sTag}`);
                }
                if (cnt == 0 && item.reload == 0) {
                    if (!ob.checkSet(i, json, cnt)) {
                        return;
                    }
                }


                let node = ob.playerNode;
                let desc = adMoxyCtrl.getItem(item, "advertise", "");
                if (desc != "") {
                    tools.html(ob.playerNode, `<div id="wrapper_${playerid}" ></div>`);
                    node = document.getElementById(`wrapper_${playerid}`);
                    tools.prepend(node, `<div id="lbl_advertise_slider_${ob.sTag}" class="lbl_advertise_slider" style="z-index:1000;background-color: #blue!important;color: #ffffff;padding:2px;max-height:20px;overflow:hidden;display:none">${desc}</div>`);
                }

                if (ob.IsCarousel) {
                    tools.append(node, `<div id="data_${playerid}"></div>`);
                    ea.loadPlugin(-1, 'video_carousel', () => {
                        json.settings = ob.CarouselSettings;
                        json.settings.isSlider = true;
                        json.settings.caller = ob; /* callbacks */
                        item.display = `data_${playerid}`;
                        ob.pl = ea.video_carousel.display(i, json);


                        if (ob.aSet.use_close_btn == 0) {
                            tools.hide(`#btn_close_videoslider_${i}`);
                        } else {
                            tools.getnode(`#btn_close_videoslider_${i}`).addEventListener('click', (e) => {
                                e.stopImmediatePropagation();
                                if (!ob.cntRunning) {
                                    if (ob.aSet.ff_action == 1) {
                                        if (sessionStorage.getItem("sldr" + ob.itemId) === null) {
                                            ob.pl.handleClick();
                                        }
                                    }
                                    ob.hide(true);
                                }
                            });

                            function startTicker(maxSeconds, onTick, onComplete) {
                                let elapsed = 0;
                                const timer = setInterval(function () {
                                    elapsed++;
                                    onTick(elapsed);
                                    if (elapsed >= maxSeconds) {
                                        clearInterval(timer);
                                        if (onComplete) onComplete();
                                    }
                                }, 1000);
                                return timer; /* In case you need to stop early */
                            }
                            if (ob.aSet.display_counter == 0) {
                                tools.hide(`#btn_close_videoslider_${i}`);
                            }
                            const timer = startTicker(ob.aSet.counter_seconds, function (time) {
                                if (time <= (ob.aSet.counter_seconds + 2)) {
                                    if (time >= ob.aSet.counter_seconds || ob.aSet.counter_seconds == 0) {
                                        tools.html(`#btn_close_videoslider_${i}`, "Close ad ×");
                                        if (ob.aSet.display_counter == 0) {
                                            tools.show(`#btn_close_videoslider_${i}`);
                                        }
                                        ob.cntRunning = false;
                                    } else {
                                        if (ob.aSet.display_counter == 1) {
                                            tools.html(`#btn_close_videoslider_${i}`, "" + (ob.aSet.counter_seconds - time));
                                        } else {
                                            tools.hide(`#btn_close_videoslider_${i}`);
                                        }
                                        ob.cntRunning = true;
                                    }
                                }
                            }, function () {
                            });
                        }
                    });
                } else {



                    ea.loadPlugin(-1, 'video', () => {
                        let u = 'undefined';
                        let ad = json;
                        ob.pl = ea.video.videoCtrl();
                        ob.Video = ob.pl;
                        ob.pl.isSlider = true;

                        ob.pl.itemId = i;
                        ob.pl.iActionId = 0;
                        ob.pl.playerid = playerid;
                        ob.pl.playerNode = node;
                        ob.pl.LoadActions(ad, (actions) => {


                            let file = "";
                            let hls_file = '';
                            if (typeof actions != u && typeof actions.mediafile != u && actions.mediafile != '') {
                                file = actions.mediafile;
                            }
                            hls_file = ea.getItem(actions, 'hls_url', '');
                            if (file == '' && hls_file == '') {
                                if (typeof ad != u && typeof ad.video_url != u && ad.video_url != "") {
                                    file = ad.video_url;
                                }
                                hls_file = ea.getItem(ad, 'video_hls_url', '');
                            }
                            if (file == '' && hls_file == '') {
                                /* we still log the impression... then adv had to respond with valid data!! */
                                const aItem = ea.adCals[i];
                                aItem.data = json;
                                aItem.plugin = 'videoslider';
                                ea.logImp(ob.pl.itemId, 'video', '', aItem);
                                ob.pl.sendNotifications(actions.impression, 'impression');
                                ob.hide();
                                return;
                            }

                            let poster = '';
                            let screenshot = adMoxyCtrl.getItem(ad, "screenshot", "");
                            if (screenshot != "") {
                                poster = ` poster="${screenshot}" `;
                                ob.hasPoster = true;
                            }
                            tools.append('body', `<div id="notifications_${playerid}" style="width:0px;height:0px;padding:0px;margin:0px"></div>`);
                            tools.append(node, `<video id="${ob.sTag}_player" style="${pWidth != '' ? `width:${pWidth};` : ''}${pHeight != '' ? `height:${pHeight};` : ''}" muted="muted" preload="auto" ${poster} src="" autoplay webkit-playsinline playsinline></video>`);
                            let hls_running = false;

                            if (!ob.aSet.interstitial) {
                                tools.hide(`#${ob.sTag}`);
                            }
                            ea.video.LoadVideo(`${ob.sTag}_player`, file, hls_file, function (hashls, hls) {
                                if (hashls) {
                                    if (hls != null) {
                                        ob.hls = hls;
                                        hls_running = true;
                                    }
                                }
                            });

                            let open = () => {
                                let url = ea.getItem(ad, 'destinationurl', '');
                                if (actions['clickthrough_url'] != '') {
                                    url = actions['clickthrough_url'];
                                }
                                if (url != '') {
                                    const uri = `act=logclick&xref=${ad['hash']}`;
                                    ea.request('logclick', uri, 0, {
                                        result: function (rdata) {
                                        }
                                    });
                                } else {
                                    url = `${adMoxyCtrl.ctrlSettings.ctrl_domain}/click.go?xref=${ad['hash']}`;
                                }
                                if (actions['clickthrough_tracking'].length > 0) {
                                    ob.pl.sendNotifications(actions['clickthrough_tracking'], 'clicktrack');
                                }
                                ob.pl.open(url);
                                let aItem = ea.adCals[i];
                                aItem.data = ad;
                                aItem.plugin = 'videoslider';
                                ea.bkLog('click', i, { isiframe: 0 }, aItem);
                            };

                            let run = () => {

                                ob.running = true;
                                let isplaying = false;



                                ob.pl.player = tools.getnode(`#${ob.sTag}_player`);

                                let btn = tools.getnode(`#btn_mute_videoslider_${i}`);
                                btn.addEventListener('click', function () {
                                    try {
                                        let m = ob.pl.player.muted;
                                        ob.pl.player.muted = !m;
                                        if (!m) {
                                            btn.classList.add("sldr_mute");
                                        } else {
                                            btn.classList.remove("sldr_mute");
                                        }
                                    } catch (e) {
                                    }
                                });

                                if (ob.aSet.use_close_btn == 0) {
                                    tools.hide(`#btn_close_videoslider_${i}`);
                                } else {
                                    tools.getnode(`#btn_close_videoslider_${i}`).addEventListener('click', (e) => {
                                        e.stopImmediatePropagation();
                                        if (!ob.cntRunning) {
                                            if (ob.aSet.ff_action == 1) {
                                                if (sessionStorage.getItem("sldr" + ob.itemId) === null) {
                                                    open();
                                                }
                                            }
                                            ob.hide(true);
                                        }
                                    });
                                }

                                tools.remove(`click_${ob.pl.playerid}`);
                                const s = `<div id="click_${ob.pl.playerid}" style="position:absolute;z-index:1000;cursor:pointer;left:0px;top:30px;width:100%;height:100%"></div>`;
                                tools.append(ob.pl.playerNode, s);
                                tools.getnode(`#click_${ob.pl.playerid}`).addEventListener('click', function (e) {

                                    e.stopImmediatePropagation();
                                    if (!isplaying) { /* some mobile browsers dont autoplay thus we play on first click */
                                        ob.pl.player.play();
                                        return;
                                    }
                                    ob.pl.player.pause();
                                    open();
                                    setTimeout(function () {
                                        isplaying = false;
                                    }, 1000); /* long enough to be sure it will stay like this */


                                });

                                if (!ob.hasPoster) {
                                    ob.pl.player.addEventListener('canplay', function () {
                                        ob.setwh();
                                    });
                                } else {
                                    ob.setwh();
                                }

                                let events = actions.trackingevents;
                                let duration = 0;

                                ob.pl.player.addEventListener('timeupdate', (e) => {

                                    let time = parseInt(e.target.currentTime);
                                    isplaying = true;
                                    if (duration == 0) {
                                        duration = parseInt(e.target.duration);
                                    }
                                    let d = hls_running && e.target.duration > duration ? 30 : parseInt(e.target.duration);
                                    let firtsQuartile = (d / 4);
                                    let midPoint = (d / 2);
                                    let thirdQuartile = (firtsQuartile + midPoint);

                                    if (typeof events.start != u && events.start.done == false) {
                                        events.start.done = true;
                                        ob.pl.sendNotifications(events.start.items, 'start');
                                    }
                                    if (typeof events.progress != u) {
                                        let item;
                                        for (let ia = 0; ia < events.progress.items.length; ia++) {
                                            item = events.progress.items[ia];
                                            if (item.done == false) {
                                                if (item.offset <= time) {
                                                    events.progress.items[ia].done = true;
                                                    const items = [];
                                                    items.push(item.url);
                                                    ob.pl.sendNotifications(items, 'progress');
                                                }
                                            }
                                        }
                                    }
                                    if (time >= firtsQuartile && time < (firtsQuartile + 1)) {
                                        if (typeof events.firstquartile != u && events.firstquartile.done == false) {
                                            events.firstquartile.done = true;
                                            ob.pl.sendNotifications(events.firstquartile.items, 'firstquartile');
                                        }
                                    } else if (time >= midPoint && time < (midPoint + 1)) {
                                        if (typeof events.midpoint != u && events.midpoint.done == false) {
                                            events.midpoint.done = true;
                                            ob.pl.sendNotifications(events.midpoint.items, 'midpoint');
                                        }
                                    } else if (time >= thirdQuartile && time < (thirdQuartile + 1)) {
                                        if (typeof events.thirdquartile != u && events.thirdquartile.done == false) {
                                            events.thirdquartile.done = true;
                                            ob.pl.sendNotifications(events.thirdquartile.items, 'thirdquartile');
                                        }
                                    }


                                    if (!ob.pl.bImplogged) {
                                        ob.pl.bImplogged = true;
                                        let a = ea.adCals[i];
                                        a.data = json;
                                        a.plugin = 'videoslider';
                                        ea.logImp(ob.pl.itemId, 'video', '', a);
                                        ob.pl.sendNotifications(actions.impression, 'impression');
                                        let url = ea.getItem(json, "imp_trackingurl", "");
                                        if (url != '') {
                                            tools.append("body", `<img width="0" height="0" src="${url}"/>`);
                                        }
                                    }


                                    if (ob.aSet.use_close_btn == 1) {
                                        if (time <= (ob.aSet.counter_seconds + 2)) {
                                            if (time >= ob.aSet.counter_seconds || ob.aSet.counter_seconds == 0) {
                                                tools.html(`#btn_close_videoslider_${i}`, "Close ad ×");
                                                if (ob.aSet.display_counter == 0) {
                                                    tools.show(`#btn_close_videoslider_${i}`);
                                                }
                                                ob.cntRunning = false;
                                            } else {
                                                if (ob.aSet.display_counter == 1) {
                                                    tools.html(`#btn_close_videoslider_${i}`, "" + (ob.aSet.counter_seconds - time));
                                                } else {
                                                    tools.hide(`#btn_close_videoslider_${i}`);
                                                }
                                                ob.cntRunning = true;
                                            }
                                        }
                                    }
                                });
                                ob.pl.player.addEventListener("ended", (e) => {
                                    if (typeof events.complete != u) {
                                        ob.pl.sendNotifications(events.complete.items, 'complete');
                                    }
                                    hide();
                                });
                                setTimeout(() => { /* in case of streaming hls it will never end thus we limit that to 30 sec */
                                    if (ob.running) {
                                        hide();
                                    }
                                }, 30000);
                            };

                            let hide = function () {
                                setTimeout(function () {
                                    if (ob.aSet.interstitial) {
                                        tools.slideDown(`#${ob.sTag}`, 1000, function () {
                                            ob.hide();
                                        });
                                    } else {
                                        ob.hide();
                                    }
                                }, 2000);
                            };
                            if (ob.aSet.interstitial) {
                                tools.slideUp(`#${ob.sTag}`, 1000, function () {
                                    run();
                                });
                            } else {


                                run();
                            }
                        });
                    });
                }
            },
            init: function (iItem, aSett) {
                let ob = this;

                if (ob.isInitialized) {
                    return;
                }

                if (typeof aSett.carousel == 'object') {
                    ob.IsCarousel = true;
                    ob.CarouselSettings = aSett.carousel;
                    aSett = aSett.slider;
                }


                let ea = ob.ea;
                let tools = ob.tools;
                ob.itemId = iItem;

                ob.sTag = `vl_${iItem}`;

                if (!ob.IsCarousel) {
                    ob.interStitial = aSett.interstitial || false;

                    if (ob.interStitial) {
                        if (ea.interStitalRunning || ea.interStitalWasRunning) {
                            return false;
                        }
                    }
                }

                ob.isInitialized = true;
                let pos_css = 'right:10px;z-index:1000;';
                let pos_h_css = 'float:right;';

                if (ob.interStitial) {
                    aSett.display = aSett.display || 'fullscreen';
                    pos_css = 'position:fixed;top:calc(50%);left:calc(50%);transform:translate(-50%, -50%);'; /* good for original size of video */
                    if (aSett.display == 'fullscreen') {
                        pos_css = 'position:fixed;top:0px;left:0px;width:calc(100%);height:calc(100%);z-index:10000';
                    }
                    pos_h_css = 'bottom: 0px;';
                }
                if (!ea.videoslider.cssLoaded) {
                    let sDomain = ea.getItem(ea.ctrlSettings, "ctrl_domain", "");
                    if (sDomain != "") {
                        ea.videoslider.cssLoaded = true;
                        tools.append('head', `<link rel="stylesheet" href="${sDomain}/static.go?type=css&file=slider">`);
                    }
                }


                let classname = '';

                if (!ob.interStitial) {


                    pos_css = '';
                    pos_h_css = '';
                    let arr = ["left_left", "left_bottom", "left_right", "right_right", "right_bottom", "right_left", "right_corner", "right_top_right_top", "middle_top_middle_top",
                        "left_top_left_top", "right_top_right_bottom", "middle_top_middle_bottom", "left_top_left_bottom", "right_bottom_right_top", "middle_bottom_middle_top", "left_bottom_left_top"];
                    let pos = ea.getItem(aSett, 'position', '');
                    if (pos == 'bottom_left') {
                        pos = 'left_bottom';
                    }
                    if (pos == 'bottom_right') {
                        pos = "right_bottom";
                    }
                    if (arr.indexOf(pos) < 0) {
                        pos = "right_bottom";
                    }
                    classname = `sldr_${pos}`;
                    ob.ClassName = classname;
                }
                tools.remove(`[id^=${ob.sTag}]`);
                const posType = (document.compatMode == 'CSS1Compat') ? "fixed" : "absolute";
                tools.append('head', `<style id="${ob.sTag}_css">#${ob.sTag}:not(.fullscreen){position: ${posType};} #${ob.sTag} { font-family: Arial, Helvetica, sans-serif; font-size:12px; ${pos_css} background-color: #000000; border-top-right-radius: 5px; border-top-left-radius: 5px; box-shadow: 2px 2px 2px #000000; z-index:5000; padding: 0px; margin:0px; border:1px #000000 solid; border-spacing:1px; background-color:#000000;${pos_css}${pos_h_css} text-align: left;${ob.interStitial ? (ea.abDetected ? '' : 'display:none;') : ''}} #${this.sTag} a,#${this.sTag} a:link,#slider strong { text-decoration:none; color: black; font-size:12px; } #btn_close_videoslider_${iItem}{float: right; cursor: pointer;} #close_videoslider_${iItem}_txt{float: right;color:#ffffff; font-size:13px;padding-top:2px; padding-right:5px;margin: 2px;} </style>`);
                if (aSett.interstitial) {
                    tools.append('body', `<div id="${this.sTag}_bg" style="z-index:5000;top:0px;left:0px;padding:0px;margin:0px;background:#000;opacity: 0.8;filter: alpha(opacity = 80);position:fixed;display:none;width:100%;height:calc(100vh);"></div>`);
                    tools.on(`#${this.sTag}`, 'click', function (e) {
                        ob.hide();
                    });
                }
                tools.append('body', `<div id="${ob.sTag}"${!ob.interStitial ? ` class="${classname} exc-pp" style="display:none"` : ' class="exc-pp" '} onmouseover="adMoxyCtrl.videoslider.skipreload=true;" onmouseout="adMoxyCtrl.videoslider.skipreload=false;"><div id="${ob.sTag}_content"></div>${!ob.IsCarousel ? `<div class="sldr_volumeBtn sldr_mute" id="btn_mute_videoslider_${iItem}" style="bottom: 10px;z-index:2000"></div>` : ''}<div class="sldr_closeBtn" id="btn_close_videoslider_${iItem}"></div></div></div>`);


                if (typeof (aSett['reloadtime']) != 'undefined') {
                    let rtime = parseInt(aSett['reloadtime']);
                    if (rtime > 0) {
                        if (rtime < 5) {
                            rtime = 5;
                        }
                        ob.reloadTime = (rtime * 1000);
                    } else {
                        ob.reloadTime = 0;
                    }
                }
                ob.aSet = aSett;
                try {
                    if (aSett.closepop.id > 0) {
                        ea.loadPlugin(-1, "pop", function () {
                            const cb = function () {
                                if (typeof eaPopn != 'undefined') {
                                    const aItem = ea.adCals[iItem];
                                    const p = new eaPopn;
                                    p.isPopunder = false;
                                    p.url = p.genUrl(aItem, aSett.closepop.id);
                                    p.cookieTime = aSett.closepop.cap;
                                    p.clickHandler = [`#btn_close_videoslider_${iItem}`];
                                    p.ignoreList = [];
                                    p.cookieName = `popcap_${ob.aSet.closepop.id}`;
                                    p.xbtn = true;
                                    ob.aPop = p;
                                    if (p.canrun()) {
                                        p.init();
                                    }
                                } else {
                                    setTimeout("cb()", 500);
                                }
                            };
                            cb();
                        });
                    }
                } catch (e) {
                }

                return true;
            },

            checkParents: function (aNode, findNode) {
                const aParents = adMoxyCtrl.Tools.parents(aNode);

                let bFound = false;
                aParents.forEach(function (v, i) {
                    if (v == findNode) {
                        bFound = true;
                        return false;
                    }
                });
                return bFound;
            },
            checkChilds: function (aNode, findNode) {
                const aChilds = aNode.childNodes;
                let bFound = false;
                if (aChilds.length > 0) {
                    aChilds.forEach(function (v, i) {
                        if (v == findNode) {
                            bFound = true;
                            return false;
                        }
                    });
                }
                return bFound;
            },
            canFire: function (aNode) {
                let bRet = false;
                const ob = this;
                const tools = adMoxyCtrl.Tools;
                const ea = adMoxyCtrl;
                try {
                    ob.clickHandler.forEach(function (v, i) {
                        const a = tools.getnode(v);
                        if (a == aNode) {
                            bRet = true;
                        } else {
                            const fNodes = tools.getnodes(v);
                            fNodes.forEach(function (fNode, icnt) {
                                if (fNode == aNode) {
                                    bRet = true;
                                    return false;
                                } else {
                                    if (ob.checkParents(aNode, fNode)) {
                                        bRet = true;
                                        return false;
                                    } else if (ob.checkChilds(aNode, fNode)) {
                                        bRet = true;
                                        return false;
                                    }
                                }
                            });
                        }
                        if (!bRet) {
                            return false;
                        }
                    });
                } catch (e) {
                }
                if (bRet) {
                    if (aNode.nodeName == 'HTML') { /* never click on whitespace */
                        bRet = false;
                    } else {
                        try {
                            ob.ignoreList.forEach(function (v, i) {
                                const fNodes = tools.getnodes(v);
                                fNodes.forEach(function (fNode, icnt) {
                                    if (fNode == aNode) {
                                        bRet = false;
                                        return false;
                                    } else if (v != 'body' && ob.checkParents(aNode, fNode)) {
                                        bRet = false;
                                        return false;
                                    }
                                });
                                if (bRet == false) {
                                    return false;
                                }
                            });
                        } catch (_e) {
                        }
                    }
                    if (!bRet) {
                        ea.debug("Interstitial cancelled");
                    }
                }
                return bRet;
            },
        };
    },
};adMoxyCtrl.native_bar = {
    getVersion: function () {
        return "1.5";
    },
    aFlt: [],
    display: function (iItem, json) {
        this.aFlt[iItem] = new this.float(iItem, json);
        this.aFlt[iItem].init();
        this.aFlt[iItem].run();
    },
    float: function (iItem, json) {
        return {
            sTag: "",
            settings: {},
            imgHwd: [],
            removedItems: 0,
            iItem: iItem,
            json: json,
            clear: function () {
                const t = adMoxyCtrl.Tools;
                t.remove(`#${this.sTag}`);
                t.remove(`#css_${iItem}`);
            },
            setpos: function () {
                const ob = this;
                const t = adMoxyCtrl.Tools;
                let dh = t.height(`#${ob.sTag}`);
                const wh = t.height(window);
                if (dh > wh) {
                    t.getnodes(`[id^="${ob.sTag}_img_"]`).forEach(function (v, k) {
                        if (dh > wh) {
                            if (t.isvisible(v)) {
                                t.hide(v);
                                dh = t.height(`#${ob.sTag}`);
                                ob.removedItems++;
                            }
                        }
                    });
                } else {
                    if (ob.removedItems > 0) {
                        let bdone = false;
                        t.getnodes(`[id^="${ob.sTag}_img_"]`).forEach(function (v, k) {
                            if (dh < wh && !bdone) {
                                if (!t.isvisible(v)) {
                                    t.show(v);
                                    dh = t.height(`#${ob.sTag}`);
                                    ob.removedItems--;
                                    dh = t.height(`#${ob.sTag}`);
                                    if (dh > wh) {
                                        t.hide(v);
                                        dh = t.height(`#${ob.sTag}`);
                                        ob.removedItems++;
                                        bdone = true;
                                    }
                                }
                            }
                        });
                    }
                }
                switch (this.settings.position) {
                    case "top_left": {
                        const i = this.settings.topmargin;
                        t.css(`#${this.sTag}`, { "top": `${i}px`, "left": "0px" });
                        break;
                    }
                    case "top_right": {
                        const i = this.settings.topmargin;
                        t.css(`#${this.sTag}`, { "top": `${i}px`, "right": "0px" });
                        break;
                    }
                    case "right_middle": {
                        const i = (wh / 2 - (dh / 2));
                        t.css(`#${this.sTag}`, { "top": `${i}px`, "right": "0px" });
                        break;
                    }
                    case "left_middle": {
                        const i = (wh / 2 - (dh / 2));
                        t.css(`#${this.sTag}`, { "top": `${i}px`, "left": "0px" });
                        break;
                    }
                }
            },
            init: function () {
                this.settings = json.settings;
                this.sTag = `bar_${iItem}`;
                this.clear();
                const ob = this;
                if (adMoxyCtrl.isPreview) {
                    setTimeout(function () {
                        ob.clear();
                    }, (20 * 1000));
                }
                let scss1 = '';
                let scss2 = '';
                switch (json.settings.position) {
                    case "top_left":
                    case "left_middle":
                        scss1 = "float:left;";
                        scss2 = '';
                        break;
                    case "top_right":
                    case "right_middle":
                        scss1 = "float:right;";
                        scss2 = '';
                        break;
                }
                const css = json.settings.css;
                let sCloseHtml = '';
                let sXStyleAttr = '';
                if (adMoxyCtrl.isPreview) {
                    let sx = '';
                    switch (json.settings.position) {
                        case "top_right":
                        case "right_middle":
                            sx = 'top:0px;right:0px;';
                            break;
                    }
                    sCloseHtml = `<div style="position:fixed;${sx}"><a title="Close Preview" onclick="adMoxyCtrl.native_bar.aFlt[${iItem}].clear()">${adMoxyCtrl.sCloseButtonHtml}</a></div>`;
                    sXStyleAttr = ` id="css_${iItem}"`;
                }
                const sHtml = `<div id="${this.sTag}_lt" style="width:60px;background-color:${css['background_color']};border-radius:20px;${scss1}"></div>`;
                const t = adMoxyCtrl.Tools;
                t.append('body', `<div id="${this.sTag}" style="position:fixed;padding:0px;width:400px;min-width:400px;max-width:400px;transform:translate3d(0,0,0);z-index:1000;height:auto;">${sCloseHtml}${sHtml}</div>`);
                let sCss = `.${this.sTag}_itm{${scss2}width:300px;max-width:300px;display:-webkit-box; display: -moz-box; display: -webkit-flex; display: -ms-flexbox; display: flex;-webkit-box-align:end;-moz-box-align:end;-ms-flex-align:end;-webkit-align-items:flex-end;align-items:flex-end;cursor:pointer;border-radius:10px;-webkit-backdrop-filter:blur(20px);padding:10px;height:65px;box-sizing:border-box;}`;
                sCss += `.${this.sTag}_itm{margin-top:-50px;border:2px solid ${css['border_color']};border-radius:15px;padding:5px;background-color:${css['background_color']}}`;
                t.append('head', `<style${sXStyleAttr}>${sCss}</style>`);
            },
            getimg: function (ad) {
                return ad.imagepath;
            },
            remove: function (i) {
                const t = adMoxyCtrl.Tools;
                t.remove(`#${this.sTag}_img_${i}`);
            },
            run: function () {
                const ob = this;
                const t = adMoxyCtrl.Tools;
                let scss = '';
                switch (ob.settings.position) {
                    case "top_left":
                    case "left_middle":
                    case "bottom_left":
                        break;
                    case "top_right":
                    case "right_middle":
                    case "bottom_right":
                        scss = "left:90px;float:left;";
                        break;
                }
                json.items.forEach(function (ad, i) {
                    const id = `${ob.sTag}_img_${i}`;
                    const imgSrc = ob.getimg(ad);
                    t.append(`#${ob.sTag}_lt`, `<div id="${id}" style="padding:5px;"><img onerror="adMoxyCtrl.swap(this)" style="width:50px;height:50px;border-radius: 50%;display:block;" src="${imgSrc}"></div>`);
                    ob.imgHwd[i] = false;
                    t.hover(`#${id}`, function (ev) {
                        const cssCfg = ob.settings.css;
                        let s = `<div class="${ob.sTag}_itm" style="position:absolute;z-index:20000;${scss}" id="${ob.sTag}_itm_${i}"><div style=""><img onerror="adMoxyCtrl.swap(this)" style="width:50px;height:50px;border-radius: 50%;display:block;" src="${imgSrc}"/></div><div style="display:-webkit-box; display: -moz-box; display: -webkit-flex; display: -ms-flexbox; display: flex;-webkit-flex:1 1 auto;-ms-flex:1 1 auto;flex:1 1 auto;-webkit-box-align:end;-moz-box-align:end;-ms-flex-align:end;-webkit-align-items:flex-end;align-items:flex-end;height:100%;margin-left:10px;"><div style="max-width:300px;height:50px;display:-webkit-box; display: -moz-box; display: -webkit-flex; display: -ms-flexbox; display: flex;-webkit-box-pack:center;-moz-box-pack:center;-ms-flex-pack:center;-webkit-justify-content:center;justify-content:center;-webkit-box-direction:normal;-webkit-box-orient:vertical;-moz-box-direction:normal;-moz-box-orient:vertical;-webkit-flex-direction:column;-ms-flex-direction:column;flex-direction:column;-webkit-flex:1 1 auto;-ms-flex:1 1 auto;flex:1 1 auto;font-family:${cssCfg.font_family};color:${cssCfg.text_color};"><div style="overflow:hidden;font-size:13px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap;font-weight:bold;color:${cssCfg.title_color}">${ad.title}</div>`;
                        const sd = adMoxyCtrl.getItem(ad, 'description', '');
                        if (sd != '') {
                            s += `<div style="max-width:300px; overflow:hidden;font-size:12px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap;text-transform:none;color:${cssCfg.text_color}">${sd}</div>`;
                        }
                        s += `<div style="max-width:300px; overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap;color:${cssCfg.url_color}">${ad.displayurl}</div></div></div></div>`;
                        t.append(`#${id}`, s);
                        if (!ob.imgHwd[i]) {
                            ob.imgHwd[i] = true;
                            adMoxyCtrl.AddImplog(ad['hash']);
                            adMoxyCtrl.bkLog('view', iItem);
                            let sPx = '';
                            if (typeof ad.imp_trackingurl != 'undefined' && ad.imp_trackingurl != '') {
                                sPx += `<img width="0" height="0" src="${ad.imp_trackingurl}" border="0"/>`;
                            }
                            if (typeof ad.trackingevents != 'undefined') {
                                ad.trackingevents.forEach(function (e, i) {
                                    sPx += `<img width="0" height="0" src="${e.url}"/>`;
                                });
                            }
                            if (sPx != '') {
                                t.append('body', sPx);
                            }
                        }
                        t.getnode(`#${ob.sTag}_itm_${i}`).addEventListener('click', function (ev) {
                            ev.stopImmediatePropagation();
                            const url = `${adMoxyCtrl.getAdDomain()}/click.go?xref=${ad.hash}`;
                            adMoxyCtrl.open(url);
                            adMoxyCtrl.bkLog('click', iItem);
                            return false;
                        });
                    }, function (ev) {
                        t.remove(`#${ob.sTag}_itm_${i}`);
                    });
                });
                ob.setpos();
                window.addEventListener('resize', function () {
                    ob.setpos();
                });
                window.addEventListener('scroll', function () {
                    ob.setpos();
                });
            },
            makeId: function (iMax) {
                let t = "";
                const s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
                for (let i = 0; i < iMax; i++) {
                    t += s.charAt(Math.floor(Math.random() * s.length));
                }
                return t;
            }
        };
    },
};adMoxyCtrl.creator_widget = {
    Widgets: [],
    getVersion: function () {
        return "1.0";
    },

    reload: function (iItem) {
        const aItem = adMoxyCtrl.adCals[iItem];
        aItem.loaded = false;
        try {
            delete aItem.data;
            delete aItem.loaded;
            delete aItem.btype;
            delete aItem.state;
            delete aItem.settings;
        } catch (e) {
        }
        aItem.reload = 1;
        aItem.state = 0;
        adMoxyCtrl.run();
    },


    display: function (iItem, json) {
        const aItem = adMoxyCtrl.adCals[iItem];
        const display = aItem['display'];
        const selector = `#${display}`;
        const ob = this;
        const exec = function () {
            const o = new adMoxyCtrl.creator_widget.ob;
            o.containerId = `car_${display}`;
            o.itemId = iItem;
            ob.Widgets[iItem] = o;
            o.run(selector, json, 1);
        };
        const t = adMoxyCtrl.Tools;
        t.getnodes(selector).forEach(function (node, i) {
            if (node.getAttribute('run') != '1' || adMoxyCtrl.getItem(aItem, 'reload', 0) == 1) {
                delete aItem.reload;
                if (adMoxyCtrl.abDetected) {
                    t.getnode(selector).removeAttribute("style");
                }
                if (!t.isvisible(selector)) {
                    if (!adMoxyCtrl.abDetected) {
                        if (adMoxyCtrl.getItem(aItem, 'isflt', 0) != 1 && !adMoxyCtrl.isPreview) {
                            adMoxyCtrl.debug(`AdTag ${display} is not visible, abort loading`);
                            bExit = true;
                            return true;
                        }
                    } else {
                        adMoxyCtrl.debug(`AdTag ${display} is not visible, probably because the active adblocker`);
                    }
                }
                t.attr(node, 'run', '1');
                if (adMoxyCtrl.lazyLoading && !adMoxyCtrl.isInFold(node) && typeof Waypoint == 'function') {
                    const waypoint = new Waypoint({
                        element: node,
                        handler: function (direction) {
                            exec();
                            this.destroy();
                        },
                        offset: 'bottom-in-view'
                    });
                } else {
                    exec();
                }
                Bfound = true;
                return false;
            }
        });
    },

    scroll: function (i, d) {
        this.Widgets[i].btnClicked = false;
        this.Widgets[i].scroll(d);
    },
    lc: function (i, id, px) {
        this.Widgets[i].lc(id, px);
    },
    openAbout: function (i, id) {
        const ad = this.Widgets[i].items[id];
        let uri = `https://${adMoxyCtrl.getAdDomain()}/about.go`;
        if (ad.hash != "") {
            uri += `?xref=${ad.hash}`;
        }
        window.open(uri);
    },
    showAbout: function (sid) {
        const n = document.getElementById(sid);
        if (n) {
            n.style.display = 'block';
            setTimeout(function () {
                n.style.display = 'none';
            }, 5000);
        }
    },
    getCss: function (settings) {
        if (settings == null) {
            settings = { css: {} };
        }
        const css = settings.css;
        const orientation = adMoxyCtrl.getItem(settings, 'orientation', 'portrait');

        let aspect_ratio = '1/1';
        if (orientation == 'landscape') {
            aspect_ratio = '16/9';
        } else if (orientation == 'portrait') {
            aspect_ratio = '9/16';
        }
        if (typeof css.background_color != 'string' || css.background_color == '') {
            css.background_color = "";
        }
        if (typeof css.border_color != 'string' || css.border_color == '') {
            css.border_color = "#000000";
        }
        if (typeof css.title_color != 'string' || css.title_color == '') {
            css.title_color = "#ffffff";
        }
        if (typeof css.text_color != 'string' || css.text_color == '') {
            css.text_color = "#ffffff";
        }

        if (typeof css.font_family != 'string' || css.font_family == '') {
            css.font_family = "Verdana,sans-serif";
        }
        if (typeof css.fontsize != 'number' || css.fontsize <= 0) {
            css.fontsize = 12;
        }
        const bgColor = css.background_color != '' ? `background-color: ${css.background_color};` : '';
        const s_css = `.carousel-container .carousel_list {
    display: flex;
    transition: transform 0.3s ease;
    gap: 10px;
    width: 100%;
}
.carousel-container {
    display: flex;
    align-items: center;
    overflow: hidden;
    width: 100%;
    margin: auto;
    position: relative;
    ${bgColor}
}
.carousel-container .nav-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background-color: #444950;
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    cursor: pointer;
    z-index: 10;
}
.carousel-container .nav-button:hover {
    background-color: #828282;
}
.carousel-container .nav-button:active {
    background-color: #444950;
}
.carousel-container .left-nav {
    left: 10px;
}
.carousel-container .right-nav {
    right: 10px;
}
.carousel-container .item {
    display: inline-block;
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    min-width: 140px;
    margin-left: auto;
    margin-right: auto;
}
.carousel-container .item.portrait {
    aspect-ratio: 9 / 16 !important;
    min-width: calc(15%);
}
.carousel-container .item.landscape {
    aspect-ratio: 16/9 !important;
    min-width: calc(25%);
}
.carousel-container .item.square {
    aspect-ratio: 1/1 !important;
}
.carousel-container .item {
    max-width: calc(100vw);
    max-height: calc(100vh);
}
.carousel-container .item img {
    height: calc(100%);
    min-width: calc(100%);
    object-fit: contain;
    transition: transform 0.3s ease;
}
.carousel-container .item img:hover {
    transform: scale(1.1);
}
.carousel-container .creator_caption {
    position: absolute;
    font-size: ${css.fontsize} px;
    z-index: 1;
    bottom: 0;
    width: 100%;
    font-family: ${css.font_family};
    padding: 16px;
    white-space: initial;
    box-sizing: border-box;
}
.carousel-container .creator_caption:after {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    content: \\;
    z-index: -1;
    height: 106px;
    display: block;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%);
}
.carousel-container .creator_caption .creator_display-name {
    font-weight: 700;
    line-height: 24px;
    color: ${css.title_color};
    margin: 0;
}
.carousel-container .creator_caption .creator_description {
    margin: 0;
    width: 100%;
    word-wrap: break-word;
    word-break: break-word;
    color: ${css.text_color};
    text-decoration: none;
    overflow: hidden;
    display: inline-block;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}
.carousel-container {
    container-type: inline-size;
}
@container (min-width: 1024px) {
    .item.portrait { min-width: calc(10%) !important; }
    .item.landscape { min-width: calc(20%) !important; }
}
@container (max-width: 800px) {
    .item.portrait { min-width: calc(20%) !important; }
    .item.landscape { min-width: calc(40%) !important; }
}
@container (max-width: 400px) {
    .item.portrait { min-width: calc(30%) !important; }
    .item.landscape { min-width: calc(50%) !important; }
}`;

        return `<style>${s_css}</style>`;

    },

    ob: function () {
        return {
            items: [],
            log: [],
            cnt: 0,
            index: 0,
            itemWidth: 0,
            itemMargin: 10,
            use_btns: 0,
            nodes: [],
            lastClicked: 0,
            hovering: false,
            hasTouch: false,
            dragged: false,
            containerId: "",
            orientation: "portrait",
            itemId: 0,
            btnClicked: false,
            lastInView: false,
            innerWidth: 0,
            innerHeight: 0,
            nodeWidth: 0,
            nodeHeight: 0,
            skip_css: false,
            last: Date.now(),

            run: function (nodeid, json) {
                const ob = this;
                const items = json.items;
                ob.items = items;
                let btn = adMoxyCtrl.getItem(json, 'settings.carousel', 0);
                const aItem = adMoxyCtrl.adCals[ob.itemId];
                if (typeof aItem.nsettings == 'object') {
                    const set = aItem.nsettings;
                    if (typeof set.carousel_mode == 'boolean') {
                        btn = set.carousel_mode;
                    }
                    if (typeof set.skip_css == 'boolean') {
                        ob.skip_css = set.skip_css;
                    }
                }
                ob.orientation = adMoxyCtrl.getItem(json, 'settings.orientation', 'portrait');
                const hide_title = adMoxyCtrl.getItem(json, 'settings.hide_title', false);
                const hide_description = adMoxyCtrl.getItem(json, 'settings.hide_description', false);
                ob.use_btns = btn;
                ob.hasTouch = ('ontouchend' in document);
                let s = `<div class="carousel-container" id="${ob.containerId}" onmouseenter="adMoxyCtrl.creator_widget.Widgets[${ob.itemId}].hover(true)" onmouseleave="adMoxyCtrl.creator_widget.Widgets[${ob.itemId}].hover(false)">`;
                let sPx = '';
                let AboutGlobal = false;
                const total = items.length;
                if (total > 0) {
                    if (ob.get(items[0], 'about', 0) == 1) {
                        AboutGlobal = true;
                        if (total > 1) {
                            if (ob.get(items[1], 'about', 0) == 1) {
                                AboutGlobal = false;
                            }
                        }
                    }
                }

                if (AboutGlobal) {
                    const key = `${ob.itemId}_0_about`;
                    s += `<div style="position:absolute;top:0px"><img id="0_icn" onmouseover="adMoxyCtrl.creator_widget.showAbout('${key}')" onclick="adMoxyCtrl.creator_widget.showAbout('${key}');return false;"  style="position:absolute;top:2px;left:2px;z-index:10000;border-radius:50%;background:#ffffff;width:15px;height:15px;cursor:pointer" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAACXBIWXMAAAsTAAALEwEAmpwYAAABhUlEQVR4nM2WsUoDQRRFj8mioD8gWEXxCyyMsbHVT7CMJD8giJ2Fxn+wtNIUYiEB61jZRLQQBC2SlEkhgooWrgy8DcO6m3kzWnjhQQj3cnfe3Jk38I9QACrAIdAErqROgQawIpxgREAd6AOxo/pATTReWADuFAZxqm6Bea3JKjAMMImlhtJq50o0Jg+OFQ+AUp5JpGzXETAhmv0xvBugmGVUV7Zmw9IsObhbaZOCMl2mLoAZYAo4dnB76ehXPDf8A3hVcsu2UUMh+ASugTPg0eOjzD6O0HSQW8BcKjgtpZG5QUZoO8jPwBewY2mqSqO2j1FSpsUJtkOMXK1Lat3SnIe0ThOGd2Ba+JPAS0gYNPG+tPhrHqkr+x7YPYu/qzTpZs2qmkNkJ25TTv2TQ2OS+QORzJM80T0wa/EX5TrK43fyLlVkaI0bE2/yMV05V0Fjwg7GwGOz4wwT845QoSTzxNeko1lJGkWZJz1luqrj9kQDE09zFg6AE+u5ZX6b/5Z/+9z6U3wDO7KJQlUPB4IAAAAASUVORK5CYII=">`;
                    s += `<div id="${key}" style="display:none;background:#000000 !important;position:absolute;top:1px;left:18px;height:14px;width:66px;color:#ffffff !important;border:1px solid #FFFFFF;text-align: center;font-family:sans-serif;font-size:10px;line-height:15px;border-radius:5px;z-index:1000;cursor:pointer" onclick="adMoxyCtrl.creator_widget.openAbout(${ob.itemId},0); return false">About this Ad</div></div>`;
                }
                if (btn == 1) {
                    s += `<button class="nav-button left-nav" id="${ob.containerId}_leftBtn" style="display:none" onclick="adMoxyCtrl.creator_widget.scroll(${ob.itemId},-1)">&#9664;</button>`;
                }
                s += `<div class="carousel_list ${ob.orientation}" id="${ob.containerId}_carousel">`;

                items.forEach(function (ad, i) {
                    const sImg = ad.imagepath;
                    if (typeof ad.trackingevents != 'undefined') {
                        ad.trackingevents.forEach(function (u, ia) {
                            sPx += `<img style="position:absolute;top:-100px" width="0" height="0" src="${u.url}"/>`;
                        });
                    }
                    const sp = ob.get(ad, 'imp_trackingurl', '');
                    if (sp != "") {
                        sPx += `<img style="position:absolute;top:-100px" width="0" height="0" src="${sp}"/>`;
                    }
                    let row = `<div class="item ${ob.orientation}" log="0" itemid="${i}">`;
                    let url = ob.get(ad, 'destinationurl', '');
                    let oc = '';
                    const hash = ob.get(ad, 'hash', '');
                    if (hash != '') {
                        if (url == '') {
                            url = `https:${adMoxyCtrl.getAdDomain()}/click.go?xref=${hash}`;
                        } else {
                            if (url.search('{tracking}') == -1) {
                                oc = ` onclick="return adMoxyCtrl.creator_widget.lc(${ob.itemId},${i},true)"`;
                            } else {
                                oc = ` onclick="adMoxyCtrl.creator_widget.lc(${ob.itemId},${i},false) return false"`;
                            }
                        }
                    }
                    row += `<a href="${url}" target="_blank" title="${ob.get(ad, 'description', '')}" ${oc}>`;
                    row += `<img class="creator_media-thumbnail" src="${sImg}"/>`;
                    if (!hide_title && !hide_description) {
                        row += '<div class="creator_caption">' + (!hide_title ? `<p class="creator_display-name">${ob.get(ad, 'title', 'Item ' + i)}</p>` : '') + (!hide_description ? `<p class="creator_description">${ob.get(ad, 'description', '')}</p>` : '') + '</div>';
                    }
                    s += row + '</a></div>';
                });
                s += '</div>';

                if (btn == 1) {
                    s += `<button class="nav-button right-nav" id="${ob.containerId}_rightBtn" style="display:none" onclick="adMoxyCtrl.creator_widget.scroll(${ob.itemId},1)">&#9654;</button>`;
                }

                s += '</div>';
                if (sPx != '') {
                    s += sPx;
                }

                if (!ob.skip_css) {
                    const css = adMoxyCtrl.creator_widget.getCss(json.settings);
                    adMoxyCtrl.Tools.append("head", css);
                }
                const t = adMoxyCtrl.Tools;
                t.html(nodeid, s);
                ob.scroll(0);
                if (ob.use_btns === 1) {
                    const u = function () {
                        const n = document.querySelector(`#${ob.containerId}_carousel`).lastChild;
                        ob.lastInView = ob.isInFold(ob.nodes.length - 1, n, 1);
                        ob.updateBtns();
                        ob.checkImpLog();
                    };
                    document.querySelector(`#${ob.containerId}_carousel`).addEventListener('transitionend', u);

                    if (ob.hasTouch) {
                        ob.setTouchListener();
                    }
                    const k = function (event) {
                        if (ob.hovering) {
                            if (event.key === 'ArrowLeft') {
                                ob.btnClicked = true;
                                ob.scroll(-1);
                            } else if (event.key === 'ArrowRight') {
                                ob.btnClicked = true;
                                ob.scroll(1);
                            }
                        }
                    };
                    document.addEventListener('keydown', k);
                }
            },

            checkImpLog: function () {
                const ob = this;
                const items = ob.nodes;
                if (items) {
                    for (let i = 0; i < items.length; i++) {
                        const v = items[i];
                        if (v.getAttribute("log") == '0') {
                            const id = v.getAttribute("itemid");
                            if (ob.isInFold(id, v, 0)) {
                                v.setAttribute("log", "1");
                                ob.lv(id);
                            }
                        }
                    }
                }
            },
            isInFold: function (i, n) {
                const ob = this;
                try {
                    if (n) {
                        const rect = n.getBoundingClientRect();
                        const carousel = document.querySelector(`#${ob.containerId}`);
                        const rect2 = carousel.getBoundingClientRect();
                        if (rect.left >= rect2.left && rect.right <= rect2.right) {
                            return true;
                        }
                    }
                } catch (_e) {
                }
                return false;
            },

            updateBtns: function () {
                if (this.use_btns == 1) {
                    const ob = this;
                    document.getElementById(`${ob.containerId}_leftBtn`).style.display = ob.index === 0 || ob.dragged || ob.btnClicked ? 'none' : 'block';
                    document.getElementById(`${ob.containerId}_rightBtn`).style.display = ob.lastInView || ob.dragged || ob.btnClicked ? 'none' : 'block';
                }
            },

            lc: function (i, px) {
                const ob = this;
                if (ob.lastClicked > 0 && ob.lastClicked > Date.now() - 500) {
                    return false;
                }
                const hash = ob.items[i].hash;
                const url = `https://${adMoxyCtrl.getAdDomain()}/click.go?xref=${hash}`;
                if (px) {
                    const img = new Image();
                    img.width = "0";
                    img.height = "0";
                    img.src = `${url}&nr=1&pixel=1`;
                } else {
                    w.open(url);
                }
                return true;
            },
            lv: function (i) {
                const hash = this.items[i].hash;
                this.last = Date.now();
                this.cnt++;
                adMoxyCtrl.AddImplog(hash);
            },
            setTouchListener: function () {
                const ob = this;
                const carousel = document.getElementById(ob.containerId);
                let startX, endX;
                carousel.addEventListener('touchstart', (event) => {
                    startX = event.touches[0].clientX;
                });
                carousel.addEventListener('touchmove', (event) => {
                    endX = event.touches[0].clientX;
                });
                carousel.addEventListener('touchend', () => {
                    if (startX - endX > 5) {
                        ob.scroll(1);
                        ob.dragged = true;
                    } else if (endX - startX > 5) {
                        ob.scroll(-1);
                        ob.dragged = true;
                    }
                });
            },

            get: function (obj, fld, d) {
                return (obj[fld] != null && typeof obj[fld] === typeof d ? obj[fld] : d);
            },
            hover: function (hover) {
                const ob = this;
                const was = ob.hovering;
                ob.hovering = hover || false;
                if (!ob.hovering) {
                    if (ob.btnClicked || ob.dragged) {
                        ob.btnClicked = false;
                        ob.dragged = false;
                        ob.updateBtns();
                    }
                } else {
                    if (!was) {
                        ob.btnClicked = false;
                        ob.dragged = false;
                        ob.updateBtns();
                    }
                }
            },
            scroll: function (direction) {
                const ob = this;
                if (direction != 0) {
                    ob.lastClicked = Date.now();
                }
                const totalItems = ob.items.length;
                const scrollNode = document.querySelector(`#${ob.containerId}_carousel`);
                const lastnode = scrollNode.lastChild;
                ob.nodes = scrollNode.childNodes;
                const firstNode = ob.nodes[0];
                ob.itemWidth = firstNode.clientWidth;
                const fullwidth = ob.itemWidth * totalItems;
                ob.innerWidth = fullwidth;
                ob.nodeWidth = t.width(`#${ob.containerId}`);
                if (ob.index > totalItems - 1) {
                    ob.index = 0;
                }

                const infold = ob.isInFold(ob.nodes.length - 1, lastnode, 1);

                if (direction === 1 && ob.index < totalItems) {
                    ob.index++;
                } else if (direction === -1 && ob.index > 0) {
                    ob.index--;
                }
                const itemsVisible = ob.nodeWidth / ob.itemWidth;
                if (ob.index < 0) {
                    ob.index = 0;
                }
                let newPosition = ob.index * ob.itemWidth;
                let max = 0;

                if (direction == 1) {
                    max = (fullwidth - t.width(`#${ob.containerId}`)) + (ob.orientation == 'portrait' ? 0 : 100);

                    if (ob.lastInView) {
                        ob.index--;
                        return;
                    }
                    if (infold) {
                        return;
                    }
                    const chk = function () {
                        if (newPosition + ((ob.itemWidth / 100) * (ob.orientation == 'portrait' ? 10 : 80)) > max) {
                            /* newPosition = max; */
                            if (ob.orientation == 'portrait' && ob.index > ob.items.length - itemsVisible) {
                                /* ob.lastInView = true; */
                            } else {
                                if (ob.orientation != 'portrait') {
                                    newPosition = max;
                                }
                            }
                        }
                    };
                    if (newPosition > max) {
                        if (ob.index < ob.items.length - itemsVisible) {
                            newPosition = max;
                        } else {
                            if (!ob.lastInView) {
                                chk();
                            } else {
                                ob.index--;
                            }
                        }
                    } else {
                        chk();
                    }
                } else {
                    ob.lastInView = false;
                }
                document.querySelector(`#${ob.containerId}_carousel`).style.transform = `translateX(${-newPosition}px)`;
            }
        };
    }
};/*!
Waypoints - 4.0.1
Copyright © 2011-2016 Caleb Troughton
Licensed under the MIT license.
https://github.com/imakewebthings/waypoints/blob/master/licenses.txt
*/
! function() { "use strict";

    function t(n) { if (!n) throw new Error("No options passed to Waypoint constructor"); if (!n.element) throw new Error("No element option passed to Waypoint constructor"); if (!n.handler) throw new Error("No handler option passed to Waypoint constructor");
        this.key = "waypoint-" + e, this.options = t.Adapter.extend({}, t.defaults, n), this.element = this.options.element, this.adapter = new t.Adapter(this.element), this.callback = n.handler, this.axis = this.options.horizontal ? "horizontal" : "vertical", this.enabled = this.options.enabled, this.triggerPoint = null, this.group = t.Group.findOrCreate({ name: this.options.group, axis: this.axis }), this.context = t.Context.findOrCreateByElement(this.options.context), t.offsetAliases[this.options.offset] && (this.options.offset = t.offsetAliases[this.options.offset]), this.group.add(this), this.context.add(this), i[this.key] = this, e += 1 } var e = 0,
        i = {};
    t.prototype.queueTrigger = function(t) { this.group.queueTrigger(this, t) }, t.prototype.trigger = function(t) { this.enabled && this.callback && this.callback.apply(this, t) }, t.prototype.destroy = function() { this.context.remove(this), this.group.remove(this), delete i[this.key] }, t.prototype.disable = function() { return this.enabled = !1, this }, t.prototype.enable = function() { return this.context.refresh(), this.enabled = !0, this }, t.prototype.next = function() { return this.group.next(this) }, t.prototype.previous = function() { return this.group.previous(this) }, t.invokeAll = function(t) { var e = []; for (var n in i) e.push(i[n]); for (var o = 0, r = e.length; r > o; o++) e[o][t]() }, t.destroyAll = function() { t.invokeAll("destroy") }, t.disableAll = function() { t.invokeAll("disable") }, t.enableAll = function() { t.Context.refreshAll(); for (var e in i) i[e].enabled = !0; return this }, t.refreshAll = function() { t.Context.refreshAll() }, t.viewportHeight = function() { return window.innerHeight || document.documentElement.clientHeight }, t.viewportWidth = function() { return document.documentElement.clientWidth }, t.adapters = [], t.defaults = { context: window, continuous: !0, enabled: !0, group: "default", horizontal: !1, offset: 0 }, t.offsetAliases = { "bottom-in-view": function() { return this.context.innerHeight() - this.adapter.outerHeight() }, "right-in-view": function() { return this.context.innerWidth() - this.adapter.outerWidth() } }, window.Waypoint = t }(),
function() { "use strict";

    function t(t) { window.setTimeout(t, 1e3 / 60) }

    function e(t) { this.element = t, this.Adapter = o.Adapter, this.adapter = new this.Adapter(t), this.key = "waypoint-context-" + i, this.didScroll = !1, this.didResize = !1, this.oldScroll = { x: this.adapter.scrollLeft(), y: this.adapter.scrollTop() }, this.waypoints = { vertical: {}, horizontal: {} }, t.waypointContextKey = this.key, n[t.waypointContextKey] = this, i += 1, o.windowContext || (o.windowContext = !0, o.windowContext = new e(window)), this.createThrottledScrollHandler(), this.createThrottledResizeHandler() } var i = 0,
        n = {},
        o = window.Waypoint,
        r = window.onload;
    e.prototype.add = function(t) { var e = t.options.horizontal ? "horizontal" : "vertical";
        this.waypoints[e][t.key] = t, this.refresh() }, e.prototype.checkEmpty = function() { var t = this.Adapter.isEmptyObject(this.waypoints.horizontal),
            e = this.Adapter.isEmptyObject(this.waypoints.vertical),
            i = this.element == this.element.window;
        t && e && !i && (this.adapter.off(".waypoints"), delete n[this.key]) }, e.prototype.createThrottledResizeHandler = function() {
        function t() { e.handleResize(), e.didResize = !1 } var e = this;
        this.adapter.on("resize.waypoints", function() { e.didResize || (e.didResize = !0, o.requestAnimationFrame(t)) }) }, e.prototype.createThrottledScrollHandler = function() {
        function t() { e.handleScroll(), e.didScroll = !1 } var e = this;
        this.adapter.on("scroll.waypoints", function() {
            (!e.didScroll || o.isTouch) && (e.didScroll = !0, o.requestAnimationFrame(t)) }) }, e.prototype.handleResize = function() { o.Context.refreshAll() }, e.prototype.handleScroll = function() { var t = {},
            e = { horizontal: { newScroll: this.adapter.scrollLeft(), oldScroll: this.oldScroll.x, forward: "right", backward: "left" }, vertical: { newScroll: this.adapter.scrollTop(), oldScroll: this.oldScroll.y, forward: "down", backward: "up" } }; for (var i in e) { var n = e[i],
                o = n.newScroll > n.oldScroll,
                r = o ? n.forward : n.backward; for (var s in this.waypoints[i]) { var l = this.waypoints[i][s]; if (null !== l.triggerPoint) { var a = n.oldScroll < l.triggerPoint,
                        h = n.newScroll >= l.triggerPoint,
                        p = a && h,
                        u = !a && !h;
                    (p || u) && (l.queueTrigger(r), t[l.group.id] = l.group) } } } for (var d in t) t[d].flushTriggers();
        this.oldScroll = { x: e.horizontal.newScroll, y: e.vertical.newScroll } }, e.prototype.innerHeight = function() { return this.element == this.element.window ? o.viewportHeight() : this.adapter.innerHeight() }, e.prototype.remove = function(t) { delete this.waypoints[t.axis][t.key], this.checkEmpty() }, e.prototype.innerWidth = function() { return this.element == this.element.window ? o.viewportWidth() : this.adapter.innerWidth() }, e.prototype.destroy = function() { var t = []; for (var e in this.waypoints)
            for (var i in this.waypoints[e]) t.push(this.waypoints[e][i]); for (var n = 0, o = t.length; o > n; n++) t[n].destroy() }, e.prototype.refresh = function() { var t, e = this.element == this.element.window,
            i = e ? void 0 : this.adapter.offset(),
            n = {};
        this.handleScroll(), t = { horizontal: { contextOffset: e ? 0 : i.left, contextScroll: e ? 0 : this.oldScroll.x, contextDimension: this.innerWidth(), oldScroll: this.oldScroll.x, forward: "right", backward: "left", offsetProp: "left" }, vertical: { contextOffset: e ? 0 : i.top, contextScroll: e ? 0 : this.oldScroll.y, contextDimension: this.innerHeight(), oldScroll: this.oldScroll.y, forward: "down", backward: "up", offsetProp: "top" } }; for (var r in t) { var s = t[r]; for (var l in this.waypoints[r]) { var a, h, p, u, d, f = this.waypoints[r][l],
                    c = f.options.offset,
                    w = f.triggerPoint,
                    y = 0,
                    g = null == w;
                f.element !== f.element.window && (y = f.adapter.offset()[s.offsetProp]), "function" == typeof c ? c = c.apply(f) : "string" == typeof c && (c = parseFloat(c), f.options.offset.indexOf("%") > -1 && (c = Math.ceil(s.contextDimension * c / 100))), a = s.contextScroll - s.contextOffset, f.triggerPoint = Math.floor(y + a - c), h = w < s.oldScroll, p = f.triggerPoint >= s.oldScroll, u = h && p, d = !h && !p, !g && u ? (f.queueTrigger(s.backward), n[f.group.id] = f.group) : !g && d ? (f.queueTrigger(s.forward), n[f.group.id] = f.group) : g && s.oldScroll >= f.triggerPoint && (f.queueTrigger(s.forward), n[f.group.id] = f.group) } } return o.requestAnimationFrame(function() { for (var t in n) n[t].flushTriggers() }), this }, e.findOrCreateByElement = function(t) { return e.findByElement(t) || new e(t) }, e.refreshAll = function() { for (var t in n) n[t].refresh() }, e.findByElement = function(t) { return n[t.waypointContextKey] }, window.onload = function() { r && r(), e.refreshAll() }, o.requestAnimationFrame = function(e) { var i = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || t;
        i.call(window, e) }, o.Context = e }(),
function() { "use strict";

    function t(t, e) { return t.triggerPoint - e.triggerPoint }

    function e(t, e) { return e.triggerPoint - t.triggerPoint }

    function i(t) { this.name = t.name, this.axis = t.axis, this.id = this.name + "-" + this.axis, this.waypoints = [], this.clearTriggerQueues(), n[this.axis][this.name] = this } var n = { vertical: {}, horizontal: {} },
        o = window.Waypoint;
    i.prototype.add = function(t) { this.waypoints.push(t) }, i.prototype.clearTriggerQueues = function() { this.triggerQueues = { up: [], down: [], left: [], right: [] } }, i.prototype.flushTriggers = function() { for (var i in this.triggerQueues) { var n = this.triggerQueues[i],
                o = "up" === i || "left" === i;
            n.sort(o ? e : t); for (var r = 0, s = n.length; s > r; r += 1) { var l = n[r];
                (l.options.continuous || r === n.length - 1) && l.trigger([i]) } } this.clearTriggerQueues() }, i.prototype.next = function(e) { this.waypoints.sort(t); var i = o.Adapter.inArray(e, this.waypoints),
            n = i === this.waypoints.length - 1; return n ? null : this.waypoints[i + 1] }, i.prototype.previous = function(e) { this.waypoints.sort(t); var i = o.Adapter.inArray(e, this.waypoints); return i ? this.waypoints[i - 1] : null }, i.prototype.queueTrigger = function(t, e) { this.triggerQueues[e].push(t) }, i.prototype.remove = function(t) { var e = o.Adapter.inArray(t, this.waypoints);
        e > -1 && this.waypoints.splice(e, 1) }, i.prototype.first = function() { return this.waypoints[0] }, i.prototype.last = function() { return this.waypoints[this.waypoints.length - 1] }, i.findOrCreate = function(t) { return n[t.axis][t.name] || new i(t) }, o.Group = i }(),
function() { "use strict";

    function t(t) { return t === t.window }

    function e(e) { return t(e) ? e : e.defaultView }

    function i(t) { this.element = t, this.handlers = {} } var n = window.Waypoint;
    i.prototype.innerHeight = function() { var e = t(this.element); return e ? this.element.innerHeight : this.element.clientHeight }, i.prototype.innerWidth = function() { var e = t(this.element); return e ? this.element.innerWidth : this.element.clientWidth }, i.prototype.off = function(t, e) {
        function i(t, e, i) { for (var n = 0, o = e.length - 1; o > n; n++) { var r = e[n];
                i && i !== r || t.removeEventListener(r) } } var n = t.split("."),
            o = n[0],
            r = n[1],
            s = this.element; if (r && this.handlers[r] && o) i(s, this.handlers[r][o], e), this.handlers[r][o] = [];
        else if (o)
            for (var l in this.handlers) i(s, this.handlers[l][o] || [], e), this.handlers[l][o] = [];
        else if (r && this.handlers[r]) { for (var a in this.handlers[r]) i(s, this.handlers[r][a], e);
            this.handlers[r] = {} } }, i.prototype.offset = function() { if (!this.element.ownerDocument) return null; var t = this.element.ownerDocument.documentElement,
            i = e(this.element.ownerDocument),
            n = { top: 0, left: 0 }; return this.element.getBoundingClientRect && (n = this.element.getBoundingClientRect()), { top: n.top + i.pageYOffset - t.clientTop, left: n.left + i.pageXOffset - t.clientLeft } }, i.prototype.on = function(t, e) { var i = t.split("."),
            n = i[0],
            o = i[1] || "__default",
            r = this.handlers[o] = this.handlers[o] || {},
            s = r[n] = r[n] || [];
        s.push(e), this.element.addEventListener(n, e) }, i.prototype.outerHeight = function(e) { var i, n = this.innerHeight(); return e && !t(this.element) && (i = window.getComputedStyle(this.element), n += parseInt(i.marginTop, 10), n += parseInt(i.marginBottom, 10)), n }, i.prototype.outerWidth = function(e) { var i, n = this.innerWidth(); return e && !t(this.element) && (i = window.getComputedStyle(this.element), n += parseInt(i.marginLeft, 10), n += parseInt(i.marginRight, 10)), n }, i.prototype.scrollLeft = function() { var t = e(this.element); return t ? t.pageXOffset : this.element.scrollLeft }, i.prototype.scrollTop = function() { var t = e(this.element); return t ? t.pageYOffset : this.element.scrollTop }, i.extend = function() {
        function t(t, e) { if ("object" == typeof t && "object" == typeof e)
                for (var i in e) e.hasOwnProperty(i) && (t[i] = e[i]); return t } for (var e = Array.prototype.slice.call(arguments), i = 1, n = e.length; n > i; i++) t(e[0], e[i]); return e[0] }, i.inArray = function(t, e, i) { return null == e ? -1 : e.indexOf(t, i) }, i.isEmptyObject = function(t) { for (var e in t) return !1; return !0 }, n.adapters.push({ name: "noframework", Adapter: i }), n.Adapter = i }();
adMoxyCtrl.debugOn = false;
adMoxyCtrl.sRequestType='post';
adMoxyCtrl.bypassAb=false;
adMoxyCtrl.ctrlId=12337;
adMoxyCtrl.connectors ={1:{isproxy:0,type:"url",url:"//live.applzr.com/eactrl.go","isfailed":0}};
adMoxyCtrl.pluginInfo={"banner":{"name":"banner","version":7.9},"creator_widget":{"name":"creator_widget","version":1},"dyn_banner":{"name":"dyn_banner","version":1},"floater":{"name":"floater","version":4.7},"footer_code":{"name":"footer_code","version":1},"fpa":{"name":"fpa","version":4.9},"fxim_banner":{"name":"fxim_banner","version":1.4},"im":{"name":"im","version":4.4},"inpage_video":{"name":"inpage_video","version":1.2},"invideo":{"name":"invideo","version":4.7},"main":{"name":"ctrl","version":6.9},"native":{"name":"native","version":5.5},"native_bar":{"name":"native_bar","version":1.5},"native_webpush":{"name":"native_webpush","version":1.7},"pop":{"name":"pop","version":6.2},"reel":{"name":"reel","version":1},"skin":{"name":"skin","version":1},"tabs":{"name":"tabs","version":1.1},"tools":{"name":"tools","version":1.5},"video":{"name":"video","version":5.3},"video_carousel":{"name":"video_carousel","version":1},"videoslider":{"name":"videoslider","version":1.8}};adMoxyCtrl.lazyLoading=true;
adMoxyCtrl.lvJs=true;adMoxyCtrl.init();