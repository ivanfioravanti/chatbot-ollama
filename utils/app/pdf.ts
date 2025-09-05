import pdf from 'pdf-parse';

export interface PDFTextResult {
  text: string;
  pages: number;
  info: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modDate?: Date;
  };
}

export interface PDFParseError {
  message: string;
  type: 'parse_error' | 'password_protected' | 'invalid_pdf' | 'too_large' | 'network_error';
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PAGES = 100; // Limit to prevent memory issues
const MAX_TEXT_LENGTH = 50000; // Limit text to prevent context overflow

export const validatePDFFile = (file: File): PDFParseError | null => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      message: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed size (50MB)`,
      type: 'too_large'
    };
  }

  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return {
      message: 'File must be a PDF document',
      type: 'invalid_pdf'
    };
  }

  return null;
};

export const extractTextFromPDF = async (file: File): Promise<PDFTextResult | PDFParseError> => {
  try {
    // Validate file first
    const validationError = validatePDFFile(file);
    if (validationError) {
      return validationError;
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF
    const data = await pdf(buffer);

    // Check if PDF is password protected
    if (!data.text || data.text.trim().length === 0) {
      return {
        message: 'PDF appears to be password protected or contains no text',
        type: 'password_protected'
      };
    }

    // Check page limit
    if (data.numpages > MAX_PAGES) {
      return {
        message: `PDF has ${data.numpages} pages, maximum allowed is ${MAX_PAGES} pages`,
        type: 'too_large'
      };
    }

    // Truncate text if too long
    let text = data.text;
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '...\n\n[Content truncated due to length]';
    }

    return {
      text,
      pages: data.numpages,
      info: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
      }
    };

  } catch (error) {
    console.error('PDF parsing error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        return {
          message: 'Invalid PDF file format',
          type: 'invalid_pdf'
        };
      }
      
      if (error.message.includes('password')) {
        return {
          message: 'PDF is password protected',
          type: 'password_protected'
        };
      }
    }

    return {
      message: 'Failed to parse PDF file',
      type: 'parse_error'
    };
  }
};

export const formatPDFContent = (result: PDFTextResult): string => {
  const { text, pages, info } = result;
  
  let formattedContent = '';
  
  // Add metadata if available
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