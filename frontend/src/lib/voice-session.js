/** One microphone turn at a time, through the same scoped chat as typed messages. */
export class VoiceSession {
  constructor({ api, onQuestion, onState }) {
    Object.assign(this, { api, onQuestion, onState, active:false, epoch:0, phase:'idle' });
  }
  report(phase, message) { this.phase = phase; this.onState({ phase, message, active:this.active }); }
  current(epoch) { return this.active && this.epoch === epoch; }
  async start() {
    if (this.active) return;
    this.active = true;
    const epoch = ++this.epoch;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !AudioContext) throw new Error('Voice requires a supported browser on HTTPS or localhost. You can still type your question.');
      this.context = new AudioContext();
      this.report('permission', 'Allow microphone access to begin.');
      await this.context.resume();
      if (!this.current(epoch)) return;
      const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if (!this.current(epoch)) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      stream.getAudioTracks().forEach(track => { track.onended = () => { if (this.current(epoch)) this.stop('Microphone disconnected. Start voice again to reconnect.', true); }; });
      this.input = this.context.createMediaStreamSource(stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.input.connect(this.analyser);
      this.capture(epoch);
    } catch(error) { this.fail(error, epoch); }
  }
  capture(epoch) {
    if (!this.current(epoch)) return;
    try {
      this.stream.getAudioTracks().forEach(track => { track.enabled = true; });
      const type = ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(value => MediaRecorder.isTypeSupported(value));
      const recorder = this.recorder = new MediaRecorder(this.stream, type ? {mimeType:type} : undefined);
      const chunks = [];
      let bytes = 0;
      recorder.ondataavailable = event => {
        if (!this.current(epoch)) return;
        if (event.data.size) { chunks.push(event.data); bytes += event.data.size; }
        if (bytes > 6 * 1024 * 1024) this.stop('That recording is too large. Please ask a shorter question.', true);
      };
      recorder.onerror = () => this.fail(new Error('The microphone recording failed. Please try again.'), epoch);
      recorder.onstop = () => {
        if (this.current(epoch) && this.phase === 'transcribing') this.process(new Blob(chunks, {type:recorder.mimeType}), epoch).catch(error => this.fail(error, epoch));
      };
      recorder.start(500);
      this.report('listening', 'Listening… pause when you finish speaking.');
      const samples = new Float32Array(this.analyser.fftSize);
      const started = performance.now();
      let voiced = 0, lastVoice = started;
      const measure = () => {
        if (!this.current(epoch) || this.phase !== 'listening') return;
        this.analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum,value) => sum + value * value, 0) / samples.length);
        const now = performance.now();
        if (rms > .018) { voiced += 60; lastVoice = now; }
        if (voiced >= 180 && now - lastVoice > 1100 || now - started >= 30000 && voiced >= 180) { this.finishTurn(); return; }
        if (voiced < 180 && now - started > 15000) { this.stop('No speech detected. Start voice again, or type your question.'); return; }
        this.timer = setTimeout(measure, 60);
      };
      measure();
    } catch(error) { this.fail(error, epoch); }
  }
  finishTurn() {
    if (!this.active || this.phase !== 'listening' || this.recorder?.state !== 'recording') return;
    clearTimeout(this.timer);
    this.report('transcribing', 'Transcribing your question…');
    this.recorder.stop();
    this.stream.getAudioTracks().forEach(track => { track.enabled = false; });
  }
  async process(recording, epoch) {
    if (!recording.size) throw new Error('The recording was empty. Please try again.');
    const abort = this.abort = new AbortController();
    const transcript = await this.api.transcribe(recording, {signal:abort.signal});
    if (!this.current(epoch)) return;
    if (!transcript.text?.trim()) throw new Error('No speech was recognized. Please try again or type your question.');
    this.report('thinking', 'Navigator is thinking…');
    const reply = await this.onQuestion(transcript.text);
    if (!this.current(epoch)) return;
    if (!reply || !['ai_explanation_requires_review','guidance_not_ai'].includes(reply.generation_mode)) throw new Error(reply?.provider_error || 'The AI reply is unavailable. Please try again.');
    this.report('preparing', 'Preparing the spoken reply…');
    const audio = await this.api.speakReply({signal:abort.signal});
    if (!this.current(epoch)) return;
    const decoded = await this.context.decodeAudioData(audio);
    if (!this.current(epoch)) return;
    const playback = this.playback = this.context.createBufferSource();
    playback.buffer = decoded;
    playback.connect(this.context.destination);
    playback.onended = () => {
      playback.disconnect();
      if (this.current(epoch) && this.playback === playback) {
        this.playback = null;
        this.timer = setTimeout(() => this.capture(epoch), 250);
      }
    };
    this.report('speaking', 'Navigator is speaking…');
    playback.start();
  }
  interrupt() {
    if (!this.active || this.phase !== 'speaking') return;
    if (this.playback) { this.playback.onended = null; this.playback.stop(); this.playback.disconnect(); this.playback = null; }
    this.report('listening', 'Listening…');
    const epoch = this.epoch;
    this.timer = setTimeout(() => this.capture(epoch), 150);
  }
  fail(error, epoch) {
    if (!this.current(epoch)) return;
    const message = error.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in your browser, or type your question.' : error.name === 'NotFoundError' ? 'No microphone was found. Connect one, or type your question.' : error.name === 'NotReadableError' ? 'Your microphone is in use or unavailable. Check it and try again.' : error.message || 'Voice conversation failed. Please try again.';
    this.stop(message, true);
  }
  stop(message = 'Voice off. You can type or start voice again.', error = false) {
    this.active = false;
    this.epoch++;
    clearTimeout(this.timer);
    this.abort?.abort();
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    if (this.playback) { this.playback.onended = null; this.playback.stop(); this.playback.disconnect(); this.playback = null; }
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    this.input?.disconnect();
    this.context?.close().catch(() => {});
    this.stream = this.context = this.input = this.recorder = this.abort = null;
    this.report(error ? 'error' : 'idle', message);
  }
}
