import { Component, ChangeDetectionStrategy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tutorial-ludo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="tutorial-container">
      <header class="tutorial-header">
        <a routerLink="/" class="back-link" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
        <h1 class="tutorial-title">Règles du Ludo</h1>
      </header>

      <main class="tutorial-main">
        <nav class="tutorial-nav" aria-label="Sections du tutoriel">
          <button type="button" class="nav-link" (click)="scrollTo('basics')">Les bases</button>
          <button type="button" class="nav-link" (click)="scrollTo('movement')">Déplacements</button>
          <button type="button" class="nav-link" (click)="scrollTo('capture')">Captures</button>
          <button type="button" class="nav-link" (click)="scrollTo('finish')">Arrivée</button>
          <button type="button" class="nav-link" (click)="scrollTo('winning')">Victoire</button>
        </nav>

        <div class="tutorial-content">
          <section id="basics" class="tutorial-section" aria-labelledby="basics-heading">
            <h2 id="basics-heading" class="section-title">Les bases du jeu</h2>
            <div class="section-content">
              <div class="info-card">
                <h3>Le plateau</h3>
                <p>
                  Le plateau est une grille de <strong>15x15 cases</strong> avec
                  <strong>4 cours</strong> dans les coins (rouge, verte, jaune, bleue) et un
                  <strong>circuit commun de 52 cases</strong>. Chaque couleur a une
                  <strong>colonne d'arrivée de 5 cases</strong> qui mène au centre.
                </p>
              </div>
              <div class="info-card">
                <h3>Les pions</h3>
                <p>
                  De <strong>2 à 4 joueurs</strong>. Chacun a <strong>4 pions</strong>, qui
                  commencent dans sa cour. Chaque couleur a sa forme : rouge ▲, vert ■,
                  jaune ◆, bleu ●. Le Rouge joue en premier, puis on tourne dans le sens horaire.
                </p>
              </div>
            </div>
          </section>

          <section id="movement" class="tutorial-section" aria-labelledby="movement-heading">
            <h2 id="movement-heading" class="section-title">Déplacements</h2>
            <div class="section-content">
              <div class="info-card">
                <h3>Le dé</h3>
                <ul>
                  <li>À votre tour, lancez le dé puis jouez <strong>un pion</strong> d'autant de cases</li>
                  <li>Un pion avance toujours dans le <strong>sens horaire</strong></li>
                  <li>Si aucun pion ne peut bouger, votre tour est passé</li>
                </ul>
              </div>
              <div class="info-card highlight">
                <h3>Sortir de la cour</h3>
                <p>
                  Il faut un <strong>6</strong> pour sortir un pion. Il arrive sur votre
                  <strong>case de départ</strong>, la case de votre couleur marquée d'une étoile ★.
                </p>
              </div>
              <div class="info-card warning">
                <h3>⚠️ Les 6</h3>
                <ul>
                  <li>Un 6 vous fait <strong>rejouer</strong> après votre coup</li>
                  <li>Au <strong>3e 6 de suite</strong>, vous jouez ce coup puis votre tour s'arrête</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="capture" class="tutorial-section" aria-labelledby="capture-heading">
            <h2 id="capture-heading" class="section-title">Captures</h2>
            <div class="section-content">
              <div class="info-card">
                <h3>Renvoyer un pion</h3>
                <p>
                  Si votre pion s'arrête sur une case occupée par un pion adverse, celui-ci est
                  <strong>renvoyé dans sa cour</strong>. Il lui faudra un nouveau 6 pour repartir.
                </p>
              </div>
              <div class="info-card success">
                <h3>★ Cases protégées</h3>
                <ul>
                  <li>Les <strong>4 cases de départ</strong> et les <strong>4 cases étoilées</strong> (8 cases après chaque départ) sont protégées : on n'y capture jamais</li>
                  <li>Votre colonne d'arrivée est privée : aucun adversaire ne peut y entrer</li>
                  <li>Vos propres pions peuvent partager une case</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="finish" class="tutorial-section" aria-labelledby="finish-heading">
            <h2 id="finish-heading" class="section-title">Arrivée</h2>
            <div class="section-content">
              <div class="info-card">
                <h3>Rentrer à la maison</h3>
                <p>
                  Après un tour complet du circuit, votre pion quitte le circuit et monte dans votre
                  <strong>colonne d'arrivée</strong> (5 cases). Il faut <strong>57 pas</strong> au total,
                  depuis la case de départ, pour finir.
                </p>
              </div>
              <div class="info-card highlight">
                <h3>Le nombre exact</h3>
                <p>
                  Pour terminer, il faut le <strong>nombre exact</strong>. Si le dé dépasse
                  la dernière case, ce pion ne peut pas jouer.
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
                  <li>Vos <strong>4 pions</strong> sont arrivés au bout de la colonne d'arrivée</li>
                  <li>En ligne, tous les autres joueurs ont <strong>quitté ou abandonné</strong></li>
                </ul>
              </div>
              <div class="info-card">
                <h3>Quitter en cours de partie</h3>
                <p>
                  En ligne, un joueur qui quitte ou abandonne retire ses pions du plateau.
                  La partie continue entre les joueurs restants.
                </p>
              </div>
            </div>
          </section>

          <div class="cta-section">
            <a routerLink="/game/local" [queryParams]="{ variant: 'ludo' }" class="cta-btn primary">
              Jouer maintenant
            </a>
            <a routerLink="/game/ai" [queryParams]="{ variant: 'ludo' }" class="cta-btn">
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
export class TutorialLudoComponent {
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

