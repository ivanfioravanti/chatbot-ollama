import { test, expect } from 'vitest'
import fetch from 'node-fetch'

// ✅ This is a valid test block
test('POST /api/chat returns fashion feedback', async () => {
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral:instruct',
      prompt: 'Black turtleneck, jeans, and sneakers',
      options: { temperature: 0.7 },
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`Ollama error: ${data.message}`);
  }

  expect(data.message?.content).toContain('🎯');
  expect(data.message?.content).toContain('📝');
  expect(data.message?.content).toContain('💡');
});
