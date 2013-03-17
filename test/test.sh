#!/bin/sh
rm -f pic.jpg
tftp -m octet localhost 1234 -c get pic.jpg
sha1sum tftpboot/pic.jpg pic.jpg
