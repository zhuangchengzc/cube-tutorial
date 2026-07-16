/* ============ 魔方图示渲染器 ============
   提供几个全局函数：
   - renderOLL(pattern)  绘制 OLL 顶层朝向图（含侧面翻起黄块）
   - renderPLL(arrows, colors)  绘制 PLL 顶层换位箭头图
   - renderFace(opts)    绘制通用 3x3 俯视面（Cross 等）
   - renderF2L(opts)     绘制 F2L 角棱位置示意图
================================================ */
(function () {
  function cssVar(name, fb) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  }

  const YELLOW = cssVar('--cube-U', '#ffd500');
  const GRAY = cssVar('--cube-x', '#2a2f42');
  const CUBE = {
    U: cssVar('--cube-U', '#ffd500'),
    D: cssVar('--cube-D', '#ffffff'),
    F: cssVar('--cube-F', '#009b48'),
    B: cssVar('--cube-B', '#0046ad'),
    L: cssVar('--cube-L', '#ff5800'),
    R: cssVar('--cube-R', '#b71234'),
    x: GRAY
  };

  let vizIdCounter = 0;
  function nextVizId(prefix) {
    vizIdCounter += 1;
    return `${prefix}-${vizIdCounter}`;
  }

  function stickerMarkup(x, y, w, h, fill) {
    const ix = Math.max(2, w * 0.12);
    const iy = Math.max(2, h * 0.12);
    return `<g>
      <rect class="sticker" x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>
      <path d="M${x + ix} ${y + iy} H${x + w - ix * 1.25} L${x + w - ix * 2.2} ${y + iy * 1.9} H${x + ix * 1.45} Z"
        fill="rgba(255,255,255,.16)"/>
      <path d="M${x + w - ix} ${y + h - iy} H${x + ix * 1.8} L${x + ix * 2.5} ${y + h - iy * 1.85} H${x + w - ix * 1.3} Z"
        fill="rgba(0,0,0,.08)"/>
    </g>`;
  }

  function panelMarkup(x, y, w, h, rx) {
    return `<rect class="cube-panel" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx || 14}"/>`;
  }

  /* ---------- OLL ----------
     顶层俯视图：
       pattern: 兼容旧 21 位黄朝向位图（可含空格）
       top: 可选长度 9，顶面每格真实朝上颜色（有则优先于 pattern）
       sides: 可选 {t,r,b,l} 各长度 3 的真实侧面色
     规则：
       - 顶格：优先 top[i]；否则 pattern '1'=黄 / '0'=灰
       - 侧条：黄翻起优先黄，否则用 sides 真实色
  */
  function renderOLL(pattern, sides, topColors) {
    // 兼容 renderOLL(pattern, sides) 与 renderOLL({pattern,sides,top})
    let bits = pattern;
    let sideObj = sides;
    let top = topColors;
    if (pattern && typeof pattern === 'object' && !Array.isArray(pattern)) {
      bits = pattern.pattern;
      sideObj = pattern.sides;
      top = pattern.top;
    }
    bits = String(bits || '').replace(/\s+/g, '');
    const S = 34, GAP = 4, EDGE = 12, PAD = 6;
    const inner = S * 3 + GAP * 2;
    const full = inner + (EDGE + PAD) * 2;
    const origin = EDGE + PAD;
    const col = (i) => (i % 3);
    const row = (i) => Math.floor(i / 3);
    const cellPos = (k) => origin + k * (S + GAP);
    const eShort = EDGE - 2;
    const bit = (i) => bits[i] === '1';

    let r = `<svg viewBox="0 0 ${full} ${full}" width="112" height="112" class="cube-face" xmlns="http://www.w3.org/2000/svg">`;
    r += panelMarkup(origin - 8, origin - 8, inner + 16, inner + 16, 14);

    // 顶面 3x3：优先真实朝上色
    for (let i = 0; i < 9; i++) {
      const x = origin + col(i) * (S + GAP);
      const y = origin + row(i) * (S + GAP);
      let fill;
      if (top && top[i]) fill = top[i];
      else fill = bit(i) ? YELLOW : GRAY;
      r += stickerMarkup(x, y, S, S, fill);
    }

    // 四边侧条
    const sideFill = (idx, color) => {
      if (bit(idx)) return YELLOW;
      if (color) return color;
      return GRAY;
    };
    const t = (sideObj && sideObj.t) || [];
    const rgt = (sideObj && sideObj.r) || [];
    const btm = (sideObj && sideObj.b) || [];
    const lft = (sideObj && sideObj.l) || [];

    for (let k = 0; k < 3; k++) {
      r += stickerMarkup(cellPos(k), origin - eShort - GAP, S, eShort, sideFill(9 + k, t[k]));
      r += stickerMarkup(origin + inner + GAP, cellPos(k), eShort, S, sideFill(12 + k, rgt[k]));
      r += stickerMarkup(cellPos(k), origin + inner + GAP, S, eShort, sideFill(15 + k, btm[k]));
      r += stickerMarkup(origin - eShort - GAP, cellPos(k), eShort, S, sideFill(18 + k, lft[k]));
    }

    r += `</svg>`;
    return r;
  }

  /* ---------- PLL ----------
     顶层俯视：顶面全黄 + 四周完整侧面色条（每边 3 色）。
     用途：对照边色是否对齐，判断该用哪个 PLL。
     入参兼容：
       - renderPLL(sides) / renderPLL(null, sides)
       - sides = { t,r,b,l } 各长度 3 的颜色数组
       - 旧 colors 长度 9：退化为只在外圈格画侧色
  */
  function renderPLL(arrowsOrSides, colorsOrSides) {
    const S = 34, GAP = 4, EDGE = 12, PAD = 6;
    const inner = S * 3 + GAP * 2;
    const full = inner + (EDGE + PAD) * 2;
    const origin = EDGE + PAD;
    const col = (i) => (i % 3), row = (i) => Math.floor(i / 3);
    const cellPos = (k) => origin + k * (S + GAP);

    // 归一化 sides
    let sides = null;
    const a = arrowsOrSides, b = colorsOrSides;
    if (a && (a.t || a.r || a.b || a.l)) sides = a;
    else if (b && (b.t || b.r || b.b || b.l)) sides = b;
    else if (Array.isArray(b) && b.length === 9) {
      // 兼容旧 colors[9]：外圈格 → 对应边
      sides = {
        t: [b[0], b[1], b[2]],
        r: [b[2], b[5], b[8]],
        b: [b[6], b[7], b[8]],
        l: [b[0], b[3], b[6]]
      };
    } else if (Array.isArray(a) && a.length === 9) {
      sides = {
        t: [a[0], a[1], a[2]],
        r: [a[2], a[5], a[8]],
        b: [a[6], a[7], a[8]],
        l: [a[0], a[3], a[6]]
      };
    }
    sides = sides || {};
    const t = sides.t || [GRAY, GRAY, GRAY];
    const rgt = sides.r || [GRAY, GRAY, GRAY];
    const btm = sides.b || [GRAY, GRAY, GRAY];
    const lft = sides.l || [GRAY, GRAY, GRAY];

    let r = `<svg viewBox="0 0 ${full} ${full}" width="112" height="112" class="cube-face" xmlns="http://www.w3.org/2000/svg">`;
    r += panelMarkup(origin - 8, origin - 8, inner + 16, inner + 16, 15);

    // 顶面全黄 3x3
    for (let i = 0; i < 9; i++) {
      r += stickerMarkup(cellPos(col(i)), cellPos(row(i)), S, S, YELLOW);
    }

    // 四周完整侧条（每边 3 格，全部画出，便于对齐边色）
    const eH = EDGE - 2;
    for (let k = 0; k < 3; k++) {
      r += stickerMarkup(cellPos(k), origin - eH - GAP, S, eH, t[k] || GRAY);           // 后
      r += stickerMarkup(origin + inner + GAP, cellPos(k), eH, S, rgt[k] || GRAY);       // 右
      r += stickerMarkup(cellPos(k), origin + inner + GAP, S, eH, btm[k] || GRAY);       // 前
      r += stickerMarkup(origin - eH - GAP, cellPos(k), eH, S, lft[k] || GRAY);          // 左
    }

    r += `</svg>`;
    return r;
  }

  // 把带 ' 的公式记号高亮
  function fmtMoves(str) {
    return str.replace(/([A-Za-z]+2?'?)/g, (m) =>
      m.includes("'") ? `<span class="prime">${m}</span>` : m);
  }

  /* ---------- 通用俯视面 ----------
     opts:
       cells:  长度9颜色数组
       top/right/bottom/left: 长度3颜色数组
       size:   像素尺寸
  */
  function renderFace(opts) {
    opts = opts || {};
    const px = opts.size || 130;
    const S = 34, GAP = 4, EDGE = 10, PAD = 4;
    const inner = S * 3 + GAP * 2;
    const full = inner + (EDGE + PAD) * 2;
    const origin = EDGE + PAD;
    const col = (i) => i % 3, row = (i) => Math.floor(i / 3);
    const cellPos = (k) => origin + k * (S + GAP);
    const cells = opts.cells || Array(9).fill(CUBE.x);
    let r = `<svg viewBox="0 0 ${full} ${full}" width="${px}" height="${px}" class="cube-face" xmlns="http://www.w3.org/2000/svg">`;
    r += panelMarkup(origin - 8, origin - 8, inner + 16, inner + 16, 14);
    for (let i = 0; i < 9; i++) {
      r += stickerMarkup(cellPos(col(i)), cellPos(row(i)), S, S, cells[i]);
    }
    const band = (arr, orient) => {
      if (!arr) return;
      for (let k = 0; k < 3; k++) {
        if (!arr[k]) continue;
        let x, y, w, h;
        if (orient === 'top')    { x = cellPos(k); y = origin - EDGE - GAP; w = S; h = EDGE; }
        if (orient === 'bottom') { x = cellPos(k); y = origin + inner + GAP; w = S; h = EDGE; }
        if (orient === 'left')   { x = origin - EDGE - GAP; y = cellPos(k); w = EDGE; h = S; }
        if (orient === 'right')  { x = origin + inner + GAP; y = cellPos(k); w = EDGE; h = S; }
        r += stickerMarkup(x, y, w, h, arr[k]);
      }
    };
    band(opts.top, 'top'); band(opts.bottom, 'bottom');
    band(opts.left, 'left'); band(opts.right, 'right');
    r += `</svg>`;
    return r;
  }

  /* ---------- 正面图（前视） ----------
     与 renderFace 同布局，语义为前视：
       cells = F 面 3x3（上排=顶层前棱/角的前色，中排=中层，下排=底层）
       top    = U 面前排 3 色（朝上贴纸）
       bottom = D 面前排 3 色
       left/right = L/R 面前排 3 色
     适合中层棱：一眼看到「顶棱朝前色 + 左右槽 + 底白棱」。
  */
  function renderFront(opts) {
    return renderFace(opts);
  }

  /* ---------- F2L 情形图 ----------
     顶层俯视，突出显示待处理的角块/棱块位置，并示意目标槽（FR）
     尺寸与 OLL 图示对齐（112x112，同等视觉占比）
  */
  function renderF2L(opts) {
    opts = opts || {};
    // 与 OLL 同级参数，避免 viewBox 过大导致“整图被缩小”
    const S = 34, GAP = 4, EDGE = 12, PAD = 6;
    const inner = S * 3 + GAP * 2;
    const full = inner + (EDGE + PAD) * 2;
    const origin = EDGE + PAD;
    const col = (i) => i % 3, row = (i) => Math.floor(i / 3);
    const cellPos = (k) => origin + k * (S + GAP);
    let r = `<svg viewBox="0 0 ${full} ${full}" width="112" height="112" class="cube-face" xmlns="http://www.w3.org/2000/svg">`;
    r += panelMarkup(origin - 8, origin - 8, inner + 16, inner + 16, 14);

    for (let i = 0; i < 9; i++) {
      r += stickerMarkup(cellPos(col(i)), cellPos(row(i)), S, S, '#3a4059');
    }
    if (opts.edge) {
      const i = opts.edge.pos;
      r += stickerMarkup(cellPos(col(i)), cellPos(row(i)), S, S, opts.edge.color || CUBE.F);
      r += `<text x="${cellPos(col(i)) + S / 2}" y="${cellPos(row(i)) + S / 2 + 5}" font-size="14" font-weight="700" text-anchor="middle" fill="#10131b">棱</text>`;
    }
    if (opts.corner) {
      const i = opts.corner.pos;
      r += stickerMarkup(cellPos(col(i)), cellPos(row(i)), S, S, opts.corner.color || CUBE.U);
      r += `<text x="${cellPos(col(i)) + S / 2}" y="${cellPos(row(i)) + S / 2 + 5}" font-size="14" font-weight="700" text-anchor="middle" fill="#10131b">角</text>`;
    }
    // FR 槽：画在右下角外侧（与 OLL 侧条同位置），不额外撑大画布
    const sx = cellPos(2);
    const sy = origin + inner + GAP;
    const slotFill = opts.slotFilled ? 'rgba(0,155,72,.88)' : 'rgba(255,202,40,.12)';
    r += `<rect x="${sx}" y="${sy}" width="${S}" height="${EDGE - 2}" rx="3"
      fill="${slotFill}" stroke="#ffca28" stroke-width="2" stroke-dasharray="${opts.slotFilled ? '0' : '4 3'}"/>`;
    r += `<text x="${sx + S / 2}" y="${sy + EDGE - 4}" font-size="9" font-weight="700" text-anchor="middle" fill="#ffca28">FR</text>`;
    r += `</svg>`;
    return r;
  }

  window.CubeViz = { renderOLL, renderPLL, renderFace, renderFront, renderF2L, fmtMoves, CUBE };
})();
