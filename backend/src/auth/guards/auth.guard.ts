import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends NestAuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        console.log('[JwtAuthGuard] Authorization header present:', !!req.headers?.authorization);
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
        if (err || !user) {
            console.error('[JwtAuthGuard] Auth error:', err?.message || err, 'info:', info);
        } else {
            console.log('[JwtAuthGuard] Authenticated user:', user);
        }
        return super.handleRequest(err, user, info, context, status);
    }
}


