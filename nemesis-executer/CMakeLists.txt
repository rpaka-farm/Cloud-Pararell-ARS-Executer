#https://docs.aws.amazon.com/sdk-for-cpp/v1/developer-guide/build-cmake.html
cmake_minimum_required(VERSION 3.3)

project(app LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_FLAGS "-std=c++20")

# WindowsがSDKのインストール済みライブラリを見つけることができる場所を設定します。
if(MSVC)
    string(REPLACE ";" "/aws-cpp-sdk-all;" SYSTEM_MODULE_PATH "${CMAKE_SYSTEM_PREFIX_PATH}/aws-cpp-sdk-all")
    list(APPEND CMAKE_PREFIX_PATH ${SYSTEM_MODULE_PATH})
endif()
set(BUILD_SHARED_LIBS ON CACHE STRING "Link to shared libraries by default.")

find_package(OpenSSL REQUIRED)
find_package(AWSSDK REQUIRED COMPONENTS s3 dynamodb)
find_package(nlohmann_json REQUIRED)
find_package(cpprestsdk REQUIRED)

add_executable(${PROJECT_NAME} src/main.cpp src/GL900CSVAdapter.cpp src/STARS.cpp src/ARS.cpp src/NKF.cpp src/USignalDataCSVAdapter.cpp src/USTARSSpectrumCSVAdapter.cpp)

include_directories(${OPENSSL_INCLUDE_DIR})

# Windows：この「if」句は、SDKライブラリをインストール場所からこのプロジェクトの実行可能ファイルが配置されている場所にコピーします。 これがないと、ランタイムエラーを防ぐために、/binフォルダーをexeの場所（この場合はapp.exe）にコピーする必要があります。
if(MSVC AND BUILD_SHARED_LIBS)
    target_compile_definitions(${PROJECT_NAME} PUBLIC "USE_IMPORT_EXPORT")
    add_definitions(-DUSE_IMPORT_EXPORT)
    list(APPEND SERVICE_LIST s3 dynamodb)
    set(CMAKE_BUILD_TYPE Debug) # IDE以外からのビルド用
    SET(EXECUTABLE_OUTPUT_PATH ${CMAKE_CURRENT_BINARY_DIR}/${CMAKE_BUILD_TYPE}) # IDE用
    AWSSDK_CPY_DYN_LIBS(SERVICE_LIST "" ${CMAKE_CURRENT_BINARY_DIR}/${CMAKE_BUILD_TYPE})
    message(STATUS ">>CMAKE_CURRENT_BINARY_DIR: ${CMAKE_CURRENT_BINARY_DIR}")
    message(STATUS ">>CMAKE_BUILD_TYPE: ${CMAKE_BUILD_TYPE}")
    message(STATUS ">>EXECUTABLE_OUTPUT_PATH : ${EXECUTABLE_OUTPUT_PATH}")
endif()

# set_compiler_flags(${PROJECT_NAME} -fexceptions) # 例外を無効にする
# set_compiler_warnings(${PROJECT_NAME})

# ライブラリをリンク
target_link_libraries(${PROJECT_NAME} ${AWSSDK_LINK_LIBRARIES})
target_link_libraries(${PROJECT_NAME} OpenSSL::SSL)
target_link_libraries(${PROJECT_NAME} OpenSSL::Crypto)
target_link_libraries(${PROJECT_NAME} cpprestsdk::cpprest)
target_link_libraries(${PROJECT_NAME} nlohmann_json::nlohmann_json)

# カスタムターゲット
add_custom_target(
    container
    COMMAND docker build . -t stars-cloud:latest
)
add_custom_target(
    pub-container
    COMMAND docker tag stars-cloud:latest 554358119287.dkr.ecr.us-east-1.amazonaws.com/stars-cloud:latest
    COMMAND docker push 554358119287.dkr.ecr.us-east-1.amazonaws.com/stars-cloud:latest
)