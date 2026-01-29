class WordTypingApp {
    constructor() {
        this.currentLevel = "2";
        this.isTyping = false;
        this.startTime = null;
        this.timerInterval = null;
        this.targetChars = 0;
        this.limitSeconds = 600; // 10分
        this.history = JSON.parse(localStorage.getItem('typing_history') || '[]');
        this.chart = null;

        this.initDOMElements();
        this.initEventListeners();
        this.loadLevel();
    }

    initDOMElements() {
        this.elLevelSelect = document.getElementById('level-select');
        this.elLayoutSelect = document.getElementById('layout-select');
        this.elStartBtn = document.getElementById('start-btn');
        this.elFinishBtn = document.getElementById('finish-btn');
        this.elHistoryBtn = document.getElementById('history-btn');
        this.elQuitBtn = document.getElementById('quit-btn');
        this.elProblemSelectContainer = document.getElementById('problem-select-container');
        this.elProblemBtns = document.querySelectorAll('.problem-btn');

        this.elSampleText = document.getElementById('sample-text');
        this.elProblemTitle = document.getElementById('problem-title');
        this.elTypingInput = document.getElementById('typing-input');
        this.elCharCount = document.getElementById('char-count');
        this.elTargetCount = document.getElementById('target-count');
        this.elTimer = document.getElementById('timer');

        this.elResultOverlay = document.getElementById('result-overlay');
        this.elResultStats = document.getElementById('result-stats');
        this.elRestartBtn = document.getElementById('restart-btn');
        this.elRecordBtn = document.getElementById('record-btn');

        this.elHistoryOverlay = document.getElementById('history-overlay');
        this.elHistoryList = document.getElementById('history-list');
        this.elCloseHistoryBtn = document.getElementById('close-history-btn');
        this.elClearHistoryBtn = document.getElementById('clear-history-btn');
        this.elCloseHistoryXBtn = document.getElementById('close-history-x-btn');
        this.elCloseResultXBtn = document.getElementById('close-result-x-btn');
        this.elBestStatsContainer = document.getElementById('best-stats-container');

        this.elWorkspace = document.querySelector('.workspace');
    }

    initEventListeners() {
        this.elLevelSelect.addEventListener('change', (e) => {
            this.currentLevel = e.target.value;
            this.loadLevel();
        });

        this.elLayoutSelect.addEventListener('change', (e) => {
            this.updateLayout(e.target.value);
        });

        this.elStartBtn.addEventListener('click', () => this.startPractice());
        this.elFinishBtn.addEventListener('click', () => this.finishPractice());
        this.elRestartBtn.addEventListener('click', () => this.resumeForCorrection());
        this.elRecordBtn.addEventListener('click', () => this.saveResult());
        this.elQuitBtn.addEventListener('click', () => this.quitPractice());

        this.elHistoryBtn.addEventListener('click', () => this.showHistory());
        this.elCloseHistoryBtn.addEventListener('click', () => this.elHistoryOverlay.classList.add('hidden'));
        this.elCloseHistoryXBtn.addEventListener('click', () => this.elHistoryOverlay.classList.add('hidden'));
        this.elCloseResultXBtn.addEventListener('click', () => this.elResultOverlay.classList.add('hidden'));
        this.elClearHistoryBtn.addEventListener('click', () => this.clearHistory());

        this.elTypingInput.addEventListener('input', () => this.handleInput());

        this.elProblemBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const problemId = parseInt(e.target.dataset.id);
                this.loadLevel(problemId);
            });
        });

        // コピペ・右クリック禁止（マウス・メニュー操作）
        const preventAction = (e) => {
            e.preventDefault();
            console.log('Action prevented:', e.type);
        };
        ['copy', 'paste', 'cut', 'contextmenu'].forEach(event => {
            this.elTypingInput.addEventListener(event, preventAction);
            this.elSampleText.addEventListener(event, preventAction);
        });

        this.elTypingInput.addEventListener('keydown', (e) => {
            // ショートカットキー封殺 (Ctrl+C, V, X, A)
            if (e.ctrlKey || e.metaKey) {
                const forbiddenKeys = ['c', 'v', 'x', 'a'];
                if (forbiddenKeys.includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    console.log('Shortcut key prevented:', e.key);
                    return;
                }
            }

            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.elTypingInput.selectionStart;
                const end = this.elTypingInput.selectionEnd;
                this.elTypingInput.value = this.elTypingInput.value.substring(0, start) + "　" + this.elTypingInput.value.substring(end);
                this.elTypingInput.selectionStart = this.elTypingInput.selectionEnd = start + 1;
                this.handleInput();
            }
        });
    }

    updateLayout(layout) {
        if (layout === 'right') {
            this.elWorkspace.classList.add('layout-reverse');
        } else {
            this.elWorkspace.classList.remove('layout-reverse');
        }
    }

    loadLevel(problemId = null) {
        const levelData = LEVEL_DATA[this.currentLevel];

        let problem;
        if (problemId) {
            problem = levelData.problems.find(p => p.id === problemId);
        } else {
            // 指定がない場合はランダムに選択（初期化時またはレベル変更時）
            const randomIndex = Math.floor(Math.random() * levelData.problems.length);
            problem = levelData.problems[randomIndex];
        }

        this.currentProblemText = problem.text;
        // 文字数カウントは改行を除外した長さ（ユーザー規定）
        this.targetChars = problem.text.replace(/\n/g, '').length;
        this.elTargetCount.textContent = this.targetChars;
        this.elProblemTitle.textContent = `課題${problem.id}`;

        // 課題ボタンのアクティブ状態を更新
        this.elProblemBtns.forEach(btn => {
            if (parseInt(btn.dataset.id) === problem.id) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.elSampleText.innerHTML = `
            <div class="grid-background"></div>
            <div class="sample-content">${problem.text}</div>
        `;

        this.resetPractice();
    }

    startPractice() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.elResultOverlay.classList.add('hidden');
        this.elHistoryOverlay.classList.add('hidden');
        this.elTypingInput.value = "";
        this.elTypingInput.disabled = false;
        this.elTypingInput.style.opacity = "1";
        this.elCharCount.textContent = "0";
        this.elTimer.textContent = "10:00";

        this.startTime = Date.now();
        this.isTyping = false;

        this.elTypingInput.focus();
        this.elStartBtn.disabled = true;
        this.elFinishBtn.disabled = false;
        this.elQuitBtn.disabled = false;
        this.elLevelSelect.disabled = true;
        this.elLayoutSelect.disabled = true;

        const oldGrade = this.elTypingInput.parentElement.querySelector('.grading-display');
        if (oldGrade) oldGrade.remove();

        setTimeout(() => {
            this.isTyping = true;
            this.startTime = Date.now();
        }, 500);

        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    resumeForCorrection() {
        this.elResultOverlay.classList.add('hidden');
        this.elTypingInput.style.opacity = "1";
        this.elStartBtn.disabled = true;
        this.elFinishBtn.disabled = false;
        this.elQuitBtn.disabled = false;
        this.elLevelSelect.disabled = true;
        this.elLayoutSelect.disabled = true;

        const oldGrade = this.elTypingInput.parentElement.querySelector('.grading-display');
        if (oldGrade) oldGrade.remove();

        this.isTyping = true;
        this.elTypingInput.focus();

        if (!this.timerInterval) {
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        }
    }

    quitPractice() {
        if (confirm('練習を中止して初期状態に戻りますか？（入力内容は消去されます）')) {
            this.resetPractice();
        }
    }

    resetPractice() {
        this.isTyping = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.elTypingInput.value = "";
        this.elTypingInput.disabled = true;
        this.elTypingInput.style.opacity = "1";
        this.elCharCount.textContent = "0";
        this.elTimer.textContent = "10:00";
        this.elStartBtn.disabled = false;
        this.elFinishBtn.disabled = true;
        this.elQuitBtn.disabled = true;
        this.elLevelSelect.disabled = false;
        this.elLayoutSelect.disabled = false;
        this.elResultOverlay.classList.add('hidden');
        this.elHistoryOverlay.classList.add('hidden');

        const oldGrade = this.elTypingInput.parentElement.querySelector('.grading-display');
        if (oldGrade) oldGrade.remove();
    }

    updateTimer() {
        if (!this.startTime) return;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const remaining = this.limitSeconds - elapsed;

        if (remaining <= 0) {
            this.elTimer.textContent = "00:00";
            this.finishPractice();
            return;
        }

        const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
        const secs = (remaining % 60).toString().padStart(2, '0');
        this.elTimer.textContent = `${mins}:${secs}`;
    }

    handleInput() {
        if (!this.isTyping) return;
        const val = this.elTypingInput.value;
        this.elCharCount.textContent = val.length;
    }

    finishPractice() {
        this.isTyping = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        const elapsed = (Date.now() - this.startTime) / 1000;
        const timeInMinutes = elapsed / 60;
        const speed10min = ((this.elTypingInput.value.length / elapsed) * 600).toFixed(0);
        const inputText = this.elTypingInput.value;
        const sampleText = this.currentProblemText;

        const gradeDisplay = document.createElement('div');
        gradeDisplay.className = "grading-display";

        // 冒頭に2行分の改行を追加（位置調整）
        for (let j = 0; j < 2; j++) gradeDisplay.appendChild(document.createElement('br'));

        let errors = 0;
        const maxLength = Math.max(sampleText.length, inputText.length);

        for (let i = 0; i < maxLength; i++) {
            const sChar = sampleText[i] || "";
            const iChar = inputText[i] || "";

            // 改行の処理
            if (sChar === "\n") {
                const br = document.createElement('br');
                gradeDisplay.appendChild(br);
                continue;
            }

            const span = document.createElement('span');
            if (iChar === "") {
                span.textContent = "";
            } else if (iChar === sChar) {
                span.textContent = iChar;
                span.className = "grade-char grade-correct";
            } else {
                span.textContent = iChar;
                span.className = "grade-char grade-error";
                errors++;
            }
            gradeDisplay.appendChild(span);
        }

        this.elTypingInput.style.opacity = "0";
        this.elTypingInput.parentElement.appendChild(gradeDisplay);

        const speed = (inputText.length / (timeInMinutes > 0 ? timeInMinutes : 1 / 60)).toFixed(1);

        const usedMins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const usedSecs = Math.floor(elapsed % 60).toString().padStart(2, '0');

        this.elResultStats.innerHTML = `
            <div>課題: ${this.elProblemTitle.textContent}</div>
            <div>経過時間: ${usedMins}:${usedSecs}</div>
            <div>入力文字数: ${inputText.length} 文字</div>
            <div>入力速度: ${speed} 文字/分</div>
            <div style="font-weight: bold; color: var(--primary-color);">10分換算: ${speed10min} 文字</div>
            <div style="color: red; font-weight: bold;">誤字数: ${errors} 文字</div>
        `;

        // スコア計算: 10分換算 - 誤字数
        const score = parseInt(speed10min) - errors;

        this.currentResult = {
            id: Date.now(), // 削除用のID
            level: this.currentLevel,
            problem: this.elProblemTitle.textContent,
            timeLabel: `${usedMins}:${usedSecs}`,
            timeSeconds: elapsed,
            chars: inputText.length,
            speed: parseFloat(speed),
            speed10min: parseInt(speed10min),
            errors: errors,
            score: score,
            date: new Date().toLocaleString()
        };

        this.elResultOverlay.classList.remove('hidden');
        this.elFinishBtn.disabled = true;
        this.elQuitBtn.disabled = true;
        this.elStartBtn.disabled = false;
        this.elRecordBtn.disabled = false;
    }

    saveResult() {
        if (!this.currentResult) return;
        if (!confirm('結果を記録しますか？（記録すると入力は消えます）')) return;

        this.history.unshift(this.currentResult);
        localStorage.setItem('typing_history', JSON.stringify(this.history));
        alert('結果を記録しました！');

        // 入力削除と初期状態へ
        this.resetPractice();
        this.elRecordBtn.disabled = true;
    }

    showHistory() {
        this.elHistoryOverlay.classList.remove('hidden');
        this.updateBestStats();

        this.elHistoryList.innerHTML = this.history.length > 0
            ? this.history.map((item, index) => `
                <div class="history-card-item">
                    <button class="delete-record-btn" data-index="${index}" title="削除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <div class="history-date">${item.date}</div>
                    <div class="history-level-badge">${item.level}級 / ${item.problem}</div>
                    <div class="history-stats-grid">
                        <span class="stat-label">速度:</span>
                        <span class="stat-value">${item.speed10min || '-'} 字/10分</span>
                        <span class="stat-label">誤字:</span>
                        <span class="stat-value stat-error">${item.errors}</span>
                        <span class="stat-label">スコア:</span>
                        <span class="stat-value" style="color: var(--primary-color)">${item.score || 0}</span>
                        <span class="stat-label">タイム:</span>
                        <span class="stat-value">${item.timeLabel}</span>
                    </div>
                </div>
            `).join('')
            : '<div style="grid-column: 1/-1; text-align:center; padding: 2rem;">記録がありません</div>';

        // 個別削除イベント
        this.elHistoryList.querySelectorAll('.delete-record-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.deleteRecord(index);
            });
        });

        this.renderChart();
    }

    updateBestStats() {
        if (this.history.length === 0) {
            this.elBestStatsContainer.innerHTML = '';
            return;
        }

        const sorted = [...this.history].sort((a, b) => (b.score || 0) - (a.score || 0));
        const best3 = sorted.slice(0, 3);

        this.elBestStatsContainer.innerHTML = `
            <div class="best-stats-title">Best 3 Scores (10min Speed - Errors)</div>
            <div class="best-stats-grid">
                ${best3.map((item, i) => `
                    <div class="best-item best-item-${i + 1}">
                        <span class="best-rank">${i + 1}位 (${item.level}級)</span>
                        <span class="best-value">${item.score || 0}</span>
                        <span class="best-unit">pts</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    deleteRecord(index) {
        if (!confirm('この記録を削除しますか？')) return;
        this.history.splice(index, 1);
        localStorage.setItem('typing_history', JSON.stringify(this.history));
        this.showHistory();
    }

    renderChart() {
        const ctx = document.getElementById('speed-chart').getContext('2d');

        if (this.chart) {
            this.chart.destroy();
        }

        const recentData = [...this.history].slice(0, 10).reverse();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: recentData.map(d => d.date.split(' ')[0]),
                datasets: [{
                    label: '入力速度 (字/分)',
                    data: recentData.map(d => d.speed),
                    borderColor: '#2b579a',
                    backgroundColor: 'rgba(43, 87, 154, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '字 / 分'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }

    clearHistory() {
        if (confirm('すべての履歴を消去しますか？')) {
            this.history = [];
            localStorage.removeItem('typing_history');
            this.showHistory();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WordTypingApp();
});
