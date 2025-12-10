import { Request, Response, NextFunction } from "express";
interface RateLimitOptions {
    windowMs: number;
    max: number;
    message?: string;
    keyGenerator?: (req: Request) => string;
}
export declare function createRateLimiter(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const generalLimiter: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const authLimiter: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const uploadLimiter: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const strictLimiter: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export {};
//# sourceMappingURL=rateLimit.d.ts.map