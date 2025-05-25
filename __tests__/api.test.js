import { test, expect, vi } from 'vitest'

// ✅ Mock the global fetch call
vi.stubGlobal('fetch', async () =>
  Promise.resolve({
    json: async () => ({
      message: {
        content: '🎯 Stylish! 📝 Great choice. 💡 Add a belt for flair!',
      },
    }),
  })
)

test('POST /api/chat returns fashion feedback (mocked)', async () => {
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
