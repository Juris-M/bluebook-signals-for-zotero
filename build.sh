#!/bin/bash

find . -name '*~' -exec rm {} \;

find . -name '*.sh' -prune -o \
       -name '*.tmpl' -prune -o \
       -name 'bluebook-signals-for-zotero.*' -prune -o \
       -name '.git' -prune -o \
       -name '*~' -prune -o \
       -wholename './about.xul' -prune -o \
       -print0 | xargs -0 zip bluebook-signals-for-zotero.xpi
