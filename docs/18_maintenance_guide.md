# Maintenance Guide — Attendify

**Version:** v1.0.0  
**Status:** Feature Frozen  
**Last Updated:** 2026-07-12  

---

## Table of Contents
1. [Overview](#1-overview)
2. [Logging Locations & Monitoring](#2-logging-locations--monitoring)
3. [Backup Procedures](#3-backup-procedures)
4. [Log Rotation Configuration](#4-log-rotation-configuration)
5. [Database Maintenance & Purges](#5-database-maintenance--purges)
6. [SSL Certificate Renewal](#6-ssl-certificate-renewal)
7. [Troubleshooting Common Issues](#7-troubleshooting-common-issues)

---

## 1. Overview

This document provides instructions for system administrators responsible for maintaining an active deployment of **Attendify V1**.

---

## 2. Logging Locations & Monitoring

### 2.1 Backend logs
* **PM2 Logs**: If running via PM2, log outputs are stored at:
  * **Combined Log**: `~/.pm2/logs/attendify-backend-out.log`
  * **Error Log**: `~/.pm2/logs/attendify-backend-error.log`
* **Real-time Log Stream**:
  ```bash
  pm2 logs attendify-backend
  ```

### 2.2 Frontend and Web Server logs
* **Nginx Logs**:
  * **Access Log**: `/var/log/nginx/attendify.access.log`
  * **Error Log**: `/var/log/nginx/attendify.error.log`

---

## 3. Backup Procedures

To prevent data loss, administrators must run database and local storage backups daily.

### 3.1 MongoDB Data Backup
Run `mongodump` to backup all collections:
```bash
mongodump --uri="mongodb://localhost:27017/attendify" --out=/var/backups/mongodb/attendify_$(date +%F)
```

### 3.2 Uploaded Files Backup
Create a tar archive of the local file storage directories:
```bash
tar -czf /var/backups/files/attendify_files_$(date +%F).tar.gz -C /opt/attendify/Backened resource_storage timetable_storage
```

---

## 4. Log Rotation Configuration

To prevent logs from consuming all available disk space, configure log rotation:

### 4.1 PM2 Logrotate
Install the `pm2-logrotate` module:
```bash
pm2 install pm2-logrotate
```
Configure rotation limits:
```bash
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 4.2 Nginx Logrotate
Ensure Nginx log rotation is active (usually enabled by default in Linux packages under `/etc/logrotate.d/nginx`).

---

## 5. Database Maintenance & Purges

Over time, active sessions and old notification feeds can consume unnecessary space in MongoDB.

### 5.1 Session Purge Command
Administrators can periodically clear expired session tokens:
```javascript
// Run within mongo shell
use attendify;
db.sessions.deleteMany({ "expires_at": { "$lt": new Date().toISOString() } });
```

### 5.2 Notification Purge Command
To remove notifications older than 90 days:
```javascript
use attendify;
var cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 90);
db.notifications.deleteMany({ "created_at": { "$lt": cutoff.toISOString() } });
```

---

## 6. SSL Certificate Renewal

If using Let's Encrypt and Certbot for SSL termination at Nginx:

### 6.1 Manual Renewal Check
```bash
sudo certbot renew --dry-run
```

### 6.2 Automatic Renewal Cron Job
Verify that the Certbot systemd timer or cron job is running:
```bash
sudo systemctl status certbot.timer
```

---

## 7. Troubleshooting Common Issues

### 7.1 "504 Gateway Timeout" or "502 Bad Gateway"
* **Check**: Nginx is running but the backend service is offline.
* **Resolution**: Verify PM2 process status:
  ```bash
  pm2 status
  pm2 restart attendify-backend
  ```

### 7.2 "Payload Too Large" (413) on File Upload
* **Check**: The uploaded file exceeds Nginx's default size limit.
* **Resolution**: Add or update the file size limit parameter in `/etc/nginx/sites-available/attendify`:
  ```nginx
  client_max_body_size 50M;
  ```
  Then reload Nginx:
  ```bash
  sudo nginx -s reload
  ```
