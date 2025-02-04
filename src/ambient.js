class Ambient {
	/**
	 * @param {HTMLElement|string} container - A DOM element (or its id) that wraps the video player.
	 * @param {Object} options
	 *   options.blur {number} - Blur amount in pixels (default: 45).
	 *   options.vtt {string|null} - URL to a WEBVTT file with sprite images (optional).
	 */
	constructor(container, options = {}) {
	  if (!container) {
		throw new Error("Container argument is required");
	  }

	  this.container =
		typeof container === "string"
		  ? document.getElementById(container)
		  : container;
	
	  if (!this.container) {
		throw new Error("Container element not found");
	  }
	  this.options = Object.assign({ blur: 45, vtt: null }, options);
  
	  // Look for video element.
	  this.video = this.container.querySelector("video");
	  if (!this.video) {
		throw new Error("No video element found inside the container");
	  }

	  this.canvas = null;
	  this._vttCues = null;
	  this._spriteCache = {};
	  this.activeCanvases = [];
	  if (this.options.vtt) {
		this._loadVtt(this.options.vtt);
	  }
	}
  
	/**
	 * Creates and mounts the ambient canvas.
	 */
	mount() {
	  // Create a canvas element.
	  this.canvas = document.createElement("canvas");
	  this.canvas.className = "cinematics-glow";
	  // Use the video element's dimensions.
	  this._resizeCanvas();

	  // additional styling.
	  this.container.classList.add("cinematics-container");
	  this.container.appendChild(this.canvas);
	  this.video.classList.add("cinematics-visible");
  
	  // if a VTT file was provided, use VTT thumbnail mode.
	  if (this.options.vtt) {
		this.container.classList.add("cinematics-sprite");
		this._setupVttDrawing();
	  } else {
		this._setupLiveDrawing();
	  }
	}
  
	/**
	 * Removes the canvas and cleans up any event listeners.
	 */
	unmount() {
	  if (this.canvas && this.canvas.parentNode === this.container) {
		this.container.removeChild(this.canvas);
	  }
	  if (this.video && this.video.__acCleanup) {
		this.video.__acCleanup();
		delete this.video.__acCleanup;
	  }
	}
  
	/**
	// _applyBlur(element, value) {
	//   const blurStyle = `blur(${value}px)`;
	//   const vendors = ["", "webkit", "moz", "ms"];
	//   vendors.forEach(vendor => {
	// 	element.style[`${vendor}Filter`] = blurStyle;
	//   });
	// }
	 */
  
	/**
	 * Resizes the canvas to match the video element's current dimensions.
	 */
	_resizeCanvas() {
	  const resizeCanvas = () => {
		this.canvas.width = this.video.clientWidth;
		this.canvas.height = this.video.clientHeight;

		this.activeCanvases.forEach(canvas => {
			if (canvas.parentNode === this.container) {
			this.container.removeChild(canvas);
			}
		});
	  };
	  resizeCanvas();
	  this.video.addEventListener("resize", resizeCanvas);
	  this.video.__acCleanup = () => {
		this.video.removeEventListener("resize", resizeCanvas);
	  };
	}
  
	/**
	 * Sets up the drawing loop that renders the video onto the canvas.
	 */
	_setupLiveDrawing() {
	  const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
	  let animationFrameId = null;
  
	  const drawFrame = () => {
		this._resizeCanvas();
		try {
		  ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
		} catch (err) {
		  console.error("Error drawing video frame:", err);
		}
	  };
  
	  const drawLoop = () => {
		drawFrame();
		animationFrameId = window.requestAnimationFrame(drawLoop);
	  };
  
	  const stopLoop = () => {
		if (animationFrameId) {
		  window.cancelAnimationFrame(animationFrameId);
		  animationFrameId = null;
		}
	  };
  
	  const onLoadedData = () => drawFrame();
	  const onSeeked = () => drawFrame();
	  const onPlay = () => drawLoop();
	  const onPause = () => stopLoop();
	  const onEnded = () => stopLoop();
  
	  this.video.addEventListener("loadeddata", onLoadedData, false);
	  this.video.addEventListener("seeked", onSeeked, false);
	  this.video.addEventListener("play", onPlay, false);
	  this.video.addEventListener("pause", onPause, false);
	  this.video.addEventListener("ended", onEnded, false);
  
	  // Store a cleanup function on the video element.
	  this.video.__acCleanup = () => {
		this.video.removeEventListener("loadeddata", onLoadedData, false);
		this.video.removeEventListener("seeked", onSeeked, false);
		this.video.removeEventListener("play", onPlay, false);
		this.video.removeEventListener("pause", onPause, false);
		this.video.removeEventListener("ended", onEnded, false);
		stopLoop();
	  };
	}
  
	/**
	 * Sets up VTT drawing mode.
	 * On every timeupdate event, the code looks up the proper cue (if available)
	 * and, if the sprite image is loaded, draws the specified portion onto the canvas.
	 */
	_setupVttDrawing() {
		let lastCue = null;
		this.activeCanvases = [this.canvas]; // stack
	  
		const updateThumbnail = () => {
		  if (!this._vttCues) return;
	  
		  const curTime = this.video.currentTime;
		  const cue = this._vttCues.find(c => curTime >= c.start && curTime < c.end);
		  if (!cue || (lastCue && lastCue.start === cue.start && lastCue.end === cue.end)) return;
		  lastCue = cue;
	  
		  let spriteImg = this._spriteCache[cue.src];
		  if (!spriteImg) {
			spriteImg = new Image();
			spriteImg.src = cue.src;
			this._spriteCache[cue.src] = spriteImg;
		  }
	  
		  if (spriteImg.complete && spriteImg.naturalWidth > 0) {
			// Clone template canvas
			const newCanvas = this.canvas.cloneNode(true);
			const ctx = newCanvas.getContext("2d");
			
			ctx.clearRect(0, 0, newCanvas.width, newCanvas.height);
			ctx.drawImage(
			  spriteImg,
			  cue.x, cue.y, cue.w, cue.h,
			  0, 0, newCanvas.width, newCanvas.height
			);
	
			this.container.appendChild(newCanvas);
			this.activeCanvases.push(newCanvas);
	
			// Remove oldest if more than 2 canvases
			if (this.activeCanvases.length > 2) {
			  const oldestCanvas = this.activeCanvases.shift();
			  this.container.removeChild(oldestCanvas);
			}
		  }
		};
	
		this.video.addEventListener("timeupdate", updateThumbnail);
		this.video.addEventListener("loadeddata", updateThumbnail);
		
		this.video.__acCleanup = () => {
		  this.video.removeEventListener("timeupdate", updateThumbnail);
		  this.video.removeEventListener("loadeddata", updateThumbnail);
		};
	}
  
	/**
	 * Asynchronously loads and parses a VTT file.
	 *
	 * @param {string} url - URL of the VTT file.
	 */

	async _loadVtt(url) {
		try {
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`HTTP error! status: ${res.status}`);
		}
		const text = await res.text();
		this._vttCues = this._parseVtt(text, url);
		} catch (err) {
		console.error("Failed to load VTT file:", err);
		}
	}
  
	/**
	 * Parses a WEBVTT file.
	 * Expected cue format (example):
	 *
	 * WEBVTT
	 *
	 * 1
	 * 00:00:00.000 --> 00:00:01.000
	 * _0.jpg#xywh=0,0,300,168
	 *
	 * Returns an array of cues: { start, end, src, x, y, w, h }
	 *
	 * @param {string} vttText - The content of the VTT file.
	 * @returns {Array} Parsed cues.
	 */
	_parseVtt(vttText, vttUrl) {
		const vttBasePath = vttUrl.substring(0, vttUrl.lastIndexOf("/"));
		const cues = vttText.split("\n").reduce((acc, line, index, arr) => {
		  line = line.trim();
		  if (index === 0 && line.toUpperCase().startsWith("WEBVTT")) return acc;
		  if (line.includes("-->")) {
			const [startStr, endStr] = line.split("-->").map((s) => s.trim());
			const start = this._parseTime(startStr);
			const end = this._parseTime(endStr);
			const spriteLine = arr[index + 1]?.trim();
			if (spriteLine) {
			  const [srcPart, xywhPart] = spriteLine.split("#");
			  let x = 0, y = 0, w = 0, h = 0;
			  if (xywhPart && xywhPart.startsWith("xywh=")) {
				[x, y, w, h] = xywhPart.replace("xywh=", "").split(",").map((n) => parseInt(n, 10));
			  }
			  const src = srcPart.includes("/") ? srcPart : `${vttBasePath}/${srcPart}`;
			  acc.push({ start, end, src, x, y, w, h });
			}
		  }
		  return acc;
		}, []);
		return cues;
	}
  
	/**
	 * Converts a time string "HH:MM:SS.mmm" into seconds.
	 *
	 * @param {string} timeStr - The time string.
	 * @returns {number} Time in seconds.
	 */
	_parseTime(timeStr) {
	  const parts = timeStr.split(":");
	  if (parts.length === 3) {
		const hours = parseFloat(parts[0]);
		const minutes = parseFloat(parts[1]);
		const seconds = parseFloat(parts[2]);
		return hours * 3600 + minutes * 60 + seconds;
	  }
	  return 0;
	}
}