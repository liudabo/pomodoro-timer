// ---- 配置 ----
const WORK_TIME = 25 * 60;   // 25分钟（秒）
const BREAK_TIME = 5 * 60;   // 5分钟（秒）

// ---- 状态 ----
const STATE = { IDLE: 'idle', WORK: 'work', BREAK: 'break' };

let currentState = STATE.IDLE;
let remainingSeconds = WORK_TIME;
let timerInterval = null;
let cycleCount = 0;

// ---- DOM 元素 ----
const timeDisplay = document.getElementById('time-display');
const statusLabel = document.getElementById('status-label');
const progressRing = document.getElementById('progress-ring');
const cycleCountEl = document.getElementById('cycle-count');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnReset = document.getElementById('btn-reset');

// SVG 圆环总长度
const CIRCUMFERENCE = 2 * Math.PI * 125; // ≈ 785.4

// ---- 工具函数 ----
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(remainingSeconds);

  // 更新进度环
  const total = currentState === STATE.WORK ? WORK_TIME : BREAK_TIME;
  const progress = remainingSeconds / total;
  const offset = CIRCUMFERENCE * (1 - progress);
  progressRing.style.strokeDashoffset = offset;
}

function setStatus(text) {
  statusLabel.textContent = text;
}

// ---- 提示音 ----
function playAlarm() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // 三段急促滴滴声
  const beepTimes = [0, 0.2, 0.4, 0.8, 1.0, 1.2];

  beepTimes.forEach((time) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.3;

    osc.start(ctx.currentTime + time);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.15);
    osc.stop(ctx.currentTime + time + 0.15);
  });
}

// ---- 通知 ----
async function sendNotification(title, body) {
  try {
    await window.pomodoroAPI.showNotification(title, body);
  } catch (e) {
    // 如果 preload API 不可用（比如在浏览器中测试），忽略
    console.log('通知发送失败:', e);
  }
}

// ---- 计时器逻辑 ----
function startTimer() {
  if (currentState === STATE.IDLE) {
    currentState = STATE.WORK;
    remainingSeconds = WORK_TIME;
    setStatus('工作中');
    progressRing.classList.remove('break-mode');
  }

  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateDisplay();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      handleTimerEnd();
    }
  }, 1000);

  updateButtons();
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  updateButtons();
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  currentState = STATE.IDLE;
  remainingSeconds = WORK_TIME;
  cycleCount = 0;
  cycleCountEl.textContent = '0';
  setStatus('准备开始');
  progressRing.classList.remove('break-mode');
  updateDisplay();
  updateButtons();
}

function handleTimerEnd() {
  playAlarm();

  if (currentState === STATE.WORK) {
    cycleCount++;
    cycleCountEl.textContent = cycleCount;
    currentState = STATE.BREAK;
    remainingSeconds = BREAK_TIME;
    setStatus('休息中');
    progressRing.classList.add('break-mode');
    sendNotification('番茄钟', '工作结束！休息一下吧 🍅');
    updateDisplay();
    startTimer(); // 自动开始休息
  } else {
    currentState = STATE.IDLE;
    remainingSeconds = WORK_TIME;
    setStatus('准备开始');
    progressRing.classList.remove('break-mode');
    sendNotification('番茄钟', '休息结束！开始新的番茄吧');
    updateDisplay();
    updateButtons();
  }
}

function updateButtons() {
  const running = timerInterval !== null;

  btnStart.disabled = running;
  btnPause.disabled = !running;
  btnReset.disabled = currentState === STATE.IDLE && remainingSeconds === WORK_TIME && cycleCount === 0;
}

// ---- 事件绑定 ----
btnStart.addEventListener('click', startTimer);
btnPause.addEventListener('click', pauseTimer);
btnReset.addEventListener('click', resetTimer);

// ---- 初始化 ----
updateDisplay();
setStatus('准备开始');
