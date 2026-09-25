import { Module } from '@nestjs/common';
import { GameGateway } from './game/game.gateway';
import { GameService } from './game/game.service';
import { RoomService } from './game/room.service';
import { WsThrottlerGuard } from './game/ws-throttler.guard';

@Module({
  imports: [],
  providers: [GameGateway, GameService, RoomService, WsThrottlerGuard],
})
export class AppModule {}

