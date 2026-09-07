const binaryCanvas = document.getElementById("binary-field");
const binaryContext = binaryCanvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let binaryColumns = [];

function resizeBinaryField() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  binaryCanvas.width = window.innerWidth * pixelRatio;
  binaryCanvas.height = window.innerHeight * pixelRatio;
  binaryCanvas.style.width = `${window.innerWidth}px`;
  binaryCanvas.style.height = `${window.innerHeight}px`;
  binaryContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const columnCount = Math.ceil(window.innerWidth / 44);
  binaryColumns = Array.from({ length: columnCount }, (_, column) => ({
    x: column * 44 + 10,
    y: Math.random() * window.innerHeight,
    speed: 0.12 + Math.random() * 0.3,
    length: 7 + Math.floor(Math.random() * 8),
    values: Array.from({ length: 18 }, () => Math.random() > 0.5 ? "1" : "0"),
  }));
}

function drawBinaryField() {
  binaryContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
  binaryContext.font = "11px Inter, sans-serif";
  binaryContext.textAlign = "center";

  for (const column of binaryColumns) {
    for (let row = 0; row < column.length; row++) {
      const y = column.y + row * 24;
      if (y < -24 || y > window.innerHeight + 24) continue;
      const isLead = row === column.length - 1;
      binaryContext.fillStyle = isLead
        ? "rgba(244, 244, 241, 0.34)"
        : "rgba(138, 138, 134, 0.17)";
      binaryContext.fillText(column.values[row], column.x, y);
    }
    if (!reducedMotion) {
      column.y += column.speed;
      if (column.y > window.innerHeight + 24) column.y = -column.length * 24;
    }
  }

  if (!reducedMotion) requestAnimationFrame(drawBinaryField);
}

function switchBits() {
  for (const column of binaryColumns) {
    const index = Math.floor(Math.random() * column.values.length);
    column.values[index] = Math.random() > 0.5 ? "1" : "0";
  }
}

resizeBinaryField();
drawBinaryField();
window.addEventListener("resize", resizeBinaryField);
window.setInterval(switchBits, 520);