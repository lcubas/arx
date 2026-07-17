import { RequirePermissions, RequireRole } from '@arxjs/nestjs';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
// biome-ignore lint/style/useImportType: must stay a value import — Nest's DI reflection needs the real class reference at runtime.
import { PostsService } from './posts.service';

// Simulated post data — in a real app this would come from a database.
const posts = [
  {
    id: 1,
    title: 'Getting started with arx',
    content: 'arx is a modern authorization library...',
  },
  {
    id: 2,
    title: 'NestJS and TypeORM',
    content: 'TypeORM integrates seamlessly with NestJS...',
  },
];

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // Public — no decorator means ArxGuard lets it through
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get()
  @RequirePermissions('posts:read')
  findAll() {
    return { success: true, data: posts };
  }

  @Get(':id')
  @RequirePermissions('posts:read')
  findOne(@Param('id') id: string) {
    const post = posts.find((p) => p.id === Number(id));

    if (!post) throw new NotFoundException('Post not found');

    return { success: true, data: post };
  }

  @Post()
  @RequirePermissions('posts:create')
  create(@Body() body: { title: string; content?: string }) {
    const newPost = {
      id: posts.length + 1,
      title: body.title,
      content: body.content ?? '',
    };
    posts.push(newPost);

    return { success: true, data: newPost, message: 'Post created.' };
  }

  @Put(':id')
  @RequirePermissions('posts:update')
  update(@Param('id') id: string, @Body() body: { title?: string; content?: string }) {
    const post = posts.find((p) => p.id === Number(id));

    if (!post) throw new NotFoundException('Post not found');

    if (body.title) post.title = body.title;
    if (body.content) post.content = body.content;

    return { success: true, data: post, message: 'Post updated.' };
  }

  // Example of @RequireRole — only users with the admin role can access this
  @Post('bulk-delete')
  @HttpCode(200)
  @RequireRole('admin')
  bulkDelete() {
    posts.length = 0;
    return { success: true, message: 'All posts deleted.' };
  }

  // Example of a programmatic permission check inside a service method.
  // @Headers('x-user-id') is used here only to pass the userId to the service.
  @Post(':id/publish')
  @RequirePermissions('posts:update')
  async publish(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.postsService.publish(userId, Number(id));
  }
}
