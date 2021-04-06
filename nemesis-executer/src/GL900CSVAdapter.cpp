#include <string>
#include <fstream>
#include <sstream>
#include <filesystem>
#include <cstdio>
#include <iostream>
#include "GL900CSVAdapter.hpp"
#include "NKF.hpp"

GL900CSVAdapter::GL900CSVAdapter(fs::path csvFilePath)
{
  this->csvFilePath = csvFilePath;
}

std::ifstream GL900CSVAdapter::getStream()
{
  std::ifstream ifs = std::ifstream();
  ifs.open(this->csvFilePath);
  return ifs;
}

void GL900CSVAdapter::seekToFinalRow(std::ifstream &ifs)
{
  char chr_buf;
  ifs.seekg(-4, std::ios_base::end);
  while (true)
  {
    std::streampos pos = ifs.tellg();
    if (pos == -1)
    {
      return;
    }
    ifs.seekg(-2, std::ios_base::cur);
    ifs.read(&chr_buf, 1);
    if (chr_buf == 0x0d || chr_buf == 0x0a) // CRLF
    {
      break;
    }
  }
}

void GL900CSVAdapter::seekToSpecificRow(std::ifstream &ifs, int row)
{
  std::string str_buf;
  ifs.seekg(0);
  while (--row > 0)
  {
    getline(ifs, str_buf);
  }
}

metadata GL900CSVAdapter::extractMetaData()
{
  int res = encodeFileToUtf8(this->csvFilePath.filename());
  if (res != 0)
  {
    throw "ENCODE_FAILED";
  }

  metadata md = metadata();

  std::ifstream ifs = this->getStream();
  std::string str_buf;
  int nstr;

  //測定点数
  this->seekToSpecificRow(ifs, this->META_MEASURE_NUM_ROW);
  getline(ifs, str_buf, ','); // 1行目無視
  getline(ifs, str_buf);
  md.sampleNum = stoi(str_buf);

  //測定間隔
  this->seekToSpecificRow(ifs, this->META_MEASURE_INTERVAL_ROW);
  getline(ifs, str_buf, ','); // 1行目無視
  getline(ifs, str_buf);
  nstr = str_buf.length();
  std::string mitvUnit = str_buf.substr(nstr - 3, 2);
  std::string mitvValue = str_buf.substr(0, nstr - 3);
  // std::cout << mitvUnit << std::endl;
  // std::cout << mitvValue << std::endl;
  md.measureInterval = std::chrono::microseconds(std::stoi(mitvValue));

  std::string str_date_buf, str_time_buf, str_timems_buf;

  //開始時刻
  this->seekToSpecificRow(ifs, this->DATA_START_ROW);
  getline(ifs, str_buf, ','); // 1行目無視
  getline(ifs, str_date_buf, ',');
  getline(ifs, str_time_buf, ',');
  getline(ifs, str_timems_buf, ',');
  std::tm tm_start = {};
  std::stringstream ss_start(str_date_buf + " " + str_time_buf);
  ss_start >> std::get_time(&tm_start, "%Y/%m/%d %H:%M:%S");
  auto tp_start = std::chrono::system_clock::from_time_t(std::mktime(&tm_start));
  md.start = tp_start;
  md.start_ms = std::stoi(str_timems_buf);

  //終了時刻
  this->seekToFinalRow(ifs);
  getline(ifs, str_buf, ','); // 1行目無視
  getline(ifs, str_date_buf, ',');
  getline(ifs, str_time_buf, ',');
  getline(ifs, str_timems_buf, ',');
  std::tm tm_finish = {};
  std::stringstream ss_finish(str_date_buf + " " + str_time_buf);
  ss_finish >> std::get_time(&tm_finish, "%Y/%m/%d %H:%M:%S");
  auto tp_finish = std::chrono::system_clock::from_time_t(std::mktime(&tm_finish));
  md.finish = tp_finish;
  md.finish_ms = std::stoi(str_timems_buf);

  ifs.close();
  return md;
}

void GL900CSVAdapter::outputToUnifiedFormatFile(fs::path outputFilePath)
{
  int res = encodeFileToUtf8(this->csvFilePath.filename());
  if (res != 0)
  {
    throw "ENCODE_FAILED";
  }

  std::ifstream ifs = this->getStream();
  std::ofstream ofs = std::ofstream();
  ofs.open(outputFilePath);

  this->seekToSpecificRow(ifs, this->DATA_START_ROW);

  for (std::string str_buf; getline(ifs, str_buf);)
  {
    std::istringstream row(str_buf);
    int col = 1;
    std::string orow = "";
    for (std::string col_str_buf; getline(row, col_str_buf, ','); col++)
    {
      if (col == DT_DATE_COL || col == DT_TIME_COL || col == DT_TIMEMS_COL || col == DATA_CH1_COL || col == DATA_CH2_COL || col == DATA_CH3_COL)
      {
        orow = orow + col_str_buf + ",";
      }
      else if (col == DATA_CH4_COL)
      {
        orow = orow + col_str_buf;
      }
    }
    ofs << orow << std::endl;
  }

  ofs.close();
  ifs.close();
}