import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

export class PositionDto {
  @IsInt()
  row!: number;

  @IsInt()
  col!: number;
}

export class PieceDto {
  @IsString()
  id!: string;

  @IsIn(['white', 'black'])
  color!: 'white' | 'black';

  @IsIn(['pawn', 'king'])
  type!: 'pawn' | 'king';

  @ValidateNested()
  @Type(() => PositionDto)
  position!: PositionDto;
}

export class MoveDto {
  @ValidateNested()
  @Type(() => PieceDto)
  piece!: PieceDto;

  @ValidateNested()
  @Type(() => PositionDto)
  from!: PositionDto;

  @ValidateNested()
  @Type(() => PositionDto)
  to!: PositionDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PieceDto)
  capturedPieces!: PieceDto[];

  @IsBoolean()
  isPromotion!: boolean;
}

export class RoomCreateDto {
  @IsString()
  @Length(1, 50)
  name!: string;

  @IsBoolean()
  isPrivate!: boolean;

  @IsOptional()
  @IsString()
  variant?: string;
}

export class RoomJoinDto {
  @IsString()
  roomId!: string;
}

export class RoomLeaveDto {
  @IsString()
  roomId!: string;
}

export class PlayerReadyDto {
  @IsString()
  roomId!: string;

  @IsBoolean()
  isReady!: boolean;
}

export class GameMoveDto {
  @IsString()
  roomId!: string;

  @ValidateNested()
  @Type(() => MoveDto)
  move!: MoveDto;
}

export class LudoRollDto {
  @IsString()
  roomId!: string;
}

export class LudoMoveDto {
  @IsString()
  roomId!: string;

  @IsString()
  pieceId!: string;
}

export class GameResignDto {
  @IsString()
  roomId!: string;
}

export class ChatSendDto {
  @IsString()
  roomId!: string;

  @IsString()
  @Length(1, 200)
  message!: string;
}
