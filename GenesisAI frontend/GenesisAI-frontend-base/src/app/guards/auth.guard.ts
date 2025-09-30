import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    // If login is disabled, allow access
    if (!this.authService.isLoginEnabled()) {
      return true;
    }

    // If user is authenticated, allow access
    if (this.authService.isAuthenticated()) {
      return true;
    }

    // Otherwise, redirect to login
    this.router.navigate(['/login']);
    return false;
  }
}
