#!/usr/bin/env python3
"""
Test runner script for backend actions functions.

Usage:
    python run_tests.py                    # Run all tests
    python run_tests.py --coverage         # Run tests with coverage report
    python run_tests.py --verbose          # Run tests with verbose output
    python run_tests.py chats             # Run only chat tests
    python run_tests.py dashboard         # Run only dashboard tests
    python run_tests.py jobs              # Run only job tests
    python run_tests.py utils             # Run only utils tests
"""

import subprocess
import sys
import os


def run_command(cmd):
    """Run a command and return the result."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
        
    return result.returncode == 0


def main():
    """Main test runner function."""
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        
        if arg == "--coverage":
            # Run tests with coverage
            cmd = ["python", "-m", "pytest", "tests/", "--cov=actions", "--cov-report=html", "--cov-report=term"]
        elif arg == "--verbose":
            # Run tests with verbose output
            cmd = ["python", "-m", "pytest", "tests/", "-v"]
        elif arg in ["chats", "chat"]:
            # Run only chat tests
            cmd = ["python", "-m", "pytest", "tests/test_chats.py", "-v"]
        elif arg in ["dashboard", "dash"]:
            # Run only dashboard tests
            cmd = ["python", "-m", "pytest", "tests/test_dashboard.py", "-v"]
        elif arg in ["jobs", "job"]:
            # Run only job tests
            cmd = ["python", "-m", "pytest", "tests/test_jobs.py", "-v"]
        elif arg in ["utils", "util"]:
            # Run only utils tests
            cmd = ["python", "-m", "pytest", "tests/test_utils.py", "-v"]
        elif arg in ["--help", "-h"]:
            print(__doc__)
            return
        else:
            print(f"Unknown option: {arg}")
            print(__doc__)
            return
    else:
        # Run all tests
        cmd = ["python", "-m", "pytest", "tests/", "--tb=short", "-q"]
    
    success = run_command(cmd)
    
    if success:
        print(f"\n✅ All tests passed!")
    else:
        print(f"\n❌ Some tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()