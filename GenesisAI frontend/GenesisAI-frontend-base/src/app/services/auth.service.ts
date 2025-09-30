import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, from, throwError } from 'rxjs';
import { tap, map, switchMap, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  // Flag to enable/disable login functionality
  private loginEnabled = false;

  // Flag to show/hide policy agreement text
  private policyAgreementEnabled = false;
  private policyAgreementSubject = new BehaviorSubject<boolean>(false);
  public policyAgreementEnabled$ = this.policyAgreementSubject.asObservable();

  // Flag to allow/disallow logout functionality
  private logoutAllowed = false;
  private logoutAllowedSubject = new BehaviorSubject<boolean>(false);
  public logoutAllowed$ = this.logoutAllowedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    // Check if user is already logged in on service initialization
    this.checkAuthStatus();
  }

  /**
   * Enable or disable login functionality
   */
  setLoginEnabled(enabled: boolean): void {
    this.loginEnabled = enabled;
    if (!enabled) {
      // If login is disabled, consider user as authenticated
      this.isLoggedInSubject.next(true);
    } else {
      // If login is enabled, check actual auth status
      this.checkAuthStatus();
    }
  }

  /**
   * Enable or disable policy agreement text
   */
  setPolicyAgreementEnabled(enabled: boolean): void {
    this.policyAgreementEnabled = enabled;
    this.policyAgreementSubject.next(enabled);
  }

  /**
   * Enable or disable logout functionality
   */
  setLogoutAllowed(allowed: boolean): void {
    this.logoutAllowed = allowed;
    this.logoutAllowedSubject.next(allowed);
  }

  /**
   * Check if policy agreement is enabled
   */
  isPolicyAgreementEnabled(): boolean {
    return this.policyAgreementEnabled;
  }

  /**
   * Check if logout is allowed
   */
  isLogoutAllowed(): boolean {
    return this.logoutAllowed;
  }

  /**
   * Check if login functionality is enabled
   */
  isLoginEnabled(): boolean {
    return this.loginEnabled;
  }

  /**
   * Check current authentication status
   */
  private checkAuthStatus(): void {
    const token = this.getToken();
    const isAuthenticated = !!token && !this.isTokenExpired(token);
    this.isLoggedInSubject.next(isAuthenticated);
  }

  /**
   * Login user with username and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    // For development, use mock service if environment is local
    const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      // Import mock service dynamically and return Observable
      return from(import('./mock-auth.service')).pipe(
        switchMap(module => {
          const mockService = new module.MockAuthService();
          return mockService.mockLogin(credentials);
        }),
        tap(response => {
          if (response.token) {
            this.setToken(response.token);
            this.isLoggedInSubject.next(true);
          }
        }),
        catchError(error => {
          return throwError(() => new Error(error.message || 'Login failed'));
        })
      );
    }

    // Production login
    const loginUrl = `${this.configService.apiUrl}/auth/login`;
    
    return this.http.post<LoginResponse>(loginUrl, credentials).pipe(
      tap(response => {
        if (response.token) {
          this.setToken(response.token);
          this.isLoggedInSubject.next(true);
        }
      })
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    this.removeToken();
    this.isLoggedInSubject.next(false);
  }

  /**
   * Get current authentication status
   */
  isAuthenticated(): boolean {
    if (!this.loginEnabled) {
      return true;
    }
    
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  /**
   * Get stored JWT token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Store JWT token
   */
  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  /**
   * Remove JWT token
   */
  private removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      
      if (!exp) {
        return false;
      }
      
      return Date.now() >= exp * 1000;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get user information from token
   */
  getUserInfo(): any {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch (error) {
      return null;
    }
  }
}
