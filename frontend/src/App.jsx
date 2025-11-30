import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import SearchResults from "./TextSearchResults";

function App() {


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/images" element={<SearchResults />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
