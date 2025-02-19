class Ambient{constructor(t,e={}){if(!t)throw new Error("Container argument is required");if(this.container="string"==typeof t?document.querySelector(t):t,!this.container)throw new Error("Container element not found");if(this.options=Object.assign({vtt:null},e),this.video=this.container.querySelector("video"),!this.video)throw new Error("No video element found inside the container");this.canvas=null,this.wrapper=null,this._vttCues=null,this._spriteCache={},this.activeCanvases=[],this.options.vtt&&this._loadVtt(this.options.vtt)}mount(){if(this.video&&!this.canvas)try{if(this.container.classList.add("cinematics-container"),this.video.classList.add("cinematics-visible"),this.canvas=document.createElement("canvas"),this._resizeCanvas(),this.options.vtt){this.wrapper=document.createElement("div"),this.wrapper.className="cinematics-wrapper";const t=document.createDocumentFragment();t.appendChild(this.canvas),this.wrapper.appendChild(t),this.container.appendChild(this.wrapper),this._setupVttDrawing()}else this.canvas.className="cinematics-glow",this.container.appendChild(this.canvas),this._setupLiveDrawing();return this}catch(t){throw this.unmount(),t}}unmount(){this.canvas&&this.canvas.parentNode===this.container&&this.container.removeChild(this.canvas),this.wrapper&&this.wrapper.parentNode===this.container&&this.container.removeChild(this.wrapper),this.video&&this.video.__acCleanup&&(this.video.__acCleanup(),delete this.video.__acCleanup)}_resizeCanvas(){const t=()=>{this.canvas.width=this.video.clientWidth,this.canvas.height=this.video.clientHeight,this.activeCanvases.forEach((t=>{t.parentNode===this.container&&this.container.removeChild(t)}))};t(),this.video.addEventListener("resize",t),this.video.__acCleanup=()=>{this.video.removeEventListener("resize",t)}}_setupLiveDrawing(){const t=this.canvas.getContext("2d",{willReadFrequently:!0});let e=null;const i=()=>{this._resizeCanvas();try{t.drawImage(this.video,0,0,this.canvas.width,this.canvas.height)}catch(t){}},s=()=>{i(),e=window.requestAnimationFrame(s)},a=()=>{e&&(window.cancelAnimationFrame(e),e=null)},n=()=>i(),r=()=>i(),h=()=>s(),o=()=>a(),d=()=>a();this.video.addEventListener("loadeddata",n,!1),this.video.addEventListener("seeked",r,!1),this.video.addEventListener("play",h,!1),this.video.addEventListener("pause",o,!1),this.video.addEventListener("ended",d,!1),this.video.__acCleanup=()=>{this.video.removeEventListener("loadeddata",n,!1),this.video.removeEventListener("seeked",r,!1),this.video.removeEventListener("play",h,!1),this.video.removeEventListener("pause",o,!1),this.video.removeEventListener("ended",d,!1),a()}}_setupVttDrawing(){let t=null;this.activeCanvases=[this.canvas],this._spriteCache=new Map;const e=()=>{if(!this._vttCues)return;const e=this.video.currentTime,s=this._vttCues.find((t=>e>=t.start&&e<t.end));if(!s||t&&t.start===s.start&&t.end===s.end)return;t=s;let a=this._spriteCache.get(s.src);if(!a)return a=new Image,a.src=s.src,this._spriteCache.set(s.src,a),void(a.onload=()=>i(a,s));a.complete&&a.naturalWidth>0&&i(a,s)},i=(t,e)=>{const i=this.activeCanvases.length<2?this.canvas.cloneNode(!0):this.activeCanvases.shift(),s=i.getContext("2d");s.clearRect(0,0,i.width,i.height),s.drawImage(t,e.x,e.y,e.w,e.h,0,0,i.width,i.height),this.activeCanvases.includes(i)||(this.wrapper.appendChild(i),this.activeCanvases.push(i))};this.video.addEventListener("timeupdate",(()=>requestAnimationFrame(e))),this.video.addEventListener("loadeddata",e),this.video.__acCleanup=()=>{this.video.removeEventListener("timeupdate",e),this.video.removeEventListener("loadeddata",e)}}async _loadVtt(t){try{const e=await fetch(t);if(!e.ok)throw new Error(`HTTP error! status: ${e.status}`);const i=await e.text();this._vttCues=this._parseVtt(i,t)}catch(t){}}_parseVtt(t,e){const i=e.substring(0,e.lastIndexOf("/"));return t.split("\n").reduce(((t,e,s,a)=>{if(e=e.trim(),0===s&&e.toUpperCase().startsWith("WEBVTT"))return t;if(e.includes("--\x3e")){const[n,r]=e.split("--\x3e").map((t=>t.trim())),h=this._parseTime(n),o=this._parseTime(r),d=a[s+1]?.trim();if(d){const[e,s]=d.split("#");let a=0,n=0,r=0,c=0;s&&s.startsWith("xywh=")&&([a,n,r,c]=s.replace("xywh=","").split(",").map((t=>parseInt(t,10))));const v=e.includes("/")?e:`${i}/${e}`;t.push({start:h,end:o,src:v,x:a,y:n,w:r,h:c})}}return t}),[])}_parseTime(t){const e=t.split(":");if(3===e.length){return 3600*parseFloat(e[0])+60*parseFloat(e[1])+parseFloat(e[2])}return 0}}