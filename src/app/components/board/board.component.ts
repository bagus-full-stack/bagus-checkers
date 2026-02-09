import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import {
  Position,
  Piece,
  createPosition,
  positionsEqual,
} from '../../core/models';
import { GameEngineService, GameVariantService } from '../../core/services';
import { SquareComponent } from '../square/square.component';
import { PieceComponent } from '../piece/piece.component';

@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropList, CdkDropListGroup, CdkDrag, CdkDragPlaceholder, SquareComponent, PieceComponent],
  host: {
    'role': 'application',
    'aria-label': 'Plateau de jeu de dames',
  },
  template: `
    <div
      class="board"
      [style.--board-size]="boardSize()"
      cdkDropListGroup
    >
      @for (row of rows(); track row) {
        @for (col of cols(); track col) {
          @let position = getPosition(row, col);
          @let piece = getPieceAt(position);
          @let isSelected = isSelectedPiece(piece);
          @let isMovable = isMovablePiece(piece);
          @let isTarget = isValidTarget(position);
          @let canDrag = piece && canDragPiece(piece);

          <div
            class="square-container"
            cdkDropList
            [cdkDropListData]="position"
            (cdkDropListDropped)="onDrop($event)"
          >
            <app-square
              [position]="position"
              [piece]="canDrag ? null : piece"
              [isSelected]="isSelected"
              [isMovable]="isMovable"
              [isValidTarget]="isTarget"
              [isLastMoveFrom]="isLastMoveFrom(position)"
              [isLastMoveTo]="isLastMoveTo(position)"
              (pieceClicked)="onPieceClick($event)"
              (squareClicked)="onSquareClick($event)"
            />

            @if (canDrag) {
              <div
                class="draggable-piece"
                cdkDrag
                [cdkDragData]="piece"
                (click)="onPieceClick(piece!)"
              >
                <app-piece
                  [piece]="piece!"
                  [isSelected]="isSelected"
                  [isMovable]="isMovable"
                />
                <div class="drag-placeholder" *cdkDragPlaceholder></div>
              </div>
            }
          </div>
        }
      }
    </div>

    @if (mustCapture()) {
      <div class="capture-warning" role="alert" aria-live="polite">
        Prise obligatoire !
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }

    .board {
      display: grid;
      grid-template-columns: repeat(var(--board-size), 1fr);
      grid-template-rows: repeat(var(--board-size), 1fr);
      border: 4px solid #5d4e37;
      border-radius: 4px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      aspect-ratio: 1;
    }

    .square-container {
      position: relative;
      aspect-ratio: 1;
    }

    .draggable-piece {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      cursor: grab;

      &:active {
        cursor: grabbing;
      }
    }

    .drag-placeholder {
      background: rgba(79, 70, 229, 0.3);
      border: 2px dashed #4f46e5;
      border-radius: 50%;
      width: 80%;
      height: 80%;
    }

    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 50%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    .capture-warning {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 0.5rem;
      color: #92400e;
      font-weight: 600;
      text-align: center;
    }
  `,
})
export class BoardComponent {
  private readonly gameEngine = inject(GameEngineService);
  private readonly variantService = inject(GameVariantService);

  readonly boardSize = this.variantService.boardSize;

  readonly rows = computed(() =>
    Array.from({ length: this.boardSize() }, (_, i) => i)
  );

  readonly cols = computed(() =>
    Array.from({ length: this.boardSize() }, (_, i) => i)
  );

  readonly pieces = this.gameEngine.pieces;
  readonly selectedPiece = this.gameEngine.selectedPiece;
  readonly validMoves = this.gameEngine.validMoves;
  readonly mustCapture = this.gameEngine.mustCapture;
  readonly currentPlayer = this.gameEngine.currentPlayer;
  readonly moveHistory = this.gameEngine.moveHistory;

  readonly movablePieces = computed(() =>
    this.gameEngine.getMovablePieces()
  );

  readonly lastMove = computed(() => {
    const history = this.moveHistory();
    return history.length > 0 ? history[history.length - 1] : null;
  });

  getPosition(row: number, col: number): Position {
    return createPosition(row, col);
  }

  getPieceAt(position: Position): Piece | null {
    return (
      this.pieces().find((p) => positionsEqual(p.position, position)) ?? null
    );
  }

  isSelectedPiece(piece: Piece | null): boolean {
    if (!piece) return false;
    const selected = this.selectedPiece();
    return selected?.id === piece.id;
  }

  isMovablePiece(piece: Piece | null): boolean {
    if (!piece) return false;
    return this.movablePieces().some((p) => p.id === piece.id);
  }

  isValidTarget(position: Position): boolean {
    return this.gameEngine.isValidMoveTarget(position);
  }

  isLastMoveFrom(position: Position): boolean {
    const last = this.lastMove();
    return last ? positionsEqual(last.from, position) : false;
  }

  isLastMoveTo(position: Position): boolean {
    const last = this.lastMove();
    return last ? positionsEqual(last.to, position) : false;
  }

  canDragPiece(piece: Piece | null): boolean {
    if (!piece) return false;
    return (
      piece.color === this.currentPlayer() && this.isMovablePiece(piece)
    );
  }

  onPieceClick(piece: Piece): void {
    if (piece.color === this.currentPlayer()) {
      if (this.isSelectedPiece(piece)) {
        this.gameEngine.deselectPiece();
      } else {
        this.gameEngine.selectPiece(piece);
      }
    }
  }

  onSquareClick(position: Position): void {
    if (this.isValidTarget(position)) {
      this.gameEngine.moveTo(position);
    }
  }

  onDrop(event: CdkDragDrop<Position, Position, Piece>): void {
    const piece = event.item.data;
    const targetPosition = event.container.data;

    // Select the piece first
    this.gameEngine.selectPiece(piece);

    // Try to move to the target position
    this.gameEngine.moveTo(targetPosition);
  }
}

