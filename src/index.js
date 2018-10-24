class Timer {
  constructor(props) {
    this.time = {
      max: props.timeLimit * 60,
      remaining: props.timeLimit * 60
    };
    this.members = {
      list: props.members,
      index: 0
    };
    this.callback = props.callback;
    this.turnPause = false;
    this.notifications = {
      tts: false,
      notification: false,
      alarm: false,
      recording: false
    };
    this.sounds = {
      alarm: new Audio('https://agility.jahed.io/sounds/door-bell.wav'),
      tts(utterance) {
        window.responsiveVoice.speak(utterance);
      },
      recording: null
    };
    this.update = null;
    this.active = false;
    this.gradientBg = false;
  }

  start() {
    this.active = true;
    this.updateUI();
    this.update = setInterval(() => {
      this.tick();
    }, 1000);
  }

  record() {
    return new Promise(resolve => {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.start();

          const audioChunks = [];

          mediaRecorder.ondataavailable = evt => audioChunks.push(evt.data);

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            const play = () => audio.play();
            play();
            resolve(play);
          };
          setTimeout(() => mediaRecorder.stop(), 2000);
        });
    });
  }

  addRecording() {
    this.record()
      .then(recording => {
        this.sounds.recording = recording;
      });
  }

  pause() {
    this.active = false;
    this.updateUI();
    clearInterval(this.update);
  }

  toggleTurnPause() {
    this.turnPause = !this.turnPause;
  }

  tick() {
    this.time.remaining -= 1;
    this.updateUI();

    document.querySelector('title').innerHTML = `
    ${this.members.list[this.members.index]} ${this.formatTime(this.time.remaining)}`;

    if (!this.time.remaining) this.next();
  }

  formatTime(t) {
    let minutes = Math.floor(t / 60).toString();
    let seconds = (t - minutes * 60).toString();

    while (minutes.length < 2) {
      minutes = '0' + minutes;
    }

    while (seconds.length < 2) {
      seconds = '0' + seconds;
    }

    return `${minutes}:${seconds}`;
  }

  next() {
    if (this.members.index === this.members.list.length - 1) this.members.index = 0;
    else ++this.members.index;

    this.time.remaining = this.time.max;
    this.updateUI();
    this.notify();
    if (this.turnPause) this.pause();
  }

  previous() {
    if (!this.members.index) this.members.index = this.members.list.length - 1;
    else --this.members.index;

    this.time.remaining = this.time.max;

    this.updateUI();
  }

  notify() {
    if (this.notifications.alarm) this.sounds.alarm.play();
    if (this.notifications.tts) this.sounds.tts(`${this.members.list[this.members.index]}'s turn to code.`);
    if (this.notifications.notification) new Notification(`${this.members.list[this.members.index]}'s turn to code.`);
    if (this.notifications.recording) this.playRecording();
  }

  playRecording() {
    this.sounds.recording && this.sounds.recording();
  }

  updateUI() {
    this.callback({
      time: this.time,
      member: this.members.list[this.members.index],
      active: this.active,
      membersList: this.members.list,
      gradientBg: this.gradientBg
    });
  }

  toggleTts() {
    this.notifications.tts = !this.notifications.tts;
  }

  toggleAlarm() {
    this.notifications.alarm = !this.notifications.alarm;
  }

  toggleNotification() {
    this.notifications.notification = !this.notifications.notification;
  }

  toggleRecording() {
    this.notifications.recording = !this.notifications.recording;
  }

  toggleGradient() {
    this.gradientBg = !this.gradientBg;
    this.updateUI();
  }

  reset() {
    this.time.remaining = this.time.max;
    this.updateUI();
  }

  shuffle() {
    const limit = this.members.list.length;
    const random = () => Math.floor(Math.random() * (limit));

    const unique = new Set();

    while (unique.size < limit) {
      unique.add(this.members.list[random()]);
    }
    this.pause();
    this.members.list = Array.from(unique);
    this.reset();
  }

}


// Helper Functions
const el = s => document.querySelector(s);
const all = s => Array.from(document.querySelectorAll(s));
function formatTime(t) {
  let minutes = Math.floor(t / 60).toString();
  let seconds = (t - minutes * 60).toString();

  while (minutes.length < 2) {
    minutes = '0' + minutes;
  }

  while (seconds.length < 2) {
    seconds = '0' + seconds;
  }

  return `${minutes}:${seconds}`;
}

// Event listeners
const buttons = {};
document.querySelectorAll('button')
  .forEach(btn => {
    btn.id && (
      buttons[btn.id] ? buttons[btn.id].push(btn) :
      (buttons[btn.id] = [btn])  
    )
  });

let timer;

function start(_, history = false) {
  let timeLimit, members;
  const timeInput = el('#mobtime');
  const memberInputs = all('.mobtimer-input-person');

  if (history) {
    timeLimit = history.timeLimit;
    members = history.members;
  } else {
    timeLimit = timeInput.value;
    members = memberInputs
      .map(m => m.value)
      .filter(v => v);
  }

  timeInput.value = '';
  memberInputs.forEach(input => input.value = '');

  el('.setup').classList.add('hidden');
  el('.fullscreen').classList.remove('hidden');

  initMobtimer({ members, timeLimit });

  const callback = (obj) => tick(obj);

  timer = new Timer({ members, timeLimit, callback });
  timer.start({ members, timeLimit });
}

function calculateGradient() {
  const stopRange = 138;
  const hue = (timer.time.remaining / timer.time.max) * stopRange;
  const saturation = 59;
  const lightness = 57;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function togglePlaystate(_, onlyUI = false) {
  const shouldPause = buttons['btn-start'][0].classList.contains('hidden');

  if (shouldPause) {
    !onlyUI && timer.pause();
    buttons['btn-start'].forEach(btn => btn.classList.remove('hidden'));
    buttons['btn-pause'].forEach(btn => btn.classList.add('hidden'));
  } else {
    !onlyUI && timer.start();
    buttons['btn-start'].forEach(btn => btn.classList.add('hidden'));
    buttons['btn-pause'].forEach(btn => btn.classList.remove('hidden'));
  }
}

function select(el) {
  if (Array.isArray(el)) {
    el.forEach(l => {
      l.classList.contains('btn--selected') ?
      l.classList.remove('btn--selected') :
      l.classList.add('btn--selected');
    });
  } else {
    el.classList.contains('btn--selected') ?
      el.classList.remove('btn--selected') :
      el.classList.add('btn--selected');
  }
}

function tick({ time, member, active, membersList, gradientBg }) {
  el('#currentMember').innerHTML = member;
  el('#time').innerHTML = formatTime(time.remaining);
  const positions = calculatePositions(membersList, member, time).join('');
  el('.mobtimer-list').innerHTML = positions;

  if (gradientBg) {
    el('.mobtimer-fullscreen').style.background = calculateGradient();
  } else {
    el('.mobtimer-fullscreen').style.background = 'transparent';
  }

  if (!active && buttons['btn-start'][0].classList.contains('hidden')) {
    togglePlaystate(null, true);
  }
}

function calculatePositions(membersList, member, time) {
  const currentPos = membersList.indexOf(member);
  const maxPos = membersList.length - 1;
  const members = membersList;
  const filteredMembers = membersList.filter(m => m !== member);
  let correctOrder = [];

  if (currentPos === maxPos) correctOrder = filteredMembers;

  else {
    correctOrder = correctOrder.concat(members.slice(currentPos + 1));
    correctOrder = correctOrder.concat(members.slice(0, currentPos));
  }

  return correctOrder.map((member, i) => {
    const _time = formatTime(i * time.max + time.remaining);
    return `<h2>${i + 1}: ${member} – ${_time} </h2>`;
  });
}

// Button listeners
buttons['btn-init'][0].onclick = start;

buttons['btn-pause'].forEach(btn => btn.onclick = togglePlaystate);
buttons['btn-start'].forEach(btn => btn.onclick = togglePlaystate);
buttons['btn-next'].forEach(btn => btn.onclick = () => timer.next());
buttons['btn-previous'].forEach(btn => btn.onclick = () => timer.previous());
buttons['btn-reset'].forEach(btn => btn.onclick = () => timer.reset());
buttons['btn-shuffle'].forEach(btn => btn.onclick = () => timer.shuffle());

buttons['btn-exit'].forEach(btn => btn.onclick = () => {
  el('.setup').classList.remove('hidden');
  el('.fullscreen').classList.add('hidden');
  timer.active && timer.pause();
  initLayout();
});

buttons['btn-toggleGradient'].forEach(btn => btn.onclick = () => {
  timer.toggleGradient();
  select(buttons['btn-toggleGradient']);
});

buttons['btn-togglePause'].forEach(btn => btn.onclick = () => {
  timer.toggleTurnPause();
  select(buttons['btn-togglePause']);
});

buttons['btn-tts'].forEach(btn => btn.onclick = () => {
  timer.toggleTts();
  if (timer.notifications.tts) timer.sounds.tts('Voice enabled');
  select(buttons['btn-tts']);
});

let permission = false;
buttons['btn-notification'].forEach(btn => btn.onclick = () => {
  if (!permission) {
    Notification.requestPermission()
      .then(status => {
        if (status === 'granted') {
          timer.toggleNotification();
          select(buttons['btn-notification']);
          new Notification('Notifications Enabled!');
          permission = true;
        }
      });
  } else {
    const active = timer.notifications.notification;
    const msg = active ? 'Notifications Disabled!' : 'Notifications Enabled!';
    new Notification(msg);
    timer.toggleNotification();
    select(buttons['btn-notification']);
  }
});

buttons['btn-alarm'].forEach(btn => btn.onclick = () => {
  timer.toggleAlarm();
  select(buttons['btn-alarm']);
});

function initMobtimer({ members, timeLimit }) {
  const storage = JSON.parse(localStorage.getItem('mobhistory')) || [];
  const id = members.sort().join('') + timeLimit;

  if (storage.length > 0) {
    const exists = storage.filter(session => session.id === id).length > 0;
    if (!exists) {
      storage.unshift({ members, timeLimit, id });
    }
  } else {
    storage.unshift({ members, timeLimit, id });
  }

  localStorage.setItem('mobhistory', JSON.stringify(storage.splice(0, 5)));
}

function initLayout() {
  const storage = JSON.parse(localStorage.getItem('mobhistory')) || null;
  const container = el('.mobtimer-sessions');
  container.innerHTML = '';

  if (storage) {
    // Render layout
    storage.forEach(session => {

      const sessionElement = document.createElement('div');
      sessionElement.className = 'mobtimer-session';
      sessionElement.onclick = () => start(null, session);
      
      const members = session.members.map((member, i) => {
        if (i < 3) return `<h4>${member}</h4>`;
        if (i === 3 && session.members.length === 4) return `<h4>${member}</h4>`;
        if (i === 4) return `<h4>+ ${session.members.length - 3} more..</h4>`;
      }).join('');

      sessionElement.innerHTML = `
        <div class="mobtimer-session__members-container">
          <span class="mobtimer-icon mobtimer-icon--users">
            <i class="fas fa-users"></i>
          </span>
          <div class="mobtimer-session__members">
            ${members}
          </div>        
        </div>
        <div class="mobtimer-session__duration">
          <span class="mobtimer-icon mobtimer-icon--clock">
            <i class="fas fa-clock"></i>
          </span>
          <h1>${session.timeLimit}</h1>
        </div>
      `;

      container.appendChild(sessionElement);
    });
  }
}

initLayout();