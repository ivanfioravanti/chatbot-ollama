import type { NextApiRequest, NextApiResponse } from 'next';
import pdf from 'pdf-parse';

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '50mb',
  },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PAGES = 100;
const MAX_TEXT_LENGTH = 50000;

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return await new Promise((resolve, reject) => {
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    const fileNameHeader = req.headers['x-file-name'];
    const fileName = Array.isArray(fileNameHeader)
      ? fileNameHeader[0]
      : fileNameHeader || 'document.pdf';

    if (typeof contentType === 'string' && !contentType.includes('pdf')) {
      return res.status(400).json({ error: 'Invalid content type', message: 'Expected application/pdf' });
    }

    const buffer = await readRawBody(req);
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Empty body', message: 'No file data received' });
    }
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File too large', message: 'Maximum size is 50MB' });
    }

    const data = await pdf(buffer);

    if (!data.text || data.text.trim().length === 0) {
      return res.status(400).json({ error: 'PDF Error', message: 'PDF appears password protected or has no text', type: 'password_protected' });
    }

    if (data.numpages > MAX_PAGES) {
      return res.status(413).json({ error: 'Too many pages', message: `PDF has ${data.numpages} pages, max is ${MAX_PAGES}`, type: 'too_large' });
    }

    let text = data.text;
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[Content truncated due to length]';
    }

    return res.status(200).json({
      fileName,
      text,
      pages: data.numpages,
      info: {
        title: (data.info as any)?.Title,
        author: (data.info as any)?.Author,
        subject: (data.info as any)?.Subject,
        creator: (data.info as any)?.Creator,
        producer: (data.info as any)?.Producer,
        creationDate: (data.info as any)?.CreationDate || undefined,
        modDate: (data.info as any)?.ModDate || undefined,
      },
    });
  } catch (error: any) {
    const msg = error?.message || 'Failed to parse PDF file';
    const status = msg.includes('Invalid PDF') ? 400 : 500;
    return res.status(status).json({ error: 'Parse error', message: msg });
  }
}

