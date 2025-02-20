class Ambient {
	/**
	 * @param {HTMLElement|string} container - A DOM element that wraps the video player.
	 * @param {Object} options
	 *   options.vtt {string|null} - URL to a WEBVTT file with sprite images (optional).
	 */
	constructor(container, options = {}) {
	  if (!container) {
		throw new Error("Container argument is required");
	  }
  
	  this.container =
		typeof container === "string"
		  ? document.querySelector(container)
		  : container;
  
	  if (!this.container) {
		throw new Error("Container element not found");
	  }
  
	  // Default options
	  this.options = Object.assign({ vtt: null }, options);
  
	  // Look for video element
	  this.video = this.container.querySelector("video");
	  if (!this.video) {
		throw new Error("No video element found inside the container");
	  }
  
	  this.canvas = null;
	  this.wrapper = null;
  
	  // VTT-related data
	  this._vttCues = null;
	  this._spriteCache = new Map();
	  // For controlling multiple canvases in VTT mode
	  this.activeCanvases = [];
  
	  // Preload VTT data if provided
	  if (this.options.vtt) {
		this._loadVtt(this.options.vtt);
	  }
	}
  
	/**
	 * Creates and mounts the ambient canvas.
	 */
	mount() {
	  // Prevent starting if the video is not set
	  if (!this.video) {
		console.warn("No video element found");
		return;
	  }
  
	  // Prevent multiple mounts
	  if (this.canvas || this.wrapper) {
		console.warn("Ambient canvas is already mounted");
		return this;
	  }
  
	  try {
	
		this.container.classList.add("cinematics-container");
		this.video.classList.add("cinematics-visible");
		this.canvas = document.createElement("canvas");
  
		if (this.options.vtt) {
		  // --- VTT (Sprite) mode ---
		  this.wrapper = document.createElement("div");
		  this.wrapper.className = "cinematics-wrapper";
		  this._resizeCanvas(true);
		  this.wrapper.appendChild(this.canvas);
		  this.container.appendChild(this.wrapper);

		  // Setup sprite-based drawing
		  this._setupVttDrawing();
		} else {
		  // --- Live-drawing mode (single canvas) ---
		  this.canvas.className = "cinematics-glow";
		  this._resizeCanvas(false);
		  this.container.appendChild(this.canvas);
  
		  // Setup real-time drawing
		  this._setupLiveDrawing();
		}
  
		return this;
	  } catch (error) {
		console.error("Failed to mount ambient canvas:", error);
		this.unmount(); // Cleanup on error
		throw error;
	  }
	}
  
	/**
	 * Removes the canvas and cleans up any event listeners.
	 */
	unmount() {
	  // Remove single-canvas
	  if (this.canvas && !this.options.vtt && this.canvas.parentNode === this.container) {
		this.container.removeChild(this.canvas);
	  }
  
	  // Remove wrapper
	  if (this.wrapper && this.wrapper.parentNode === this.container) {
		this.container.removeChild(this.wrapper);
	  }
  
	  // Reset container classes
	  this.container.classList.remove("cinematics-container");
	  this.video.classList.remove("cinematics-visible");
  
	  // Cleanup event listeners via stored cleanup function
	  if (this.video && typeof this.video.__acCleanup === "function") {
		this.video.__acCleanup();
		delete this.video.__acCleanup;
	  }
  
	  this.canvas = null;
	  this.wrapper = null;
	  this.activeCanvases = [];
	}
  
	/**
	 * Resizes the primary canvas to match the video element's dimensions.
	 * In VTT mode, we only handle the initial canvas (the cloned ones
	 * will mirror dimensions).
	 *
	 * @param {boolean} isVttMode - Whether we are in sprite/VTT mode
	 */
	_resizeCanvas(isVttMode) {
	  // We'll define the actual function here so we can remove it later
	  const resizeCanvas = () => {
		if (!this.canvas || !this.video) return;
  
		this.canvas.width = this.video.clientWidth;
		this.canvas.height = this.video.clientHeight;

		if (isVttMode && this.activeCanvases.length > 2) {
		  while (this.activeCanvases.length > 2) {
			const oldCanvas = this.activeCanvases.shift();
			if (oldCanvas && oldCanvas.parentNode === this.wrapper) {
			  this.wrapper.removeChild(oldCanvas);
			}
		  }
		}
	  };
  
	  // Immediately call once
	  resizeCanvas();
  
	  // Attach resize listener
	  this.video.addEventListener("resize", resizeCanvas);
	  this.video.__acCleanup = () => {
		this.video.removeEventListener("resize", resizeCanvas);
	  };
	}
  
	/**
	 * Sets up the drawing loop that renders the live video onto the canvas.
	 * (Non-VTT mode)
	 */
	_setupLiveDrawing() {
	  const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
	  let animationFrameId = null;
  
	  const drawFrame = () => {
		this.canvas.width = this.video.clientWidth;
		this.canvas.height = this.video.clientHeight;
  
		try {
		  ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
		} catch (err) {
		  // This can happen if video isn't ready or cross-origin issues
		  // console.error("Error drawing video frame:", err);
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
  
	  // Event handlers
	  const onLoadedData = () => drawFrame();
	  const onSeeked = () => drawFrame();
	  const onPlay = () => drawLoop();
	  const onPause = () => stopLoop();
	  const onEnded = () => stopLoop();
  
	  // Attach listeners
	  this.video.addEventListener("loadeddata", onLoadedData);
	  this.video.addEventListener("seeked", onSeeked);
	  this.video.addEventListener("play", onPlay);
	  this.video.addEventListener("pause", onPause);
	  this.video.addEventListener("ended", onEnded);
  
	  // Cleanup function
	  const existingCleanup = this.video.__acCleanup || (() => {});
	  this.video.__acCleanup = () => {
		existingCleanup();
		this.video.removeEventListener("loadeddata", onLoadedData);
		this.video.removeEventListener("seeked", onSeeked);
		this.video.removeEventListener("play", onPlay);
		this.video.removeEventListener("pause", onPause);
		this.video.removeEventListener("ended", onEnded);
		stopLoop();
	  };
	}
  
	/**
	 * Sets up VTT drawing mode.
	 */
	_setupVttDrawing() {
	  let lastCue = null;
	  // Keep track of the primary canvas in our active stack
	  this.activeCanvases = [this.canvas];
  
	  /**
	   * Schedules a sprite update
	   */
	  const updateThumbnail = () => {
		if (!this._vttCues) return;
  
		const curTime = this.video.currentTime;
		// find the cue that matches current time
		const cue = this._vttCues.find((c) => curTime >= c.start && curTime < c.end);
		if (!cue) return;
  
		// Prevent unnecessary re-draw if the same cue
		if (lastCue && lastCue.start === cue.start && lastCue.end === cue.end) return;
  
		lastCue = cue;
		let spriteImg = this._spriteCache.get(cue.src);
		if (!spriteImg) {
		  spriteImg = new Image();
		  spriteImg.src = cue.src;
		  this._spriteCache.set(cue.src, spriteImg);
		  // Once loaded, do the initial draw
		  spriteImg.onload = () => this._drawSpriteFrame(spriteImg, cue);
		} else if (spriteImg.complete && spriteImg.naturalWidth > 0) {
		  this._drawSpriteFrame(spriteImg, cue);
		}
	  };
  
	  // Attach listeners
	  const onTimeUpdate = () => requestAnimationFrame(updateThumbnail);
	  const onLoadedData = () => updateThumbnail();
	  this.video.addEventListener("timeupdate", onTimeUpdate);
	  this.video.addEventListener("loadeddata", onLoadedData);
  
	  // Cleanup function
	  const existingCleanup = this.video.__acCleanup || (() => {});
	  this.video.__acCleanup = () => {
		existingCleanup();
		this.video.removeEventListener("timeupdate", onTimeUpdate);
		this.video.removeEventListener("loadeddata", onLoadedData);
	  };
	}
  
	/**
	 * Draws the specific portion of the sprite onto a new or recycled canvas,
	 * then attaches it to the wrapper for the fade-in effect.
	 */
	_drawSpriteFrame(spriteImg, cue) {
		// Create a fresh canvas (or clone the original)
		let newCanvas = this.canvas.cloneNode(true);
		const ctx = newCanvas.getContext("2d");
	
		// Set dimensions to match the video
		newCanvas.width = this.video.clientWidth;
		newCanvas.height = this.video.clientHeight;
	  
		// Draw the sprite portion
		ctx.clearRect(0, 0, newCanvas.width, newCanvas.height);
		ctx.drawImage(
		  spriteImg,
		  cue.x, cue.y, cue.w, cue.h,
		  0, 0, newCanvas.width, newCanvas.height
		);
	  
		// Append new canvas for fade-in
		this.wrapper.appendChild(newCanvas);
		// (i.e., keep at most 2 in the DOM at once)
		while (this.wrapper.childElementCount > 2) {
		  this.wrapper.removeChild(this.wrapper.firstElementChild);
		}

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
	 * Parses a WEBVTT file to extract sprite-cue data.
	 *
	 * Returns an array of cues: { start, end, src, x, y, w, h }
	 */
	_parseVtt(vttText, vttUrl) {
	  const vttBasePath = vttUrl.substring(0, vttUrl.lastIndexOf("/"));
	  return vttText.split("\n").reduce((acc, line, index, arr) => {
		line = line.trim();
		if (index === 0 && line.toUpperCase().startsWith("WEBVTT")) return acc;
		if (line.includes("-->")) {
		  const [startStr, endStr] = line.split("-->").map((s) => s.trim());
		  const start = this._parseTime(startStr);
		  const end = this._parseTime(endStr);
		  const spriteLine = arr[index + 1]?.trim();
		  if (spriteLine) {
			const [srcPart, xywhPart] = spriteLine.split("#");
			let x = 0,
			  y = 0,
			  w = 0,
			  h = 0;
			if (xywhPart && xywhPart.startsWith("xywh=")) {
			  [x, y, w, h] = xywhPart
				.replace("xywh=", "")
				.split(",")
				.map((n) => parseInt(n, 10));
			}
			const src = srcPart.includes("/")
			  ? srcPart
			  : `${vttBasePath}/${srcPart}`;
			acc.push({ start, end, src, x, y, w, h });
		  }
		}
		return acc;
	  }, []);
	}
  
	/**
	 * Converts a time string "HH:MM:SS.mmm" into seconds.
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