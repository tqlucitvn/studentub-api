import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { NextFunction, Request, Response } from 'express';
import { CurrentUser } from 'src/modules/auth/current-user';
import { UserRole } from 'src/common/common.enum';
import { HEADER } from 'src/shared/constant/request';

export class HttpRequestContext {
  constructor(
    public requestId?: string,
    public user?: CurrentUser,
    public systemId?: string,
    public request?: Request
  ) {}
}

@Injectable()
export class HttpRequestContextService {
  private static asyncLocalStorage = new AsyncLocalStorage<HttpRequestContext>();

  private readonly logger = new Logger(HttpRequestContextService.name);

  runWithContext(req: Request, _res: Response, next: NextFunction) {
    const context = new HttpRequestContext();
    context.requestId = req.headers[HEADER.X_REQUEST_ID] as string;
    this.logger.debug(`----- Request to %s with context %j`, req.url, context);
    HttpRequestContextService.asyncLocalStorage.run(context, () => {
      next();
    });
  }

  getRequestId() {
    const reqContext = HttpRequestContextService.asyncLocalStorage.getStore();

    return reqContext?.requestId;
  }

  setRequestId(id: string) {
    const reqContext = HttpRequestContextService.asyncLocalStorage.getStore();

    reqContext.requestId = id;
  }

  getUser() {
    const reqContext = HttpRequestContextService.asyncLocalStorage.getStore();

    this.logger.debug(`Context is %j`, reqContext);

    return reqContext?.user;
  }

  setUser(user: CurrentUser) {
    const reqContext = HttpRequestContextService.asyncLocalStorage.getStore();

    this.logger.debug(`-----Context BEFORE is %j`, reqContext);

    reqContext.user = user;

    this.logger.debug(`-----Context AFTER is %j`, reqContext);
  }

  isModerator(): boolean {
    const reqContext = HttpRequestContextService.asyncLocalStorage.getStore();
    const currentUserRoles = reqContext?.user?.roles || [];
    return currentUserRoles.includes(UserRole.MANAGER) || currentUserRoles.includes(UserRole.ADMIN);
  }

  getUserId(): string | number | undefined {
    const currentUser = this.getUser();
    return currentUser?.id;
  }

  getRequest(): Request | undefined {
    const reqContext = HttpRequestContextService.asyncLocalStorage.getStore();
    return reqContext?.request;
  }
}
