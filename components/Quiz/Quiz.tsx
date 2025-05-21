import { useState } from 'react';
import { useTranslation } from 'next-i18next';

interface QuizQuestion {
  question: string;
  userAnswer: string;
}

interface QuizProps {
  onSendMessage: (message: string) => void;
}

export const Quiz = ({ onSendMessage }: QuizProps) => {
  const { t } = useTranslation('chat');
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    
    setLoading(true);
    setQuestions([]);
    setScore(null);
    setFeedback([]);

    const prompt = `Generate a 5-question quiz about ${topic}. Format your response exactly like this, with one question per line:
Q1: First question
Q2: Second question
Q3: Third question
Q4: Fourth question
Q5: Fifth question`;

    onSendMessage(prompt);

    // The response will be handled by the chat component and passed back through props
    const response = await new Promise((resolve) => {
      const checkResponse = () => {
        if (document.querySelector('[data-message-author="assistant"]')) {
          const content = document.querySelector('[data-message-author="assistant"]')?.textContent || '';
          resolve(content);
        } else {
          setTimeout(checkResponse, 100);
        }
      };
      checkResponse();
    });

    const questionLines = (response as string)
      .split('\n')
      .filter(line => line.startsWith('Q'))
      .map(line => line.substring(line.indexOf(':') + 1).trim());

    setQuestions(questionLines.map(q => ({ question: q, userAnswer: '' })));
    setLoading(false);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index].userAnswer = value;
    setQuestions(newQuestions);
  };

  const checkAnswers = async () => {
    if (questions.some(q => !q.userAnswer.trim())) {
      alert('Please answer all questions before submitting!');
      return;
    }

    setLoading(true);

    const prompt = `I'll provide a quiz about ${topic} with the user's answers. Please evaluate each answer and provide feedback. Also give a total score out of 5.

${questions.map((q, i) => `Q${i + 1}: ${q.question}
User's answer: ${q.userAnswer}`).join('\n\n')}

Please format your response exactly like this:
Score: X/5

Feedback:
1. [Correct/Incorrect] Feedback for answer 1
2. [Correct/Incorrect] Feedback for answer 2
3. [Correct/Incorrect] Feedback for answer 3
4. [Correct/Incorrect] Feedback for answer 4
5. [Correct/Incorrect] Feedback for answer 5`;

    onSendMessage(prompt);

    // Wait for the response
    const response = await new Promise((resolve) => {
      const checkResponse = () => {
        const elements = document.querySelectorAll('[data-message-author="assistant"]');
        const lastElement = elements[elements.length - 1];
        if (lastElement) {
          resolve(lastElement.textContent);
        } else {
          setTimeout(checkResponse, 100);
        }
      };
      checkResponse();
    });

    const responseText = response as string;
    const scoreMatch = responseText.match(/Score: (\d+)\/5/);
    const feedbackLines = responseText
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.trim());

    if (scoreMatch) {
      setScore(parseInt(scoreMatch[1]));
    }
    setFeedback(feedbackLines);
    setLoading(false);
  };

  return (
    <div className="quiz-container">
      <h1 className="quiz-title">Natalie's Quiz Bot</h1>
      
      <div className="w-full">
        <div className="flex gap-4 mb-8">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic (e.g., Photosynthesis)"
            className="quiz-input flex-1"
          />
          <button
            onClick={generateQuiz}
            disabled={loading || !topic.trim()}
            className="quiz-button"
          >
            Generate Quiz
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        )}

        {questions.length > 0 && (
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div
                key={index}
                className={`quiz-question ${
                  feedback.length
                    ? feedback[index]?.includes('[Correct]')
                      ? 'correct'
                      : 'incorrect'
                    : ''
                }`}
              >
                <p className="font-medium mb-3">Question {index + 1}: {q.question}</p>
                <input
                  type="text"
                  value={q.userAnswer}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder="Type your answer here..."
                  className="quiz-input"
                  disabled={feedback.length > 0}
                />
                {feedback[index] && (
                  <p className={`quiz-feedback ${
                    feedback[index].includes('[Correct]') ? 'correct' : 'incorrect'
                  }`}>
                    {feedback[index]}
                  </p>
                )}
              </div>
            ))}

            {!feedback.length && (
              <button
                onClick={checkAnswers}
                disabled={loading || questions.some(q => !q.userAnswer.trim())}
                className="quiz-button w-full py-4 mt-6"
              >
                Check My Answers
              </button>
            )}

            {score !== null && (
              <div className="quiz-score">
                Your Score: {score}/5
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 