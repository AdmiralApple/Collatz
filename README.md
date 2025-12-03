To create the actual animation, go to the Collatz/CollatzMulti folder, and then open CollatzMulti.pde in Processing 4 (https://processing.org/download) and run it. Fun!
Here's the video this code was used for: https://www.youtube.com/watch?v=n63FBYqj98E

## Browser version
The repository now includes a p5.js sketch that runs in any modern browser and is suitable for GitHub Pages. Open `index.html` (or host the repo with Pages) to interactively explore Collatz-style rules. Controls at the top of the page let you adjust the odd multiplier `a`, odd offset `b`, and the numeric ceiling that halts runaway growth.

To preview locally without Processing:

1. From the repository root, start a tiny web server: `python -m http.server 8000`
2. Visit http://localhost:8000 in your browser.
3. Click **Add start** to grow the next chain, then tweak the rule to see how it redirects the graph.
