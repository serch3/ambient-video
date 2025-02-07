# Ambient Video Lights

Ambient is a lightweight JavaScript library that adds a cinematic background glow to video Elements. It supports two modes:

- **Live Drawing Mode**: Continuously renders the video frame onto a canvas.
- **VTT Sprite Mode**: Uses a WEBVTT sprite file to display sprite thumbnails. (Less CPU intensive)

## Installation

Include the script in your project or import it as a module.

```html
<script src="path/to/ambient.min.js"></script>
```

Also include the CSS file:
```html
<link rel="stylesheet" href="path/to/ambient.min.css">
```

## Usage

```html
<div class=".player-wrapper">
  <video id="player" src="path/to/video.mp4" controls></video>
</div>
```

```javascript
const player = document.getElementById('player');
const ambient = new Ambient('.player-wrapper', {
  vtt: 'path/to/sprite.vtt', // Optional: Use VTT sprite mode
});

ambient.mount(); 
```

## CSS Options

<table>
  <tr>
    <th>Var</th>
    <th>Default</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>--blur-amount</td>
    <td>45px</td>
    <td>Blur amount of the background glow.</td>
  </tr>
  <tr>
    <td>--frames-buffer</td>
    <td>2s</td>
    <td>Interval between frames in sprite mode.</td>
  </tr>
  <tr>
    <td>--scale-factor</td>
    <td>1.05</td>
    <td>Scale factor for the background glow in sprite mode.</td>
  </tr>
</table>


## Methods

### mount()
Creates and attaches the canvas overlay.
- In live mode, it renders live video frames onto the canvas.
- In Sprite mode, it displays sprite thumbnails based on the current video time.

### unmount()
Removes the canvas and cleans up all associated event listeners.