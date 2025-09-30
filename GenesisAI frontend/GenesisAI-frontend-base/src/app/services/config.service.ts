import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.local';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private config: any = null;

  constructor(private http: HttpClient) {}

  // loadConfig(): Promise<any> {

     
  //   return this.http
  //     .get('/api/config')
  //     .toPromise()
  //     .then((config) => {
  //       this.config = config;
  //     })
  //     .catch((error) => {
  //       this.config = environment;
  //       console.error('Could not load config from server', error);
  //     });
  // }

  get apiKey(): string {
    return this.config?.apiKey || environment.apiKey;
  }

  get apiUrl(): string {
    return this.config?.apiUrl || environment.apiUrl;
  }
}