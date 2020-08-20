const canvas = document.createElement("canvas");
const context = canvas.getContext("2d");

document.body.insertBefore(canvas, document.body.firstChild);

let infoBox = document.createElement("div");
infoBox.style.whiteSpace = "pre";
document.body.insertBefore(infoBox, canvas.nextSibling);

function bindValues(input, output, formatter) {
	let prefix = output.getAttribute("data-prefix") || "";
	if(!formatter)
		formatter = value => value;
	let sync = () => {
		output.value = prefix+formatter(input.value);
	};
	input.addEventListener("input", sync);
	sync();
}

function bindValuesTight(a, b, cb) {
	let f = cb ? value => (cb(value), value) : null;
	bindValues(a, b, f);
	bindValues(b, a, f);
}

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

const c = [width * 0.5 - 0.5, height * 0.5 - 0.5];

let controlList = ["diffusorSize", "baseRadius", "largeBeadInclusion"].flatMap(e => [e + "Range", e+"Field"]);
let controls = controlList.reduce((obj, e) => (obj[e] = document.getElementById(e), obj), {});
let config = {};

const r = 6.5;
const diffusorSize = 4.5;
const ourFatherIncluded = true;
const ourFatherInclusion = 0.25;

context.save();
function generate(r, mmDiffusorSize, ourFatherIncluded, ourFatherInclusion) {
  context.restore();
  context.save();
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      drawCircle((x + 0.5) * rasterSize, (y + 0.5) * rasterSize, rasterSize * 0.3);
    }
  }

  const diffusorSize = mmDiffusorSize / mmRasterSize * rasterSize;
  const count = 10 + (ourFatherIncluded ? 1 : 0);
  const fullCircle = Math.PI * 2 - (ourFatherIncluded ? 2 * Math.max(0, 2 - Math.pow(Math.min(1, 3 * Math.abs(ourFatherInclusion)), 3)) * Math.PI / count : 0);
  const offset = (Math.PI * 2 - fullCircle) * 0.5;
  const layout = fullCircle / (ourFatherIncluded ? count - 2 : count);

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
  for (let i = 0; i < count; ++i) {
    let angle = i * layout + offset;
    let rAdj = 1;
    let em = angle >= 2 * Math.PI;
    if (em) {
      angle = 0;
      rAdj = 1 - ourFatherInclusion * 2;
    }
    let orientation = (angle/Math.PI + 0.75) % 1 >= 0.5 ? 1 : 0;
    let coords = [Math.sin(angle) * r, -Math.cos(angle) * r].map(e => e * rAdj);
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
        p[orientation] += 1;
        setRaster(p[0], p[1], Math.round(orientation) ? "red" : "blue");
      }
      drawCircle(...coords.map(transformDimension).concat([diffusorSize]));
      context.fillStyle = em ? "#8cfc" : "#2bfc";
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

  infoBox.textContent = size.map(e => (2 * e * mmRasterSize).toFixed(1)+"mm").join(" x ") +
    "\nDiffusor size: "+diffusorSize/rasterSize*mmRasterSize+"mm";

}

function configUpdated(key) {
  try {
    localStorage["ledrosary"] = JSON.stringify(config);
  } catch (e) {
    // never mind
  }
  generate(config.baseRadius || r, config.diffusorSize || diffusorSize, ourFatherIncluded, config.largeBeadInclusion || ourFatherInclusion);
}

const rangeSuffix = "Range";
Object.keys(controls).forEach(key => {
	if (key.substring(key.length - rangeSuffix.length) === rangeSuffix) {
		const base = key.substring(0, key.length - rangeSuffix.length);
		const fieldName = base + "Field";
		if (fieldName in controls) {
		    console.log("Binding "+key+" with "+fieldName);
			if (base in config) {
				[key, fieldName].forEach(n => controls[n].value = config[base]);
			} else {
				config[base] = +controls[fieldName].value;
			}
			bindValuesTight(controls[fieldName], controls[key], newValue => {
				config[base] = +newValue;
				configUpdated(base);
			});
		}
	}
});

generate(r, diffusorSize, ourFatherIncluded, ourFatherInclusion);
