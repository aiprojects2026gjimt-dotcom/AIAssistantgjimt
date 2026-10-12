
"use strict";

/* ==========================================
   GJIMT NOOR - GUEST WELCOME
   Female Voice + Automatic Welcome
   Three Guests + Continuous Slideshow
========================================== */

const guests = [
  {
    name: "Captain Mantej Singh Cheema",
    honorific: "Sir",
    designation: "Assistant Director of Youth Services",
    organization: ""
  },
  {
    name: "J.S. Bedi",
      honorific: "Sir",
    designation: "Chairman",
    organization: "Gian Jyoti Institute of Management and Technology"
  },
  {
    name: "Dr. Aneet Bedi",
      honorific: "Mam",
    designation: "Director",
    organization: "Gian Jyoti Institute of Management and Technology"
  }
];

const slides = [
  ...document.querySelectorAll(".guest-slide")
];

const halo = document.querySelector(".halo");
const line = document.getElementById("line");
const alertBox = document.getElementById("guestAlert");
const progress = document.getElementById("guestProgress");

const MIN_SLIDE_MS = 18000;
const VOICE_WAIT_MS = 3500;

let current = 0;
let token = 0;
let slideStart = 0;
let slideTimer = null;
let voiceWaitTimer = null;
let chunkWatchdog = null;

let ctx = null;
let musicTimer = null;

let noorStopped = false;
let audioEnabled = true;
let activeUtterance = null;
let speechStarted = false;
let speechBlocked = false;

/* ==========================================
   FEMALE VOICE SELECTION
========================================== */

function preferredVoice() {
  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices = speechSynthesis.getVoices();

  if (!voices.length) return null;

  const femaleNames = [
    "Microsoft Neerja",
    "Microsoft Heera",
    "Microsoft Swara",
    "Google हिन्दी",
    "Google Hindi",
    "Veena",
    "Lekha",
    "Samantha",
    "Karen",
    "Moira",
    "Tessa",
    "Microsoft Zira"
  ];

  for (const name of femaleNames) {
    const voice = voices.find(v =>
      v.name.toLowerCase().includes(
        name.toLowerCase()
      )
    );

    if (voice) return voice;
  }

  return voices.find(v =>
    /female|woman/i.test(v.name)
  ) || null;
}

/* ==========================================
   LOAD VOICES BEFORE SPEAKING
========================================== */

function waitForFemaleVoice(callback, id) {
  clearTimeout(voiceWaitTimer);

  const startedAt = Date.now();

  function check() {
    if (id !== token || noorStopped) return;

    const voice = preferredVoice();

    if (voice) {
      callback(voice);
      return;
    }

    if (
      Date.now() - startedAt >= VOICE_WAIT_MS
    ) {
      callback(null);
      return;
    }

    voiceWaitTimer = setTimeout(check, 200);
  }

  if ("speechSynthesis" in window) {
    speechSynthesis.getVoices();
  }

  check();
}

/* ==========================================
   NOOR PRONUNCIATION
========================================== */

function sayable(text) {
  return String(text)
    .replace(/GJIMT/gi, "G J I M T")
    .replace(/Gian Jyoti/gi, "Gyaan Jyoti")
    .replace(/Sat Shri Akal/gi, "Sat Shree Akaal")
    .replace(/Sat Sri Akal/gi, "Sat Shree Akaal");
}

/* ==========================================
   GUEST WELCOME MESSAGES
========================================== */

function welcomeParts(guest) {
  let fullDesignation = guest.designation;

  if (guest.organization) {
    fullDesignation +=
      " of " + guest.organization;
  }

  return [
    "Sat Shri Akal!",

    "I am NOOR, G J I M T AI Assistant.",

    "NOOR warmly welcomes " +
      guest.name + ".",

    guest.name +
      " is " + fullDesignation + ".",

    "Welcome to the Gian Jyoti Blood Donation Camp.",

    "Thank you for your presence and support."
  ];
}

/* ==========================================
   BACKGROUND MUSIC
========================================== */

function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

function startMusic() {
  if (
    noorStopped ||
    !audioEnabled ||
    !ctx ||
    ctx.state !== "running" ||
    musicTimer
  ) return;

  let n = 0;

  const chords = [
    [261.63, 329.63, 392],
    [293.66, 369.99, 440],
    [329.63, 392, 493.88]
  ];

  function play() {
    if (
      !ctx ||
      ctx.state !== "running" ||
      noorStopped
    ) return;

    const t = ctx.currentTime + 0.03;

    for (
      const [j, frequency] of
      chords[n++ % chords.length].entries()
    ) {
      const oscillator =
        ctx.createOscillator();

      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value =
        frequency;

      gain.gain.setValueAtTime(
        0.0001,
        t + j * 0.06
      );

      gain.gain.exponentialRampToValueAtTime(
        0.015,
        t + j * 0.06 + 0.18
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        t + j * 0.06 + 3
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(t + j * 0.06);
      oscillator.stop(t + j * 0.06 + 3.05);
    }
  }

  play();
  musicTimer = setInterval(play, 3300);
}

function tryMusic() {
  if (noorStopped || !audioEnabled) return;

  try {
    const AudioClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioClass) return;

    ctx = ctx || new AudioClass();

    if (ctx.state === "suspended") {
      ctx.resume()
        .then(startMusic)
        .catch(() => {});
    } else {
      startMusic();
    }

  } catch (error) {
    console.warn(
      "NOOR music permission:",
      error
    );
  }
}

/* ==========================================
   CLEAR SPEECH SAFELY
========================================== */

function clearSpeech() {
  clearTimeout(chunkWatchdog);
  clearTimeout(voiceWaitTimer);

  chunkWatchdog = null;
  voiceWaitTimer = null;
  activeUtterance = null;
  speechStarted = false;

  if ("speechSynthesis" in window) {
    try {
      speechSynthesis.cancel();
    } catch (error) {}
  }

  halo?.classList.remove("talking");
}

/* ==========================================
   NEXT GUEST SLIDE
========================================== */

function scheduleNext(id) {
  clearTimeout(slideTimer);

  const remaining = Math.max(
    1300,
    MIN_SLIDE_MS -
      (Date.now() - slideStart)
  );

  slideTimer = setTimeout(() => {
    if (id === token) {
      show((current + 1) % guests.length);
    }
  }, remaining);
}

/* ==========================================
   NOOR SPEECH ENGINE
========================================== */

function speak(id) {
  const guest = guests[current];
  const parts = welcomeParts(guest);

  if (line) {
    line.textContent = parts.join(" ");
  }

  if (alertBox) {
    alertBox.textContent =
      "♥ NOOR welcomes " +
      guest.name + "!";
  }

  stopMusic();

  if (
    noorStopped ||
    !audioEnabled ||
    !("speechSynthesis" in window)
  ) {
    scheduleNext(id);
    return;
  }

  let partIndex = 0;
  let complete = false;

  function finish() {
    if (complete || id !== token) return;

    complete = true;

    clearTimeout(chunkWatchdog);

    halo?.classList.remove("talking");

    tryMusic();
    scheduleNext(id);
  }

  function nextPart(voice) {
    if (
      id !== token ||
      noorStopped ||
      complete
    ) return;

    clearTimeout(chunkWatchdog);

    if (partIndex >= parts.length) {
      finish();
      return;
    }

    const text =
      sayable(parts[partIndex++]);

    // Only ONE utterance is created.
    const utterance =
      new SpeechSynthesisUtterance(text);

    activeUtterance = utterance;

    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.10;
    utterance.volume = 1;

    let settled = false;

    function advance() {
      if (
        settled ||
        id !== token ||
        complete
      ) return;

      settled = true;
      clearTimeout(chunkWatchdog);

      nextPart(voice);
    }

    utterance.onstart = () => {
      if (id !== token) return;

      speechStarted = true;
      speechBlocked = false;

      halo?.classList.add("talking");
    };

    utterance.onend = advance;

    utterance.onerror = event => {
      if (id !== token) return;

      console.warn(
        "NOOR speech error:",
        event.error
      );

      if (
        event.error === "not-allowed" ||
        event.error === "audio-busy"
      ) {
        speechBlocked = true;

        if (alertBox) {
          alertBox.textContent =
            "♥ Welcome " +
            guest.name +
            " • Tap Repeat / Resume NOOR to enable sound";
        }

        finish();
        return;
      }

      if (
        event.error === "canceled" ||
        event.error === "interrupted"
      ) {
        return;
      }

      advance();
    };

    // Prevent speech from stalling forever.
    chunkWatchdog = setTimeout(() => {
      if (
        id !== token ||
        settled ||
        complete
      ) return;

      if (!speechStarted) {
        speechBlocked = true;

        if (alertBox) {
          alertBox.textContent =
            "Tap Repeat / Resume NOOR to enable voice";
        }

        finish();
        return;
      }

      try {
        speechSynthesis.cancel();
      } catch (error) {}

      advance();
    }, 35000);

    try {
      speechSynthesis.resume();
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn(error);
      advance();
    }
  }

  waitForFemaleVoice(voice => {
    if (id !== token || noorStopped) return;

    if (!voice) {
      if (alertBox) {
        alertBox.textContent =
          "Female NOOR voice not available on this device";
      }

      console.warn(
        "No recognized female speech voice is installed."
      );

      finish();
      return;
    }

    try {
      speechSynthesis.cancel();
      speechSynthesis.resume();
    } catch (error) {}

    nextPart(voice);
  }, id);
}

/* ==========================================
   DISPLAY GUEST SLIDE
========================================== */

function show(index) {
  current =
    (index + guests.length) %
    guests.length;

  token++;
  slideStart = Date.now();

  clearTimeout(slideTimer);
  clearSpeech();
  stopMusic();

  slides.forEach((slide, i) => {
    slide.classList.toggle(
      "active",
      i === current
    );

    slide.setAttribute(
      "aria-hidden",
      String(i !== current)
    );
  });

  if (progress) {
    progress.textContent =
      `Guest ${current + 1} of ${guests.length}`;
  }

  speak(token);
}

/* ==========================================
   REPEAT / RESUME NOOR
========================================== */

function resumeNoor() {
  noorStopped = false;
  audioEnabled = true;
  speechBlocked = false;

  if ("speechSynthesis" in window) {
    try {
      speechSynthesis.cancel();
      speechSynthesis.resume();
      speechSynthesis.getVoices();
    } catch (error) {}
  }

  tryMusic();
  show(current);
}

/* ==========================================
   PREVIOUS GUEST
========================================== */

document.getElementById("prevGuest")
  ?.addEventListener("click", () => {
    show(current - 1);
  });

/* ==========================================
   NEXT GUEST
========================================== */

document.getElementById("nextGuest")
  ?.addEventListener("click", () => {
    show(current + 1);
  });

/* ==========================================
   REPEAT BUTTON
========================================== */

document.getElementById("repeatWelcome")
  ?.addEventListener(
    "click",
    resumeNoor
  );

/* ==========================================
   STOP NOOR BUTTON
========================================== */

document.getElementById("stopNoor")
  ?.addEventListener("click", () => {
    noorStopped = true;
    audioEnabled = false;

    token++;

    clearSpeech();
    stopMusic();

    if (ctx?.state === "running") {
      ctx.suspend().catch(() => {});
    }

    if (alertBox) {
      alertBox.textContent =
        "NOOR stopped • Guest slideshow continues";
    }

    scheduleNext(token);
  });

/* ==========================================
   PAGE VISIBILITY
========================================== */

document.addEventListener(
  "visibilitychange",
  () => {
    if (document.hidden) {
      token++;

      clearSpeech();
      stopMusic();
      clearTimeout(slideTimer);

    } else {
      show(current);
    }
  }
);

/* ==========================================
   AUTOMATIC WELCOME ON PAGE LOAD
========================================== */

function autoWelcome() {
  if ("speechSynthesis" in window) {
    try {
      speechSynthesis.getVoices();
      speechSynthesis.resume();
    } catch (error) {}
  }

  // Attempt automatic audio playback.
  tryMusic();

  // Show first guest and attempt speech.
  show(0);
}

/* ==========================================
   BROWSER VOICE INITIALIZATION
========================================== */

if ("speechSynthesis" in window) {
  speechSynthesis.getVoices();

  speechSynthesis.addEventListener?.(
    "voiceschanged",
    () => {
      console.log(
        "NOOR voices loaded:",
        speechSynthesis.getVoices().length
      );
    }
  );
}

/* ==========================================
   START ON PAGE LOAD
========================================== */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    autoWelcome,
    { once: true }
  );
} else {
  autoWelcome();
}
