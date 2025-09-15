#!/bin/bash

# Release script for @plus99/cronx monorepo
# This script builds and publishes all packages to npm

set -e

echo "🚀 Starting Cronx release process..."

# Function to check if we're on main branch
check_main_branch() {
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  if [ "$current_branch" != "main" ]; then
    echo "❌ Error: You must be on the main branch to release. Current branch: $current_branch"
    exit 1
  fi
}

# Function to check if working directory is clean
check_clean_working_directory() {
  if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Working directory is not clean. Please commit or stash your changes."
    git status --short
    exit 1
  fi
}

# Function to update package dependencies to use published versions
update_package_deps() {
  local core_version=$1
  
  echo "📝 Updating CLI package dependency to @plus99/cronx@^$core_version"
  cd packages/cli
  npm pkg set dependencies.@plus99/cronx="^$core_version"
  cd ../..
  
  echo "📝 Updating UI package dependency to @plus99/cronx@^$core_version"
  cd packages/ui
  npm pkg set dependencies.@plus99/cronx="^$core_version"
  cd ../..
}

# Function to restore file dependencies
restore_file_deps() {
  echo "🔄 Restoring file dependencies for development"
  cd packages/cli
  npm pkg set dependencies.@plus99/cronx="file:../core"
  cd ../..
  
  cd packages/ui
  npm pkg set dependencies.@plus99/cronx="file:../core"
  cd ../..
}

# Function to build all packages
build_packages() {
  echo "🔨 Building all packages..."
  npm run build
}

# Function to publish a package
publish_package() {
  local package_path=$1
  local package_name=$2
  
  echo "📦 Publishing $package_name..."
  cd "$package_path"
  npm publish --access public
  cd - > /dev/null
}

# Main release process
main() {
  echo "🔍 Checking prerequisites..."
  check_main_branch
  check_clean_working_directory
  
  # Get current version of core package
  core_version=$(cd packages/core && npm pkg get version | tr -d '"')
  echo "📋 Core package version: $core_version"
  
  # Build all packages
  build_packages
  
  # Update dependencies for release
  update_package_deps "$core_version"
  
  # Install dependencies with updated versions
  echo "📥 Installing dependencies with updated versions..."
  npm install
  
  # Rebuild with updated dependencies
  build_packages
  
  # Publish packages in order (core first, then CLI and UI)
  publish_package "packages/core" "@plus99/cronx"
  publish_package "packages/cli" "@plus99/cronx-cli" 
  publish_package "packages/ui" "@plus99/cronx-ui"
  
  # Restore file dependencies for development
  restore_file_deps
  npm install
  
  echo "✅ Release complete! Published packages:"
  echo "   📦 @plus99/cronx@$core_version"
  echo "   📦 @plus99/cronx-cli@$core_version"
  echo "   📦 @plus99/cronx-ui@$core_version"
  echo ""
  echo "🔗 View on npm:"
  echo "   https://www.npmjs.com/package/@plus99/cronx"
  echo "   https://www.npmjs.com/package/@plus99/cronx-cli"
  echo "   https://www.npmjs.com/package/@plus99/cronx-ui"
}

# Run main function
main "$@"