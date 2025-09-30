import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private loginEnabledSubject = new BehaviorSubject<boolean>(false);
  public loginEnabled$ = this.loginEnabledSubject.asObservable();

  constructor() {
    // Load saved configuration from localStorage
    const savedConfig = localStorage.getItem('app-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.loginEnabledSubject.next(config.loginEnabled || false);
      } catch (error) {
        console.warn('Failed to parse app config from localStorage', error);
      }
    }
  }

  /**
   * Set login enabled state and save to localStorage
   */
  setLoginEnabled(enabled: boolean): void {
    this.loginEnabledSubject.next(enabled);
    this.saveConfig();
  }

  /**
   * Get current login enabled state
   */
  isLoginEnabled(): boolean {
    return this.loginEnabledSubject.value;
  }

  /**
   * Save current configuration to localStorage
   */
  private saveConfig(): void {
    const config = {
      loginEnabled: this.loginEnabledSubject.value
    };
    localStorage.setItem('app-config', JSON.stringify(config));
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.loginEnabledSubject.next(false);
    localStorage.removeItem('app-config');
  }
}
