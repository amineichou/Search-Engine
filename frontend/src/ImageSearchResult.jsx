import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ImageSearchResult = () => {
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            setQuery(q);
            fetchImages(q);
        }
    }, [searchParams]);

    const fetchImages = async (searchQuery) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:4000/images?q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            setImages(data);
        } catch (error) {
            console.error('Error fetching images:', error);
            setImages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (query.trim()) {
            navigate(`/images?q=${encodeURIComponent(query)}`);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                        {/* Logo */}
                        <h1
                            className="text-xl sm:text-2xl font-bold text-blue-600 cursor-pointer hover:text-blue-700"
                            onClick={() => navigate('/')}
                        >
                            Search
                        </h1>

                        {/* Search Box */}
                        <div className="flex-1 w-full sm:max-w-2xl">
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Search images..."
                                    className="w-full pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-full 
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            bg-white"
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Navigation */}
                    </div>
                    <div className="flex gap-4 text-sm mt-8">
                        <button
                            onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
                            className="text-gray-600 hover:text-gray-900 cursor-pointer"
                        >
                            All
                        </button>
                        <span className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-1 cursor-pointer">
                            Images
                        </span>
                    </div>
                </div>
            </header>

            {/* Images Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="animate-pulse">
                                    <div className="bg-gray-200 rounded-lg" style={{ height: `${150 + (i % 3) * 50}px` }}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {images.length > 0 ? (
                            <>
                                <div className="text-sm text-gray-600 mb-4">
                                    About {images.length} images
                                </div>
                                <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
                                    {images.map((img, index) => (
                                        <div
                                            key={index}
                                            className="break-inside-avoid group cursor-pointer mb-4"
                                            onClick={() => setSelectedImage(img)}
                                        >
                                            <div className="relative overflow-hidden rounded-lg bg-gray-100">
                                                <img
                                                    src={img.image_url}
                                                    alt={img.title}
                                                    className="w-full h-auto object-cover"
                                                    loading="lazy"
                                                    onError={(e) => { e.target.parentElement.parentElement.style.display = 'none'; }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                                                    <div className="p-3 text-white w-full">
                                                        <p className="text-sm font-medium line-clamp-2">{img.title}</p>
                                                        <p className="text-xs text-gray-200 mt-1 line-clamp-1">{img.url.replace(/^https?:\/\/(www\.)?/, '')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center bg-gray-50 rounded-xl">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-700 text-lg font-medium mb-2">No images found for "{query}"</p>
                                <p className="text-gray-500 text-sm">Try different keywords</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                        onClick={() => setSelectedImage(null)}
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={selectedImage.image_url}
                            alt={selectedImage.title}
                            className="max-w-full max-h-[80vh] rounded-lg"
                        />
                        <div className="bg-white mt-4 p-4 rounded-lg">
                            <h3 className="font-semibold text-lg mb-2">{selectedImage.title}</h3>
                            <a
                                href={selectedImage.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                            >
                                {selectedImage.url}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageSearchResult;