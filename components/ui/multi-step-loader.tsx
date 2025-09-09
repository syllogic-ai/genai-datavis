"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect, useMemo } from "react";

const CheckIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("w-6 h-6 ", className)}
    >
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
};

const CheckFilled = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-6 h-6 ", className)}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );
};

const CircleIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("w-6 h-6 ", className)}
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
};

const XCircle = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("w-6 h-6 ", className)}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

type LoadingState = {
  text: string;
  status?: TaskStatus;
};

const LoaderCore = ({
  loadingStates,
  value = 0,
}: {
  loadingStates: LoadingState[];
  value?: number;
}) => {
  const hasStatuses = useMemo(
    () => loadingStates.some((s) => s.status !== undefined),
    [loadingStates]
  );

  return (
    <div className="flex relative justify-start max-w-xl mx-auto flex-col mt-40">
      {loadingStates.map((loadingState, index) => {
        const status = loadingState.status;
        const distance = Math.abs(index - value);
        const opacity = Math.max(1 - distance * 0.2, 0);

        let icon = null;
        let textClass = "text-black dark:text-white";

        if (hasStatuses) {
          switch (status) {
            case "completed":
              icon = <CheckFilled className="text-lime-500" />;
              textClass = "text-lime-600 dark:text-lime-500";
              break;
            case "failed":
              icon = <XCircle className="text-red-500" />;
              textClass = "text-red-600 dark:text-red-500";
              break;
            case "in_progress":
              icon = <CircleIcon className="text-sky-500 animate-pulse" />;
              textClass = "text-sky-600 dark:text-sky-500";
              break;
            default:
              icon = <CircleIcon className="text-zinc-400" />;
              textClass = "text-zinc-600 dark:text-zinc-300";
          }
        } else {
          if (index > value) {
            icon = <CheckIcon className="text-black dark:text-white" />;
          } else {
            icon = (
              <CheckFilled
                className={cn(
                  "text-black dark:text-white",
                  value === index && "text-black dark:text-lime-500 opacity-100"
                )}
              />
            );
          }
          if (value === index) {
            textClass = cn(textClass, "text-black dark:text-lime-500 opacity-100");
          }
        }

        return (
          <motion.div
            key={index}
            className={cn("text-left flex gap-2 mb-4")}
            initial={{ opacity: 0, y: -(value * 40) }}
            animate={{ opacity: opacity, y: -(value * 40) }}
            transition={{ duration: 0.5 }}
          >
            <div>{icon}</div>
            <span className={cn(textClass)}>{loadingState.text}</span>
          </motion.div>
        );
      })}
    </div>
  );
};

export const MultiStepLoader = ({
  loadingStates,
  loading,
  duration = 2000,
  loop = true,
}: {
  loadingStates: LoadingState[];
  loading?: boolean;
  duration?: number;
  loop?: boolean;
}) => {
  const [currentState, setCurrentState] = useState(0);

  const hasStatuses = useMemo(
    () => loadingStates.some((s) => s.status !== undefined),
    [loadingStates]
  );

  const activeIndex = useMemo(() => {
    if (!hasStatuses) return currentState;
    const inProgress = loadingStates.findIndex((s) => s.status === "in_progress");
    if (inProgress !== -1) return inProgress;
    const firstPending = loadingStates.findIndex((s) => s.status === "pending");
    if (firstPending !== -1) return firstPending;
    // All done (completed/failed) → show last
    return Math.max(loadingStates.length - 1, 0);
  }, [hasStatuses, loadingStates, currentState]);

  useEffect(() => {
    if (!loading) {
      setCurrentState(0);
      return;
    }
    if (hasStatuses) {
      // When statuses are provided, we render reactively off props and do not auto-advance.
      return;
    }
    const timeout = setTimeout(() => {
      setCurrentState((prevState) =>
        loop
          ? prevState === loadingStates.length - 1
            ? 0
            : prevState + 1
          : Math.min(prevState + 1, loadingStates.length - 1)
      );
    }, duration);

    return () => clearTimeout(timeout);
  }, [currentState, loading, loop, loadingStates.length, duration, hasStatuses]);

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="w-full h-full fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-2xl"
        >
          <div className="h-96  relative">
            <LoaderCore value={activeIndex} loadingStates={loadingStates} />
          </div>

          <div className="bg-gradient-to-t inset-x-0 z-20 bottom-0 bg-white dark:bg-black h-full absolute [mask-image:radial-gradient(900px_at_center,transparent_30%,white)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
