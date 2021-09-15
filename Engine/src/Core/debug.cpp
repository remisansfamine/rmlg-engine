#include "debug.hpp"

#include <fstream>
#include <cassert>

#include "utils.hpp"

namespace Core
{
	namespace Debug
	{
		Log::~Log()
		{
			Log::info("Destroying the Logs Manager");

			Log::saveToFile();
		}

		void Log::saveToFile()
		{
			Log* logManager = Log::instance();

			// Create a new log file
			std::ofstream currentFile("logs/log.txt");

			// Put all the logs in it
			currentFile << logManager->logs;

			// Clear the logs
			logManager->logs.clear();
		}

		void Log::out(const std::string& log, LogType logType)
		{
			// Get the time as a string
			std::string timeAsString = Utils::getTimeAsString("[%x - %X]");

			// Set the current log format
			std::string currentLog = timeAsString + ' ' + log + '\n';

			Log* logManager = Log::instance();

			// Put the logs in the Log Manager 
			logManager->logs += currentLog;

			// Cout the current log
			std::cout << currentLog;
		}

		Assertion::Assertion()
		{
			Log::info("Creating the Assertions Manager");
		}

		Assertion::~Assertion()
		{
			Log::info("Destroying the Assertions Manager");
		}

		void Assertion::out(const std::exception& assertion)
		{
			// Throw assertion if an exception has been handled
			throw  assertion;
		}
	}
}