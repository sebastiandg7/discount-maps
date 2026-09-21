//@ts-check
const path = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@org/domain',
    '@org/supabase',
    '@org/ui',
    '@org/maps',
    '@org/billing-wompi',
  ],
  turbopack: {
    // Monorepo root; keeps Next from picking up a parent checkout's lockfile.
    root: path.join(__dirname, '../..'),
  },
};

module.exports = nextConfig;
