#include <filesystem>
#include <fstream>
#include <sstream>
#include <chrono>

#ifndef GL900CSVADAPTER
#define GL900CSVADAPTER

namespace fs = std::filesystem;

struct metadata
{
  int sampleNum;
  std::chrono::microseconds measureInterval;
  std::chrono::system_clock::time_point start;
  int start_ms;
  std::chrono::system_clock::time_point finish;
  int finish_ms;
};

class GL900CSVAdapter
{
private:
  int META_MEASURE_INTERVAL_ROW = 4;
  int META_MEASURE_NUM_ROW = 5;
  int DATA_START_ROW = 28;
  int DT_DATE_COL = 2;
  int DT_TIME_COL = 3;
  int DT_TIMEMS_COL = 4;
  int DATA_CH1_COL = 5;
  int DATA_CH2_COL = 6;
  int DATA_CH3_COL = 7;
  int DATA_CH4_COL = 8;
  // int DATA_CH5_COL = 9;
  // int DATA_CH6_COL = 10;
  // int DATA_CH7_COL = 11;
  // int DATA_CH8_COL = 12;

  fs::path csvFilePath;

  std::ifstream getStream();
  void seekToFinalRow(std::ifstream &ifs);
  void seekToSpecificRow(std::ifstream &ifs, int row);

public:
  GL900CSVAdapter(fs::path csvFilePath);
  metadata extractMetaData();
  void outputToUnifiedFormatFile(fs::path outputFilePath);
};

#endif