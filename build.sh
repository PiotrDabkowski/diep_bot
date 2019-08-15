#!/usr/bin/env bash
# Bundles unminified extension.
{ cat src/ext.meta.js &  browserify  src/ext.js ;} | cat