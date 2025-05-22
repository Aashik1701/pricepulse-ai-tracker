/**
 * Utilities for handling environment variables in a consistent way
 */

/**
 * Get an environment variable with a fallback value
 * @param key The environment variable key
 * @param fallback The fallback value if the environment variable is not set
 * @returns The environment variable value or fallback
 */
export const getEnvVariable = (key: string, fallback: string = ''): string => {
  // Try to get from import.meta.env first (Vite)
  const viteEnv = (import.meta.env as Record<string, any>)[key];
  if (viteEnv !== undefined) {
    return viteEnv;
  }
  
  // Then try process.env (Node.js)
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key] as string;
  }
  
  // Finally return fallback
  return fallback;
};

/**
 * Check if an environment variable is set
 * @param key The environment variable key
 * @returns True if the environment variable is set, false otherwise
 */
export const hasEnvVariable = (key: string): boolean => {
  // Check in import.meta.env first (Vite)
  const viteEnv = (import.meta.env as Record<string, any>)[key];
  if (viteEnv !== undefined && viteEnv !== '') {
    return true;
  }
  
  // Then check in process.env (Node.js)
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined && process.env[key] !== '') {
    return true;
  }
  
  return false;
};

/**
 * Get all environment variables with a specific prefix
 * @param prefix The prefix to filter environment variables
 * @returns An object with all environment variables with the prefix
 */
export const getEnvVariablesWithPrefix = (prefix: string): Record<string, string> => {
  const result: Record<string, string> = {};
  
  // Check in import.meta.env first (Vite)
  const viteEnv = import.meta.env as Record<string, any>;
  Object.keys(viteEnv).forEach(key => {
    if (key.startsWith(prefix)) {
      result[key] = viteEnv[key];
    }
  });
  
  // Then check in process.env (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    Object.keys(process.env).forEach(key => {
      if (key.startsWith(prefix) && !result[key]) {
        result[key] = process.env[key] as string;
      }
    });
  }
  
  return result;
};

/**
 * Check if the OpenAI API key is configured
 * @returns True if the OpenAI API key is configured, false otherwise
 */
export const isOpenAIConfigured = (): boolean => {
  return hasEnvVariable('VITE_OPENAI_API_KEY');
};

/**
 * Get the OpenAI API key
 * @returns The OpenAI API key or an empty string if not set
 */
export const getOpenAIApiKey = (): string => {
  return getEnvVariable('VITE_OPENAI_API_KEY');
};
