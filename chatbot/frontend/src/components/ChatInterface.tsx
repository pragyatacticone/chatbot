'use client';

import { useState } from 'react';

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
    const [url, setUrl] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [urlSubmitted, setUrlSubmitted] = useState(false);

    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        try {
            const response = await fetch('http://localhost:8000/api/v1/submit-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url.trim() }),
            });

            const data = await response.json();
            if (data.success) {
                setUrlSubmitted(true);
                const systemMessage: Message = {
                    role: 'system',
                    content: `URL submitted successfully: ${url}`,
                };
                setMessages(prev => [...prev, systemMessage]);
            }
        } catch (error) {
            console.error('Error submitting URL:', error);
            const errorMessage: Message = {
                role: 'system',
                content: 'Error submitting URL. Please try again.',
            };
            setMessages(prev => [...prev, errorMessage]);
        }
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
                    url: urlSubmitted ? url.trim() : undefined,
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
        <div className="max-w-2xl mx-auto p-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-4">
                    <form onSubmit={handleUrlSubmit} className="flex gap-2">
                        <div className="flex-1">
                            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                                Enter the URL
                            </label>
                            <input
                                type="url"
                                id="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                disabled={urlSubmitted}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={urlSubmitted || !url.trim()}
                            className="self-end bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors h-[42px]"
                        >
                            Submit URL
                        </button>
                    </form>
                </div>
                <div className="space-y-4 mb-4 h-[400px] overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`p-3 rounded-lg ${
                                msg.role === 'user'
                                    ? 'bg-blue-100 text-blue-900 ml-auto'
                                    : msg.role === 'assistant'
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'bg-yellow-100 text-yellow-900'
                            } max-w-[80%] ${
                                msg.role === 'user' ? 'ml-auto' : msg.role === 'assistant' ? 'mr-auto' : 'mx-auto'
                            }`}
                        >
                            {msg.content}
                        </div>
                    ))}
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                    >
                        {isLoading ? 'Sending...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
}