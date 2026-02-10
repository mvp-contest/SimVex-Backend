import { ApiProperty } from '@nestjs/swagger';

export class UploadFilesDto {
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
  glbFiles: any[];

  @ApiProperty({ type: 'string', format: 'binary' })
  jsonFile: any;
}
