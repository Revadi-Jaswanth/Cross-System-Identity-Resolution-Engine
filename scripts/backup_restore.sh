#!/bin/bash
# Backup & Restore Automation Script for identity_resolution database

DB_CONTAINER="identity_db"
DB_NAME="identity_resolution"
DB_USER="admin"
BACKUP_DIR="./backups"

mkdir -p $BACKUP_DIR

backup_db() {
    local backup_file="$BACKUP_DIR/db_backup_$(date +%F_%T).sql"
    echo "Starting backup database: $DB_NAME..."
    docker exec -t $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > $backup_file
    if [ $? -eq 0 ]; then
        echo "Backup successfully created: $backup_file"
    else
        echo "Database backup failed!"
        exit 1
    fi
}

restore_db() {
    local backup_file=$1
    if [ -z "$backup_file" ]; then
        echo "Please specify a backup sql file to restore."
        exit 1
    fi
    echo "Restoring database from file: $backup_file..."
    cat $backup_file | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
    if [ $? -eq 0 ]; then
        echo "Database successfully restored!"
    else
        echo "Database restore failed!"
        exit 1
    fi
}

case "$1" in
    backup)
        backup_db
        ;;
    restore)
        restore_db "$2"
        ;;
    *)
        echo "Usage: $0 {backup|restore <backup_file_path>}"
        exit 1
        ;;
esac
