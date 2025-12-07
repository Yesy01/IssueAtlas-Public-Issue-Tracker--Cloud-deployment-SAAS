#!/bin/bash
# Generate self-signed SSL certificate for local development
# For production, use Let's Encrypt instead (see ssl-setup-production.sh)

set -e

SSL_DIR="./ssl"
DAYS_VALID=365
COUNTRY="IN"
STATE="Haryana"
CITY="Sonipat"
ORG="DPCS Tracker"
CN="localhost"

echo "Generating self-signed SSL certificate for development..."

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Generate private key
openssl genrsa -out "$SSL_DIR/privkey.pem" 2048

# Generate certificate signing request (CSR)
openssl req -new -key "$SSL_DIR/privkey.pem" -out "$SSL_DIR/server.csr" \
  -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/CN=$CN"

# Generate self-signed certificate
openssl x509 -req -days "$DAYS_VALID" \
  -in "$SSL_DIR/server.csr" \
  -signkey "$SSL_DIR/privkey.pem" \
  -out "$SSL_DIR/fullchain.pem"

# Clean up CSR
rm "$SSL_DIR/server.csr"

echo "✅ Self-signed certificate generated successfully!"
echo "   - Certificate: $SSL_DIR/fullchain.pem"
echo "   - Private key: $SSL_DIR/privkey.pem"
echo "   - Valid for: $DAYS_VALID days"
echo ""
echo "⚠️  WARNING: Self-signed certificates are for development only!"
echo "   For production, use Let's Encrypt (see ssl-setup-production.sh)"
