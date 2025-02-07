'use client';

import React, { useState, useEffect, useRef } from 'react';

const Page = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const abortControllerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const readerRef = useRef(null);

    useEffect(() => {
        return () => {
            cleanupStream();
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const cleanupStream = async () => {
        if (readerRef.current) {
            try {
                await readerRef.current.cancel();
            } catch (error) {
                console.error('Error canceling reader:', error);
            }
            readerRef.current = null;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    const handleCancel = async () => {
        await cleanupStream();
        setLoading(false);
        setMessages(prev => [...prev, {
            sender: 'system',
            text: 'Message streaming was cancelled.'
        }]);
    };

    const handleSend = async () => {
        if (!input.trim()) {
            alert('Please enter a message');
            return;
        }

        const newMessage = { sender: 'user', text: input };
        setMessages((prev) => [...prev, newMessage]);
        setInput('');
        setLoading(true);

        await cleanupStream();
        abortControllerRef.current = new AbortController();

        try {
            const queryParams = new URLSearchParams({ prompt: input, limit: '15' });
            const response = await fetch(`http://localhost:5000/ollama-stream?${queryParams}`, {
                method: 'GET',
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const reader = response.body.getReader();
            readerRef.current = reader;
            const decoder = new TextDecoder();
            let botResponse = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        botResponse += data;
                        setMessages((prev) => {
                            const lastMsg = prev[prev.length - 1];
                            if (lastMsg?.sender === 'bot') {
                                return [...prev.slice(0, -1), { sender: 'bot', text: botResponse }];
                            } else {
                                return [...prev, { sender: 'bot', text: botResponse }];
                            }
                        });
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream was cancelled');
                return;
            }
            console.error('Error:', error);
            setMessages((prev) => [...prev, { sender: 'bot', text: 'Error: Failed to get response' }]);
        } finally {
            setLoading(false);
            readerRef.current = null;
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 min-h-screen flex flex-col">
            <div className="flex flex-col space-y-2 p-4 bg-white shadow-lg rounded-lg overflow-auto flex-grow"
                 style={{ maxHeight: '75vh' }}>
                {messages.length === 0 ? (
                    <p className="text-gray-500 text-center">No messages yet.</p>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`p-3 rounded-lg max-w-xs ${
                                msg.sender === 'user'
                                    ? 'bg-blue-500 text-white self-end'
                                    : msg.sender === 'system'
                                        ? 'bg-yellow-100 text-gray-700 self-center'
                                        : 'bg-gray-200 text-black self-start'
                            }`}
                        >
                            {msg.text}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 flex items-center space-x-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border rounded-lg focus:ring focus:ring-blue-300"
                    disabled={loading}
                />
                <button
                    onClick={handleSend}
                    disabled={loading}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                >
                    {loading ? 'Sending...' : 'Send'}
                </button>
                {loading && (
                    <button
                        onClick={handleCancel}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};

export default Page;