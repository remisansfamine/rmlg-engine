#include "thread_pool.hpp"
#include "debug.hpp"

namespace Multithread
{
    void ThreadPool::infiniteLoop()
    {
        while (!terminate)
        {
            std::function<void()> task;

            if (!tasks.tryPop(task))
                continue;

            // Catch all exceptions and keep them in the ThreadPool
            try
            {
                // Set the current working thread
                workingThreadCount++;
                task();
                workingThreadCount--;
            }
            catch (...)
            {
                exceptions.tryPush(std::current_exception());
            }

            lastTime = std::chrono::system_clock::now();
        }
    }

    void ThreadPool::init(unsigned int workerCount)
    {
        if (initialized && !terminate)
            return;

        initialized = true;

        // Assign all threads to the loop function
        for (unsigned int i = 0; i < workerCount; i++)
            workers.emplace_back(&ThreadPool::infiniteLoop, this);

        threadsCount = workers.size();
    }

    std::size_t ThreadPool::getWorkingThreadCount() const
    {
        return workingThreadCount.load();
    }

    std::size_t ThreadPool::getWorkerCount() const
    {
        return threadsCount;
    }

    bool ThreadPool::isEmpty() const
    {
        return tasks.empty() && !workingThreadCount;
    }

    void ThreadPool::stopAllThread()
    {
        if (terminate)
            return;

        terminate = true;

        // Join each thread
        for (auto& worker : workers)
            worker.join();
    }

    void ThreadPool::sync()
    {
        while (workingThreadCount > 0);
    }

    void ThreadPool::syncAndClean()
    {
        tasks.clear();
        sync();
    }

    ThreadPool::~ThreadPool()
    {
        stopAllThread();
    }

    std::chrono::system_clock::time_point ThreadPool::getLastTime()
    {
        return lastTime;
    }

    void ThreadPool::rethrowExceptions()
    {
        std::exception_ptr exception;

        if (exceptions.tryPop(exception))
            std::rethrow_exception(exception);
    }
}