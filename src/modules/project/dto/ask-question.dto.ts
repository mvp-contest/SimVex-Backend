import { ApiProperty } from '@nestjs/swagger';

export class AskQuestionDto {
  @ApiProperty({ example: 'What is the function of this part?' })
  content: string;
}
