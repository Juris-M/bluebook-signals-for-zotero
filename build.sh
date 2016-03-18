#!/bin/bash

set -e

# Release-dance code goes here.

# Constants
PRODUCT="Bluebook signals for Zotero"
IS_BETA="false"
FORK="bluebook-signals-for-zotero"
BRANCH="master"
CLIENT="bluebook-signals-for-zotero"
VERSION_ROOT="1.1."

function build-the-plugin () {
    set-install-version
    find . -name '*~' -exec rm {} \;
    find . -name '*.sh' -prune -o \
        -name '*.tmpl' -prune -o \
        -name 'bluebook-signals-for-zotero.*' -prune -o \
        -name '.git' -prune -o \
        -name '*~' -prune -o \
        -wholename './about.xul' -prune -o \
        -print0 | xargs -0 zip "${XPI_FILE}" >> "${LOG_FILE}"
}

. jm-sh/frontend.sh
