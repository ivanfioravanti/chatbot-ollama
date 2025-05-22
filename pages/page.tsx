'use client';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function OutfitForm() {
  const [outfit, setOutfit] = useState('');
  const [gender, setGender] = useState('');
  const [occasion, setOccasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');

    const formattedPrompt = 
`👤 Gender: ${gender || 'unspecified'}
📅 Occasion: ${occasion || 'any'}
🧥 Outfit: ${outfit}`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: formattedPrompt,
          options: {
            temperature: 0.7,
            tone: 'encouraging',
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data = await res.json();
      setResponse(data.message?.content || 'No response received');
    } catch (error) {
      console.error('Error:', error);
      setResponse('Failed to get response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 dark:bg-[#202123]">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
          Fashion Stylist AI
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-[#343541] p-6 rounded-lg shadow">
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Gender
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-[#40414F] dark:border-gray-600 dark:text-white"
            >
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="unspecified">Unspecified</option>
            </select>
          </div>

          <div>
            <label htmlFor="occasion" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Occasion
            </label>
            <select
              id="occasion"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              required
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-[#40414F] dark:border-gray-600 dark:text-white"
            >
              <option value="">Select occasion</option>
              <option value="wedding">Wedding</option>
              <option value="work">Work</option>
              <option value="casual">Casual</option>
              <option value="party">Party</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="outfit" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Describe your outfit
            </label>
            <textarea
              id="outfit"
              rows={4}
              value={outfit}
              onChange={(e) => setOutfit(e.target.value)}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-[#40414F] dark:border-gray-600 dark:text-white"
              placeholder="Example: White dress and gold heels with a pearl necklace"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Getting feedback...' : 'Get fashion feedback'}
          </button>
        </form>

        {response && (
          <div className="mt-6 bg-white dark:bg-[#343541] p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">AI Feedback</h2>
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
              {response}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
