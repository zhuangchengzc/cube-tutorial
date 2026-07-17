/* ============ 通用 UI 增强 ============
   - 复制按钮：CubeUI.attachCopy(cardEl, movesText)
   - 演示按钮：CubeUI.attachDemo(cardEl, movesText)
   - 搜索框：CubeUI.wireSearch(...)
================================================ */
(function () {
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); resolve(); }
      catch (e) { reject(e); }
      finally { document.body.removeChild(ta); }
    });
  }

  function attachCopy(card, movesText) {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', '复制公式');
    btn.textContent = '复制';
    btn.addEventListener('click', () => {
      copyText(movesText).then(() => {
        btn.textContent = '已复制 ✓';
        btn.classList.add('done');
        setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('done'); }, 1200);
      }).catch(() => {
        btn.textContent = '复制失败';
        setTimeout(() => { btn.textContent = '复制'; }, 1200);
      });
    });
    card.appendChild(btn);
  }

  // 每个公式卡挂一个可展开的真实魔方演示。
  // options.f2l：F2L 模式，只高亮教程角块+棱块 + 中心
  // options.oll / options.ocll：OLL 模式，高亮所有带顶色（黄）的角/棱
  // options.pll：PLL 模式，同样高亮顶层全部 8 个黄块（角+棱）
  // options.cross：Cross 模式，高亮四条白棱
  // options.lblMid：层先法中层，高亮中心 + 底白棱 + 当前要插/取的非黄棱
  // options.focusIds / maxFocus：可选覆盖
  // options.start / options.startCubies / options.script：覆盖自动生成的演示
  // options.faceFront：覆盖默认朝向处理
  function attachDemo(card, movesText, options) {
    if (!window.CubeAnim || !CubeAnim.demoFromAlgo) return;
    options = options || {};

    const isF2L = !!options.f2l;
    const isOLL = !!(options.oll || options.ocll);
    const isPLL = !!options.pll;
    const isCross = !!options.cross;
    const isLBLMid = !!options.lblMid;
    const hasOverride = !!(options.start || options.startCubies || options.script);
    const demo = hasOverride
      ? {
          start: options.start || null,
          startCubies: options.startCubies || null,
          script: options.script || [],
          focusIds: options.focusIds || null,
          supported: true,
          faceFrontDone: options.faceFront === false
        }
      : ((isF2L && CubeAnim.demoFromAlgoF2L)
        ? CubeAnim.demoFromAlgoF2L(movesText)
        : ((isPLL && CubeAnim.demoFromAlgoPLL)
          ? CubeAnim.demoFromAlgoPLL(movesText)
          : CubeAnim.demoFromAlgo(movesText)));
    const wrap = document.createElement('div');
    wrap.className = 'card-demo';
    wrap.style.width = '100%';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'demo-toggle-btn';
    if (!demo.supported) {
      btn.textContent = '暂无动画';
      btn.disabled = true;
      btn.title = '该公式含暂不支持的记号';
      wrap.appendChild(btn);
      card.appendChild(wrap);
      return;
    }

    btn.textContent = '▶ 演示';
    const panel = document.createElement('div');
    panel.className = 'card-demo-panel';
    panel.hidden = true;
    const host = document.createElement('div');
    host.className = 'card-demo-host';
    panel.appendChild(host);

    let mounted = false;
    btn.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      btn.textContent = open ? '收起演示' : '▶ 演示';
      btn.classList.toggle('open', open);
      if (open && !mounted) {
        mounted = true;
        let focusIds = options.focusIds || demo.focusIds || null;
        const startCubies = demo.startCubies
          || (demo.start ? CubeAnim.cubiesFromFaces(demo.start) : null);
        // OLL / PLL：未显式传入 focus 时，按顶层黄块锁定（8 个角+棱）
        if (!focusIds && (isOLL || isPLL) && CubeAnim.pickOLLFocusIds && startCubies) {
          focusIds = Array.from(CubeAnim.pickOLLFocusIds(startCubies));
        }
        // 层先法中层：中心 + 底白棱 + 当前非黄目标棱
        if (!focusIds && isLBLMid && CubeAnim.pickLBLMidFocusIds && startCubies) {
          focusIds = Array.from(CubeAnim.pickLBLMidFocusIds(startCubies));
        }
        let defaultIntro = `彩色=关键块（背面关键色虚线标出），黑色=其它块；颜色全程锁定。公式：${movesText}`;
        if (isPLL) {
          defaultIntro = `彩色=顶层全部角块+棱块（目标：顶层排列归位；背面关键色虚线标出），中心色=方位参考，黑色=其它块。公式：${movesText}`;
        } else if (isOLL) {
          defaultIntro = `彩色=所有带黄色的顶层角/棱（目标：顶面全黄；背面黄块虚线标出），中心色=方位参考，黑色=其它块。公式：${movesText}`;
        } else if (isCross) {
          defaultIntro = `彩色=四条白棱（目标：底面白十字 + 侧色对齐；背面关键色虚线标出），中心色=方位参考，黑色=其它块。公式：${movesText}`;
        } else if (isF2L) {
          defaultIntro = `彩色=本公式的角块+棱块（背面关键色虚线标出），中心色=方位参考，黑色=其它块。公式：${movesText}`;
        } else if (isLBLMid) {
          defaultIntro = `彩色=各中心 + 底白棱 + 目标槽底角 + 当前要插/取的中层棱（背面关键色虚线标出），黑色=其它块。公式：${movesText}`;
        }
        const faceFront = (typeof options.faceFront === 'boolean')
          ? options.faceFront
          : (demo.faceFrontDone ? false : true);
        CubeAnim.renderPlayer(host, {
          intro: options.intro || defaultIntro,
          start: demo.start,
          startCubies: demo.startCubies || null,
          script: demo.script,
          turnDuration: 420,
          settleDelay: 90,
          teaching: true,
          f2l: isF2L,
          oll: isOLL,
          ocll: !!options.ocll,
          pll: isPLL,
          cross: isCross,
          lblMid: isLBLMid,
          focusIds: focusIds,
          maxFocus: options.maxFocus,
          faceFront: faceFront
        });
      }
    });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    card.appendChild(wrap);
  }

  function wireSearch(input, getCards, countEl) {
    function apply() {
      const q = input.value.trim().toLowerCase();
      let visible = 0;
      getCards().forEach(c => {
        const hay = (c.getAttribute('data-search') || '').toLowerCase();
        const show = !q || hay.includes(q);
        c.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      document.querySelectorAll('[data-group-block]').forEach(block => {
        const anyVisible = block.querySelector('.algo-card:not([style*="display: none"])');
        block.style.display = anyVisible ? '' : 'none';
      });
      if (countEl) countEl.textContent = q ? `匹配 ${visible} 个` : '';
    }
    input.addEventListener('input', apply);
    apply();
  }

  window.CubeUI = { copyText, attachCopy, attachDemo, wireSearch };
})();
