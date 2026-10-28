/// <reference lib="webworker" />
import { ludoAiMove } from './ludo-ai';

addEventListener('message', ({ data }) => {
  postMessage({ id: data.id, pieceId: ludoAiMove(data.state, data.color, data.roll, data.level) });
});
