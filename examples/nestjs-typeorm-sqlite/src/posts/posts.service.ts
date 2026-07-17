// biome-ignore lint/style/useImportType: must stay a value import — Nest's DI reflection needs the real class reference at runtime.
import { ArxService } from '@arxjs/nestjs';
import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class PostsService {
  constructor(private readonly arx: ArxService) {}

  /**
   * Programmatic permission check using ArxService.
   *
   * Use this pattern when the authorization logic is too complex for a
   * single decorator — for example, when the decision depends on runtime
   * data (ownership, resource state, combined conditions, etc.).
   */
  async publish(userId: string, postId: number) {
    // Check two permissions separately and give different feedback
    const canUpdate = await this.arx.can(userId, 'posts:update');
    if (!canUpdate) {
      throw new ForbiddenException(`You don't have permission to publish posts.`);
    }

    // Could also check role, inspect the post's owner, etc.
    const isAdmin = await this.arx.hasRole(userId, 'admin');

    return {
      success: true,
      data: { postId, publishedBy: userId, fast_track: isAdmin },
      message: isAdmin
        ? `Post ${postId} published immediately.`
        : `Post ${postId} queued for review.`,
    };
  }
}
