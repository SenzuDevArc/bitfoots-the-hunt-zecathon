#!/bin/sh
set -eu
dir=${1:?usage: build-site.sh <dir>}
here=$(cd "$(dirname "$0")" && pwd)
if [ -f "$here/build-site.js" ] && command -v node >/dev/null 2>&1; then
  rc=0; node --expose-internals "$here/build-site.js" "$dir" || rc=$?
  [ "$rc" -eq 0 ] && exit 0
  [ "$rc" -eq 3 ] || { echo "build-site: build-site.js failed (exit $rc)" >&2; exit "$rc"; }
  echo "build-site: WARNING — no bundling (build-site.js exit 3), stamping the separate files only" >&2
else
  echo "build-site: WARNING — no Node or no build-site.js, stamping the separate files only" >&2
fi
cd "$dir"
[ -f index.html ] && [ -f style.css ] || { echo "build-site: index.html / style.css missing in $dir" >&2; exit 1; }

hash() { sha256sum "$1" | cut -c1-12; }
esc() { printf '%s' "$1" | sed 's/[].[\*^$/]/\\&/g'; }   # text as a literal sed pattern
escr() { printf '%s' "$1" | sed 's/[\/&]/\\&/g'; }      # text as a literal sed replacement
stamp() {  # stamp <file to edit> <prefix> <suffix> <referenced files...>
  target=$1 pre=$2 suf=$3; shift 3
  : > "$target.sed"
  for f in "$@"; do
    [ -f "$f" ] || { echo "build-site: $target refers to $f, which is missing" >&2; exit 1; }
    printf 's/%s%s%s/%s%s?v=%s%s/g\n' "$(esc "$pre")" "$(esc "$f")" "$(esc "$suf")" "$(escr "$pre")" "$(escr "$f")" "$(hash "$f")" "$(escr "$suf")" >> "$target.sed"
  done
  sed -f "$target.sed" "$target" > "$target.tmp" && mv "$target.tmp" "$target" && rm -f "$target.sed"
}
refs() { grep -o "$1" "$2" | sed "s/$3//; s/$4\$//" | grep -v -e '?' -e ':' | sort -u || true; }

fonts=$(refs 'url(assets/[^)]*)' style.css 'url(' ')')
[ -z "$fonts" ] || stamp style.css 'url(' ')' $fonts
scripts=$(refs '<script src="[^"]*"' index.html '<script src="' '"')
[ -n "$scripts" ] || { echo "build-site: no scripts found in index.html" >&2; exit 1; }
stamp index.html '<script src="' '"' $scripts
stamp index.html '<link rel="stylesheet" href="' '"' style.css
sheets=$(refs '<link rel="stylesheet" href="[^"]*"' index.html '<link rel="stylesheet" href="' '"' | grep -v '^style\.css' || true)
[ -z "$sheets" ] || stamp index.html '<link rel="stylesheet" href="' '"' $sheets
sed -e 's#<script src="\([^/"][^"]*\)"#<script src="/\1"#g' -e 's#<link rel="stylesheet" href="\([^/"][^"]*\)"#<link rel="stylesheet" href="/\1"#' \
    -e 's#<link rel="icon" href="\([^/"][^"]*\)"#<link rel="icon" href="/\1"#' index.html > index.html.tmp && mv index.html.tmp index.html
if grep -o '<script src="[^"]*"' index.html | grep -v '?v=' >/dev/null; then echo "build-site: an unstamped script is left in index.html" >&2; exit 1; fi
grep -q 'href="/style.css?v=' index.html || { echo "build-site: style.css was not stamped" >&2; exit 1; }
if grep -o '<link rel="stylesheet" href="[^"]*"' index.html | grep -v '?v=' >/dev/null; then echo "build-site: an unstamped stylesheet is left in index.html" >&2; exit 1; fi
echo "build-site: stamped $(printf '%s\n' $scripts | wc -l | tr -d ' ') scripts, style.css, $(printf '%s\n' $fonts | grep -c . || true) fonts"
