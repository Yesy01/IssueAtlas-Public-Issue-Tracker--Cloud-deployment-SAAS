export declare function uploadIssueFile(file: Express.Multer.File, opts?: {
    issueId?: string;
}): Promise<{
    key: string;
    url: string;
}>;
export declare function downloadIssueFile(key: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType?: string;
}>;
//# sourceMappingURL=azureBlob.d.ts.map