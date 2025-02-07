import React from 'react';
import Link from "next/link";

const HomePage = () => {
    return (
        <div className="App min-h-screen flex justify-center items-center bg-gray-200">
            <div className="flex space-x-6 gap-4 w-full max-w-6xl p-6">
                <Link href={'/query'}>
                    Query
                </Link>
                <Link href={'/chat'}>
                    Chat
                </Link>
            </div>
        </div>
    );
};

export default HomePage;
