import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
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
      endpoint: this.configService.get<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'R2_SECRET_ACCESS_KEY',
        )!,
      },
    });
    this.bucketName =
      this.configService.get<string>('R2_BUCKET_NAME') || 'simvex';
    this.cdnUrl =
      this.configService.get<string>('CDN_URL') ||
      this.configService.get<string>('R2_PUBLIC_URL')!;
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

  getFolderUrl(folder: string): string {
    return `${this.cdnUrl}/${folder}`;
  }

  async uploadGlbFiles(
    glbFiles: Express.Multer.File[],
    projectId: string,
  ): Promise<string> {
    const folder = `projects/${projectId}`;
    const uploadPromises = glbFiles.map((file) =>
      this.uploadFile(file, folder),
    );

    await Promise.all(uploadPromises);

    return `${this.cdnUrl}/${folder}`;
  }

  async uploadFileWithOriginalName(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const fileName = `${folder}/${file.originalname}`;

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

  async getFile(key: string) {
    const result = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    return {
      body: result.Body,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  async listFiles(folder: string): Promise<string[]> {
    const result = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: folder,
      }),
    );

    return (result.Contents ?? []).map(
      (object) => object.Key!.split('/').pop()!,
    );
  }

  async uploadProjectFiles(
    glbFiles: Express.Multer.File[],
    metaData: Express.Multer.File,
    projectId: string,
  ): Promise<string> {
    const folder = `projects/${projectId}`;

    const uploadPromises = glbFiles.map((file) =>
      this.uploadFile(file, folder),
    );

    const jsonFilePromise = this.uploadFileWithOriginalName(metaData, folder);

    await Promise.all([...uploadPromises, jsonFilePromise]);

    return `${this.cdnUrl}/${folder}`;
  }
}
