const R = 3.99;
const X0_BASE = 0.123456789;
const LFSR_SEED = 0b10101010;
const LFSR_TAPS = [7, 5, 4, 3];
const GRID = 24;
const LAB_SIZE = 256;

function mod256(n) {
  return ((n % 256) + 256) % 256;
}

function logisticMap(x0, r, size) {
  const x = new Float64Array(size);
  x[0] = x0;
  for (let i = 1; i < size; i++) x[i] = r * x[i - 1] * (1 - x[i - 1]);
  return x;
}

function lfsr(seed, taps, length) {
  let sr = seed;
  const output = new Array(length);
  for (let i = 0; i < length; i++) {
    let bit = 0;
    for (const t of taps) bit ^= (sr >> t) & 1;
    sr = (sr >> 1) | (bit << 7);
    output[i] = sr & 1;
  }
  return output;
}

function argsort(arr) {
  const idx = Array.from(arr, (_, i) => i);
  idx.sort((a, b) => arr[a] - arr[b] || a - b);
  return idx;
}

function encryptPixels(flat, rows, cols) {
  const size = flat.length;
  const sum = flat.reduce((a, b) => a + b, 0);
  const factor = sum / (255 * rows * cols);
  let x0 = (X0_BASE + factor) % 1;
  if (x0 === 0) x0 = 0.5;

  const chaos = logisticMap(x0, R, size);
  const indices = argsort(chaos);
  const shuffled = indices.map((i) => flat[i]);

  const key = lfsr(LFSR_SEED, LFSR_TAPS, size).map((k) => k * 255);

  const encrypted = new Array(size);
  let prev = 0;
  for (let i = 0; i < size; i++) {
    const chaosVal = Math.floor(chaos[i] * 255);
    const val = mod256(shuffled[i] + key[i] + chaosVal + prev);
    encrypted[i] = val;
    prev = val;
  }

  const backward = encrypted.slice();
  prev = 0;
  for (let i = size - 1; i >= 0; i--) {
    backward[i] = mod256(encrypted[i] + prev);
    prev = backward[i];
  }

  return { shuffled, cipher: backward, x0, sum, factor, indices, chaos, key };
}

function decryptPixels(cipher, factor, rows, cols) {
  const size = cipher.length;
  let x0 = (X0_BASE + factor) % 1;
  if (x0 === 0) x0 = 0.5;
  const chaos = logisticMap(x0, R, size);
  const indices = argsort(chaos);
  const key = lfsr(LFSR_SEED, LFSR_TAPS, size).map((k) => k * 255);

  const forward = new Array(size);
  let prev = 0;
  for (let i = size - 1; i >= 0; i--) {
    forward[i] = mod256(cipher[i] - prev);
    prev = cipher[i];
  }

  const shuffled = new Array(size);
  prev = 0;
  for (let i = 0; i < size; i++) {
    const chaosVal = Math.floor(chaos[i] * 255);
    shuffled[i] = mod256(forward[i] - key[i] - chaosVal - prev);
    prev = forward[i];
  }

  const flat = new Array(size);
  for (let i = 0; i < size; i++) flat[indices[i]] = shuffled[i];
  return flat;
}

function drawGray(canvas, pixels, rows, cols) {
  const ctx = canvas.getContext("2d");
  canvas.width = cols;
  canvas.height = rows;
  const img = ctx.createImageData(cols, rows);
  for (let i = 0; i < pixels.length; i++) {
    const v = pixels[i];
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function makeSubject(n) {
  const px = new Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const nx = x / (n - 1);
      const ny = y / (n - 1);
      const cx = nx - 0.42;
      const cy = ny - 0.38;
      const face = Math.exp(-(cx * cx * 7 + cy * cy * 9));
      const eyeL = Math.exp(-((nx - 0.34) ** 2 * 220 + (ny - 0.34) ** 2 * 280));
      const eyeR = Math.exp(-((nx - 0.52) ** 2 * 220 + (ny - 0.34) ** 2 * 280));
      const mouth = Math.exp(-((nx - 0.43) ** 2 * 70 + (ny - 0.55) ** 2 * 400));
      const grain = ((x * 13 + y * 29) % 17) / 17;
      const v = 28 + face * 190 - eyeL * 90 - eyeR * 90 - mouth * 40 + grain * 18;
      px[y * n + x] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  return px;
}

function setupBackground() {
  const canvas = document.getElementById("bg-chaos");
  const ctx = canvas.getContext("2d");
  let points = [];

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  resize();
  addEventListener("resize", resize);

  function seedPoints() {
    points = Array.from({ length: 90 }, (_, i) => {
      let x = 0.12 + (i % 17) * 0.041;
      for (let k = 0; k < 12; k++) x = R * x * (1 - x);
      return { x, y: (0.07 * i) % 1, a: 0.15 + (i % 5) * 0.08 };
    });
  }
  seedPoints();

  function tick() {
    ctx.fillStyle = "rgba(5,5,5,0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f4f1";
    for (const p of points) {
      p.x = R * p.x * (1 - p.x);
      p.y = (p.y + 0.0018 + p.x * 0.002) % 1;
      const px = (p.x * 0.86 + 0.07) * canvas.width;
      const py = p.y * canvas.height;
      ctx.globalAlpha = p.a;
      ctx.fillRect(px, py, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  tick();
}

function setupLogistic() {
  const canvas = document.getElementById("logistic-canvas");
  const label = document.getElementById("chaos-label");
  const ctx = canvas.getContext("2d");
  let x0 = 0.314;

  function frame(t) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(244,244,241,0.18)";
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      const y = R * x * (1 - x);
      const px = 40 + x * (w - 80);
      const py = h - 36 - y * (h - 72);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(40, h - 36);
    ctx.lineTo(w - 40, 36);
    ctx.stroke();

    x0 = 0.12 + 0.76 * (0.5 + 0.5 * Math.sin(t / 2800));
    if (x0 === 0) x0 = 0.5;
    label.textContent = `x₀ = ${x0.toFixed(4)}`;

    const sx = (x) => 40 + x * (w - 80);
    const sy = (y) => h - 36 - y * (h - 72);

    ctx.strokeStyle = "#f4f4f1";
    ctx.beginPath();
    let x = x0;
    ctx.moveTo(sx(x), sy(0));
    for (let i = 0; i < 36; i++) {
      const nx = R * x * (1 - x);
      ctx.lineTo(sx(x), sy(nx));
      ctx.lineTo(sx(nx), sy(nx));
      x = nx;
    }
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#f4f4f1";
    ctx.beginPath();
    ctx.arc(sx(x0), sy(0), 3, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function setupLfsr() {
  const wrap = document.getElementById("lfsr-bits");
  const stream = document.getElementById("lfsr-stream");
  const out = document.getElementById("lfsr-bit");
  const tapSet = new Set(LFSR_TAPS);
  const cells = [];

  for (let i = 7; i >= 0; i--) {
    const el = document.createElement("div");
    el.className = "bit" + (tapSet.has(i) ? " tap" : "");
    el.innerHTML = `<span>b${i}</span><b>0</b>`;
    wrap.appendChild(el);
    cells.push(el);
  }

  const history = [];
  for (let i = 0; i < 48; i++) {
    const tick = document.createElement("i");
    stream.appendChild(tick);
    history.push(tick);
  }

  let sr = LFSR_SEED;

  function clock() {
    let bit = 0;
    for (const t of LFSR_TAPS) bit ^= (sr >> t) & 1;
    sr = (sr >> 1) | (bit << 7);
    const lsb = sr & 1;
    out.textContent = `out = ${lsb}`;

    for (let i = 0; i < 8; i++) {
      const v = (sr >> (7 - i)) & 1;
      cells[i].classList.toggle("on", v === 1);
      cells[i].querySelector("b").textContent = String(v);
    }

    history.push(history.shift());
    stream.appendChild(history[history.length - 1]);
    history[history.length - 1].classList.toggle("on", lsb === 1);
  }

  clock();
  setInterval(clock, 420);
}

function drawField(canvas, pixels, highlight) {
  const ctx = canvas.getContext("2d");
  const n = GRID;
  const cell = canvas.width / n;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.length; i++) {
    const x = i % n;
    const y = Math.floor(i / n);
    const v = pixels[i];
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
  }
  if (highlight != null) {
    const x = highlight % n;
    const y = Math.floor(highlight / n);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
  }
}

function setupShuffleAndDiffuse() {
  const shuffleCanvas = document.getElementById("shuffle-canvas");
  const diffuseCanvas = document.getElementById("diffuse-canvas");
  const src = makeSubject(GRID);
  const { shuffled, cipher, indices } = encryptPixels(src, GRID, GRID);
  const sctx = shuffleCanvas.getContext("2d");
  const cell = shuffleCanvas.width / GRID;

  let t = 0;
  function frame() {
    t += 1;
    const cycle = 220;
    const p = (t % cycle) / cycle;
    const ease = p < 0.15 ? 0 : p > 0.7 ? 1 : (p - 0.15) / 0.55;
    const u = ease * ease * (3 - 2 * ease);

    sctx.fillStyle = "#000";
    sctx.fillRect(0, 0, shuffleCanvas.width, shuffleCanvas.height);
    for (let dest = 0; dest < src.length; dest++) {
      const from = indices[dest];
      const x0 = from % GRID;
      const y0 = Math.floor(from / GRID);
      const x1 = dest % GRID;
      const y1 = Math.floor(dest / GRID);
      const x = (x0 + (x1 - x0) * u) * cell;
      const y = (y0 + (y1 - y0) * u) * cell;
      const v = src[from];
      sctx.fillStyle = `rgb(${v},${v},${v})`;
      sctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }

    const wave = Math.floor(((t % 180) / 180) * cipher.length);
    const vis = cipher.map((v, i) => (i <= wave ? v : shuffled[i]));
    drawField(diffuseCanvas, vis, wave);
    requestAnimationFrame(frame);
  }
  frame();
}

function setupPipeline() {
  const steps = [...document.querySelectorAll(".pipe-step")];
  let i = 0;
  setInterval(() => {
    steps.forEach((s, n) => s.classList.toggle("is-on", n === i));
    i = (i + 1) % steps.length;
  }, 1400);
  steps[0]?.classList.add("is-on");
}

function rasterizeToGray256(img) {
  const n = LAB_SIZE;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, n, n);
  const scale = Math.max(n / img.width, n / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (n - w) / 2, (n - h) / 2, w, h);
  const data = ctx.getImageData(0, 0, n, n).data;
  const px = new Array(n * n);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    px[p] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  return px;
}

function setupLab() {
  const status = document.getElementById("lab-status");
  const input = document.getElementById("image-input");
  const btnRun = document.getElementById("btn-run");
  const n = LAB_SIZE;
  let current = makeSubject(n);

  function metrics(sum, x0) {
    document.getElementById("m-sum").textContent = String(sum);
    document.getElementById("m-x0").textContent = x0.toFixed(8);
    document.getElementById("m-mean").textContent = (sum / (n * n) / 255).toFixed(4);
  }

  function blank() {
    return new Array(n * n).fill(12);
  }

  function showPlain(px) {
    drawGray(document.getElementById("frame-plain"), px, n, n);
    drawGray(document.getElementById("frame-conf"), blank(), n, n);
    drawGray(document.getElementById("frame-cipher"), blank(), n, n);
    drawGray(document.getElementById("frame-plain-out"), blank(), n, n);
    status.textContent = `${n}×${n} grayscale ready · ${n * n} pixels. Run the cipher.`;
  }

  function run() {
    btnRun.disabled = true;
    status.textContent = `Encrypting ${n}×${n} (${n * n} pixels)…`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const t0 = performance.now();
        const { shuffled, cipher, x0, sum, factor } = encryptPixels(current, n, n);
        const recovered = decryptPixels(cipher, factor, n, n);
        drawGray(document.getElementById("frame-plain"), current, n, n);
        drawGray(document.getElementById("frame-conf"), shuffled, n, n);
        drawGray(document.getElementById("frame-cipher"), cipher, n, n);
        drawGray(document.getElementById("frame-plain-out"), recovered, n, n);
        metrics(sum, x0);
        const ms = Math.round(performance.now() - t0);
        let mismatch = 0;
        for (let i = 0; i < recovered.length; i++) {
          if (recovered[i] !== current[i]) mismatch++;
        }
        status.textContent = mismatch === 0
          ? `Round-trip exact on ${n}×${n} in ${ms} ms. Cipher is noise; decryption matches the plaintext.`
          : `Decryption mismatch on ${mismatch} pixels.`;
        btnRun.disabled = false;
      });
    });
  }

  function loadImageFile(file) {
    const img = new Image();
    img.onload = () => {
      current = rasterizeToGray256(img);
      URL.revokeObjectURL(img.src);
      showPlain(current);
    };
    img.src = URL.createObjectURL(file);
  }

  document.getElementById("btn-sample").addEventListener("click", () => {
    current = makeSubject(n);
    showPlain(current);
  });
  btnRun.addEventListener("click", run);
  input.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  });

  const drop = input.closest(".file-drop");
  drop.addEventListener("dragover", (e) => e.preventDefault());
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  });

  showPlain(current);
}

setupBackground();
setupLogistic();
setupLfsr();
setupShuffleAndDiffuse();
setupPipeline();
setupLab();
