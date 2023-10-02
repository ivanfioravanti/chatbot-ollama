export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are Chatbot Ollama, a chatbot baked by a large language model. Follow the user's instructions carefully. Respond using markdown.";

export const OLLAMA_HOST =
  process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

export const DEFAULT_TEMPERATURE = 
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1");