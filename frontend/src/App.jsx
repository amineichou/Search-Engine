import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import TextSearchResults from "./TextSearchResults";
import ImageSearchResult from "./ImageSearchResult";

function App() {


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<TextSearchResults />} />
        <Route path="/images" element={<ImageSearchResult />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
