// Browser-ready Collatz visualization using p5.js. Nodes represent integers and
// each arrow points toward the result of applying the Collatz-style rule. The
// layout is kept readable with light physics: arrows pull connected values
// together while nearby nodes repel each other.

let nodes = new Map();
let spawnTimer = 0;
let spawnInterval = 90;
let maxValue = 50000;
let lowestMissing = 1;
let worldHue = 0.55;

const canvasW = 1100;
const canvasH = 700;
const nodeRadius = 20;
const repelDistance = 80;
const arrowPull = 0.015;
const repelForce = 0.1;
const friction = 0.92;
const maxIterations = 1500;

function setup() {
  const wrapper = document.getElementById("canvas-wrapper");
  const cnv = createCanvas(canvasW, canvasH);
  cnv.parent(wrapper);
  colorMode(HSB, 1);
  textFont("Inter", 16);

  // Wire up UI elements so visitors can tweak the rule and pacing.
  document.getElementById("reset-btn").addEventListener("click", resetSimulation);
  ["input-a", "input-b", "input-interval", "input-max"].forEach((id) => {
    document.getElementById(id).addEventListener("change", resetSimulation);
  });

  resetSimulation();
}

function resetSimulation() {
  nodes.clear();
  lowestMissing = 1;
  spawnTimer = 0;
  spawnInterval = int(document.getElementById("input-interval").value) || 90;
  maxValue = int(document.getElementById("input-max").value) || 50000;
  worldHue = (1.618 * (getA() + 2 * getB()) + 0.5) % 1.0;
  updateStatus("Building chain from 1…");
}

function getA() {
  return int(document.getElementById("input-a").value) || 3;
}

function getB() {
  return int(document.getElementById("input-b").value) || 1;
}

function draw() {
  background(worldHue, 0.7, 0.14);
  drawBackdrop();

  // Step 1: physics for existing nodes.
  nodes.forEach((node) => node.applyForces());
  nodes.forEach((node) => node.updatePosition());

  // Step 2: render all connections and circles.
  nodes.forEach((node) => node.drawNode());

  // Step 3: spawn a new chain when the timer elapses.
  spawnTimer -= 1;
  if (spawnTimer <= 0) {
    createNextChain();
    spawnTimer = spawnInterval;
  }
}

function drawBackdrop() {
  noStroke();
  fill(0, 0, 1, 0.03);
  rect(0, 0, width, height);

  fill(0, 0, 1, 0.15);
  textSize(28);
  textAlign(CENTER, CENTER);
  text(`Rule: y = ${getA()}x + ${getB()} (odd), y = x/2 (even)`, width / 2, 26);
}

function evaluate(val) {
  if (val % 2 === 0) {
    return val / 2;
  }
  const a = getA();
  const b = getB();
  const result = a * val + b;
  if (result > maxValue) {
    return Number.POSITIVE_INFINITY;
  }
  return result;
}

function createNextChain() {
  let chain = [];
  let val = lowestMissing;
  let iterations = 0;

  while (!nodes.has(val) && iterations < maxIterations && val < maxValue) {
    chain.push(val);
    val = evaluate(val);
    iterations += 1;
  }

  if (val >= maxValue || val === Number.POSITIVE_INFINITY) {
    updateStatus(
      `Growth exceeded the upper bound (${maxValue}). Try lowering a or b, or raise the bound.`,
    );
    spawnTimer = spawnInterval * 4; // slow down while stuck
    return;
  }

  const existing = nodes.get(val);
  const existingBlink = existing ? existing.blink : 0;

  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const value = chain[i];
    const blink = (existingBlink + chain.length - i) % 24;
    const node = new Node(value, blink);
    nodes.set(value, node);
  }

  // Wire pointers after the nodes exist so we can look them up safely.
  chain.forEach((value) => {
    const node = nodes.get(value);
    const target = nodes.get(evaluate(value));
    node.pointer = target;
  });

  setLowestMissing();
  updateStatus(`Highest value seen: ${highestValue()}. Next start: ${lowestMissing}`);
}

function setLowestMissing() {
  while (nodes.has(lowestMissing)) {
    lowestMissing += 1;
  }
}

function highestValue() {
  let max = 1;
  nodes.forEach((node) => {
    if (node.value > max) {
      max = node.value;
    }
  });
  return max;
}

class Node {
  constructor(value, blink) {
    this.value = value;
    this.pointer = null;
    this.blink = blink;
    this.pos = createVector(random(width * 0.2, width * 0.8), random(height * 0.25, height * 0.8));
    this.vel = createVector(random(-1, 1), random(-1, 1));
    this.spawnedAt = frameCount;
  }

  applyForces() {
    // Pull toward the target to keep chains visible.
    if (this.pointer) {
      const dir = p5.Vector.sub(this.pointer.pos, this.pos);
      const dist = max(0.001, dir.mag());
      dir.normalize();
      const strength = arrowPull * (dist - repelDistance * 0.6);
      this.vel.add(dir.mult(strength));
    }

    // Repel from other nodes to limit overlap.
    nodes.forEach((other) => {
      if (other === this) return;
      const dir = p5.Vector.sub(this.pos, other.pos);
      const dist = dir.mag();
      if (dist < repelDistance && dist > 0) {
        dir.normalize();
        const strength = repelForce * (1 - dist / repelDistance);
        this.vel.add(dir.mult(strength));
      }
    });

    // Nudge away from edges so the layout remains on screen.
    const margin = nodeRadius * 3;
    if (this.pos.x < margin) this.vel.x += 0.6;
    if (this.pos.x > width - margin) this.vel.x -= 0.6;
    if (this.pos.y < margin) this.vel.y += 0.6;
    if (this.pos.y > height - margin) this.vel.y -= 0.6;

    this.vel.mult(friction);
  }

  updatePosition() {
    this.pos.add(this.vel);
    this.pos.x = constrain(this.pos.x, nodeRadius * 1.5, width - nodeRadius * 1.5);
    this.pos.y = constrain(this.pos.y, nodeRadius * 1.5, height - nodeRadius * 1.5);
  }

  drawNode() {
    const age = frameCount - this.spawnedAt;
    const colorShift = map(Math.sqrt(this.value), 1, Math.sqrt(highestValue()), 0.7, 0.02, true);
    const hue = constrain(worldHue - colorShift, 0, 1);

    // Draw arrow first so circles sit on top.
    if (this.pointer) {
      stroke(0, 0, 1, 0.3);
      strokeWeight(2);
      const dir = p5.Vector.sub(this.pointer.pos, this.pos);
      const dist = dir.mag();
      dir.normalize();
      const arrowEnd = p5.Vector.add(this.pos, p5.Vector.mult(dir, max(dist - nodeRadius, 0)));
      line(this.pos.x, this.pos.y, arrowEnd.x, arrowEnd.y);
    }

    // Pulsing halo while the node settles in.
    if (age < 24) {
      noStroke();
      fill(0, 0, 1, 0.28 * (1 - age / 24));
      const halo = nodeRadius * (1.2 + 0.4 * (1 - age / 24));
      circle(this.pos.x, this.pos.y, halo * 2);
    }

    // Core circle.
    noStroke();
    fill(hue, 0.6, 0.95);
    circle(this.pos.x, this.pos.y, nodeRadius * 2);

    // Blink accent adds movement across chains.
    if ((frameCount / 8) % 24 > 22 - this.blink) {
      fill(0, 0, 1, 0.9);
      circle(this.pos.x, this.pos.y, nodeRadius * 0.85);
    }

    // Value label.
    fill(hue, 0.25, 1);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(this.value, this.pos.x, this.pos.y);
  }
}

function updateStatus(msg) {
  document.getElementById("status").textContent = msg;
}
