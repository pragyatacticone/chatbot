'use client';

import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface Message {
    role: string;
    content: string;
}

interface ChatResponse {
    response: string;
    confidence: number;
}

export default function ChatInterface() {
    const [input, setInput] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
    const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const fetchSuggestedQuestions = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/v1/suggested-questions');
            if (!response.ok) {
                throw new Error('Failed to fetch suggested questions');
            }
            const data = await response.json();
            if (Array.isArray(data.questions)) {
                setSuggestedQuestions(data.questions);
            }
        } catch (error) {
            console.error('Error fetching suggested questions:', error);
            setSuggestedQuestions([]);
        }
    };

    // Fetch initial suggested questions
    useEffect(() => {
        fetchSuggestedQuestions();
    }, []);

    const handleQuestionClick = (question: string) => {
        setInput(question);
        handleSubmit(null, question);
    };

    const handleSubmit = async (e: React.FormEvent | null, questionOverride?: string) => {
        if (e) e.preventDefault();
        const questionText = questionOverride || input;
        if (!questionText.trim()) return;

        setIsLoading(true);
        setIsTransitioning(true);
        setCurrentQuestion(null);
        setCurrentAnswer(null);
        setInput('');

        setTimeout(() => {
            setCurrentQuestion(questionText);
            setIsTransitioning(false);
        }, 300);

        try {
            const response = await fetch('http://localhost:8000/api/v1/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: questionText,
                    conversation_history: [],
                }),
            });

            const data: ChatResponse = await response.json();
            setCurrentAnswer(data.response);
            // Fetch new suggested questions after getting the answer
            fetchSuggestedQuestions();
        } catch (error) {
            console.error('Error:', error);
            setCurrentAnswer('Sorry, there was an error processing your request.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="w-full max-w-md mx-auto bg-white flex flex-col">
                {/* Header */}
                <div className="p-3 border-b bg-white">
                    <h3 className="text-sm font-semibold text-[#2D3748]">
                        Product Enquiry
                    </h3>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
                    {currentQuestion && (
                        <div className={cn("question-box", { "opacity-0": isTransitioning })}>
                            {currentQuestion}
                        </div>
                    )}
                    {currentAnswer && (
                        <div className={cn("answer-box", { "opacity-0": isTransitioning })}>
                            {currentAnswer}
                        </div>
                    )}
                </div>

                {/* Suggested Questions */}
                <div className="border-t p-3">
                    <h4 className="suggested-questions-header">Suggested Questions</h4>
                    <div className="space-y-2">
                        {suggestedQuestions.map((question, index) => (
                            <button
                                key={index}
                                onClick={() => handleQuestionClick(question)}
                                className="w-full text-left p-3 rounded-lg text-sm bg-[#F7FAFC] hover:bg-[#EDF2F7] transition-colors text-[#4A5568] border border-[#E2E8F0]"
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input Section */}
                <div className="border-t bg-white mt-auto">
                    <form onSubmit={handleSubmit} className="relative p-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me any questions"
                            className="w-full p-2 pr-9 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#4A5568] text-[#2D3748] bg-white placeholder-gray-400"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-[#4A5568] text-white p-1 rounded-md hover:bg-[#3B4B59] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}