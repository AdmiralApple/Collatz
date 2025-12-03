# Collatz Visualizer

This repository now includes both the original Processing sketch and a browser-friendly p5.js port so it can run on GitHub Pages.

## Desktop Processing sketch
- Open `CollatzMulti/CollatzMulti.pde` in Processing 4 (https://processing.org/download) to recreate the original multi-world animation.
- The sketch still supports exporting audio/video when run locally.

## Browser version (GitHub Pages)
- The `docs/` folder hosts the p5.js rewrite that mirrors the multi-world layout and force-directed node behavior.
- Open `docs/index.html` directly or serve the folder locally with `python -m http.server 8000` and visit `http://localhost:8000/docs/`.
- Adjust the grid size (number of simultaneous worlds), tweak spawn pacing, and drag nodes to nudge their trajectories. The browser build omits audio/video capture so it can run without extra permissions.

Here's the video the original code was used for: https://www.youtube.com/watch?v=n63FBYqj98E
