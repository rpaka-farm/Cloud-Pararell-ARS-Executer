#https://docs.aws.amazon.com/sdk-for-cpp/v1/developer-guide/build-cmake.html
cmake_minimum_required(VERSION 3.3)

set(CMAKE_CXX_STANDARD 20)
project(app LANGUAGES CXX C)
set(CMAKE_CXX_FLAGS "-std=c++20")

#Set the location of where Windows can find the installed libraries of the SDK.
if(MSVC)
    string(REPLACE ";" "/aws-cpp-sdk-all;" SYSTEM_MODULE_PATH "${CMAKE_SYSTEM_PREFIX_PATH}/aws-cpp-sdk-all")
    list(APPEND CMAKE_PREFIX_PATH ${SYSTEM_MODULE_PATH})
endif()

message(STATUS "CMAKE_PREFIX_PATH: ${CMAKE_PREFIX_PATH}")
set(BUILD_SHARED_LIBS ON CACHE STRING "Link to shared libraries by default.")

#Load required services/packages: This basic example uses S3.
find_package(AWSSDK REQUIRED COMPONENTS s3 dynamodb)
find_package(httplib)
find_package(nlohmann_json)
add_executable(${PROJECT_NAME} src/test.cpp src/GL900CSVAdapter.cpp src/STARS.cpp src/ARS.cpp src/NKF.cpp) #Add app's main starting file.

#Windows: This 'if' clause copies the SDK libraries from the installation location to the place where 
#  this project's executable is located.  Without this you'll need to copy the install 
#  /bin folder to the exe location (app.exe in this case) to prevent runtime errors.
if(MSVC AND BUILD_SHARED_LIBS)
    target_compile_definitions(${PROJECT_NAME} PUBLIC "USE_IMPORT_EXPORT")
    add_definitions(-DUSE_IMPORT_EXPORT)
    # Copy relevant AWS SDK for C++ libraries into the current binary directory for running and debugging.
    list(APPEND SERVICE_LIST s3 dynamodb)
   
    #For IDE's like Xcode and Visual Studio this line will be ignored because Release/Debug 
    #  is switched internally, but this is necessary for non-IDE builds.
    set(CMAKE_BUILD_TYPE Debug) #Set to your build type

    SET(EXECUTABLE_OUTPUT_PATH ${CMAKE_CURRENT_BINARY_DIR}/${CMAKE_BUILD_TYPE}) # Necessary for IDE's to use consistent file structure
    AWSSDK_CPY_DYN_LIBS(SERVICE_LIST "" ${CMAKE_CURRENT_BINARY_DIR}/${CMAKE_BUILD_TYPE})
    
    message(STATUS ">>CMAKE_CURRENT_BINARY_DIR: ${CMAKE_CURRENT_BINARY_DIR}")
    message(STATUS ">>CMAKE_BUILD_TYPE: ${CMAKE_BUILD_TYPE}")
    message(STATUS ">>EXECUTABLE_OUTPUT_PATH : ${EXECUTABLE_OUTPUT_PATH}")
endif()

# set_compiler_flags(${PROJECT_NAME} -fexceptions)
set_compiler_warnings(${PROJECT_NAME})
target_link_libraries(${PROJECT_NAME} ${AWSSDK_LINK_LIBRARIES})
target_link_libraries(${PROJECT_NAME} httplib::httplib)
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