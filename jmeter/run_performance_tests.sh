#!/bin/bash
# Script to run JMeter performance tests for different configurations
# Usage: ./run_performance_tests.sh [config]
# Configs: b, b+s, b+s+k, b+s+k+o (or 'all' for all configs)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"

# Find JMeter
if [ -n "$JMETER_HOME" ]; then
    JMETER_CMD="$JMETER_HOME/jmeter"
elif command -v jmeter > /dev/null 2>&1; then
    JMETER_CMD=$(command -v jmeter)
    echo "Using JMeter from PATH: $JMETER_CMD"
else
    echo "Error: JMeter not found"
    echo "Please either:"
    echo "  1. Set JMETER_HOME environment variable, e.g.:"
    echo "     export JMETER_HOME=/path/to/jmeter/bin"
    echo "  2. Or ensure 'jmeter' is in your PATH"
    exit 1
fi

# Check if JMeter exists and is executable
if [ ! -f "$JMETER_CMD" ] || [ ! -x "$JMETER_CMD" ]; then
    echo "Error: JMeter not found or not executable at $JMETER_CMD"
    exit 1
fi
TEST_PLAN="$SCRIPT_DIR/kayak_flights_booking.jmx"

# Check if test plan exists
if [ ! -f "$TEST_PLAN" ]; then
    echo "Error: Test plan not found at $TEST_PLAN"
    exit 1
fi

echo "Using JMeter at: $JMETER_CMD"
echo "Test plan: $TEST_PLAN"
echo "Results directory: $RESULTS_DIR"
echo ""

# Function to run a test for a specific configuration
run_test() {
    local config=$1
    local config_label=$2
    local jtl_file="$RESULTS_DIR/kayak-results-${config}-100threads.jtl"
    local report_dir="$RESULTS_DIR/report-latest-${config}-100threads"
    
    echo "=========================================="
    echo "Running test for: $config_label"
    echo "=========================================="
    echo "Output JTL: $jtl_file"
    echo "Report directory: $report_dir"
    echo ""
    
    # Check if backend is running
    echo "Checking if backend is running on localhost:3000..."
    if ! curl -s http://localhost:3000/health/live > /dev/null 2>&1; then
        echo "Warning: Backend may not be running. Please ensure the backend is started."
        echo "Press Ctrl+C to cancel, or Enter to continue..."
        read
    fi
    
    # Run JMeter test
    echo "Starting JMeter test (100 threads)..."
    echo "This may take several minutes..."
    "$JMETER_CMD" -n -t "$TEST_PLAN" -l "$jtl_file" -e -o "$report_dir"
    
    if [ $? -eq 0 ]; then
        echo "✓ Test completed successfully!"
        echo "  Results: $jtl_file"
        echo "  Report: $report_dir/index.html"
        echo ""
    else
        echo "✗ Test failed!"
        exit 1
    fi
}

# Main execution
CONFIG=${1:-all}

case $CONFIG in
    b|B)
        run_test "b" "B (Base)"
        ;;
    b+s|B+S|bs|BS)
        run_test "b+s" "B + S (Base + SQL Caching)"
        ;;
    b+s+k|B+S+K|bsk|BSK)
        run_test "b+s+k" "B + S + K (Base + SQL Caching + Kafka)"
        ;;
    b+s+k+o|B+S+K+O|bsko|BSKO)
        run_test "b+s+k+o" "B + S + K + O (Base + SQL Caching + Kafka + Other)"
        ;;
    all|ALL)
        echo "Running all test configurations..."
        echo "Note: You may need to configure your backend for each test:"
        echo "  - B: Disable caching and Kafka"
        echo "  - B+S: Enable caching only"
        echo "  - B+S+K: Enable caching and Kafka"
        echo "  - B+S+K+O: Enable all optimizations"
        echo ""
        read -p "Press Enter to continue or Ctrl+C to cancel..."
        
        run_test "b" "B (Base)"
        echo "Please configure backend for B+S and press Enter..."
        read
        run_test "b+s" "B + S (Base + SQL Caching)"
        echo "Please configure backend for B+S+K and press Enter..."
        read
        run_test "b+s+k" "B + S + K (Base + SQL Caching + Kafka)"
        echo "Please configure backend for B+S+K+O and press Enter..."
        read
        run_test "b+s+k+o" "B + S + K + O (Base + SQL Caching + Kafka + Other)"
        ;;
    *)
        echo "Usage: $0 [config]"
        echo "Configs: b, b+s, b+s+k, b+s+k+o, all"
        exit 1
        ;;
esac

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
echo "To generate comparison charts, run:"
echo "  cd $SCRIPT_DIR"
echo "  python3 generate_comparison_charts.py"

