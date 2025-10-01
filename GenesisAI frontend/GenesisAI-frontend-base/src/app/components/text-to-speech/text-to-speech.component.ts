import {
  Component,
  Input,
  OnDestroy,
} from '@angular/core';
import { faVolumeHigh, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { RequestService } from 'src/app/services/request/request.service';

@Component({
  selector: 'app-text-to-speech',
  templateUrl: './text-to-speech.component.html',
  styleUrls: ['./text-to-speech.component.scss'],
})
export class TextToSpeechComponent implements OnDestroy {
  @Input() text: string = '';
  @Input() language: string = 'pt-PT';
  @Input() voiceName?: string;

  faVolumeHigh = faVolumeHigh;
  faSpinner = faSpinner;

  isPlaying = false;
  isLoading = false;
  currentAudio: HTMLAudioElement | null = null;

  constructor(private requestService: RequestService) {}

  ngOnDestroy() {
    this.stopAudio();
  }

  async toggleSpeech() {
    if (this.isPlaying) {
      this.stopAudio();
    } else {
      await this.playTextToSpeech();
    }
  }

  async playTextToSpeech() {
  if (!this.text || this.isLoading) {
    return;
  }

  try {
    this.isLoading = true;
    
    // Limpar HTML tags do texto
    const cleanText = this.stripHtmlTags(this.text);
    
    const audioBlob = await this.requestService.sendTextToSpeech(
      cleanText,
      this.language,
      this.voiceName
    );

    if (audioBlob) {
      this.playAudio(audioBlob);
    }
  } catch (error: any) {
    console.error('Error generating speech:', error);
  } finally {
    this.isLoading = false;
  }
}

// Adicione este método novo
private stripHtmlTags(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

  playAudio(audioBlob: Blob) {
    this.stopAudio();

    const url = URL.createObjectURL(audioBlob);
    this.currentAudio = new Audio(url);

    this.currentAudio.onplay = () => {
      this.isPlaying = true;
    };

    this.currentAudio.onended = () => {
      this.cleanup();
    };

    this.currentAudio.onerror = (error) => {
      console.error('Error playing audio:', error);
      this.cleanup();
    };

    this.currentAudio.play().catch((error) => {
      console.error('Error starting audio playback:', error);
      this.cleanup();
    });
  }

  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.cleanup();
    }
  }

  cleanup() {
    if (this.currentAudio) {
      const url = this.currentAudio.src;
      this.currentAudio = null;
      URL.revokeObjectURL(url);
    }
    this.isPlaying = false;
  }
}