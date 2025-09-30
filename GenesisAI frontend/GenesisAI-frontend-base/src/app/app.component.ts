import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'bot-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  
  private readonly LOGIN_ENABLED = false;
  private readonly SHOW_POLICY_AGREEMENT = false;
  private readonly ALLOW_LOGOUT = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.setLoginEnabled(this.LOGIN_ENABLED);
    this.authService.setPolicyAgreementEnabled(this.SHOW_POLICY_AGREEMENT);
    this.authService.setLogoutAllowed(this.ALLOW_LOGOUT);
  }
}
