# Icon Hands

参考 [IconBreeze](https://github.com/yellowplushq/IconBreeze) 的圆角矩形图标漂浮效果做的 Web 版：
用摄像头检测手掌（不展示画面），**掌心面向屏幕时图标向手掌聚集，手掌消失时图标带物理效果落下**。

**线上地址**：https://icon-hands.yellowplus.workers.dev

## 运行

```bash
npm install
npm run dev
```

打开 http://localhost:5173 并允许使用摄像头。

## 部署

Cloudflare Workers 静态资源（配置见 `wrangler.jsonc`）：

```bash
npm run build
npx wrangler deploy
```

## 玩法

- 🖐 张开手掌、掌心对着屏幕 → 图标向手掌位置聚集悬浮（跟随手移动）
- 把手拿开 / 握拳 / 手背对屏幕 → 图标受重力落下，在地面弹跳、堆叠
- 没有摄像头时，按住鼠标也能吸引图标
- 调试：`/?attract=0.5,0.4` 强制在指定归一化坐标聚集

## 技术

| 部分 | 实现 |
| --- | --- |
| 手掌检测 | [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) HandLandmarker（WASM/GPU，浏览器本地推理） |
| 掌心朝向 | 食指根/小指根相对手腕的叉积符号 + 左右手标签；张开程度用指尖-手腕距离判断 |
| 物理 | [matter.js](https://brm.io/matter-js/)：重力、碰撞堆叠、弹性；聚集时关闭重力，用弹簧力 + 切向环绕力 + 空气阻尼 |
| 图标 | [icon.museum](https://icon.museum/) 的真实 app 图标（已下载到 `public/icons/`），Canvas 圆角裁剪（22% 圆角）+ 烘焙阴影；图片加载前用渐变 + emoji 占位贴图 |

模型与 WASM 从 CDN 加载，首次打开需要联网。
