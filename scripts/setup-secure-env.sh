#!/bin/bash
# DueSpark Secure Environment Setup Script
# This script helps generate secure environment configurations

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required tools
check_requirements() {
    log_info "Checking requirements..."

    if ! command -v openssl &> /dev/null; then
        log_error "openssl is required but not installed"
        exit 1
    fi

    if ! command -v pwgen &> /dev/null; then
        log_warning "pwgen not found, will use openssl for password generation"
    fi

    log_success "Requirements check passed"
}

# Generate secure random string
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-${length}
}

# Generate secure password
generate_password() {
    local length=${1:-24}
    if command -v pwgen &> /dev/null; then
        pwgen -s $length 1
    else
        openssl rand -base64 $length | tr -d "=+/" | cut -c1-${length}
    fi
}

# Create environment file
create_env_file() {
    local env_type=$1
    local template_file=".env.${env_type}.template"
    local output_file=".env.${env_type}"

    if [[ ! -f "$template_file" ]]; then
        log_error "Template file $template_file not found"
        return 1
    fi

    log_info "Creating $output_file from template..."

    # Copy template
    cp "$template_file" "$output_file"

    # Generate secrets
    local secret_key=$(generate_secret 32)
    local encryption_key=$(generate_secret 32)
    local jwt_secret=$(generate_secret 32)
    local db_password=$(generate_password 24)
    local admin_password=$(generate_password 20)

    # Replace placeholders in the file
    case "$env_type" in
        "development")
            sed -i.bak \
                -e "s/YOUR_32_BYTE_SECRET_KEY_HERE/$secret_key/g" \
                -e "s/YOUR_32_BYTE_ENCRYPTION_KEY_HERE/$encryption_key/g" \
                -e "s/YOUR_32_BYTE_JWT_SECRET_KEY_HERE/$jwt_secret/g" \
                -e "s/YOUR_SECURE_DB_PASSWORD_HERE/$db_password/g" \
                -e "s/YOUR_SECURE_ADMIN_PASSWORD_HERE/$admin_password/g" \
                "$output_file"
            ;;
        "staging")
            sed -i.bak \
                -e "s/STAGING_32_BYTE_SECRET_KEY_REQUIRED/$secret_key/g" \
                -e "s/STAGING_32_BYTE_ENCRYPTION_KEY_REQUIRED/$encryption_key/g" \
                -e "s/STAGING_32_BYTE_JWT_SECRET_KEY_REQUIRED/$jwt_secret/g" \
                -e "s/SECURE_STAGING_ADMIN_PASSWORD/$admin_password/g" \
                "$output_file"
            ;;
        "production")
            sed -i.bak \
                -e "s/PRODUCTION_32_BYTE_SECRET_KEY_REQUIRED/$secret_key/g" \
                -e "s/PRODUCTION_32_BYTE_ENCRYPTION_KEY_REQUIRED/$encryption_key/g" \
                -e "s/PRODUCTION_32_BYTE_JWT_SECRET_KEY_REQUIRED/$jwt_secret/g" \
                -e "s/HIGHLY_SECURE_PRODUCTION_ADMIN_PASSWORD/$admin_password/g" \
                "$output_file"
            ;;
    esac

    # Remove backup file
    rm -f "${output_file}.bak"

    # Set secure permissions
    chmod 600 "$output_file"

    log_success "Created secure $output_file"
    log_warning "Generated credentials - save them securely!"
    echo
    echo "Generated secrets for $env_type environment:"
    echo "  SECRET_KEY: $secret_key"
    echo "  ENCRYPTION_KEY: $encryption_key"
    echo "  JWT_SECRET_KEY: $jwt_secret"
    echo "  DB_PASSWORD: $db_password"
    echo "  ADMIN_PASSWORD: $admin_password"
    echo
}

# Validate environment file
validate_env_file() {
    local env_file=$1
    log_info "Validating $env_file..."

    local issues=0

    # Check for placeholder values
    if grep -q "YOUR_.*_HERE\|REQUIRED\|change-me\|admin123" "$env_file"; then
        log_error "Found placeholder values in $env_file"
        grep -n "YOUR_.*_HERE\|REQUIRED\|change-me\|admin123" "$env_file" || true
        issues=$((issues + 1))
    fi

    # Check for minimum secret length
    while IFS= read -r line; do
        if [[ $line =~ ^(SECRET_KEY|ENCRYPTION_KEY|JWT_SECRET_KEY)= ]]; then
            local value=$(echo "$line" | cut -d'=' -f2)
            if [[ ${#value} -lt 32 ]]; then
                log_error "Secret key too short in $env_file: $line"
                issues=$((issues + 1))
            fi
        fi
    done < "$env_file"

    # Check for localhost in production
    if [[ $env_file == *"production"* ]] && grep -q "localhost" "$env_file"; then
        log_error "Found localhost references in production config"
        grep -n "localhost" "$env_file" || true
        issues=$((issues + 1))
    fi

    if [[ $issues -eq 0 ]]; then
        log_success "$env_file validation passed"
    else
        log_error "$env_file validation failed with $issues issues"
        return 1
    fi
}

# Main menu
show_menu() {
    echo
    echo "=== DueSpark Secure Environment Setup ==="
    echo "1. Generate development environment (.env.development)"
    echo "2. Generate staging environment (.env.staging)"
    echo "3. Generate production environment (.env.production)"
    echo "4. Validate existing environment file"
    echo "5. Generate Docker Compose environment (.env)"
    echo "6. Show security checklist"
    echo "7. Exit"
    echo
}

# Docker Compose environment
create_docker_env() {
    log_info "Creating Docker Compose .env file..."

    local secret_key=$(generate_secret 32)
    local db_password=$(generate_password 24)
    local admin_password=$(generate_password 20)

    cat > .env << EOF
# DueSpark Docker Compose Environment
# Generated on $(date)

# Database Configuration
POSTGRES_DB=duespark
POSTGRES_USER=duespark
POSTGRES_PASSWORD=$db_password

# Security
SECRET_KEY=$secret_key

# Admin
ADMIN_PASSWORD=$admin_password

# External Services (fill these in)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY
STRIPE_CLIENT_ID=ca_YOUR_CLIENT_ID
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
POSTMARK_SERVER_TOKEN=YOUR_POSTMARK_TOKEN
EOF

    chmod 600 .env

    log_success "Created Docker Compose .env file"
    echo "Generated credentials:"
    echo "  DB_PASSWORD: $db_password"
    echo "  SECRET_KEY: $secret_key"
    echo "  ADMIN_PASSWORD: $admin_password"
    echo
    log_warning "Don't forget to fill in your Stripe and Postmark credentials!"
}

# Security checklist
show_security_checklist() {
    echo
    echo "=== SECURITY CHECKLIST ==="
    echo
    echo "Before deploying to production:"
    echo "✓ Generate unique secrets for each environment"
    echo "✓ Use strong, unique passwords (minimum 20 characters)"
    echo "✓ Set DEBUG=false in production"
    echo "✓ Configure proper CORS origins (no localhost in production)"
    echo "✓ Use HTTPS for all production URLs"
    echo "✓ Validate all environment files"
    echo "✓ Store secrets in your cloud provider's secret management"
    echo "✓ Enable 2FA on all service accounts"
    echo "✓ Review database access controls"
    echo "✓ Set up monitoring and alerting"
    echo
    echo "Secret rotation schedule:"
    echo "• SECRET_KEY: Every 90 days"
    echo "• Database passwords: Every 180 days"
    echo "• API keys: As recommended by provider"
    echo "• Admin passwords: Every 90 days"
    echo
}

# Main script
main() {
    check_requirements

    while true; do
        show_menu
        read -p "Select an option (1-7): " choice

        case $choice in
            1)
                create_env_file "development"
                ;;
            2)
                create_env_file "staging"
                ;;
            3)
                create_env_file "production"
                log_warning "CRITICAL: Store production secrets securely!"
                log_warning "Do not commit production .env files to version control!"
                ;;
            4)
                read -p "Enter environment file to validate: " env_file
                if [[ -f "$env_file" ]]; then
                    validate_env_file "$env_file"
                else
                    log_error "File $env_file not found"
                fi
                ;;
            5)
                create_docker_env
                ;;
            6)
                show_security_checklist
                ;;
            7)
                log_info "Exiting..."
                exit 0
                ;;
            *)
                log_error "Invalid option. Please try again."
                ;;
        esac

        echo
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"