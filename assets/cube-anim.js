/* ============ 真实 cubie 魔方动画引擎 ============
   - 状态：26 个小块，颜色粘在小块朝向上（不是面槽位）
   - 转动：整层小块绕轴旋转，颜色跟着小块走，中途不会串色
   - 渲染：小块贴纸 3D 投影到 SVG
================================================ */
(function () {
  const COLORS = (window.CubeViz && window.CubeViz.CUBE) || {
    U: '#ffd500', D: '#ffffff', F: '#009b48', B: '#0046ad',
    L: '#ff5800', R: '#b71234', x: '#2a2f42'
  };

  // 世界轴：x右 y上 z前
  const FACE_AXIS = {
    U: [0, 1, 0], D: [0, -1, 0],
    F: [0, 0, 1], B: [0, 0, -1],
    L: [-1, 0, 0], R: [1, 0, 0]
  };
  // 该面一层：小块坐标哪一分量 = ±1
  const LAYER = {
    U: { axis: 1, value: 1 }, D: { axis: 1, value: -1 },
    F: { axis: 2, value: 1 }, B: { axis: 2, value: -1 },
    L: { axis: 0, value: -1 }, R: { axis: 0, value: 1 }
  };
  // 绕世界轴旋转符号：使「面外观察顺时针」与 Singmaster 一致
  // 校验：sexy 阶 6、Ua 阶 3、T 阶 2、Sune 阶 6，且 T/Ua 不翻黄
  // rotVec 为右手系；面外 CW 对应符号如下
  const AXIS_NAME = { U: 'y', D: 'y', R: 'x', L: 'x', F: 'z', B: 'z' };
  const AXIS_SIGN = { U: -1, D: 1, R: -1, L: 1, F: -1, B: 1 };

  const VIEW = [0.55, 0.48, 0.72];

  function key(pos) { return pos[0] + ',' + pos[1] + ',' + pos[2]; }

  function rotVec(v, axis, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const [x, y, z] = v;
    if (axis === 'x') return [x, y * c - z * s, y * s + z * c];
    if (axis === 'y') return [x * c + z * s, y, -x * s + z * c];
    return [x * c - y * s, x * s + y * c, z];
  }

  function roundPos(p) {
    return p.map(v => Math.round(v));
  }

  function cloneCubies(cubies) {
    return cubies.map(c => ({
      pos: c.pos.slice(),
      // faces: 世界方向键 '+x','-x','+y','-y','+z','-z' → 颜色
      stickers: Object.assign({}, c.stickers)
    }));
  }

  function dirKey(n) {
    // 单位轴向 → 键
    if (n[0] > 0.5) return '+x';
    if (n[0] < -0.5) return '-x';
    if (n[1] > 0.5) return '+y';
    if (n[1] < -0.5) return '-y';
    if (n[2] > 0.5) return '+z';
    return '-z';
  }

  function faceToDir(face) {
    const n = FACE_AXIS[face];
    return dirKey(n);
  }

  // 从 solved 或 facelet 对象构建 cubies
  function solvedCubies() {
    const list = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const stickers = {};
          if (y === 1) stickers['+y'] = COLORS.U;
          if (y === -1) stickers['-y'] = COLORS.D;
          if (z === 1) stickers['+z'] = COLORS.F;
          if (z === -1) stickers['-z'] = COLORS.B;
          if (x === -1) stickers['-x'] = COLORS.L;
          if (x === 1) stickers['+x'] = COLORS.R;
          list.push({ pos: [x, y, z], stickers });
        }
      }
    }
    return list;
  }

  // facelet → cubies（用于兼容 fromMoves 结果展示；内部以 cubie 为准）
  function cubiesFromFaces(faces) {
    // 在 solved 几何位置上，按 facelet 颜色贴面
    const list = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const stickers = {};
          // U: y=1, index from x,z ：row 随 z 从 -1..1 → row 0..2, col 随 x
          if (y === 1) {
            const col = x + 1, row = z + 1;
            stickers['+y'] = faces.U[row * 3 + col];
          }
          if (y === -1) {
            // D: 俯视 D 时 z 反向常见；与 UV D v=[0,0,-1] 一致：row 增则 z 减
            const col = x + 1, row = 1 - z;
            stickers['-y'] = faces.D[row * 3 + col];
          }
          if (z === 1) {
            const col = x + 1, row = 1 - y;
            stickers['+z'] = faces.F[row * 3 + col];
          }
          if (z === -1) {
            // B: col 随 -x
            const col = 1 - x, row = 1 - y;
            stickers['-z'] = faces.B[row * 3 + col];
          }
          if (x === -1) {
            const col = z + 1, row = 1 - y;
            stickers['-x'] = faces.L[row * 3 + col];
          }
          if (x === 1) {
            const col = 1 - z, row = 1 - y;
            stickers['+x'] = faces.R[row * 3 + col];
          }
          list.push({ pos: [x, y, z], stickers });
        }
      }
    }
    return list;
  }

  function facesFromCubies(cubies) {
    const faces = {
      U: Array(9).fill(COLORS.x), D: Array(9).fill(COLORS.x),
      F: Array(9).fill(COLORS.x), B: Array(9).fill(COLORS.x),
      L: Array(9).fill(COLORS.x), R: Array(9).fill(COLORS.x)
    };
    const map = {};
    cubies.forEach(c => { map[key(c.pos)] = c; });
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const c = map[key([x, 1, z])];
        if (c && c.stickers['+y']) faces.U[(z + 1) * 3 + (x + 1)] = c.stickers['+y'];
      }
    }
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const c = map[key([x, -1, z])];
        if (c && c.stickers['-y']) faces.D[(1 - z) * 3 + (x + 1)] = c.stickers['-y'];
      }
    }
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const c = map[key([x, y, 1])];
        if (c && c.stickers['+z']) faces.F[(1 - y) * 3 + (x + 1)] = c.stickers['+z'];
      }
    }
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const c = map[key([x, y, -1])];
        if (c && c.stickers['-z']) faces.B[(1 - y) * 3 + (1 - x)] = c.stickers['-z'];
      }
    }
    for (let z = -1; z <= 1; z++) {
      for (let y = -1; y <= 1; y++) {
        const c = map[key([-1, y, z])];
        if (c && c.stickers['-x']) faces.L[(1 - y) * 3 + (z + 1)] = c.stickers['-x'];
      }
    }
    for (let z = -1; z <= 1; z++) {
      for (let y = -1; y <= 1; y++) {
        const c = map[key([1, y, z])];
        if (c && c.stickers['+x']) faces.R[(1 - y) * 3 + (1 - z)] = c.stickers['+x'];
      }
    }
    return faces;
  }

  function dirToVec(dk) {
    return ({
      '+x': [1, 0, 0], '-x': [-1, 0, 0],
      '+y': [0, 1, 0], '-y': [0, -1, 0],
      '+z': [0, 0, 1], '-z': [0, 0, -1]
    })[dk];
  }

  // 通用转层：axis 0/1/2，values 为参与旋转的坐标值；all=true 表示整体旋转
  // axisName/axisSign 定义旋转方向；dir: 1 CW, -1 CCW, 2=180
  function applyMotion(cubies, motion) {
    if (!motion) return cloneCubies(cubies);
    const axisName = motion.axisName;
    const axisSign = motion.axisSign;
    const dir = motion.dir;
    const turns = dir === 2 ? 2 : 1;
    const dirMul = dir === -1 ? -1 : 1;
    const angle = axisSign * dirMul * (Math.PI / 2) * turns;
    const axisIdx = motion.axis;
    const valueSet = motion.all ? null : new Set(motion.values || []);

    return cubies.map(c => {
      if (valueSet && !valueSet.has(c.pos[axisIdx])) {
        return { pos: c.pos.slice(), stickers: Object.assign({}, c.stickers) };
      }
      const newPos = roundPos(rotVec(c.pos, axisName, angle));
      const newStickers = {};
      Object.keys(c.stickers).forEach(dk => {
        const n = dirToVec(dk);
        const rn = roundPos(rotVec(n, axisName, angle));
        newStickers[dirKey(rn)] = c.stickers[dk];
      });
      return { pos: newPos, stickers: newStickers };
    });
  }

  function applyTurnCubies(cubies, face, dir) {
    const layer = LAYER[face];
    return applyMotion(cubies, {
      axis: layer.axis,
      values: [layer.value],
      axisName: AXIS_NAME[face],
      axisSign: AXIS_SIGN[face],
      dir
    });
  }

  function parseSuffix(suf) {
    if (suf === "'") return -1;
    if (suf === '2') return 2;
    return 1;
  }

  // 解析单步记号 → motion（支持 UDFBLR / MES / rlu dfb / xyz）
  function parseMove(move) {
    if (!move || typeof move !== 'string') return null;
    const raw = move.trim();
    const m = raw.match(/^([UDFBLRMES]|[udfblr]|[xyz])(2|'|)?$/);
    if (!m) return null;
    const t = m[1];
    const dir = parseSuffix(m[2] || '');

    // 外面
    if ('UDFBLR'.includes(t)) {
      const layer = LAYER[t];
      return {
        face: t, dir,
        axis: layer.axis, values: [layer.value],
        axisName: AXIS_NAME[t], axisSign: AXIS_SIGN[t]
      };
    }
    // 中层：M 同 L，E 同 D，S 同 F
    if (t === 'M') return { dir, axis: 0, values: [0], axisName: 'x', axisSign: AXIS_SIGN.L, face: 'M' };
    if (t === 'E') return { dir, axis: 1, values: [0], axisName: 'y', axisSign: AXIS_SIGN.D, face: 'E' };
    if (t === 'S') return { dir, axis: 2, values: [0], axisName: 'z', axisSign: AXIS_SIGN.F, face: 'S' };

    // 双层（小写）：与对应面同向，带动中层
    if (t === 'r') return { dir, axis: 0, values: [0, 1], axisName: 'x', axisSign: AXIS_SIGN.R, face: 'r' };
    if (t === 'l') return { dir, axis: 0, values: [-1, 0], axisName: 'x', axisSign: AXIS_SIGN.L, face: 'l' };
    if (t === 'u') return { dir, axis: 1, values: [0, 1], axisName: 'y', axisSign: AXIS_SIGN.U, face: 'u' };
    if (t === 'd') return { dir, axis: 1, values: [-1, 0], axisName: 'y', axisSign: AXIS_SIGN.D, face: 'd' };
    if (t === 'f') return { dir, axis: 2, values: [0, 1], axisName: 'z', axisSign: AXIS_SIGN.F, face: 'f' };
    if (t === 'b') return { dir, axis: 2, values: [-1, 0], axisName: 'z', axisSign: AXIS_SIGN.B, face: 'b' };

    // 整体旋转
    if (t === 'x') return { dir, all: true, axis: 0, axisName: 'x', axisSign: AXIS_SIGN.R, face: 'x' };
    if (t === 'y') return { dir, all: true, axis: 1, axisName: 'y', axisSign: AXIS_SIGN.U, face: 'y' };
    if (t === 'z') return { dir, all: true, axis: 2, axisName: 'z', axisSign: AXIS_SIGN.F, face: 'z' };

    return null;
  }

  function tokenizeMoves(str) {
    return String(str || '')
      .replace(/[()（）]/g, ' ')
      .replace(/[，,]/g, ' ')
      .split(/\s+/)
      .map(s => s.trim())
      .filter(s => s && parseMove(s));
  }

  function invertToken(token) {
    if (/2$/.test(token)) return token;
    if (/'/.test(token)) return token.replace("'", '');
    return token + "'";
  }

  function reverseMoves(str) {
    return tokenizeMoves(str).slice().reverse().map(invertToken);
  }

  // 由公式生成：逆序 scramble 初始态 + 正向播放脚本
  function demoFromAlgo(movesStr) {
    const tokens = tokenizeMoves(movesStr);
    const rev = tokens.slice().reverse().map(invertToken);
    const start = fromMoves(rev);
    const script = tokens.map((mv, i) => ({
      move: mv,
      text: i === tokens.length - 1 ? `执行 ${mv}，完成公式。` : `执行 ${mv}`
    }));
    return {
      start,
      script,
      tokens,
      supported: tokens.length > 0,
      skipped: String(movesStr || '').trim() && tokens.length === 0
    };
  }

  // F2L 目标对：前右槽 FR 的角块（白绿红）+ 棱块（绿红）
  function frFocusIds() {
    return new Set([
      [COLORS.D, COLORS.F, COLORS.R].slice().sort().join('|'),
      [COLORS.F, COLORS.R].slice().sort().join('|')
    ]);
  }

  function rewriteTokensByY(tokens, rot) {
    if (!rot) return tokens.slice();
    const map = FULL_CONJ[rot];
    if (!map) return tokens.slice();
    return tokens.map(t => map[t] || t);
  }

  function scoreF2LDemoTokens(tokens) {
    // 逆推初始态，评估：是否 FR 对、是否保持白十字、背面关键块、难见层转
    const rev = tokens.slice().reverse().map(invertToken);
    const startCubies = applyMovesCubies(solvedCubies(), rev);
    const focus = pickF2LFocusIds(startCubies, solvedCubies());
    const fr = frFocusIds();
    let isFR = focus.size === 2;
    focus.forEach(id => { if (!fr.has(id)) isFR = false; });

    // 白十字是否完整（F2L 前提）
    const crossOk = isWhiteCrossSolved(startCubies);

    let back = 0, front = 0, vis = 0;
    startCubies.forEach(c => {
      if (!focus.has(cubieId(c))) return;
      if (c.pos[2] < 0) back += 1;
      if (c.pos[2] > 0) front += 1;
      vis += c.pos[2] * 3 + c.pos[0] * 1.5;
    });
    let hard = 0;
    tokens.forEach(t => {
      const f = String(t || '')[0];
      if (f === 'L' || f === 'l' || f === 'B' || f === 'b') hard += 1;
    });
    return { isFR, crossOk, back, front, vis, hard, focus, startCubies };
  }

  function isWhiteCrossSolved(cubies) {
    // 四条底白棱：位置 + 白色朝下
    const edges = [
      { id: [COLORS.D, COLORS.F].slice().sort().join('|'), pos: [0, -1, 1] },
      { id: [COLORS.D, COLORS.R].slice().sort().join('|'), pos: [1, -1, 0] },
      { id: [COLORS.D, COLORS.B].slice().sort().join('|'), pos: [0, -1, -1] },
      { id: [COLORS.D, COLORS.L].slice().sort().join('|'), pos: [-1, -1, 0] }
    ];
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const c = cubies.find(x => cubieId(x) === e.id);
      if (!c) return false;
      if (c.pos[0] !== e.pos[0] || c.pos[1] !== e.pos[1] || c.pos[2] !== e.pos[2]) return false;
      if (c.stickers['-y'] !== COLORS.D) return false;
    }
    return true;
  }

  /**
   * F2L 专用演示生成：
   * - 示意图默认 FR 槽，因此优先用 y 共轭把公式改写成「真正处理 FR 角+棱」
   * - 锁定 FR 彩色块（或改写后的真实对），避免亮出蓝红等对不上的块
   * - 再交给播放器固定朝向后只播层转
   */
  function demoFromAlgoF2L(movesStr) {
    const baseTokens = tokenizeMoves(movesStr);
    if (!baseTokens.length) {
      return {
        start: solvedCube(),
        script: [],
        tokens: [],
        focusIds: [],
        supported: false,
        skipped: true,
        rewritten: false
      };
    }

    // 候选：原式 / y / y' / y2 改写，再吸收公式内 xyz
    // 只做「公式层」共轭，不再二次 bake（避免 f 又被拧成 l）
    const cands = [];
    [null, 'y', "y'", 'y2'].forEach(rot => {
      const rewritten = rewriteTokensByY(baseTokens, rot);
      const play = expandProgressive(rewritten, null).play;
      const sc = scoreF2LDemoTokens(play);
      // 最终播放序列的难见层转（L/B）
      let playHard = 0;
      play.forEach(function (t) {
        const f = String(t || '')[0];
        if (f === 'L' || f === 'l' || f === 'B' || f === 'b') playHard += 1;
      });
      cands.push({
        rot: rot,
        tokens: play,
        isFR: sc.isFR,
        crossOk: sc.crossOk,
        back: sc.back,
        hard: playHard,
        vis: sc.vis,
        front: sc.front,
        focus: sc.focus,
        startCubies: sc.startCubies
      });
    });

    // 白十字完整（F2L 前提）→ FR 对 → 无 L/B → 不在背面 → 可见度
    cands.sort((p, q) => {
      if (p.crossOk !== q.crossOk) return p.crossOk ? -1 : 1;
      if (p.isFR !== q.isFR) return p.isFR ? -1 : 1;
      if (p.hard !== q.hard) return p.hard - q.hard;
      if (p.back !== q.back) return p.back - q.back;
      if (q.vis !== p.vis) return q.vis - p.vis;
      if (q.front !== p.front) return q.front - p.front;
      return 0;
    });
    const best = cands[0];

    // 若仍破坏十字，标记为不支持（数据应已修掉这类公式）
    if (!best.crossOk) {
      return {
        start: facesFromCubies(best.startCubies),
        startCubies: best.startCubies,
        script: best.tokens.map(mv => ({ move: mv, text: `执行 ${mv}` })),
        tokens: best.tokens,
        focusIds: Array.from(best.focus),
        supported: true,
        skipped: false,
        rewritten: true,
        rewriteRot: best.rot,
        isFR: best.isFR,
        crossOk: false,
        faceFrontDone: true
      };
    }

    const script = best.tokens.map((mv, i) => ({
      move: mv,
      text: i === best.tokens.length - 1 ? `执行 ${mv}，完成公式。` : `执行 ${mv}`
    }));

    // 锁定关键块：优先 FR；否则用真实被处理的那一对
    const focusIds = best.isFR
      ? Array.from(frFocusIds())
      : Array.from(best.focus);

    return {
      start: facesFromCubies(best.startCubies),
      startCubies: best.startCubies,
      script: script,
      tokens: best.tokens,
      focusIds: focusIds,
      supported: true,
      skipped: false,
      rewritten: best.rot != null || best.tokens.join(' ') !== baseTokens.join(' '),
      rewriteRot: best.rot,
      isFR: best.isFR,
      crossOk: true,
      // F2L 已在公式层完成 FR 共轭；禁止播放器再整体 y，避免中心色错位
      faceFrontDone: true
    };
  }

  /**
   * PLL 专用演示生成：
   * - 吸收公式开头/中间的 x/y/z，只保留层转（顶黄不倒）
   * - 逆推初始态：F2L 归位、顶面全黄，只乱顶层排列
   * - 锁定顶层 8 个黄块
   */
  function demoFromAlgoPLL(movesStr) {
    const baseTokens = tokenizeMoves(movesStr);
    if (!baseTokens.length) {
      return {
        start: solvedCube(),
        script: [],
        tokens: [],
        focusIds: [],
        supported: false,
        skipped: true,
        rewritten: false
      };
    }

    // 吸收 xyz，得到只含层转的 play
    const play = expandProgressive(baseTokens, null).play;
    const rev = play.slice().reverse().map(invertToken);
    const startCubies = applyMovesCubies(solvedCubies(), rev);
    const focusIds = Array.from(pickOLLFocusIds(startCubies));

    const script = play.map((mv, i) => ({
      move: mv,
      text: i === play.length - 1 ? `执行 ${mv}，完成公式。` : `执行 ${mv}`
    }));

    return {
      start: facesFromCubies(startCubies),
      startCubies: startCubies,
      script: script,
      tokens: play,
      focusIds: focusIds,
      supported: true,
      skipped: false,
      rewritten: play.join(' ') !== baseTokens.join(' '),
      faceFrontDone: true
    };
  }

  // ---------- 面向用户：开场固定朝向，之后只播层转 ----------
  // 做法：
  // 1) 选 R0，把关键块转到前/右，写入初始态
  // 2) 公式中的 x/y/z 整块旋转全部吸收进共轭表，不动画
  // 3) 只播放改写后的层转（UDFBLR / 双层 / 中层）
  // 恒等式：R then FULL_CONJ[R][M] == M then R
  // 中途遇到原公式 xyz=W 时，把 inv(W) 压入共轭栈继续改写后续步
  const FULL_CONJ = {"y":{"U":"U","U'":"U'","U2":"U2","D":"D","D'":"D'","D2":"D2","F":"L","F'":"L'","F2":"L2","B":"R","B'":"R'","B2":"R2","L":"B","L'":"B'","L2":"B2","R":"F","R'":"F'","R2":"F2","u":"u","u'":"u'","u2":"u2","d":"d","d'":"d'","d2":"d2","f":"l","f'":"l'","f2":"l2","b":"r","b'":"r'","b2":"r2","l":"b","l'":"b'","l2":"b2","r":"f","r'":"f'","r2":"f2","M":"S'","M'":"S","M2":"S2","E":"E","E'":"E'","E2":"E2","S":"M","S'":"M'","S2":"M2","x":"z","x'":"z'","x2":"z2","y":"y","y'":"y'","y2":"y2","z":"x'","z'":"x","z2":"x2"},"y'":{"U":"U","U'":"U'","U2":"U2","D":"D","D'":"D'","D2":"D2","F":"R","F'":"R'","F2":"R2","B":"L","B'":"L'","B2":"L2","L":"F","L'":"F'","L2":"F2","R":"B","R'":"B'","R2":"B2","u":"u","u'":"u'","u2":"u2","d":"d","d'":"d'","d2":"d2","f":"r","f'":"r'","f2":"r2","b":"l","b'":"l'","b2":"l2","l":"f","l'":"f'","l2":"f2","r":"b","r'":"b'","r2":"b2","M":"S","M'":"S'","M2":"S2","E":"E","E'":"E'","E2":"E2","S":"M'","S'":"M","S2":"M2","x":"z'","x'":"z","x2":"z2","y":"y","y'":"y'","y2":"y2","z":"x","z'":"x'","z2":"x2"},"y2":{"U":"U","U'":"U'","U2":"U2","D":"D","D'":"D'","D2":"D2","F":"B","F'":"B'","F2":"B2","B":"F","B'":"F'","B2":"F2","L":"R","L'":"R'","L2":"R2","R":"L","R'":"L'","R2":"L2","u":"u","u'":"u'","u2":"u2","d":"d","d'":"d'","d2":"d2","f":"b","f'":"b'","f2":"b2","b":"f","b'":"f'","b2":"f2","l":"r","l'":"r'","l2":"r2","r":"l","r'":"l'","r2":"l2","M":"M'","M'":"M","M2":"M2","E":"E","E'":"E'","E2":"E2","S":"S'","S'":"S","S2":"S2","x":"x'","x'":"x","x2":"x2","y":"y","y'":"y'","y2":"y2","z":"z'","z'":"z","z2":"z2"},"x":{"U":"B","U'":"B'","U2":"B2","D":"F","D'":"F'","D2":"F2","F":"U","F'":"U'","F2":"U2","B":"D","B'":"D'","B2":"D2","L":"L","L'":"L'","L2":"L2","R":"R","R'":"R'","R2":"R2","u":"b","u'":"b'","u2":"b2","d":"f","d'":"f'","d2":"f2","f":"u","f'":"u'","f2":"u2","b":"d","b'":"d'","b2":"d2","l":"l","l'":"l'","l2":"l2","r":"r","r'":"r'","r2":"r2","M":"M","M'":"M'","M2":"M2","E":"S","E'":"S'","E2":"S2","S":"E'","S'":"E","S2":"E2","x":"x","x'":"x'","x2":"x2","y":"z'","y'":"z","y2":"z2","z":"y","z'":"y'","z2":"y2"},"x'":{"U":"F","U'":"F'","U2":"F2","D":"B","D'":"B'","D2":"B2","F":"D","F'":"D'","F2":"D2","B":"U","B'":"U'","B2":"U2","L":"L","L'":"L'","L2":"L2","R":"R","R'":"R'","R2":"R2","u":"f","u'":"f'","u2":"f2","d":"b","d'":"b'","d2":"b2","f":"d","f'":"d'","f2":"d2","b":"u","b'":"u'","b2":"u2","l":"l","l'":"l'","l2":"l2","r":"r","r'":"r'","r2":"r2","M":"M","M'":"M'","M2":"M2","E":"S'","E'":"S","E2":"S2","S":"E","S'":"E'","S2":"E2","x":"x","x'":"x'","x2":"x2","y":"z","y'":"z'","y2":"z2","z":"y'","z'":"y","z2":"y2"},"x2":{"U":"D","U'":"D'","U2":"D2","D":"U","D'":"U'","D2":"U2","F":"B","F'":"B'","F2":"B2","B":"F","B'":"F'","B2":"F2","L":"L","L'":"L'","L2":"L2","R":"R","R'":"R'","R2":"R2","u":"d","u'":"d'","u2":"d2","d":"u","d'":"u'","d2":"u2","f":"b","f'":"b'","f2":"b2","b":"f","b'":"f'","b2":"f2","l":"l","l'":"l'","l2":"l2","r":"r","r'":"r'","r2":"r2","M":"M","M'":"M'","M2":"M2","E":"E'","E'":"E","E2":"E2","S":"S'","S'":"S","S2":"S2","x":"x","x'":"x'","x2":"x2","y":"y'","y'":"y","y2":"y2","z":"z'","z'":"z","z2":"z2"},"z":{"U":"R","U'":"R'","U2":"R2","D":"L","D'":"L'","D2":"L2","F":"F","F'":"F'","F2":"F2","B":"B","B'":"B'","B2":"B2","L":"U","L'":"U'","L2":"U2","R":"D","R'":"D'","R2":"D2","u":"r","u'":"r'","u2":"r2","d":"l","d'":"l'","d2":"l2","f":"f","f'":"f'","f2":"f2","b":"b","b'":"b'","b2":"b2","l":"u","l'":"u'","l2":"u2","r":"d","r'":"d'","r2":"d2","M":"E'","M'":"E","M2":"E2","E":"M","E'":"M'","E2":"M2","S":"S","S'":"S'","S2":"S2","x":"y'","x'":"y","x2":"y2","y":"x","y'":"x'","y2":"x2","z":"z","z'":"z'","z2":"z2"},"z'":{"U":"L","U'":"L'","U2":"L2","D":"R","D'":"R'","D2":"R2","F":"F","F'":"F'","F2":"F2","B":"B","B'":"B'","B2":"B2","L":"D","L'":"D'","L2":"D2","R":"U","R'":"U'","R2":"U2","u":"l","u'":"l'","u2":"l2","d":"r","d'":"r'","d2":"r2","f":"f","f'":"f'","f2":"f2","b":"b","b'":"b'","b2":"b2","l":"d","l'":"d'","l2":"d2","r":"u","r'":"u'","r2":"u2","M":"E","M'":"E'","M2":"E2","E":"M'","E'":"M","E2":"M2","S":"S","S'":"S'","S2":"S2","x":"y","x'":"y'","x2":"y2","y":"x'","y'":"x","y2":"x2","z":"z","z'":"z'","z2":"z2"},"z2":{"U":"D","U'":"D'","U2":"D2","D":"U","D'":"U'","D2":"U2","F":"F","F'":"F'","F2":"F2","B":"B","B'":"B'","B2":"B2","L":"R","L'":"R'","L2":"R2","R":"L","R'":"L'","R2":"L2","u":"d","u'":"d'","u2":"d2","d":"u","d'":"u'","d2":"u2","f":"f","f'":"f'","f2":"f2","b":"b","b'":"b'","b2":"b2","l":"r","l'":"r'","l2":"r2","r":"l","r'":"l'","r2":"l2","M":"M'","M'":"M","M2":"M2","E":"E'","E'":"E","E2":"E2","S":"S","S'":"S'","S2":"S2","x":"x'","x'":"x","x2":"x2","y":"y'","y'":"y","y2":"y2","z":"z","z'":"z'","z2":"z2"}};

  function invertWholeToken(token) {
    const t = String(token || '').trim();
    if (/2$/.test(t)) return t;
    if (/'/.test(t)) return t.replace("'", '');
    return t + "'";
  }

  function isWholeCubeToken(token) {
    return /^[xyz](2|'|)?$/.test(String(token || '').trim());
  }

  function rewriteUnderConj(conjList, token) {
    let m = token;
    for (let i = 0; i < conjList.length; i++) {
      const R = conjList[i];
      const map = FULL_CONJ[R];
      if (!map || map[m] == null) return m;
      m = map[m];
    }
    return m;
  }

  function expandProgressive(tokens, R0) {
    const conjList = R0 ? [R0] : [];
    const play = [];
    for (let i = 0; i < tokens.length; i++) {
      const M = tokens[i];
      if (isWholeCubeToken(M)) {
        // 吸收整块旋转：不播放，只更新后续改写基准
        conjList.push(invertWholeToken(M));
        continue;
      }
      play.push(rewriteUnderConj(conjList, M));
    }
    return { play, conjList };
  }

  function scoreViewTokens(tokens) {
    let s = 0;
    for (let i = 0; i < tokens.length; i++) {
      const f = String(tokens[i] || '')[0];
      if (f === 'L' || f === 'l' || f === 'B' || f === 'b') s += 100;
      else if (f === 'M') s += 5;
      else if (f === 'F' || f === 'f' || f === 'R' || f === 'r' || f === 'U' || f === 'u') s += 0;
      else s += 1;
    }
    return s;
  }

  function focusVisibilityScore(startCubies, focusIds, rot) {
    if (!startCubies || !focusIds || !focusIds.size) return 0;
    let cubies = startCubies;
    if (rot) cubies = applyMovesCubies(startCubies, [rot]);
    let s = 0;
    for (let i = 0; i < cubies.length; i++) {
      const c = cubies[i];
      if (!focusIds.has(cubieId(c))) continue;
      s += c.pos[2] * 3 + c.pos[0] * 1.5 + c.pos[1] * 0.3;
    }
    return s;
  }

  function sideLettersFromId(id) {
    const name = {};
    Object.keys(COLORS).forEach(k => { name[COLORS[k]] = k; });
    return String(id || '').split('|').map(c => name[c]).filter(x => x && x !== 'U' && x !== 'D');
  }

  function centersAfterY(rot) {
    const f = fromMoves(rot || '');
    const name = {};
    Object.keys(COLORS).forEach(k => { name[COLORS[k]] = k; });
    return { F: name[f.F[4]], R: name[f.R[4]], L: name[f.L[4]], B: name[f.B[4]] };
  }

  /**
   * 开场固定朝向规划：
   * - 选 R0 ∈ {null,y,y',y2}，让关键块尽量在前/右
   * - 吸收公式内全部 x/y/z
   * - 返回只含层转的 script；rot 由播放器写入初始态
   */
  function planFaceFront(script, opts) {
    opts = opts || {};
    const rawTokens = (script || []).map(s => s.move).filter(Boolean);
    if (!rawTokens.length) {
      return { rot: null, tokens: [], script: script || [] };
    }

    let focusIds = null;
    if (opts.startCubies) {
      if (opts.focusIds) focusIds = new Set(opts.focusIds);
      else if (opts.f2l) focusIds = pickF2LFocusIds(opts.startCubies, solvedCubies());
      else focusIds = pickFocusCubieIds(opts.startCubies, opts.maxFocus != null ? opts.maxFocus : 4);
    }

    let preferredSides = null;
    if (focusIds && focusIds.size) {
      const edgeId = Array.from(focusIds).find(id => String(id).split('|').length === 2);
      if (edgeId) preferredSides = sideLettersFromId(edgeId);
    }

    // 只评估一次整体朝向，之后固定：
    // 1) 关键彩色块尽量到前/右（主目标）
    // 2) 改写后层转尽量无 L/B
    // 3) 公式内 x/y/z 全部吸收
    const candidates = [];
    [null, 'y', "y'", 'y2'].forEach(function (rot) {
      const exp = expandProgressive(rawTokens, rot);
      const play = exp.play;
      let hard = 0;
      let whole = 0;
      for (let i = 0; i < play.length; i++) {
        const f = String(play[i] || '')[0];
        if (f === 'L' || f === 'l' || f === 'B' || f === 'b') hard += 1;
        if (isWholeCubeToken(play[i])) whole += 1;
      }
      const vis = (focusIds && focusIds.size && opts.startCubies)
        ? focusVisibilityScore(opts.startCubies, focusIds, rot)
        : 0;

      let backCount = 0;
      let frontCount = 0;
      if (focusIds && focusIds.size && opts.startCubies) {
        const cubies = rot ? applyMovesCubies(opts.startCubies, [rot]) : opts.startCubies;
        for (let i = 0; i < cubies.length; i++) {
          const c = cubies[i];
          if (!focusIds.has(cubieId(c))) continue;
          if (c.pos[2] < 0) backCount += 1;
          if (c.pos[2] > 0) frontCount += 1;
        }
      }

      let sideBonus = 0;
      if (preferredSides && preferredSides.length === 2) {
        const c = centersAfterY(rot);
        if (preferredSides.every(function (s) { return s === c.F || s === c.R; })) sideBonus = 1;
      }

      candidates.push({
        rot: rot,
        play: play,
        hard: hard,
        whole: whole,
        vis: vis,
        backCount: backCount,
        frontCount: frontCount,
        sideBonus: sideBonus
      });
    });

    let pool = candidates.filter(function (c) { return c.whole === 0; });
    if (!pool.length) pool = candidates.slice();

    // 排序原则（F2L 固定朝向）：
    // 1) 层转尽量无 L/B（正面拧；绝不为了“更正面”改成左手/背面拧）
    // 2) 关键块尽量不在背面
    // 3) 可见度 / 前侧块
    // 4) 少一次整体旋转
    const zeroHard = pool.filter(function (c) { return c.hard === 0; });
    let good = zeroHard.length ? zeroHard : pool.slice();

    const minBack = Math.min.apply(null, good.map(function (c) { return c.backCount; }));
    good = good.filter(function (c) { return c.backCount === minBack; });

    good.sort(function (p, q) {
      if (p.hard !== q.hard) return p.hard - q.hard;
      if (p.backCount !== q.backCount) return p.backCount - q.backCount;
      if (q.vis !== p.vis) return q.vis - p.vis;
      if (q.frontCount !== p.frontCount) return q.frontCount - p.frontCount;
      if (q.sideBonus !== p.sideBonus) return q.sideBonus - p.sideBonus;
      if (!!p.rot !== !!q.rot) return p.rot ? 1 : -1;
      return 0;
    });

    const bestRot = good[0].rot;
    const bestPlay = good[0].play;

    // 只输出层转。rot 由播放器烘焙进就绪态（固定朝向）
    // 播放阶段不再出现 y/y'/y2
    const outScript = [];
    let pi = 0;
    for (let i = 0; i < rawTokens.length; i++) {
      const raw = rawTokens[i];
      if (isWholeCubeToken(raw)) continue;
      const mv = bestPlay[pi++];
      if (!mv) continue;
      const changed = mv !== raw;
      let text = '执行 ' + mv;
      if (changed) text = '执行 ' + mv + '（原 ' + raw + '）';
      outScript.push({
        move: mv,
        text: text,
        origMove: raw,
        reorient: false,
        silent: false
      });
    }
    while (pi < bestPlay.length) {
      const mv = bestPlay[pi++];
      outScript.push({ move: mv, text: '执行 ' + mv, reorient: false, silent: false });
    }

    return { rot: bestRot, tokens: bestPlay, script: outScript };
  }

  function expandScriptFaceFront(script, opts) {
    return planFaceFront(script, opts).script;
  }

  function applyMovesCubies(cubies, moves) {
    let c = cloneCubies(cubies);
    const list = Array.isArray(moves) ? moves : tokenizeMoves(moves);
    list.forEach(mv => {
      const p = parseMove(mv);
      if (p) c = applyMotion(c, p);
    });
    return c;
  }

  function fromMoves(moves) {
    return facesFromCubies(applyMovesCubies(solvedCubies(), moves));
  }

  function solvedCube() {
    return facesFromCubies(solvedCubies());
  }

  function cloneFaces(faces) {
    const o = {};
    Object.keys(faces).forEach(k => { o[k] = faces[k].slice(); });
    return o;
  }

  function isSolved(faces) {
    const s = solvedCube();
    return Object.keys(s).every(f => s[f].every((c, i) => c === faces[f][i]));
  }

  function applyTurn(faces, face, dir) {
    const layer = LAYER[face];
    if (!layer) return cloneFaces(faces);
    return facesFromCubies(applyMotion(cubiesFromFaces(faces), {
      axis: layer.axis, values: [layer.value],
      axisName: AXIS_NAME[face], axisSign: AXIS_SIGN[face], dir
    }));
  }

  function applyMoves(faces, moves) {
    return facesFromCubies(applyMovesCubies(cubiesFromFaces(faces), moves));
  }

  // ---------- 渲染 ----------
  function project(p, ox, oy, scale) {
    const [x, y, z] = p;
    return {
      x: ox + (x - z) * scale,
      y: oy - y * scale * 1.05 + (x + z) * scale * 0.52
    };
  }

  function depthKey(p) {
    return p[0] * 0.4 + p[1] * 0.25 + p[2] * 1.0;
  }

  function facingCamera(n) {
    return n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2];
  }

  function pts(arr) {
    return arr.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  }

  function shadeByNormal(color, normal) {
    // 用朝向做轻微明暗，不用“原面名字”，避免中途看起来换色
    const lit = facingCamera(normal);
    const amount = Math.max(-0.22, Math.min(0.12, lit * 0.2 - 0.08));
    const m = String(color).match(/^#([0-9a-f]{6})$/i);
    if (!m) return color;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amount >= 0) {
      r = Math.round(r + (255 - r) * amount);
      g = Math.round(g + (255 - g) * amount);
      b = Math.round(b + (255 - b) * amount);
    } else {
      const d = 1 + amount;
      r = Math.round(r * d); g = Math.round(g * d); b = Math.round(b * d);
    }
    return `rgb(${r},${g},${b})`;
  }

  // 在静止姿态下，按轴对齐法线生成贴纸四角（局部坐标，贴在小块表面）
  function restStickerCorners(pos, dirKeyName, gap) {
    const g = gap == null ? 0.10 : gap;
    const n = dirToVec(dirKeyName);
    let u, v;
    if (dirKeyName === '+y' || dirKeyName === '-y') {
      u = [1, 0, 0];
      v = [0, 0, dirKeyName === '+y' ? 1 : -1];
    } else if (dirKeyName === '+z' || dirKeyName === '-z') {
      u = [1, 0, 0];
      v = [0, -1, 0];
    } else {
      // ±x
      u = [0, 0, dirKeyName === '+x' ? -1 : 1];
      v = [0, -1, 0];
    }
    const half = 0.5 - g;
    // 小块半边长 0.5，贴纸贴在外表面
    const cx = pos[0] + n[0] * 0.5;
    const cy = pos[1] + n[1] * 0.5;
    const cz = pos[2] + n[2] * 0.5;
    const signs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    return signs.map(([su, sv]) => [
      cx + u[0] * su * half + v[0] * sv * half,
      cy + u[1] * su * half + v[1] * sv * half,
      cz + u[2] * su * half + v[2] * sv * half
    ]);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, m => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
  }

  // 教学高亮：
  // - 开场锁定少数“关键块”（默认最多 3 个）
  // - 全程用块身份跟踪，颜色不会中途消失
  // - 中心块保留颜色做方位参考，其余非关键块涂黑
  const TEACH_BLACK = '#0b0d12';
  const DIR_FACE = { '+y': 'U', '-y': 'D', '+z': 'F', '-z': 'B', '-x': 'L', '+x': 'R' };
  const COLOR_HOME_DIR = {};
  Object.keys(DIR_FACE).forEach(dk => { COLOR_HOME_DIR[COLORS[DIR_FACE[dk]]] = dk; });

  function cubieId(c) {
    // 用贴纸颜色集合标识小块身份（转动不改变）
    return Object.values(c.stickers).slice().sort().join('|');
  }

  // F2L 关键块：底面角块（含 D 色）或中层棱块（无 U/D）
  function isF2LPairCubie(c) {
    const cols = Object.values(c.stickers);
    if (cols.length === 3 && cols.includes(COLORS.D)) return true;
    if (cols.length === 2 && !cols.includes(COLORS.U) && !cols.includes(COLORS.D)) return true;
    return false;
  }

  function f2lSideKey(c) {
    return Object.values(c.stickers)
      .filter(col => col !== COLORS.D && col !== COLORS.U)
      .slice()
      .sort()
      .join('|');
  }

  /**
   * 为 F2L 演示锁定「教程那一对」：1 个底角 + 1 个中层棱。
   * 用公式逆推初始态与还原态比较，找出真正被处理的 F2L 对；
   * 角/棱按侧面两色配对（即使某一块净位移为 0 也补上搭档）。
   */
  function pickF2LFocusIds(startCubies, endCubies) {
    const end = endCubies || solvedCubies();
    const endMap = new Map(end.map(c => [cubieId(c), c]));

    const moved = startCubies.filter(c => {
      if (!isF2LPairCubie(c)) return false;
      const e = endMap.get(cubieId(c));
      if (!e) return true;
      if (c.pos.some((v, i) => v !== e.pos[i])) return true;
      return Object.keys(c.stickers).some(dk => e.stickers[dk] !== c.stickers[dk]);
    });

    const corners = moved.filter(c => Object.keys(c.stickers).length === 3);
    const edges = moved.filter(c => Object.keys(c.stickers).length === 2);

    for (const corner of corners) {
      const sk = f2lSideKey(corner);
      let edge = edges.find(e => f2lSideKey(e) === sk);
      if (!edge) {
        edge = startCubies.find(c =>
          Object.keys(c.stickers).length === 2 && f2lSideKey(c) === sk
        );
      }
      if (edge) return new Set([cubieId(corner), cubieId(edge)]);
    }

    for (const edge of edges) {
      const sk = f2lSideKey(edge);
      const corner = startCubies.find(c =>
        Object.keys(c.stickers).length === 3 &&
        Object.values(c.stickers).includes(COLORS.D) &&
        f2lSideKey(c) === sk
      );
      if (corner) return new Set([cubieId(corner), cubieId(edge)]);
    }

    return new Set(moved.slice(0, 2).map(cubieId));
  }

  function isCubieSolved(c) {
    const keys = Object.keys(c.stickers);
    if (!keys.length) return true;
    for (const dk of keys) {
      const face = DIR_FACE[dk];
      if (!face) return false;
      const layer = LAYER[face];
      if (c.pos[layer.axis] !== layer.value) return false;
      if (c.stickers[dk] !== COLORS[face]) return false;
    }
    return true;
  }

  function cubieScore(c) {
    // 分数越高越“关键”：错朝向 > 错位置
    let score = 0;
    let posWrong = false;
    Object.keys(c.stickers).forEach(dk => {
      const col = c.stickers[dk];
      const homeDir = COLOR_HOME_DIR[col];
      if (homeDir && homeDir !== dk) score += 3; // 贴纸朝向错
      const face = DIR_FACE[dk];
      if (face) {
        const layer = LAYER[face];
        if (c.pos[layer.axis] !== layer.value) posWrong = true;
      }
    });
    if (posWrong) score += 2;
    if (!isCubieSolved(c)) score += 1;
    // 边块/角块略优先于中心（中心已排除）
    score += Object.keys(c.stickers).length * 0.1;
    return score;
  }

  function pickFocusCubieIds(cubies, maxFocus) {
    // 关键块 = 开场时所有未归位的角/棱（中心块不算）
    // maxFocus 仅作可选上限；默认不限制
    const candidates = cubies
      .filter(c => Object.keys(c.stickers).length > 1 && !isCubieSolved(c))
      .map(c => ({ id: cubieId(c), score: cubieScore(c) }))
      .sort((a, b) => b.score - a.score);

    let list = candidates.map(c => c.id);
    if (maxFocus != null && maxFocus > 0 && list.length > maxFocus) {
      list = list.slice(0, maxFocus);
    }
    return new Set(list);
  }

  /**
   * OLL / OCLL：高亮所有带顶色（黄）的角块和棱块。
   * 目标是把顶面黄色拼满，因此已朝上的十字棱、未朝上的角都要标出。
   * 中心块不进 focus 列表（渲染时中心本来就会保留颜色）。
   */
  function pickOLLFocusIds(cubies) {
    return new Set(
      (cubies || [])
        .filter(c => {
          const keys = Object.keys(c.stickers);
          if (keys.length <= 1) return false;
          return Object.values(c.stickers).includes(COLORS.U);
        })
        .map(cubieId)
    );
  }

  /**
   * Cross：高亮四条底白棱（含 D 色的棱块）。
   * 目标是白十字 + 侧色对齐，因此始终标出四条白棱。
   */
  function pickCrossFocusIds(cubies) {
    return new Set(
      (cubies || [])
        .filter(c => {
          const keys = Object.keys(c.stickers);
          if (keys.length !== 2) return false;
          return Object.values(c.stickers).includes(COLORS.D);
        })
        .map(cubieId)
    );
  }

  /**
   * 层先法 · 中层棱：
   * 中心块始终上色（mask 里单独保留）。
   * focus = 四条底白棱 + 当前要插/取的非黄中层棱
   *       + 目标槽对应的底部白角（两色与该棱一致，便于认槽）。
   */
  function pickLBLMidFocusIds(cubies) {
    const list = cubies || [];
    const ids = new Set();

    // 底白十字四棱：方位参照
    list.forEach(c => {
      const keys = Object.keys(c.stickers);
      if (keys.length !== 2) return;
      if (Object.values(c.stickers).includes(COLORS.D)) ids.add(cubieId(c));
    });

    // 非黄棱（中层棱）：优先顶层上的那条，否则取最“关键”的未归位者
    const midEdges = list
      .filter(c => {
        const keys = Object.keys(c.stickers);
        if (keys.length !== 2) return false;
        const cols = Object.values(c.stickers);
        if (cols.includes(COLORS.U) || cols.includes(COLORS.D)) return false;
        return !isCubieSolved(c);
      })
      .map(c => ({
        cubie: c,
        id: cubieId(c),
        score: cubieScore(c) + (c.pos[1] === 1 ? 5 : 0) // 顶层优先
      }))
      .sort((a, b) => b.score - a.score);

    if (!midEdges.length) return ids;

    const target = midEdges[0];
    ids.add(target.id);

    const sideCols = Object.values(target.cubie.stickers);
    // 目标槽底部白角：白 + 棱的两色（如绿红棱 → 白绿红角）
    const slotCorner = list.find(c => {
      if (Object.keys(c.stickers).length !== 3) return false;
      const cols = Object.values(c.stickers);
      if (!cols.includes(COLORS.D)) return false;
      return sideCols.every(col => cols.includes(col));
    });
    if (slotCorner) ids.add(cubieId(slotCorner));

    // 棱已在中层错误槽：再标出该槽正下方的底角（按位置）
    if (target.cubie.pos[1] === 0) {
      const [ex, , ez] = target.cubie.pos;
      const under = list.find(c =>
        Object.keys(c.stickers).length === 3 &&
        c.pos[0] === ex && c.pos[1] === -1 && c.pos[2] === ez
      );
      if (under) ids.add(cubieId(under));
    }

    return ids;
  }

  function maskCubiesTeaching(cubies, focusIds) {
    const focus = focusIds || pickFocusCubieIds(cubies, 3);
    return cubies.map(c => {
      const keys = Object.keys(c.stickers);
      // 中心块：保留颜色做方位参考
      if (keys.length === 1) {
        return { pos: c.pos.slice(), stickers: Object.assign({}, c.stickers) };
      }
      const id = cubieId(c);
      if (focus.has(id)) {
        return { pos: c.pos.slice(), stickers: Object.assign({}, c.stickers) };
      }
      const stickers = {};
      keys.forEach(dk => { stickers[dk] = TEACH_BLACK; });
      return { pos: c.pos.slice(), stickers };
    });
  }

  /**
   * 刚体转层渲染：
   * 1) 静止姿态生成每个贴纸四角
   * 2) 属于转层的贴纸：四个角点 + 法线 一起绕魔方中心旋转
   * 3) teaching：关键角/棱上色；其背向贴纸虚线画出；中心与黑块不透视
   */
  function renderCube(faces, opts) {
    opts = opts || {};
    const ox = opts.ox || 140;
    const oy = opts.oy || 118;
    const scale = opts.scale || 38;
    const width = opts.width || 280;
    const height = opts.height || 240;
    const motion = opts.motion || null;
    const moveLabel = opts.move || '';
    const teaching = !!opts.teaching;
    const focusIds = opts.focusIds || null;
    // 仅关键角/棱背向贴纸透视；可 opts.xray:false 关闭
    const xray = teaching && opts.xray !== false;

    let cubies = cubiesFromFaces(faces);
    const focus = teaching
      ? (focusIds || pickFocusCubieIds(cubies, opts.maxFocus != null ? opts.maxFocus : 3))
      : null;
    if (teaching) cubies = maskCubiesTeaching(cubies, focus);

    let angle = 0, axis = null, layerAxis = null, layerValues = null, layerAll = false;
    if (motion) {
      // motion 可以是 {face,dir,progress} 或完整 parseMove 结果 + progress
      let m = motion;
      if (motion.face && motion.axis == null && LAYER[motion.face]) {
        const layer = LAYER[motion.face];
        m = {
          dir: motion.dir,
          axis: layer.axis,
          values: [layer.value],
          axisName: AXIS_NAME[motion.face],
          axisSign: AXIS_SIGN[motion.face]
        };
      }
      axis = m.axisName;
      layerAxis = m.axis;
      layerValues = m.all ? null : new Set(m.values || []);
      layerAll = !!m.all;
      const turns = m.dir === 2 ? 2 : 1;
      const dirMul = m.dir === -1 ? -1 : 1;
      const e = Math.max(0, Math.min(1, motion.progress || 0));
      const s = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
      angle = m.axisSign * dirMul * (Math.PI / 2) * turns * s;
    }

    const quads = [];
    cubies.forEach(c => {
      const moving = !!(axis && (layerAll || (layerValues && layerValues.has(c.pos[layerAxis]))));
      const keys = Object.keys(c.stickers);
      const isCenter = keys.length === 1;
      // 关键角/棱：mask 后仍有真实色，且不是中心（中心不参与透视）
      const isFocusPiece = !isCenter && keys.some(dk => {
        const col = c.stickers[dk];
        return col !== TEACH_BLACK && col !== '#0b0d12';
      });

      Object.keys(c.stickers).forEach(dk => {
        // 先在静止姿态生成贴纸几何，再整体旋转（刚体）
        let corners = restStickerCorners(c.pos, dk, 0.10);
        let n = dirToVec(dk);

        if (moving) {
          corners = corners.map(p => rotVec(p, axis, angle));
          n = rotVec(n, axis, angle);
        }

        const len = Math.hypot(n[0], n[1], n[2]) || 1;
        n = [n[0] / len, n[1] / len, n[2] / len];
        const faceCam = facingCamera(n);
        const color = c.stickers[dk];
        const isBlack = color === TEACH_BLACK || color === '#0b0d12';
        // 仅关键角/棱的真实色贴纸可背面透视；中心/黑块绝不透视
        const canXray = xray && isFocusPiece && !isBlack;

        let kind;
        if (faceCam < 0.02) {
          if (!canXray) return; // 背面：中心、黑块、非关键色一律不画
          kind = 'xray';
        } else if (isBlack) {
          kind = 'dim'; // 正面黑块保持不透明
        } else if (isFocusPiece) {
          kind = 'focus';
        } else {
          kind = 'front'; // 中心等正面色
        }

        const proj = corners.map(p => project(p, ox, oy, scale));
        const ctr = [
          (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4,
          (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4,
          (corners[0][2] + corners[1][2] + corners[2][2] + corners[3][2]) / 4
        ];
        let depth = depthKey(ctr);
        if (kind === 'xray') depth -= 0.4;
        quads.push({
          points: proj,
          color: color,
          normal: n,
          depth: depth,
          kind: kind
        });
      });
    });

    // 绘制顺序：背面关键色 → 黑块 → 正面普通 → 正面关键
    const kindOrder = { xray: 0, dim: 1, front: 2, focus: 3 };
    quads.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return (kindOrder[a.kind] || 0) - (kindOrder[b.kind] || 0);
    });

    let out = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" class="cube-demo-svg" xmlns="http://www.w3.org/2000/svg">`;
    out += `<ellipse cx="${ox}" cy="${height - 26}" rx="80" ry="16" fill="rgba(0,0,0,.22)"/>`;
    // 固定中心块示意（不参与转层），让“贴着中心转”更明显
    const core = project([0, 0, 0], ox, oy, scale);
    out += `<circle cx="${core.x}" cy="${core.y}" r="${scale * 0.22}" fill="#1a2030" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`;

    quads.forEach(q => {
      const isBlack = q.color === TEACH_BLACK || q.color === '#0b0d12';
      let fill;
      let cls = 'cube-sticker-3d';
      if (q.kind === 'xray') {
        // 背面关键色：略压暗 + 虚线描边，表示「在背面」
        fill = shadeByNormal(q.color, q.normal);
        cls += ' focus xray';
      } else if (q.kind === 'dim' || isBlack) {
        fill = TEACH_BLACK;
        cls += ' dim';
      } else if (q.kind === 'focus') {
        fill = shadeByNormal(q.color, q.normal);
        cls += ' focus';
      } else {
        fill = shadeByNormal(q.color, q.normal);
      }
      out += `<polygon class="${cls}" points="${pts(q.points)}" fill="${fill}"/>`;
      if (q.kind === 'focus' || q.kind === 'xray') {
        const p = q.points;
        const g0 = { x: p[0].x * 0.7 + p[1].x * 0.15 + p[3].x * 0.15, y: p[0].y * 0.7 + p[1].y * 0.15 + p[3].y * 0.15 };
        const g1 = { x: p[0].x * 0.15 + p[1].x * 0.7 + p[2].x * 0.15, y: p[0].y * 0.15 + p[1].y * 0.7 + p[2].y * 0.15 };
        const g2 = { x: (p[0].x + p[1].x + p[2].x + p[3].x) / 4, y: (p[0].y + p[1].y + p[2].y + p[3].y) / 4 };
        const gloss = q.kind === 'xray' ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.14)';
        out += `<polygon class="cube-sticker-gloss" points="${g0.x.toFixed(1)},${g0.y.toFixed(1)} ${g1.x.toFixed(1)},${g1.y.toFixed(1)} ${g2.x.toFixed(1)},${g2.y.toFixed(1)}" fill="${gloss}"/>`;
      }
    });

    if (moveLabel) {
      out += `<g transform="translate(${width - 62},18)"><rect x="0" y="0" width="48" height="26" rx="8" fill="rgba(255,202,40,.94)"/><text x="24" y="17" text-anchor="middle" font-size="13" font-weight="800" fill="#12141c">${escapeHtml(moveLabel)}</text></g>`;
    }
    out += `</svg>`;
    return out;
  }

  // ---------- 播放器：全程 cubie 状态机 ----------
  function renderPlayer(container, config) {
    // faceFront：默认开启——开场整体转正一次，固定朝向后再播公式
    const faceFront = config.faceFront !== false;
    const rawScript = config.script || config.steps || [];
    const turnDuration = config.turnDuration || 560;
    const settleDelay = config.settleDelay || 180;

    // 初始：优先 start cubies；或 start facelets；或 moves
    let startCubies;
    if (config.startCubies) startCubies = cloneCubies(config.startCubies);
    else if (config.start) startCubies = cubiesFromFaces(config.start);
    else startCubies = solvedCubies();

    // 教学模式：开场锁定关键块身份，全程跟踪（不会中途变黑）
    // 注意：focus 在整体转正之前锁定（身份不随朝向变）
    const teaching = config.teaching !== false;
    const maxFocus = config.maxFocus;
    const isF2L = !!(config.f2l || config.focusMode === 'f2l');
    const isOLL = !!(config.oll || config.focusMode === 'oll' || config.ocll || config.pll || config.focusMode === 'pll');
    const isCross = !!(config.cross || config.focusMode === 'cross');
    const isLBLMid = !!(config.lblMid || config.focusMode === 'lblMid');
    let focusIds = null;
    if (teaching) {
      if (config.focusIds) {
        focusIds = new Set(config.focusIds);
      } else if (isF2L) {
        // F2L：只标教程角块+棱块（按侧面色配对），中心保留
        focusIds = pickF2LFocusIds(startCubies, solvedCubies());
      } else if (isOLL) {
        // OLL / OCLL / PLL：标出所有带顶色（黄）的角块和棱块（顶层 8 块）
        focusIds = pickOLLFocusIds(startCubies);
      } else if (isCross) {
        // Cross：四条白棱
        focusIds = pickCrossFocusIds(startCubies);
      } else if (isLBLMid) {
        // 层先法中层：底白棱 + 当前要插/取的非黄棱（中心保留）
        focusIds = pickLBLMidFocusIds(startCubies);
      } else {
        focusIds = pickFocusCubieIds(startCubies, maxFocus);
      }
    }

    // 面向用户：
    // 1) 就绪态：整体转到「关键彩色块在正面」，朝向固定（烘焙，不播 y）
    // 2) 播放：只演示层转，绝不再左右甩整个魔方
    // 3) 公式内 x/y/z 已吸收进改写
    const plan = faceFront
      ? planFaceFront(rawScript, {
          f2l: isF2L,
          startCubies: startCubies,
          focusIds: focusIds,
          maxFocus: maxFocus
        })
      : { rot: null, tokens: rawScript.map(function (s) { return s.move; }).filter(Boolean), script: rawScript };

    // 固定朝向：就绪画面 = 关键块已在正面
    if (plan.rot) {
      startCubies = applyMovesCubies(startCubies, [plan.rot]);
    }

    // 只播层转（过滤任何整块旋转）
    const script = (plan.script || []).filter(function (step) {
      if (!step || !step.move) return false;
      if (step.reorient) return false;
      if (isWholeCubeToken(step.move)) return false;
      return true;
    });

    // 预计算每步后的 cubies + facelets
    const frames = [];
    let cur = cloneCubies(startCubies);
    script.forEach(function (step) {
      const mv = step.move ? parseMove(step.move) : null;
      if (mv) cur = applyMotion(cur, mv);
      frames.push({
        text: step.text || '',
        move: step.move || '',
        cubies: cloneCubies(cur),
        faces: facesFromCubies(cur),
        turn: mv,
        reorient: false,
        silent: false
      });
    });

    const startFaces = facesFromCubies(startCubies);
    const orientNote = plan.rot
      ? '关键块已转到正面并固定朝向，下面只演示层转。'
      : '朝向已固定，下面只演示层转。';

    container.innerHTML = `
      <div class="demo-player">
        <div class="demo-stage"></div>
        <div class="demo-meta">
          <div class="demo-caption"></div>
          <div class="demo-controls">
            <button type="button" class="demo-btn play">播放演示</button>
            <button type="button" class="demo-btn replay">重播</button>
          </div>
        </div>
      </div>`;
    const stage = container.querySelector('.demo-stage');
    const caption = container.querySelector('.demo-caption');
    const playBtn = container.querySelector('.demo-btn.play');
    const replayBtn = container.querySelector('.demo-btn.replay');

    let raf = 0, timer = 0, playing = false, stopped = false;

    function paint(faces, extras) {
      extras = extras || {};
      stage.innerHTML = renderCube(faces, {
        move: extras.move || '',
        motion: extras.motion || null,
        teaching: teaching,
        focusIds: focusIds
      });
    }

    function showStart() {
      paint(startFaces, { move: '就绪' });
      const n = focusIds ? focusIds.size : 0;
      const base = config.intro || `高亮 ${n} 个未归位关键块（其余黑色）。点击播放`;
      const tip = orientNote ? `${base} ${orientNote}` : base;
      caption.innerHTML = `<span class="demo-step">准备</span> ${escapeHtml(tip)}`;
    }

    function stopAll() {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      raf = 0; timer = 0; playing = false;
      playBtn.textContent = '播放演示';
    }

    function animateMove(beforeFaces, turn, afterFaces, meta, done) {
      // silent / 无转层：瞬时切状态（用于吸收 x/y/z 整块旋转）
      if (!turn || meta.silent) {
        paint(afterFaces, { move: meta.silent ? '' : (meta.move || '') });
        if (meta.silent) {
          // 整块旋转不占讲解时间，几乎无停顿
          timer = setTimeout(done, 16);
        } else {
          caption.innerHTML = `<span class="demo-step">${meta.label}</span> ${escapeHtml(meta.text)}`;
          timer = setTimeout(done, settleDelay);
        }
        return;
      }
      const dur = meta.reorient ? Math.max(turnDuration * 1.5, 800) : turnDuration;
      const t0 = performance.now();
      caption.innerHTML = `<span class="demo-step">${meta.label}</span> ${escapeHtml(meta.text)}`;
      function frame(now) {
        if (stopped) return;
        const p = Math.min(1, (now - t0) / dur);
        paint(beforeFaces, {
          move: meta.move,
          motion: Object.assign({}, turn, { progress: p })
        });
        if (p < 1) raf = requestAnimationFrame(frame);
        else {
          paint(afterFaces, { move: meta.move });
          timer = setTimeout(done, meta.reorient ? Math.max(settleDelay, 380) : settleDelay);
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function playSequence() {
      if (!frames.length) return;
      stopAll();
      stopped = false;
      playing = true;
      playBtn.textContent = '停止';
      let i = 0;
      let currentFaces = cloneFaces(startFaces);
      const layerTotal = frames.filter(f => f.move).length;
      let layerIndex = 0;

      const next = () => {
        if (stopped) return;
        if (i >= frames.length) {
          playing = false;
          playBtn.textContent = '播放演示';
          return;
        }
        const step = frames[i];
        const before = cloneFaces(currentFaces);
        let label = '';
        layerIndex += 1;
        label = `步骤 ${layerIndex}/${layerTotal || frames.length}`;
        animateMove(before, step.turn, step.faces, {
          move: step.move,
          text: step.text,
          label: label,
          silent: !!step.silent
        }, () => {
          currentFaces = step.faces;
          i += 1;
          next();
        });
      };
      paint(startFaces, { move: '开始' });
      timer = setTimeout(next, 200);
    }

    playBtn.addEventListener('click', () => {
      if (playing) {
        stopped = true;
        stopAll();
        showStart();
        return;
      }
      playSequence();
    });
    replayBtn.addEventListener('click', () => {
      stopped = true;
      stopAll();
      playSequence();
    });

    showStart();
  }

  function selfTest() {
    let c = solvedCubies();
    for (let i = 0; i < 6; i++) c = applyMovesCubies(c, "R U R' U'");
    const sexy = isSolved(facesFromCubies(c));
    c = solvedCubies();
    c = applyMovesCubies(c, 'R R R R');
    const r4 = isSolved(facesFromCubies(c));
    c = solvedCubies();
    c = applyMovesCubies(c, "R R'");
    const inv = isSolved(facesFromCubies(c));
    c = applyMovesCubies(solvedCubies(), 'R');
    const f = facesFromCubies(c);
    const rOk = f.U[2] === COLORS.F && f.U[5] === COLORS.F && f.U[8] === COLORS.F;
    // 双层 / 中层 / 整体
    const wide = isSolved(fromMoves("r r'"));
    const mid = isSolved(fromMoves("M M'"));
    const rot = isSolved(fromMoves("y y y y"));
    return { sexy, r4, inv, rOk, wide, mid, rot, ok: sexy && r4 && inv && rOk && wide && mid && rot };
  }

  /**
   * 静态教学快照：与演示「就绪」画面同一套 focus / 朝向逻辑。
   * 用于公式卡顶部示意图，替代平面图。
   * F2L / PLL 优先走专用 demo 生成器，保证初始态与演示一致。
   */
  function renderTeachingSnap(opts) {
    opts = opts || {};
    const isF2L = !!(opts.f2l || opts.focusMode === 'f2l');
    const isPLL = !!(opts.pll || opts.focusMode === 'pll');
    const isOLL = !!(opts.oll || opts.focusMode === 'oll' || opts.ocll) || isPLL;
    const isCross = !!(opts.cross || opts.focusMode === 'cross');
    const isLBLMid = !!(opts.lblMid || opts.focusMode === 'lblMid');
    const maxFocus = opts.maxFocus;

    // 若未显式给 start，按模式走对应 demo 生成器
    let demo = null;
    if (!opts.startCubies && !opts.start && opts.moves) {
      if (isF2L && typeof demoFromAlgoF2L === 'function') demo = demoFromAlgoF2L(opts.moves);
      else if (isPLL && typeof demoFromAlgoPLL === 'function') demo = demoFromAlgoPLL(opts.moves);
      else demo = demoFromAlgo(opts.moves);
    }

    let startCubies;
    if (opts.startCubies) startCubies = cloneCubies(opts.startCubies);
    else if (opts.start) startCubies = cubiesFromFaces(opts.start);
    else if (demo && demo.startCubies) startCubies = cloneCubies(demo.startCubies);
    else if (demo && demo.start) startCubies = cubiesFromFaces(demo.start);
    else startCubies = solvedCubies();

    let focusIds = null;
    if (opts.focusIds) {
      focusIds = opts.focusIds instanceof Set ? opts.focusIds : new Set(opts.focusIds);
    } else if (demo && demo.focusIds && demo.focusIds.length) {
      focusIds = new Set(demo.focusIds);
    } else if (isF2L) {
      focusIds = pickF2LFocusIds(startCubies, solvedCubies());
    } else if (isOLL || isPLL) {
      focusIds = pickOLLFocusIds(startCubies);
    } else if (isCross) {
      focusIds = pickCrossFocusIds(startCubies);
    } else if (isLBLMid) {
      focusIds = pickLBLMidFocusIds(startCubies);
    } else {
      focusIds = pickFocusCubieIds(startCubies, maxFocus);
    }

    // F2L / PLL 专用生成器已固定朝向，默认不再 faceFront
    let doFaceFront;
    if (typeof opts.faceFront === 'boolean') doFaceFront = opts.faceFront;
    else if (demo && demo.faceFrontDone) doFaceFront = false;
    else if (isF2L || isPLL) doFaceFront = false;
    else doFaceFront = true;

    if (doFaceFront) {
      let rawScript = opts.script;
      if (!rawScript && demo && demo.script) rawScript = demo.script;
      if (!rawScript && opts.moves) rawScript = demoFromAlgo(opts.moves).script;
      rawScript = rawScript || [];
      const plan = planFaceFront(rawScript, {
        f2l: isF2L,
        startCubies: startCubies,
        focusIds: focusIds,
        maxFocus: maxFocus
      });
      if (plan.rot) startCubies = applyMovesCubies(startCubies, [plan.rot]);
    }

    const w = opts.width || 168;
    const h = opts.height || 148;
    return renderCube(facesFromCubies(startCubies), {
      teaching: true,
      focusIds: focusIds,
      width: w,
      height: h,
      scale: opts.scale || 24,
      ox: opts.ox || Math.round(w / 2),
      oy: opts.oy || Math.round(h * 0.48)
    });
  }

  window.CubeAnim = {
    COLORS, C: COLORS,
    solvedCube, cloneFaces, applyTurn, applyMoves, parseMove, fromMoves, isSolved,
    solvedCubies, applyTurnCubies, applyMovesCubies, cubiesFromFaces, facesFromCubies,
    tokenizeMoves, reverseMoves, demoFromAlgo, demoFromAlgoF2L, demoFromAlgoPLL,
    planFaceFront, expandScriptFaceFront,
    pickFocusCubieIds, pickF2LFocusIds, pickOLLFocusIds, pickCrossFocusIds, pickLBLMidFocusIds,
    renderCube, renderPlayer, renderTeachingSnap, selfTest
  };
})();
