import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-member.dto';
import { UpdateProjectMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    creatorId: string,
    glbFiles?: Express.Multer.File[],
    metaData?: Express.Multer.File,
  ) {
    const project = await this.prisma.project.create({
      data: {
        teamId: createProjectDto.teamId,
        name: createProjectDto.name,
        members: {
          create: {
            userId: creatorId,
            role: 1,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                personalId: true,
                email: true,
                profile: true,
              },
            },
          },
        },
        team: true,
      },
    });

    if (glbFiles?.length && metaData) {
      const { modelFolderUrl, jsonFileUrl } =
        await this.uploadService.uploadProjectFiles(
          glbFiles,
          metaData,
          project.id,
        );

      return this.prisma.project.update({
        where: { id: project.id },
        data: {
          modelFolderUrl,
          jsonFileUrl,
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  personalId: true,
                  email: true,
                  profile: true,
                },
              },
            },
          },
          team: true,
        },
      });
    }

    return project;
  }

  async uploadFiles(
    projectId: string,
    glbFiles?: Express.Multer.File[],
    metaData?: Express.Multer.File,
  ) {
    if (glbFiles?.length || metaData) {
      const updateData: any = {};

      if (glbFiles?.length) {
        const modelFolderUrl = await this.uploadService.uploadGlbFiles(
          glbFiles,
          projectId,
        );
        updateData.modelFolderUrl = modelFolderUrl;
      }

      if (metaData) {
        const jsonFileUrl = await this.uploadService.uploadFile(
          metaData,
          `projects/${projectId}/data`,
        );
        updateData.jsonFileUrl = jsonFileUrl;
      }

      return this.prisma.project.update({
        where: { id: projectId },
        data: updateData,
      });
    }

    return this.prisma.project.findUnique({ where: { id: projectId } });
  }

  async getFiles(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        modelFolderUrl: true,
        jsonFileUrl: true,
      },
    });

    return project;
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        team: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                personalId: true,
                email: true,
                profile: true,
              },
            },
          },
        },
      },
    });
  }

  async findByTeam(teamId: string) {
    return this.prisma.project.findMany({
      where: { teamId },
      include: {
        team: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                personalId: true,
                email: true,
                profile: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        team: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                personalId: true,
                email: true,
                profile: true,
              },
            },
          },
        },
        chats: true,
      },
    });
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    return this.prisma.project.update({
      where: { id },
      data: {
        name: updateProjectDto.name,
        lastAccessedAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.project.delete({
      where: { id },
    });
  }

  async addMember(projectId: string, addMemberDto: AddProjectMemberDto) {
    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: addMemberDto.userId,
        role: addMemberDto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            personalId: true,
            email: true,
            profile: true,
          },
        },
      },
    });
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    updateMemberRoleDto: UpdateProjectMemberRoleDto,
  ) {
    return this.prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: { role: updateMemberRoleDto.role },
    });
  }

  async removeMember(projectId: string, userId: string) {
    return this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
  }

  async updateLastAccessed(id: string) {
    return this.prisma.project.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
    });
  }
}
