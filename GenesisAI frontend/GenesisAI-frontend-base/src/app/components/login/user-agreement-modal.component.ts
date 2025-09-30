import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-user-agreement-modal',
  template: `
    <div class="modal-container">
      <h2 mat-dialog-title class="modal-title">User Agreement</h2>
      
      <mat-dialog-content class="modal-content">
        <div class="modal-text">
          <h3>Terms of Service</h3>
          <p><strong>Last Updated:</strong> August 2025</p>
          
          <h4>1. Acceptance of Terms</h4>
          <p>By accessing and using Genesis AI, you accept and agree to be bound by the terms and provision of this agreement.</p>
          
          <h4>2. Description of Service</h4>
          <p>Genesis AI provides an intelligent conversational interface designed to assist users with various tasks and inquiries.</p>
          
          <h4>3. User Responsibilities</h4>
          <p>You agree to use the service responsibly and in accordance with all applicable laws and regulations. You will not:</p>
          <ul>
            <li>Use the service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any part of the service</li>
            <li>Interfere with or disrupt the service or servers</li>
            <li>Transmit any harmful or malicious content</li>
          </ul>
          
          <h4>4. Intellectual Property</h4>
          <p>All content, features, and functionality of Genesis AI are owned by Genesis Digital Solutions and are protected by copyright and other intellectual property laws.</p>
          
          <h4>5. Limitation of Liability</h4>
          <p>Genesis Digital Solutions shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.</p>
          
          <h4>6. Modifications</h4>
          <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of any changes.</p>
          
          <h4>7. Contact Information</h4>
          <p>For questions about these terms, please contact Genesis Digital Solutions.</p>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-raised-button color="warn" (click)="close()">Close</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .modal-container {
      max-width: 600px;
    }
    
    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 1rem;
    }
    
    .modal-content {
      max-height: 70vh;
      overflow-y: auto;
    }
    
    .modal-text {
      line-height: 1.6;
      color: #4b5563;
      
      h3 {
        font-size: 1.125rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 1rem 0;
      }
      
      h4 {
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
        margin: 1.5rem 0 0.5rem 0;
      }
      
      p {
        margin: 0 0 1rem 0;
        font-size: 0.875rem;
      }
      
      ul {
        margin: 0.5rem 0 1rem 1.5rem;
        
        li {
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }
      }
      
      strong {
        color: #1f2937;
        font-weight: 600;
      }
    }
  `]
})
export class UserAgreementModalComponent {
  constructor(
    public dialogRef: MatDialogRef<UserAgreementModalComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
