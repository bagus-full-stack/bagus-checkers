import { Component, ChangeDetectionStrategy, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { TutorialCheckersComponent } from './tutorial-checkers.component';
import { TutorialLudoComponent } from './tutorial-ludo.component';

@Component({
  selector: 'app-tutorial',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TutorialCheckersComponent, TutorialLudoComponent],
  template: `
    @if (variant === 'ludo') {
      <app-tutorial-ludo></app-tutorial-ludo>
    } @else {
      <app-tutorial-checkers></app-tutorial-checkers>
    }
  `,
})
export class TutorialComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  variant = 'checkers';

  ngOnInit(): void {
    const v = this.route.snapshot.queryParamMap.get('variant');
    if (v === 'ludo') {
      this.variant = 'ludo';
    }
  }
}

