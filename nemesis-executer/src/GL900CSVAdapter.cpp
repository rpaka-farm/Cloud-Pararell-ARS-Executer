#include <string>
#include <fstream>
#include <sstream>
#include <filesystem>
#include <cstdio>
#include <iostream>
#include <regex>
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
  if (row == -1)
  {
    this->seekToFinalRow(ifs);
  }
  else
  {
    std::string str_buf;
    ifs.seekg(0);
    while (--row > 0)
    {
      if (ifs.eof())
      {
        throw std::string("EOF_REACH");
      }
      getline(ifs, str_buf);
    }
  }
}

std::string GL900CSVAdapter::getSpecificColItemOfRow(std::ifstream &ifs, int col)
{
  std::string row_buf;
  std::string str_buf;
  getline(ifs, row_buf);
  std::stringstream row_fs(row_buf);
  while (--col > 0)
  {
    getline(row_fs, str_buf, ',');
    if (row_fs.eof())
    {
      throw std::string("END_OF_ROW_REACH");
    }
  }
  int pos = row_fs.tellg();
  getline(row_fs, str_buf);
  std::regex self_regex(",", std::regex_constants::ECMAScript | std::regex_constants::icase);
  if (std::regex_search(str_buf, self_regex))
  {
    row_fs.seekg(pos);
    getline(row_fs, str_buf, ',');
  }
  return str_buf;
}

void GL900CSVAdapter::extractTime(std::ifstream &ifs, int row, std::chrono::system_clock::time_point &tp_t, int &tp_ms)
{
  std::string str_date_buf, str_time_buf, str_timems_buf;

  std::tm tm_i = {};
  this->seekToSpecificRow(ifs, row);
  str_date_buf = this->getSpecificColItemOfRow(ifs, this->DT_DATE_COL);
  this->seekToSpecificRow(ifs, row);
  str_time_buf = this->getSpecificColItemOfRow(ifs, this->DT_TIME_COL);
  this->seekToSpecificRow(ifs, row);
  str_timems_buf = this->getSpecificColItemOfRow(ifs, this->DT_TIMEMS_COL);
  std::stringstream ss_start(str_date_buf + " " + str_time_buf);
  ss_start >> std::get_time(&tm_i, "%Y/%m/%d %H:%M:%S");
  if (ss_start.fail())
  {
    throw std::string("INVALID_TIME_FORMAT");
  }
  tp_t = std::chrono::system_clock::from_time_t(std::mktime(&tm_i));
  tp_ms = std::stoi(str_timems_buf);
}

metadata GL900CSVAdapter::extractMetaData()
{
  int res = encodeFileToUtf8(this->csvFilePath.filename());
  if (res != 0)
  {
    throw std::string("ENCODE_FAILED");
  }

  metadata md = metadata();
  std::ifstream ifs;

  try
  {
    ifs = this->getStream();
    std::string str_buf;
    int nstr;

    //測定点数
    this->seekToSpecificRow(ifs, this->META_MEASURE_NUM_ROW);
    str_buf = this->getSpecificColItemOfRow(ifs, this->META_MEASURE_NUM_COL);
    md.sampleNum = stoi(str_buf);

    //測定間隔
    this->seekToSpecificRow(ifs, this->META_MEASURE_INTERVAL_ROW);
    str_buf = this->getSpecificColItemOfRow(ifs, this->META_MEASURE_INTERVAL_COL);
    nstr = str_buf.length();
    std::string mitvUnit = str_buf.substr(nstr - 3, 2);
    std::string mitvValue = str_buf.substr(0, nstr - 3);
    if (mitvUnit != "ms")
    {
      throw std::string("INVALID_MEASURE_UNIT");
    }
    md.measureInterval = std::chrono::microseconds(std::stoi(mitvValue));

    std::string str_date_buf, str_time_buf, str_timems_buf;

    //開始時刻・終了時刻
    std::chrono::system_clock::time_point tp_t;
    int tp_ms;
    this->extractTime(ifs, this->DATA_START_ROW, tp_t, tp_ms);
    md.start = tp_t;
    md.start_ms = tp_ms;
    this->extractTime(ifs, this->DATA_FINISH_ROW, tp_t, tp_ms);
    md.finish = tp_t;
    md.finish_ms = tp_ms;
  }
  catch (std::string e)
  {
    ifs.close();
    throw std::string("INVALID_FILE");
  }
  catch (std::invalid_argument e)
  {
    ifs.close();
    throw std::string("INVALID_FILE");
  }
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