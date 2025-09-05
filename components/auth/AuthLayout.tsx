export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Syllogic
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Data visualization with AI
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}