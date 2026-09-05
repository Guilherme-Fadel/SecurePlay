import { Controller, Get } from '@nestjs/common';

const missionRoomFiles = [
  'castle-library-bg.png',
  'missions-room-emblem.png',
  'level-easy.png',
  'level-medium.png',
  'level-hard.png',
  'icon-book.png',
  'icon-flag.png',
  'icon-star.png',
  'module-foundations.png',
  'module-passwords.png',
  'module-authentication.png',
  'module-privacy.png',
  'module-phishing.png',
  'module-navigation.png',
  'module-book-frame-clean.png',
] as const;

@Controller('conteudo/ui-assets')
export class UiAssetsController {
  @Get('missions-room')
  missionsRoom(): Record<string, string> {
    const entries: Array<[string, string]> = missionRoomFiles.map((file) => [
      file.replace('.png', ''),
      `asset:mission-room:${file.replace('.png', '')}`,
    ]);
    return Object.fromEntries(entries);
  }
}
