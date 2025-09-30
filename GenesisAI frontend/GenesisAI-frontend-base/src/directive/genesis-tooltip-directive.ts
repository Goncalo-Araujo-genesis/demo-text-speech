import {
  Directive,
  ElementRef,
  Input,
  Renderer2,
  HostListener,
} from '@angular/core';

@Directive({
  selector: '[genesisTooltip]',
})
export class GenesisTooltipDirective {
  @Input('genesisTooltip') tooltipText: string;

  private tooltip: any;
  private offsetX = 13; // Horizontal offset from cursor
  private offsetY = 23; // Vertical offset from cursor
  private transitionDuration = 150; // Duration for fade, scale animations in ms
  private tooltipVisible = false;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter', ['$event'])
  onMouseEnter(event: MouseEvent): void {
    if (!this.tooltipVisible) {
      this.showTooltip(event);
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hideTooltip();
  }

  @HostListener('click')
  onMouseClick(): void {
    this.hideTooltip();
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.tooltip && this.tooltipVisible) {
      // Update tooltip position based on cursor movement
      const tooltipX = event.clientX + this.offsetX;
      const tooltipY = event.clientY + this.offsetY;
      this.renderer.setStyle(this.tooltip, 'left', `${tooltipX}px`);
      this.renderer.setStyle(this.tooltip, 'top', `${tooltipY}px`);
    }
  }

  private showTooltip(event: MouseEvent): void {
    // Create tooltip element and add text
    this.tooltip = this.renderer.createElement('span');
    const text = this.renderer.createText(this.tooltipText);
    this.renderer.appendChild(this.tooltip, text);

    // Apply styles similar to Angular Material's tooltip
    this.renderer.setStyle(this.tooltip, 'position', 'fixed');
    this.renderer.setStyle(this.tooltip, 'background', 'rgba(90, 90, 90, 0.9)');
    this.renderer.setStyle(this.tooltip, 'color', '#fff');
    this.renderer.setStyle(this.tooltip, 'padding', '3px 6px');
    this.renderer.setStyle(this.tooltip, 'borderRadius', '4px');
    this.renderer.setStyle(this.tooltip, 'fontSize', '1em');
    this.renderer.setStyle(this.tooltip, 'fontFamily', '"Roboto", sans-serif');
    this.renderer.setStyle(this.tooltip, 'pointerEvents', 'none');
    this.renderer.setStyle(this.tooltip, 'zIndex', '1000');

    // Set initial position based on the current cursor location plus offset
    const tooltipX = event.clientX + this.offsetX;
    const tooltipY = event.clientY + this.offsetY;
    this.renderer.setStyle(this.tooltip, 'left', `${tooltipX}px`);
    this.renderer.setStyle(this.tooltip, 'top', `${tooltipY}px`);

    // Calculate transform origin so the animation starts at the cursor:
    // The cursor’s position relative to the tooltip is:
    // (event.clientX - tooltipX, event.clientY - tooltipY)
    const transformOriginX = event.clientX - tooltipX; // equals -offsetX
    const transformOriginY = event.clientY - tooltipY; // equals -offsetY
    this.renderer.setStyle(
      this.tooltip,
      'transform-origin',
      `${transformOriginX}px ${transformOriginY}px`
    );

    // Apply transition for opacity and transform (scaling)
    this.renderer.setStyle(
      this.tooltip,
      'transition',
      `opacity ${this.transitionDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1), transform ${this.transitionDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`
    );

    // Start with the tooltip hidden and at a smaller scale
    this.renderer.setStyle(this.tooltip, 'opacity', '0.5');
    this.renderer.setStyle(this.tooltip, 'transform', 'scale(0.7)');

    // Append tooltip to the document body
    this.renderer.appendChild(document.body, this.tooltip);

    // Trigger fade-in and scale-up on the next tick
    setTimeout(() => {
      if (this.tooltip) {
        this.renderer.setStyle(this.tooltip, 'opacity', '1');
        this.renderer.setStyle(this.tooltip, 'transform', 'scale(1)');
      }
    }, 0);

    this.tooltipVisible = true;
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      // Animate fade-out and scale-down
      this.renderer.setStyle(this.tooltip, 'opacity', '0');
      this.renderer.setStyle(this.tooltip, 'transform', 'scale(0.8)');
      // Remove tooltip after the transition completes
      setTimeout(() => {
        if (this.tooltip) {
          this.renderer.removeChild(document.body, this.tooltip);
          this.tooltip = null;
          this.tooltipVisible = false;
        }
      }, this.transitionDuration);
    }
  }
}
