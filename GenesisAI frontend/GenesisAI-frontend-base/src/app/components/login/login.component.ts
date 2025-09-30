import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NgForm } from '@angular/forms';
import { AuthService, LoginRequest } from '../../services/auth.service';
import { UserAgreementModalComponent } from './user-agreement-modal.component';
import { PrivacyPolicyModalComponent } from './privacy-policy-modal.component';
import { 
  faUser, 
  faLock, 
  faEye, 
  faEyeSlash, 
  faRobot,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('loginForm') loginForm!: NgForm;
  @ViewChild('usernameInput') usernameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;
  @ViewChild('loginContainer') loginContainer!: ElementRef<HTMLDivElement>;

  // Form model
  credentials: LoginRequest = {
    username: '',
    password: ''
  };

  // UI state
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  showPolicyAgreement = false;
  isFormReady = false; // New property to track if form is ready

  // Icons
  faUser = faUser;
  faLock = faLock;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faRobot = faRobot;
  faSpinner = faSpinner;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // If already authenticated, redirect to chat
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }

    // Subscribe to policy agreement setting
    this.authService.policyAgreementEnabled$.subscribe(enabled => {
      this.showPolicyAgreement = enabled;
    });
  }

  ngAfterViewInit(): void {
    // Force click on login container to trigger autocomplete detection
    setTimeout(() => {
      if (this.loginContainer) {
        this.loginContainer.nativeElement.click();
      }
      
      this.checkAutofilledFields();
      
      // Set up periodic checks for autocomplete detection
      const checkInterval = setInterval(() => {
        if (this.checkAutofilledFields()) {
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Clear interval after 3 seconds to avoid unnecessary checks
      setTimeout(() => clearInterval(checkInterval), 3000);
    }, 100);
  }

  /**
   * Check if fields have been autofilled by browser
   */
  checkAutofilledFields(): boolean {
    if (this.usernameInput && this.passwordInput) {
      const usernameValue = this.usernameInput.nativeElement.value;
      const passwordValue = this.passwordInput.nativeElement.value;
      
      // If browser autofilled but Angular model is empty, sync them
      if (usernameValue && !this.credentials.username) {
        this.credentials.username = usernameValue;
      }
      if (passwordValue && !this.credentials.password) {
        this.credentials.password = passwordValue;
      }
      
      // Mark form as ready if both fields have values
      if (usernameValue && passwordValue) {
        this.isFormReady = true;
        return true;
      }
    }
    return false;
  }

  /**
   * Get form validity state considering autocomplete
   */
  get isFormValid(): boolean {
    // Always check if we have actual values in the credentials
    const hasUsername = !!(this.credentials.username && this.credentials.username.trim());
    const hasPassword = !!(this.credentials.password && this.credentials.password.trim());
    
    // If we don't have values in the model, check the DOM directly
    if (!hasUsername || !hasPassword) {
      if (this.usernameInput && this.passwordInput) {
        const domUsername = this.usernameInput.nativeElement.value?.trim();
        const domPassword = this.passwordInput.nativeElement.value?.trim();
        return !!(domUsername && domPassword);
      }
    }
    
    return hasUsername && hasPassword;
  }

  /**
   * Handle login form submission
   */
  onLogin(): void {
    // Sync autofilled values before validation
    this.checkAutofilledFields();
    
    if (this.isFormValid) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.login(this.credentials).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          this.router.navigate(['/']);
        },
        error: (error: any) => {
          this.isLoading = false;
          this.handleLoginError(error);
        }
      });
    } else {
      this.errorMessage = 'Por favor, preencha todos os campos obrigatórios.';
    }
  }

  /**
   * Handle login errors
   */
  private handleLoginError(error: any): void {
    if (error.status === 401) {
      this.errorMessage = 'Credenciais inválidas. Verifique o seu utilizador e palavra-passe.';
    } else if (error.status === 400) {
      this.errorMessage = 'Dados inválidos. Por favor, verifique os campos preenchidos.';
    } else if (error.status === 0) {
      this.errorMessage = 'Erro de conexão. Verifique a sua ligação à internet.';
    } else {
      this.errorMessage = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Handle form submission with Enter key
   */
  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onLogin();
    }
  }

  /**
   * Open User Agreement modal
   */
  openUserAgreementModal(event: Event): void {
    event.preventDefault();
    this.dialog.open(UserAgreementModalComponent, {
      width: '90vw',
      maxWidth: '600px',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container'
    });
  }

  /**
   * Close User Agreement modal
   */
  closeUserAgreementModal(): void {
    // This method is kept for compatibility but not needed with MatDialog
    this.dialog.closeAll();
  }

  /**
   * Open Privacy Policy modal
   */
  openPrivacyPolicyModal(event: Event): void {
    event.preventDefault();
    this.dialog.open(PrivacyPolicyModalComponent, {
      width: '90vw',
      maxWidth: '600px',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container'
    });
  }

  /**
   * Close Privacy Policy modal
   */
  closePrivacyPolicyModal(): void {
    // This method is kept for compatibility but not needed with MatDialog
    this.dialog.closeAll();
  }
}
