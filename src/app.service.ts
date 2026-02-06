import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '"You won\'t die, because I\'ll protect you." - Ayanami Rei';
  }
}
