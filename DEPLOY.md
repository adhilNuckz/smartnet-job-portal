# SmartNet Deployment — Oracle Cloud

| Detail | Value |
|---|---|
| Server IP | `140.238.243.1` |
| Domain | `smartnet.nighttime.online` |
| OS | Ubuntu 22.04+ (Oracle Linux) |
| Stack | Node.js 22 + Express, React + Vite, MongoDB Atlas, Apache |

---

## 1. Connect to server

```bash
ssh ubuntu@140.238.243.1
# or ssh opc@140.238.243.1 depending on your Oracle image
```

## 2. Install system dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git apache2 certbot python3-certbot-apache
```

## 3. Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # v22.x
npm --version
```

## 4. Install PM2 globally

```bash
sudo npm install -g pm2
pm2 --version
```

## 5. Configure Apache modules

```bash
sudo a2enmod proxy proxy_http ssl rewrite
sudo systemctl restart apache2
```

## 6. Create project directory & upload files

```bash
sudo mkdir -p /var/www/smartnet
sudo chown -R ubuntu:ubuntu /var/www/smartnet   # or your user
```

**From your local machine**, copy the project:

```bash
# Run these on YOUR local machine (not the server)
cd /home/amk/Desktop/smartNet
rsync -avz --exclude node_modules --exclude .git --exclude frontend/node_modules . ubuntu@140.238.243.1:/var/www/smartnet/
```

Or if you prefer `scp`:

```bash
cd /home/amk/Desktop/smartNet
tar czf smartnet.tar.gz --exclude=node_modules --exclude=.git --exclude='frontend/node_modules' .
scp smartnet.tar.gz ubuntu@140.238.243.1:/var/www/smartnet/
ssh ubuntu@140.238.243.1 "cd /var/www/smartnet && tar xzf smartnet.tar.gz && rm smartnet.tar.gz"
```

## 7. Install backend dependencies

```bash
ssh ubuntu@140.238.243.1
cd /var/www/smartnet/backend
npm install --production
```

## 8. Configure environment

```bash
cd /var/www/smartnet/backend
cp .env.example .env
nano .env
```

Set the following values:

```
PORT=5000
MONGO_URI=mongodb+srv://pincode:xyLMq8jvRQ4m8uf@profile-management.tr3oldq.mongodb.net/smartnet?appName=profile-management
JWT_SECRET=<generate-a-strong-random-secret>
OWNER_PASSWORD=smartnet123
TRANSLATOR_PASSWORD=smartnet123
STORAGE_PATH=/var/www/smartnet/storage
TELEGRAM_BOT_TOKEN=8938102362:AAEj_LEHfMJ4ZjMYjC9gd2ZhsA4XXtvGZT0
TELEGRAM_CHAT_ID=1402610739
NODE_ENV=production
```

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important:** Change `OWNER_PASSWORD` and `TRANSLATOR_PASSWORD` to something secure.

## 9. Build frontend

```bash
cd /var/www/smartnet/frontend
npm install
npm run build
```

## 10. Create storage directory

```bash
mkdir -p /var/www/smartnet/storage
chmod 755 /var/www/smartnet/storage
```

## 11. Start backend with PM2

```bash
cd /var/www/smartnet/backend
pm2 start src/index.js --name smartnet-api
pm2 save
pm2 startup   # follow the instruction it prints to enable on boot
```

Verify it's running:

```bash
pm2 status
curl http://localhost:5000/api/auth/login   # should respond
```

## 12. Configure Apache virtual host

```bash
sudo nano /etc/apache2/sites-available/smartnet.conf
```

Paste this configuration:

```apache
<VirtualHost *:80>
    ServerName smartnet.nighttime.online
    ServerAdmin webmaster@smartnet.nighttime.online

    DocumentRoot /var/www/smartnet/frontend/dist

    <Directory /var/www/smartnet/frontend/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    <Location /api>
        ProxyPreserveHost On
        ProxyPass http://localhost:5000/api
        ProxyPassReverse http://localhost:5000/api
    </Location>

    <Location /uploads>
        ProxyPreserveHost On
        ProxyPass http://localhost:5000/uploads
        ProxyPassReverse http://localhost:5000/uploads
    </Location>

    ErrorLog ${APACHE_LOG_DIR}/smartnet-error.log
    CustomLog ${APACHE_LOG_DIR}/smartnet-access.log combined
</VirtualHost>
```

Enable the site:

```bash
sudo a2dissite 000-default.conf   # disable default if active
sudo a2ensite smartnet.conf
sudo systemctl reload apache2
```

## 13. Set up SSL with Certbot

```bash
sudo certbot --apache -d smartnet.nighttime.online
```

Follow the interactive prompts. Certbot will:

- Verify domain ownership
- Fetch and install the certificate
- Modify your Apache vhost to serve HTTPS (port 443)
- Set up auto-renewal

Verify SSL is working:

```bash
sudo certbot certificates
```

Test the renewal:

```bash
sudo certbot renew --dry-run
```

## 14. Verify deployment

Check these URLs:

| URL | Expected |
|---|---|
| `http://smartnet.nighttime.online` | Should redirect to HTTPS |
| `https://smartnet.nighttime.online` | Should show the login page |
| `https://smartnet.nighttime.online/api/auth/login` | Should return JSON response |

## 15. Useful PM2 commands

```bash
pm2 status                    # list processes
pm2 logs smartnet-api         # tail logs
pm2 restart smartnet-api      # restart
pm2 stop smartnet-api         # stop
pm2 delete smartnet-api       # remove from PM2
```

## 16. Updating the app

```bash
# On your local machine
cd /home/amk/Desktop/smartNet
rsync -avz --exclude node_modules --exclude .git --exclude 'frontend/node_modules' . ubuntu@140.238.243.1:/var/www/smartnet/

# On the server
cd /var/www/smartnet/backend
npm install --production
cd /var/www/smartnet/frontend
npm install && npm run build
pm2 restart smartnet-api
```

Or a one-liner update script:

```bash
# Run from your local machine
rsync -avz --exclude node_modules --exclude .git --exclude 'frontend/node_modules' . ubuntu@140.238.243.1:/var/www/smartnet/ && ssh ubuntu@140.238.243.1 "cd /var/www/smartnet/backend && npm install --production && cd /var/www/smartnet/frontend && npm install && npm run build && pm2 restart smartnet-api"
```

## 17. Firewall (Oracle Cloud)

Ensure these ports are open in your Oracle Cloud **Security Lists** / **Network Security Groups**:

- `22` — SSH
- `80` — HTTP
- `443` — HTTPS

Also on the server's OS firewall if enabled:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
