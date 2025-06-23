#!/usr/bin/env node
// File: /Users/aashik/Documents/pricepulse-ai-tracker/scripts/deploy.mjs

/**
 * This script helps deploy the PricePulse application to Vercel
 * It ensures all necessary environment variables are set
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask questions to the user
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${question} `, (answer) => {
      resolve(answer);
    });
  });
}

// Function to execute shell commands and print output
function executeCommand(command) {
  console.log(`\n> ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    if (output) console.log(output);
    return true;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    return false;
  }
}

// Main function
async function main() {
  console.log('\n🚀 PricePulse Deployment Helper');
  console.log('==============================\n');
  
  // Check if Vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('❌ Vercel CLI is not installed. Installing it now...');
    if (!executeCommand('npm install -g vercel')) {
      console.error('Failed to install Vercel CLI. Please install it manually with "npm install -g vercel"');
      process.exit(1);
    }
  }
  
  // Check for environment file
  let envFile = '.env';
  if (!fs.existsSync(envFile)) {
    console.log('⚠️ No .env file found. Creating one...');
    fs.writeFileSync(envFile, '# PricePulse Environment Variables\n');
  }
  
  // Ask for Oxylabs credentials if not provided
  const envContent = fs.readFileSync(envFile, 'utf8');
  let envVars = {};
  
  // Parse existing .env file
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
      envVars[key] = value;
    }
  });
  
  // Check and ask for Oxylabs credentials
  if (!envVars.OXYLABS_USERNAME) {
    const username = await askQuestion('Enter your Oxylabs username (leave empty to use default):');
    if (username) envVars.OXYLABS_USERNAME = username;
  }
  
  if (!envVars.OXYLABS_PASSWORD) {
    const password = await askQuestion('Enter your Oxylabs password (leave empty to use default):');
    if (password) envVars.OXYLABS_PASSWORD = password;
  }
  
  // Check and ask for OpenAI API key
  if (!envVars.OPENAI_API_KEY) {
    const apiKey = await askQuestion('Enter your OpenAI API key (optional):');
    if (apiKey) envVars.OPENAI_API_KEY = apiKey;
  }
  
  // Update the .env file
  let newEnvContent = '# PricePulse Environment Variables\n';
  for (const [key, value] of Object.entries(envVars)) {
    newEnvContent += `${key}=${value}\n`;
  }
  fs.writeFileSync(envFile, newEnvContent);
  
  // Run build process
  console.log('\n📦 Building the application...');
  if (!executeCommand('npm run build')) {
    console.error('Build failed. Please fix the errors and try again.');
    process.exit(1);
  }
  
  // Deploy to Vercel
  console.log('\n🚀 Deploying to Vercel...');
  
  // Check if user wants to use Vercel environment variables
  const useVercelEnv = await askQuestion('Do you want to configure environment variables on Vercel? (y/n):');
  
  if (useVercelEnv.toLowerCase() === 'y') {
    // Set up environment variables on Vercel
    for (const [key, value] of Object.entries(envVars)) {
      if (value && value.trim() !== '') {
        console.log(`Setting ${key} on Vercel...`);
        executeCommand(`vercel env add ${key} production`);
      }
    }
  }
  
  // Check if project is linked to Vercel
  console.log('\n🔍 Checking if project is linked to Vercel...');
  try {
    const vercelConfig = fs.existsSync('.vercel/project.json');
    if (!vercelConfig) {
      console.log('⚠️  Project not linked to Vercel. Linking now...');
      executeCommand('vercel link --yes');
    } else {
      console.log('✅ Project is already linked to Vercel.');
    }
  } catch (error) {
    console.log('⚠️  Could not check Vercel configuration. Linking project...');
    executeCommand('vercel link --yes');
  }

  // Final deployment with confirmation
  console.log('\n🚀 Deploying to Vercel...');
  const deployCommand = 'vercel --prod --yes';
  if (!executeCommand(deployCommand)) {
    console.error('Deployment failed. Please check the error messages above.');
    console.log('\n⚠️  If deployment failed, try running these commands manually:');
    console.log('1. vercel link --yes');
    console.log('2. vercel --prod --yes');
    process.exit(1);
  }
  
  console.log('\n✅ Deployment completed successfully!');
  console.log('\nYour PricePulse application is now live on Vercel.');
  console.log('Check your Vercel dashboard for the URL and additional settings.');
  
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error('Error during deployment:', error);
  process.exit(1);
});