import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-privacy-policy-modal',
  template: `
    <div class="modal-container">
      <h2 mat-dialog-title class="modal-title">Privacy Policy</h2>
      
      <mat-dialog-content class="modal-content">
        <div class="modal-text">
          <h3>Privacy Policy</h3>
          <p><strong>Last Updated:</strong> August 2025</p>
          
          <h4>1. Information We Collect</h4>
          <p>We may collect the following types of information:</p>
          <ul>
            <li><strong>Personal Information:</strong> Email address and authentication credentials</li>
            <li><strong>Usage Information:</strong> How you interact with our service</li>
            <li><strong>Technical Information:</strong> IP address, browser type, and device information</li>
          </ul>
          
          <h4>2. How We Use Your Information</h4>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain our service</li>
            <li>Authenticate and secure your account</li>
            <li>Improve our service and user experience</li>
            <li>Communicate with you about service updates</li>
          </ul>
          
          <h4>3. Data Security</h4>
          <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
          
          <h4>4. Data Retention</h4>
          <p>We retain your personal information only for as long as necessary to fulfill the purposes outlined in this privacy policy.</p>
          
          <h4>5. Third-Party Services</h4>
          <p>We do not sell, trade, or rent your personal information to third parties. We may use trusted third-party services to help operate our service.</p>
          
          <h4>6. Your Rights</h4>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Object to processing of your information</li>
          </ul>
          
          <h4>7. Changes to This Policy</h4>
          <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
          
          <h4>8. Contact Us</h4>
          <p>If you have questions about this privacy policy, please contact Genesis Digital Solutions.</p>
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
export class PrivacyPolicyModalComponent {
  constructor(
    public dialogRef: MatDialogRef<PrivacyPolicyModalComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
