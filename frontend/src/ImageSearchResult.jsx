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
            setImages(data.results || data);
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
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
                        {/* Logo */}
                        <h1
                            className="text-2xl font-semibold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                            onClick={() => navigate('/')}
                        >
                            Search
                        </h1>

                        {/* Search Box */}
                        <div className="flex-1 w-full sm:max-w-2xl">
                            <div className="relative">
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
                                    className="w-full pl-12 pr-12 py-3 text-base border border-gray-300 rounded-lg 
                            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                            bg-white"
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-8 mt-4 md:ml-30">
                        <button
                            onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
                            className="pb-3 text-sm font-medium border-b-2 text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300 cursor-pointer"
                        >
                            All
                        </button>
                        <button className="pb-3 text-sm font-medium border-b-2 text-blue-600 border-blue-600 cursor-pointer">
                            Images
                        </button>
                    </div>
                </div>
            </header>

            {/* Images Grid */}
            <main className=" px-4 sm:px-6 lg:px-8 py-6">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="animate-pulse">
                                    <div className="bg-gray-200 rounded-lg border border-gray-200" style={{ height: `${150 + (i % 3) * 50}px` }}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {images.length > 0 ? (
                            <>
                                <div className="text-sm text-gray-500 mb-6">
                                    About {images.length} images
                                </div>
                                <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
                                    {images.map((img, index) => (
                                        <div
                                            key={index}
                                            className="break-inside-avoid group cursor-pointer mb-4"
                                            onClick={() => setSelectedImage(img)}
                                        >
                                            <div className="relative overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
                                                <img
                                                    src={img.image_url}
                                                    alt={img.title}
                                                    className="w-full h-auto object-cover group-hover:opacity-95"
                                                    loading="lazy"
                                                    onError={(e) => { e.target.parentElement.parentElement.style.display = 'none'; }}
                                                />
                                            </div>
                                            <div className="mt-2">
                                                <p className="text-xs text-gray-700 font-medium line-clamp-1">{img.title}</p>
                                                <p className="text-xs text-gray-500 line-clamp-1">{img.url.replace(/^https?:\/\/(www\.)?/, '')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="p-12 text-center bg-gray-50 border border-gray-200 rounded-lg">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-800 text-lg font-medium mb-1">No images found for "{query}"</p>
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