
"use strict";

// NOOR Guest Welcome - Updated Speech Script

const guests = [
  {
    name: "Captain Mantej Singh Cheema",
    designation: "Assistant Director of Youth Welfare",
    organization: ""
  },
  {
    name: "J.S. Bedi",
    designation: "Chairman",
    organization: "Gian Jyoti Institute of Management and Technology"
  },
  {
    name: "Dr. Aneet Bedi",
    designation: "Director",
    organization: "Gian Jyoti Institute of Management and Technology"
  }
];

const slides = [...document.querySelectorAll(".guest-slide")];
const halo = document.querySelector(".halo");
const line = document.getElementById("line");
const alertBox = document.getElementById("guestAlert");
const progress = document.getElementById("guestProgress");

const MIN_SLIDE_MS = 18000;

let current = 0;
let token = 0;
let slideStart = 0;
let slideTimer = null;

let ctx = null;
let musicTimer = null;

let noorStopped = false;
let audioEnabled = true;
let activeUtterance = null;
let chunkWatchdog = null;

// Preferred female voice

function preferredVoice() {
  if (!("speechSynthesis" in window)) return null;

  const voices = speechSynthesis.getVoices();

  if (!voices.length) return null;

  // Prefer known female voices only.
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
      v.name.toLowerCase().includes(name.toLowerCase())
    );

    if (voice) return voice;
  }

  // Other voices explicitly identified as female.
  return voices.find(v =>
    /female|woman/i.test(v.name)
  ) || null;
}

// Improve pronunciation for NOOR
function sayable(text) {
  return String(text)
    .replace(/GJIMT/gi, "G. J. I. M. T.")
    .replace(/Gian Jyoti/gi, "Gyaan Jyoti")
    .replace(/Sat Shri Akal/gi, "Sat Shree Akaal")
    .replace(/Sat Sri Akal/gi, "Sat Shree Akaal");
}

// Updated guest welcome sentences
function welcomeParts(guest) {

  let fullDesignation = guest.designation;

  if (guest.organization) {
    fullDesignation += " of " + guest.organization;
  }

  return [
    "Sat Shri Akal!",

    "I am NOOR, G J I M T AI Assistant.",

    "NOOR warmly welcomes " + guest.name + ".",

    guest.name + " is " + fullDesignation + ".",

    "Welcome to the Gian Jyoti Blood Donation Camp.",

    "Thank you for your presence and support."
  ];
}

// Stop background music
function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

// Soft background music
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

    if (!ctx || ctx.state !== "running" || noorStopped) {
      return;
    }

    const t = ctx.currentTime + 0.03;

    for (const [j, f] of chords[n++ % chords.length].entries()) {

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = f;

      gain.gain.setValueAtTime(0.0001, t + j * 0.06);

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

// Attempt to enable music
function tryMusic() {

  try {
    const AudioClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioClass) return;

    ctx = ctx || new AudioClass();

    if (ctx.state === "suspended") {
      ctx.resume().then(startMusic).catch(() => {});
    } else {
      startMusic();
    }

  } catch (error) {
    console.warn("NOOR music permission:", error);
  }
}

// Stop speech safely
function clearSpeech() {

  clearTimeout(chunkWatchdog);
  chunkWatchdog = null;

  activeUtterance = null;

  if ("speechSynthesis" in window) {
    try {
      speechSynthesis.cancel();
    } catch (error) {}
  }

  halo?.classList.remove("talking");
}

// Move to next guest
function scheduleNext(id) {

  clearTimeout(slideTimer);

  const remaining = Math.max(
    1300,
    MIN_SLIDE_MS - (Date.now() - slideStart)
  );

  slideTimer = setTimeout(() => {

    if (id === token) {
      show((current + 1) % guests.length);
    }

  }, remaining);
}

// Speak complete welcome message
function speak(id) {

  const guest = guests[current];
  const parts = welcomeParts(guest);

  line.textContent = parts.join(" ");
  alertBox.textContent = "♥ NOOR welcomes " + guest.name + "!";

  stopMusic();

  if (
    noorStopped ||
    !audioEnabled ||
    !("speechSynthesis" in window)
  ) {
    if (!noorStopped) tryMusic();
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

  function nextPart() {

    if (id !== token || noorStopped || complete) return;

    clearTimeout(chunkWatchdog);

    if (partIndex >= parts.length) {
      finish();
      return;
    }

    const text = sayable(parts[partIndex++]);

    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterance = utterance;

  
const selectedVoice = preferredVoice();

if (!selectedVoice) {
  halo?.classList.remove("talking");

  alertBox.textContent =
    "Female NOOR voice unavailable. Please install or enable a supported female voice.";

  console.warn(
    "NOOR: No recognized female voice is available on this device."
  );

  finish();
  return;
}

const utterance = new SpeechSynthesisUtterance(
  sayable(parts[partIndex++])
);

activeUtterance = utterance;

utterance.voice = selectedVoice;
utterance.lang = selectedVoice.lang;
utterance.rate = 0.95;
utterance.pitch = 1.10;
utterance.volume = 1;

    let settled = false;

    function advance() {

      if (settled || id !== token) return;

      settled = true;
      clearTimeout(chunkWatchdog);

      nextPart();
    }

    utterance.onstart = () => {
      if (id === token) {
        halo?.classList.add("talking");
      }
    };

    utterance.onend = advance;

    utterance.onerror = event => {

      console.warn("NOOR speech error:", event.error);

      if (
        event.error === "not-allowed" ||
        event.error === "audio-busy"
      ) {
        audioEnabled = false;

        alertBox.textContent =
          "♥ Welcome " + guest.name +
          " • Tap Resume NOOR if browser blocks sound";

        finish();
        return;
      }

      advance();
    };

    // Fallback for stalled speech
    chunkWatchdog = setTimeout(() => {

      if (id !== token || settled) return;

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

  try {
    speechSynthesis.cancel();
    speechSynthesis.resume();
  } catch (error) {}

  nextPart();
}

// Display guest slide
function show(index) {

  current = (index + guests.length) % guests.length;

  token++;
  slideStart = Date.now();

  clearTimeout(slideTimer);
  clearSpeech();
  stopMusic();

  slides.forEach((slide, index) => {

    slide.classList.toggle(
      "active",
      index === current
    );

    slide.setAttribute(
      "aria-hidden",
      String(index !== current)
    );
  });

  progress.textContent =
    `Guest ${current + 1} of ${guests.length}`;

  speak(token);
}

// Resume NOOR
function resumeNoor() {

  noorStopped = false;
  audioEnabled = true;

  tryMusic();
  show(current);
}

// Previous guest
document.getElementById("prevGuest")
  .addEventListener("click", () => {
    show(current - 1);
  });

// Next guest
document.getElementById("nextGuest")
  .addEventListener("click", () => {
    show(current + 1);
  });

// Repeat / Resume NOOR
document.getElementById("repeatWelcome")
  .addEventListener("click", resumeNoor);

// Stop NOOR
document.getElementById("stopNoor")
  .addEventListener("click", () => {

    noorStopped = true;
    audioEnabled = false;

    token++;

    clearSpeech();
    stopMusic();

    if (ctx?.state === "running") {
      ctx.suspend().catch(() => {});
    }

    alertBox.textContent =
      "NOOR stopped • Guest slideshow continues";

    scheduleNext(token);
  });

// Handle tab visibility
document.addEventListener("visibilitychange", () => {

  if (document.hidden) {

    token++;

    clearSpeech();
    stopMusic();
    clearTimeout(slideTimer);

  } else {

    show(current);
  }
});

// Automatic welcome on page load
function autoWelcome() {

  if ("speechSynthesis" in window) {

    try {
      speechSynthesis.getVoices();
      speechSynthesis.resume();
    } catch (error) {}
  }

  tryMusic();
  show(0);
}

// Start automatically
if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    autoWelcome,
    { once: true }
  );

} else {

  autoWelcome();
}
