#!/bin/bash

# Comprehensive Test Runner Script for Interviews.tv
# This script runs all tests locally with proper setup and cleanup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$PROJECT_ROOT/api"
WEB_DIR="$PROJECT_ROOT/web"
TESTS_DIR="$PROJECT_ROOT/tests"

# Default options
RUN_UNIT=true
RUN_INTEGRATION=true
RUN_E2E=true
RUN_PERFORMANCE=false
RUN_SECURITY=false
COVERAGE=false
PARALLEL=false
VERBOSE=false
CLEANUP=true

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Run comprehensive tests for Interviews.tv platform

OPTIONS:
    -u, --unit              Run unit tests only
    -i, --integration       Run integration tests only
    -e, --e2e              Run end-to-end tests only
    -p, --performance      Include performance tests
    -s, --security         Include security tests
    -c, --coverage         Generate coverage reports
    -j, --parallel         Run tests in parallel
    -v, --verbose          Verbose output
    --no-cleanup           Skip cleanup after tests
    -h, --help             Show this help message

EXAMPLES:
    $0                     # Run all basic tests
    $0 -u -c              # Run unit tests with coverage
    $0 -e -v              # Run E2E tests with verbose output
    $0 -p -s              # Run all tests including performance and security
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--unit)
            RUN_UNIT=true
            RUN_INTEGRATION=false
            RUN_E2E=false
            shift
            ;;
        -i|--integration)
            RUN_UNIT=false
            RUN_INTEGRATION=true
            RUN_E2E=false
            shift
            ;;
        -e|--e2e)
            RUN_UNIT=false
            RUN_INTEGRATION=false
            RUN_E2E=true
            shift
            ;;
        -p|--performance)
            RUN_PERFORMANCE=true
            shift
            ;;
        -s|--security)
            RUN_SECURITY=true
            shift
            ;;
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -j|--parallel)
            PARALLEL=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --no-cleanup)
            CLEANUP=false
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check PHP
    if ! command -v php &> /dev/null; then
        print_error "PHP is not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check Composer
    if ! command -v composer &> /dev/null; then
        print_error "Composer is not installed"
        exit 1
    fi
    
    # Check Docker (for integration tests)
    if [[ $RUN_INTEGRATION == true ]] && ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. Integration tests may fail."
    fi
    
    print_success "Prerequisites check passed"
}

# Function to setup test environment
setup_environment() {
    print_status "Setting up test environment..."
    
    # Create test directories
    mkdir -p "$PROJECT_ROOT/tests/results"
    mkdir -p "$PROJECT_ROOT/tests/coverage"
    mkdir -p "$PROJECT_ROOT/tests/logs"
    
    # Setup PHP environment
    cd "$API_DIR"
    if [[ ! -f ".env.testing" ]]; then
        cp ".env.example" ".env.testing"
        print_status "Created .env.testing file"
    fi
    
    # Install PHP dependencies
    print_status "Installing PHP dependencies..."
    composer install --no-interaction --prefer-dist --optimize-autoloader
    
    # Setup Node.js environment
    cd "$WEB_DIR"
    print_status "Installing Node.js dependencies..."
    npm ci
    
    print_success "Environment setup completed"
}

# Function to start test services
start_services() {
    print_status "Starting test services..."
    
    if [[ $RUN_INTEGRATION == true ]] || [[ $RUN_E2E == true ]]; then
        # Start database
        if command -v docker &> /dev/null; then
            print_status "Starting MySQL container..."
            docker run -d --name interviews-test-mysql \
                -e MYSQL_ROOT_PASSWORD=root \
                -e MYSQL_DATABASE=interviews_test \
                -p 3307:3306 \
                mysql:8.0 || print_warning "MySQL container may already be running"
            
            # Wait for MySQL to be ready
            print_status "Waiting for MySQL to be ready..."
            sleep 30
        fi
        
        # Start Redis
        if command -v redis-server &> /dev/null; then
            redis-server --port 6380 --daemonize yes
        fi
    fi
    
    if [[ $RUN_E2E == true ]]; then
        # Start API server
        cd "$API_DIR"
        print_status "Starting API server..."
        php -S localhost:8001 -t public > /dev/null 2>&1 &
        API_PID=$!
        echo $API_PID > "$PROJECT_ROOT/tests/.api.pid"
        
        # Start frontend server
        cd "$WEB_DIR"
        print_status "Starting frontend server..."
        npm run dev -- --port 3001 > /dev/null 2>&1 &
        WEB_PID=$!
        echo $WEB_PID > "$PROJECT_ROOT/tests/.web.pid"
        
        # Wait for servers to be ready
        print_status "Waiting for servers to be ready..."
        sleep 10
        
        # Check if servers are responding
        if ! curl -f http://localhost:8001/api/health > /dev/null 2>&1; then
            print_error "API server is not responding"
            exit 1
        fi
        
        if ! curl -f http://localhost:3001 > /dev/null 2>&1; then
            print_error "Frontend server is not responding"
            exit 1
        fi
    fi
    
    print_success "Services started successfully"
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    local exit_code=0
    
    # PHP Unit Tests
    cd "$API_DIR"
    print_status "Running PHP unit tests..."
    
    local php_cmd="vendor/bin/phpunit --testsuite=Unit"
    if [[ $COVERAGE == true ]]; then
        php_cmd="$php_cmd --coverage-html=../tests/coverage/php-unit --coverage-clover=../tests/coverage/php-unit-clover.xml"
    fi
    if [[ $VERBOSE == true ]]; then
        php_cmd="$php_cmd --verbose"
    fi
    
    if ! eval $php_cmd; then
        print_error "PHP unit tests failed"
        exit_code=1
    fi
    
    # JavaScript Unit Tests
    cd "$WEB_DIR"
    print_status "Running JavaScript unit tests..."
    
    local js_cmd="npm run test:unit"
    if [[ $COVERAGE == true ]]; then
        js_cmd="$js_cmd -- --coverage"
    fi
    if [[ $VERBOSE == true ]]; then
        js_cmd="$js_cmd -- --verbose"
    fi
    
    if ! eval $js_cmd; then
        print_error "JavaScript unit tests failed"
        exit_code=1
    fi
    
    if [[ $exit_code -eq 0 ]]; then
        print_success "Unit tests completed successfully"
    fi
    
    return $exit_code
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    cd "$API_DIR"
    
    # Setup test database
    print_status "Setting up test database..."
    php artisan migrate:fresh --env=testing --force
    php artisan db:seed --env=testing --class=TestSeeder
    
    local cmd="vendor/bin/phpunit --testsuite=Integration"
    if [[ $COVERAGE == true ]]; then
        cmd="$cmd --coverage-html=../tests/coverage/php-integration --coverage-clover=../tests/coverage/php-integration-clover.xml"
    fi
    if [[ $VERBOSE == true ]]; then
        cmd="$cmd --verbose"
    fi
    
    if eval $cmd; then
        print_success "Integration tests completed successfully"
        return 0
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_status "Running end-to-end tests..."
    
    cd "$WEB_DIR"
    
    # Install Playwright if not already installed
    if [[ ! -d "node_modules/@playwright" ]]; then
        print_status "Installing Playwright..."
        npx playwright install
    fi
    
    local cmd="npx playwright test"
    if [[ $VERBOSE == true ]]; then
        cmd="$cmd --reporter=list"
    fi
    if [[ $PARALLEL == true ]]; then
        cmd="$cmd --workers=4"
    fi
    
    if eval $cmd; then
        print_success "E2E tests completed successfully"
        return 0
    else
        print_error "E2E tests failed"
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    cd "$WEB_DIR"
    
    # Install Lighthouse CI if not available
    if ! command -v lhci &> /dev/null; then
        print_status "Installing Lighthouse CI..."
        npm install -g @lhci/cli
    fi
    
    # Run Lighthouse tests
    if lhci autorun --config=lighthouserc.js; then
        print_success "Performance tests completed successfully"
        return 0
    else
        print_error "Performance tests failed"
        return 1
    fi
}

# Function to run security tests
run_security_tests() {
    print_status "Running security tests..."
    
    local exit_code=0
    
    # PHP Security Audit
    cd "$API_DIR"
    print_status "Running PHP security audit..."
    if ! composer audit; then
        print_warning "PHP security vulnerabilities found"
        exit_code=1
    fi
    
    # Node.js Security Audit
    cd "$WEB_DIR"
    print_status "Running Node.js security audit..."
    if ! npm audit --audit-level=moderate; then
        print_warning "Node.js security vulnerabilities found"
        exit_code=1
    fi
    
    # OWASP ZAP Security Scan (if available)
    if command -v zap-baseline.py &> /dev/null; then
        print_status "Running OWASP ZAP baseline scan..."
        if ! zap-baseline.py -t http://localhost:3001; then
            print_warning "Security scan found potential issues"
            exit_code=1
        fi
    fi
    
    if [[ $exit_code -eq 0 ]]; then
        print_success "Security tests completed successfully"
    fi
    
    return $exit_code
}

# Function to cleanup
cleanup() {
    if [[ $CLEANUP == false ]]; then
        print_status "Skipping cleanup as requested"
        return
    fi
    
    print_status "Cleaning up..."
    
    # Stop servers
    if [[ -f "$PROJECT_ROOT/tests/.api.pid" ]]; then
        kill $(cat "$PROJECT_ROOT/tests/.api.pid") 2>/dev/null || true
        rm "$PROJECT_ROOT/tests/.api.pid"
    fi
    
    if [[ -f "$PROJECT_ROOT/tests/.web.pid" ]]; then
        kill $(cat "$PROJECT_ROOT/tests/.web.pid") 2>/dev/null || true
        rm "$PROJECT_ROOT/tests/.web.pid"
    fi
    
    # Stop Docker containers
    docker stop interviews-test-mysql 2>/dev/null || true
    docker rm interviews-test-mysql 2>/dev/null || true
    
    # Stop Redis
    redis-cli -p 6380 shutdown 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Function to generate test report
generate_report() {
    print_status "Generating test report..."
    
    local report_file="$PROJECT_ROOT/tests/results/test-report-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Interviews.tv Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Interviews.tv Test Report</h1>
        <p>Generated on: $(date)</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <ul>
            <li>Unit Tests: $([ $RUN_UNIT == true ] && echo "Executed" || echo "Skipped")</li>
            <li>Integration Tests: $([ $RUN_INTEGRATION == true ] && echo "Executed" || echo "Skipped")</li>
            <li>E2E Tests: $([ $RUN_E2E == true ] && echo "Executed" || echo "Skipped")</li>
            <li>Performance Tests: $([ $RUN_PERFORMANCE == true ] && echo "Executed" || echo "Skipped")</li>
            <li>Security Tests: $([ $RUN_SECURITY == true ] && echo "Executed" || echo "Skipped")</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>Coverage Reports</h2>
        $([ $COVERAGE == true ] && echo "<p>Coverage reports generated in tests/coverage/</p>" || echo "<p>Coverage not generated</p>")
    </div>
</body>
</html>
EOF
    
    print_success "Test report generated: $report_file"
}

# Main execution
main() {
    print_status "Starting Interviews.tv Test Suite"
    print_status "=================================="
    
    # Setup trap for cleanup
    trap cleanup EXIT
    
    check_prerequisites
    setup_environment
    start_services
    
    local overall_exit_code=0
    
    # Run tests based on options
    if [[ $RUN_UNIT == true ]]; then
        if ! run_unit_tests; then
            overall_exit_code=1
        fi
    fi
    
    if [[ $RUN_INTEGRATION == true ]]; then
        if ! run_integration_tests; then
            overall_exit_code=1
        fi
    fi
    
    if [[ $RUN_E2E == true ]]; then
        if ! run_e2e_tests; then
            overall_exit_code=1
        fi
    fi
    
    if [[ $RUN_PERFORMANCE == true ]]; then
        if ! run_performance_tests; then
            overall_exit_code=1
        fi
    fi
    
    if [[ $RUN_SECURITY == true ]]; then
        if ! run_security_tests; then
            overall_exit_code=1
        fi
    fi
    
    generate_report
    
    if [[ $overall_exit_code -eq 0 ]]; then
        print_success "All tests completed successfully! 🎉"
    else
        print_error "Some tests failed. Please review the output above."
    fi
    
    exit $overall_exit_code
}

# Run main function
main "$@"
