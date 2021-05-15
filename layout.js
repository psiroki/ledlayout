const canvas = document.createElement("canvas");
const context = canvas.getContext("2d");
let dumpEnabled = false;

document.body.insertBefore(canvas, document.body.firstChild);

let infoBox = document.createElement("div");
infoBox.style.whiteSpace = "pre";
document.body.insertBefore(infoBox, canvas.nextSibling);

function bindValues(input, output, formatter) {
  let prefix = output.getAttribute("data-prefix") || "";
  if (!formatter)
    formatter = value => value;
  let sync = () => {
    output.value = prefix + formatter(input.value);
  };
  input.addEventListener("input", sync);
  sync();
}

function bindValuesTight(a, b, cb) {
  let f = cb ? value => (cb(value), value) : null;
  bindValues(a, b, f);
  bindValues(b, a, f);
}

const ledState = new Array(12).fill(0);

const width = 22;
const height = 22;

const rasterSize = 32 * window.devicePixelRatio;
const mmRasterSize = 2.54;

canvas.width = width * rasterSize;
canvas.height = height * rasterSize;
canvas.style.width = canvas.width / window.devicePixelRatio + "px";
canvas.style.height = canvas.height / window.devicePixelRatio + "px";

let drawList = [];

function setRaster(x, y, color, draw) {
  if (!color) color = "#000f";
  x = Math.floor(x);
  y = Math.floor(y);
  context.fillStyle = color;
  if (!draw) draw = context.fillRect.bind(context);
  drawList.push({_name: "rect", x: x * mmRasterSize, y: y * mmRasterSize, width: mmRasterSize, height: mmRasterSize});
  draw(x * rasterSize, y * rasterSize, rasterSize, rasterSize);
}

function drawCircle(x, y, r) {
  drawList.push({
    _name: "circle",
    cx: x * mmRasterSize / rasterSize,
    cy: y * mmRasterSize / rasterSize, r: r * mmRasterSize / rasterSize,
    fill: "none",
    stroke: "black",
    "stroke-width": "0.125mm"
  });
  context.beginPath();
  context.ellipse(x, y, r, r, 0, 2 * Math.PI, 0);
  context.stroke();
}

function drawCenteredText(x, y, text) {
  let baseline = context.textBaseline;
  let align = context.textAlign;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.fillText(text, x, y);
  context.textBaseline = baseline;
  context.textAlign = align;
}

const c = [width * 0.5 - 0.5, height * 0.5 - 0.5];

let controlList = ["diffusorSize", "baseRadius", "largeBeadInclusion", "voltage"]
    .flatMap(e => [e + "Range", e + "Field"])
    .concat(["next", "reset", "prev"].map(e => e+"Toggle"))
    .concat("diagnostics", "mcuReset");
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

  drawList = [];

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      drawCircle((x + 0.5) * rasterSize, (y + 0.5) * rasterSize, rasterSize * 0.3);
    }
  }

  drawList.forEach(e => e.stroke = "#888");

  const diffusorSize = mmDiffusorSize / mmRasterSize * rasterSize;
  const count = 10 + (ourFatherIncluded ? 1 : 0);
  const fullCircle = Math.PI * 2 - (ourFatherIncluded ? 2 * Math.max(0, 2 - Math.pow(Math.min(1, 3 * Math.abs(ourFatherInclusion)), 3)) * Math.PI / count : 0);
  const offset = (Math.PI * 2 - fullCircle) * 0.5;
  const layout = fullCircle / (ourFatherIncluded ? count - 2 : count);

  const transformDimension = (e, j) => rasterSize * (e + c[j]);

  let lastRaster = null;

  context.font = rasterSize + "px sans-serif";

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
    let orientation = (angle / Math.PI + 0.75) % 1 >= 0.5 ? 1 : 0;
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
      let fillColor = em ? "8cf" : "2bf";
      context.fillStyle = "#" + fillColor + (ledState[i] ? "c" : "4");
      context.fill();
      context.strokeStyle = "#0008";
      context.beginPath();
      context.moveTo(...[0, 0].map(transformDimension));
      context.lineTo(...coords.map(transformDimension));
      context.stroke();
      context.strokeStyle = "#000";
      context.fillStyle = "#" + Array.from(fillColor).map(e => (15 - parseInt(e, 16)).toString(16)).join("") + "c";
      drawCenteredText(...coords.map(transformDimension), i.toString());
      if (m || Math.abs(coords[0]) < 0.5) break;
      coords[0] = -coords[0];
      if (orientation === 0) coords[0] -= 1.0;
    }
  }

  overlay.forEach(e => e());

  infoBox.textContent = size.map(e => (2 * e * mmRasterSize).toFixed(1) + "mm").join(" x ") +
    "\nDiffusor size: " + diffusorSize / rasterSize * mmRasterSize + "mm";

}

function generateSvg() {
  let lines = [`<svg viewBox="${[0, 0, width, height].map(e => e * 4).join(" ")}" xmlns="http://www.w3.org/2000/svg">`];
  lines.push(...drawList.map(e => `<${e._name} ${Object.entries(e).filter(e => !e[0].startsWith("_")).map(e => e[0]+"="+JSON.stringify(e[1].toString())).join(" ")}/>`));
  lines.push("</svg>");
  return lines.join("\n")
}

function redraw() {
  generate(config.baseRadius || r, config.diffusorSize || diffusorSize, ourFatherIncluded, config.largeBeadInclusion || ourFatherInclusion);
}

function configUpdated(key) {
  try {
    localStorage["ledrosary"] = JSON.stringify(config);
  } catch (e) {
    // never mind
  }
  redraw();
}

const runtime = {
  voltage: 4,
  next: 0,
  reset: 0,
  prev: 0,
  analog: 0
};

const sheets = {
  config: {
    values: config,
    update: configUpdated
  },
  runtime: {
    values: runtime,
    update: () => {}
  }
};

const rangeSuffix = "Range";
const toggleSuffix = "Toggle";
Object.keys(controls).forEach(key => {
  let control = controls[key];
  while (control && control !== document.documentElement && !control.getAttribute("data-sheet")) {
    control = control.parentNode;
  }
  let sheet = sheets.config;
  if (control && control.getAttribute("data-sheet")) {
    sheet = sheets[control.getAttribute("data-sheet")] || sheet;
  }
  let config = sheet.values;
  control = controls[key];
  if (key.endsWith(rangeSuffix)) {
    const base = key.substring(0, key.length - rangeSuffix.length);
    const fieldName = base + "Field";
    if (fieldName in controls) {
      console.log("Binding " + key + " with " + fieldName);
      if (base in config) {
        [key, fieldName].forEach(n => controls[n].value = config[base]);
      } else {
        config[base] = +controls[fieldName].value;
      }
      bindValuesTight(controls[fieldName], controls[key], newValue => {
        config[base] = +newValue;
        sheet.update(base);
      });
    }
  } else if (key.endsWith(toggleSuffix)) {
    const base = key.substring(0, key.length - toggleSuffix.length);
    const values = control.getAttribute("data-values").trim().split(/\s*,\s*/g).map(e => +e);
    if (control.tagName.toLowerCase() === "button") {
      let pressed = false;
      const press = () => {
        if (pressed) return;
        pressed = true;
        const release = () => {
          config[base] = values[0];
          try {
            pressed = false;
            control.classList.remove("pressed");
            document.documentElement.removeEventListener("pointerup", release);
          } finally {
            sheet.update(base);
          }
        };
        config[base] = values[1];
        try {
          document.documentElement.addEventListener("pointerup", release);
          control.classList.add("pressed");
        } finally {
          sheet.update(base);
        }
      };
      control.addEventListener("pointermove", e => {
        if (e.pressure > 0) press();
      });
      control.addEventListener("pointerdown", e => {
        e.preventDefault();
        e.target.releasePointerCapture(e.pointerId);
        press();
      });
    }
  }
});

let initialized = false;
let poweredDown = false;
let TCNT0 = 0;
let TCCR0B = 0;
let ADMUX = 0;
let ADCSRA = 0;
let ADCSRB = 0;
let ADCH = 0;
let ADCL = 0;
const divisor = [null, 1, 8, 64, 256, 1024, null, null];

function powerDown() {
  poweredDown = true;
}

sheets.runtime.update = (key) => {
  // all resistances are in kiloohms
  const baseLowerResistance = 200; // R2
  let lowerConductivity = 1/baseLowerResistance;
  for (let toggle of ["next", "reset", "prev"]) {
    if (runtime[toggle]) lowerConductivity += 1/runtime[toggle];  // R3, R4...
  }
  const lowerResistance = 1/lowerConductivity;
  const upperResistance = 1000; // R1
  const pb4Voltage = runtime.voltage / (lowerResistance + upperResistance) * lowerResistance;
  const pb4Base = runtime.voltage / (baseLowerResistance + upperResistance) * baseLowerResistance;
  const pb4Adc = pb4Voltage/1.1*1024|0;
  const pb4AdcBase = pb4Base/1.1*1024|0;
  runtime.analog = pb4Adc;
  ADCH = pb4Adc >> 2;
  ADCL = pb4Adc << 6 & 0xff;
  if (dumpEnabled) {
    console.log("pb4Voltage: "+pb4Voltage.toFixed(2)+" that is "+pb4Adc+
      " compared to normal: "+(pb4Adc/(pb4AdcBase >> 7)).toFixed(1)+" pp128");
  }
};

function lightUp(index) {
  ledState.fill(0);
  if (!(index & 0xf0)) ledState[index] = 1;
}

function updateState(t) {
  if (window.app) {
    if (window.app.freq) {
      const div = divisor[TCCR0B & 7];
      if (div) TCNT0 = (window.app.freq || 1e6)/div*t & 0xff;
    }
    if (!initialized) {
      sheets.runtime.update("voltage");
      window.app.setup();
      initialized = true;
    }
    if (!poweredDown) window.app.loop();
    if (app.diagnostics) {
      controls.diagnostics.textContent = JSON.stringify(app.diagnostics(), null, 2);
    }
  } else {
    let one = ledState.findIndex(e => e);
    if (one >= 0) ledState[one] = 0;
    one = (one + 1) % ledState.length;
    ledState[one] = 1;
  }
  //generate(r, diffusorSize, ourFatherIncluded, ourFatherInclusion);
  redraw();

  requestAnimationFrame(updateState);
}

controls.mcuReset.addEventListener("click", () => {
  initialized = false;
  poweredDown = false;
});

updateState();
