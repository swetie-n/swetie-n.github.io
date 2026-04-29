const EscapeRoom = {
  humanity: Number(localStorage.getItem("humanity")) || 100,
  timeLeft: Number(localStorage.getItem("timeLeft")) || 45 * 60,
  timerId: null,
  soundOn: true,
  audioCtx: null,
  gameOverShown: false,
  sounds: {},

  init() {
    this.loadSounds();
    this.updateHumanity();
    this.updateTimer();
    this.startTimer();
    this.bindMouse();
    this.prepareAudioUnlock();
  },

  loadSounds() {
    const map = {
      success: "sounds/success.mp3",
      crack: "sounds/crack.mp3",
      glitch: "sounds/glitch.mp3",
      slam: "sounds/slam.mp3",
      door: "sounds/door.mp3",
      warm: "sounds/warm.mp3",
      ember: "sounds/ember.mp3"
    };

    Object.entries(map).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      this.sounds[key] = audio;
    });
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

  prepareAudioUnlock() {
    const unlock = () => {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      Object.values(this.sounds).forEach(audio => {
        audio.load();
      });

      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("touchstart", unlock);
    };

    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("touchstart", unlock);
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

    if (existing) {
      existing.remove();
    }

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
    window.location.href = "tram1.html";
  },

  tone(freq, duration, type = "sine", gain = 0.04) {
    if (!this.soundOn) return;

    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const osc = this.audioCtx.createOscillator();
    const amp = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;

    osc.connect(amp);
    amp.connect(this.audioCtx.destination);

    osc.start();

    amp.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioCtx.currentTime + duration
    );

    osc.stop(this.audioCtx.currentTime + duration);
  },

  playSound(kind) {
    if (!this.soundOn) return;

    if (this.sounds[kind]) {
      const audio = this.sounds[kind].cloneNode();
      audio.volume = 0.45;
      audio.play().catch(() => {});

      return;
    }

    if (kind === "success") {
      this.tone(392, 0.12);
      setTimeout(() => this.tone(523, 0.16), 130);
      setTimeout(() => this.tone(659, 0.18), 280);
    }

    if (kind === "crack") {
      this.tone(900, 0.08, "square", 0.05);
      setTimeout(() => this.tone(170, 0.12, "sawtooth", 0.06), 80);
    }

    if (kind === "glitch") {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          this.tone(120 + Math.random() * 700, 0.05, "square", 0.025);
        }, i * 45);
      }
    }

    if (kind === "slam") {
      this.tone(55, 0.28, "sawtooth", 0.07);
    }

    if (kind === "drunk") {
      this.tone(180, 0.2, "triangle", 0.04);
      setTimeout(() => this.tone(130, 0.2, "triangle", 0.035), 150);
    }

    if (kind === "door") {
      this.tone(90, 0.2, "sawtooth", 0.035);
      setTimeout(() => this.tone(62, 0.22, "sawtooth", 0.03), 130);
    }

    if (kind === "wind") {
      this.tone(110, 0.5, "triangle", 0.018);
      setTimeout(() => this.tone(82, 0.6, "triangle", 0.014), 300);
    }

    if (kind === "warm") {
      this.tone(330, 0.12);
      setTimeout(() => this.tone(440, 0.16), 130);
    }

    if (kind === "ember") {
      this.tone(260, 0.1, "triangle", 0.035);
      setTimeout(() => this.tone(390, 0.12, "triangle", 0.03), 120);
    }
  }
};
