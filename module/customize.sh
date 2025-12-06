#!/bin/sh

chmod 755 "$MODPATH/toolkit"

current_uid=$("$MODPATH/toolkit" --getuid)

if ! "$MODPATH/toolkit" --setuid "$current_uid" >/dev/null 2>&1; then
	abort "[!] custom interface not available!"
fi

OLD_MODULE_DIR="/data/adb/modules/ksu_switch_manager"
if [ -d "$OLD_MODULE_DIR" ]; then
	touch "$OLD_MODULE_DIR/remove"
fi

# EOF
