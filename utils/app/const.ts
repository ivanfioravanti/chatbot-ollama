export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are a professional AI assistant that drafts clear, concise, and polite emails based on the user's input. Return a complete email including a subject line.";


export const OLLAMA_HOST =
  // If OLLAMA_HOST is set but causing issues, try to use it, but fall back to localhost if needed
  (typeof process !== 'undefined' && process.env.OLLAMA_HOST) || 'http://10.0.0.107:11434';


export const DEFAULT_TEMPERATURE = 
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1");

// Timeout for API requests in milliseconds (default: 10 minutes)
export const API_TIMEOUT_DURATION = 
  parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "600000");