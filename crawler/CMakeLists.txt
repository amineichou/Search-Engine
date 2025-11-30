cmake_minimum_required(VERSION 3.10)
project(WebCrawler)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(CURL REQUIRED)
find_package(SQLite3 REQUIRED)

# Add executable
add_executable(crawler crawler.cpp)

# Link libraries
target_link_libraries(crawler 
    ${CURL_LIBRARIES}
    ${SQLite3_LIBRARIES}
    gumbo
)

# Include directories
target_include_directories(crawler PRIVATE 
    ${CURL_INCLUDE_DIRS}
    ${SQLite3_INCLUDE_DIRS}
)

# Compiler flags
if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    target_compile_options(crawler PRIVATE -Wall -Wextra)
endif()
