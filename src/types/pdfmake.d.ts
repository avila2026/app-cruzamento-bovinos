declare module 'pdfmake/build/pdfmake' {
  interface TDocumentDefinitions {
    content: unknown[];
    styles?: Record<string, unknown>;
    defaultStyle?: Record<string, unknown>;
  }
  interface PdfMake {
    vfs?: Record<string, string>;
    createPdf: (dd: TDocumentDefinitions) => { download: (filename?: string) => void; open: () => void };
  }
  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: Record<string, string>;
  export = vfs;
}
