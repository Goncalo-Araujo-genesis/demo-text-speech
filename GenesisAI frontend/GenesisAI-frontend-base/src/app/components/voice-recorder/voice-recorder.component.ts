import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';
import { faMicrophoneLines } from '@fortawesome/free-solid-svg-icons';
import { faStop } from '@fortawesome/free-solid-svg-icons';
import { RequestService } from 'src/app/services/request/request.service';

@Component({
  selector: 'app-voice-recorder',
  templateUrl: './voice-recorder.component.html',
  styleUrls: ['./voice-recorder.component.scss'],
})
export class VoiceRecorderComponent {
  @Output() onNewPrompt = new EventEmitter<any>();

  @ViewChild('visualizer', { static: false }) visualizer!: ElementRef;

  faMicrophone = faMicrophoneLines;
  faStop = faStop;

  isRecording = false;
  isSending = false;
  mediaRecorder!: MediaRecorder;
  audioChunks: Blob[] = [];
  transcribedText: string = '';
  recognition!: any;

  audioContext!: AudioContext;
  analyser!: AnalyserNode;
  dataArray!: Uint8Array;
  animationFrame!: number;

  currentLanguage: string = 'pt';
  currentModel: string = 'gpt4o';

  constraintsAudio: MediaStreamConstraints = {
    audio: {
      sampleRate: 16000, //44100 = 44.1kHz is a common sample rate
      channelCount: 1, // 1 - Mono | 2 - Stereo
      echoCancellation: false,
      noiseSuppression: false,
    },
  };

  constructor(private requestService: RequestService) {}

  async toggleRecording() {
    if (this.isSending && !this.isRecording) {
      return;
    }

    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    this.isRecording = true;
    const stream = await navigator.mediaDevices.getUserMedia(
      this.constraintsAudio
    );
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 16000, // 128000 - 128bit | Bitrate, set as per your requirements
    });
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.saveAudio();
      this.playEndSound();
    };

    this.mediaRecorder.start();
    // this.startSpeechRecognition();
    this.startVisualizer(stream);
  }

  stopRecording() {
    this.isRecording = false;
    this.mediaRecorder.stop();
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  saveAudio() {
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
    // this.downloadAudio(audioBlob);
    this.uploadAudio(audioBlob);
    this.audioChunks = [];
  }

  downloadAudio(audioBlob: Blob) {
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async uploadAudio(audioBlob: Blob) {
    if (!audioBlob) {
      return;
    }

    try {
      this.isSending = true;
      const promptData: any = await this.requestService.sendAudio(audioBlob);
      this.onNewPrompt.emit(promptData);
    } catch (error: any) {
      console.log(error);
    } finally {
      this.isSending = false;
    }
  }

  startSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = navigator.language || 'en-US';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      this.transcribedText = event.results[0][0].transcript;
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event);
    };

    this.recognition.start();
  }

  startVisualizer(stream: MediaStream) {
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    source.connect(this.analyser);
    this.analyser.fftSize = 256;

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    const visualize = () => {
      this.analyser.getByteFrequencyData(this.dataArray);
      const avgVolume =
        this.dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      const scale = avgVolume / 64; // Normalize volume range

      if (this.visualizer) {
        this.visualizer.nativeElement.style.transform = `scaleY(${Math.max(
          scale,
          0.2
        )})`;
      }

      this.animationFrame = requestAnimationFrame(visualize);
    };

    visualize();
  }

  playEndSound() {
    const audio = new Audio('assets/voice-recorded.mp3');
    audio.play();
  }
}
