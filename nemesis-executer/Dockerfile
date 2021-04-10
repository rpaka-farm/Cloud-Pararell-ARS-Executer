FROM ubuntu:20.04
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /opt
RUN apt-get update && \
    apt-get upgrade -y
RUN apt-get install -y git wget build-essential python python3 zip zlib1g-dev xz-utils
RUN apt-get install -y tzdata
RUN apt-get install -y libssl-dev libcurl4-openssl-dev libssl-dev uuid-dev zlib1g-dev libpulse-dev libboost-dev libcpprest-dev
RUN wget https://github.com/Kitware/CMake/releases/download/v3.20.0/cmake-3.20.0-linux-x86_64.tar.gz && \
    tar -zxvf cmake-3.20.0-linux-x86_64.tar.gz && \
    ln -s /opt/cmake-3.20.0-linux-x86_64/bin/* /usr/local/bin
RUN apt-get -y install clang-10
RUN update-alternatives --install /usr/bin/clang++ clang++ /usr/bin/clang++-10 100 && \
    update-alternatives --install /usr/bin/clang clang /usr/bin/clang-10 100 && \
    update-alternatives --install /usr/bin/cc cc /usr/bin/clang-10 100 && \
    update-alternatives --install /usr/bin/c++ c++ /usr/bin/clang++-10 100
RUN git clone https://github.com/aws/aws-sdk-cpp.git && \
    mkdir aws-sdk-cpp-build && \
    cd aws-sdk-cpp-build && \
    cmake -DBUILD_ONLY="s3;dynamodb" -DENABLE_TESTING="off" ../aws-sdk-cpp && \
    make && \
    make install && \
    cd /opt
RUN git clone https://github.com/nlohmann/json.git && \
    mkdir json-build && \
    cd json-build && \
    cmake ../json && \
    make && \
    make install && \
    cd /opt
COPY src /opt/src
COPY CMakeLists.txt /opt/CMakeLists.txt
RUN cmake . && make
EXPOSE 8080
CMD "/opt/app"