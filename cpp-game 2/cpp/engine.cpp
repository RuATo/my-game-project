#include <string>
#include <emscripten/emscripten.h>

static std::string result;

extern "C" {
  EMSCRIPTEN_KEEPALIVE
  const char* run_program(const char* input) {
    result = input;
    return result.c_str();
  }
}