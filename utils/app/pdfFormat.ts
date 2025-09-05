export interface PDFInfo {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string | Date;
  modDate?: string | Date;
}

export interface PDFTextResultClient {
  text: string;
  pages: number;
  info: PDFInfo;
}

export const formatPDFContent = (result: PDFTextResultClient): string => {
  const { text, pages, info } = result;
  let formattedContent = '';

  if (info.title || info.author) {
    formattedContent += '---\n';
    if (info.title) formattedContent += `Title: ${info.title}\n`;
    if (info.author) formattedContent += `Author: ${info.author}\n`;
    formattedContent += `Pages: ${pages}\n`;
    formattedContent += '---\n\n';
  }

  formattedContent += text;
  return formattedContent;
};

export const createPDFPrompt = (content: string, fileName: string): string => {
  return `I've uploaded a PDF document (${fileName}). Please analyze its content and answer any questions I have about it. Here's the content:\n\n${content}`;
};

export const validateClientPDFFile = (file: File, maxSize = 50 * 1024 * 1024): string | null => {
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'File must be a PDF document';
  }
  if (file.size > maxSize) {
    return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed size (50MB)`;
  }
  return null;
};

