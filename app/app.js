const sampleEvents = [
  {
    time: "09:30",
    title: "Product scope review",
    detail: "Confirm MVP boundaries: calendar briefings, manual tasks, and health-aware hints.",
    prep: "Open product brief and define first app surface.",
  },
  {
    time: "11:00",
    title: "Calendar integration planning",
    detail: "Map OAuth consent, event normalization, and daily briefing generation.",
    prep: "List required Google Calendar scopes before implementation.",
  },
  {
    time: "14:30",
    title: "Health context design",
    detail: "Choose between HealthKit, export import, or Shortcuts summary bridge.",
    prep: "Keep raw health data separate from recommendations.",
  },
  {
    time: "17:00",
    title: "Notification strategy",
    detail: "Decide the first delivery path for summaries and reminders.",
    prep: "Compare macOS local notifications with Shortcuts notifications.",
  },
];

let events = [...sampleEvents];
let tasks = [
  { text: "Choose first app surface", type: "focus", done: false },
  { text: "Draft Google Calendar OAuth scope list", type: "prepare", done: false },
  { text: "Write deletion and export data principle", type: "quick", done: false },
];

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const WAKE_PATTERNS = ["hey siri", "헤이 시리", "hey sirius", "헤이 시리우스", "헤이 시리어스"];

let accessToken = "";
let tokenClient = null;
let isListening = false;
let awaitingCommand = false;
let recognition = null;

const todayLabel = document.querySelector("#todayLabel");
const briefingHeadline = document.querySelector("#briefingHeadline");
const briefingText = document.querySelector("#briefingText");
const timeline = document.querySelector("#timeline");
const taskList = document.querySelector("#taskList");
const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const taskWeight = document.querySelector("#taskWeight");
const sleepRange = document.querySelector("#sleepRange");
const recoveryRange = document.querySelector("#recoveryRange");
const loadRange = document.querySelector("#loadRange");
const sleepValue = document.querySelector("#sleepValue");
const recoveryValue = document.querySelector("#recoveryValue");
const loadValue = document.querySelector("#loadValue");
const healthHint = document.querySelector("#healthHint");
const assistantMessage = document.querySelector("#assistantMessage");
const googleClientId = document.querySelector("#googleClientId");
const connectCalendarBtn = document.querySelector("#connectCalendarBtn");
const startListeningBtn = document.querySelector("#startListeningBtn");
const stopListeningBtn = document.querySelector("#stopListeningBtn");
const voiceStatus = document.querySelector("#voiceStatus");
const voiceTranscript = document.querySelector("#voiceTranscript");
const commandOutput = document.querySelector("#commandOutput");
const voicePanel = document.querySelector(".voice-panel");

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderDate() {
  todayLabel.textContent = dateFormatter.format(new Date());
}

function renderTimeline() {
  timeline.innerHTML = events
    .map(
      (event) => `
        <section class="event">
          <time>${escapeHtml(event.time)}</time>
          <div>
            <strong>${escapeHtml(event.title)}</strong>
            <p>${escapeHtml(event.detail)}</p>
            <p><span class="tag">Prep</span> ${escapeHtml(event.prep)}</p>
          </div>
        </section>
      `,
    )
    .join("");
}

function renderTasks() {
  taskList.innerHTML = tasks
    .map(
      (task, index) => `
        <li>
          <input type="checkbox" ${task.done ? "checked" : ""} data-index="${index}" aria-label="Complete ${escapeHtml(task.text)}" />
          <div>
            <strong>${escapeHtml(task.text)}</strong>
            <p>${escapeHtml(getTaskDescription(task.type))}</p>
          </div>
          <span class="tag">${escapeHtml(task.type)}</span>
        </li>
      `,
    )
    .join("");
}

function getTaskDescription(type) {
  const descriptions = {
    focus: "Protect a clean block before the next meeting.",
    quick: "Complete this during a transition window.",
    prepare: "Handle before its related calendar event.",
  };
  return descriptions[type] ?? descriptions.quick;
}

function getEnergyProfile() {
  const sleep = Number(sleepRange.value);
  const recovery = Number(recoveryRange.value);
  const load = Number(loadRange.value);
  const pressure = load - recovery + (sleep < 6 ? 2 : 0);

  if (pressure >= 4) {
    return {
      level: "constrained",
      headline: "High load detected.",
      hint: "Keep the calendar intact, but move deep work into one protected block and avoid adding discretionary tasks.",
    };
  }

  if (pressure >= 1) {
    return {
      level: "balanced",
      headline: "A measured pace is advised.",
      hint: "Your day can absorb focused work if preparation is handled early and meetings stay bounded.",
    };
  }

  return {
    level: "ready",
    headline: "Energy profile looks clear.",
    hint: "This is a good day to place the most demanding task before the afternoon context switch.",
  };
}

function renderHealth() {
  sleepValue.textContent = `${Number(sleepRange.value).toFixed(1)}h`;
  recoveryValue.textContent = `${recoveryRange.value}/10`;
  loadValue.textContent = `${loadRange.value}/10`;

  const profile = getEnergyProfile();
  healthHint.innerHTML = `<strong>${profile.headline}</strong><p>${profile.hint}</p>`;
  renderBriefing(profile);
}

function renderBriefing(profile = getEnergyProfile()) {
  const openTasks = tasks.filter((task) => !task.done).length;
  briefingHeadline.textContent = profile.headline;
  briefingText.textContent = `오늘은 ${events.length}개의 일정과 ${openTasks}개의 미완료 태스크가 있습니다. Sirius는 캘린더 변경을 자동으로 수행하지 않고, 준비 항목과 에너지 신호를 바탕으로 다음 행동만 제안합니다.`;
}

function setAssistantMode(mode) {
  const profile = getEnergyProfile();
  const messages = {
    morning: {
      title: "Morning briefing",
      body: `첫 회의 전까지 MVP 범위를 확정하세요. ${profile.hint}`,
    },
    focus: {
      title: "Focus recommendation",
      body: "가장 가치 있는 블록은 오전입니다. OAuth scope list와 데이터 원칙을 먼저 끝내면 오후 의사결정이 가벼워집니다.",
    },
    wrap: {
      title: "Wrap-up protocol",
      body: "오늘 끝난 항목, 미룬 항목, 내일 첫 행동을 분리하세요. 삭제와 내보내기 원칙도 기록해 두면 로컬 우선 설계가 흔들리지 않습니다.",
    },
  };

  const message = messages[mode];
  assistantMessage.innerHTML = `<strong>${message.title}</strong><p>${message.body}</p>`;
}

function summarizeEvents() {
  if (!events.length) {
    return "오늘 등록된 일정이 없습니다.";
  }

  const first = events[0];
  const titles = events.slice(0, 3).map((event) => `${event.time} ${event.title}`).join(", ");
  const extra = events.length > 3 ? ` 외 ${events.length - 3}건` : "";
  return `오늘은 총 ${events.length}개의 일정이 있습니다. 첫 일정은 ${first.time}, ${first.title}입니다. 주요 일정은 ${titles}${extra}입니다.`;
}

function getPreferredVoice() {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  const koreanVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("ko"));
  const koreanMaleNames = ["injoon", "injun", "민준", "준", "male"];

  return (
    koreanVoices.find((voice) => koreanMaleNames.some((name) => voice.name.toLowerCase().includes(name))) ||
    koreanVoices[0] ||
    null
  );
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getPreferredVoice();

  if (voice) {
    utterance.voice = voice;
  }

  utterance.lang = "ko-KR";
  utterance.rate = 0.88;
  utterance.pitch = 0.62;
  window.speechSynthesis.speak(utterance);
}

function setVoiceState(status, message, isAwake = false) {
  voiceStatus.textContent = status;
  commandOutput.textContent = message;
  voicePanel.classList.toggle("is-listening", isListening);
  voicePanel.classList.toggle("is-awake", isAwake);
}

function createRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    setVoiceState("Unsupported", "이 브라우저는 Web Speech Recognition을 지원하지 않습니다. Chrome 계열 브라우저에서 실행해 주세요.");
    return null;
  }

  const nextRecognition = new Recognition();
  nextRecognition.continuous = true;
  nextRecognition.interimResults = true;
  nextRecognition.lang = "ko-KR";

  nextRecognition.onstart = () => {
    isListening = true;
    startListeningBtn.disabled = true;
    stopListeningBtn.disabled = false;
    setVoiceState("Listening", 'Say "hey siri" and then your command.');
  };

  nextRecognition.onresult = (event) => {
    let interimText = "";
    let finalText = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript.trim();
      if (event.results[index].isFinal) {
        finalText += ` ${transcript}`;
      } else {
        interimText += ` ${transcript}`;
      }
    }

    const heard = (finalText || interimText).trim();
    if (heard) {
      voiceTranscript.textContent = heard;
    }

    if (finalText.trim()) {
      handleSpeech(finalText.trim());
    }
  };

  nextRecognition.onerror = (event) => {
    setVoiceState("Voice error", `음성 인식 오류: ${event.error}`);
  };

  nextRecognition.onend = () => {
    if (isListening) {
      nextRecognition.start();
      return;
    }

    startListeningBtn.disabled = false;
    stopListeningBtn.disabled = true;
    setVoiceState("Standby", "Listening stopped.");
  };

  return nextRecognition;
}

function normalizeSpeech(text) {
  return text.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
}

function findWakeCommand(text) {
  const normalized = normalizeSpeech(text);

  for (const wakePattern of WAKE_PATTERNS) {
    const wakeIndex = normalized.indexOf(wakePattern);
    if (wakeIndex >= 0) {
      return normalized.slice(wakeIndex + wakePattern.length).trim();
    }
  }

  return null;
}

function handleSpeech(text) {
  const inlineCommand = findWakeCommand(text);

  if (inlineCommand !== null) {
    awaitingCommand = true;
    setVoiceState("Awake", "네, 듣고 있습니다.", true);
    speak("네, 듣고 있습니다.");

    if (inlineCommand) {
      handleCommand(inlineCommand);
    }
    return;
  }

  if (awaitingCommand) {
    handleCommand(normalizeSpeech(text));
    return;
  }

  setVoiceState("Listening", 'Wake word not detected. Say "hey siri" first.');
}

async function handleCommand(command) {
  awaitingCommand = false;
  const wantsCalendar = command.includes("일정") || command.includes("캘린더") || command.includes("calendar") || command.includes("schedule");

  if (wantsCalendar) {
    await readCalendarCommand();
    return;
  }

  const fallback = "명령을 이해하지 못했습니다. 예를 들어, hey siri 오늘 일정 알려줘 라고 말해보세요.";
  setVoiceState("Listening", fallback);
  speak(fallback);
}

async function readCalendarCommand() {
  if (!accessToken) {
    const message = "Google Calendar가 아직 연결되지 않았습니다. Google OAuth Client ID를 입력하고 Connect를 눌러 주세요.";
    setVoiceState("Needs calendar", message);
    speak(message);
    return;
  }

  try {
    await fetchTodayEvents();
    const summary = summarizeEvents();
    setVoiceState("Calendar ready", summary);
    setAssistantMessage("Calendar briefing", summary);
    speak(summary);
  } catch (error) {
    const message = `Calendar 정보를 가져오지 못했습니다. ${error.message}`;
    setVoiceState("Calendar error", message);
    speak("Calendar 정보를 가져오지 못했습니다.");
  }
}

function setAssistantMessage(title, body) {
  assistantMessage.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p>`;
}

function getTodayWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function formatEventTime(eventDate) {
  if (!eventDate.dateTime) return "All day";
  return timeFormatter.format(new Date(eventDate.dateTime));
}

function normalizeCalendarEvent(item) {
  const start = item.start ?? {};
  const end = item.end ?? {};
  const hasLocation = Boolean(item.location);
  const hasMeet = Boolean(item.hangoutLink);
  const attendees = Array.isArray(item.attendees) ? item.attendees.length : 0;

  return {
    time: formatEventTime(start),
    title: item.summary || "Untitled event",
    detail: hasLocation ? item.location : hasMeet ? item.hangoutLink : attendees ? `${attendees} attendees` : "No location or meeting link.",
    prep: end.dateTime ? `Ends ${timeFormatter.format(new Date(end.dateTime))}` : "Review details before the event.",
  };
}

async function fetchTodayEvents() {
  const { start, end } = getTodayWindow();
  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "10",
  });

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    accessToken = "";
    throw new Error("Access token expired. Connect를 다시 눌러 주세요.");
  }

  if (!response.ok) {
    throw new Error(`Google Calendar API returned ${response.status}.`);
  }

  const data = await response.json();
  events = (data.items ?? []).map(normalizeCalendarEvent);
  renderTimeline();
  renderBriefing();
  return events;
}

function connectCalendar() {
  const clientId = googleClientId.value.trim();
  if (!clientId) {
    const message = "Google OAuth Client ID를 먼저 입력해 주세요.";
    setAssistantMessage("Calendar connection", message);
    speak(message);
    return;
  }

  if (!window.google?.accounts?.oauth2) {
    const message = "Google Identity Services 스크립트를 아직 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    setAssistantMessage("Calendar connection", message);
    return;
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: CALENDAR_SCOPE,
    callback: async (response) => {
      if (response.error) {
        setAssistantMessage("Calendar connection", `Google authorization failed: ${response.error}`);
        return;
      }

      accessToken = response.access_token;
      await fetchTodayEvents();
      const summary = summarizeEvents();
      setAssistantMessage("Calendar connected", summary);
      speak(`Google Calendar가 연결되었습니다. ${summary}`);
    },
  });

  tokenClient.requestAccessToken({ prompt: "consent" });
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  tasks = [{ text, type: taskWeight.value, done: false }, ...tasks];
  taskInput.value = "";
  renderTasks();
  renderBriefing();
});

taskList.addEventListener("change", (event) => {
  const index = Number(event.target.dataset.index);
  if (Number.isNaN(index)) return;
  tasks[index].done = event.target.checked;
  renderTasks();
  renderBriefing();
});

startListeningBtn.addEventListener("click", () => {
  recognition = recognition || createRecognition();
  if (!recognition) return;
  isListening = true;
  recognition.start();
});

stopListeningBtn.addEventListener("click", () => {
  isListening = false;
  awaitingCommand = false;
  recognition?.stop();
  window.speechSynthesis?.cancel();
});

connectCalendarBtn.addEventListener("click", connectCalendar);
document.querySelector("#addTaskBtn").addEventListener("click", () => taskInput.focus());
document.querySelector("#optimizeBtn").addEventListener("click", () => setAssistantMode("focus"));
document.querySelector("#morningBtn").addEventListener("click", () => setAssistantMode("morning"));
document.querySelector("#focusBtn").addEventListener("click", () => setAssistantMode("focus"));
document.querySelector("#wrapBtn").addEventListener("click", () => setAssistantMode("wrap"));

[sleepRange, recoveryRange, loadRange].forEach((input) => input.addEventListener("input", renderHealth));

renderDate();
renderTimeline();
renderTasks();
renderHealth();
setAssistantMode("morning");
setVoiceState("Standby", 'Say "hey siri" to wake the assistant.');
