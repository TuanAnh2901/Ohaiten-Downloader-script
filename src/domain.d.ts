export interface AnimehayDomainResult {
    primary: string | null;
    secondary: string | null;
    /** Epoch milliseconds when this result was produced. */
    validatedAt: number;
    /** Set when the resolver had to deviate from the animehay.tv path. */
    fallbackReason?: string;
}
type RequestResult = {
    status: number;
    finalUrl: string;
    body: string;
};
type Requester = (url: string, opts?: {
    timeoutMs?: number;
}) => Promise<RequestResult>;
export declare function getCachedDomains(): AnimehayDomainResult | null;
export declare function clearDomainCache(): void;
export declare function resolveAnimehayDomains(options?: {
    currentOrigin?: string;
}): Promise<AnimehayDomainResult>;
export declare function normalizeAnimehayUrl(url: string, origin?: string): string;
export declare function isAnimehayHost(hostname: string): boolean;
/**
 * Replace the requester implementation. Pass null to restore auto-detection.
 * Intended for unit tests; production code should not call this.
 */
export declare function __setRequesterForTesting(fn: Requester | null): void;
/**
 * Wipe the in-memory test cache. Distinct from clearDomainCache() so tests
 * can reset the memoryStore backplane without touching the GM storage path.
 */
export declare function __resetMemoryStoreForTesting(): void;
export {};
//# sourceMappingURL=domain.d.ts.map