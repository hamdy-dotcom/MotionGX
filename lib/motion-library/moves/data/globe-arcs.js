// Globe arcs: a dark dotted globe turns slowly (rotation y = t·rotation rad/s) while glowing arcs lift off a hub city
// and land on others. Each arc follows the great circle with an auto-scaled altitude (arcAltitudeAutoScale × the
// angular distance), its colour a gradient from accent at 0.2 alpha to accent, and grows from its start (head 0 → 1)
// before dashes run along it (dash 0.4, gap `dash_gap`, offset = (t / dash_time) mod 1 — globe.gl's
// arcDashAnimateTime driven from t). Arcs launch every `arc_stagger` s; endpoints get repeating ring pulses.
// globe.gl / Three.js are not on move pages, so the globe is our own orthographic canvas painter (land as dots on a
// Fibonacci sphere, like cobe), every frame a pure function of t. Fewer dots on 9:16.
// Source: MengTo/Skills web-design/globe-gl (MIT) — the technique; the code is ours.
ML.define({
  id: "data.globe-arcs",
  category: "data",
  name: "Globe arcs connect",
  does: "A dark 3D globe turns slowly while glowing arcs lift off one city and land on others, dashes running along them.",
  says: ["connection", "scale", "growth", "flow"],
  energy: 3,
  targets: ["chart", "stage"],
  duration: [2.5, 8],
  params: {
    arcs: { type: "number", range: [3, 30], default: 10 },
    origin: { type: "choice", options: ["one-to-many", "many-to-many"], default: "one-to-many" },
    rotation: { type: "number", range: [0, 0.3], default: 0.1, unit: "rad/s" },
    rings: { type: "bool", default: true },
    arc_stagger: { type: "number", range: [0.15, 0.3], default: 0.2, unit: "s" },
    hub: { type: "text", default: "Riyadh" },
    altitude: { type: "number", range: [0.3, 0.5], default: 0.4 },
    stroke: { type: "number", range: [0.4, 0.8], default: 0.6 },
    dash_gap: { type: "number", range: [0.2, 2], default: 0.5 },
    dash_time: { type: "number", range: [1.5, 3], default: 2, unit: "s" },
    labels: { type: "bool", default: true },
    dark: { type: "bool", default: true },
  },
  pairs: ["data.globe-columns", "data.globe-turn-to-location"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/globe-gl", license: "MIT", note: "globe.gl arcs layer rebuilt as our own canvas painter (no three.js on move pages)" },
  setup(ctx) {
    const { p, at, end } = ctx;
    // ── the dotted globe, painted on a canvas from t (orthographic; land from simplified coastlines) ──
    const D2R = Math.PI / 180;
    const LAND = [
      [[-168,66],[-162,70],[-156,71.3],[-140,69.6],[-128,70],[-115,68.5],[-95,72],[-82,73],[-80,63],[-94,59],[-92,57],[-82,55],[-79,52],[-77,60],[-71,61],[-65,60],[-61,56],[-56,52],[-60,47],[-66,45],[-70,42],[-74,40.5],[-76,35],[-81,31],[-80,25.5],[-82,27],[-84,30],[-89,30],[-94,29.5],[-97,26],[-97.5,22],[-96,19],[-91,18.5],[-90,21.3],[-87,21.5],[-88,16],[-83.5,15],[-83.5,11],[-79.5,9],[-77.5,8],[-80,7.5],[-83,8.5],[-86,11],[-88,13.3],[-92,14.5],[-95,16],[-101,17.5],[-105,20],[-105.5,23],[-109,25.8],[-112.5,29.5],[-114.8,31.5],[-114,30],[-112,27],[-110,23],[-112,24.5],[-114.5,28],[-117,32.5],[-120.5,34.5],[-122.5,37.5],[-124,40.5],[-124.5,43],[-124,46.5],[-123,49],[-127,51],[-130,54.5],[-134,58],[-140,60],[-147,60.5],[-152,59],[-156,57],[-162,55],[-158,58],[-162,60],[-165,62.5],[-164.5,64.5]],
      [[-73,78],[-60,82],[-30,83.5],[-20,82],[-18,77],[-20,72],[-24,69.5],[-32,68],[-40,65],[-43,60],[-48,61],[-52,65],[-54,68],[-55,72],[-62,76]],
      [[-80,63.5],[-73,62],[-64.5,63.5],[-62,66.5],[-68,70.5],[-77,72.7],[-90,73.5],[-84,70],[-81,68.5],[-85.5,66.5],[-77,65]],
      [[-120,71],[-117,69],[-102,68],[-97,69.6],[-92,74.5],[-85,76],[-80,79],[-62,82.5],[-90,82],[-105,79],[-120,76],[-125,72]],
      [[-77.5,8],[-75,11],[-71.5,12.5],[-68,10.5],[-62,10.7],[-60,8.5],[-57,6],[-52,5],[-50,1.5],[-48,-1],[-44,-2.5],[-39,-3.5],[-35,-5.5],[-35,-9],[-38.5,-13],[-39,-17.5],[-41,-22],[-44.5,-23],[-48.5,-26.5],[-48.7,-28.5],[-52,-32],[-53.5,-34],[-58.5,-34.5],[-57,-36.5],[-57.5,-38.5],[-62,-39],[-65,-41],[-64,-42.5],[-65.5,-45],[-67.5,-46.5],[-66,-48],[-69,-51],[-68.5,-52.5],[-71,-54],[-74.5,-52],[-75.5,-48],[-74,-44],[-73.5,-39],[-71.5,-30],[-70.5,-23],[-70.2,-18.5],[-75.5,-15],[-78,-10],[-81,-6],[-80.5,-2.5],[-80,0],[-79,1.5],[-77.5,4]],
      [[-9.5,37],[-6,36.2],[-2,36.7],[0,38.8],[3,41.9],[3.2,43.3],[6,43],[9,44.4],[10.5,43],[12,41.7],[15.6,40],[16,38],[17,39],[18.5,40.2],[16,41.4],[14,42.5],[12.3,44.2],[13.6,45.7],[15,44.5],[19.5,41.8],[20,39.5],[22.5,36.5],[24,38],[23,40.4],[26,40.8],[26.5,38.5],[28,36.7],[30.5,36.3],[36,36.5],[35.8,34.5],[35,32.5],[34.3,31.3],[34.9,29.5],[36.5,27.5],[39,22],[41,17],[43,13],[45,12.8],[49,14.2],[52,15.8],[55,17.5],[57.8,19],[59.8,22.5],[57,24],[56.3,26.2],[54,24],[51.5,24.5],[51.5,26],[50,26.5],[48,29.5],[50,30],[51.5,27.9],[54.5,26.5],[57,25.7],[61.5,25.1],[66.5,25.4],[67.5,23.8],[70,21],[72.8,21],[73,19],[74,15],[75.5,11],[77,8.1],[78.2,8.9],[79.8,10.3],[80.2,13.5],[80,15.5],[82.2,16.6],[84.5,19.2],[87,21.5],[89,21.9],[91.5,22.5],[92.5,20.5],[94.3,16.5],[95.5,15.8],[97.6,16.5],[98.5,13],[99.2,9.5],[100.3,6.5],[101.3,2.8],[103.5,1.3],[104.3,1.7],[103.4,4.5],[102.2,6.2],[100.3,8],[99.9,12.5],[101,12.7],[103,11],[105,8.6],[106.5,9.6],[109.2,11.6],[109,15],[106.5,18],[106,20],[108,21.6],[110.5,21],[113.5,22.3],[117,23.5],[119.5,26],[121.5,29],[121,31],[120.3,34.3],[119.2,35],[120.7,36.4],[122.5,37.4],[118.5,38],[117.7,39],[121.3,40.9],[122,39.5],[121.5,38.8],[124.5,40],[126.5,37.8],[126.5,35],[129.4,35.5],[129.5,37],[128,38.8],[129.8,40.9],[130.7,42.3],[133,42.8],[137,45.5],[140.5,48.3],[140.5,51.5],[141.5,53.3],[137.5,54],[135.5,54.8],[140.5,57.7],[143.5,59.3],[149,59.5],[154,59],[155,57],[156.5,51],[160,53],[162.5,56.2],[163,57.8],[160,60.5],[164,62.5],[170.5,60],[175,62],[179.9,65],[179.9,69],[170,70],[161,69.5],[151,71.5],[142,72.7],[130,71],[128,73],[113,73.5],[110,76.5],[104,77.7],[98,76],[90,75.5],[80,73.5],[72,72.5],[68.5,70.5],[66.5,71.5],[69,73],[61,69.5],[55,68.5],[44,68.5],[44,66],[40,66.2],[35,66.5],[41,67.5],[33,69.3],[28,71],[20,70],[14,68],[12,65],[5,62],[5,58.5],[7,58],[10.5,59.3],[11,58.3],[12.5,56.5],[10.5,57.5],[8.5,57],[8.2,55.5],[8.6,53.9],[5,53.4],[4,51.5],[1.6,50.9],[-1.5,49.7],[-1.9,48.7],[-4.7,48.5],[-2,47.4],[-1.2,46],[-1.8,43.4],[-8,43.7],[-9.3,43],[-8.8,41],[-9.5,38.8]],
      [[-17,21],[-16,24],[-13,27.8],[-10,29.8],[-9.7,32],[-6.8,34],[-5.9,35.8],[-2,35.1],[3,36.8],[10,37.3],[11,35.2],[10.2,33.8],[11.5,33.1],[15.2,32.3],[19,30.3],[20.1,32.2],[23,32.6],[25,31.7],[29,30.9],[32.3,31.3],[34.3,31.3],[34.6,28],[33,28.5],[32.5,30],[35.5,24],[37.3,21],[38.5,18],[39.7,15.4],[43.3,12.5],[44,10.5],[51.2,11.8],[51,10.4],[49.8,6.8],[47.5,4],[44,0],[41,-2],[39.2,-4.7],[39.7,-7.5],[40.4,-10.5],[40.6,-15],[37,-17.5],[35,-20],[35.5,-24],[32.9,-26],[32.5,-28.5],[30,-31.3],[27,-33.6],[22.5,-34],[18.5,-34.2],[18,-31.5],[16.5,-28.6],[15,-26.5],[14.5,-22.5],[11.8,-17.5],[12,-13.5],[13.5,-11],[12,-6],[12.3,-4.5],[9.5,-2],[9.5,1],[9.8,3],[8.7,4.5],[6,4.3],[4.5,6.3],[2,6.3],[-2,4.8],[-4,5.2],[-7.5,4.4],[-9.5,5.5],[-12.5,7.5],[-13.3,9.5],[-15,11],[-16.8,13],[-17.5,14.7],[-16.5,16.5],[-16.2,19]],
      [[44,-25],[47,-25],[50.4,-15.5],[49.2,-12],[47.9,-13.5],[46.3,-15.8],[44.3,-16.5],[43.3,-21.8]],
      [[114,-22],[113.5,-26],[115,-30],[115,-33.5],[116.5,-35],[118,-35],[121,-33.9],[124,-33],[126,-32.2],[129,-31.6],[131.3,-31.5],[134,-32.7],[135.6,-34.8],[137.5,-33],[138,-35.6],[140,-37.8],[143.5,-38.8],[146.3,-39.1],[150,-37.5],[150.8,-35],[152.8,-32],[153.5,-28.5],[153,-25.5],[150.8,-22.5],[149,-20.5],[146,-18.5],[145.4,-15],[143.5,-14],[142.5,-10.7],[141.5,-13],[141.6,-17],[140,-17.7],[137.5,-16],[135.5,-15],[136.8,-12.2],[133,-11.3],[130.5,-12.3],[129.5,-15],[127.8,-14.2],[125.5,-14.5],[122.2,-17.5],[121,-19.5],[117,-20.6]],
      [[144.6,-40.7],[148.3,-40.9],[148,-43.2],[146,-43.6],[145,-42]],
      [[172.7,-34.4],[174.5,-36.5],[178.5,-37.7],[177,-39.6],[174.6,-41.3],[172.7,-40.5],[171.5,-41.8],[168,-46.2],[169,-46.6],[171.2,-44.4],[173.3,-42],[174.3,-41.7],[175.5,-40],[174.8,-38],[173,-35.5]],
      [[130,31.3],[131.3,31.4],[132,33.2],[135,33.5],[136.9,34.3],[139.8,34.9],[140.8,35.7],[141,38.3],[142,39.6],[141.4,41.4],[140,40.6],[139.9,39],[138.5,37.5],[136.8,37.3],[136,35.6],[132.6,35.5],[130.9,34.3],[129.7,33.2]],
      [[140,41.5],[141.4,41.4],[143.3,42],[145.5,43.3],[144.5,44],[141.7,45.4],[141.4,43.4],[140.4,43.3]],
      [[-5.7,50],[1.4,51.2],[1.7,52.7],[0.2,53.5],[-1.6,55.5],[-2,57.7],[-3.3,58.6],[-5,58.6],[-6.2,56.8],[-5,55],[-3,54.9],[-3.4,53.4],[-4.7,52.8],[-5.3,51.7],[-3.3,51.4]],
      [[-10,51.6],[-6.2,52.2],[-6,54],[-7.3,55.3],[-10,54.2]],
      [[-24,65.5],[-22,66.5],[-15,66.5],[-13.5,65],[-18.5,63.4],[-22.5,63.8]],
      [[95.3,5.6],[98,4],[103.8,-1],[106,-3],[106,-5.9],[104.5,-5.9],[102.3,-4],[100.5,-1],[98.5,1.8]],
      [[105.2,-6.8],[108.3,-6.2],[111,-6.4],[114.5,-7.7],[114.5,-8.7],[108.6,-7.8],[106.4,-7.4]],
      [[109,1.5],[110,1.7],[111.5,2.6],[113,3.2],[115.5,5.2],[117.2,6.9],[119,5.2],[118,4.3],[117.8,1.1],[119,0.9],[116.5,-1.5],[116.5,-4],[114.5,-4],[110.2,-3],[109,-0.5]],
      [[119.5,-5.5],[120.5,0.5],[124.5,1.2],[121,-1],[123.2,-4.8],[121.5,-4.5]],
      [[131,-1.5],[134,-0.8],[138,-1.6],[141,-2.6],[145.8,-4.9],[147.5,-6.2],[147,-8],[150,-10.4],[146,-8.4],[143.5,-9.3],[142.5,-9.3],[141,-9.1],[139,-8.1],[138,-5],[133,-4.1],[132,-2.9]],
      [[120.6,18.5],[122.3,18.4],[122,16],[124,13],[122.5,13],[120.6,14.3],[120,16.4]],
      [[122,7],[125.5,9.5],[126.6,7.3],[125.4,5.6],[123.9,7.8]],
      [[79.8,9.8],[81.8,7.4],[81.3,6.1],[80,6]],
      [[120.1,23],[121,25.2],[122,25],[120.8,22]],
      [[-85,21.9],[-81,23.2],[-77.2,21.6],[-74.2,20.2],[-77.7,19.9],[-81,21.6]],
      [[-74.4,18.4],[-72.8,19.9],[-69,19.7],[-68.4,18.5],[-71.4,17.6]],
      [[-180,-66],[-120,-72],[-60,-63],[-30,-76],[0,-70],[60,-67],[120,-66],[180,-66],[180,-90],[-180,-90]],
    ];
    const WATER = [
      [[27.5,42],[28,45],[30,46.5],[33.5,46],[35,45.3],[38,47],[39.5,45],[37.5,44.5],[41.5,41.5],[36,41.6],[33,42],[29,41.2]],
      [[47,44.5],[49,46.5],[53,47],[53,45],[51,44.5],[52.8,41.5],[54,37.5],[50,37],[48.9,38.5],[49.5,40.5]],
      [[10.5,54.3],[14,54],[19,54.5],[21,55.5],[21,57],[24,57.5],[23.5,59.3],[28,60],[23,60],[21.5,61.5],[21.5,63.5],[25,65],[22,65.8],[17.5,62.5],[17,60.5],[19,59.5],[16.5,57],[14.5,56],[12.5,56.5]],
    ];
    const CITIES = [
      ["Riyadh", "الرياض", 24.7, 46.7], ["Dubai", "دبي", 25.2, 55.3], ["Cairo", "القاهرة", 30.0, 31.2], ["Jeddah", "جدة", 21.5, 39.2],
      ["Doha", "الدوحة", 25.3, 51.5], ["Kuwait", "الكويت", 29.4, 48.0], ["Muscat", "مسقط", 23.6, 58.4], ["Amman", "عمّان", 31.9, 35.9],
      ["Istanbul", "إسطنبول", 41.0, 29.0], ["Casablanca", "الدار البيضاء", 33.6, -7.6], ["London", "لندن", 51.5, -0.1], ["Paris", "باريس", 48.9, 2.35],
      ["Berlin", "برلين", 52.5, 13.4], ["Madrid", "مدريد", 40.4, -3.7], ["Moscow", "موسكو", 55.8, 37.6], ["Lagos", "لاغوس", 6.5, 3.4],
      ["Nairobi", "نيروبي", -1.3, 36.8], ["Johannesburg", "جوهانسبرغ", -26.2, 28.0], ["Karachi", "كراتشي", 24.9, 67.0], ["Mumbai", "مومباي", 19.1, 72.9],
      ["Singapore", "سنغافورة", 1.35, 103.8], ["Jakarta", "جاكرتا", -6.2, 106.8], ["Hong Kong", "هونغ كونغ", 22.3, 114.2], ["Beijing", "بكين", 39.9, 116.4],
      ["Seoul", "سيول", 37.6, 127.0], ["Tokyo", "طوكيو", 35.7, 139.7], ["Sydney", "سيدني", -33.9, 151.2], ["New York", "نيويورك", 40.7, -74.0],
      ["Toronto", "تورنتو", 43.7, -79.4], ["Los Angeles", "لوس أنجلوس", 34.0, -118.2], ["Mexico City", "مكسيكو", 19.4, -99.1], ["São Paulo", "ساو باولو", -23.5, -46.6],
    ].map(([n, ar, lat, lng]) => ({ n, ar, lat, lng }));
    const cityOf = (name) => { const q = ML.plain(String(name || "").trim()); if (!q) return null; return CITIES.find((c) => ML.plain(c.n) === q || ML.plain(c.ar) === q) || CITIES.find((c) => ML.plain(c.n).includes(q) || ML.plain(c.ar).includes(q)) || null; };
    const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    const isLand = (lng, lat) => LAND.some((p) => inPoly(lng, lat, p)) && !WATER.some((p) => inPoly(lng, lat, p));
    /** a world unit vector: x east at lng 90, y north, z toward lng 0 */
    const vec = (lat, lng) => [Math.cos(lat * D2R) * Math.sin(lng * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.cos(lng * D2R)];
    const latLngOf = (v) => ({ lat: Math.asin(Math.max(-1, Math.min(1, v[1]))) / D2R, lng: Math.atan2(v[0], v[2]) / D2R });
    const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    /** great-circle point u (0–1) of the way from a to b */
    const slerp = (a, b, u) => { const d = Math.acos(Math.max(-1, Math.min(1, dot3(a, b)))); if (d < 1e-6) return a; const s = Math.sin(d), k1 = Math.sin((1 - u) * d) / s, k2 = Math.sin(u * d) / s; return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2]; };
    const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot3(a, b))));

    // the layer: inside the target when it is a real element; else the whole scene (so the glow is never cut), with
    // the look's ground laid over the picture region and the globe centred in it
    const host = ctx.el && ctx.el !== ctx.stage && ctx.el !== ctx.scene ? ctx.el : null;
    const layer = document.createElement("div");
    let A;
    if (host) { if (getComputedStyle(host).position === "static") host.style.position = "relative"; layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:2;visibility:hidden"; host.append(layer); }
    else {
      layer.style.cssText = "position:absolute;left:0;top:0;width:var(--W);height:var(--H);pointer-events:none;z-index:5;visibility:hidden";
      const back = document.createElement("div");
      back.style.cssText = "position:absolute;left:calc(var(--pic-x) - 80px);top:var(--pic-y);width:calc(var(--pic-w) + 160px);height:calc(var(--pic-h) + 120px);background:var(--x-ground);background-image:var(--x-ground-image)";
      layer.append(back); (ctx.scene || ctx.stage).append(layer);
      A = { ...ctx.f.pic };
    }
    const W = layer.offsetWidth || ctx.f.W, H = layer.offsetHeight || ctx.f.H;
    if (!A) A = { x: 0, y: 0, w: W, h: H };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement("canvas");
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px`;
    layer.append(cv);
    const g = cv.getContext("2d");
    // look colours resolved once to numbers (a canvas needs real colours; alpha is ours)
    const probe = document.createElement("i"); probe.style.display = "none"; layer.append(probe);
    const pc = document.createElement("canvas"); pc.width = pc.height = 1; const px = pc.getContext("2d", { willReadFrequently: true });
    const col = (v) => { probe.style.color = v.startsWith("--") ? `var(${v})` : v; const s = getComputedStyle(probe).color; px.clearRect(0, 0, 1, 1); px.fillStyle = "#000"; px.fillStyle = s; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
    const lighten = (c, k) => c.map((x) => Math.round(x + (255 - x) * k));
    const cssVar = (n) => getComputedStyle(layer).getPropertyValue(n).trim();
    const fontOf = (kind, size) => kind === "label" ? `${cssVar("--x-label-weight") || 600} ${size.toFixed(1)}px ${cssVar("--x-label-font") || "monospace"}` : `${cssVar("--x-head-weight") || 700} ${size.toFixed(1)}px ${cssVar("--x-head-font") || "sans-serif"}`;
    const dark = p.dark !== false;
    const C = { accent: col("--x-accent"), accent2: col("--x-accent-2"), glow: col("--x-glow-1"), ink: col("--x-ink"), panel: col("--x-panel"), device: col("--x-device"), ground: col("--x-ground"), good: col("--x-good"), bad: col("--x-bad"), accentInk: col("--x-accent-ink") };
    C.base = dark ? C.device : C.panel;
    C.dot = dark ? lighten(C.accent2, 0.35) : C.ink;
    C.text = dark ? lighten(C.device, 0.92) : C.ink;

    // land dots on a Fibonacci sphere (cobe's mapSamples), fewer on the narrow shapes
    const SAMPLES = Math.round((ctx.f.tall ? 11000 : 15000) * (p.density || 1));
    const dots = [];
    for (let i = 0; i < SAMPLES; i++) {
      const y = 1 - (2 * (i + 0.5)) / SAMPLES, a = i * 2.399963229728653;
      const lat = Math.asin(y) / D2R, lng = (((a / D2R) % 360) + 360) % 360 - 180;
      if (isLand(lng, lat)) dots.push(vec(lat, lng));
    }
    /** a view: { phi (turn about the pole), theta (tilt), R (px), cx, cy } → screen point of world vector v at altitude alt */
    const proj = (v, alt, w) => {
      const cp = Math.cos(w.phi), sp = Math.sin(w.phi), ct = Math.cos(w.theta), st = Math.sin(w.theta);
      const x = v[0] * cp + v[2] * sp, z0 = -v[0] * sp + v[2] * cp;
      const y = v[1] * ct - z0 * st, z = v[1] * st + z0 * ct, k = w.R * (1 + alt);
      const vis = z > 0 || (alt > 0 && (x * x + y * y) * (1 + alt) * (1 + alt) > 1);
      return { x: w.cx + x * k, y: w.cy - y * k, z, vis, nx: x, ny: y };
    };
    /** the view that puts (lat, lng) at the centre */
    const facing = (lat, lng) => ({ phi: -lng * D2R, theta: lat * D2R });
    /** the nearest equal angle to `target` from `from` (so a turn never goes the long way round) */
    const nearAngle = (target, from) => target + 2 * Math.PI * Math.round((from - target) / (2 * Math.PI));
    function drawGlobe(w, alpha = 1, dotAlpha = 1) {
      // atmosphere (glowColor), the sphere with a soft diffuse light, then the land dots by depth
      const glow = g.createRadialGradient(w.cx, w.cy, w.R * 0.96, w.cx, w.cy, w.R * 1.22);
      glow.addColorStop(0, rgba(C.glow, 0.34 * alpha)); glow.addColorStop(1, rgba(C.glow, 0));
      g.fillStyle = glow; g.beginPath(); g.arc(w.cx, w.cy, w.R * 1.22, 0, Math.PI * 2); g.fill();
      const body = g.createRadialGradient(w.cx - w.R * 0.35, w.cy - w.R * 0.4, w.R * 0.1, w.cx, w.cy, w.R);
      body.addColorStop(0, rgba(lighten(C.base, dark ? 0.12 : 0), alpha)); body.addColorStop(1, rgba(C.base, alpha));
      g.fillStyle = body; g.beginPath(); g.arc(w.cx, w.cy, w.R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = rgba(C.glow, 0.35 * alpha); g.lineWidth = Math.max(1, w.R * 0.004); g.stroke();
      const r0 = Math.max(0.8, w.R * 0.0052), B = 6, paths = Array.from({ length: B }, () => new Path2D());
      for (const v of dots) {
        const q = proj(v, 0, w);
        if (q.z <= 0.02) continue;
        const b = Math.min(B - 1, Math.floor(q.z * B)), r = r0 * (0.55 + 0.45 * q.z);
        paths[b].moveTo(q.x + r, q.y); paths[b].arc(q.x, q.y, r, 0, Math.PI * 2);
      }
      paths.forEach((path, b) => { g.fillStyle = rgba(C.dot, alpha * dotAlpha * (0.2 + 0.8 * ((b + 0.5) / B))); g.fill(path); });
    }
    /** a circle on the surface around v of angular radius r (radians), as screen points ({vis} per point) */
    const ringPts = (v, r, alt, w, n = 28) => {
      const ref = Math.abs(v[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const e1 = norm([v[1] * ref[2] - v[2] * ref[1], v[2] * ref[0] - v[0] * ref[2], v[0] * ref[1] - v[1] * ref[0]]);
      const e2 = [v[1] * e1[2] - v[2] * e1[1], v[2] * e1[0] - v[0] * e1[2], v[0] * e1[1] - v[1] * e1[0]];
      const out = [];
      for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, c = Math.cos(r), s = Math.sin(r); out.push(proj([v[0] * c + (e1[0] * Math.cos(a) + e2[0] * Math.sin(a)) * s, v[1] * c + (e1[1] * Math.cos(a) + e2[1] * Math.sin(a)) * s, v[2] * c + (e1[2] * Math.cos(a) + e2[2] * Math.sin(a)) * s], alt, w)); }
      return out;
    };
    const strokeVisible = (pts) => { g.beginPath(); let on = false; for (const q of pts) { if (q.vis) { on ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); on = true; } else on = false; } g.stroke(); };
    /** the label pill: text on a panel-coloured rounded rect, anchored left (or right in RTL) of x */
    const pill = (text, x, y, size, a, above = false, fg = C.text, bg = C.base) => {
      if (a <= 0.01 || !text) return;
      g.font = fontOf("label", size);
      const tw = g.measureText(text).width, padX = size * 0.6, h = size * 1.7, wd = tw + padX * 2;
      const x0 = above ? x - wd / 2 : ctx.rtl ? x - wd - size * 0.8 : x + size * 0.8, y0 = above ? y - h - size * 0.9 : y - h / 2;
      const X = Math.max(4, Math.min(W - wd - 4, x0)), Y = Math.max(4, Math.min(H - h - 4, y0));
      g.fillStyle = rgba(bg, 0.86 * a); g.beginPath(); g.roundRect(X, Y, wd, h, h / 2); g.fill();
      g.strokeStyle = rgba(C.accent, 0.6 * a); g.lineWidth = 1; g.stroke();
      g.fillStyle = rgba(fg, a); g.textBaseline = "middle"; g.textAlign = "left"; g.fillText(text, X + padX, Y + h / 2 + size * 0.04);
    };
    const nameOf = (c) => (ctx.rtl ? c.ar : c.n);
    const clear = () => { g.reset(); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); }; // reset: no canvas state carried between frames
    /** shows the layer from at (fade) to end (fade); returns its opacity */
    const shown = (t, fadeIn = 0.45) => {
      const a = ML.out(t, at, at + fadeIn) * (1 - ML.ease(t, end - 0.35, end));
      layer.style.visibility = t < at || a <= 0.001 ? "hidden" : "visible";
      layer.style.opacity = a.toFixed(4);
      return a;
    };
    // the routes: one hub to many (spread over distance), or many cities to many within the hub's half of the world
    const hub = cityOf(p.hub) || CITIES[0], hv = vec(hub.lat, hub.lng);
    const n = Math.round(Math.min(p.arcs, ctx.f.tall ? 16 : 30));
    const near = CITIES.filter((c) => c !== hub).map((c) => ({ c, d: angle(hv, vec(c.lat, c.lng)) })).filter((x) => x.d > 0.1 && x.d < 1.2).sort((a, b) => a.d - b.d);
    const pairs = [];
    if (p.origin === "one-to-many") for (let i = 0; i < Math.min(n, near.length); i++) pairs.push([hub, near[Math.floor((i * near.length) / Math.min(n, near.length))].c]);
    else { const pool = [hub, ...near.map((x) => x.c)]; for (let k = 0; pairs.length < n && k < 400; k++) { const a = pool[Math.floor(ML.rnd(k, 3) * pool.length)], b = pool[Math.floor(ML.rnd(k, 7) * pool.length)]; if (a === b || pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue; const d = angle(vec(a.lat, a.lng), vec(b.lat, b.lng)); if (d < 0.12) continue; pairs.push([a, b]); } }
    const arcs = pairs.map(([a, b], i) => {
      const va = vec(a.lat, a.lng), vb = vec(b.lat, b.lng), d = angle(va, vb), S = 56;
      const pts = Array.from({ length: S + 1 }, (_, k) => ({ v: slerp(va, vb, k / S), alt: Math.sin((Math.PI * k) / S) * p.altitude * (d / Math.PI) * 1.6 }));
      const s = at + 0.4 + i * p.arc_stagger;
      return { a, b, va, vb, pts, s, land: s + 0.5 + d * 0.35 };
    });
    // the camera: centred between the routes' ends, turning east at `rotation` rad/s
    const mid = norm(arcs.reduce((m, x) => [m[0] + x.va[0] + x.vb[0], m[1] + x.va[1] + x.vb[1], m[2] + x.va[2] + x.vb[2]], [0, 0, 0]));
    const c0 = latLngOf(mid), view0 = facing(c0.lat, c0.lng);
    const R0 = Math.min(A.w, A.h) * 0.4, CX = A.x + A.w / 2, CY = A.y + A.h / 2;
    // sound: a soft whoosh on the first launches, about one a beat
    let last = -9; arcs.forEach((x) => { if (x.s - last >= 0.6 && x.s < end - 0.5) { ctx.sfx(x.s, "whoosh.soft", 0.22); last = x.s; } });
    const DASH = 0.4, PER = DASH + p.dash_gap;
    return {
      draw(t) {
        const a = shown(t);
        if (a <= 0) return;
        clear();
        const grow = 0.92 + 0.08 * ML.out(t, at, at + 0.8);
        const w = { phi: view0.phi + p.rotation * (t - (at + end) / 2), theta: Math.max(-0.7, Math.min(0.7, view0.theta * 0.8)), R: R0 * grow, cx: CX, cy: CY };
        drawGlobe(w);
        const lw = Math.max(1.2, p.stroke * w.R * 0.012);
        // rings first (under the arcs)
        if (p.rings) {
          g.lineWidth = Math.max(1, lw * 0.6);
          const ends = new Map();
          arcs.forEach((x) => { if (t >= x.s) ends.set(x.a, Math.min(ends.get(x.a) ?? 1e9, x.s)); if (t >= x.land) ends.set(x.b, Math.min(ends.get(x.b) ?? 1e9, x.land)); });
          for (const [c, t0] of ends) {
            const cv0 = vec(c.lat, c.lng), period = 1.0;
            for (const off of [0, 0.5]) {
              const k = (((t - t0) / period + off) % 1 + 1) % 1;
              if (t - t0 < off * period) continue;
              g.strokeStyle = rgba(C.accent, (1 - k) * 0.85);
              strokeVisible(ringPts(cv0, k * 4 * D2R, 0, w));
            }
          }
        }
        // arcs: a faint gradient trail up to the head, bright dashes running along it
        g.lineCap = "round";
        for (const x of arcs) {
          if (t < x.s) continue;
          const head = ML.out(t, x.s, x.land), shift = (t - x.s) / p.dash_time;
          const q = x.pts.map((pt) => proj(pt.v, pt.alt, w)), S = q.length - 1;
          for (let k = 0; k < S; k++) {
            const u0 = k / S, u1 = (k + 1) / S;
            if (u0 > head) break;
            if (!q[k].vis || !q[k + 1].vis) continue;
            const um = (u0 + u1) / 2, grad = 0.2 + 0.8 * um;
            const ph = (((um - shift) % PER) + PER) % PER, dash = ph < DASH || head < 1 && um > head - 0.12;
            g.strokeStyle = rgba(dash ? lighten(C.accent, 0.15) : C.accent, (dash ? 1 : 0.4) * grad);
            g.lineWidth = dash ? lw : lw * 0.7;
            const f = u1 <= head ? 1 : (head - u0) / (u1 - u0);
            g.beginPath(); g.moveTo(q[k].x, q[k].y); g.lineTo(q[k].x + (q[k + 1].x - q[k].x) * f, q[k].y + (q[k + 1].y - q[k].y) * f); g.stroke();
          }
        }
        // endpoints and the hub's name
        const seen = new Set();
        for (const x of arcs) for (const [c, t0] of [[x.a, x.s], [x.b, x.land]]) {
          if (t < t0 || seen.has(c)) continue; seen.add(c);
          const q = proj(vec(c.lat, c.lng), 0, w); if (!q.vis) continue;
          g.fillStyle = rgba(C.accent, 1); g.beginPath(); g.arc(q.x, q.y, lw * 1.4, 0, Math.PI * 2); g.fill();
        }
        if (p.labels) {
          const q = proj(hv, 0, w);
          if (q.vis && p.origin === "one-to-many") pill(nameOf(hub), q.x, q.y, Math.max(16, w.R * 0.05), ML.out(t, at + 0.3, at + 0.8) * Math.min(1, q.z * 3));
        }
      },
    };
  },
});
