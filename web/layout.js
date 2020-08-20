const canvas = document.createElement("canvas");
const context = canvas.getContext("2d");

document.body.appendChild(canvas);

const width = 22;
const height = 22;

const rasterSize = 32 * window.devicePixelRatio;
const mmRasterSize = 2.54;

canvas.width = width * rasterSize;
canvas.height = height * rasterSize;
canvas.style.width = canvas.width / window.devicePixelRatio + "px";
canvas.style.height = canvas.height / window.devicePixelRatio + "px";

function setRaster(x, y, color, draw) {
  if (!color) color = "#000f";
  x = Math.floor(x);
  y = Math.floor(y);
  context.fillStyle = color;
  if (!draw) draw = context.fillRect.bind(context);
  draw(x * rasterSize, y * rasterSize, rasterSize, rasterSize);
}

function drawCircle(x, y, r) {
  context.beginPath();
  context.ellipse(x, y, r, r, 0, 2 * Math.PI, 0);
  context.stroke();
}

for (let y = 0; y < height; ++y) {
  for (let x = 0; x < width; ++x) {
    drawCircle((x + 0.5) * rasterSize, (y + 0.5) * rasterSize, rasterSize * 0.3);
  }
}

const r = 6.5;
const c = [width * 0.5 - 0.5, height * 0.5 - 0.5];
const diffusorSize = rasterSize * 1.75;

const transformDimension = (e, j) => rasterSize * (e + c[j]);

let lastRaster = null;

context.font = rasterSize+"px sans-serif";

function drawDelta(lastRaster, thisRaster) {
  if (lastRaster === null) {
    context.beginPath();
    context.ellipse(...thisRaster.map(transformDimension).concat(3, 3, 0, 2 * Math.PI, 0));
    context.stroke();
  } else {
    let d = thisRaster.map((e, i) => e - lastRaster[i]);
    let mid = thisRaster.map((e, i) => (e + lastRaster[i]) * 0.5);
    context.fillStyle = "black";
    context.beginPath();
    context.moveTo(...lastRaster.map(transformDimension));
    context.lineTo(...lastRaster.map((e, i) => i ? thisRaster[i] : e).map(transformDimension));
    context.lineTo(...thisRaster.map(transformDimension));
    context.ellipse(...thisRaster.map(transformDimension).concat(3, 3, 0, 2 * Math.PI, 0));
    context.stroke();
    d.forEach((v, i) => {
      let p = mid.map((e, j) => i === j ? e : (j === 0 ? lastRaster : thisRaster)[j])
        .map(transformDimension);
      context.fillText(v, p[0], p[1]);
    });
  }
}

let overlay = [];
let size = [0, 0];
for (let i = 0; i < 10; ++i) {
  let angle = i * Math.PI / 5;
  let orientation = [1, 1, 0, 0, 1][i % 5];
  let coords = [Math.sin(angle) * r, Math.cos(angle) * r];
  let thisRaster = coords.map(Math.round);
  for (let m = 0; m < 1; ++m) {
    if (thisRaster !== null) {
      overlay.push(((last, current) => () => drawDelta(last, current))(lastRaster, thisRaster));
      lastRaster = thisRaster;
      thisRaster = null;
    }
    coords.forEach((e, i) => size[i] = Math.max(Math.abs(e), size[i]));
    let p = coords.map((e, i) => e + c[i]);
    if (!m) {
      p[orientation] -= 0.5;
      setRaster(p[0], p[1], Math.round(orientation) ? "red" : "blue");
      // setRaster(width - 1 - p[0], p[1], Math.round(orientation) ? "red" : "blue");
      p[orientation] += 1;
      setRaster(p[0], p[1], Math.round(orientation) ? "red" : "blue");
      // setRaster(width - 1 - p[0], p[1], Math.round(orientation) ? "red" : "blue");
    }
    drawCircle(...coords.map(transformDimension).concat([rasterSize * 1.75]));
    context.fillStyle = "#2bfc"
    context.fill();
    context.strokeStyle = "#0008";
    context.beginPath();
    context.moveTo(...[0, 0].map(transformDimension));
    context.lineTo(...coords.map(transformDimension));
    context.stroke();
    context.strokeStyle = "#000";
    if (m || Math.abs(coords[0]) < 0.5) break;
    coords[0] = -coords[0];
    if (orientation === 0) coords[0] -= 1.0;
  }
}

overlay.forEach(e => e());

let div = document.createElement("div");
div.style.whiteSpace = "pre";

div.textContent = size.map(e => (2 * e * mmRasterSize).toFixed(1)+"mm").join(" x ") +
  "\nDiffusor size: "+diffusorSize/rasterSize*mmRasterSize+"mm";

document.body.appendChild(div);
