import { Module } from '@nestjs/common';
import { GameGateway } from './game/game.gateway';
import { GameService } from './game/game.service';
import { RoomService } from './game/room.service';

@Module({
  imports: [],
  providers: [GameGateway, GameService, RoomService],
})
export class AppModule {}

