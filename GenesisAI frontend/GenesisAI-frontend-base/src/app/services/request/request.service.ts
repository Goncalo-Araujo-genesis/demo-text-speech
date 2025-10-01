import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest  } from '@angular/common/http';
import { EMPTY, lastValueFrom, Observable } from 'rxjs';
import { ConfigService } from '../config.service'

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private maxTokens;
  private headers;

  constructor(private http: HttpClient,
    private configService: ConfigService
  ) {
    this.maxTokens = 2000;
    this.headers = {
      'api-key': '',
      'context-key': this.generateRandomString(),
      'Content-Type': 'application/json',
    };
  }

  private generateRandomString(): string {
    const randomChars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let random = '';

    for (let i = 0; i < 32; i++) {
      random += randomChars.charAt(
        Math.floor(Math.random() * randomChars.length)
      );
    }

    return random;
  }

  refreshContextKey(): void {
    this.headers['context-key'] = this.generateRandomString();
  }
  
  async fetchStream(prompt: string,language: string, gpt_model: string,survey_option?: string): Promise<Observable<string>> {

    const data: {
      prompt: string;
      language: string;
      gpt_model: string;
      survey_option?: string;
    } = {
      prompt,
      language,
      gpt_model,
    };
  
    if (survey_option !== undefined) {
      data.survey_option = survey_option;
    }

    this.headers['api-key'] = this.configService.apiKey;
    //this.configService.apiUrl+
    const response = await fetch(this.configService.apiUrl+"/genesisai-completions", {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data)
    });
  
    if (!response.body) {
      console.error('No response body');
      return EMPTY;
    }
  
    const reader = response.body.getReader();
    let charsReceived = 0;
  
    return new Observable(observer => {
      const readStream = async () => {
        const { value, done } = await reader.read();
        if (done) {
          observer.complete();
        } else {
          observer.next(new TextDecoder().decode(value));
          charsReceived += value.length;
          readStream();
        }
      };
      readStream();
    });
  }

  async sendFeedback(feedback: string, message_id: string){

    const data: {
      message_id: string,
      feedback: string
    } = {
      message_id,
      feedback
    };

    this.headers['api-key'] = this.configService.apiKey;
    this.http.post<any>(this.configService.apiUrl+"/genesisai-feedback", data, { headers: this.headers }).subscribe({
      error: (error) => {
        console.log(error);
      },
    });
  }

  languageCode(language: any): string {
    switch(language){
      case 'pt':
        return 'pt-PT';
      case 'en':
        return 'en-GB';
      default:
        return 'pt-PT';
    }
  }

  async sendAudio(audioBlob: Blob) {
    const headers = {
      'api-key': this.configService.apiKey,
      'context-key': this.generateRandomString(),
      'language': this.languageCode(localStorage.getItem('language'))
    }
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');

    const response = await lastValueFrom(this.http.post<any>(this.configService.apiUrl+"/genesisai-speech", formData, { headers: headers }));

    if (!response.text) {
      console.error('No response body');
      return null;
    }
  
    return response;
  }


  async sendTextToSpeech(text: string, language: string, voiceName?: string): Promise<Blob> {
  try {
    const headers = {
      'api-key': this.configService.apiKey,
      'Content-Type': 'application/json'
    };

    const body: any = {
      text: text,
      language: this.languageCode(language)
    };

    if (voiceName) {
      body.voice_name = voiceName;
    }

    const response = await lastValueFrom(
      this.http.post(
        this.configService.apiUrl + "/genesisai-text-to-speech",
        body,
        {
          headers: headers,
          responseType: 'blob'
        }
      )
    );

    return response as Blob;
  } catch (error) {
    console.error('Error in sendTextToSpeech:', error);
    throw error;
  }
}

}


