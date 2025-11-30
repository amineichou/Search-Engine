import { useState } from 'react';
import { useNavigate } from "react-router";

const Home = () => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = () => {
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }

    return (
        <div className="min-h-screen overflow-hidden bg-white flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-2xl space-y-8">
                {/* Logo/Title */}
                <div className="text-center space-y-2">
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-blue-600">
                        Search
                    </h1>
                </div>

                {/* Search Box */}
                <div className="w-full">
                    <div className="relative flex items-center group">
                        {/* Search Icon */}
                        <div className="absolute left-5 text-gray-400 group-focus-within:text-blue-600">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Input */}
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Search anything..."
                            className="w-full pl-14 pr-4 py-4 sm:py-5 text-base sm:text-lg border-2 border-gray-300 rounded-full 
                                       hover:border-gray-400
                                       focus:outline-none focus:border-blue-500
                                       bg-white"
                            autoFocus
                        />

                        {/* Clear button */}
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-5 text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-center gap-3 sm:gap-4 mt-8">
                        <button 
                            className="px-6 sm:px-8 py-3 sm:py-3.5 bg-blue-600 text-white font-medium rounded-full
                                       hover:bg-blue-700
                                       cursor-pointer text-sm sm:text-base"
                            onClick={handleSearch}
                        >
                            Search
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home
