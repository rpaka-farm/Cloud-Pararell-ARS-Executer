#include <vector>
#include "ARS.hpp"

#ifndef STARS_C
#define STARS_C

struct stars_config
{
  int window_size;
  int overlap;
};

class STARS
{
private:
  ars_config arsc;
  stars_config starsc;

public:
  STARS(ars_config arsc, stars_config starsc);
  std::vector<std::vector<float>> exec(std::vector<float> data);
};

#endif