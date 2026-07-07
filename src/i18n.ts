/**
 * 轻量 i18n：按浏览器语言自动选择中/英，无外部依赖。
 */

const zh = {
  // HUD
  hudLoading: "正在加载手掌检测模型…",
  hudCameraRequest: "请允许使用摄像头…",
  hudCameraDenied: "无法访问摄像头 · 按住鼠标也能吸引校徽",
  hudError: "手势模型加载失败 · 按住鼠标也能吸引校徽",
  hudFlung: "💨 抛出！冷却中…",
  hudFist: "✊ 握拳 · 校徽挤压中",
  hudFacing: "✋ 检测到手掌 · 校徽聚集中",
  hudOpenPrompt: "🖐 把手掌张开、掌心面向屏幕",
  hudShowPalm: "🖐 将手掌对准摄像头，校徽会向它聚集",
  hint: "手掌移开后，校徽会重新落回地面",
  pageTitle: "Campus Seals · 手掌吸引校徽",

  // 调试面板
  debugTitle: "🐞 手掌检测调试",
  debugCollapse: "收起",
  debugToggle: "🐞 调试",
  debugCameraNotReady: "摄像头未就绪",
  debugShowIndicator: "常显手掌图标",
  debugDistance: "聚集距离",
  rowStatus: "跟踪状态",
  rowDetected: "检测到手",
  rowExtended: "伸展手指",
  rowOpen: "手掌张开",
  rowFacingCam: "掌心朝屏 (叉积)",
  rowHandedness: "左右手标签",
  rowGesture: "手势",
  rowVerdict: "综合判定",
  rowPalmPos: "掌心坐标",
  rowAttracting: "校徽聚集中",
  rowPalmSpeed: "手掌速度",
  rowHandCount: "检测手数",
  rowRepelling: "右手排斥",
  rowPoster: "定格画面",
  rowFlung: "甩出",
  yes: "是",
  no: "否",
  gestureOpen: "🖐 张开",
  gestureFist: "✊ 握拳",
  verdictAttract: "✋ 吸引",
  verdictSqueeze: "✊ 挤压",
  flungValue: "💨 已甩出",
};

const en: typeof zh = {
  // HUD
  hudLoading: "Loading hand tracking model…",
  hudCameraRequest: "Please allow camera access…",
  hudCameraDenied: "Camera unavailable · hold the mouse to attract seals",
  hudError: "Model failed to load · hold the mouse to attract seals",
  hudFlung: "💨 Thrown! Cooling down…",
  hudFist: "✊ Fist · squeezing seals",
  hudFacing: "✋ Palm detected · seals gathering",
  hudOpenPrompt: "🖐 Open your hand, palm facing the screen",
  hudShowPalm: "🖐 Show your palm to the camera to attract campus seals",
  hint: "Move your hand away and the seals fall back down",
  pageTitle: "Campus Seals · Palm-attracted emblems",

  // Debug panel
  debugTitle: "🐞 Hand tracking debug",
  debugCollapse: "Hide",
  debugToggle: "🐞 Debug",
  debugCameraNotReady: "Camera not ready",
  debugShowIndicator: "Always show palm icon",
  debugDistance: "Gather distance",
  rowStatus: "Tracking status",
  rowDetected: "Hand detected",
  rowExtended: "Extended fingers",
  rowOpen: "Palm open",
  rowFacingCam: "Facing screen (cross)",
  rowHandedness: "Handedness label",
  rowGesture: "Gesture",
  rowVerdict: "Verdict",
  rowPalmPos: "Palm position",
  rowAttracting: "Attracting seals",
  rowPalmSpeed: "Palm speed",
  rowHandCount: "Hands",
  rowRepelling: "Right-hand repel",
  rowPoster: "Freeze frame",
  rowFlung: "Thrown",
  yes: "Yes",
  no: "No",
  gestureOpen: "🖐 Open",
  gestureFist: "✊ Fist",
  verdictAttract: "✋ Attract",
  verdictSqueeze: "✊ Squeeze",
  flungValue: "💨 Thrown",
};

export type MessageKey = keyof typeof zh;

export const lang: "zh" | "en" =
  typeof navigator !== "undefined" &&
  navigator.language.toLowerCase().startsWith("zh")
    ? "zh"
    : "en";

const messages = lang === "zh" ? zh : en;

export function t(key: MessageKey): string {
  return messages[key];
}

/** 是/否 */
export function tBool(v: boolean): string {
  return v ? messages.yes : messages.no;
}
