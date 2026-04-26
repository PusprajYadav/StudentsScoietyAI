import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const storySteps = [
  { icon: "📖", text: "Starting your learning journey..." },
  { icon: "🤝", text: "Connecting you with students..." },
  { icon: "🧠", text: "Powering AI recommendations..." },
  { icon: "💼", text: "Turning learning into earning..." },
  { icon: "🚀", text: "Welcome to your network" },
];

export function ProgressStoryLoader() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < storySteps.length - 1) return prev + 1;
        return prev;
      });
    }, 500); // Changes every 500ms

    return () => clearInterval(interval);
  }, []);

  const progressPercentage = Math.min((currentStep / (storySteps.length - 1)) * 100, 100);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app px-6 py-12 text-center overflow-hidden">
      <div className="w-full max-w-lg mx-auto flex flex-col items-center">
        {/* Top Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
          className="mb-10 text-6xl"
        >
          🎓
        </motion.div>

        {/* Animated Text List */}
        <div className="flex flex-col items-start w-full space-y-5 mb-16 px-4 sm:px-12">
          {storySteps.map((step, index) => {
            const isActive = currentStep === index;
            const isPassed = currentStep > index;
            const isVisible = currentStep >= index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: isVisible ? (isActive ? 1 : 0.4) : 0,
                  x: isVisible ? 0 : -20,
                  scale: isActive ? 1.05 : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`flex items-center gap-4 text-base sm:text-lg lg:text-xl font-medium transition-all duration-300 origin-left ${
                  isActive ? "text-app-text font-semibold" : "text-app-text"
                }`}
              >
                <div className="relative flex items-center justify-center w-8 h-8">
                  <span className="text-2xl z-10">{step.icon}</span>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-brand/20 blur-md rounded-full -z-10"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                </div>
                <span>{step.text}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Abstract Progress Bar (SVG Roadmap + Icons) */}
        <div className="w-full relative h-24 sm:h-32 mb-12 select-none pointer-events-none">
          {/* The curved track SVG */}
          <div className="absolute inset-0">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Background Track */}
              <path
                d="M 5 80 L 75 80 Q 90 80 95 30"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-blue-100 dark:text-blue-900/30"
                strokeLinecap="round"
              />
              {/* Animated Progress Track */}
              <motion.path
                d="M 5 80 L 75 80 Q 90 80 95 30"
                fill="none"
                stroke="url(#progress-gradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: Math.max(progressPercentage / 100, 0.01) }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
              <defs>
                <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Icons positioned visually along the path */}
          {/* Note: In a 100x100 relative SVG coordinate system (viewBox). 
              We map them absolute based on percentage of container. */}
          {storySteps.map((step, index) => {
            const isLast = index === storySteps.length - 1;
            const isActive = currentStep >= index;
            const isCurrent = currentStep === index;
            
            // Fixed positions matching the SVG curve:
            // 0: [5%, 80%] (Book)
            // 1: [28.3%, 80%]
            // 2: [51.6%, 80%]
            // 3: [75%, 80%] (Start of curve)
            // 4: [95%, 30%] (Rocket)
            const getPos = () => {
              if (index === 0) return { left: '5%', top: '80%' };
              if (index === 1) return { left: '28.3%', top: '80%' };
              if (index === 2) return { left: '51.6%', top: '80%' };
              if (index === 3) return { left: '75%', top: '80%' };
              return { left: '95%', top: '30%' }; // Rocket peak
            };

            const pos = getPos();

            return (
              <motion.div
                key={index}
                className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2"
                style={{ left: pos.left, top: pos.top }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: isActive ? (isCurrent ? 1.3 : 1) : 0,
                  opacity: isActive ? 1 : 0,
                  rotate: isLast && isActive ? [0, 10, -5, 0] : 0,
                }}
                transition={{ 
                   duration: 0.3, 
                   delay: isActive && !isCurrent ? 0 : 0.1,
                   rotate: { repeat: isLast ? Infinity : 0, duration: 2, ease: "easeInOut" }
                }}
              >
                <div className={`relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-surface-light dark:bg-surface-dark border-2 shadow-sm ${isActive ? 'border-brand z-10' : 'border-app-border'}`}>
                  <span className="text-sm sm:text-lg z-10">{step.icon}</span>
                  {isCurrent && !isLast && (
                     <motion.div 
                       className="absolute inset-0 rounded-full bg-brand/30 blur-md pointer-events-none"
                       animate={{ scale: [1, 1.6, 1] }}
                       transition={{ repeat: Infinity, duration: 1.5 }}
                     />
                  )}
                  {isLast && isActive && (
                     <motion.div 
                       className="absolute inset-0 rounded-full bg-orange-500/30 blur-lg pointer-events-none"
                       animate={{ scale: [1, 1.8, 1], opacity: [0.5, 1, 0.5] }}
                       transition={{ repeat: Infinity, duration: 1.5 }}
                     />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Taglines */}
        <div className="mt-2 flex flex-col items-center px-4">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="font-display text-xl sm:text-2xl font-bold tracking-tight text-app-text"
          >
            AI-powered social media for students
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: currentStep >= 2 ? 1 : 0 }}
            transition={{ duration: 0.8 }}
            className="mt-3 flex items-center justify-center gap-2 text-sm sm:text-base text-app-muted font-medium"
          >
            <span>From e-learning to earning</span>
            <motion.span 
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              🚀
            </motion.span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
