#!/bin/bash
# fix-spm-signing.sh
# This script fixes code signing for Swift Package Manager dependencies
# Run this BEFORE xcodebuild archive in Codemagic

echo "Fixing SPM dependency signing settings..."

# Find all xcodeproj files in SourcePackages/checkouts and set CODE_SIGN_STYLE to Automatic
find ~/Library/Developer/Xcode/DerivedData -name "project.pbxproj" -path "*SourcePackages*" 2>/dev/null | while read pbxproj; do
    echo "Fixing: $pbxproj"
    sed -i '' 's/CODE_SIGN_STYLE = Manual/CODE_SIGN_STYLE = Automatic/g' "$pbxproj" 2>/dev/null || true
    # Remove any PROVISIONING_PROFILE settings from SPM packages
    sed -i '' '/PROVISIONING_PROFILE/d' "$pbxproj" 2>/dev/null || true
done

# Also fix any cached package builds
find /Users/builder/Library/Developer/Xcode/DerivedData -name "*.xcodeproj" -path "*checkouts*" 2>/dev/null | while read proj; do
    pbxproj="$proj/project.pbxproj"
    if [ -f "$pbxproj" ]; then
        echo "Fixing: $pbxproj"
        sed -i '' 's/CODE_SIGN_STYLE = Manual/CODE_SIGN_STYLE = Automatic/g' "$pbxproj" 2>/dev/null || true
        sed -i '' '/PROVISIONING_PROFILE/d' "$pbxproj" 2>/dev/null || true
    fi
done

echo "SPM signing fix complete"
