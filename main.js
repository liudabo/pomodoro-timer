/**
 * main.js — Electron 主进程
 * ========================
 * 主进程负责管理应用的生命周期、创建窗口、处理系统级操作。
 * 渲染进程（前端页面）无法直接调用系统 API，需要通过 IPC
 * （进程间通信）委托主进程来完成，比如发送桌面通知。
 */

// ---- 模块引入 ----
// app           : 控制整个应用的生命周期（启动、退出、激活等）
// BrowserWindow : 创建和管理浏览器窗口（每个窗口是一个渲染进程）
// ipcMain       : 主进程端的 IPC 模块，用于接收渲染进程发来的消息
// Notification  : 发送系统原生桌面通知
// path          : Node.js 内置模块，用于拼接文件路径（跨平台兼容）
const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

// ---- 全局变量 ----
// 持有窗口对象的引用，防止被垃圾回收（GC）后窗口消失
let mainWindow;

// ---- 创建主窗口 ----
function createWindow() {
  // 实例化一个浏览器窗口，配置如下：
  mainWindow = new BrowserWindow({
    // 窗口尺寸：400×520 像素，适配番茄钟圆形界面的布局
    width: 400,
    height: 520,

    // 禁止调整窗口大小，保持界面布局稳定
    resizable: false,

    // 窗口在屏幕中央显示
    center: true,

    // macOS 中标题栏显示的应用标题
    title: '番茄钟',

    // webPreferences：控制渲染进程的安全和功能选项
    webPreferences: {
      // preload：预加载脚本路径，在渲染进程加载前执行
      // 通过 contextBridge 安全地向渲染进程暴露有限的 API
      preload: path.join(__dirname, 'preload.js'),

      // 开启上下文隔离（Electron 安全最佳实践）
      // 将 preload 脚本和网页的运行环境分开，防止网页直接访问 Node.js API
      contextIsolation: true,

      // 关闭 Node.js 集成（安全最佳实践）
      // 网页代码无法直接使用 require / process 等 Node.js 的能力
      nodeIntegration: false
    }
  });

  // 加载渲染进程的 HTML 页面（番茄钟的主界面）
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 隐藏菜单栏，让界面更简洁。macOS 上菜单栏由系统统一管理
  mainWindow.setMenuBarVisibility(false);
}

// ---- IPC 通信：系统通知 ----
// 注册一个 IPC handler，监听渲染进程发来的 'show-notification' 请求
// 当计时器归零时，渲染进程会调用此接口发送桌面通知
ipcMain.handle('show-notification', (event, { title, body }) => {
  // 检查当前系统是否支持桌面通知（macOS / Windows / Linux 均支持）
  if (Notification.isSupported()) {
    // 创建系统原生通知
    const notification = new Notification({
      title,             // 通知标题，如 "番茄钟"
      body,              // 通知正文，如 "工作结束！休息一下吧 🍅"
      silent: true       // 静默模式：不播放系统默认提示音
                         // 因为提示音已经由渲染进程通过 Web Audio API 自行播放
    });

    // 弹出通知
    notification.show();

    // 返回 true 告知渲染进程通知已成功发送
    return true;
  }

  // 系统不支持通知时返回 false
  return false;
});

// ---- 应用生命周期 ----

// app.whenReady() 返回一个 Promise，在 Electron 初始化完成后 resolve
// 这是创建窗口的最佳时机，确保所有底层 API 都已就绪
app.whenReady().then(createWindow);

// 监听 "所有窗口已关闭" 事件
// macOS 上通常不会触发此事件（因为应用常驻 Dock），但在 Windows / Linux 上会触发
// 收到后直接退出应用，释放资源
app.on('window-all-closed', () => {
  app.quit();
});

// 监听 "应用激活" 事件（仅 macOS 有效）
// 当用户点击 Dock 图标且没有窗口时，重新创建一个窗口
// 这是 macOS 应用的标准行为
app.on('activate', () => {
  // 检查当前是否还有存活的窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
