class FocusPulse {
    constructor() {
        this.settings = this.loadSettings();
        this.state = {
            mode: 'work',
            timeLeft: this.settings.workDuration * 60,
            isRunning: false,
            currentTask: null,
            sessions: this.loadSessions(),
            tasks: this.loadTasks()
        };
        this.timer = null;
        this.init();
    }

    init() {
        this.renderTasks();
        this.renderHistory();
        this.updateStats();
        this.updateDisplay();
        this.attachEventListeners();
        this.loadSettingsToUI();
    }

    loadSettings() {
        const defaults = {
            workDuration: 25,
            shortBreak: 5,
            longBreak: 15
        };
        const saved = localStorage.getItem('focusPulseSettings');
        return saved ? JSON.parse(saved) : defaults;
    }

    saveSettings() {
        localStorage.setItem('focusPulseSettings', JSON.stringify(this.settings));
    }

    loadSessions() {
        const saved = localStorage.getItem('focusPulseSessions');
        return saved ? JSON.parse(saved) : [];
    }

    saveSessions() {
        localStorage.setItem('focusPulseSessions', JSON.stringify(this.state.sessions));
    }

    loadTasks() {
        const saved = localStorage.getItem('focusPulseTasks');
        return saved ? JSON.parse(saved) : [];
    }

    saveTasks() {
        localStorage.setItem('focusPulseTasks', JSON.stringify(this.state.tasks));
    }

    attachEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => this.toggleTimer());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetTimer());
        document.getElementById('add-task-btn').addEventListener('click', () => this.addTask());
        document.getElementById('task-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        ['work-duration', 'short-break', 'long-break'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = id.replace('-', '').replace('duration', 'Duration').replace('break', 'Break');
                this.settings[key] = parseInt(e.target.value);
                this.saveSettings();
                if (!this.state.isRunning) {
                    this.resetTimer();
                }
            });
        });
    }

    loadSettingsToUI() {
        document.getElementById('work-duration').value = this.settings.workDuration;
        document.getElementById('short-break').value = this.settings.shortBreak;
        document.getElementById('long-break').value = this.settings.longBreak;
    }

    switchMode(mode) {
        if (this.state.isRunning) return;

        this.state.mode = mode;
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        switch(mode) {
            case 'work':
                this.state.timeLeft = this.settings.workDuration * 60;
                break;
            case 'short':
                this.state.timeLeft = this.settings.shortBreak * 60;
                break;
            case 'long':
                this.state.timeLeft = this.settings.longBreak * 60;
                break;
        }

        this.updateDisplay();
    }

    toggleTimer() {
        this.state.isRunning = !this.state.isRunning;
        const btn = document.getElementById('start-btn');

        if (this.state.isRunning) {
            btn.textContent = 'Pause';
            this.startTimer();
        } else {
            btn.textContent = 'Start';
            this.stopTimer();
        }
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.state.timeLeft--;
            this.updateDisplay();

            if (this.state.timeLeft === 0) {
                this.timerComplete();
            }
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timer);
    }

    resetTimer() {
        this.stopTimer();
        this.state.isRunning = false;
        document.getElementById('start-btn').textContent = 'Start';

        switch(this.state.mode) {
            case 'work':
                this.state.timeLeft = this.settings.workDuration * 60;
                break;
            case 'short':
                this.state.timeLeft = this.settings.shortBreak * 60;
                break;
            case 'long':
                this.state.timeLeft = this.settings.longBreak * 60;
                break;
        }

        this.updateDisplay();
    }

    timerComplete() {
        this.stopTimer();
        this.state.isRunning = false;
        document.getElementById('start-btn').textContent = 'Start';

        if (this.state.mode === 'work') {
            this.recordSession();
        }

        this.playNotification();
        this.resetTimer();
    }

    playNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Focus Pulse', {
                body: this.state.mode === 'work' ? 'Work session complete! Take a break.' : 'Break over! Ready to focus?',
                icon: '⏰'
            });
        }
    }

    recordSession() {
        const session = {
            date: new Date().toISOString(),
            task: this.state.currentTask,
            duration: this.settings.workDuration
        };

        this.state.sessions.push(session);
        this.saveSessions();

        if (this.state.currentTask) {
            const task = this.state.tasks.find(t => t.id === this.state.currentTask);
            if (task) {
                task.sessions++;
                this.saveTasks();
            }
        }

        this.renderHistory();
        this.updateStats();
        this.renderTasks();
    }

    updateDisplay() {
        const minutes = Math.floor(this.state.timeLeft / 60);
        const seconds = this.state.timeLeft % 60;
        document.getElementById('timer').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} - Focus Pulse`;
    }

    addTask() {
        const input = document.getElementById('task-input');
        const taskName = input.value.trim();

        if (!taskName) return;

        const task = {
            id: Date.now(),
            name: taskName,
            sessions: 0,
            created: new Date().toISOString()
        };

        this.state.tasks.push(task);
        this.saveTasks();
        this.renderTasks();

        input.value = '';
    }

    deleteTask(id) {
        this.state.tasks = this.state.tasks.filter(t => t.id !== id);
        if (this.state.currentTask === id) {
            this.state.currentTask = null;
            document.getElementById('current-task').textContent = 'No task selected';
        }
        this.saveTasks();
        this.renderTasks();
    }

    selectTask(id) {
        this.state.currentTask = id;
        const task = this.state.tasks.find(t => t.id === id);
        document.getElementById('current-task').textContent = task ? task.name : 'No task selected';
        this.renderTasks();
    }

    renderTasks() {
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';

        this.state.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item' + (this.state.currentTask === task.id ? ' active' : '');
            li.innerHTML = `
                <span class="task-name">${task.name}</span>
                <span class="task-sessions">${task.sessions} sessions</span>
                <button class="btn btn-small btn-primary" onclick="app.selectTask(${task.id})">Select</button>
                <button class="btn btn-small btn-secondary" onclick="app.deleteTask(${task.id})">Delete</button>
            `;
            taskList.appendChild(li);
        });
    }

    renderHistory() {
        const historyList = document.getElementById('history-list');
        const recentSessions = this.state.sessions.slice(-10).reverse();

        historyList.innerHTML = '';

        recentSessions.forEach(session => {
            const li = document.createElement('li');
            li.className = 'history-item';
            const date = new Date(session.date);
            const task = this.state.tasks.find(t => t.id === session.task);

            li.innerHTML = `
                <span>${task ? task.name : 'Untitled Task'}</span>
                <span class="history-date">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
            `;
            historyList.appendChild(li);
        });
    }

    updateStats() {
        const today = new Date().toDateString();
        const todaySessions = this.state.sessions.filter(s =>
            new Date(s.date).toDateString() === today
        );

        const totalMinutes = this.state.sessions.reduce((sum, s) => sum + s.duration, 0);

        document.getElementById('total-sessions').textContent = this.state.sessions.length;
        document.getElementById('today-sessions').textContent = todaySessions.length;
        document.getElementById('total-time').textContent = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
    }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Initialize app
const app = new FocusPulse();
