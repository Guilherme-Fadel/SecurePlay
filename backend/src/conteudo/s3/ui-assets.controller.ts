import { Controller, Get } from '@nestjs/common';
import { S3Service } from './s3.service';

const missionRoomFiles = [
  'castle-library-bg.png', 'missions-room-emblem.png', 'level-easy.png', 'level-medium.png', 'level-hard.png',
  'icon-book.png', 'icon-flag.png', 'icon-star.png', 'module-foundations.png', 'module-passwords.png',
  'module-authentication.png', 'module-privacy.png', 'module-phishing.png', 'module-navigation.png',
  'module-book-frame-clean.png',
] as const;

@Controller('conteudo/ui-assets')
export class UiAssetsController {
  constructor(private readonly s3Service: S3Service) {}

  @Get('missions-room')
  async missionsRoom() {
    const entries = await Promise.all(missionRoomFiles.map(async (file) => [
      file.replace('.png', ''),
      await this.s3Service.generatePresignedGetUrl(`ui/missions-room/v1/${file}`),
    ]));
    return Object.fromEntries(entries);
  }
}
