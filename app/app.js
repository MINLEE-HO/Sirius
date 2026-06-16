const events = [
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

let tasks = [
  { text: "Choose first app surface", type: "focus", done: false },
  { text: "Draft Google Calendar OAuth scope list", type: "prepare", done: false },
  { text: "Write deletion and export data principle", type: "quick", done: false },
];

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

const formatter = new Intl.DateTimeFormat("ko-KR", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function renderDate() {
  todayLabel.textContent = formatter.format(new Date());
}

function renderTimeline() {
  timeline.innerHTML = events
    .map(
      (event) => `
        <section class="event">
          <time>${event.time}</time>
          <div>
            <strong>${event.title}</strong>
            <p>${event.detail}</p>
            <p><span class="tag">Prep</span> ${event.prep}</p>
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
          <input type="checkbox" ${task.done ? "checked" : ""} data-index="${index}" aria-label="Complete ${task.text}" />
          <div>
            <strong>${task.text}</strong>
            <p>${getTaskDescription(task.type)}</p>
          </div>
          <span class="tag">${task.type}</span>
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
