export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "";

  
export const OLLAMA_HOST =
  (typeof process !== 'undefined' && process.env.OLLAMA_HOST) || 'http://10.0.0.183:11434';



export const DEFAULT_TEMPERATURE = 
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1");

// Timeout for API requests in milliseconds (default: 10 minutes)
export const API_TIMEOUT_DURATION = 
  parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "600000");