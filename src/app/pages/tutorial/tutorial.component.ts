import { Component, ChangeDetectionStrategy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tutorial',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="tutorial-container">
      <header class="tutorial-header">
        <a routerLink="/" class="back-link" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
        <h1 class="tutorial-title">Règles du Jeu de Dames</h1>
      </header>

      <main class="tutorial-main">
        <nav class="tutorial-nav" aria-label="Sections du tutoriel">
          <button type="button" class="nav-link" (click)="scrollTo('basics')">Les bases</button>
          <button type="button" class="nav-link" (click)="scrollTo('movement')">Déplacements</button>
          <button type="button" class="nav-link" (click)="scrollTo('capture')">Prises</button>
          <button type="button" class="nav-link" (click)="scrollTo('promotion')">Promotion</button>
          <button type="button" class="nav-link" (click)="scrollTo('winning')">Victoire</button>
        </nav>

        <div class="tutorial-content">
          <section id="basics" class="tutorial-section" aria-labelledby="basics-heading">
            <h2 id="basics-heading" class="section-title">Les bases du jeu</h2>
            <div class="section-content">
              <div class="info-card">
                <h3>Le plateau</h3>
                <p>
                  Le jeu de Dames Internationales se joue sur un plateau de
                  <strong>100 cases (10x10)</strong>, avec des cases claires et foncées alternées.
                  Seules les <strong>50 cases foncées</strong> sont utilisées.
                </p>
              </div>
              <div class="info-card">
                <h3>Les pièces</h3>
                <p>
                  Chaque joueur commence avec <strong>20 pions</strong>.
                  Les Blancs jouent toujours en premier.
                  Les pions sont placés sur les 4 premières rangées de chaque côté.
                </p>
              </div>
            </div>
          </section>

          <section id="movement" class="tutorial-section" aria-labelledby="movement-heading">
            <h2 id="movement-heading" class="section-title">Déplacements</h2>
            <div class="section-content">
              <div class="info-card">
                <h3>Pions</h3>
                <ul>
                  <li>Se déplacent en <strong>diagonale</strong> uniquement</li>
                  <li>Avancent d'<strong>une case</strong> vers l'avant</li>
                  <li>Ne peuvent pas reculer (sauf pour les prises)</li>
                </ul>
              </div>
              <div class="info-card highlight">
                <h3>Dames (pièces promues)</h3>
                <ul>
                  <li>Se déplacent en diagonale dans <strong>toutes les directions</strong></li>
                  <li>Peuvent parcourir <strong>plusieurs cases</strong> (Dames volantes)</li>
                  <li>Très puissantes stratégiquement</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="capture" class="tutorial-section" aria-labelledby="capture-heading">
            <h2 id="capture-heading" class="section-title">Prises</h2>
            <div class="section-content">
              <div class="info-card warning">
                <h3>⚠️ Règle importante : Prise obligatoire</h3>
                <p>
                  Si vous pouvez prendre une pièce adverse, <strong>vous devez le faire</strong>.
                  C'est obligatoire, pas optionnel !
                </p>
              </div>
              <div class="info-card">
                <h3>Comment prendre</h3>
                <ul>
                  <li>Sautez par-dessus la pièce adverse en diagonale</li>
                  <li>La case d'arrivée doit être libre</li>
                  <li>La pièce capturée est retirée du plateau</li>
                </ul>
              </div>
              <div class="info-card">
                <h3>Prises multiples</h3>
                <ul>
                  <li>Si après une prise vous pouvez en faire une autre, continuez !</li>
                  <li>Vous devez effectuer la séquence qui capture le <strong>maximum de pièces</strong></li>
                  <li>Les pièces sont retirées après la fin de la séquence complète</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="promotion" class="tutorial-section" aria-labelledby="promotion-heading">
            <h2 id="promotion-heading" class="section-title">Promotion en Dame</h2>
            <div class="section-content">
              <div class="info-card success">
                <h3>👑 Devenir une Dame</h3>
                <p>
                  Lorsqu'un pion atteint la <strong>dernière rangée</strong> du plateau
                  (le côté opposé à son départ), il est <strong>promu en Dame</strong>.
                </p>
                <p>
                  La Dame est identifiée par une couronne et possède des pouvoirs de
                  déplacement étendus.
                </p>
              </div>
            </div>
          </section>

          <section id="winning" class="tutorial-section" aria-labelledby="winning-heading">
            <h2 id="winning-heading" class="section-title">Conditions de victoire</h2>
            <div class="section-content">
              <div class="info-card">
                <h3>🏆 Vous gagnez si :</h3>
                <ul>
                  <li>Vous capturez <strong>toutes les pièces</strong> adverses</li>
                  <li>L'adversaire ne peut plus faire de <strong>coup légal</strong> (bloqué)</li>
                  <li>L'adversaire <strong>abandonne</strong></li>
                </ul>
              </div>
              <div class="info-card">
                <h3>Match nul</h3>
                <p>
                  La partie peut se terminer par un match nul si les deux joueurs
                  sont d'accord ou si la position se répète plusieurs fois.
                </p>
              </div>
            </div>
          </section>

          <div class="cta-section">
            <a routerLink="/game/local" class="cta-btn primary">
              Jouer maintenant
            </a>
            <a routerLink="/game/ai" class="cta-btn">
              S'entraîner contre l'IA
            </a>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: `
    .tutorial-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: white;
      transition: background 0.3s ease, color 0.3s ease;
    }

    :host-context(.light-theme) .tutorial-container {
      background: linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%);
      color: #111827;
    }

    .tutorial-header {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 1rem 2rem;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid #374151;
    }

    :host-context(.light-theme) .tutorial-header {
      background: rgba(255, 255, 255, 0.9);
      border-bottom-color: #d1d5db;
    }

    .back-link {
      color: #9ca3af;
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      transition: all 0.15s ease;

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }

      &:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
    }

    :host-context(.light-theme) .back-link {
      color: #4b5563;

      &:hover {
        color: #111827;
        background: rgba(0, 0, 0, 0.05);
      }
    }

    .tutorial-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .tutorial-main {
      display: grid;
      grid-template-columns: 200px 1fr;
      max-width: 1000px;
      margin: 0 auto;
      gap: 2rem;
      padding: 2rem;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .tutorial-nav {
      position: sticky;
      top: 2rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      height: fit-content;

      @media (max-width: 768px) {
        flex-direction: row;
        flex-wrap: wrap;
        position: static;
      }
    }

    .nav-link {
      padding: 0.5rem 1rem;
      color: #9ca3af;
      text-decoration: none;
      border-radius: 0.375rem;
      transition: all 0.15s ease;
      background: transparent;
      border: none;
      font-size: 0.875rem;
      cursor: pointer;
      text-align: left;

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }

      &:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
    }

    :host-context(.light-theme) .nav-link {
      color: #4b5563;

      &:hover {
        color: #111827;
        background: rgba(0, 0, 0, 0.05);
      }
    }

    .tutorial-content {
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }

    .tutorial-section {
      scroll-margin-top: 2rem;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 1.5rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #4f46e5;
    }

    .section-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .info-card {
      background: #374151;
      border-radius: 0.75rem;
      padding: 1.5rem;
      border-left: 4px solid #6b7280;

      h3 {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 0.75rem 0;
      }

      p {
        margin: 0 0 0.5rem 0;
        color: #d1d5db;
        line-height: 1.6;

        &:last-child {
          margin-bottom: 0;
        }
      }

      ul {
        margin: 0;
        padding-left: 1.5rem;
        color: #d1d5db;

        li {
          margin-bottom: 0.5rem;
          line-height: 1.5;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }

      &.highlight {
        border-left-color: #4f46e5;
        background: rgba(79, 70, 229, 0.1);
      }

      &.warning {
        border-left-color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
      }

      &.success {
        border-left-color: #10b981;
        background: rgba(16, 185, 129, 0.1);
      }
    }

    :host-context(.light-theme) .info-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-left: 4px solid #9ca3af;

      p, ul {
        color: #4b5563;
      }

      &.highlight {
        border-left-color: #4f46e5;
        background: rgba(79, 70, 229, 0.05);
      }

      &.warning {
        border-left-color: #f59e0b;
        background: rgba(245, 158, 11, 0.05);
      }

      &.success {
        border-left-color: #10b981;
        background: rgba(16, 185, 129, 0.05);
      }
    }

    .cta-section {
      display: flex;
      gap: 1rem;
      justify-content: center;
      padding-top: 2rem;
      border-top: 1px solid #374151;
    }

    :host-context(.light-theme) .cta-section {
      border-top-color: #d1d5db;
    }

    .cta-btn {
      padding: 0.75rem 2rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
      background: #374151;
      color: white;

      &:hover {
        background: #4b5563;
      }

      &.primary {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        }
      }

      &:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
    }

    :host-context(.light-theme) .cta-btn {
      background: #e5e7eb;
      color: #111827;

      &:hover {
        background: #d1d5db;
      }

      &.primary {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: white;
      }
    }
  `,
})
export class TutorialComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  scrollTo(sectionId: string): void {
    if (!this.isBrowser) return;

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

