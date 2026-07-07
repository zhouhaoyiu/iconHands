# 掌心校徽

一个手势驱动的高校校徽互动墙。浏览器用摄像头识别手掌，校徽会跟随掌心聚集、握拳成团，并在明确张手释放时散开。

本项目 fork 并改造自 hwangdev97/iconHands，保留对原作者交互创意的致敬。

线上地址：待部署到你的域名后填写。

## 功能

- 掌心跟随：检测到手后，校徽根据掌心坐标移动。
- 握拳成团：握拳时校徽收紧成球。
- 张手释放：只有在握拳后明确张手，校徽才会散开；检测不到手不会自动炸开。
- 双手玩法：屏幕左侧的手负责吸引和释放，屏幕右侧的手负责排斥。
- 掌心轨迹：移动时显示轻微轨迹光带。
- 定格反馈：张手释放时有短暂定格和散开效果。
- 调试面板：保留摄像头预览、手部骨架、手势状态、手数、排斥和定格状态。
- 鼠标兜底：没有摄像头或权限被拒绝时，按住鼠标也能吸引校徽。

## 运行

```bash
npm install
npm run dev
```

打开 http://localhost:5173 并允许使用摄像头。

调试吸引点：

```text
http://localhost:5173/?attract=0.5,0.4
```

## 部署

Cloudflare Workers 静态资源部署：

```bash
npm run build
npx wrangler deploy
```

## 技术

| 部分 | 实现 |
| --- | --- |
| 手掌检测 | `@mediapipe/tasks-vision` HandLandmarker，本地 WASM/GPU 推理，请求 1280x720 / 60fps 摄像头输入 |
| 双手判断 | 按镜像后的屏幕 x 坐标排序；左侧手吸引，右侧手排斥 |
| 手势判断 | 指尖到手腕距离判断张开程度；握拳后张手才触发释放 |
| 物理 | `matter-js`，重力、碰撞、弹簧吸引、环绕力、排斥力 |
| 校徽 | lovefc/china_school_badge 高校校徽字体图标库，Canvas 渲染为透明贴图 |
| 配色 | 当前可见前 96 所学校使用主校色表；其余学校使用稳妥 fallback 色 |

摄像头画面只在浏览器本地用于 MediaPipe 检测，不上传服务器。

## 第三方资源

- 高校校徽字体图标库：lovefc/china_school_badge
- 来源：https://github.com/lovefc/china_school_badge
- 许可：Apache-2.0
- 许可副本：`public/vendor/china_school_badge/LICENSE`
- 字体文件：`public/fonts/xiaohui.woff2`

## 致谢

- 原项目与手势交互创意：hwangdev97/iconHands
- 物理漂浮效果参考 IconBreeze：https://github.com/yellowplushq/IconBreeze
- 高校校徽字体图标来自 lovefc/china_school_badge
