#include <cstdio>
#include <filesystem>
#include <clocale>
#include <iostream>
#include <sys/stat.h>
#include "GL900CSVAdapter.hpp"
#include "STARS.hpp"

namespace fs = std::filesystem;

int main()
{

  // std::setlocale(LC_CTYPE, "ja_JP.UTF-8");

  // STEP1 解析対象データを取得
  // bool res = downloadSrcFile();
  // if (res)
  // {
  //   std::cout << "成功" << std::endl;
  // }
  // else
  // {
  //   std::cout << "失敗" << std::endl;
  // }

  // STEP2 共通データ形式に変換, メタデータ取り出し
  // GL900CSVAdapter ad = GL900CSVAdapter(fs::path("./Data1/210210-190757_UG_8.CSV"));
  // ad.extractMetaData();
  // ad.outputToUnifiedFormatFile(fs::path("./unko.csv"));

  // STEP3 STARS実行
  // std::ifstream ifs = std::ifstream();
  // std::ofstream ofs = std::ofstream();

  // ifs.open(fs::path("./unko.csv"));
  // ofs.open(fs::path("./unko_out.csv"));

  // std::vector<float> data;
  // for (std::string str_buf; getline(ifs, str_buf);)
  // {
  //   int col = 1;
  //   std::istringstream row(str_buf);
  //   for (std::string col_str_buf; getline(row, col_str_buf, ',');)
  //   {
  //     if (col++ == 4)
  //     {
  //       data.push_back(std::stof(col_str_buf));
  //     }
  //   }
  // }

  // ars_config ac = {10, 15};
  // stars_config sac = {300, 30};
  // STARS sa = STARS(ac, sac);
  // std::vector<std::vector<float>> res = sa.exec(data);

  // int pos = 1;
  // for (auto ars_spcetl_set : res)
  // {
  //   pos += sac.window_size - sac.overlap;
  //   ofs << pos << std::endl;
  //   for (int j = 0; j < ars_spcetl_set.size(); j++)
  //   {
  //     ofs << ars_spcetl_set[j];
  //     if (j != ars_spcetl_set.size() - 1)
  //     {
  //       ofs << ",";
  //     }
  //   }
  //   ofs << std::endl;
  // }

  // ifs.close();
  // ofs.close();

  //STEP4: 解析結果アップロード
  // bool res = uploadResultFile();
  // if (res)
  // {
  //   std::cout << "成功" << std::endl;
  // }
  // else
  // {
  //   std::cout << "失敗" << std::endl;
  // }

  return 0;
}