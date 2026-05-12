const EscapeRoom = {
  humanity: Number(localStorage.getItem("humanity")) || 100,
  timeLeft: Number(localStorage.getItem("timeLeft")) || 15 * 60,
  timerId: null,
  soundOn: true,
  audioCtx: null,
  gameOverShown: false,

  init() {
    this.updateHumanity();
    this.updateTimer();
    this.startTimer();
    this.bindMouse();
    this.prepareAudioUnlock();
  },

  getAudioCtx() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    return this.audioCtx;
  },

  prepareAudioUnlock() {
    const unlock = () => {
      this.getAudioCtx();

      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("touchstart", unlock);
    };

    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("touchstart", unlock);
  },

  bindMouse() {
    document.addEventListener("mousemove", event => {
      const x = event.clientX / window.innerWidth - 0.5;
      document.documentElement.style.setProperty("--mx", x);

      const flashlight = document.getElementById("flashlight");

      if (flashlight) {
        flashlight.style.background =
          `radial-gradient(circle at ${event.clientX}px ${event.clientY}px,
          transparent 85px,
          rgba(0, 0, 0, 0.82) 210px)`;
      }
    });
  },

  say(text, targetId = "dialogue") {
    const el = document.getElementById(targetId);
    if (!el) return;

    el.textContent = "";
    clearInterval(el._typing);

    let i = 0;

    el._typing = setInterval(() => {
      el.textContent += text[i] || "";
      i++;

      if (i > text.length) {
        clearInterval(el._typing);
      }
    }, 16);
  },

  startTimer() {
    if (this.timerId) return;

    this.timerId = setInterval(() => {
      this.timeLeft--;

      if (this.timeLeft < 0) {
        this.timeLeft = 0;
      }

      localStorage.setItem("timeLeft", this.timeLeft);
      this.updateTimer();

      if (this.timeLeft <= 0) {
        this.showGameOver("Hết giờ. Làng Vũ Đại khép lại trong sương tối.");
      }
    }, 1000);
  },

  stopTimer() {
    if (!this.timerId) return;

    clearInterval(this.timerId);
    this.timerId = null;
  },

  updateTimer() {
    const timer = document.getElementById("timer");
    if (!timer) return;

    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;

    timer.textContent =
      `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    if (this.timeLeft < 5 * 60) {
      timer.classList.add("danger");
    } else {
      timer.classList.remove("danger");
    }
  },

  updateHumanity() {
    const fill = document.getElementById("humanityFill");
    if (!fill) return;

    this.humanity = Math.max(0, Math.min(100, this.humanity));
    fill.style.width = `${this.humanity}%`;

    fill.style.background =
      this.humanity > 45
        ? "linear-gradient(90deg, #1f6b45, #76d68e)"
        : "linear-gradient(90deg, #7d241e, #ff6f61)";
  },

  loseHumanity(amount = 15) {
    this.humanity = Math.max(0, this.humanity - amount);
    localStorage.setItem("humanity", this.humanity);
    this.updateHumanity();

    if (this.humanity <= 0) {
      this.showGameOver(
        "Thanh nhân tính đã cạn. Trò chơi bắt đầu lại từ chiếc lò gạch cũ."
      );
    }
  },

  gainHumanity(amount = 8) {
    this.humanity = Math.min(100, this.humanity + amount);
    localStorage.setItem("humanity", this.humanity);
    this.updateHumanity();
  },

  saveStation(number) {
    localStorage.setItem(`tram${number}`, "done");
    localStorage.setItem("humanity", this.humanity);
    localStorage.setItem("timeLeft", this.timeLeft);
  },

  breakLock(id) {
    const lock = document.getElementById(id);
    if (!lock) return;

    lock.classList.add("broken");
    lock.textContent = "🔓";
  },

  openGate(id = "gate") {
    const gate = document.getElementById(id);
    if (!gate) return;

    gate.classList.remove("locked");
    gate.classList.add("open");
  },

  flash(id, ms = 800) {
    const el = document.getElementById(id);
    if (!el) return;

    el.style.display = "block";

    setTimeout(() => {
      el.style.display = "none";
    }, ms);
  },

  flashScreen() {
    this.flash("flash", 180);
  },

  penalty(type = "glitch", humanityLoss = 0) {
    this.playSound(type);

    if (humanityLoss > 0) {
      this.loseHumanity(humanityLoss);
    }

    if (this.gameOverShown) return;

    if (type === "crack") {
      this.flash("crack", 800);
      return;
    }

    if (type === "glitch") {
      this.flash("glitch", 850);
      return;
    }

    if (type === "slam") {
      this.flash("slam", 500);
      return;
    }

    if (type === "drunk") {
      document.body.classList.add("drunk");

      setTimeout(() => {
        document.body.classList.remove("drunk");
      }, 2500);
    }
  },

  checkStationCode({
    pickedCode,
    inputCode,
    correctCode,
    stationNumber,
    lockId,
    gateId,
    explainIds = [],
    successMessage,
    wrongMessage,
    onSuccess
  }) {
    if (this.gameOverShown) return;

    this.playSound("submit");

    if (pickedCode.length < 2) {
      this.say("Bạn chưa chọn đủ 2 đáp án. Hãy đọc kĩ cả hai câu hỏi.");
      this.penalty("glitch", 5);
      return;
    }

    if (inputCode.length < 2) {
      this.say("Bạn đã chọn đáp án rồi, nhưng chưa nhập mã vượt trạm.");
      this.penalty("glitch", 5);
      return;
    }

    if (inputCode !== pickedCode) {
      this.say(
        `Mã nhập chưa khớp với lựa chọn. Bạn đã chọn ${pickedCode}, nhưng nhập ${inputCode}.`
      );
      this.penalty("crack", 8);
      return;
    }

    if (inputCode !== correctCode) {
      this.say(wrongMessage || "Mã chưa đúng. Hãy xem lại đáp án.");
      this.penalty("glitch", 15);
      return;
    }

    explainIds.forEach(id => {
      const explain = document.getElementById(id);

      if (explain) {
        explain.classList.remove("hidden");
      }
    });

    this.say(successMessage || "Chính xác. Cánh cổng đã mở.");
    this.gainHumanity(8);
    this.saveStation(stationNumber);
    this.breakLock(lockId);
    this.openGate(gateId);
    this.playSound("success");
    this.playSound("door");

    if (typeof onSuccess === "function") {
      onSuccess();
    }
  },

  showGameOver(message) {
    if (this.gameOverShown) return;

    this.gameOverShown = true;
    this.stopTimer();
    this.playSound("glitch");

    const existing = document.getElementById("gameOverPanel");
    if (existing) existing.remove();

    const panel = document.createElement("section");
    panel.id = "gameOverPanel";
    panel.className = "game-over-panel";

    panel.innerHTML = `
      <div class="game-over-card">
        <h1>Trò chơi khép lại</h1>
        <p>${message}</p>
        <button class="main-btn" type="button" id="restartFromGameOver">
          Bắt đầu lại
        </button>
      </div>
    `;

    document.body.appendChild(panel);

    const restartBtn = document.getElementById("restartFromGameOver");

    restartBtn.addEventListener("click", () => {
      this.restart();
    });

    setTimeout(() => {
      this.restart();
    }, 3500);
  },

  restart() {
    localStorage.clear();
    window.location.href = "escaperoom.html";
  },

  tone(freq, duration, type = "sine", gain = 0.08) {
    if (!this.soundOn) return;

    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    amp.gain.setValueAtTime(0.001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(amp);
    amp.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.03);
  },

  sweep(startFreq, endFreq, duration, type = "sine", gain = 0.08) {
    if (!this.soundOn) return;

    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    amp.gain.setValueAtTime(0.001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(amp);
    amp.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.03);
  },

  noise(duration = 0.2, gain = 0.16, filterType = "lowpass", frequency = 1200) {
    if (!this.soundOn) return;

    const ctx = this.getAudioCtx();
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const source = ctx.createBufferSource();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.value = frequency;

    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);

    source.start();
  },

  echoPing({
    startFreq = 900,
    endFreq = 430,
    duration = 1.25,
    gain = 0.22,
    delayTime = 0.25,
    feedbackGain = 0.38
  } = {}) {
    if (!this.soundOn) return;

    const ctx = this.getAudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const delay = ctx.createDelay();
    const feedback = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.35);

    amp.gain.setValueAtTime(0.001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.001, now + duration);

    delay.delayTime.value = delayTime;
    feedback.gain.value = feedbackGain;

    filter.type = "lowpass";
    filter.frequency.value = 2000;

    osc.connect(amp);
    amp.connect(filter);
    filter.connect(ctx.destination);

    amp.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(filter);

    osc.start(now);
    osc.stop(now + duration + 0.1);
  },

  playSound(kind) {
    if (!this.soundOn) return;

    if (kind === "success") {
      this.tone(392, 0.12, "triangle", 0.09);
      setTimeout(() => this.tone(523, 0.16, "triangle", 0.08), 130);
      setTimeout(() => this.tone(659, 0.18, "triangle", 0.075), 280);
      return;
    }

    if (kind === "crack") {
      this.noise(0.13, 0.15, "highpass", 900);
      setTimeout(() => this.sweep(900, 170, 0.12, "sawtooth", 0.07), 70);
      return;
    }

    if (kind === "glitch") {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          this.tone(120 + Math.random() * 700, 0.05, "square", 0.03);
        }, i * 45);
      }
      return;
    }

    if (kind === "slam") {
      this.noise(0.18, 0.25, "lowpass", 900);
      setTimeout(() => this.sweep(90, 45, 0.28, "sawtooth", 0.11), 25);
      return;
    }

    if (kind === "drunk") {
      this.tone(180, 0.2, "triangle", 0.055);
      setTimeout(() => this.tone(130, 0.2, "triangle", 0.045), 150);
      return;
    }

    if (kind === "door") {
      this.echoPing({
        startFreq: 520,
        endFreq: 90,
        duration: 1.1,
        gain: 0.16,
        delayTime: 0.22,
        feedbackGain: 0.32
      });
      return;
    }

    if (kind === "wind") {
      this.sweep(140, 75, 0.7, "triangle", 0.025);
      setTimeout(() => this.sweep(110, 60, 0.8, "triangle", 0.018), 280);
      return;
    }

    if (kind === "warm") {
      this.tone(330, 0.14, "sine", 0.07);
      setTimeout(() => this.tone(440, 0.18, "sine", 0.065), 130);
      setTimeout(() => this.tone(550, 0.2, "sine", 0.055), 280);
      return;
    }

    if (kind === "ember") {
      this.tone(260, 0.1, "triangle", 0.05);
      setTimeout(() => this.echoPing({
        startFreq: 760,
        endFreq: 380,
        duration: 1.25,
        gain: 0.15,
        delayTime: 0.28,
        feedbackGain: 0.4
      }), 90);
      return;
    }

    if (kind === "select") {
      this.tone(880, 0.09, "triangle", 0.06);
      return;
    }

    if (kind === "submit") {
      this.sweep(320, 120, 0.25, "sawtooth", 0.07);
      return;
    }

    if (kind === "error") {
      this.tone(170, 0.14, "square", 0.08);
      setTimeout(() => this.tone(120, 0.18, "square", 0.06), 120);
      return;
    }

    if (kind === "unlock") {
      this.echoPing();
      return;
    }

    if (kind === "splash") {
      this.noise(0.18, 0.11, "bandpass", 700);
      setTimeout(() => this.noise(0.12, 0.075, "bandpass", 1100), 80);
      setTimeout(() => this.tone(180, 0.12, "sine", 0.035), 40);
      return;
    }
	if (kind === "dog") {
  this.sweep(320, 130, 0.18, "sawtooth", 0.08);
  setTimeout(() => this.sweep(280, 110, 0.16, "sawtooth", 0.07), 220);
  return;
}

if (kind === "curse") {
  this.sweep(170, 95, 0.22, "sawtooth", 0.055);
  setTimeout(() => this.sweep(210, 120, 0.18, "square", 0.04), 180);
  setTimeout(() => this.noise(0.12, 0.05, "bandpass", 650), 260);
  return;
}

if (kind === "bird") {
  this.tone(1400, 0.08, "sine", 0.035);
  setTimeout(() => this.tone(1850, 0.07, "sine", 0.03), 90);
  setTimeout(() => this.tone(1650, 0.09, "sine", 0.028), 180);
  return;
}

if (kind === "paddle") {
  this.noise(0.09, 0.055, "bandpass", 420);
  setTimeout(() => this.noise(0.08, 0.04, "bandpass", 300), 260);
  return;
}
    this.tone(440, 0.15);
  }
};

/* ======================================================
   MOBILE QUIZ AUTO FIX
   Tự xử lí khi #quizPanel mở/đóng ở các trạm
   ====================================================== */

(function setupMobileQuizFix() {
  function initMobileQuizFix() {
    const quizPanel = document.getElementById("quizPanel");
    if (!quizPanel) return;

    const syncQuizState = () => {
      const isOpen =
        !quizPanel.classList.contains("hidden") &&
        quizPanel.getAttribute("aria-hidden") !== "true";

      document.body.classList.toggle("quiz-open", isOpen);

      if (isOpen) {
        const card = quizPanel.querySelector(".quiz-side-card");

        requestAnimationFrame(() => {
          if (card) card.scrollTop = 0;
        });
      }
    };

    const observer = new MutationObserver(syncQuizState);

    observer.observe(quizPanel, {
      attributes: true,
      attributeFilter: ["class", "aria-hidden"]
    });

    syncQuizState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileQuizFix);
  } else {
    initMobileQuizFix();
  }
})();
