// p5.js port of the Processing-based multiverse visualization.
// Renders multiple Collatz-like worlds, each with its own ax + b rule.

let WORLD_T_XSTART = 0;
let WORLD_T_YSTART = 0;
let WORLD_T_W = 3;
let WORLD_T_H = 3;

const SPEED_UP_RATE = 0.6; // Matching the pacing curve from the desktop sketch.
let CREATE_EVERY = 120;
const CHAIN_TIME = 90;
const RAD = 18;
const TARGET_DIST = 54;
const FUZZ_DIST = 96;
const SIDE_FORCE = 0.015;
const ARROW_FORCE = 0.015;
const FRICTION = 0.88;
const BLINK_COUNT = 15;
const BLINK_SPEED = 5;

let SCREEN_W = 1280;
let SCREEN_H = 720;
let WORLD_W = 0;
let WORLD_H = 0;
let M = 8;

let BALL_COLOR;
let TEXT_COLOR;
let LINE_COLOR;

let worlds = [];
let dragging = null;

function setup() {
  const holder = document.getElementById("canvas-holder");
  SCREEN_W = Math.min(windowWidth - 80, 1440);
  SCREEN_H = Math.round(SCREEN_W * 9 / 16);
  const canvas = createCanvas(SCREEN_W, SCREEN_H);
  canvas.parent(holder);
  colorMode(HSB, 1);
  ellipseMode(RADIUS);

  BALL_COLOR = color(0.6, 0.4, 1.0);
  TEXT_COLOR = color(0.6, 1.0, 0.4);
  LINE_COLOR = color(0.5, 1.0, 1.0);

  hookControls();
  buildWorlds();
}

function windowResized() {
  SCREEN_W = Math.min(windowWidth - 80, 1440);
  SCREEN_H = Math.round(SCREEN_W * 9 / 16);
  resizeCanvas(SCREEN_W, SCREEN_H);
  buildWorlds();
}

function hookControls() {
  const gridInput = document.getElementById("grid-size");
  gridInput.addEventListener("change", () => {
    WORLD_T_W = WORLD_T_H = constrain(parseInt(gridInput.value, 10) || 1, 1, 4);
    buildWorlds();
  });

  const speedInput = document.getElementById("speed");
  const speedLabel = document.getElementById("speed-label");
  const updateSpeed = () => {
    CREATE_EVERY = parseInt(speedInput.value, 10) || 120;
    speedLabel.textContent = `${CREATE_EVERY} frames`;
    worlds.forEach((w) => (w.timer = random(0, CREATE_EVERY)));
  };
  speedInput.addEventListener("input", updateSpeed);
  updateSpeed();

  const resetButton = document.getElementById("reset");
  resetButton.addEventListener("click", buildWorlds);
}

function buildWorlds() {
  WORLD_W = SCREEN_W / WORLD_T_W - M * 2;
  WORLD_H = SCREEN_H / WORLD_T_H - M * 2;
  worlds = [];
  for (let x = 0; x < WORLD_T_W; x++) {
    for (let y = 0; y < WORLD_T_H; y++) {
      const ap_x = SCREEN_W * (x / WORLD_T_W) + M;
      const ap_y = SCREEN_H * (y / WORLD_T_H) + M;
      const a = WORLD_T_YSTART + WORLD_T_H - 1 - y;
      const b = WORLD_T_XSTART + x;
      const stagger = random();
      worlds.push(new World(a, b, ap_x, ap_y, stagger));
    }
  }
}

function draw() {
  background(0, 0, 1);
  worlds.forEach((world) => world.update());
  worlds.forEach((world) => world.draw());
}

function mousePressed() {
  dragging = findNearestNum(mouseX, mouseY);
}

function mouseReleased() {
  dragging = null;
}

function findNearestNum(mx, my) {
  let closest = null;
  let bestDist = Infinity;
  worlds.forEach((world) => {
    if (!world.contains(mx, my)) return;
    const local = world.toLocal(mx, my);
    world.nums.forEach((n) => {
      if (!n.born()) return;
      const d = dist(local.x, local.y, n.coor[0], n.coor[1]);
      if (d < RAD * n.getScale() * 1.4 && d < bestDist) {
        bestDist = d;
        closest = n;
      }
    });
  });
  return closest;
}

class World {
  constructor(a, b, ap_x, ap_y, stagger) {
    this.a = a;
    this.b = b;
    this.ap_x = ap_x;
    this.ap_y = ap_y;
    this.timer = stagger * CREATE_EVERY;
    this.worldHue = (1.61803 * (a + 2 * b) + 0.5) % 1.0;
    this.nums = [];
    this.chain = [];
    this.lowestNonMade = 1;
    this.HIT_MAX = false;
    this.HIT_MAX_VIS = false;
    this.maxSoFar = 1;
    this.frames = 0;
    this.canvas = createGraphics(int(WORLD_W), int(WORLD_H));
    this.canvas.colorMode(HSB, 1);
    this.canvas.ellipseMode(RADIUS);
  }

  contains(mx, my) {
    return mx >= this.ap_x && mx <= this.ap_x + WORLD_W && my >= this.ap_y && my <= this.ap_y + WORLD_H;
  }

  toLocal(mx, my) {
    return { x: mx - this.ap_x, y: my - this.ap_y };
  }

  update() {
    if (this.HIT_MAX_VIS) return;

    this.nums.forEach((n) => n.applyForces(this.nums));
    this.nums.forEach((n) => n.applyVelocities());

    if (this.timer < 0) {
      this.createNext();
      this.timer += CREATE_EVERY + chainSizeToTime(this.chain.length);
    }
    if (this.timer < CREATE_EVERY && this.timer + 1 >= CREATE_EVERY) {
      // reserved: audio cue; browsers require user interaction for autoplay
    }
    this.timer -= 1;
    this.frames += 1;
  }

  draw() {
    const g = this.canvas;
    g.push();
    g.background(this.worldHue, 0.6, 0.5);

    const FS = 60;
    g.textSize(FS);
    g.textAlign(CENTER, CENTER);
    g.fill(0, 0, 1, 0.34);
    g.text(`y = ${this.a}x + ${this.b}`.toString(), WORLD_W * 0.5, WORLD_H * 0.5);

    this.nums.forEach((n) => n.drawNum());

    if (this.HIT_MAX_VIS) {
      g.fill(0.0, 1.0, 0.0, 0.4);
      g.rect(0, 0, WORLD_W, WORLD_H);
      g.fill(0, 0, 1, 1);
      g.textSize(70);
      g.text("INTEGER", WORLD_W * 0.5, WORLD_H * 0.45);
      g.text("OVERFLOW", WORLD_W * 0.5, WORLD_H * 0.6);
    }
    g.pop();

    image(this.canvas, this.ap_x, this.ap_y);
  }

  createNext() {
    this.chain = [];
    let val = this.lowestNonMade;
    let iters = 0;
    const MAX_ITER = 1500;
    while (!exists(this.nums, val, this.chain) && iters < MAX_ITER && !this.HIT_MAX) {
      this.chain.push(val);
      val = this.evaluate(val);
      if (val >= Number.MAX_SAFE_INTEGER) {
        this.HIT_MAX = true;
      }
      iters += 1;
    }

    const base = getWithVal(this.nums, val);
    let base_blink = 0;
    if (base) base_blink = base.blink;

    for (let i = 0; i < this.chain.length; i++) {
      const newBlink = (base_blink + (this.chain.length - i)) % BLINK_COUNT;
      const newNum = new Num(this.chain[i], i, newBlink, this);
      this.nums.push(newNum);
    }

    let coor = newCoor();
    if (base) coor = [...base.coor];
    for (let i = this.chain.length - 1; i >= 0; i--) {
      const thisVal = this.chain[i];
      const num = getWithVal(this.nums, thisVal);
      num.pointer = getWithVal(this.nums, this.evaluate(thisVal));
      fuzz(coor);
      num.coor = [...coor];
    }
    this.setLowestNonMade();
  }

  setLowestNonMade() {
    while (exists(this.nums, this.lowestNonMade, null)) {
      this.lowestNonMade += 1;
    }
  }

  evaluate(val) {
    if (val % 2 === 0) return val / 2;
    if (this.a >= 1 && val >= (Number.MAX_SAFE_INTEGER - 1) / this.a) return Number.MAX_SAFE_INTEGER;
    return val * this.a + this.b;
  }

  freezeScreen() {
    this.HIT_MAX_VIS = true;
    this.nums.forEach((n) => cap(n.coor, n.getScale()));
  }
}

class Num {
  constructor(val, queuePos, blink, world) {
    this.coor = [0, 0, 0, 0];
    this.val = val;
    this.birthTime = frameCount + chainSizeToTime(queuePos);
    this.activeTime = frameCount + chainSizeToTime(queuePos + 1);
    this.blink = blink;
    this.queue_pos = queuePos;
    this.world = world;
    this.pointer = null;
    this.canvas = world.canvas;
  }

  born() {
    return frameCount >= this.birthTime;
  }

  active() {
    return frameCount >= this.activeTime;
  }

  getScale() {
    if (!this.active()) {
      return 3 * (1 - pow(0.7, frameCount - this.birthTime));
    }
    return 1 + 2 * pow(0.7, frameCount - this.activeTime);
  }

  applyForces(nums) {
    if (this.born() && this.val > this.world.maxSoFar) {
      this.world.maxSoFar = this.val;
    }
    if (!this.active()) return;

    if (this.pointer && this.pointer !== this) {
      if (this.val < this.pointer.val || this !== this.pointer.pointer) {
        this.applyForce(this, this.pointer, TARGET_DIST, true);
      }
    }

    nums.forEach((other) => {
      if (other.val > this.val || other === this || !other.born()) return;
      this.applyForce(this, other, TARGET_DIST, false);
    });

    // Keep nodes from clustering directly on the equation label.
    const AVOID_FORCE = 0.05;
    const yFrac = this.coor[1] / WORLD_H;
    if (yFrac >= 0.3 && yFrac <= 0.5) {
      const fac = 0.8 + 0.2 * ((yFrac - 0.3) / (0.5 - 0.3));
      this.coor[3] -= AVOID_FORCE * fac;
    } else if (yFrac >= 0.5 && yFrac <= 0.7) {
      const fac = 0.8 + 0.2 * ((0.7 - yFrac) / (0.7 - 0.5));
      this.coor[3] += AVOID_FORCE * fac;
    }

    const xFrac = this.coor[0] / WORLD_W;
    if (xFrac >= 0.2 && xFrac <= 0.35) {
      const fac = 0.8 + 0.2 * ((xFrac - 0.2) / (0.35 - 0.2));
      this.coor[2] -= AVOID_FORCE * fac;
    } else if (xFrac >= 0.65 && xFrac <= 0.8) {
      const fac = 0.8 + 0.2 * ((0.8 - xFrac) / (0.8 - 0.65));
      this.coor[2] += AVOID_FORCE * fac;
    }

    if (this.coor[0] < TARGET_DIST) {
      this.coor[2] += (TARGET_DIST - this.coor[0]) * SIDE_FORCE;
    } else if (this.coor[0] > WORLD_W - TARGET_DIST) {
      this.coor[2] += (WORLD_W - TARGET_DIST - this.coor[0]) * SIDE_FORCE;
    }
    if (this.coor[1] < TARGET_DIST) {
      this.coor[3] += (TARGET_DIST - this.coor[1]) * SIDE_FORCE;
    } else if (this.coor[1] > WORLD_H - TARGET_DIST) {
      this.coor[3] += (WORLD_H - TARGET_DIST - this.coor[1]) * SIDE_FORCE;
    }

    this.coor[2] *= FRICTION;
    this.coor[3] *= FRICTION;
  }

  applyForce(n1, n2, target, isArrow) {
    if (!n1 || !n2) return;
    if (!n1.active() || !n2.active()) return;
    const c1 = n1.coor;
    const c2 = n2.coor;
    const dVal = dist(c1[0], c1[1], c2[0], c2[1]);
    if (dVal === 0) return;
    let forceMultiplier = dVal - target;
    if (!isArrow) {
      forceMultiplier = -pow(0.2, dVal / TARGET_DIST) * 70;
    }
    const xPart = (c2[0] - c1[0]) / dVal;
    const yPart = (c2[1] - c1[1]) / dVal;
    const dvx = xPart * forceMultiplier * ARROW_FORCE;
    const dvy = yPart * forceMultiplier * ARROW_FORCE;
    c1[2] += dvx;
    c1[3] += dvy;
    c2[2] -= dvx;
    c2[3] -= dvy;
  }

  applyVelocities() {
    this.coor[0] += this.coor[2];
    this.coor[1] += this.coor[3];
    if (dragging === this) {
      const local = this.world.toLocal(mouseX, mouseY);
      this.coor[0] = local.x;
      this.coor[1] = local.y;
      this.coor[2] = 0;
      this.coor[3] = 0;
    }
    cap(this.coor, this.getScale());
  }

  drawNum() {
    if (!this.born()) return;
    if (this.born() && !this.pointer && this.world.HIT_MAX) {
      this.world.freezeScreen();
    }

    const g = this.canvas;
    g.push();
    g.translate(this.coor[0], this.coor[1]);

    const age = frameCount - this.birthTime;
    if (age < 30) {
      g.noStroke();
      g.fill(0, 0, 1, 1 - age / 30.0);
      const out = 0.3 * age + 1;
      g.ellipse(0, 0, RAD * out, RAD * out);
    }

    g.scale(this.getScale());
    g.noStroke();
    g.fill(0, 0, 0, 0.5);
    g.ellipse(3, 3, RAD, RAD);

    const hue = 0.666 - 0.666 * ((sqrt(this.val) - 1.0) / sqrt(this.world.maxSoFar));
    g.fill(changeHue(BALL_COLOR, hue));
    if ((this.world.frames / BLINK_SPEED) % BLINK_COUNT === BLINK_COUNT - 1 - this.blink) {
      g.fill(0, 0, 1, 1.0);
    }
    g.ellipse(0, 0, RAD, RAD);
    g.fill(changeHue(TEXT_COLOR, hue));
    g.textAlign(CENTER, CENTER);

    const valStr = commafy(this.val);
    let FS = 18;
    g.textSize(FS);
    const MAX_W = RAD * 1.76;
    if (g.textWidth(valStr) >= MAX_W) {
      FS /= g.textWidth(valStr) / MAX_W;
    }
    g.textSize(FS);
    g.text(valStr, 0, 2);

    g.pop();

    if (this.pointer && this.pointer.born()) {
      this.drawArrow(this.coor, this.pointer.coor);
    }
  }

  drawArrow(c1, c2) {
    const g = this.canvas;
    const dVal = dist(c1[0], c1[1], c2[0], c2[1]);
    const angle = atan2(c2[1] - c1[1], c2[0] - c1[0]);
    g.push();
    g.stroke(LINE_COLOR);
    g.strokeWeight(3);
    g.translate(c1[0], c1[1]);
    g.rotate(angle);

    if (dVal === 0) {
      const P = 20;
      const alts = new Array(P + 1);
      const angs = new Array(P + 1);
      for (let p = 0; p <= P; p++) {
        const prog = p / P;
        alts[p] = RAD * sin(prog * PI);
        angs[p] = TWO_PI * (0.5 + prog * 0.25);
      }
      for (let p = 0; p < P; p++) {
        const x1 = (RAD + alts[p]) * cos(angs[p]);
        const y1 = (RAD + alts[p]) * sin(angs[p]);
        const x2 = (RAD + alts[p + 1]) * cos(angs[p + 1]);
        const y2 = (RAD + alts[p + 1]) * sin(angs[p + 1]);
        g.line(x1, y1, x2, y2);
      }
      g.line(dVal - RAD, 0, dVal - RAD - 1.3 * RAD, 0.6 * RAD);
      g.line(dVal - RAD, 0, dVal - RAD - 0.3 * RAD, -1.7 * RAD);
    } else {
      g.line(RAD, 0, dVal - RAD, 0);
      g.line(dVal - RAD, 0, dVal - RAD - RAD, RAD);
      g.line(dVal - RAD, 0, dVal - RAD - RAD, -RAD);
    }
    g.pop();
  }
}

// Utility helpers ported from the Processing sketch.
function changeHue(c, newHue) {
  const hsba = color(newHue, saturation(c), brightness(c));
  return hsba;
}

function chainSizeToTime(s) {
  return CHAIN_TIME * pow(s, SPEED_UP_RATE);
}

function newCoor() {
  return [random(0.3, 0.7) * WORLD_W, random(0.3, 0.7) * WORLD_H, random(-1, 1), random(-1, 1)];
}

function fuzz(arr) {
  arr[0] += random(-FUZZ_DIST, FUZZ_DIST);
  arr[1] += random(-FUZZ_DIST, FUZZ_DIST);
  cap(arr, 1);
}

function cap(arr, s) {
  const limits = [RAD * s, RAD * s, WORLD_W - RAD * s, WORLD_H - RAD * s];
  capLimit(arr, limits);
}

function capLimit(arr, limits) {
  arr[0] = min(max(arr[0], limits[0]), limits[2]);
  arr[1] = min(max(arr[1], limits[1]), limits[3]);
  for (let d = 0; d < 2; d++) {
    if (arr[d] === limits[d]) {
      arr[d + 2] = abs(arr[d + 2]);
    } else if (arr[d] === limits[d + 2]) {
      arr[d + 2] = -abs(arr[d + 2]);
    }
  }
}

function exists(nums, val, chain) {
  if (getWithVal(nums, val)) return true;
  if (chain) {
    for (let i = 0; i < chain.length; i++) {
      if (chain[i] === val) return true;
    }
  }
  return false;
}

function getWithVal(nums, val) {
  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    if (val === num.val) return num;
  }
  return null;
}

function commafy(n) {
  return n.toLocaleString("en-US");
}
