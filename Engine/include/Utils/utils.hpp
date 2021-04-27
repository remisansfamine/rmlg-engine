#pragma once

#include <string>

#include <functional>

//#include "maths.hpp"

namespace Utils
{
    // Check if the input string contains the prefix
    bool hasPrefix(const std::string& str, const std::string& prefix);

    // Check if the input string contains the suffix
    bool hasSuffix(const std::string& str, const std::string& suffix);

    // Check if the input string is an integer
    bool isAnInteger(const std::string& str);

    // Check if the input string is decimal
    bool isADecimal(const std::string& str);

    // Split the input string with the delimiter
    void splitString(const std::string& input, const std::string& delimiter,
        std::string& output, const std::function<void()>& lambda);
}
