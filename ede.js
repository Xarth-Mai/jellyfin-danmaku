// ==UserScript==
// @name         Jellyfin danmaku extension mini
// @description  Jellyfin弹幕插件
// @namespace    https://github.com/RyoLee
// @author       RyoLee
// @version      1.51.1
// @copyright    2022, RyoLee (https://github.com/RyoLee)
// @license      MIT; https://raw.githubusercontent.com/Izumiko/jellyfin-danmaku/jellyfin/LICENSE
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @updateURL    https://cdn.jsdelivr.net/gh/Izumiko/jellyfin-danmaku@gh-pages/ede.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/Izumiko/jellyfin-danmaku@gh-pages/ede.user.js
// @grant        GM_xmlhttpRequest
// @connect      *
// @match        *://*/*/web/index.html
// @match        *://*/web/index.html
// @match        *://*/*/web/
// @match        *://*/web/
// @match        https://jellyfin-web.pages.dev/
// ==/UserScript==
// noinspection CommaExpressionJS,JSPotentiallyInvalidUsageOfThis,JSUnresolvedReference

(async function () {
    'use strict';
    if (document.querySelector('meta[name="application-name"]').content !== 'Jellyfin') {
        return;
    }

    // ------ configs start------
    const isInTampermonkey = !(typeof GM_xmlhttpRequest === 'undefined');
    const isLocalCors = (!isInTampermonkey && document.currentScript?.src) ? new URL(document.currentScript?.src).searchParams.has("noCors") : false;
    const corsProxy = 'https://ddplay-api.930524.xyz/cors/';
    const apiPrefix = isInTampermonkey
        ? 'https://api.dandanplay.net'
        : isLocalCors
            ? `${window.location.origin}/ddplay-api`
            : corsProxy + 'https://api.dandanplay.net';
    const check_interval = 200;
    // 0:当前状态关闭 1:当前状态打开
    let danmaku_icons = ['comments_disabled', 'comment'];
    const search_icon = 'find_replace';
    const settings_icon = 'tune';
    const spanClass = 'xlargePaperIconButton material-icons ';
    const buttonOptions = {
        class: 'paper-icon-button-light',
        is: 'paper-icon-button-light',
    };
    const uiAnchorStr = 'pause';
    const uiQueryStr = '.btnPause';
    const mediaContainerQueryStr = "div[data-type='video-osd']";
    const mediaQueryStr = 'video';

    let itemId = '';

    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (_, url) {
        this.addEventListener('load', function () {
            if (url.endsWith('PlaybackInfo')) {
                const res = JSON.parse(this.responseText);
                itemId = res.MediaSources[0].Id;
            }
        });
        originalOpen.apply(this, arguments);
    };

    const displayButtonOpts = {
        title: '弹幕开关',
        id: 'displayDanmaku',
        onclick: () => {
            if (window.ede.loading) {
                showDebugInfo('正在加载,请稍后再试');
                return;
            }
            showDebugInfo('切换弹幕开关');
            window.ede.danmakuSwitch = (window.ede.danmakuSwitch + 1) % 2;
            window.localStorage.setItem('danmakuSwitch', window.ede.danmakuSwitch);
            document.querySelector('#displayDanmaku').children[0].className = spanClass + danmaku_icons[window.ede.danmakuSwitch];
            if (window.ede.danmaku) {
                window.ede.danmakuSwitch === 1 ? window.ede.danmaku.show() : window.ede.danmaku.hide();
            }
        },
    };

    const searchButtonOpts = {
        title: '搜索弹幕',
        id: 'searchDanmaku',
        class: search_icon,
        onclick: () => {
            if (window.ede.loading) {
                showDebugInfo('正在加载,请稍后再试');
                return;
            }
            showDebugInfo('手动匹配弹幕');
            reloadDanmaku('search');
        },
    };

    const settingButtonOpts = {
        title: '弹幕设置',
        id: 'danmakuSettings',
        class: settings_icon,
        onclick: () => {
            if (window.ede.loading) {
                showDebugInfo('正在加载,请稍后再试');
                return;
            }
            window.ede.logSwitch = (window.ede.logSwitch + 1) % 2;
            window.localStorage.setItem('logSwitch', window.ede.logSwitch);
            let logSpan = document.querySelector('#debugInfo');
            if (logSpan) {
                window.ede.logSwitch === 1 ? (logSpan.style.display = 'block') && showDebugInfo('开启日志显示') : (logSpan.style.display = 'none');
            }

            if (document.getElementById('danmakuModal')) {
                return;
            }
            const modal = document.createElement('div');
            modal.id = 'danmakuModal';
            modal.className = 'dialogContainer';
            modal.innerHTML = `
                <div class="dialog" style="padding: 20px; border-radius: .3em; position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);">
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <div style="display: flex;">
                            <span id="lbopacity" style="flex: auto;">透明度:</span>
                            <input style="width: 50%;" type="range" id="opacity" min="0" max="1" step="0.1" value="${window.ede.opacity || 0.7}" />
                        </div>
                        <div style="display: flex;">
                            <span id="lbfontSize" style="flex: auto;">字体大小:</span>
                            <input style="width: 50%;" type="range" id="fontSize" min="8" max="80" step="1" value="${window.ede.fontSize || 18}" />
                        </div>
                        <div style="display: flex;">
                            <span id="lbspeed" style="flex: auto;">弹幕速度:</span>
                            <input style="width: 50%;" type="range" id="speed" min="20" max="600" step="10" value="${window.ede.speed || 200}" />
                        </div>
                        <div style="display: flex;">
                            <span id="lbheightRatio" style="flex: auto;">高度比例:</span>
                            <input style="width: 50%;" type="range" id="heightRatio" min="0" max="1" step="0.05" value="${window.ede.heightRatio || 0.9}" />
                        </div>
                        <div style="display: flex;">
                            <span id="lbdanmakuDensityLimit" style="flex: auto;">密度限制等级:</span>
                            <input style="width: 50%;" type="range" id="danmakuDensityLimit"  min="0" max="3" step="1" value="${window.ede.danmakuDensityLimit}" />
                        </div>
                        <div style="display: flex;">
                            <label style="flex: auto;">弹幕过滤:</label>
                            <div><input type="checkbox" id="filterBilibili" name="danmakuFilter" value="1" ${((window.ede.danmakuFilter & 1) === 1) ? 'checked' : ''} />
                                <label for="filterBilibili">B站</label></div>
                            <div><input type="checkbox" id="filterGamer" name="danmakuFilter" value="2" ${((window.ede.danmakuFilter & 2) === 2) ? 'checked' : ''} />
                                <label for="filterGamer">巴哈</label></div>
                            <div><input type="checkbox" id="filterDanDanPlay" name="danmakuFilter" value="4" ${((window.ede.danmakuFilter & 4) === 4) ? 'checked' : ''} />
                                <label for="filterDanDanPlay">弹弹</label></div>
                            <div><input type="checkbox" id="filterOthers" name="danmakuFilter" value="8" ${((window.ede.danmakuFilter & 8) === 8) ? 'checked' : ''} />
                                <label for="filterOthers">其他</label></div>
                        </div>
                        <div style="display: flex;">
                            <label style="flex: auto;">弹幕类型过滤:</label>
                            <div><input type="checkbox" id="filterBottom" name="danmakuModeFilter" value="1" ${((window.ede.danmakuModeFilter & 1) === 1) ? 'checked' : ''} />
                                <label for="filterBottom">底部</label></div>
                            <div><input type="checkbox" id="filterTop" name="danmakuModeFilter" value="2" ${((window.ede.danmakuModeFilter & 2) === 2) ? 'checked' : ''} />
                                <label for="filterTop">顶部</label></div>
                            <div><input type="checkbox" id="filterRoll" name="danmakuModeFilter" value="4" ${((window.ede.danmakuModeFilter & 4) === 4) ? 'checked' : ''} />
                                <label for="filterRoll">滚动</label></div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                        <button id="saveSettings" class="raised button-submit block btnSave formDialogFooterItem emby-button">保存设置</button>
                        <button id="cancelSettings" class="raised button-cancel block btnCancel formDialogFooterItem emby-button">取消</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);

            function showCurrentVal(id, ticks) {
                const val = document.getElementById(id).value;
                const span = document.getElementById('lb' + id);
                const prefix = span.innerText.split(':')[0];
                if (ticks) {
                    span.innerText = prefix + ': ' + ticks[val];
                } else {
                    span.innerText = prefix + ': ' + val;
                }
            }

            showCurrentVal('opacity');
            showCurrentVal('speed');
            showCurrentVal('fontSize');
            showCurrentVal('heightRatio');
            showCurrentVal('danmakuDensityLimit', ['无', '低', '中', '高']);

            const closeModal = () => {
                document.body.removeChild(modal);
            };

            document.getElementById('saveSettings').onclick = () => {
                try {
                    window.ede.opacity = parseFloatOfRange(document.getElementById('opacity').value, 0, 1);
                    window.localStorage.setItem('danmakuOpacity', window.ede.opacity.toString());
                    showDebugInfo(`设置弹幕透明度：${window.ede.opacity}`);

                    window.ede.speed = parseFloatOfRange(document.getElementById('speed').value, 20, 600);
                    window.localStorage.setItem('danmakuSpeed', window.ede.speed.toString());
                    showDebugInfo(`设置弹幕速度：${window.ede.speed}`);

                    window.ede.fontSize = parseFloatOfRange(document.getElementById('fontSize').value, 8, 40);
                    window.localStorage.setItem('danmakuSize', window.ede.fontSize.toString());
                    showDebugInfo(`设置弹幕大小：${window.ede.fontSize}`);

                    window.ede.heightRatio = parseFloatOfRange(document.getElementById('heightRatio').value, 0, 1);
                    window.localStorage.setItem('danmakuHeight', window.ede.heightRatio.toString());
                    showDebugInfo(`设置弹幕高度：${window.ede.heightRatio}`);

                    window.ede.danmakuFilter = 0;
                    document.querySelectorAll('input[name="danmakuFilter"]:checked').forEach(element => {
                        window.ede.danmakuFilter += parseInt(element.value, 10);
                    });
                    window.localStorage.setItem('danmakuFilter', window.ede.danmakuFilter);
                    showDebugInfo(`设置弹幕过滤：${window.ede.danmakuFilter}`);

                    window.ede.danmakuModeFilter = 0;
                    document.querySelectorAll('input[name="danmakuModeFilter"]:checked').forEach(element => {
                        window.ede.danmakuModeFilter += parseInt(element.value, 10);
                    });
                    window.localStorage.setItem('danmakuModeFilter', window.ede.danmakuModeFilter);
                    showDebugInfo(`设置弹幕模式过滤：${window.ede.danmakuModeFilter}`);

                    window.ede.danmakuDensityLimit = parseInt(document.getElementById('danmakuDensityLimit').value);
                    window.localStorage.setItem('danmakuDensityLimit', window.ede.danmakuDensityLimit);
                    showDebugInfo(`设置弹幕密度限制等级：${window.ede.danmakuDensityLimit}`);

                    reloadDanmaku('reload');

                    closeModal();
                } catch (e) {
                    alert(`Invalid input: ${e.message}`);
                }
            };
            document.getElementById('cancelSettings').onclick = closeModal;

            document.getElementById('opacity').oninput = () => showCurrentVal('opacity');
            document.getElementById('speed').oninput = () => showCurrentVal('speed');
            document.getElementById('fontSize').oninput = () => showCurrentVal('fontSize');
            document.getElementById('heightRatio').oninput = () => showCurrentVal('heightRatio');
            document.getElementById('danmakuDensityLimit').oninput = () => showCurrentVal('danmakuDensityLimit', ['无', '低', '中', '高']);
        }
    };
    // ------ configs end------


    // @formatter:off
    /* https://cdn.jsdelivr.net/npm/danmaku/dist/danmaku.min.js */
    !function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).Danmaku=e()}(this,(function(){"use strict";var t=function(){if("undefined"==typeof document)return"transform";for(var t=["oTransform","msTransform","mozTransform","webkitTransform","transform"],e=document.createElement("div").style,i=0;i<t.length;i++)if(t[i]in e)return t[i];return"transform"}();function e(t){var e=document.createElement("div");if(e.style.cssText="position:absolute;","function"==typeof t.render){var i=t.render();if(i instanceof HTMLElement)return e.appendChild(i),e}if(e.textContent=t.text,t.style)for(var n in t.style)e.style[n]=t.style[n];return e}var i={name:"dom",init:function(){var t=document.createElement("div");return t.style.cssText="overflow:hidden;white-space:nowrap;transform:translateZ(0);",t},clear:function(t){for(var e=t.lastChild;e;)t.removeChild(e),e=t.lastChild},resize:function(t,e,i){t.style.width=e+"px",t.style.height=i+"px"},framing:function(){},setup:function(t,i){var n=document.createDocumentFragment(),s=0,r=null;for(s=0;s<i.length;s++)(r=i[s]).node=r.node||e(r),n.appendChild(r.node);for(i.length&&t.appendChild(n),s=0;s<i.length;s++)(r=i[s]).width=r.width||r.node.offsetWidth,r.height=r.height||r.node.offsetHeight},render:function(e,i){i.node.style[t]="translate("+i.x+"px,"+i.y+"px)"},remove:function(t,e){t.removeChild(e.node),this.media||(e.node=null)}},n="undefined"!=typeof window&&window.devicePixelRatio||1,s=Object.create(null);function r(t,e){if("function"==typeof t.render){var i=t.render();if(i instanceof HTMLCanvasElement)return t.width=i.width,t.height=i.height,i}var r=document.createElement("canvas"),h=r.getContext("2d"),o=t.style||{};o.font=o.font||"10px sans-serif",o.textBaseline=o.textBaseline||"bottom";var a=1*o.lineWidth;for(var d in a=a>0&&a!==1/0?Math.ceil(a):1*!!o.strokeStyle,h.font=o.font,t.width=t.width||Math.max(1,Math.ceil(h.measureText(t.text).width)+2*a),t.height=t.height||Math.ceil(function(t,e){if(s[t])return s[t];var i=12,n=t.match(/(\d+(?:\.\d+)?)(px|%|em|rem)(?:\s*\/\s*(\d+(?:\.\d+)?)(px|%|em|rem)?)?/);if(n){var r=1*n[1]||10,h=n[2],o=1*n[3]||1.2,a=n[4];"%"===h&&(r*=e.container/100),"em"===h&&(r*=e.container),"rem"===h&&(r*=e.root),"px"===a&&(i=o),"%"===a&&(i=r*o/100),"em"===a&&(i=r*o),"rem"===a&&(i=e.root*o),void 0===a&&(i=r*o)}return s[t]=i,i}(o.font,e))+2*a,r.width=t.width*n,r.height=t.height*n,h.scale(n,n),o)h[d]=o[d];var u=0;switch(o.textBaseline){case"top":case"hanging":u=a;break;case"middle":u=t.height>>1;break;default:u=t.height-a}return o.strokeStyle&&h.strokeText(t.text,a,u),h.fillText(t.text,a,u),r}function h(t){return 1*window.getComputedStyle(t,null).getPropertyValue("font-size").match(/(.+)px/)[1]}var o={name:"canvas",init:function(t){var e=document.createElement("canvas");return e.context=e.getContext("2d"),e._fontSize={root:h(document.getElementsByTagName("html")[0]),container:h(t)},e},clear:function(t,e){t.context.clearRect(0,0,t.width,t.height);for(var i=0;i<e.length;i++)e[i].canvas=null},resize:function(t,e,i){t.width=e*n,t.height=i*n,t.style.width=e+"px",t.style.height=i+"px"},framing:function(t){t.context.clearRect(0,0,t.width,t.height)},setup:function(t,e){for(var i=0;i<e.length;i++){var n=e[i];n.canvas=r(n,t._fontSize)}},render:function(t,e){t.context.drawImage(e.canvas,e.x*n,e.y*n)},remove:function(t,e){e.canvas=null}},a="undefined"!=typeof window&&(window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame)||function(t){return setTimeout(t,50/3)},d="undefined"!=typeof window&&(window.cancelAnimationFrame||window.mozCancelAnimationFrame||window.webkitCancelAnimationFrame)||clearTimeout;function u(t,e,i){for(var n=0,s=0,r=t.length;s<r-1;)i>=t[n=s+r>>1][e]?s=n:r=n;return t[s]&&i<t[s][e]?s:r}function m(t){return/^(ltr|top|bottom)$/i.test(t)?t.toLowerCase():"rtl"}function c(){var t=9007199254740991;return[{range:0,time:-t,width:t,height:0},{range:t,time:t,width:0,height:0}]}function l(t){t.ltr=c(),t.rtl=c(),t.top=c(),t.bottom=c()}function f(){return void 0!==window.performance&&window.performance.now?window.performance.now():Date.now()}function p(t){var e=this,i=this.media?this.media.currentTime:f()/1e3,n=this.media?this.media.playbackRate:1;function s(t,s){if("top"===s.mode||"bottom"===s.mode)return i-t.time<e._.duration;var r=(e._.width+t.width)*(i-t.time)*n/e._.duration;if(t.width>r)return!0;var h=e._.duration+t.time-i,o=e._.width+s.width,a=e.media?s.time:s._utc,d=o*(i-a)*n/e._.duration,u=e._.width-d;return h>e._.duration*u/(e._.width+s.width)}for(var r=this._.space[t.mode],h=0,o=0,a=1;a<r.length;a++){var d=r[a],u=t.height;if("top"!==t.mode&&"bottom"!==t.mode||(u+=d.height),d.range-d.height-r[h].range>=u){o=a;break}s(d,t)&&(h=a)}var m=r[h].range,c={range:m+t.height,time:this.media?t.time:t._utc,width:t.width,height:t.height};return r.splice(h+1,o-h-1,c),"bottom"===t.mode?this._.height-t.height-m%this._.height:m%(this._.height-t.height)}function g(){if(!this._.visible||!this._.paused)return this;if(this._.paused=!1,this.media)for(var t=0;t<this._.runningList.length;t++){var e=this._.runningList[t];e._utc=f()/1e3-(this.media.currentTime-e.time)}var i=this,n=function(t,e,i,n){return function(s){t(this._.stage);var r=(s||f())/1e3,h=this.media?this.media.currentTime:r,o=this.media?this.media.playbackRate:1,a=null,d=0,u=0;for(u=this._.runningList.length-1;u>=0;u--)a=this._.runningList[u],h-(d=this.media?a.time:a._utc)>this._.duration&&(n(this._.stage,a),this._.runningList.splice(u,1));for(var m=[];this._.position<this.comments.length&&(a=this.comments[this._.position],!((d=this.media?a.time:a._utc)>=h));)h-d>this._.duration||(this.media&&(a._utc=r-(this.media.currentTime-a.time)),m.push(a)),++this._.position;for(e(this._.stage,m),u=0;u<m.length;u++)(a=m[u]).y=p.call(this,a),this._.runningList.push(a);for(u=0;u<this._.runningList.length;u++){a=this._.runningList[u];var c=(this._.width+a.width)*(r-a._utc)*o/this._.duration;"ltr"===a.mode&&(a.x=c-a.width),"rtl"===a.mode&&(a.x=this._.width-c),"top"!==a.mode&&"bottom"!==a.mode||(a.x=this._.width-a.width>>1),i(this._.stage,a)}}}(this._.engine.framing.bind(this),this._.engine.setup.bind(this),this._.engine.render.bind(this),this._.engine.remove.bind(this));return this._.requestID=a((function t(e){n.call(i,e),i._.requestID=a(t)})),this}function _(){return!this._.visible||this._.paused||(this._.paused=!0,d(this._.requestID),this._.requestID=0),this}function v(){if(!this.media)return this;this.clear(),l(this._.space);var t=u(this.comments,"time",this.media.currentTime);return this._.position=Math.max(0,t-1),this}function w(t){t.play=g.bind(this),t.pause=_.bind(this),t.seeking=v.bind(this),this.media.addEventListener("play",t.play),this.media.addEventListener("pause",t.pause),this.media.addEventListener("playing",t.play),this.media.addEventListener("waiting",t.pause),this.media.addEventListener("seeking",t.seeking)}function y(t){this.media.removeEventListener("play",t.play),this.media.removeEventListener("pause",t.pause),this.media.removeEventListener("playing",t.play),this.media.removeEventListener("waiting",t.pause),this.media.removeEventListener("seeking",t.seeking),t.play=null,t.pause=null,t.seeking=null}function x(t){this._={},this.container=t.container||document.createElement("div"),this.media=t.media,this._.visible=!0,this.engine=(t.engine||"DOM").toLowerCase(),this._.engine="canvas"===this.engine?o:i,this._.requestID=0,this._.speed=Math.max(0,t.speed)||144,this._.duration=4,this.comments=t.comments||[],this.comments.sort((function(t,e){return t.time-e.time}));for(var e=0;e<this.comments.length;e++)this.comments[e].mode=m(this.comments[e].mode);return this._.runningList=[],this._.position=0,this._.paused=!0,this.media&&(this._.listener={},w.call(this,this._.listener)),this._.stage=this._.engine.init(this.container),this._.stage.style.cssText+="position:relative;pointer-events:none;",this.resize(),this.container.appendChild(this._.stage),this._.space={},l(this._.space),this.media&&this.media.paused||(v.call(this),g.call(this)),this}function b(){if(!this.container)return this;for(var t in _.call(this),this.clear(),this.container.removeChild(this._.stage),this.media&&y.call(this,this._.listener),this)Object.prototype.hasOwnProperty.call(this,t)&&(this[t]=null);return this}var L=["mode","time","text","render","style"];function T(t){if(!t||"[object Object]"!==Object.prototype.toString.call(t))return this;for(var e={},i=0;i<L.length;i++)void 0!==t[L[i]]&&(e[L[i]]=t[L[i]]);if(e.text=(e.text||"").toString(),e.mode=m(e.mode),e._utc=f()/1e3,this.media){var n=0;void 0===e.time?(e.time=this.media.currentTime,n=this._.position):(n=u(this.comments,"time",e.time))<this._.position&&(this._.position+=1),this.comments.splice(n,0,e)}else this.comments.push(e);return this}function E(){return this._.visible?this:(this._.visible=!0,this.media&&this.media.paused||(v.call(this),g.call(this)),this)}function k(){return this._.visible?(_.call(this),this.clear(),this._.visible=!1,this):this}function C(){return this._.engine.clear(this._.stage,this._.runningList),this._.runningList=[],this}function z(){return this._.width=this.container.offsetWidth,this._.height=this.container.offsetHeight,this._.engine.resize(this._.stage,this._.width,this._.height),this._.duration=this._.width/this._.speed,this}var D={get:function(){return this._.speed},set:function(t){return"number"!=typeof t||isNaN(t)||!isFinite(t)||t<=0?this._.speed:(this._.speed=t,this._.width&&(this._.duration=this._.width/t),t)}};function M(t){t&&x.call(this,t)}return M.prototype.destroy=function(){return b.call(this)},M.prototype.emit=function(t){return T.call(this,t)},M.prototype.show=function(){return E.call(this)},M.prototype.hide=function(){return k.call(this)},M.prototype.clear=function(){return C.call(this)},M.prototype.resize=function(){return z.call(this)},Object.defineProperty(M.prototype,"speed",D),M}));
    /* eslint-enable */


    class EDE {
        constructor() {
            // 简繁转换 0:不转换 1:简体 2:繁体
            const chConvert = window.localStorage.getItem('chConvert');
            this.chConvert = chConvert ? parseInt(chConvert) : 0;
            // 开关弹幕 0:关闭 1:打开
            const danmakuSwitch = window.localStorage.getItem('danmakuSwitch');
            this.danmakuSwitch = danmakuSwitch ? parseInt(danmakuSwitch) : 1;
            // 开关日志 0:关闭 1:打开
            const logSwitch = window.localStorage.getItem('logSwitch');
            this.logSwitch = logSwitch ? parseInt(logSwitch) : 0;
            // 弹幕透明度
            const opacityRecord = window.localStorage.getItem('danmakuOpacity');
            this.opacity = opacityRecord ? parseFloatOfRange(opacityRecord, 0.0, 1.0) : 0.7
            // 弹幕速度
            const speedRecord = window.localStorage.getItem('danmakuSpeed');
            this.speed = speedRecord ? parseFloatOfRange(speedRecord, 0.0, 1000.0) : 200
            // 弹幕字体大小
            const sizeRecord = window.localStorage.getItem('danmakuSize');
            this.fontSize = sizeRecord ? parseFloatOfRange(sizeRecord, 0.0, 50.0) : 18
            // 弹幕高度
            const heightRecord = window.localStorage.getItem('danmakuHeight');
            this.heightRatio = heightRecord ? parseFloatOfRange(heightRecord, 0.0, 1.0) : 0.9
            // 弹幕过滤
            const danmakuFilter = window.localStorage.getItem('danmakuFilter');
            this.danmakuFilter = danmakuFilter ? parseInt(danmakuFilter) : 0;
            this.danmakuFilter = this.danmakuFilter >= 0 && this.danmakuFilter < 16 ? this.danmakuFilter : 0;
            // 按弹幕模式过滤
            const danmakuModeFilter = window.localStorage.getItem('danmakuModeFilter');
            this.danmakuModeFilter = danmakuModeFilter ? parseInt(danmakuModeFilter) : 0;
            this.danmakuModeFilter = this.danmakuModeFilter >= 0 && this.danmakuModeFilter < 8 ? this.danmakuModeFilter : 0;
            // 弹幕密度限制等级 0:不限制 1:低 2:中 3:高
            const danmakuDensityLimit = window.localStorage.getItem('danmakuDensityLimit');
            this.danmakuDensityLimit = danmakuDensityLimit ? parseInt(danmakuDensityLimit) : 0;

            this.danmaku = null;
            this.episode_info = null;
            this.obResize = null;
            this.obMutation = null;
            this.loading = false;
        }
    }

    const parseFloatOfRange = (str, lb, hb) => {
        let parsedValue = parseFloat(str);
        if (isNaN(parsedValue)) {
            throw new Error('输入无效!');
        }
        return Math.min(Math.max(parsedValue, lb), hb);
    };

    function createButton(opt) {
        let button = document.createElement('button');
        button.className = buttonOptions.class;
        button.setAttribute('is', buttonOptions.is);
        button.setAttribute('title', opt.title);
        button.setAttribute('id', opt.id);
        let icon = document.createElement('span');
        icon.className = spanClass + opt.class;
        button.appendChild(icon);
        button.onclick = opt.onclick;
        return button;
    }

    function initListener() {
        let container = document.querySelector(mediaQueryStr);
        // 页面未加载
        if (!container) {
            if (window.ede.episode_info) {
                window.ede.episode_info = null;
            }
        }
    }

    function initUI() {
        // 页面未加载
        let uiAnchor = document.getElementsByClassName(uiAnchorStr);
        if (!uiAnchor || !uiAnchor[0]) {
            return;
        }
        // 已初始化
        if (document.getElementById('danmakuCtr')) {
            return;
        }
        showDebugInfo('正在初始化UI');
        // 弹幕按钮容器div
        let uiEle = null;
        document.querySelectorAll(uiQueryStr).forEach(function (element) {
            if (element.offsetParent != null) {
                uiEle = element.parentNode;
            }
        });
        if (uiEle == null) {
            return;
        }

        let parent = uiEle.parentNode;
        let menubar = document.createElement('div');
        menubar.id = 'danmakuCtr';
        if (!window.ede.episode_info) {
            menubar.style.opacity = 0.5;
        }
        parent.insertBefore(menubar, uiEle.nextSibling);
        // 弹幕开关
        displayButtonOpts.class = danmaku_icons[window.ede.danmakuSwitch];
        menubar.appendChild(createButton(displayButtonOpts));
        // 手动匹配
        menubar.appendChild(createButton(searchButtonOpts));
        // 弹幕设置
        menubar.appendChild(createButton(settingButtonOpts));

        let _container = null;
        document.querySelectorAll(mediaContainerQueryStr).forEach(function (element) {
            if (!element.classList.contains('hide')) {
                _container = element;
            }
        });
        let span = document.createElement('span');
        span.id = 'debugInfo';
        span.style.position = 'absolute';
        span.style.overflow = 'auto';
        span.style.zIndex = '99';
        span.style.right = '50px';
        span.style.top = '50px';
        span.style.background = 'rgba(28, 28, 28, .8)';
        span.style.color = '#fff';
        span.style.padding = '20px';
        span.style.borderRadius = '.3em';
        span.style.maxHeight = '50%'
        window.ede.logSwitch === 1 ? (span.style.display = 'block') : (span.style.display = 'none');
        _container.appendChild(span);


        showDebugInfo('UI初始化完成');
        reloadDanmaku('init');
    }

    async function showDebugInfo(msg) {
        let span = document.getElementById('debugInfo');
        while (!span) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            span = document.getElementById('debugInfo');
        }
        let msgStr = msg;
        if (typeof msg !== 'string') {
            msgStr = JSON.stringify(msg);
        }

        let lastLine = span.innerHTML.slice(span.innerHTML.lastIndexOf('<br>') + 4);
        let baseLine = lastLine.replace(/ X\d+$/, '');
        if (baseLine === msgStr) {
            let count = 2;
            if (lastLine.match(/ X(\d+)$/)) {
                count = parseInt(lastLine.match(/ X(\d+)$/)[1]) + 1;
            }
            msgStr = `${msgStr} X${count}`;
            span.innerHTML = span.innerHTML.slice(0, span.innerHTML.lastIndexOf('<br>') + 4) + msgStr;
        } else {
            span.innerHTML += span.innerHTML === '' ? msgStr : '<br>' + msgStr;
        }

        console.log(msg);
    }

    async function getEmbyItemInfo() {
        let playingInfo = null;
        while (!playingInfo) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            playingInfo = await ApiClient.getItem(ApiClient.getCurrentUserId(), itemId);
        }
        await showDebugInfo('获取Item信息成功: ' + (playingInfo.SeriesName || playingInfo.Name));
        return playingInfo;
    }

    function makeGetRequest(url) {
        if (isInTampermonkey) {
            return new Promise(() => {
                // noinspection JSUnusedGlobalSymbols
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    headers: {
                        "Accept-Encoding": "gzip,br",
                        "Accept": "application/json"
                    },
                    onload: function (response) {
                        response.json = () => Promise.resolve(JSON.parse(response.responseText));
                        response.text = () => Promise.resolve(response.responseText);
                        response.ok = response.status >= 200 && response.status < 300;
                        resolve(response);
                    },
                    onerror: function (error) {
                        reject(error);
                    }
                });
            });
        } else {
            return fetch(url, {
                method: 'GET',
                headers: {
                    "Accept-Encoding": "gzip,br",
                    "Accept": "application/json",
                    "User-Agent": navigator.userAgent
                }
            });
        }
    }

    async function getEpisodeInfo(is_auto = true) {
        let item = await getEmbyItemInfo();
        if (!item) {
            return null;
        }
        let _id;
        let animeName;
        let anime_id = -1;
        let episode;
        _id = item.SeasonId || item.Id;
        animeName = item.SeriesName || item.Name;
        episode = item.IndexNumber || 1;
        let session = item.ParentIndexNumber;
        if (session > 1) {
            animeName += session;
        }
        let _id_key = '_anime_id_rel_' + _id;
        let _name_key = '_anime_name_rel_' + _id;
        let _episode_key = '_episode_id_rel_' + _id + '_' + episode;
        if (is_auto) {
            //优先使用记忆设置
            if (window.localStorage.getItem(_episode_key)) {
                return JSON.parse(window.localStorage.getItem(_episode_key));
            }
        }
        if (window.localStorage.getItem(_id_key)) {
            anime_id = window.localStorage.getItem(_id_key);
        }
        if (window.localStorage.getItem(_name_key)) {
            animeName = window.localStorage.getItem(_name_key);
        }
        if (!is_auto) {
            animeName = prompt('确认动画名:', animeName);
            if (animeName == null || animeName === '') {
                return null;
            }
        }

        let searchUrl = apiPrefix + '/api/v2/search/episodes?anime=' + animeName + '&withRelated=true';
        let animaInfo = await makeGetRequest(searchUrl)
            .then((response) => response.json())
            .catch((error) => {
                showDebugInfo('查询失败:', error);
                return null;
            });
        if (animaInfo.animes.length === 0) {
            const seriesInfo = await ApiClient.getItem(ApiClient.getCurrentUserId(), item.SeriesId || item.Id);
            animeName = seriesInfo.OriginalTitle;
            if (animeName?.length > 0) {
                searchUrl = apiPrefix + '/api/v2/search/episodes?anime=' + animeName + '&withRelated=true';
                animaInfo = await makeGetRequest(searchUrl)
                    .then((response) => response.json())
                    .catch((error) => {
                        showDebugInfo('查询失败:', error);
                        return null;
                    });
            }
        }
        if (animaInfo.animes.length === 0) {
            await showDebugInfo('弹幕查询无结果');
            return null;
        }
        await showDebugInfo('节目查询成功');

        let selecAnime_id = 1;
        if (anime_id !== -1) {
            for (let index = 0; index < animaInfo.animes.length; index++) {
                if (animaInfo.animes[index].animeId === anime_id) {
                    selecAnime_id = index + 1;
                }
            }
        }
        if (!is_auto) {
            let anime_lists_str = list2string(animaInfo);
            await showDebugInfo(anime_lists_str);
            selecAnime_id = prompt('选择节目:\n' + anime_lists_str, selecAnime_id);
            selecAnime_id = parseInt(selecAnime_id) - 1;
            window.localStorage.setItem(_id_key, animaInfo.animes[selecAnime_id].animeId);
            window.localStorage.setItem(_name_key, animaInfo.animes[selecAnime_id].animeTitle);
            let episode_lists_str = ep2string(animaInfo.animes[selecAnime_id].episodes);
            episode = prompt('选择剧集:\n' + episode_lists_str, parseInt(episode) || 1);
            if (episode == null || episode === '') {
                return null;
            }
            episode = parseInt(episode) - 1;
        } else {
            selecAnime_id = parseInt(selecAnime_id) - 1;
            let initialTitle = animaInfo.animes[selecAnime_id].episodes[0].episodeTitle;
            const match = initialTitle.match(/第(\d+)话/);
            const initialep = match ? parseInt(match[1]) : 1;
            episode = (parseInt(episode) < initialep) ? parseInt(episode) - 1 : (parseInt(episode) - initialep);
        }

        if (episode + 1 > animaInfo.animes[selecAnime_id].episodes.length) {
            await showDebugInfo('剧集不存在');
            return null;
        }

        const epTitlePrefix = animaInfo.animes[selecAnime_id].type === 'tvseries' ? `S${session}E${episode + 1}` : (animaInfo.animes[selecAnime_id].type);
        let episodeInfo = {
            episodeId: animaInfo.animes[selecAnime_id].episodes[episode].episodeId,
            animeTitle: animaInfo.animes[selecAnime_id].animeTitle,
            episodeTitle: epTitlePrefix + ' ' + animaInfo.animes[selecAnime_id].episodes[episode].episodeTitle,
        };
        window.localStorage.setItem(_episode_key, JSON.stringify(episodeInfo));
        return episodeInfo;
    }

    async function getComments(episodeId) {
        const {danmakuFilter} = window.ede;
        const url_all = apiPrefix + '/api/v2/comment/' + episodeId + '?withRelated=true&chConvert=' + window.ede.chConvert;
        const url_related = apiPrefix + '/api/v2/related/' + episodeId;
        const url_ext = apiPrefix + '/api/v2/extcomment?url=';
        try {
            let response = await makeGetRequest(url_all);
            let data = await response.json();
            const matchBili = /^\[BiliBili]/;
            let hasBili = false;
            if ((danmakuFilter & 1) !== 1) {
                for (const c of data.comments) {
                    if (matchBili.test(c.p.split(',').pop())) {
                        hasBili = true;
                        break;
                    }
                }
            }
            let comments = data.comments;
            response = await makeGetRequest(url_related);
            data = await response.json();
            await showDebugInfo('第三方弹幕源个数：' + data.relateds.length);

            if (data.relateds.length > 0) {
                // 根据设置过滤弹幕源
                let src = [];
                for (const s of data.relateds) {
                    if ((danmakuFilter & 1) !== 1 && !hasBili && s.url.includes('bilibili.com/bangumi')) {
                        src.push(s.url);
                    }
                    if ((danmakuFilter & 1) !== 1 && s.url.includes('bilibili.com/video')) {
                        src.push(s.url);
                    }
                    if ((danmakuFilter & 2) !== 2 && s.url.includes('gamer')) {
                        src.push(s.url);
                    }
                    if ((danmakuFilter & 8) !== 8 && !s.url.includes('bilibili') && !s.url.includes('gamer')) {
                        src.push(s.url);
                    }
                }
                // 获取第三方弹幕
                await Promise.all(src.map(async (s) => {
                    const response = await makeGetRequest(url_ext + encodeURIComponent(s));
                    const data = await response.json();
                    comments = comments.concat(data.comments);
                }));
            }
            await showDebugInfo('弹幕下载成功: ' + comments.length);
            return comments;
        } catch (error) {
            await showDebugInfo('获取弹幕失败:', error);
            return null;
        }
    }
    async function getItemId() {
        let item = await getEmbyItemInfo();
        if (!item) {
            return null;
        }
        return item.Id || null;
    }

    async function getCommentsByPluginApi(jellyfinItemId) {
        const path = window.location.pathname.replace(/\/web\/(index\.html)?/, '/api/danmu/');
        const url = window.location.origin + path + jellyfinItemId + '/raw';
        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }
        const xmlText = await response.text();
        if (!xmlText || xmlText.length === 0) {
            return null;
        }

        // parse the xml data
        // xml data: <d p="392.00000,1,25,16777215,0,0,[BiliBili]e6860b30,1723088443,1">弹幕内容</d>
        //           <d p="stime, type, fontSize, color, date, pool, sender, dbid, unknown">content</d>
        // comment data: {cid: "1723088443", p: "392.00,1,16777215,[BiliBili]e6860b30", m: "弹幕内容"}
        //               {cid: "dbid", p: "stime, type, color, sender", m: "content"}
        try {
            const parser = new DOMParser();
            const data = parser.parseFromString(xmlText, 'text/xml');
            const comments = [];

            for (const comment of data.getElementsByTagName('d')) {
                const p = comment.getAttribute('p').split(',').map(Number);
                const commentData = {
                    cid: p[7],
                    p: p[0] + ',' + p[1] + ',' + p[3] + ',' + p[6],
                    m: comment.textContent
                };
                comments.push(commentData);
            }

            return comments;
        } catch (error) {
            return null;
        }
    }

    async function createDanmaku(comments) {
        if (!window.obVideo) {
            window.obVideo = new MutationObserver((mutationList, _observer) => {
                for (let mutationRecord of mutationList) {
                    if (mutationRecord.removedNodes) {
                        for (let removedNode of mutationRecord.removedNodes) {
                            if (removedNode.className && removedNode.classList.contains('videoPlayerContainer')) {
                                console.log('[Jellyfin-Danmaku] Video Removed');
                                window.ede.loading = false;
                                document.getElementById('danmakuInfoTitle')?.remove();
                                const wrapper = document.getElementById('danmakuWrapper');
                                if (wrapper) wrapper.style.display = 'none';
                                return;
                            }
                        }
                    }
                    if (mutationRecord.addedNodes) {
                        for (let addedNode of mutationRecord.addedNodes) {
                            if (addedNode.className && addedNode.classList.contains('videoPlayerContainer')) {
                                console.log('[Jellyfin-Danmaku] Video Added');
                                reloadDanmaku('refresh');
                                return;
                            }
                        }
                    }
                }
            });

            window.obVideo.observe(document.body, {childList: true});
        }

        if (!comments) {
            await showDebugInfo('无弹幕');
            return;
        }

        let wrapper = document.getElementById('danmakuWrapper');
        wrapper && wrapper.remove();

        if (window.ede.danmaku) {
            window.ede.danmaku.clear();
            window.ede.danmaku.destroy();
            window.ede.danmaku = null;
        }

        let _comments = danmakuFilter(danmakuParser(comments));
        await showDebugInfo(`弹幕加载成功: ${_comments.length}`);
        await showDebugInfo(`弹幕透明度：${window.ede.opacity}`);
        await showDebugInfo(`弹幕速度：${window.ede.speed}`);
        await showDebugInfo(`弹幕高度比例：${window.ede.heightRatio}`);
        await showDebugInfo(`弹幕来源过滤：${window.ede.danmakuFilter}`);
        await showDebugInfo(`弹幕模式过滤：${window.ede.danmakuModeFilter}`);
        await showDebugInfo(`弹幕字号：${window.ede.fontSize}`);
        await showDebugInfo(`屏幕分辨率：${window.screen.width}x${window.screen.height}`);

        const waitForMediaContainer = async () => {
            while (!document.querySelector(mediaContainerQueryStr)) {
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        };

        await waitForMediaContainer();

        let _container = null;
        const reactRoot = document.getElementById('reactRoot');
        document.querySelectorAll(mediaContainerQueryStr).forEach((element) => {
            if (!element.classList.contains('hide')) {
                _container = element;
            }
        });

        if (!_container) {
            await showDebugInfo('未找到播放器');
            return;
        }

        let _media = document.querySelector(mediaQueryStr);
        if (!_media) {
            await showDebugInfo('未找到video');
            return;
        }

        wrapper = document.createElement('div');
        wrapper.id = 'danmakuWrapper';
        wrapper.style.position = 'fixed';
        wrapper.style.width = '100%';
        wrapper.style.height = `calc(${window.ede.heightRatio * 100}% - 18px)`;
        wrapper.style.opacity = window.ede.opacity;
        wrapper.style.top = '18px';
        wrapper.style.pointerEvents = 'none';
        if (reactRoot) {
            reactRoot.prepend(wrapper);
        } else {
            _container.prepend(wrapper);
        }

        window.ede.danmaku = new Danmaku({
            container: wrapper,
            media: _media,
            comments: _comments,
            engine: 'canvas',
            speed: window.ede.speed,
        });

        window.ede.danmakuSwitch === 1 ? window.ede.danmaku.show() : window.ede.danmaku.hide();

        const resizeObserverCallback = () => {
            if (window.ede.danmaku) {
                showDebugInfo('重设容器大小');
                window.ede.danmaku.resize();
            }
        };

        if (window.ede.obResize) {
            window.ede.obResize.disconnect();
        }

        window.ede.obResize = new ResizeObserver(resizeObserverCallback);
        window.ede.obResize.observe(_container);

        const mutationObserverCallback = () => {
            if (window.ede.danmaku && document.querySelector(mediaQueryStr)) {
                showDebugInfo('探测播放媒体变化');
                const sleep = new Promise(resolve => setTimeout(resolve, 3000));
                sleep.then(() => reloadDanmaku('refresh'));
            }
        };

        if (window.ede.obMutation) {
            window.ede.obMutation.disconnect();
        }

        window.ede.obMutation = new MutationObserver(mutationObserverCallback);
        window.ede.obMutation.observe(_media, {attributes: true});
    }

    function displayDanmakuInfo(info) {
        let infoContainer = document.getElementById('danmakuInfoTitle');
        if (!infoContainer) {
            infoContainer = document.createElement('div');
            infoContainer.id = 'danmakuInfoTitle';
            infoContainer.className = 'pageTitle';
            document.querySelector('div.skinHeader').appendChild(infoContainer);
        }
        infoContainer.innerText = `弹幕匹配信息：${info.animeTitle} - ${info.episodeTitle}`;
    }

    function reloadDanmaku(type = 'check') {
        if (window.ede.loading) {
            showDebugInfo('正在重新加载');
            return;
        }
        window.ede.loading = true;
        if (window.ede.useXmlDanmaku === 1) {
            getItemId().then((itemId) => {
                return new Promise((resolve, reject) => {
                    if (!itemId) {
                        if (type !== 'init') {
                            reject('播放器未完成加载');
                        } else {
                            reject(null);
                        }
                    }
                    resolve(itemId);
                });
            }).then((itemId) => getCommentsByPluginApi(itemId))
                .then((comments) => {
                    if (comments?.length > 0) {
                        return createDanmaku(comments).then(() => {
                            showDebugInfo('本地弹幕就位');
                        }).then(() => {
                            window.ede.loading = false;
                            const danmakuCtr = document.getElementById('danmakuCtr');
                            if (danmakuCtr && danmakuCtr.style && danmakuCtr.style.opacity !== '1') {
                                danmakuCtr.style.opacity = 1;
                            }
                        });
                    }
                    throw new Error('本地弹幕加载失败，尝试在线加载');
                })
                .catch((error) => {
                    showDebugInfo(error.message);
                    return loadOnlineDanmaku(type);
                });
        } else {
            loadOnlineDanmaku(type);
        }
    }

    function loadOnlineDanmaku(type) {
        return getEpisodeInfo(type !== 'search')
            .then((info) => {
                return new Promise((resolve, reject) => {
                    if (!info) {
                        if (type !== 'init') {
                            reject('播放器未完成加载');
                        } else {
                            reject(null);
                        }
                    }
                    if (type !== 'search' && type !== 'reload' && window.ede.danmaku && window.ede.episode_info && window.ede.episode_info.episodeId === info.episodeId) {
                        reject('当前播放视频未变动');
                    } else {
                        window.ede.episode_info = info;
                        displayDanmakuInfo(info);
                        resolve(info.episodeId);
                    }
                });
            })
            .then((episodeId) =>
                    getComments(episodeId).then((comments) =>
                        createDanmaku(comments).then(() => {
                            showDebugInfo('弹幕就位');
                        }),
                    ),
                (msg) => {
                    if (msg) {
                        showDebugInfo(msg);
                    }
                },
            )
            .then(() => {
                window.ede.loading = false;
                const danmakuCtr = document.getElementById('danmakuCtr');
                if (danmakuCtr && danmakuCtr.style && danmakuCtr.style.opacity !== '1') {
                    danmakuCtr.style.opacity = 1;
                }
            });
    }

    function danmakuFilter(comments) {
        const level = window.ede.danmakuDensityLimit;
        if (level === 0) {
            return comments;
        }

        let _container = null;
        document.querySelectorAll(mediaContainerQueryStr).forEach((element) => {
            if (!element.classList.contains('hide')) {
                _container = element;
            }
        });

        const containerWidth = _container.offsetWidth;
        const containerHeight = _container.offsetHeight * window.ede.heightRatio - 18;
        const duration = Math.ceil(containerWidth / window.ede.speed);
        const lines = Math.floor(containerHeight / window.ede.fontSize) - 1;

        const limit = (9 - level * 2) * lines;
        const verticalLimit = lines - 1 > 0 ? lines - 1 : 1;
        const resultComments = [];

        const timeBuckets = {};
        const verticalTimeBuckets = {};

        comments.forEach(comment => {
            const timeIndex = Math.ceil(comment.time / duration);

            if (!timeBuckets[timeIndex]) {
                timeBuckets[timeIndex] = 0;
            }
            if (!verticalTimeBuckets[timeIndex]) {
                verticalTimeBuckets[timeIndex] = 0;
            }

            if (comment.mode === 'top' || comment.mode === 'bottom') {
                if (verticalTimeBuckets[timeIndex] < verticalLimit) {
                    verticalTimeBuckets[timeIndex]++;
                    resultComments.push(comment);
                }
            } else {
                if (timeBuckets[timeIndex] < limit) {
                    timeBuckets[timeIndex]++;
                    resultComments.push(comment);
                }
            }
        });

        return resultComments;
    }

    function danmakuParser(all_cmts) {
        const {fontSize, danmakuFilter, danmakuModeFilter} = window.ede;

        const disableBilibili = (danmakuFilter & 1) === 1;
        const disableGamer = (danmakuFilter & 2) === 2;
        const disableDandan = (danmakuFilter & 4) === 4;
        const disableOther = (danmakuFilter & 8) === 8;

        let filterRule = '';
        if (disableDandan) {
            filterRule += '^(?!\\[)|\^.{0,3}\\]';
        }
        if (disableBilibili) {
            filterRule += (filterRule ? '|' : '') + '\^\\[BiliBili\\]';
        }
        if (disableGamer) {
            filterRule += (filterRule ? '|' : '') + '\^\\[Gamer\\]';
        }
        if (disableOther) {
            filterRule += (filterRule ? '|' : '') + '\^\\[\(\?\!\(BiliBili\|Gamer\)\).{3,}\\]';
        }
        if (filterRule === '') {
            filterRule = '!.*';
        }
        const danmakuFilterRule = new RegExp(filterRule);

        // 使用Map去重
        const unique_cmts = [];
        const cmtMap = new Map();
        const removeUserRegex = /,[^,]+$/; //p: time,modeId,colorValue,user
        all_cmts.forEach((comment) => {
            const p = comment.p.replace(removeUserRegex, '');
            if (!cmtMap.has(p + comment.m)) {
                cmtMap.set(p + comment.m, true);
                unique_cmts.push(comment);
            }
        });

        let enabledMode = [1, 4, 5, 6];
        if ((danmakuModeFilter & 1) === 1) {
            enabledMode = enabledMode.filter((v) => v !== 4);
        }
        if ((danmakuModeFilter & 2) === 2) {
            enabledMode = enabledMode.filter((v) => v !== 5);
        }
        if ((danmakuModeFilter & 4) === 4) {
            enabledMode = enabledMode.filter((v) => v !== 6 && v !== 1);
        }

        return unique_cmts
            .filter((comment) => {
                const user = comment.p.split(',')[3];
                const modeId = parseInt(comment.p.split(',')[1], 10);
                return !danmakuFilterRule.test(user) && enabledMode.includes(modeId);
            })
            .map((comment) => {
                const [time, modeId, colorValue] = comment.p.split(',').map((v, i) => i === 0 ? parseFloat(v) : parseInt(v, 10));
                const mode = {1: 'rtl', 4: 'bottom', 5: 'top', 6: 'ltr'}[modeId];

                const color = colorValue.toString(16).padStart(6, '0');
                return {
                    text: comment.m,
                    mode,
                    time,
                    style: {
                        font: `${fontSize}px sans-serif`,
                        fillStyle: `#${color}`,
                        strokeStyle: color === '000000' ? '#fff' : '#000',
                        lineWidth: 2.0,
                    },
                };
            });
    }

    function list2string($obj2) {
        const $animes = $obj2.animes;
        let anime_lists = $animes.map(($single_anime) => {
            return $single_anime.animeTitle + ' 类型:' + $single_anime.typeDescription;
        });
        let anime_lists_str = '1:' + anime_lists[0];
        for (let i = 1; i < anime_lists.length; i++) {
            anime_lists_str = anime_lists_str + '\n' + (i + 1).toString() + ':' + anime_lists[i];
        }
        return anime_lists_str;
    }

    function ep2string($obj3) {
        let anime_lists = $obj3.map(($single_ep) => {
            return $single_ep.episodeTitle;
        });
        let ep_lists_str = '1:' + anime_lists[0];
        for (let i = 1; i < anime_lists.length; i++) {
            ep_lists_str = ep_lists_str + '\n' + (i + 1).toString() + ':' + anime_lists[i];
        }
        return ep_lists_str;
    }

    const waitForElement = (selector) => {
        return new Promise((resolve) => {
            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {childList: true, subtree: true});
        });
    };


    waitForElement('.htmlvideoplayer').then(() => {
        if (!window.ede) {
            window.ede = new EDE();

            (async () => {
                let retry = 0;
                while (!itemId) {
                    await new Promise((resolve) => setTimeout(resolve, 200));
                    retry++;
                    if (retry > 10) {
                        throw new Error('获取itemId失败');
                    }
                }
                setInterval(() => {
                    initUI();
                }, check_interval);

                setInterval(() => {
                    initListener();
                }, check_interval);
            })();
        }
    });
})();
