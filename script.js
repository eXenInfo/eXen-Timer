document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const navTimerBtn = document.getElementById('nav-timer');
    const navAdminBtn = document.getElementById('nav-admin');
    const navHelpBtn = document.getElementById('nav-help');
    const timerView = document.getElementById('timer-view');
    const adminView = document.getElementById('admin-view');
    const helpView = document.getElementById('help-view');

    // Timer View Elements
    const liveTimerDisplay = document.getElementById('live-timer-display');
    const liveStageName = document.getElementById('live-stage-name');
    const liveTotalProgress = document.getElementById('live-total-progress');
    const liveStartBtn = document.getElementById('live-start-btn');
    const liveResetBtn = document.getElementById('live-reset-btn');
    const liveStagesListContainer = document.getElementById('live-stages-list');
    const liveDisciplineName = document.getElementById('live-discipline-name');

    // Admin View Elements
    const adminDisciplineSelect = document.getElementById('admin-discipline-select');
    const adminLoadBtn = document.getElementById('admin-load-btn');
    const adminExportSingleBtn = document.getElementById('admin-export-single-btn');
    const adminDeleteBtn = document.getElementById('admin-delete-btn');
    const editingDisciplineName = document.getElementById('editing-discipline-name');
    const adminStagesListContainer = document.getElementById('admin-stages-list');
    const addStageBtn = document.getElementById('add-stage-btn');
    const saveDisciplineBtn = document.getElementById('save-discipline-btn');
    const disciplineNameInput = document.getElementById('discipline-name-input');
    const exportAllBtn = document.getElementById('export-all-btn');
    const importBtn = document.getElementById('import-btn');
    const loadFromServerBtn = document.getElementById('load-from-server-btn'); // Button hier definiert
    
    // New Stage Form
    const newStageName = document.getElementById('new-stage-name');
    const newStagePrepTime = document.getElementById('new-stage-prep-time');
    const newStageDuration = document.getElementById('new-stage-duration');
    const newStageReps = document.getElementById('new-stage-reps');
    const newStagePause = document.getElementById('new-stage-pause');
    const newStageSoundStart = document.getElementById('new-stage-sound-start');
    const newStageSoundEnd = document.getElementById('new-stage-sound-end');
    const newStagePauseAfter = document.getElementById('new-stage-pause-after');

    // Edit Modal
    const editModal = document.getElementById('edit-modal');
    const editStageIndexInput = document.getElementById('edit-stage-index');
    const editStageNameInput = document.getElementById('edit-stage-name');
    const editStagePrepTimeInput = document.getElementById('edit-stage-prep-time');
    const editStageDurationInput = document.getElementById('edit-stage-duration');
    const editStageRepsInput = document.getElementById('edit-stage-reps');
    const editStagePauseInput = document.getElementById('edit-stage-pause');
    const editStageSoundStartInput = document.getElementById('edit-stage-sound-start');
    const editStageSoundEndInput = document.getElementById('edit-stage-sound-end');
    const editStagePauseAfterInput = document.getElementById('edit-stage-pause-after');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    
    // Import Modal
    const importModal = document.getElementById('import-modal');
    const importTextArea = document.getElementById('import-text-area');
    const processImportBtn = document.getElementById('process-import-btn');
    const cancelImportBtn = document.getElementById('cancel-import-btn');

    // --- App State ---
    let disciplines = {};
    let editorStages = [];
    let liveStages = [];
    let activeDisciplineName = '';
    
    let currentStageIndex = 0;
    let currentRepetition = 1;
    let timeLeft = 0;
    let timerInterval = null;
    let timerState = 'idle';

    let insertionIndex = -1;
    let audioInitialized = false;

    // --- View Management ---
    function switchView(viewName) {
        timerView.style.display = 'none';
        adminView.style.display = 'none';
        helpView.style.display = 'none';
        navTimerBtn.classList.remove('active');
        navAdminBtn.classList.remove('active');
        navHelpBtn.classList.remove('active');
        const views = {
            timer: { view: timerView, btn: navTimerBtn },
            admin: { view: adminView, btn: navAdminBtn },
            help: { view: helpView, btn: navHelpBtn }
        };
        if (views[viewName]) {
            views[viewName].view.style.display = 'flex';
            views[viewName].btn.classList.add('active');
        }
    }
    
    // --- Audio Context & Synth ---
    const initAudio = () => {
        if (audioInitialized || typeof Tone === 'undefined') return;
        if (Tone.context.state !== 'running') {
            Tone.start().then(() => {
                console.log("AudioContext started successfully.");
                audioInitialized = true;
            }).catch(e => console.error("Tone.js start failed:", e));
        } else {
            audioInitialized = true;
        }
    };
    function oneTimeAudioInit() {
        initAudio();
        document.body.removeEventListener('click', oneTimeAudioInit);
        document.body.removeEventListener('touchend', oneTimeAudioInit);
    }
    const playSound = () => {
        if (!audioInitialized) {
            console.warn("Audio not initialized.");
            return;
        }
        try {
// originalcode			
 //           const soundSynth = new Tone.Synth({
 //               oscillator: { type: "fatsquare", count: 3, spread: 40 },
 //              envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 }
 //           }).toDestination();
// edit Andreas Ton 880hz, mit schärferer Rechteckfunktion
			const soundSynth = new Tone.Synth({
                oscillator: { type: "square", count: 16, volume : -0.1},
                envelope: { attack: 0.002, decay: 0.025, sustain: 1, release: 0.01 }
            }).toDestination();
            soundSynth.triggerAttackRelease("A5", "0.5"); 
// end edit Andreas			
            setTimeout(() => { if(soundSynth) soundSynth.dispose(); }, 700);
        } catch (e) {
            console.error("Failed to play sound:", e);
        }
    };

    // --- Core Timer Logic ---
    const tick = () => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft > 0) return;
        clearInterval(timerInterval);
        timerInterval = null;
        const stage = liveStages[currentStageIndex];
        if (timerState === 'prep') {
            if (stage.soundAtStart) playSound();
        } else {
            if (stage.soundAtEnd) playSound();
        }
        setTimeout(handlePhaseEnd, 100);
    };
    const handlePhaseEnd = () => {
        const stage = liveStages[currentStageIndex];
        if (timerState === 'prep') {
            startMainDuration();
            return;
        }
        if (timerState === 'rep_pause') {
            startNextRepetition();
            return;
        }
        if (currentRepetition < stage.repetitions) {
            currentRepetition++;
            startInterRepPauseOrNextRep();
        } else {
            if (stage.pauseAfter && currentStageIndex < liveStages.length - 1) {
                pauseForNextStage();
            } else {
                advanceToNextStage();
            }
        }
    };
    const startMainDuration = () => {
        const stage = liveStages[currentStageIndex];
        timerState = 'running';
        timeLeft = stage.duration;
        updateUiForStateChange();
        if (timeLeft > 0) {
            timerInterval = setInterval(tick, 1000);
        } else {
            if (stage.soundAtEnd) playSound();
            setTimeout(handlePhaseEnd, 100);
        }
    };
    const startNextRepetition = () => {
        const stage = liveStages[currentStageIndex];
        timerState = 'running';
        timeLeft = stage.duration;
        if (stage.soundAtStart) playSound();
        updateUiForStateChange();
        if (timeLeft > 0) {
            timerInterval = setInterval(tick, 1000);
        } else {
            if (stage.soundAtEnd) playSound();
            setTimeout(handlePhaseEnd, 100);
        }
    };
    const startInterRepPauseOrNextRep = () => {
        const stage = liveStages[currentStageIndex];
        if (stage.pauseDuration > 0) {
            timerState = 'rep_pause';
            timeLeft = stage.pauseDuration;
            updateUiForStateChange();
            timerInterval = setInterval(tick, 1000);
        } else {
            startNextRepetition();
        }
    };
    const advanceToNextStage = () => {
        currentStageIndex++;
        currentRepetition = 1;
        if (currentStageIndex >= liveStages.length) {
            finishSequence();
        } else {
            prepareStage(currentStageIndex);
        }
    };
    const pauseForNextStage = () => {
        timerState = 'paused';
        updateUiForStateChange();
    };
    const startTimer = () => {
        initAudio();
        if (liveStages.length === 0) {
            alert("Bitte im Admin-Bereich eine Disziplin laden.");
            return;
        }
        if (timerState === 'paused') {
            currentStageIndex++;
            prepareStage(currentStageIndex);
            return;
        }
        if (timerState === 'idle' || timerState === 'finished') {
            if (timerState === 'finished') {
                currentStageIndex = 0;
            }
            loadStage();
        }
    };
    const resetCurrentDiscipline = () => {
        // 1. Stoppt den laufenden Timer-Loop
        clearInterval(timerInterval);
        timerInterval = null;

        if (liveStages.length > 0) {
            // 2. Setzt den Zustand der App auf den Anfang zurück
            currentStageIndex = 0;
            currentRepetition = 1;
            timerState = 'idle';

            // 3. (DIE KORREKTUR) Holt die allererste Phase der Disziplin
            const firstStage = liveStages[0];
            
            // 4. (DIE KORREKTUR) Setzt die globale Zeitvariable auf den Startwert dieser Phase
            //    (bevorzugt auf die Vorlaufzeit, falls vorhanden)
            timeLeft = firstStage.prepTime > 0 ? firstStage.prepTime : firstStage.duration;

            // 5. Aktualisiert die gesamte Benutzeroberfläche basierend auf dem neuen Zustand
            updateUiForStateChange();
            
        } else {
            // Fallback, falls keine Disziplin geladen ist
            timeLeft = 0;
            updateUiForStateChange();
        }
    };
    const finishSequence = () => {
        timerState = 'finished';
        updateUiForStateChange();
    };
    const prepareStage = (index) => {
        currentStageIndex = index;
        currentRepetition = 1;
        timerState = 'idle';
        updateUiForStateChange();
    };
    const loadStage = () => {
        const stage = liveStages[currentStageIndex];
        currentRepetition = 1;
        if (stage.prepTime > 0) {
            timerState = 'prep';
            timeLeft = stage.prepTime;
        } else {
            timerState = 'running';
            timeLeft = stage.duration;
            if (stage.soundAtStart) playSound();
        }
        updateUiForStateChange();
        if (timeLeft > 0) {
            timerInterval = setInterval(tick, 1000);
        } else {
            if (timerState === 'prep' && stage.soundAtStart) playSound();
            if (timerState === 'running' && stage.soundAtEnd) playSound();
            setTimeout(handlePhaseEnd, 100);
        }
    };

    // --- UI Update Logic ---
    const formatTime = (seconds) => {
        const s = Math.max(0, seconds);
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    }
    const updateTimerDisplay = () => liveTimerDisplay.textContent = formatTime(timeLeft);
    const updateUiForStateChange = () => {
        const stage = liveStages[currentStageIndex];
        liveStartBtn.classList.add('hidden');
        liveResetBtn.classList.add('hidden');
        if (!liveStages || liveStages.length === 0) {
            liveStageName.textContent = 'Disziplin laden...';
            liveTotalProgress.textContent = 'Bitte im Admin-Bereich eine Disziplin laden.';
            liveDisciplineName.textContent = '-';
            liveTimerDisplay.textContent = '00:00';
            return;
        }
        switch(timerState) {
            case 'idle':
                liveStageName.textContent = stage.name;
                liveTimerDisplay.textContent = formatTime(stage.prepTime > 0 ? stage.prepTime : stage.duration);
                liveTotalProgress.textContent = `Bereit für Phase ${currentStageIndex + 1} von ${liveStages.length}. Zum Starten 'Start' drücken.`;
                liveStartBtn.classList.remove('hidden');
                liveStartBtn.textContent = 'Start';
                liveStartBtn.className = 'w-full max-w-xs bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors';
                if (currentStageIndex > 0) {
                    liveResetBtn.classList.remove('hidden');
                }
                break;
            case 'prep':
            case 'running':
            case 'rep_pause':
                liveResetBtn.classList.remove('hidden');
                if (timerState === 'prep') {
                    liveStageName.textContent = 'Vorbereitung';
                } else if (timerState === 'running') {
                    const repText = stage.repetitions > 1 ? ` (${currentRepetition}/${stage.repetitions})` : '';
                    liveStageName.textContent = stage.name + repText;
                } else {
                    liveStageName.textContent = 'Pause';
                }
                liveTotalProgress.textContent = `Phase ${currentStageIndex + 1} von ${liveStages.length} läuft...`;
                break;
            case 'paused':
                liveStageName.textContent = `Bereit für nächste Phase`;
                liveTotalProgress.textContent = `Phase ${currentStageIndex + 1} von ${liveStages.length} beendet.`;
                liveTimerDisplay.textContent = formatTime(0);
                liveStartBtn.classList.remove('hidden');
                liveStartBtn.textContent = 'Weiter';
                liveStartBtn.className = 'w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors';
                liveResetBtn.classList.remove('hidden');
                break;
            case 'finished':
                liveStageName.textContent = 'Fertig!';
                liveTotalProgress.textContent = `Ablauf beendet.`;
                liveTimerDisplay.textContent = formatTime(0);
                liveResetBtn.classList.remove('hidden');
                break;
        }
        updateTimerDisplay();
    };
    const renderLiveStagesList = () => {
        liveStagesListContainer.innerHTML = '';
        if (!liveStages || liveStages.length === 0) {
            liveStagesListContainer.innerHTML = `<p class="text-gray-500 text-center italic">Kein Ablauf geladen.</p>`;
            return;
        }
        liveStages.forEach((stage, index) => {
            const prepText = stage.prepTime > 0 ? `${stage.prepTime}s Vorl. + ` : '';
            const repText = stage.repetitions > 1 ? ` &times; ${stage.repetitions}` : '';
            const pauseText = stage.pauseDuration > 0 ? ` (+${stage.pauseDuration}s Pause)` : '';
            let soundText = '';
            if (stage.soundAtStart && stage.soundAtEnd) soundText = 'Start/End-Ton';
            else if (stage.soundAtStart) soundText = 'Start-Ton';
            else if (stage.soundAtEnd) soundText = 'End-Ton';
            const pauseAfterText = stage.pauseAfter ? ' | Pause nachher' : '';
            const stageEl = document.createElement('div');
            stageEl.className = 'bg-gray-700 p-3 rounded-lg flex items-center justify-between';
            stageEl.innerHTML = `<div class="flex items-center flex-grow min-w-0"><span class="font-bold text-gray-400 mr-4">${index + 1}.</span><div class="min-w-0"><p class="text-white font-semibold stage-name-display break-word">${stage.name}</p><p class="text-xs text-gray-300 break-word">${prepText}${stage.duration}s ${repText}${pauseText} ${soundText}${pauseAfterText}</p></div></div><button data-action="start-from" data-index="${index}" title="Von hier starten" class="p-2 text-green-400 hover:bg-green-700 hover:text-white rounded-md flex-shrink-0 transition-colors"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg></button>`;
            liveStagesListContainer.appendChild(stageEl);
        });
    };
    const renderAdminStagesList = () => {
        adminStagesListContainer.innerHTML = '';
        const createInsertButton = (index) => {
            const btn = document.createElement('button');
            btn.className = 'insert-btn w-full p-1.5 bg-gray-700 hover:bg-amber-500 text-gray-400 hover:text-gray-900 rounded-md transition-colors text-xs font-bold';
            btn.textContent = 'HIER EINFÜGEN';
            btn.dataset.index = index;
            btn.addEventListener('click', () => {
                insertionIndex = index;
                document.querySelectorAll('.insert-btn').forEach(b => b.classList.remove('bg-amber-500', 'text-gray-900'));
                btn.classList.add('bg-amber-500', 'text-gray-900');
            });
            adminStagesListContainer.appendChild(btn);
        };
        createInsertButton(0);
        if (editorStages.length === 0) {
             document.querySelector(`.insert-btn[data-index='0']`)?.classList.add('bg-amber-500', 'text-gray-900');
             insertionIndex = 0;
        } else {
            editorStages.forEach((stage, index) => {
                const prepText = stage.prepTime > 0 ? `${stage.prepTime}s Vorl. + ` : '';
                const repText = stage.repetitions > 1 ? ` &times; ${stage.repetitions}` : '';
                const pauseText = stage.pauseDuration > 0 ? ` (+${stage.pauseDuration}s Pause)` : '';
                let soundText = '';
                if (stage.soundAtStart && stage.soundAtEnd) soundText = 'Start/End-Ton';
                else if (stage.soundAtStart) soundText = 'Start-Ton';
                else if (stage.soundAtEnd) soundText = 'End-Ton';
                const pauseAfterText = stage.pauseAfter ? ' | Pause nachher' : '';
                const stageEl = document.createElement('div');
                stageEl.className = 'bg-gray-700 p-2 rounded-lg flex items-center justify-between';
                stageEl.dataset.index = index;
                stageEl.innerHTML = `<div class="flex items-center flex-grow cursor-pointer min-w-0" data-action="edit"><span class="font-bold text-gray-400 mr-3">${index + 1}.</span><div class="flex-grow min-w-0"><p class="text-white font-semibold stage-name-display break-word">${stage.name}</p><p class="text-xs text-gray-300 break-word">${prepText}${stage.duration}s ${repText}${pauseText} ${soundText}${pauseAfterText}</p></div></div><div class="stage-controls flex items-center flex-shrink-0 ml-2"><button data-action="duplicate" title="Duplizieren" class="p-1 hover:bg-gray-600 rounded-md"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button><button data-action="move-up" title="Nach oben" ${index === 0 ? 'disabled' : ''} class="p-1 hover:bg-gray-600 rounded-md"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg></button><button data-action="move-down" title="Nach unten" ${index === editorStages.length - 1 ? 'disabled' : ''} class="p-1 hover:bg-gray-600 rounded-md"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button><button data-action="remove" title="Löschen" class="p-1 text-red-500 hover:bg-red-700 hover:text-white rounded-md ml-1"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button></div>`;
                stageEl.addEventListener('click', (e) => {
                    const action = e.target.closest('button')?.dataset.action || e.target.closest('[data-action="edit"]')?.dataset.action;
                    if (!action) return;
                    switch (action) {
                        case 'edit': openEditModal(index); break;
                        case 'remove': removeStage(index); break;
                        case 'move-up': moveStage(index, -1); break;
                        case 'move-down': moveStage(index, 1); break;
                        case 'duplicate': duplicateStage(index); break;
                    }
                });
                adminStagesListContainer.appendChild(stageEl);
                createInsertButton(index + 1);
            });
        }
        if(insertionIndex === -1 || insertionIndex > editorStages.length) {
             insertionIndex = editorStages.length;
        }
        document.querySelector(`.insert-btn[data-index='${insertionIndex}']`)?.classList.add('bg-amber-500', 'text-gray-900');
    };

    // --- Admin Logic ---
    const addStage = () => {
        const duration = parseInt(newStageDuration.value);
        if (!duration || isNaN(duration) || duration < 1) { alert("Bitte geben Sie eine gültige Dauer (mind. 1s) an."); return; }
        const newStage = { 
            name: newStageName.value.trim() || 'Unbenannte Phase',
            prepTime: parseInt(newStagePrepTime.value) || 0,
            duration: duration,
            repetitions: parseInt(newStageReps.value) || 1,
            pauseDuration: parseInt(newStagePause.value) || 0,
            soundAtStart: newStageSoundStart.checked, 
            soundAtEnd: newStageSoundEnd.checked,
            pauseAfter: newStagePauseAfter.checked
        };
        const finalInsertionIndex = (insertionIndex === -1) ? editorStages.length : insertionIndex;
        editorStages.splice(finalInsertionIndex, 0, newStage);
        insertionIndex = finalInsertionIndex + 1;
        renderAdminStagesList();
        newStageName.value = '';
        newStagePrepTime.value = '';
        newStageDuration.value = '';
        newStageReps.value = '';
        newStagePause.value = '';
        newStageSoundStart.checked = false;
        newStageSoundEnd.checked = true;
        newStagePauseAfter.checked = false;
    };
    const removeStage = (index) => {
        editorStages.splice(index, 1);
        renderAdminStagesList();
    };
    const moveStage = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= editorStages.length) return;
        [editorStages[index], editorStages[newIndex]] = [editorStages[newIndex], editorStages[index]];
        renderAdminStagesList();
    };
    const duplicateStage = (index) => {
        const stageToDuplicate = JSON.parse(JSON.stringify(editorStages[index]));
        editorStages.splice(index + 1, 0, stageToDuplicate);
        insertionIndex = index + 2;
        renderAdminStagesList();
    };
    const openEditModal = (index) => {
        const stage = editorStages[index];
        editStageIndexInput.value = index;
        editStageNameInput.value = stage.name;
        editStagePrepTimeInput.value = stage.prepTime || 0;
        editStageDurationInput.value = stage.duration;
        editStageRepsInput.value = stage.repetitions;
        editStagePauseInput.value = stage.pauseDuration || 0;
        editStageSoundStartInput.checked = stage.soundAtStart;
        editStageSoundEndInput.checked = stage.soundAtEnd;
        editStagePauseAfterInput.checked = stage.pauseAfter;
        editModal.classList.remove('hidden');
    };
    const closeEditModal = () => editModal.classList.add('hidden');
    const handleUpdateStage = () => {
        const index = parseInt(editStageIndexInput.value);
        const duration = parseInt(editStageDurationInput.value);
        if (!duration || isNaN(duration) || duration < 1) { alert("Bitte geben Sie eine gültige Dauer (mind. 1s) an."); return; }
        editorStages[index] = {
            name: editStageNameInput.value.trim() || 'Unbenannte Phase',
            prepTime: parseInt(editStagePrepTimeInput.value) || 0,
            duration: duration,
            repetitions: parseInt(editStageRepsInput.value) || 1,
            pauseDuration: parseInt(editStagePauseInput.value) || 0,
            soundAtStart: editStageSoundStartInput.checked,
            soundAtEnd: editStageSoundEndInput.checked,
            pauseAfter: editStagePauseAfterInput.checked
        };
        renderAdminStagesList();
        closeEditModal();
    };

    // --- Data Management ---
    const renderDisciplineSelector = () => {
        const currentAdminSelection = adminDisciplineSelect.value;
        adminDisciplineSelect.innerHTML = '';
        const names = Object.keys(disciplines).sort((a, b) => a.localeCompare(b));
        if (names.length === 0) {
            adminDisciplineSelect.innerHTML = `<option>Keine Disziplinen</option>`;
            adminLoadBtn.disabled = true;
            adminDeleteBtn.disabled = true;
            return;
        }
        names.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            adminDisciplineSelect.appendChild(option);
        });
        if (disciplines[currentAdminSelection]) adminDisciplineSelect.value = currentAdminSelection;
        adminLoadBtn.disabled = false;
        adminDeleteBtn.disabled = false;
    };
    const saveDisciplinesToStorage = () => {
        try {
            localStorage.setItem('bdmpTimerDisciplines', JSON.stringify(disciplines));
            localStorage.setItem('bdmpTimerActiveDiscipline', activeDisciplineName);
        } catch (e) {
            console.error("Failed to save to localStorage", e);
            alert("Fehler beim Speichern der Daten. Der Speicher könnte voll sein.");
        }
    };
    const loadDisciplinesFromStorage = () => {
        const stored = localStorage.getItem('bdmpTimerDisciplines');
        if (stored) {
            try {
                disciplines = JSON.parse(stored);
            } catch {
                disciplines = {};
            }
        } else {
            disciplines = {}; // Start with no defaults, user must load them.
        }
        const lastActive = localStorage.getItem('bdmpTimerActiveDiscipline');
        if (lastActive && disciplines[lastActive]) {
            loadDisciplineForTimer(lastActive, false);
        }
        renderDisciplineSelector();
    };
    function handleSaveDiscipline() {
        const name = disciplineNameInput.value.trim();
        if (!name) { alert("Bitte geben Sie einen Namen an."); return; }
        if (editorStages.length === 0) { alert("Ablauf ist leer und kann nicht gespeichert werden."); return; }
        if (disciplines[name] && disciplineNameInput.value !== adminDisciplineSelect.value) {
            if (!confirm(`Die Disziplin "${name}" existiert bereits. Möchten Sie sie überschreiben?`)) {
                return;
            }
        }
        disciplines[name] = JSON.parse(JSON.stringify(editorStages));
        saveDisciplinesToStorage();
        renderDisciplineSelector();
        adminDisciplineSelect.value = name;
        alert(`Disziplin "${name}" wurde gespeichert!`);
    }
    function handleDeleteDiscipline() {
        const name = adminDisciplineSelect.value;
        if (disciplines[name] && confirm(`Disziplin "${name}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`)) {
            delete disciplines[name];
            if (activeDisciplineName === name) {
                activeDisciplineName = '';
                liveStages = [];
                resetCurrentDiscipline();
                renderLiveStagesList();
                liveDisciplineName.textContent = '-';
            }
            if (disciplineNameInput.value === name) {
                editorStages = [];
                disciplineNameInput.value = '';
                editingDisciplineName.textContent = 'Neue Disziplin';
                renderAdminStagesList();
            }
            saveDisciplinesToStorage();
            renderDisciplineSelector();
        }
    }
    function loadDisciplineForEditor(name) {
        if (disciplines[name]) {
            editorStages = JSON.parse(JSON.stringify(disciplines[name]));
            disciplineNameInput.value = name;
            editingDisciplineName.textContent = name;
            insertionIndex = editorStages.length;
            renderAdminStagesList();
        }
    }
    function loadDisciplineForTimer(name, doSwitchView = true) {
        if (disciplines[name]) {
            liveStages = JSON.parse(JSON.stringify(disciplines[name]));
            activeDisciplineName = name;
            liveDisciplineName.textContent = name;
            saveDisciplinesToStorage();
            renderLiveStagesList();
            resetCurrentDiscipline();
            if (doSwitchView) {
                switchView('timer');
            }
        } else {
            alert(`Disziplin "${name}" konnte nicht gefunden werden.`);
        }
    }
    
    // --- Import / Export via Clipboard ---
    function copyToClipboard(text, successMessage) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; 
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alert(successMessage);
        } catch (err) {
            console.error('Fehler beim Kopieren in die Zwischenablage: ', err);
            alert('Kopieren fehlgeschlagen. Bitte manuell kopieren.');
        }
        document.body.removeChild(textArea);
    }
    function handleExportAll() {
        if (Object.keys(disciplines).length === 0) {
            alert("Keine Disziplinen zum Kopieren vorhanden.");
            return;
        }
        const dataStr = JSON.stringify(disciplines, null, 2);
        copyToClipboard(dataStr, "Die gesamte Sammlung wurde in die Zwischenablage kopiert.");
    }
    function handleExportSingle() {
        const name = adminDisciplineSelect.value;
        if (!disciplines[name]) {
            alert("Bitte wählen Sie eine gültige Disziplin zum Kopieren aus.");
            return;
        }
        const singleDiscipline = { [name]: disciplines[name] };
        const dataStr = JSON.stringify(singleDiscipline, null, 2);
        copyToClipboard(dataStr, `Disziplin "${name}" wurde in die Zwischenablage kopiert.`);
    }
    function handleImport() {
        importTextArea.value = '';
        importModal.classList.remove('hidden');
    }
    function processImportFromText() {
        const importedData = importTextArea.value;
        if (!importedData.trim()) {
            alert("Das Textfeld ist leer. Bitte fügen Sie Daten ein.");
            return;
        }
        try {
            const importedDisciplines = JSON.parse(importedData);
            let importedCount = 0;
            let overwrittenCount = 0;
            for (const name in importedDisciplines) {
                if (Object.prototype.hasOwnProperty.call(importedDisciplines, name) && Array.isArray(importedDisciplines[name])) {
                    if (disciplines[name]) {
                        if (confirm(`Disziplin "${name}" existiert bereits. Möchten Sie sie mit der importierten Version überschreiben?`)) {
                            disciplines[name] = importedDisciplines[name];
                            overwrittenCount++;
                        }
                    } else {
                        disciplines[name] = importedDisciplines[name];
                        importedCount++;
                    }
                }
            }
            if (importedCount > 0 || overwrittenCount > 0) {
                saveDisciplinesToStorage();
                renderDisciplineSelector();
                loadDisciplineForEditor(adminDisciplineSelect.value);
                alert(`${importedCount} Disziplin(en) neu importiert, ${overwrittenCount} überschrieben.`);
            } else {
                alert("Keine neuen oder zu überschreibenden Disziplinen in den Daten gefunden.");
            }
        } catch (e) {
            alert("Fehler beim Verarbeiten der Daten. Stellen Sie sicher, dass der Text das korrekte Format hat.");
            console.error(e);
        } finally {
            importModal.classList.add('hidden');
        }
    }

    // --- Standard-Disziplinen vom Server laden ---
    async function loadDisciplinesFromServer() {
        if (!confirm("Möchten Sie die Standard-Disziplinen laden? Bestehende Disziplinen mit gleichem Namen werden überschrieben.")) {
            return;
        }
        try {
            const response = await fetch('disziplinen.txt');
            if (!response.ok) {
                throw new Error(`Netzwerk-Fehler: Die Datei konnte nicht gefunden werden (Status: ${response.status})`);
            }
            const serverDisciplines = await response.json();
            let importedCount = 0;
            let overwrittenCount = 0;
            for (const name in serverDisciplines) {
                if (disciplines[name]) {
                    overwrittenCount++;
                } else {
                    importedCount++;
                }
                disciplines[name] = serverDisciplines[name];
            }
            if (importedCount > 0 || overwrittenCount > 0) {
                saveDisciplinesToStorage();
                renderDisciplineSelector();
                loadDisciplineForEditor(adminDisciplineSelect.value);
                alert(`${importedCount} neue Disziplin(en) importiert und ${overwrittenCount} bestehende überschrieben.`);
            } else {
                alert("Keine neuen Disziplinen zum Importieren gefunden.");
            }
        } catch (error) {
            console.error('Fehler beim Laden der Standard-Disziplinen:', error);
            alert('Fehler: Die Disziplinen konnten nicht geladen werden. Prüfen Sie, ob die "disziplinen.txt" gültiges JSON enthält.');
        }
    }
    
    // --- Event Listeners ---
    document.body.addEventListener('click', oneTimeAudioInit);
    document.body.addEventListener('touchend', oneTimeAudioInit);
    navTimerBtn.addEventListener('click', () => switchView('timer'));
    navAdminBtn.addEventListener('click', () => switchView('admin'));
    navHelpBtn.addEventListener('click', () => switchView('help'));
    liveStartBtn.addEventListener('click', startTimer);
    liveResetBtn.addEventListener('click', resetCurrentDiscipline);
    liveStagesListContainer.addEventListener('click', (event) => {
        const startButton = event.target.closest('button[data-action="start-from"]');
        if (startButton) {
            initAudio();
            const index = parseInt(startButton.dataset.index, 10);
            if (!isNaN(index)) {
                clearInterval(timerInterval);
                timerInterval = null;
                prepareStage(index);
            }
        }
    });
    addStageBtn.addEventListener('click', addStage);
    saveDisciplineBtn.addEventListener('click', handleSaveDiscipline);
    adminLoadBtn.addEventListener('click', () => loadDisciplineForTimer(adminDisciplineSelect.value));
    adminExportSingleBtn.addEventListener('click', handleExportSingle);
    adminDisciplineSelect.addEventListener('change', () => loadDisciplineForEditor(adminDisciplineSelect.value));
    adminDeleteBtn.addEventListener('click', handleDeleteDiscipline);
    saveEditBtn.addEventListener('click', handleUpdateStage);
    cancelEditBtn.addEventListener('click', closeEditModal);
    exportAllBtn.addEventListener('click', handleExportAll);
    importBtn.addEventListener('click', handleImport);
    cancelImportBtn.addEventListener('click', () => importModal.classList.add('hidden'));
    processImportBtn.addEventListener('click', processImportFromText);
    if(loadFromServerBtn) {
        loadFromServerBtn.addEventListener('click', loadDisciplinesFromServer);
    }

    // --- Initial Load ---
    loadDisciplinesFromStorage();
    updateUiForStateChange();
    if (Object.keys(disciplines).length > 0) {
        loadDisciplineForEditor(adminDisciplineSelect.value);
    } else {
        renderAdminStagesList();
    }
});

