#!/bin/bash

# Генерация ключей для Tauri updater вручную
mkdir -p ~/.tauri

# Генерируем приватный ключ
openssl genpkey -algorithm Ed25519 -out ~/.tauri/ts6overlive.key

# Извлекаем публичный ключ
openssl pkey -in ~/.tauri/ts6overlive.key -pubout -out ~/.tauri/ts6overlive.pub

# Конвертируем в base64 для Tauri
PRIVATE_KEY=$(cat ~/.tauri/ts6overlive.key | base64)
PUBLIC_KEY=$(openssl pkey -in ~/.tauri/ts6overlive.key -pubout -outform DER | tail -c 32 | base64)

echo "================================"
echo "Приватный ключ сохранен в: ~/.tauri/ts6overlive.key"
echo "НЕ ПУБЛИКУЙТЕ ЕГО!"
echo ""
echo "Публичный ключ для tauri.conf.json:"
echo "$PUBLIC_KEY"
echo "================================"
echo ""
echo "Добавьте в GitHub Secrets:"
echo "TAURI_PRIVATE_KEY=$PRIVATE_KEY"
