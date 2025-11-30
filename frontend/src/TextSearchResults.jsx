import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [images, setImages] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [knowledgeGraph, setKnowledgeGraph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredResult, setHoveredResult] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();

  const isImagesView = location.pathname === '/images';

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      setSearchTerm(q);
      if (isImagesView) {
        fetchImages(q);
      } else {
        fetchResults(q);
      }
    }
  }, [searchParams, isImagesView]);

  const fetchResults = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      // Set spell suggestion if available
      setSuggestion(data.suggestion || null);
      
      // Check if response has knowledge graph
      if (data.knowledgeGraph) {
        setKnowledgeGraph(data.knowledgeGraph);
        setResults(data.results || []);
      } else {
        setKnowledgeGraph(null);
        setResults(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setResults([]);
      setKnowledgeGraph(null);
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/images?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      // Set spell suggestion if available
      setSuggestion(data.suggestion || null);
      setImages(data.results || data);
    } catch (error) {
      console.error('Error fetching images:', error);
      setImages([]);
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  // Track clicks for personalization
  const handleResultClick = async (url) => {
    try {
      await fetch('http://localhost:4000/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  // Get all images from results
  const getAllImages = () => {
    const allImages = [];
    results.forEach(result => {
      if (result.images && result.images.length > 0) {
        result.images.forEach(img => {
          if (img) allImages.push({ url: img, pageUrl: result.url, title: result.title });
        });
      }
    });
    return allImages;
  };

  const handleSearch = () => {
    if (query.trim()) {
      if (isImagesView) {
        navigate(`/images?q=${encodeURIComponent(query)}`);
      } else {
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const filteredResults = results;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Search Bar */}
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
                  placeholder={isImagesView ? "Search images..." : "Search anything..."}
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

          </div>
            {/* Navigation */}
            <div className="flex gap-4 text-sm mt-8">
              <span 
                className={`${!isImagesView ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'} pb-1 cursor-pointer`}
                onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
              >
                All
              </span>
              <span
                className={`${isImagesView ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'} pb-1 cursor-pointer`}
                onClick={() => navigate(`/images?q=${encodeURIComponent(query)}`)}
              >
                Images
              </span>
            </div>
        </div>
      </header>

      {/* Results Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Spell Suggestion */}
        {suggestion && (
          <div className="mb-4">
            <span className="text-sm text-gray-600">Did you mean: </span>
            <button
              onClick={() => navigate(`${isImagesView ? '/images' : '/search'}?q=${encodeURIComponent(suggestion)}`)}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              {suggestion}
            </button>
          </div>
        )}

        {isImagesView ? (
          // Images View
          loading ? (
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
          )
        ) : (
          // Text Results View
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Side - Search Results */}
          <div className="flex-1 max-w-3xl">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="space-y-4 w-full">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-6 bg-gray-300 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Knowledge Graph Card */}
                {knowledgeGraph && (
                  <div className="mb-6 p-6 border border-blue-200 rounded-lg bg-blue-50">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      <a href={knowledgeGraph.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-700">
                        {knowledgeGraph.title}
                      </a>
                    </h2>
                    {knowledgeGraph.description && (
                      <p className="text-sm text-gray-700 mb-3">{knowledgeGraph.description}</p>
                    )}
                    {knowledgeGraph.facts && knowledgeGraph.facts.length > 0 && (
                      <div className="space-y-2 text-sm">
                        {knowledgeGraph.facts.slice(0, 4).map((fact, index) => (
                          <div key={index} className="flex gap-2">
                            {/* <span className="font-semibold text-gray-800 min-w-16">{fact.label}:</span> */}
                            <span className="text-gray-700">{fact.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Results Count */}
                {filteredResults.length > 0 && (
                  <div className="text-sm text-gray-600 mb-4">
                    About {filteredResults.length === 30 ? "30+" : filteredResults.length} results
                  </div>
                )}

                {/* Results List or Grid */}
                <div className="space-y-6">
                  {filteredResults.length > 0 ? (
                    filteredResults.map((result, index) => (
                      <div 
                        key={index} 
                        className="group"
                        onMouseEnter={() => setHoveredResult(index)}
                        onMouseLeave={() => setHoveredResult(null)}
                      >
                        {/* URL */}
                        <div className="flex items-center gap-2 mb-1">
                          {result.favicon ? (
                            <img 
                              src={result.favicon} 
                              alt="" 
                              className="w-4 h-4 rounded-sm"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <svg className={`w-4 h-4 ${
                            hoveredResult === index ? 'text-blue-600' : 'text-gray-500'
                          } ${result.favicon ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {result.url.startsWith('https') ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                          </svg>
                          <span className="text-sm text-gray-600 truncate">
                            {result.url.replace(/^https?:\/\/(www\.)?/, '')}
                          </span>
                        </div>

                        {/* Title */}
                        <a 
                          href={result.url}
                          onClick={() => handleResultClick(result.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg sm:text-xl text-blue-700 hover:text-blue-800 hover:underline font-medium block mb-1.5 line-clamp-1"
                        >
                          {result.title}
                          {result.personalizationScore > 0 && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-normal">★ Visited</span>
                          )}
                        </a>

                        {/* Description or Content */}
                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                          {result.description || result.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    !loading && (
                      <div className="p-8 text-center bg-gray-50 rounded-xl">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-gray-700 text-lg font-medium mb-2">No results found for "{searchTerm}"</p>
                        <p className="text-gray-500 text-sm">Try different keywords or check your spelling</p>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Side - Images Grid */}
          {!loading && getAllImages().length > 0 && (
            <div className="w-full lg:w-80 xl:w-96">
              <div className="lg:sticky lg:top-24">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Related Images</h2>
                <div className="space-y-2">
                  {/* First large image */}
                  {getAllImages()[0] && (
                    <a
                      href={getAllImages()[0].pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full aspect-square overflow-hidden rounded-md bg-gray-100"
                    >
                      <img
                        src={getAllImages()[0].url}
                        alt={getAllImages()[0].title}
                        className="w-full h-full object-cover hover:opacity-90"
                        loading="lazy"
                        onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                      />
                    </a>
                  )}
                  
                  {/* Grid of smaller images */}
                  {getAllImages().length > 1 && (
                    <div className="grid grid-cols-2 gap-2">
                      {getAllImages().slice(1, 9).map((img, index) => (
                        <a
                          key={index}
                          href={img.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square overflow-hidden rounded-md bg-gray-100"
                        >
                          <img
                            src={img.url}
                            alt={img.title}
                            className="w-full h-full object-cover hover:opacity-90"
                            loading="lazy"
                            onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
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

export default SearchResults;
