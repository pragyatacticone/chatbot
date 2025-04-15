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
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

    // Fetch suggested questions when component mounts
    useEffect(() => {
        fetchSuggestedQuestions();
    }, []);

    const fetchSuggestedQuestions = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/v1/suggested-questions');
            if (!response.ok) {
                throw new Error('Failed to fetch suggested questions');
            }
            const data = await response.json();
            if (Array.isArray(data.questions)) {
                setSuggestedQuestions(data.questions);
            } else {
                console.error('Invalid response format for suggested questions');
            }
        } catch (error) {
            console.error('Error fetching suggested questions:', error);
            setSuggestedQuestions([]); // Set empty array on error
        }
    };

    const handleQuestionClick = (question: string) => {
        setInput(question);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setIsLoading(true);
        const newMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, newMessage]);

        try {
            const response = await fetch('http://localhost:8000/api/v1/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: input,
                    conversation_history: messages,
                }),
            });

            const data: ChatResponse = await response.json();
            const botMessage: Message = { role: 'assistant', content: data.response };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request.',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg flex flex-col">
                {/* Suggested Questions Section */}
                {suggestedQuestions.length > 0 && (
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">
                            Questions? Your personal wellness assistant is here to help.
                        </h3>
                        <div className="space-y-2">
                            {suggestedQuestions.map((question, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleQuestionClick(question)}
                                    className="w-full text-left p-3 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
                                >
                                    {question}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat Input Section */}
                <div className="p-4 border-b">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-black bg-white placeholder-gray-500"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-black text-white px-6 py-3 rounded-md hover:bg-neutral-700 disabled:bg-black disabled:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                            {isLoading ? "Sending..." : "Send"}
                        </button>
                    </form>
                </div>

                <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex",
                                msg.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "max-w-[85%] px-4 py-2 rounded-lg",
                                    msg.role === "user"
                                        ? "bg-black text-white"
                                        : msg.role === "assistant"
                                            ? "bg-gray-200 text-black"
                                            : "bg-black text-white",
                                    "shadow-sm"
                                )}
                            >
                                <p className="text-sm">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}