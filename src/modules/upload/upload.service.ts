import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private cdnUrl: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.configService.get('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('R2_SECRET_ACCESS_KEY'),
      },
    });
    this.bucketName = this.configService.get('R2_BUCKET_NAME');
    this.cdnUrl = this.configService.get('CDN_URL');
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${this.cdnUrl}/${fileName}`;
  }

  async uploadGlbFiles(
    glbFiles: Express.Multer.File[],
    projectId: string,
  ): Promise<string> {
    const uploadPromises = glbFiles.map((file) =>
      this.uploadFile(file, `projects/${projectId}/models`),
    );

    await Promise.all(uploadPromises);

    return `${this.cdnUrl}/projects/${projectId}/models`;
  }

  async uploadProjectFiles(
    glbFiles: Express.Multer.File[],
    metaData: Express.Multer.File,
    projectId: string,
  ): Promise<{ modelFolderUrl: string; jsonFileUrl: string }> {
    const uploadPromises = glbFiles.map((file) =>
      this.uploadFile(file, `projects/${projectId}/models`),
    );

    const jsonFilePromise = this.uploadFile(
      metaData,
      `projects/${projectId}/data`,
    );

    await Promise.all([...uploadPromises, jsonFilePromise]);

    const modelFolderUrl = `${this.cdnUrl}/projects/${projectId}/models`;
    const jsonFileUrl = await jsonFilePromise;

    return { modelFolderUrl, jsonFileUrl };
  }
}
