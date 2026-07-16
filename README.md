# 魔方 CFOP 完全教程

纯静态三阶魔方教程站：从入门**层先法**到速拧 **CFOP**（Cross / F2L / OLL / PLL）与**进阶提速**，带 3D 教学示意图、分步演示动画和 WCA 风格计时器。

**在线预览：** [https://zhuangchengzc.github.io/cube-tutorial/](https://zhuangchengzc.github.io/cube-tutorial/)

## 内容一览

| 页面 | 说明 |
|------|------|
| [index.html](index.html) | 首页：CFOP 介绍与学习路径 |
| [lbl.html](lbl.html) | 层先法七步入门 |
| [cross.html](cross.html) | ① Cross 底面十字 |
| [f2l.html](f2l.html) | ② F2L 前两层（41 公式） |
| [oll.html](oll.html) | ③ OLL 顶面朝向（57 公式） |
| [pll.html](pll.html) | ④ PLL 顶层排列（21 公式） |
| [advanced.html](advanced.html) | 进阶提速（Lookahead / 练习菜单） |
| [timer.html](timer.html) | 速拧计时器（打乱 + ao5/ao12） |

### 交互说明

- 每张公式卡顶部是 **3D 教学快照**（与演示就绪态一致：关键块上色，其余黑色）
- 点击 **▶ 演示** 播放真实转层动画
- 计时器：按住空格（手机按住大数字区）变绿后松开开始，完成后任意键/再点停止
- 成绩保存在浏览器 `localStorage`，刷新不丢

### 记号约定

- 面：`U D F B L R`（上、下、前、后、左、右）
- `'` = 逆时针 90°，`2` = 180°
- 默认白底黄顶（白 = D，黄 = U）

## 本地预览

无构建步骤，用任意静态服务器或直接打开 HTML 即可。

```bash
# 推荐：本地 HTTP 服务（避免部分浏览器 file:// 限制）
npx --yes serve .
# 或
python -m http.server 8080
```

浏览器打开提示的地址（例如 `http://localhost:3000` 或 `http://localhost:8080`）。

## 目录结构

```
.
├── index.html          # 首页
├── lbl.html            # 层先法
├── cross.html          # Cross
├── f2l.html            # F2L
├── oll.html            # OLL
├── pll.html            # PLL
├── advanced.html       # 进阶提速
├── timer.html          # 计时器
├── assets/
│   ├── style.css       # 全站样式
│   ├── cube.js         # 平面/示意图渲染
│   ├── cube-anim.js    # 3D cubie 动画与教学快照
│   └── ui.js           # 复制、演示按钮、搜索
└── data/
    ├── f2l.js          # F2L 41 公式数据
    ├── oll.js          # OLL 57 公式数据
    └── pll.js          # PLL 21 公式数据
```

## 部署到 GitHub Pages

本仓库已推送到 `main`。在 GitHub 上开启 Pages：

1. 打开仓库 **Settings → Pages**
2. **Source** 选 **Deploy from a branch**
3. **Branch** 选 `main`，目录选 `/ (root)`
4. 保存后等待 1～2 分钟

站点地址：

```
https://zhuangchengzc.github.io/cube-tutorial/
```

路径均为相对路径，适合放在项目子路径下访问。

## 技术说明

- 纯前端，无框架、无构建、无后端
- 魔方状态用 cubie 模型模拟，转层为刚体旋转投影到 SVG
- 教学模式：开场锁定关键块身份，播放过程颜色不串

## License

教程内容与代码可自由学习、修改与分享。公式为魔方社区通用公开算法，无专有版权主张。
