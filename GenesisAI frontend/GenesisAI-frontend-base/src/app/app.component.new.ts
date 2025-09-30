import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { faCog, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'bot-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  // Icons
  faCog = faCog;
  faSignOutAlt = faSignOutAlt;

  // Config panel visibility
  showConfig = false;

  // Login enabled state
  loginEnabled = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Initialize auth service with current login state
    this.authService.setLoginEnabled(this.loginEnabled);
  }

  /**
   * Toggle login functionality
   */
  toggleLoginMode(): void {
    this.loginEnabled = !this.loginEnabled;
    this.authService.setLoginEnabled(this.loginEnabled);
    
    if (this.loginEnabled) {
      console.log('Login functionality enabled');
    } else {
      console.log('Login functionality disabled');
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Check if login is enabled
   */
  isLoginEnabled(): boolean {
    return this.authService.isLoginEnabled();
  }

  /**
   * Toggle config panel
   */
  toggleConfig(): void {
    this.showConfig = !this.showConfig;
  }

  /**
   * Get user info from token (if available)
   */
  getUserInfo(): any {
    return this.authService.getUserInfo();
  }
}
