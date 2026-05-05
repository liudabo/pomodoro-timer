# CLAUDE.md — Pomodoro Timer (番茄钟)

Electron 桌面番茄钟应用，支持 25 分钟工作 + 5 分钟休息的循环计时。

## 技术栈

- **运行时**: Electron ^41.x
- **语言**: JavaScript (CommonJS, 无构建工具)
- **平台**: macOS / Windows / Linux 桌面端

## 项目结构

```
├── main.js          # Electron 主进程 — 窗口管理 + 系统通知
├── preload.js       # 预加载脚本 — 通过 contextBridge 暴露安全 API
├── renderer/
│   ├── index.html   # 主界面 (纯 HTML)
│   ├── timer.js     # 计时器逻辑 + 提示音 + UI 更新
│   └── style.css    # 样式 (深色主题)
└── package.json     # 入口: "main": "main.js", 启动: npm start
```

## 运行方式

```bash
npm start          # 启动 Electron 应用 (等同于 electron .)
```

## 架构要点

### 进程模型

| 进程 | 文件 | 职责 |
|------|------|------|
| 主进程 | `main.js` | 创建 BrowserWindow (400×520, 不可调整大小), IPC 处理, 系统通知 |
| 预加载 | `preload.js` | contextBridge 暴露 `window.pomodoroAPI.showNotification()` |
| 渲染进程 | `renderer/*` | 番茄钟 UI, 计时逻辑, Web Audio 提示音 |

### IPC 通信

- 渲染进程 → `window.pomodoroAPI.showNotification(title, body)` → 主进程 `ipcMain.handle('show-notification', ...)` → 系统原生 Notification
- 启用了 `contextIsolation: true` 和 `nodeIntegration: false`，遵循 Electron 安全最佳实践

### 计时器状态机

三种状态 (`renderer/timer.js`):
- `IDLE` → 点击"开始" → `WORK` (25分钟倒计时)
- `WORK` → 归零 → 播放提示音 + 通知 → `BREAK` (5分钟, 自动开始)
- `BREAK` → 归零 → 播放提示音 + 通知 → `IDLE` (等待手动开始)

### SVG 进度环

使用 SVG circle + `stroke-dasharray`/`stroke-dashoffset` 实现圆形倒计时动画。工作模式暖金色 (#E6C88B)，休息模式浅绿色 (#A8CBBF)。

### 提示音

通过 Web Audio API (`AudioContext`) 生成三段急促 880Hz 正弦波，不依赖外部音频文件。
