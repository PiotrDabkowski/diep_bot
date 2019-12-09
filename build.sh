#!/usr/bin/env bash
# Bundles unminified extension.
{ cat src/ext.meta.js &  browserify  src/ffa_ext.js ;} | cat | pbcopy