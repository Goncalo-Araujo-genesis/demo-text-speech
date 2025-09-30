import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { LoginRequest, LoginResponse } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class MockAuthService {

  private mockUsers = [
    { username: 'admin', password: 'admin123', email: 'admin@genesis.pt', role: 'admin' },
    { username: 'user', password: 'user123', email: 'user@genesis.pt', role: 'user' },
    { username: 'test', password: 'test123', email: 'test@genesis.pt', role: 'user' }
  ];

  constructor() {}

  mockLogin(credentials: LoginRequest): Observable<LoginResponse> {
    return of(credentials).pipe(
      delay(1500),
      map(creds => {
        const user = this.mockUsers.find(u => 
          u.username === creds.username && u.password === creds.password
        );

        if (!user) {
          throw new Error('Invalid credentials');
        }

        const payload = {
          sub: user.username,
          email: user.email,
          role: user.role,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
          iat: Math.floor(Date.now() / 1000)
        };

        const mockToken = btoa(JSON.stringify({
          alg: 'HS256',
          typ: 'JWT'
        })) + '.' + 
        btoa(JSON.stringify(payload)) + '.' + 
        'mock-signature';

        return {
          token: mockToken,
          user: {
            username: user.username,
            email: user.email,
            role: user.role
          }
        };
      })
    );
  }

  /**
   * Get mock users for development purposes
   */
  getMockUsers() {
    return this.mockUsers.map(user => ({
      username: user.username,
      email: user.email,
      role: user.role
    }));
  }
}
